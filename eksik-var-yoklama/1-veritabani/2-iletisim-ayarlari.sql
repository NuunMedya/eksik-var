-- ============================================================
--  EKSİK VAR — 2. migrasyon: İletişim tercihleri + aramalar
--  Mevcut şemanın (eksik_var_schema.sql) üzerine çalıştırılır.
--  Uygulamadaki kurallarla birebir aynı mantık sunucuda da
--  uygulanır; böylece ayarlar istemci tarafında atlatılamaz.
-- ============================================================
BEGIN;

-- 1) Enum tipleri
CREATE TYPE contact_mode  AS ENUM ('ikisi', 'mesaj', 'arama');   -- sana nasıl ulaşılsın?
CREATE TYPE contact_scope AS ENUM ('herkes', 'kadro');           -- kimler ulaşabilir?
CREATE TYPE call_status   AS ENUM ('araniyor', 'cevaplandi', 'cevapsiz', 'reddedildi', 'engellendi');

-- 2) Kullanıcı tercihleri
ALTER TABLE users
    ADD COLUMN contact_mode     contact_mode  NOT NULL DEFAULT 'ikisi',
    ADD COLUMN contact_scope    contact_scope NOT NULL DEFAULT 'herkes',
    ADD COLUMN quiet_enabled    BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN quiet_start      TIME          NOT NULL DEFAULT '22:00',
    ADD COLUMN quiet_end        TIME          NOT NULL DEFAULT '08:00',
    ADD COLUMN notif_basvuru    BOOLEAN       NOT NULL DEFAULT TRUE,
    ADD COLUMN notif_mesaj      BOOLEAN       NOT NULL DEFAULT TRUE,
    ADD COLUMN notif_hatirlatma BOOLEAN       NOT NULL DEFAULT TRUE;

-- 3) Arama kayıtları (numaralar hiç saklanmaz; aramalar uygulama içi)
CREATE TABLE calls (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    caller_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callee_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       call_status NOT NULL DEFAULT 'araniyor',
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    answered_at  TIMESTAMPTZ,
    ended_at     TIMESTAMPTZ,
    CHECK (caller_id <> callee_id)
);
CREATE INDEX idx_calls_callee ON calls (callee_id, started_at DESC);
CREATE INDEX idx_calls_caller ON calls (caller_id, started_at DESC);

-- 4) Yardımcı: aynı kadroda mıyız? (ortak etkinlikte katılımcı/organizatör)
CREATE OR REPLACE FUNCTION shares_squad(p_a UUID, p_b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM (
            SELECT event_id, user_id FROM participants
            UNION
            SELECT id AS event_id, organizer_id AS user_id FROM events
        ) m1
        JOIN (
            SELECT event_id, user_id FROM participants
            UNION
            SELECT id AS event_id, organizer_id AS user_id FROM events
        ) m2 ON m1.event_id = m2.event_id
        WHERE m1.user_id = p_a AND m2.user_id = p_b
    );
$$;

-- 5) Yardımcı: sessiz saatlerde mi? (gece yarısını aşan aralıkları da destekler)
CREATE OR REPLACE FUNCTION in_quiet_hours(p_user UUID, p_now TIME DEFAULT localtime)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT COALESCE((
        SELECT quiet_enabled AND (
            CASE WHEN quiet_start <= quiet_end
                 THEN p_now >= quiet_start AND p_now < quiet_end
                 ELSE p_now >= quiet_start OR  p_now < quiet_end
            END)
        FROM users WHERE id = p_user
    ), FALSE);
$$;

-- 6) İzin kontrolü: p_caller, p_callee'yi arayabilir mi?
CREATE OR REPLACE FUNCTION can_call(p_caller UUID, p_callee UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE u users%ROWTYPE;
BEGIN
    SELECT * INTO u FROM users WHERE id = p_callee;
    IF NOT FOUND OR p_caller = p_callee THEN RETURN FALSE; END IF;
    -- engel her iki yönde de keser
    IF EXISTS (SELECT 1 FROM blocks
               WHERE (blocker_id = p_callee AND blocked_id = p_caller)
                  OR (blocker_id = p_caller AND blocked_id = p_callee)) THEN RETURN FALSE; END IF;
    IF u.contact_mode = 'mesaj' THEN RETURN FALSE; END IF;
    IF u.contact_scope = 'kadro' AND NOT shares_squad(p_caller, p_callee) THEN RETURN FALSE; END IF;
    IF in_quiet_hours(p_callee) THEN RETURN FALSE; END IF;
    RETURN TRUE;
END $$;

-- 7) İzin kontrolü: birebir mesaj gönderilebilir mi?
--    p_application_chat = TRUE ise (organizatörün açık talebine başvuru) kapsam kısıtı uygulanmaz.
CREATE OR REPLACE FUNCTION can_message(p_sender UUID, p_receiver UUID, p_application_chat BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE u users%ROWTYPE;
BEGIN
    SELECT * INTO u FROM users WHERE id = p_receiver;
    IF NOT FOUND OR p_sender = p_receiver THEN RETURN FALSE; END IF;
    IF EXISTS (SELECT 1 FROM blocks
               WHERE (blocker_id = p_receiver AND blocked_id = p_sender)
                  OR (blocker_id = p_sender AND blocked_id = p_receiver)) THEN RETURN FALSE; END IF;
    IF u.contact_mode = 'arama' THEN RETURN FALSE; END IF;
    IF u.contact_scope = 'kadro' AND NOT p_application_chat AND NOT shares_squad(p_sender, p_receiver) THEN RETURN FALSE; END IF;
    RETURN TRUE;
END $$;

-- 8) Arama başlatılırken izin yoksa kayıt 'engellendi' olarak düşer, arama kurulmaz
CREATE OR REPLACE FUNCTION trg_calls_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT can_call(NEW.caller_id, NEW.callee_id) THEN
        NEW.status := 'engellendi';
        NEW.ended_at := now();
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER calls_check BEFORE INSERT ON calls
    FOR EACH ROW EXECUTE FUNCTION trg_calls_check();

-- 9) Arama geçmişi görünümü (sohbetteki "📞 Sesli arama · 2 dk" kaydı buradan beslenir)
CREATE VIEW v_call_log AS
SELECT c.id, c.caller_id, c.callee_id, c.status, c.started_at,
       CASE WHEN c.answered_at IS NOT NULL AND c.ended_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (c.ended_at - c.answered_at))::INT END AS duration_sec
FROM calls c;

COMMIT;
