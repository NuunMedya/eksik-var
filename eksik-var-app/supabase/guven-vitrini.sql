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
