--  EKSİK VAR — 12. migrasyon: Yedek listesi
--  Kadro doluyken yedek olunur (mevki tercihli). Yer açılınca sıradaki uygun yedeğe
--  organizatör onaylı bir "teklif" (başvuru) açılır; teklif süresince yer rezervedir,
--  süre dolarsa sıradaki yedeğe geçilir.
-- ============================================================

CREATE TABLE waitlist (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position   VARCHAR(20),                  -- NULL = farketmez
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);
CREATE INDEX idx_waitlist_event ON waitlist (event_id, created_at);
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY waitlist_read   ON waitlist FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_event_organizer(event_id));
CREATE POLICY waitlist_insert ON waitlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND is_active_user());
CREATE POLICY waitlist_delete ON waitlist FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_event_organizer(event_id));
GRANT SELECT, INSERT, DELETE ON waitlist TO authenticated;

ALTER TABLE applications
    ADD COLUMN from_waitlist    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN offer_expires_at TIMESTAMPTZ;

-- Herkese açık yedek sayısı
CREATE VIEW v_event_waitlist_count AS SELECT event_id, count(*)::INT AS waiting FROM waitlist GROUP BY event_id;
GRANT SELECT ON v_event_waitlist_count TO authenticated;

-- Yedek olma kuralları: kadroda/başvuruda olmayan, etkinliği açık olmayan (dolu) ya da mevkisi dolu kişiler
CREATE OR REPLACE FUNCTION trg_waitlist_check() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    IF e.organizer_id = NEW.user_id THEN RAISE EXCEPTION 'KENDI_ETKINLIGIN'; END IF;
    IF e.status NOT IN ('acik', 'doldu') OR e.event_date < now() THEN RAISE EXCEPTION 'ETKINLIK_KAPALI'; END IF;
    IF EXISTS (SELECT 1 FROM participants WHERE event_id = NEW.event_id AND user_id = NEW.user_id) THEN RAISE EXCEPTION 'ZATEN_KADRODA'; END IF;
    IF EXISTS (SELECT 1 FROM applications WHERE event_id = NEW.event_id AND applicant_id = NEW.user_id AND status = 'beklemede') THEN RAISE EXCEPTION 'BASVURU_VAR'; END IF;
    IF position_available(NEW.event_id, NEW.position) THEN RAISE EXCEPTION 'YER_VAR' USING HINT = 'Bu mevkide yer var, doğrudan başvur'; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER waitlist_check BEFORE INSERT ON waitlist FOR EACH ROW EXECUTE FUNCTION trg_waitlist_check();

-- Doluluk gerçek kadrodan sayılır (ayrılan/çıkarılan yer açar); bekleyen yedek teklifleri yeri rezerve eder
CREATE OR REPLACE FUNCTION position_available(p_event UUID, p_position TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; quota INT; used INT; specified INT; free_total INT; free_used INT; pos TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    pos := COALESCE(NULLIF(p_position, ''), 'farketmez');
    quota := (e.needed_positions ->> pos)::INT;
    IF quota IS NOT NULL THEN
        SELECT count(*) INTO used FROM (
            SELECT a.position FROM participants p JOIN applications a ON a.id = p.application_id WHERE p.event_id = p_event
            UNION ALL
            SELECT a.position FROM applications a WHERE a.event_id = p_event AND a.from_waitlist AND a.status = 'beklemede' AND a.offer_expires_at > now()
        ) x WHERE x.position = pos;
        RETURN used < quota;
    END IF;
    SELECT COALESCE(SUM((v.value)::INT), 0) INTO specified FROM jsonb_each_text(e.needed_positions) v;
    free_total := e.needed_count - specified;
    SELECT count(*) INTO free_used FROM (
        SELECT a.position FROM participants p LEFT JOIN applications a ON a.id = p.application_id WHERE p.event_id = p_event
        UNION ALL
        SELECT a.position FROM applications a WHERE a.event_id = p_event AND a.from_waitlist AND a.status = 'beklemede' AND a.offer_expires_at > now()
    ) x WHERE x.position IS NULL OR NOT (e.needed_positions ? x.position);
    RETURN free_used < free_total;
END $$;

-- Yer açılınca sıradaki uygun yedeğe teklif aç
CREATE OR REPLACE FUNCTION promote_from_waitlist(p_event UUID) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; w RECORD; n INT := 0; v_until TIMESTAMPTZ; v_id UUID;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND OR e.status NOT IN ('acik', 'doldu') OR e.event_date < now() THEN RETURN 0; END IF;
    FOR w IN SELECT * FROM waitlist WHERE event_id = p_event ORDER BY created_at LOOP
        IF NOT position_available(p_event, w.position) THEN CONTINUE; END IF;
        IF EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = w.user_id AND blocked_id = e.organizer_id) OR (blocker_id = e.organizer_id AND blocked_id = w.user_id))
           OR EXISTS (SELECT 1 FROM applications WHERE event_id = p_event AND applicant_id = w.user_id AND status = 'beklemede')
           OR NOT EXISTS (SELECT 1 FROM users WHERE id = w.user_id AND status = 'aktif') THEN
            DELETE FROM waitlist WHERE id = w.id; CONTINUE;
        END IF;
        v_until := LEAST(now() + INTERVAL '2 hours', e.event_date);
        BEGIN
            INSERT INTO applications (event_id, applicant_id, position, organizer_approved, organizer_approved_at, invited_by, invited_at, from_waitlist, offer_expires_at)
            VALUES (p_event, w.user_id, w.position, TRUE, now(), e.organizer_id, now(), TRUE, v_until) RETURNING id INTO v_id;
        EXCEPTION WHEN OTHERS THEN CONTINUE;   -- eski başvuru kaydı vb. çakışmalar: sıradakine geç
        END;
        DELETE FROM waitlist WHERE id = w.id;
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;

