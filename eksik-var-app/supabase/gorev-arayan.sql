-- EKSİK VAR — "Hakem / kameraman aranıyor" (bir kez, Supabase SQL Editor)
-- Organizatör ilanda "hakem lazım" / "kameraman lazım" der → şehirdeki ONAYLI hakem/medya hesaplarına bildirim gider →
-- biri "Ben yönetirim / Ben çekerim" der → maça atanır, grup sohbetine eklenir, organizatöre bildirim.
set search_path = public;

alter table public.events add column if not exists gorev_hakem boolean not null default false;
alter table public.events add column if not exists gorev_medya boolean not null default false;
alter table public.events add column if not exists hakem_id uuid references public.users(id) on delete set null;
alter table public.events add column if not exists medya_id uuid references public.users(id) on delete set null;
grant insert (gorev_hakem, gorev_medya) on public.events to authenticated;
grant update (gorev_hakem, gorev_medya) on public.events to authenticated;
create index if not exists idx_events_gorev on public.events (city_id, event_date) where gorev_hakem or gorev_medya;

-- Rol metinleri
create or replace function public.gorev_ad(p_rol text, p_hal text) returns text
language sql immutable as $$
  select case p_rol
    when 'hakem' then case p_hal when 'kim' then 'Hakem' when 'ne' then 'maçını yönetecek' else 'hakem' end
    when 'medya' then case p_hal when 'kim' then 'Kameraman' when 'ne' then 'maçını çekecek' else 'kameraman' end
    else p_rol end
$$;

-- Yeni / güncellenen ilan → şehirdeki onaylı rol hesaplarına "görev var" bildirimi (ilan başına bir kez)
create or replace function public.trg_event_gorev() returns trigger
language plpgsql security definer set search_path = public as $$
declare yerel timestamptz; ilce text; il text; rol text;
begin
  if new.status <> 'acik' or new.event_date < now() then return new; end if;
  if tg_op = 'UPDATE' and new.gorev_hakem = old.gorev_hakem and new.gorev_medya = old.gorev_medya then return new; end if;
  yerel := new.event_date at time zone 'Europe/Istanbul';
  select d.name into ilce from public.districts d where d.id = new.district_id;
  select c.name into il from public.cities c where c.id = new.city_id;
  foreach rol in array array['hakem','medya'] loop
    if (rol = 'hakem' and new.gorev_hakem and new.hakem_id is null) or (rol = 'medya' and new.gorev_medya and new.medya_id is null) then
      insert into public.notifications (user_id, type, title, body, data)
      select u.id, 'gorev',
             (case rol when 'hakem' then '🟣 ' else '🎥 ' end) || public.gorev_ad(rol, 'kim') || ' aranıyor · ' || coalesce(ilce, il, ''),
             to_char(yerel, 'DD Mon HH24:MI') || ' · ' || left(new.title, 40) || ' · İlk diyen alır',
             jsonb_build_object('eventId', new.id, 'rol', rol)
        from public.users u
       where u.id <> new.organizer_id and u.status = 'aktif'
         and u.hesap_turu = rol and u.hesap_onay = 'onayli'
         and u.city_id = new.city_id
         and not exists (select 1 from public.notifications n where n.user_id = u.id and n.type = 'gorev' and n.data->>'eventId' = new.id::text and n.data->>'rol' = rol)
         and not exists (select 1 from public.blocks b where (b.blocker_id = u.id and b.blocked_id = new.organizer_id) or (b.blocker_id = new.organizer_id and b.blocked_id = u.id))
       limit 300;
    end if;
  end loop;
  return new;
end $$;
drop trigger if exists event_gorev on public.events;
create trigger event_gorev after insert or update of gorev_hakem, gorev_medya on public.events
  for each row execute function public.trg_event_gorev();

