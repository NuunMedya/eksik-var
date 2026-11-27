-- EKSİK VAR — Bekleyen üç paket tek dosyada (boş saat + güven vitrini + davet). Bir kez, SQL Editor → Run.

-- EKSİK VAR — İşletme "boş saat" ilanı (bir kez, Supabase SQL Editor)
-- Onaylı işletme hesabı sahasındaki boş saati ilan eder → şehir akışında görünür →
-- bir organizatör "Bu saati al" der → o saat/saha/ücretle maç ilanı açılır, saat "alındı" olur, işletmeye bildirim gider.
set search_path = public;

create table if not exists public.bos_saatler (
  id           bigserial primary key,
  isletme_id   uuid not null references public.users(id) on delete cascade,
  city_id      int  not null references public.cities(id),
  district_id  int  references public.districts(id),
  category_id  int  not null default 1,
  venue_name   text not null check (length(venue_name) between 2 and 80),
  starts_at    timestamptz not null,
  sure_dk      int  not null default 60 check (sure_dk between 30 and 240),
  toplam_ucret int  not null default 0 check (toplam_ucret between 0 and 100000),
  not_         text check (not_ is null or length(not_) <= 200),
  durum        text not null default 'acik' check (durum in ('acik','alindi','iptal')),
  event_id     uuid references public.events(id) on delete set null,
  alan_id      uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_bos_saat_akis on public.bos_saatler (city_id, starts_at) where durum = 'acik';
create index if not exists idx_bos_saat_isletme on public.bos_saatler (isletme_id, starts_at);
alter table public.bos_saatler enable row level security;

create or replace function public.onayli_isletme(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = p and status = 'aktif' and hesap_turu = 'isletme' and hesap_onay = 'onayli')
$$;

drop policy if exists p_bos_read on public.bos_saatler;
create policy p_bos_read on public.bos_saatler for select to authenticated
  using (isletme_id = auth.uid() or (durum = 'acik' and starts_at > now()));
drop policy if exists p_bos_ins on public.bos_saatler;
create policy p_bos_ins on public.bos_saatler for insert to authenticated
  with check (isletme_id = auth.uid() and public.onayli_isletme(auth.uid()) and starts_at > now());
drop policy if exists p_bos_upd on public.bos_saatler;
create policy p_bos_upd on public.bos_saatler for update to authenticated
  using (isletme_id = auth.uid()) with check (isletme_id = auth.uid());
drop policy if exists p_bos_del on public.bos_saatler;
create policy p_bos_del on public.bos_saatler for delete to authenticated using (isletme_id = auth.uid());
grant select, insert, update, delete on public.bos_saatler to authenticated;
grant usage, select on sequence public.bos_saatler_id_seq to authenticated;

-- İşletme günde en çok 20 boş saat ilanı
create or replace function public.trg_bos_saat_sinir() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.bos_saatler where isletme_id = new.isletme_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Günde en çok 20 boş saat ilanı verebilirsin';
  end if;
  return new;
end $$;
drop trigger if exists bos_saat_sinir on public.bos_saatler;
create trigger bos_saat_sinir before insert on public.bos_saatler for each row execute function public.trg_bos_saat_sinir();

-- Organizatör saati alır: açtığı maçı saate bağlar, işletmeye bildirim
create or replace function public.bos_saat_al(p_id bigint, p_event uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); s record; e record; ad text;
begin
  select * into s from public.bos_saatler where id = p_id for update;
  if s is null then raise exception 'Boş saat bulunamadı'; end if;
  if s.durum <> 'acik' then raise exception 'Bu saat az önce alındı'; end if;
  select * into e from public.events where id = p_event and organizer_id = me;
  if e is null then raise exception 'Maç bulunamadı'; end if;
  update public.bos_saatler set durum = 'alindi', event_id = p_event, alan_id = me where id = p_id;
  select full_name into ad from public.users where id = me;
  insert into public.notifications (user_id, type, title, body, data)
  values (s.isletme_id, 'bos_saat', '🏟️ Boş saatin alındı',
          to_char(s.starts_at at time zone 'Europe/Istanbul', 'DD Mon HH24:MI') || ' · ' || s.venue_name || ' · ' || coalesce(ad, 'Bir organizatör') || ' maç açtı',
          jsonb_build_object('eventId', p_event, 'slotId', p_id));
  return true;
end $$;
grant execute on function public.bos_saat_al(bigint, uuid) to authenticated;

-- Maç iptal edilirse saat yeniden açılır (geçmemişse)
create or replace function public.trg_bos_saat_iptal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'iptal' and old.status <> 'iptal' then
    update public.bos_saatler set durum = 'acik', event_id = null, alan_id = null
     where event_id = new.id and durum = 'alindi' and starts_at > now();
  end if;
  return new;
end $$;
drop trigger if exists bos_saat_iptal on public.events;
create trigger bos_saat_iptal after update of status on public.events for each row execute function public.trg_bos_saat_iptal();

-- Herkese açık şehir sayfası: boş saatler de görünsün
create or replace function public.public_slots(p_city int, p_district int default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'venue', s.venue_name, 'district', d.name, 'date', s.starts_at, 'sure', s.sure_dk,
           'price', s.toplam_ucret, 'note', s.not_, 'cat', s.category_id, 'isletme', u.full_name) order by s.starts_at), '[]'::jsonb)
  from public.bos_saatler s
  join public.users u on u.id = s.isletme_id
  left join public.districts d on d.id = s.district_id
  where s.city_id = p_city and (p_district is null or s.district_id = p_district)
    and s.durum = 'acik' and s.starts_at between now() and now() + interval '14 days'
