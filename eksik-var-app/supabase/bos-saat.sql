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