-- Tetikleyiciler: kadrodan çıkış ve kontenjan artışı
CREATE OR REPLACE FUNCTION trg_participant_deleted() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Yaklaşan, açık/dolu etkinlikte kadrodan çıkış = kontenjan açılır (ayrılma, çıkarma, ban: hepsi buradan)
    UPDATE events SET filled_count = GREATEST(0, filled_count - 1), status = 'acik'
     WHERE id = OLD.event_id AND status IN ('acik', 'doldu') AND event_date > now();
    PERFORM promote_from_waitlist(OLD.event_id);
    RETURN OLD;
END $$;
CREATE TRIGGER participants_deleted AFTER DELETE ON participants FOR EACH ROW EXECUTE FUNCTION trg_participant_deleted();

CREATE OR REPLACE FUNCTION trg_event_capacity_changed() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.needed_count > OLD.needed_count OR NEW.needed_positions IS DISTINCT FROM OLD.needed_positions THEN
        PERFORM promote_from_waitlist(NEW.id);
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER events_capacity_changed AFTER UPDATE OF needed_count, needed_positions ON events
    FOR EACH ROW EXECUTE FUNCTION trg_event_capacity_changed();

-- Süresi dolan teklifler: iptal + bildirim + sıradaki (cron, 10 dakikada bir)
CREATE OR REPLACE FUNCTION expire_waitlist_offers() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a RECORD; n INT := 0; t TEXT;
BEGIN
    FOR a IN SELECT * FROM applications WHERE from_waitlist AND status = 'beklemede' AND offer_expires_at < now() LOOP
        UPDATE applications SET status = 'iptal' WHERE id = a.id;
        SELECT title INTO t FROM events WHERE id = a.event_id;
        PERFORM notify_user(a.applicant_id, 'red', 'Yedek teklifi süresi doldu', t || ' için açılan yer sıradaki yedeğe geçti', jsonb_build_object('event_id', a.event_id));
        PERFORM promote_from_waitlist(a.event_id);
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('eksikvar-yedek-teklif', '*/10 * * * *', 'SELECT expire_waitlist_offers()');
    END IF;
END $$;

