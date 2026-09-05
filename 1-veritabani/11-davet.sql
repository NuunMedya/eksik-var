-- ============================================================
--  EKSİK VAR — 11. migrasyon: Kadroya davet
--  Davet = organizatör onayı hazır bir başvuru (invited_by dolu). Oyuncunun kabulü
--  son onaydır; kadro, grup, mevki kotası ve bildirimler aynı yoldan işler.
-- ============================================================

ALTER TABLE applications
    ADD COLUMN invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN invited_at TIMESTAMPTZ;

-- Organizatör davet eder (RLS'i aşan tek yol; tüm kontroller burada)
CREATE OR REPLACE FUNCTION invite_user(p_event UUID, p_user UUID, p_position TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; v_id UUID;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF NOT is_active_user() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF p_user = e.organizer_id THEN RAISE EXCEPTION 'KENDINI_DAVET_EDEMEZSIN'; END IF;
    IF e.status <> 'acik' OR e.event_date < now() THEN RAISE EXCEPTION 'ETKINLIK_KAPALI'; END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user AND status <> 'banli') THEN RAISE EXCEPTION 'KULLANICI_YOK'; END IF;
    IF EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = p_user AND blocked_id = e.organizer_id) OR (blocker_id = e.organizer_id AND blocked_id = p_user)) THEN
        RAISE EXCEPTION 'ENGEL' USING HINT = 'Bu kişiyle aranızda engel var';
    END IF;
    IF EXISTS (SELECT 1 FROM applications WHERE event_id = p_event AND applicant_id = p_user) THEN
        RAISE EXCEPTION 'DAVET_VAR' USING HINT = 'Bu kişi zaten başvurmuş ya da davet edilmiş';
    END IF;
    INSERT INTO applications (event_id, applicant_id, position, organizer_approved, organizer_approved_at, invited_by, invited_at, message)
    VALUES (p_event, p_user, NULLIF(p_position, ''), TRUE, now(), e.organizer_id, now(), NULL)
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION invite_user(UUID, UUID, TEXT) TO authenticated;

-- Başvuru geldi → organizatör; davet geldi → davet edilen
CREATE OR REPLACE FUNCTION trg_notify_application_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; aname TEXT; oname TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    IF NEW.invited_by IS NOT NULL THEN
        SELECT full_name INTO oname FROM users WHERE id = NEW.invited_by;
        PERFORM notify_user(NEW.applicant_id, 'davet', split_part(oname, ' ', 1) || ' seni kadroya davet etti',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || COALESCE(' · ' || NULLIF(NEW.position, ''), ''),
            jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (NEW.conversation_id, NULL, 'sistem', oname || ' seni "' || e.title || '" kadrosuna davet etti. Kabul edersen yerin kesinleşir.');
        RETURN NEW;
    END IF;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    PERFORM notify_user(e.organizer_id, 'basvuru', 'Yeni başvuru',
        aname || ', ' || e.title || ' için başvurdu' || COALESCE(': "' || NULLIF(NEW.message, '') || '"', ''),
        jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
    RETURN NEW;
END $$;

-- Durum değişimi: davet reddi organizatöre gider; kabulde metin "davetini kabul etti"
CREATE OR REPLACE FUNCTION trg_notify_application_update() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; oname TEXT; aname TEXT; grp UUID; invited BOOLEAN;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    SELECT full_name INTO oname FROM users WHERE id = e.organizer_id;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    invited := NEW.invited_by IS NOT NULL;
    IF NOT invited AND NEW.organizer_approved AND NOT OLD.organizer_approved AND NEW.status = 'beklemede' THEN
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
            aname || CASE WHEN invited THEN ' davetini kabul etti' ELSE ' onayladı' END || ' ve kadroya eklendi'
              || CASE WHEN e.filled_count >= e.needed_count THEN ' · kontenjan doldu' ELSE '' END,
            jsonb_build_object('event_id', NEW.event_id));
    END IF;
    IF NEW.status = 'reddedildi' AND OLD.status <> 'reddedildi' THEN
        IF invited THEN
            PERFORM notify_user(e.organizer_id, 'red', 'Davet reddedildi', aname || ', ' || e.title || ' davetini kabul etmedi', jsonb_build_object('event_id', NEW.event_id));
        ELSE
            PERFORM notify_user(NEW.applicant_id, 'red', 'Başvurun kabul edilmedi', e.title || ' · başka bir kadro dene', jsonb_build_object('event_id', NEW.event_id));
        END IF;
    END IF;
    RETURN NEW;
END $$;
