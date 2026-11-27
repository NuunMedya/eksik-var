-- EKSİK VAR — Saat dilimi düzeltmesi (bir kez, Supabase SQL Editor → Run). Geriye uyumlu: yalnız iki fonksiyonun
-- gövdesi yenilenir, tablo/kolon/politika değişmez. Supabase oturumu UTC çalıştığı için "Kadrodasın 🎉" bildirimi ve
-- "Bu hafta var mısın?" anket başlığı maç saatini 3 saat erken gösteriyordu (21:00 → 18:00).
-- Yeni göçler (eksik-alarmi.sql, bos-saat.sql) zaten 'Europe/Istanbul' kullanıyor; bu dosya eskileri hizalar.
set search_path = public;

create or replace function public.trg_application_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = new.event_id;
  -- çift onay tamam → kadroya al
  if new.organizer_approved and new.applicant_approved and old.status = 'beklemede' and new.status = 'beklemede' then
    new.status := 'onaylandi';
  end if;
  if new.status = 'onaylandi' and old.status <> 'onaylandi' then
    if e.filled_count >= e.needed_count then perform public.hata('kadro_dolu'); end if;
    insert into public.participants (event_id, user_id, position)
    values (new.event_id, new.applicant_id, new.position) on conflict do nothing;
    insert into public.notifications (user_id, type, title, body, data)
    values (new.applicant_id, 'onay', 'Kadrodasın 🎉', e.title || ' · ' || to_char(e.event_date at time zone 'Europe/Istanbul', 'DD.MM HH24:MI'),
            jsonb_build_object('eventId', e.id));
  elsif new.status = 'reddedildi' and old.status <> 'reddedildi' then
    insert into public.notifications (user_id, type, title, body, data)
    values (new.applicant_id, 'red', 'Başvurun sonuçlandı', e.title || ' için bu kez olmadı', jsonb_build_object('eventId', e.id));
  end if;
  return new;
end $$;

create or replace function public.ask_availability(p_event uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare e record; v_conv bigint; v_poll uuid;
begin
  select * into e from public.events where id = p_event;
  if e is null or e.organizer_id <> auth.uid() then perform public.hata('yetki_yok'); end if;
  select id into v_conv from public.conversations
   where type = 'grup' and (event_id = p_event or (series_id is not null and series_id = e.series_id)) limit 1;
  if v_conv is null then perform public.hata('grup_yok'); end if;
  insert into public.polls (conversation_id, event_id, kind, question, options, multiple, created_by)
  values (v_conv, p_event, 'varmisin', 'Bu hafta var mısın? · ' || to_char(e.event_date at time zone 'Europe/Istanbul', 'DD.MM HH24:MI'),
          '[{"id":"varim","text":"Varım ✅"},{"id":"yokum","text":"Yokum ❌"},{"id":"belirsiz","text":"Belli değil 🤔"}]'::jsonb,
          false, auth.uid()) returning id into v_poll;
  insert into public.messages (conversation_id, sender_id, type, content, poll_id)
  values (v_conv, auth.uid(), 'metin', '📊 Bu hafta var mısın? · ' || to_char(e.event_date at time zone 'Europe/Istanbul', 'DD.MM HH24:MI'), v_poll);
  update public.events set availability_asked_at = now(), availability_poll_id = v_poll where id = p_event;
  return v_poll;
end $$;