$$;
grant execute on function public.public_slots(int, int) to anon, authenticated;

-- EKSİK VAR — Güvenilirlik vitrini (bir kez, Supabase SQL Editor)
-- Tek bir "güven puanı" (0-100): katılım %60 + ödeme düzeni %25 + oyuncu puanı %15.
-- Ayrıca: üst üste kaçaksız katılım serisi, zamanında ödeme sayısı/oranı, kurucu üye bayrağı.
-- Hepsi users tablosunda hazır durur → listelerde ve kartlarda ek sorgu gerekmez.
set search_path = public;

alter table public.users add column if not exists odeme_pct     numeric(5,2);          -- tamamlanan ücretli maçlarda ödenen oranı
alter table public.users add column if not exists odeme_sayisi  int not null default 0; -- zamanında (3 gün içinde) ödenen maç sayısı
alter table public.users add column if not exists katilim_seri  int not null default 0; -- üst üste kaçaksız katılım
alter table public.users add column if not exists guven_puani   int;                    -- null = henüz yeterli veri yok ("Yeni")
alter table public.users add column if not exists kurucu        boolean not null default false;

create or replace function public.guven_hesapla(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j int; n int; seri int := 0; r record; o_pct numeric; o_say int; puan int; rating numeric;
begin
  select count(*) filter (where attendance = 'katildi'), count(*) filter (where attendance = 'gelmedi')
    into j, n from public.participants where user_id = p_user;
  -- seri: en yeni maçtan geriye, ilk 'gelmedi'ye kadar
  for r in select p.attendance from public.participants p join public.events e on e.id = p.event_id
            where p.user_id = p_user and p.attendance in ('katildi','gelmedi') order by e.event_date desc loop
    exit when r.attendance = 'gelmedi';
    seri := seri + 1;
  end loop;
  -- ödeme düzeni: tamamlanmış ücretli maçlar
  select case when count(*) = 0 then null else round(count(*) filter (where p.payment_status in ('odendi','muaf')) * 100.0 / count(*), 2) end,
         count(*) filter (where p.payment_status in ('odendi','muaf') and (p.payment_claimed_at is null or p.payment_claimed_at <= e.event_date + interval '3 days'))
    into o_pct, o_say
    from public.participants p join public.events e on e.id = p.event_id
   where p.user_id = p_user and e.status = 'tamamlandi' and e.price_per_person > 0;
  select rating_avg into rating from public.users where id = p_user;
  if j + n >= 3 then
    puan := round(0.60 * (j * 100.0 / (j + n))
                + 0.25 * coalesce(o_pct, j * 100.0 / (j + n))
                + 0.15 * (case when rating > 0 then rating / 5.0 * 100 else 85 end));
  else
    puan := null;
  end if;
  perform set_config('eksik.guven_ic', '1', true);   -- koru_guven bu güncellemeye dokunmasın
  update public.users set events_joined = j, no_show_count = n,
         reliability_pct = case when j + n > 0 then round(j * 100.0 / (j + n), 2) end,
         katilim_seri = seri, odeme_pct = o_pct, odeme_sayisi = coalesce(o_say, 0), guven_puani = puan
   where id = p_user;
  perform set_config('eksik.guven_ic', '', true);
end $$;

-- Yoklama ya da ödeme durumu değişince yeniden hesapla (eski yoklama tetikleyicisinin yerine geçer)
create or replace function public.trg_participant_attendance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.attendance is distinct from old.attendance or new.payment_status is distinct from old.payment_status then
    perform public.guven_hesapla(new.user_id);
  end if;
  return new;
end $$;
drop trigger if exists participant_attendance on public.participants;
create trigger participant_attendance after update on public.participants
  for each row execute function public.trg_participant_attendance();

-- Maç tamamlanınca katılımcıların ödeme oranı değişir
create or replace function public.trg_event_done_guven() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if new.status = 'tamamlandi' and old.status <> 'tamamlandi' and new.price_per_person > 0 then
    for uid in select user_id from public.participants where event_id = new.id loop perform public.guven_hesapla(uid); end loop;
  end if;
  return new;
end $$;
drop trigger if exists event_done_guven on public.events;
create trigger event_done_guven after update of status on public.events for each row execute function public.trg_event_done_guven();

-- Puan değişince güven puanı güncellenir (yalnız rating_avg değiştiğinde; döngü yok)
create or replace function public.trg_user_rating_guven() returns trigger
language plpgsql security definer set search_path = public as $$
begin perform public.guven_hesapla(new.id); return new; end $$;
drop trigger if exists user_rating_guven on public.users;
create trigger user_rating_guven after update of rating_avg on public.users
  for each row when (old.rating_avg is distinct from new.rating_avg) execute function public.trg_user_rating_guven();

-- Kurucu üye: 2026 sonuna kadar kayıt olan herkes + her durumda ilk 1000 hesap
update public.users set kurucu = true where created_at < '2027-01-01' and not kurucu;
create or replace function public.trg_user_kurucu() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if now() < '2027-01-01' or (select count(*) from public.users) < 1000 then new.kurucu := true; end if;
  return new;
end $$;
drop trigger if exists user_kurucu on public.users;
create trigger user_kurucu before insert on public.users for each row execute function public.trg_user_kurucu();

-- Herkes görebilsin ama kimse kendi puanını elle değiştiremesin (koru_hesap_onay gibi)
create or replace function public.koru_guven() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('eksik.guven_ic', true), '') <> '1'
     and current_setting('request.jwt.claim.role', true) = 'authenticated' and auth.uid() = new.id then
    new.odeme_pct := old.odeme_pct; new.odeme_sayisi := old.odeme_sayisi; new.katilim_seri := old.katilim_seri;
    new.guven_puani := old.guven_puani; new.kurucu := old.kurucu;
  end if;
  return new;