-- Bildirim: yedek teklifi ayrı metinle (davet trigger'ı genişletildi)
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
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    PERFORM notify_user(e.organizer_id, 'basvuru', 'Yeni başvuru',
        aname || ', ' || e.title || ' için başvurdu' || COALESCE(': "' || NULLIF(NEW.message, '') || '"', ''),
        jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
    RETURN NEW;
END $$;

-- leave_event: kontenjan düşürme artık kadro silme trigger'ında (çift düşüş olmasın)
CREATE OR REPLACE FUNCTION leave_event(p_event UUID)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; grp UUID; late BOOLEAN; uname TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF NOT EXISTS (SELECT 1 FROM participants WHERE event_id = p_event AND user_id = auth.uid()) THEN RAISE EXCEPTION 'KADRODA_DEGIL'; END IF;
    IF e.status IN ('iptal', 'tamamlandi') OR e.event_date < now() THEN RAISE EXCEPTION 'DURUM_UYGUN_DEGIL'; END IF;
    late := e.event_date < now() + INTERVAL '24 hours';
    SELECT full_name INTO uname FROM users WHERE id = auth.uid();
    DELETE FROM applications WHERE event_id = p_event AND applicant_id = auth.uid();   -- önce başvuru (yeniden başvurabilsin)
    DELETE FROM participants WHERE event_id = p_event AND user_id = auth.uid();         -- trigger: kontenjan + yedek
    IF late THEN UPDATE users SET no_show_count = no_show_count + 1 WHERE id = auth.uid(); END IF;
    grp := group_conversation_for(p_event);
    IF grp IS NOT NULL THEN
        IF e.series_id IS NULL THEN DELETE FROM conversation_members WHERE conversation_id = grp AND user_id = auth.uid(); END IF;
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (grp, NULL, 'sistem', format('%s kadrodan ayrıldı · başvurular yeniden açık', uname));
    END IF;
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (e.organizer_id, 'kadro', 'Kadrodan ayrılan var', uname || ', ' || e.title || ' kadrosundan ayrıldı', jsonb_build_object('event_id', p_event));
    RETURN late;
END $$;

CREATE OR REPLACE FUNCTION _apply_sanction(p_user UUID, p_status user_status, p_reason TEXT, p_until TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_phone TEXT; v_email TEXT; r RECORD;
BEGIN
    UPDATE users SET status = p_status, status_reason = p_reason, suspended_until = p_until WHERE id = p_user;
    IF p_status = 'banli' THEN
        SELECT phone, email INTO v_phone, v_email FROM users WHERE id = p_user;
        INSERT INTO banned_identifiers (id_hash, kind, reason) SELECT ident_hash(v_phone), 'phone', p_reason WHERE v_phone IS NOT NULL AND v_phone <> '' ON CONFLICT (id_hash) DO NOTHING;
        INSERT INTO banned_identifiers (id_hash, kind, reason) SELECT ident_hash(v_email), 'email', p_reason WHERE v_email IS NOT NULL AND v_email <> '' ON CONFLICT (id_hash) DO NOTHING;
        UPDATE users SET phone = NULL, email = NULL, full_name = 'Kapatılmış hesap', avatar_url = NULL, bio = NULL WHERE id = p_user;
    END IF;
    FOR r IN SELECT id, title FROM events WHERE organizer_id = p_user AND status IN ('acik', 'doldu') AND event_date > now() LOOP
        UPDATE events SET status = 'iptal' WHERE id = r.id;
        INSERT INTO notifications (user_id, type, title, body, data)
            SELECT user_id, 'etkinlik_iptal', r.title || ' iptal edildi', 'Organizatörün hesabı kapatıldı', jsonb_build_object('event_id', r.id)
              FROM participants WHERE event_id = r.id;
    END LOOP;
    UPDATE applications SET status = 'iptal' WHERE applicant_id = p_user AND status = 'beklemede';
    DELETE FROM participants p USING events e WHERE p.user_id = p_user AND e.id = p.event_id AND e.event_date > now() AND e.status IN ('acik', 'doldu');  -- trigger: kontenjan + yedek
    DELETE FROM conversation_members WHERE user_id = p_user;
    UPDATE auth.users SET banned_until = COALESCE(p_until, now() + INTERVAL '100 years') WHERE id = p_user;
END $$;

-- Kabul anındaki mevki kontrolü: yedek teklifi kendi rezervasyonunu kullanır (süresi geçmediyse)
CREATE OR REPLACE FUNCTION trg_approval_position_check() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.organizer_approved AND NEW.applicant_approved AND OLD.status = 'beklemede' THEN
        IF NEW.from_waitlist THEN
            IF NEW.offer_expires_at IS NOT NULL AND NEW.offer_expires_at < now() THEN
                RAISE EXCEPTION 'TEKLIF_SURESI_DOLDU' USING HINT = 'Yedek teklifinin süresi geçti';
            END IF;
            RETURN NEW;   -- yer bu kişiye rezerve
        END IF;
        IF NOT position_available(NEW.event_id, NEW.position) THEN
            RAISE EXCEPTION 'MEVKI_DOLU' USING HINT = 'Bu mevki bu arada doldu';
        END IF;
    END IF;
    RETURN NEW;
END $$;

-- Durum senkronu: kontenjan/doluluk değişince açık ↔ dolu otomatik (iptal/tamamlandı dokunulmaz)
CREATE OR REPLACE FUNCTION trg_event_status_sync() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IN ('acik', 'doldu') THEN
        NEW.status := CASE WHEN NEW.filled_count >= NEW.needed_count THEN 'doldu' ELSE 'acik' END;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER events_status_sync BEFORE UPDATE OF needed_count, filled_count, needed_positions ON events
    FOR EACH ROW EXECUTE FUNCTION trg_event_status_sync();

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;
    END IF;
END $$;

