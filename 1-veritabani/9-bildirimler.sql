-- ============================================================
--  EKSİK VAR — 9. migrasyon: Bildirim üretimi + hatırlatmalar + push belirteci
--  Bildirimler sunucuda üretilir; uygulama yalnızca gösterir. Push iletimi
--  notifications tablosuna bağlı Database Webhook → Edge Function (send-push).
-- ============================================================

ALTER TABLE users  ADD COLUMN push_token TEXT;
ALTER TABLE events ADD COLUMN reminded_at TIMESTAMPTZ, ADD COLUMN attendance_reminded_at TIMESTAMPTZ;

-- a) Tek giriş noktası: kullanıcı tercihlerine bakar, mesaj bildirimlerini sohbet başına tek satırda toplar
CREATE OR REPLACE FUNCTION notify_user(p_user UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u users%ROWTYPE;
BEGIN
    IF p_user IS NULL THEN RETURN; END IF;
    SELECT * INTO u FROM users WHERE id = p_user;
    IF NOT FOUND OR u.status = 'banli' THEN RETURN; END IF;
    IF p_type = 'basvuru'    AND NOT u.notif_basvuru    THEN RETURN; END IF;
    IF p_type = 'mesaj'      AND NOT u.notif_mesaj      THEN RETURN; END IF;
    IF p_type = 'hatirlatma' AND NOT u.notif_hatirlatma THEN RETURN; END IF;
    IF p_type = 'mesaj' THEN
        UPDATE notifications SET title = p_title, body = p_body, created_at = now()
         WHERE user_id = p_user AND type = 'mesaj' AND is_read = FALSE
           AND data->>'conversation_id' = p_data->>'conversation_id';
        IF FOUND THEN RETURN; END IF;
    END IF;
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (p_user, p_type, p_title, p_body, p_data);
END $$;

-- b) Başvuru geldi → organizatör
CREATE OR REPLACE FUNCTION trg_notify_application_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; aname TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    PERFORM notify_user(e.organizer_id, 'basvuru', 'Yeni başvuru',
        aname || ', ' || e.title || ' için başvurdu' || COALESCE(': "' || NULLIF(NEW.message, '') || '"', ''),
        jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
    RETURN NEW;
END $$;
CREATE TRIGGER notify_application_insert AFTER INSERT ON applications
    FOR EACH ROW EXECUTE FUNCTION trg_notify_application_insert();

-- c) Başvuru durumu değişti → onay / kadro / doldu / ret
CREATE OR REPLACE FUNCTION trg_notify_application_update() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; oname TEXT; aname TEXT; grp UUID;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    SELECT full_name INTO oname FROM users WHERE id = e.organizer_id;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    IF NEW.organizer_approved AND NOT OLD.organizer_approved AND NEW.status = 'beklemede' THEN
        PERFORM notify_user(NEW.applicant_id, 'onay', split_part(oname, ' ', 1) || ' seni onayladı',
            '"' || e.title || '" için son onayı sen ver, yerin kesinleşsin',
            jsonb_build_object('conversation_id', NEW.conversation_id, 'event_id', NEW.event_id, 'application_id', NEW.id));
    END IF;
    IF NEW.status = 'onaylandi' AND OLD.status <> 'onaylandi' THEN
        grp := group_conversation_for(NEW.event_id);
        PERFORM notify_user(NEW.applicant_id, 'kadro', 'Kadrodasın! 🎉',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || ' · ' || COALESCE(e.venue_name, ''),
            jsonb_build_object('event_id', NEW.event_id, 'conversation_id', grp));
        PERFORM notify_user(e.organizer_id, CASE WHEN e.filled_count >= e.needed_count THEN 'doldu' ELSE 'kadro' END,
            CASE WHEN e.filled_count >= e.needed_count THEN 'Kadro tamamlandı 🏆' ELSE 'Kadroya katılım' END,
            aname || ' onayladı ve kadroya eklendi' || CASE WHEN e.filled_count >= e.needed_count THEN ' · kontenjan doldu' ELSE '' END,
            jsonb_build_object('event_id', NEW.event_id));
    END IF;
    IF NEW.status = 'reddedildi' AND OLD.status <> 'reddedildi' THEN
        PERFORM notify_user(NEW.applicant_id, 'red', 'Başvurun kabul edilmedi', e.title || ' · başka bir kadro dene', jsonb_build_object('event_id', NEW.event_id));
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER notify_application_update AFTER UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION trg_notify_application_update();

