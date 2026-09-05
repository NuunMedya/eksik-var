-- ============================================================
--  EKSİK VAR — 13. migrasyon: Rakip bul (takım-takım eşleşme)
--  kind='rakip' ilanı: eksik = 1 rakip takım. Teklif = başvuru, kabul = çift onay.
-- ============================================================

CREATE TYPE event_kind AS ENUM ('oyuncu', 'rakip');
ALTER TABLE events
    ADD COLUMN kind       event_kind NOT NULL DEFAULT 'oyuncu',
    ADD COLUMN team_name  VARCHAR(60),
    ADD COLUMN format     VARCHAR(8),                                              -- 5v5, 6v6, 7v7, 8v8, 11v11
    ADD COLUMN venue_mode VARCHAR(10) CHECK (venue_mode IN ('bizde', 'sizde', 'farketmez')),
    ADD COLUMN cost_mode  VARCHAR(12) CHECK (cost_mode IN ('yari_yariya', 'biz', 'siz'));
ALTER TABLE users ADD COLUMN team_name VARCHAR(60);
CREATE INDEX idx_events_kind ON events (kind, city_id, status, event_date);

-- Rakip ilanında kontenjan tek rakiptir; takım adı zorunlu
CREATE OR REPLACE FUNCTION trg_rakip_defaults() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.kind = 'rakip' THEN
        IF NEW.team_name IS NULL OR trim(NEW.team_name) = '' THEN RAISE EXCEPTION 'TAKIM_ADI_GEREKLI'; END IF;
        NEW.needed_count := 1;
        NEW.needed_positions := '{}'::jsonb;
        NEW.venue_mode := COALESCE(NEW.venue_mode, 'farketmez');
        NEW.cost_mode := COALESCE(NEW.cost_mode, 'yari_yariya');
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER a_events_rakip_defaults BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION trg_rakip_defaults();

-- Teklif veren kaptanın takım adı: users.team_name, yoksa adı
CREATE OR REPLACE FUNCTION team_label(p_user UUID) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(NULLIF(team_name, ''), full_name) FROM users WHERE id = p_user;
$$;

