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