-- d) Mesaj geldi → sohbetin diğer üyeleri (gönderen ve sessize alanlar hariç)
CREATE OR REPLACE FUNCTION trg_notify_message() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c conversations%ROWTYPE; sname TEXT; m RECORD;
BEGIN
    IF NEW.sender_id IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO c FROM conversations WHERE id = NEW.conversation_id;
    SELECT full_name INTO sname FROM users WHERE id = NEW.sender_id;
    FOR m IN SELECT user_id FROM conversation_members
              WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id AND NOT is_muted LOOP
        PERFORM notify_user(m.user_id, 'mesaj',
            sname || CASE WHEN c.type = 'grup' THEN ' · ' || COALESCE(c.name, 'Grup') ELSE '' END,
            left(COALESCE(NEW.content, '📷 Fotoğraf'), 120),
            jsonb_build_object('conversation_id', NEW.conversation_id));
    END LOOP;
    RETURN NEW;
END $$;
CREATE TRIGGER notify_message AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION trg_notify_message();

-- e) Haftalık seri: gelecek hafta açılınca gruba duyuru bildirimi (on_event_created genişletildi)
CREATE OR REPLACE FUNCTION on_event_created() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_chat_id UUID; m RECORD;
BEGIN
    IF NEW.series_id IS NOT NULL THEN
        SELECT id INTO v_chat_id FROM conversations WHERE type = 'grup' AND series_id = NEW.series_id;
    END IF;
    IF v_chat_id IS NULL THEN
        INSERT INTO conversations (type, event_id, series_id, name, created_by)
        VALUES ('grup', NEW.id, NEW.series_id, NEW.title, NEW.organizer_id) RETURNING id INTO v_chat_id;
        INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (v_chat_id, NEW.organizer_id, 'yonetici');
    ELSE
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (v_chat_id, NULL, 'sistem', format('Haftaya aynı saat: %s · %s eksik, başvurular açık', to_char(NEW.event_date, 'DD.MM HH24:MI'), NEW.needed_count));
        FOR m IN SELECT user_id FROM conversation_members WHERE conversation_id = v_chat_id AND user_id <> NEW.organizer_id LOOP
            PERFORM notify_user(m.user_id, 'tekrar', 'Haftaya aynı saat',
                NEW.title || ' · ' || to_char(NEW.event_date, 'DD.MM HH24:MI') || ' · ' || NEW.needed_count || ' eksik, başvurular açık',
                jsonb_build_object('event_id', NEW.id, 'conversation_id', v_chat_id));
        END LOOP;
    END IF;
    UPDATE users SET events_organized = events_organized + 1 WHERE id = NEW.organizer_id;
    RETURN NEW;
END $$;

-- f) Saatlik hatırlatmalar: maça ~2 saat kala herkese; maç bitince organizatöre "yoklama bekliyor"
CREATE OR REPLACE FUNCTION send_event_reminders() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e RECORD; p RECORD; n INT := 0;
BEGIN
    FOR e IN SELECT * FROM events WHERE status IN ('acik', 'doldu') AND reminded_at IS NULL
              AND event_date BETWEEN now() + INTERVAL '90 minutes' AND now() + INTERVAL '3 hours' LOOP
        PERFORM notify_user(e.organizer_id, 'hatirlatma', 'Maç 2 saat sonra',
            e.title || ' · ' || COALESCE(e.venue_name, '') || ' · ' || to_char(e.event_date, 'HH24:MI'), jsonb_build_object('event_id', e.id));
        FOR p IN SELECT user_id FROM participants WHERE event_id = e.id LOOP
            PERFORM notify_user(p.user_id, 'hatirlatma', 'Maç 2 saat sonra',
                e.title || ' · ' || COALESCE(e.venue_name, '') || ' · ' || to_char(e.event_date, 'HH24:MI'), jsonb_build_object('event_id', e.id));
        END LOOP;
        UPDATE events SET reminded_at = now() WHERE id = e.id;
        n := n + 1;
    END LOOP;
    FOR e IN SELECT * FROM events WHERE status IN ('acik', 'doldu') AND attendance_reminded_at IS NULL
              AND event_date < now() - INTERVAL '3 hours' AND event_date > now() - INTERVAL '48 hours' LOOP
        PERFORM notify_user(e.organizer_id, 'yoklama', 'Yoklama bekliyor',
            e.title || ' oynandı — gelmeyenleri işaretle, maçı tamamla', jsonb_build_object('event_id', e.id));
        UPDATE events SET attendance_reminded_at = now() WHERE id = e.id;
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('eksikvar-hatirlatma', '15 * * * *', 'SELECT send_event_reminders()');
    END IF;
END $$;

-- g) Bildirimler gerçek zamanlı yayınlanır (uygulama listeyi anında günceller)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;