-- Bildirimler: rakip ilanına teklif ve maç ayarlandı metinleri
CREATE OR REPLACE FUNCTION trg_notify_application_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; aname TEXT; oname TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    IF NEW.from_waitlist THEN
        PERFORM notify_user(NEW.applicant_id, 'yedek', 'Yer açıldı! 🎉',
            e.title || ' · ' || to_char(NEW.offer_expires_at, 'HH24:MI') || '''ye kadar onaylarsan yerin kesin',
            jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (NEW.conversation_id, NULL, 'sistem', 'Yedek listesinden yer açıldı: "' || e.title || '". ' || to_char(NEW.offer_expires_at, 'HH24:MI') || '''ye kadar onaylarsan yerin kesinleşir.');
        RETURN NEW;
    END IF;
    IF NEW.invited_by IS NOT NULL THEN
        SELECT full_name INTO oname FROM users WHERE id = NEW.invited_by;
        PERFORM notify_user(NEW.applicant_id, 'davet', split_part(oname, ' ', 1) || ' seni kadroya davet etti',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || COALESCE(' · ' || NULLIF(NEW.position, ''), ''),
            jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (NEW.conversation_id, NULL, 'sistem', oname || ' seni "' || e.title || '" kadrosuna davet etti. Kabul edersen yerin kesinleşir.');
        RETURN NEW;
    END IF;
    IF e.kind = 'rakip' THEN
        PERFORM notify_user(e.organizer_id, 'basvuru', 'Yeni rakip teklifi',
            team_label(NEW.applicant_id) || ' takımı ' || e.title || ' için rakip olmak istiyor' || COALESCE(': "' || NULLIF(NEW.message, '') || '"', ''),
            jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
        RETURN NEW;
    END IF;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    PERFORM notify_user(e.organizer_id, 'basvuru', 'Yeni başvuru',
        aname || ', ' || e.title || ' için başvurdu' || COALESCE(': "' || NULLIF(NEW.message, '') || '"', ''),
        jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION trg_notify_application_update() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; oname TEXT; aname TEXT; grp UUID; invited BOOLEAN;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    SELECT full_name INTO oname FROM users WHERE id = e.organizer_id;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    invited := NEW.invited_by IS NOT NULL;
    IF NOT invited AND NOT NEW.from_waitlist AND NEW.organizer_approved AND NOT OLD.organizer_approved AND NEW.status = 'beklemede' THEN
        PERFORM notify_user(NEW.applicant_id, 'onay', split_part(oname, ' ', 1) || ' seni onayladı',
            CASE WHEN e.kind = 'rakip' THEN '"' || e.title || '" maçı için son onayı ver, maç kesinleşsin' ELSE '"' || e.title || '" için son onayı sen ver, yerin kesinleşsin' END,
            jsonb_build_object('conversation_id', NEW.conversation_id, 'event_id', NEW.event_id, 'application_id', NEW.id));
    END IF;
    IF NEW.status = 'onaylandi' AND OLD.status <> 'onaylandi' THEN
        grp := group_conversation_for(NEW.event_id);
        IF e.kind = 'rakip' THEN
            PERFORM notify_user(NEW.applicant_id, 'kadro', 'Maç ayarlandı! 🆚', e.team_name || ' ile ' || to_char(e.event_date, 'DD.MM HH24:MI') || ' · ' || COALESCE(e.venue_name, 'saha konuşulacak'),
                jsonb_build_object('event_id', NEW.event_id, 'conversation_id', grp));
            PERFORM notify_user(e.organizer_id, 'doldu', 'Rakip bulundu! 🆚', team_label(NEW.applicant_id) || ' takımıyla maç kesinleşti · ' || to_char(e.event_date, 'DD.MM HH24:MI'),
                jsonb_build_object('event_id', NEW.event_id, 'conversation_id', grp));
            IF grp IS NOT NULL THEN
                INSERT INTO messages (conversation_id, sender_id, type, content)
                VALUES (grp, NULL, 'sistem', 'Maç kesinleşti: ' || e.team_name || ' 🆚 ' || team_label(NEW.applicant_id) || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || '. Saha ve ücret detaylarını burada netleştirin.');
            END IF;
            RETURN NEW;
        END IF;
        PERFORM notify_user(NEW.applicant_id, 'kadro', 'Kadrodasın! 🎉',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || ' · ' || COALESCE(e.venue_name, ''),
            jsonb_build_object('event_id', NEW.event_id, 'conversation_id', grp));
        PERFORM notify_user(e.organizer_id, CASE WHEN e.filled_count >= e.needed_count THEN 'doldu' ELSE 'kadro' END,
            CASE WHEN e.filled_count >= e.needed_count THEN 'Kadro tamamlandı 🏆' ELSE 'Kadroya katılım' END,
            aname || CASE WHEN invited THEN ' davetini kabul etti' WHEN NEW.from_waitlist THEN ' yedekten geldi' ELSE ' onayladı' END || ' ve kadroya eklendi'
              || CASE WHEN e.filled_count >= e.needed_count THEN ' · kontenjan doldu' ELSE '' END,
            jsonb_build_object('event_id', NEW.event_id));
    END IF;
    IF NEW.status = 'reddedildi' AND OLD.status <> 'reddedildi' THEN
        IF invited THEN
            PERFORM notify_user(e.organizer_id, 'red', 'Davet reddedildi', aname || ', ' || e.title || ' davetini kabul etmedi', jsonb_build_object('event_id', NEW.event_id));
        ELSE
            PERFORM notify_user(NEW.applicant_id, 'red', CASE WHEN e.kind = 'rakip' THEN 'Rakip teklifin kabul edilmedi' ELSE 'Başvurun kabul edilmedi' END, e.title || ' · başka bir ilan dene', jsonb_build_object('event_id', NEW.event_id));
        END IF;
    END IF;
    RETURN NEW;
END $$;