-- Onaylı hakem/medya görevi alır
create or replace function public.gorev_al(p_event uuid, p_rol text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); u record; e record; conv bigint;
begin
  if p_rol not in ('hakem','medya') then raise exception 'Geçersiz rol'; end if;
  select hesap_turu, hesap_onay, full_name, status into u from public.users where id = me;
  if u is null or u.status <> 'aktif' then raise exception 'Hesap uygun değil'; end if;
  if u.hesap_turu <> p_rol or u.hesap_onay <> 'onayli' then raise exception 'Bu görev için onaylı % hesabı gerekir', public.gorev_ad(p_rol, 'ki'); end if;
  select * into e from public.events where id = p_event for update;
  if e is null or e.status not in ('acik','doldu') or e.event_date < now() then raise exception 'İlan artık uygun değil'; end if;
  if e.organizer_id = me then raise exception 'Kendi maçına görev alamazsın'; end if;
  if (p_rol = 'hakem' and e.hakem_id is not null) or (p_rol = 'medya' and e.medya_id is not null) then raise exception 'Bu görev az önce alındı'; end if;
  if p_rol = 'hakem' then update public.events set hakem_id = me where id = p_event;
  else update public.events set medya_id = me where id = p_event; end if;
  -- grup sohbetine ekle (koordinasyon)
  select id into conv from public.conversations where event_id = p_event limit 1;
  if conv is not null then
    insert into public.conversation_members (conversation_id, user_id, role) values (conv, me, 'uye') on conflict do nothing;
    insert into public.messages (conversation_id, sender_id, type, content)
    values (conv, null, 'sistem', u.full_name || ' ' || public.gorev_ad(p_rol, 'ki') || ' olarak katıldı');
  end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (e.organizer_id, 'gorev', (case p_rol when 'hakem' then '🟣 ' else '🎥 ' end) || public.gorev_ad(p_rol, 'kim') || ' bulundu',
          u.full_name || ' ' || public.gorev_ad(p_rol, 'ne') || ' · ' || left(e.title, 40), jsonb_build_object('eventId', p_event, 'rol', p_rol));
  return true;
end $$;
grant execute on function public.gorev_al(uuid, text) to authenticated;

-- Görevi bırak (görevli kendisi) ya da kaldır (organizatör)
create or replace function public.gorev_birak(p_event uuid, p_rol text) returns boolean
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); e record; kim uuid; ad text; conv bigint;
begin
  select * into e from public.events where id = p_event for update;
  if e is null then raise exception 'İlan bulunamadı'; end if;
  kim := case p_rol when 'hakem' then e.hakem_id when 'medya' then e.medya_id end;
  if kim is null then return false; end if;
  if me <> kim and me <> e.organizer_id then raise exception 'Yetkin yok'; end if;
  if p_rol = 'hakem' then update public.events set hakem_id = null where id = p_event;
  else update public.events set medya_id = null where id = p_event; end if;
  select full_name into ad from public.users where id = kim;
  select id into conv from public.conversations where event_id = p_event limit 1;
  if conv is not null and not exists (select 1 from public.participants p where p.event_id = p_event and p.user_id = kim) then
    delete from public.conversation_members where conversation_id = conv and user_id = kim and role = 'uye';
  end if;
  if me = kim then
    insert into public.notifications (user_id, type, title, body, data)
    values (e.organizer_id, 'gorev', public.gorev_ad(p_rol, 'kim') || ' görevi bıraktı', ad || ' · ' || left(e.title, 40) || ' · yeniden arıyoruz', jsonb_build_object('eventId', p_event, 'rol', p_rol));
    -- tekrar aransın: eski bildirimler engel olmasın
    delete from public.notifications n where n.type = 'gorev' and n.data->>'eventId' = p_event::text and n.data->>'rol' = p_rol and n.user_id <> e.organizer_id and not n.is_read;
    if p_rol = 'hakem' then update public.events set gorev_hakem = false where id = p_event; update public.events set gorev_hakem = true where id = p_event;
    else update public.events set gorev_medya = false where id = p_event; update public.events set gorev_medya = true where id = p_event; end if;
  else
    insert into public.notifications (user_id, type, title, body, data)
    values (kim, 'gorev', 'Görevden çıkarıldın', left(e.title, 40) || ' maçındaki ' || public.gorev_ad(p_rol, 'ki') || ' görevin organizatör tarafından kaldırıldı', jsonb_build_object('eventId', p_event, 'rol', p_rol));
  end if;
  return true;
end $$;
grant execute on function public.gorev_birak(uuid, text) to authenticated;

-- Görevliler maçı görebilsin (ilan şehir akışında zaten görünür; burada ek bir şey gerekmez)