end $$;
drop trigger if exists koru_guven on public.users;
create trigger koru_guven before update on public.users for each row execute function public.koru_guven();

-- Mevcut herkes için bir kez hesapla
do $$ declare uid uuid; begin for uid in select id from public.users loop perform public.guven_hesapla(uid); end loop; end $$;

-- Herkese açık sayfalar güven puanını da versin
create or replace function public.public_event(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', e.id, 'title', e.title, 'cat', e.category_id, 'kind', e.kind, 'status', e.status,
    'city', c.name, 'district', d.name, 'venue', e.venue_name,
    'date', e.event_date, 'price', e.price_per_person, 'capacity', e.total_capacity,
    'needed', e.needed_count, 'filled', e.filled_count, 'level', e.skill_level,
    'positions', coalesce(e.needed_positions, '{}'::jsonb), 'format', e.format, 'team', e.team_name,
    'hakem', e.gorev_hakem and e.hakem_id is null, 'medya', e.gorev_medya and e.medya_id is null,
    'org', public.kisa_ad(u.full_name), 'orgRel', u.reliability_pct, 'orgRating', u.rating_avg, 'orgCount', u.events_organized,
    'orgGuven', u.guven_puani, 'orgKurucu', u.kurucu)
  from public.events e
  join public.users u on u.id = e.organizer_id
  left join public.cities c on c.id = e.city_id
  left join public.districts d on d.id = e.district_id
  where e.id = p_id and u.status = 'aktif'
