-- EKSİK VAR — Push gönderimi + Eksik Alarmı (bir kez, Supabase SQL Editor)
-- 1. bölüm: notifications tablosuna her kayıt → Expo push (kullanıcı tercihi ve sessiz saatlere saygılı)
-- 2. bölüm: yeni ilan açılınca eşleşen oyunculara "Yakınında eksik var" bildirimi
set search_path = public;
create extension if not exists pg_net with schema extensions;

-- ---------- 1) PUSH GÖNDERİCİ ----------
-- Bildirim türü → kullanıcının ilgili tercihi (bilinmeyen türler her zaman gider)
create or replace function public.push_izinli(p_user uuid, p_type text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when u.push_token is null or u.push_token = '' then false
    when u.quiet_enabled and (
      (u.quiet_start <= u.quiet_end and (now() at time zone 'Europe/Istanbul')::time between u.quiet_start and u.quiet_end) or
      (u.quiet_start >  u.quiet_end and ((now() at time zone 'Europe/Istanbul')::time >= u.quiet_start or (now() at time zone 'Europe/Istanbul')::time <= u.quiet_end))
    ) and p_type not in ('arama') then false
    when p_type in ('basvuru','onay','kabul','davet','teklif') then u.notif_basvuru
    when p_type in ('mesaj') then u.notif_mesaj
    when p_type in ('hatirlatma','odeme','yoklama','puanlama','rate') then u.notif_hatirlatma
    when p_type in ('yakin','alarm') then u.notif_yakin
    else true end
  from public.users u where u.id = p_user
$$;

create or replace function public.trg_notification_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare tok text;
begin
  if not public.push_izinli(new.user_id, new.type) then return new; end if;
  select push_token into tok from public.users where id = new.user_id;
  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := '{"Content-Type":"application/json","Accept":"application/json"}'::jsonb,
    body := jsonb_build_object(
      'to', tok, 'title', new.title, 'body', coalesce(new.body, ''), 'sound', 'default',
      'channelId', 'default', 'priority', 'high',
      'data', coalesce(new.data, '{}'::jsonb) || jsonb_build_object('type', new.type, 'notifId', new.id)),
    timeout_milliseconds := 5000);
  return new;
exception when others then
  return new;   -- push başarısız olsa da uygulama içi bildirim yazılır
end $$;
drop trigger if exists notification_push on public.notifications;
create trigger notification_push after insert on public.notifications
  for each row execute function public.trg_notification_push();

-- ---------- 2) EKSİK ALARMI ----------
-- Oyuncu tercihleri (ana anahtar: mevcut notif_yakin = "Yakınımda maç açılınca"; günde en çok 2 alarm)
alter table public.users add column if not exists alarm_gunler smallint[] not null default '{0,1,2,3,4,5,6}';  -- 0=Pazar … 6=Cumartesi
alter table public.users add column if not exists alarm_saat_bas smallint not null default 17;                   -- 17:00'den
alter table public.users add column if not exists alarm_saat_bit smallint not null default 24;                   -- 24:00'e
alter table public.users add column if not exists alarm_tum_il boolean not null default false;                    -- false = yalnız kendi ilçem
grant update (alarm_gunler, alarm_saat_bas, alarm_saat_bit, alarm_tum_il) on public.users to authenticated;

-- Yeni ilan → eşleşen oyunculara bildirim (en çok 300 kişi, organizatör hariç)
create or replace function public.trg_event_alarm() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  yerel timestamptz; gun int; saat int; ilce text; il text; mevki_metin text; n int := 0;
begin
  if new.kind is distinct from 'oyuncu' or coalesce(new.needed_count, 0) <= 0 or new.status <> 'acik' then return new; end if;
  yerel := new.event_date at time zone 'Europe/Istanbul';
  gun := extract(dow from yerel)::int; saat := extract(hour from yerel)::int;
  select d.name into ilce from public.districts d where d.id = new.district_id;
  select c.name into il from public.cities c where c.id = new.city_id;
  select string_agg(k || ' ' || v, ', ') into mevki_metin
    from jsonb_each_text(coalesce(new.needed_positions, '{}'::jsonb)) as t(k, v);

  insert into public.notifications (user_id, type, title, body, data)
  select u.id, 'alarm',
         '⚡ Yakınında eksik var · ' || coalesce(ilce, il, ''),
         to_char(yerel, 'DD Mon HH24:MI') || ' · ' || new.needed_count || ' eksik' ||
           case when mevki_metin is not null then ' (' || mevki_metin || ')' else '' end ||
           case when coalesce(new.price_per_person, 0) > 0 then ' · ' || new.price_per_person::int || '₺' else ' · ücretsiz' end ||
           ' · ' || left(new.title, 40),
         jsonb_build_object('eventId', new.id, 'alarm', true)
    from public.users u
   where u.id <> new.organizer_id
     and u.status = 'aktif'
     and u.notif_yakin
     and u.push_token is not null
     and u.city_id = new.city_id
     and (u.alarm_tum_il or u.district_id is null or new.district_id is null or u.district_id = new.district_id)
     and (u.fav_cats = '[]'::jsonb or u.fav_cats @> to_jsonb(new.category_id))
     and gun = any(u.alarm_gunler)
     and saat >= u.alarm_saat_bas and saat < u.alarm_saat_bit
     and (
       coalesce(new.needed_positions, '{}'::jsonb) = '{}'::jsonb
       or u.positions = '[]'::jsonb
       or exists (select 1 from jsonb_object_keys(new.needed_positions) k where u.positions ? k)
     )
     and (select count(*) from public.notifications nn where nn.user_id = u.id and nn.type = 'alarm' and nn.created_at >= now() - interval '24 hours') < 2
     and not exists (select 1 from public.blocks b where (b.blocker_id = u.id and b.blocked_id = new.organizer_id) or (b.blocker_id = new.organizer_id and b.blocked_id = u.id))
   order by (u.district_id = new.district_id) desc, u.reliability_pct desc nulls last
   limit 300;
  return new;
end $$;
drop trigger if exists event_alarm on public.events;
create trigger event_alarm after insert on public.events
  for each row execute function public.trg_event_alarm();
