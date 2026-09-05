-- ============================================================
--  EKSİK VAR — 19. migrasyon: "Yakınında maç açıldı" bildirimi
--  Yeni ilan → aynı ilçe/il, mevki eşleşmesi, tercih, engel, günlük sınır (2), ilan başına 50 kişi.
-- ============================================================

ALTER TABLE users ADD COLUMN notif_yakin BOOLEAN NOT NULL DEFAULT TRUE;

-- Tercih denetimi: notify_user 'yakin' türünü tanısın (mesaj/başvuru/hatırlatma kuralları aynen)
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
    IF p_type = 'yakin'      AND NOT u.notif_yakin      THEN RETURN; END IF;
    IF p_type = 'mesaj' THEN
        UPDATE notifications SET title = p_title, body = p_body, created_at = now()
         WHERE user_id = p_user AND type = 'mesaj' AND is_read = FALSE
           AND data->>'conversation_id' = p_data->>'conversation_id';
        IF FOUND THEN RETURN; END IF;
    END IF;
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (p_user, p_type, p_title, p_body, p_data);
END $$;

CREATE OR REPLACE FUNCTION trg_notify_nearby() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u RECORD; pos_keys TEXT[]; specified INT; free_slots INT; v_title TEXT; v_body TEXT; n INT := 0; pos_label TEXT;
BEGIN
    IF NEW.status <> 'acik' OR NEW.event_date < now() OR NEW.needed_count <= 0 THEN RETURN NEW; END IF;
    IF NEW.series_id IS NOT NULL AND NEW.series_id <> NEW.id THEN RETURN NEW; END IF;   -- serinin sonraki haftaları duyurulmaz

    IF NEW.kind = 'rakip' THEN
        v_title := 'Rakip arayan takım var 🆚';
        v_body := COALESCE(NEW.team_name, 'Bir takım') || ' · ' || COALESCE(NEW.format, '') || ' · ' || to_char(NEW.event_date, 'DD.MM HH24:MI') || COALESCE(' · ' || NULLIF(NEW.venue_name, ''), '');
        FOR u IN SELECT id FROM users
                  WHERE city_id = NEW.city_id AND id <> NEW.organizer_id AND status = 'aktif' AND notif_yakin
                    AND team_name IS NOT NULL AND team_name <> ''
                    AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = users.id AND b.blocked_id = NEW.organizer_id) OR (b.blocker_id = NEW.organizer_id AND b.blocked_id = users.id))
                    AND (SELECT count(*) FROM notifications nn WHERE nn.user_id = users.id AND nn.type = 'yakin' AND nn.created_at > now() - INTERVAL '24 hours') < 2
                  ORDER BY random() LIMIT 50 LOOP
            PERFORM notify_user(u.id, 'yakin', v_title, v_body, jsonb_build_object('event_id', NEW.id));
        END LOOP;
        RETURN NEW;
    END IF;

    SELECT array_agg(k) INTO pos_keys FROM jsonb_object_keys(NEW.needed_positions) k;
    SELECT COALESCE(SUM((v.value)::INT), 0) INTO specified FROM jsonb_each_text(NEW.needed_positions) v;
    free_slots := NEW.needed_count - specified;
    IF pos_keys IS NOT NULL AND array_length(pos_keys, 1) > 0 AND free_slots <= 0 THEN
        SELECT string_agg(k, ' / ') INTO pos_label FROM unnest(pos_keys) k;
        v_body := COALESCE(NULLIF(NEW.venue_name, ''), NEW.title) || ' · ' || to_char(NEW.event_date, 'DD.MM HH24:MI') || ' · ' || pos_label || ' arıyorlar';
    ELSE
        v_body := COALESCE(NULLIF(NEW.venue_name, ''), NEW.title) || ' · ' || to_char(NEW.event_date, 'DD.MM HH24:MI') || ' · ' || NEW.needed_count || ' eksik';
    END IF;
    v_title := 'Yakınında maç açıldı ⚽';

    FOR u IN SELECT id FROM users
              WHERE city_id = NEW.city_id AND id <> NEW.organizer_id AND status = 'aktif' AND notif_yakin
                AND (NEW.district_id IS NULL OR district_id IS NULL OR district_id = NEW.district_id)
                AND (free_slots > 0 OR pos_keys IS NULL OR positions && pos_keys)     -- mevki eşleşmesi
                AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = users.id AND b.blocked_id = NEW.organizer_id) OR (b.blocker_id = NEW.organizer_id AND b.blocked_id = users.id))
                AND (SELECT count(*) FROM notifications nn WHERE nn.user_id = users.id AND nn.type = 'yakin' AND nn.created_at > now() - INTERVAL '24 hours') < 2
              ORDER BY (positions && COALESCE(pos_keys, '{}')) DESC, random() LIMIT 50 LOOP
        PERFORM notify_user(u.id, 'yakin', v_title, v_body, jsonb_build_object('event_id', NEW.id));
        n := n + 1;
    END LOOP;
    RETURN NEW;
END $$;
CREATE TRIGGER events_notify_nearby AFTER INSERT ON events
    FOR EACH ROW EXECUTE FUNCTION trg_notify_nearby();
