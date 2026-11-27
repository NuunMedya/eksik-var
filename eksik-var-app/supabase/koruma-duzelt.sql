-- Güven ve davet alanlarını kullanıcının kendisinin değiştirmesini engelleyen korumalar (rol kontrolü düzeltmesi)
set search_path = public;
create or replace function public.koru_guven() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('eksik.guven_ic', true), '') <> '1'
     and auth.uid() is not null and auth.uid() = new.id then
    new.odeme_pct := old.odeme_pct; new.odeme_sayisi := old.odeme_sayisi; new.katilim_seri := old.katilim_seri;
    new.guven_puani := old.guven_puani; new.kurucu := old.kurucu;
  end if;
  return new;
end $$;
create or replace function public.koru_davet() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('eksik.davet_ic', true), '') <> '1'
     and auth.uid() is not null and auth.uid() = new.id then
    new.davet_eden := old.davet_eden; new.davet_sayisi := old.davet_sayisi;
  end if;
  return new;
end $$;