$$;

-- EKSİK VAR — Davet takibi (bir kez, Supabase SQL Editor)
-- eksikvarapp.com/d/<kullaniciadi> linkiyle gelen kişi kayıt olunca davet eden sayılır; davetçiye bildirim + rozet.
set search_path = public;

alter table public.users add column if not exists davet_eden  uuid references public.users(id) on delete set null;
alter table public.users add column if not exists davet_sayisi int not null default 0;

-- Kendi hesabını elle "davetli" yapamasın / sayacı oynayamasın
create or replace function public.koru_davet() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('eksik.davet_ic', true), '') <> '1'
     and current_setting('request.jwt.claim.role', true) = 'authenticated' and auth.uid() = new.id then
    new.davet_eden := old.davet_eden; new.davet_sayisi := old.davet_sayisi;
  end if;
  return new;
end $$;
drop trigger if exists koru_davet on public.users;
create trigger koru_davet before update on public.users for each row execute function public.koru_davet();

-- Yeni hesap davet kodunu bildirir (kayıttan sonraki 7 gün içinde, bir kez)
create or replace function public.davet_kaydet(p_kod text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); ben record; davetci record;
begin
  select id, full_name, created_at, davet_eden into ben from public.users where id = me;
  if ben is null or ben.davet_eden is not null then return false; end if;
  if ben.created_at < now() - interval '7 days' then return false; end if;
  select id, full_name into davetci from public.users
   where lower(username) = lower(regexp_replace(coalesce(p_kod, ''), '[^A-Za-z0-9_]', '', 'g')) and status = 'aktif' limit 1;
  if davetci is null or davetci.id = me then return false; end if;
  perform set_config('eksik.davet_ic', '1', true);
  update public.users set davet_eden = davetci.id where id = me;
  update public.users set davet_sayisi = davet_sayisi + 1 where id = davetci.id;
  perform set_config('eksik.davet_ic', '', true);
  insert into public.notifications (user_id, type, title, body, data)
  values (davetci.id, 'davet_geldi', '🎉 Davetin karşılık buldu', ben.full_name || ' senin linkinle katıldı. Birlikte maç açma zamanı!', jsonb_build_object('userId', me));
  return true;
end $$;
grant execute on function public.davet_kaydet(text) to authenticated;

-- Herkese açık davet sayfası: davetçinin kısa adı + şehir (telefon vb. yok)
create or replace function public.public_davetci(p_kod text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ad', public.kisa_ad(u.full_name), 'username', u.username, 'sehir', c.name, 'maç', u.events_joined + u.events_organized, 'guven', u.guven_puani)
  from public.users u left join public.cities c on c.id = u.city_id
  where lower(u.username) = lower(regexp_replace(coalesce(p_kod, ''), '[^A-Za-z0-9_]', '', 'g')) and u.status = 'aktif' limit 1
$$;
grant execute on function public.public_davetci(text) to anon, authenticated;
