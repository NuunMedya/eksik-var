-- ============================================================
--  EKSİK VAR — 7. migrasyon: Telefon doğrulama + hesap yaptırımları
--  Giriş artık telefon + SMS kodu (Supabase Phone OTP). Doğrulanmış numara,
--  ban sisteminin temelidir: yasaklı numara/e-posta yalnızca özet (hash)
--  olarak tutulur, yeni kayıt trigger'ı bu listeyi kontrol eder.
-- ============================================================

-- a) Kullanıcı durumu alanları
ALTER TABLE users
    ADD COLUMN suspended_until TIMESTAMPTZ,
    ADD COLUMN status_reason   VARCHAR(120);

-- b) Yasaklı kimlik özetleri (açık numara/e-posta saklanmaz)
CREATE TABLE banned_identifiers (
    id_hash    TEXT PRIMARY KEY,
    kind       TEXT NOT NULL CHECK (kind IN ('phone', 'email')),
    reason     VARCHAR(120),
    banned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ                       -- NULL = kalıcı
);
ALTER TABLE banned_identifiers ENABLE ROW LEVEL SECURITY;  -- politika yok: yalnızca sunucu fonksiyonları okur
CREATE OR REPLACE FUNCTION ident_hash(p TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT encode(sha256(convert_to(regexp_replace(lower(trim(p)), '[^a-z0-9@.]', '', 'g'), 'UTF8')), 'hex');
$$;
CREATE OR REPLACE FUNCTION is_banned_identifier(p TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT p IS NOT NULL AND length(trim(p)) > 0 AND EXISTS (
        SELECT 1 FROM banned_identifiers b
         WHERE b.id_hash = ident_hash(p) AND (b.expires_at IS NULL OR b.expires_at > now()));
$$;

-- c) Yeni kullanıcı trigger'ı: telefonlu kayıt, ilçe, doğrulama işareti, yasak kontrolü
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base TEXT; uname TEXT; n INT := 0; v_phone TEXT;
BEGIN
    v_phone := COALESCE(NULLIF(NEW.phone, ''), NULLIF(NEW.raw_user_meta_data->>'phone', ''));
    IF is_banned_identifier(v_phone) OR is_banned_identifier(NEW.email) THEN
        RAISE EXCEPTION 'HESAP_YASAKLI' USING HINT = 'Bu telefon numarası veya e-posta ile hesap açılamaz';
    END IF;
    base := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''),
                     split_part(COALESCE(NEW.email, ''), '@', 1), 'oyuncu');
    base := regexp_replace(translate(lower(base), 'çğıöşüâîû', 'cgiosuaiu'), '[^a-z0-9_]', '', 'g');
    IF base = '' THEN base := 'oyuncu'; END IF;
    uname := left(base, 30);
    WHILE EXISTS (SELECT 1 FROM users WHERE username = uname) LOOP
        n := n + 1; uname := left(base, 26) || n::text;
    END LOOP;
    INSERT INTO users (id, email, phone, username, full_name, city_id, district_id, is_verified)
    VALUES (NEW.id, NEW.email, v_phone, uname,
            COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Yeni Oyuncu'),
            NULLIF(NEW.raw_user_meta_data->>'city_id', '')::INT,
            NULLIF(NEW.raw_user_meta_data->>'district_id', '')::INT,
            NEW.phone IS NOT NULL AND NEW.phone <> '');
    RETURN NEW;
END $$;

-- d) Aktiflik: askı süresi dolmuşsa aktif sayılır
CREATE OR REPLACE FUNCTION is_active_user() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE((SELECT status = 'aktif' OR (status = 'askida' AND suspended_until IS NOT NULL AND suspended_until < now())
                       FROM users WHERE id = auth.uid()), FALSE);
$$;

-- Yazma politikaları aktiflik şartı alır (mesaj/etkinlik/başvuru/puan/arama/sohbet açma)
DROP POLICY events_insert_own ON events;
CREATE POLICY events_insert_own ON events FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid() AND is_active_user());
DROP POLICY applications_insert_own ON applications;
CREATE POLICY applications_insert_own ON applications FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid() AND is_active_user());
DROP POLICY messages_insert ON messages;
CREATE POLICY messages_insert ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND is_conversation_member(conversation_id) AND is_active_user());
DROP POLICY ratings_insert_own ON ratings;
CREATE POLICY ratings_insert_own ON ratings FOR INSERT TO authenticated WITH CHECK (rater_id = auth.uid() AND is_active_user());
DROP POLICY calls_insert_own ON calls;
CREATE POLICY calls_insert_own ON calls FOR INSERT TO authenticated WITH CHECK (caller_id = auth.uid() AND is_active_user());
DROP POLICY conversations_insert_own ON conversations;
CREATE POLICY conversations_insert_own ON conversations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND is_active_user());
-- Kapatılmış hesaplar başkalarına görünmez
DROP POLICY users_read ON users;
CREATE POLICY users_read ON users FOR SELECT TO authenticated USING (status <> 'banli' OR id = auth.uid());

-- e) Yaptırım işlemleri (iç fonksiyon; dışarıdan çağrılamaz)
CREATE OR REPLACE FUNCTION _apply_sanction(p_user UUID, p_status user_status, p_reason TEXT, p_until TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_phone TEXT; v_email TEXT; r RECORD;
BEGIN
    UPDATE users SET status = p_status, status_reason = p_reason, suspended_until = p_until WHERE id = p_user;
    IF p_status = 'banli' THEN
        SELECT phone, email INTO v_phone, v_email FROM users WHERE id = p_user;
        INSERT INTO banned_identifiers (id_hash, kind, reason)
            SELECT ident_hash(v_phone), 'phone', p_reason WHERE v_phone IS NOT NULL AND v_phone <> ''
            ON CONFLICT (id_hash) DO NOTHING;
        INSERT INTO banned_identifiers (id_hash, kind, reason)
            SELECT ident_hash(v_email), 'email', p_reason WHERE v_email IS NOT NULL AND v_email <> ''
            ON CONFLICT (id_hash) DO NOTHING;
        -- kişisel veriler silinir, kimlik yalnızca özet olarak kalır
        UPDATE users SET phone = NULL, email = NULL, full_name = 'Kapatılmış hesap', avatar_url = NULL, bio = NULL WHERE id = p_user;
    END IF;
    -- açtığı gelecek etkinlikler iptal, kadroya bildirim
    FOR r IN SELECT id, title FROM events WHERE organizer_id = p_user AND status IN ('acik', 'doldu') AND event_date > now() LOOP
        UPDATE events SET status = 'iptal' WHERE id = r.id;
        INSERT INTO notifications (user_id, type, title, body, data)
            SELECT user_id, 'etkinlik_iptal', r.title || ' iptal edildi', 'Organizatörün hesabı kapatıldı', jsonb_build_object('event_id', r.id)
              FROM participants WHERE event_id = r.id;
    END LOOP;
    -- girdiği gelecek kadrolardan çıkar, kontenjanı aç
    FOR r IN SELECT p.event_id FROM participants p JOIN events e ON e.id = p.event_id
              WHERE p.user_id = p_user AND e.event_date > now() AND e.status IN ('acik', 'doldu') LOOP
        DELETE FROM participants WHERE event_id = r.event_id AND user_id = p_user;
        UPDATE events SET filled_count = GREATEST(0, filled_count - 1), status = 'acik' WHERE id = r.event_id;
    END LOOP;
    UPDATE applications SET status = 'iptal' WHERE applicant_id = p_user AND status = 'beklemede';
    DELETE FROM conversation_members WHERE user_id = p_user;
    -- kimlik katmanı: oturum düşer, giriş engellenir (Supabase Auth 'banned_until')
    UPDATE auth.users SET banned_until = COALESCE(p_until, now() + INTERVAL '100 years') WHERE id = p_user;
END $$;
REVOKE ALL ON FUNCTION _apply_sanction(UUID, user_status, TEXT, TIMESTAMPTZ) FROM PUBLIC, authenticated, anon;

-- Yönetici çağrıları: yalnızca JWT'siz bağlam (Supabase SQL editörü / service role)
CREATE OR REPLACE FUNCTION ban_user(p_user UUID, p_reason TEXT DEFAULT 'kural ihlali')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    PERFORM _apply_sanction(p_user, 'banli', p_reason, NULL);
END $$;
CREATE OR REPLACE FUNCTION suspend_user(p_user UUID, p_days INT DEFAULT 7, p_reason TEXT DEFAULT 'inceleme')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    PERFORM _apply_sanction(p_user, 'askida', p_reason, now() + make_interval(days => p_days));
END $$;
CREATE OR REPLACE FUNCTION reinstate_user(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    UPDATE users SET status = 'aktif', status_reason = NULL, suspended_until = NULL WHERE id = p_user;
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user;
END $$;
REVOKE ALL ON FUNCTION ban_user(UUID, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION suspend_user(UUID, INT, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION reinstate_user(UUID) FROM PUBLIC, authenticated, anon;

-- f) Otomatik askı: 30 günde farklı 3 kişiden aynı nedenle şikayet → 7 gün askı (inceleme için)
CREATE OR REPLACE FUNCTION trg_report_auto_suspend() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
    IF NEW.reported_user_id IS NULL OR NEW.reason = 'yoklama_itiraz' THEN RETURN NEW; END IF;
    SELECT count(DISTINCT reporter_id) INTO n FROM reports
     WHERE reported_user_id = NEW.reported_user_id AND reason = NEW.reason AND created_at > now() - INTERVAL '30 days';
    IF n >= 3 AND (SELECT status FROM users WHERE id = NEW.reported_user_id) = 'aktif' THEN
        PERFORM _apply_sanction(NEW.reported_user_id, 'askida', 'otomatik: ' || n || ' şikayet (' || NEW.reason || ')', now() + INTERVAL '7 days');
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER reports_auto_suspend AFTER INSERT ON reports
    FOR EACH ROW EXECUTE FUNCTION trg_report_auto_suspend();

-- g) İnceleme kuyruğu (yöneticiler Supabase panelinden bakar)
CREATE VIEW v_report_queue AS
SELECT r.id, r.created_at, r.reason, r.description, r.status,
       ru.username AS reported_username, ru.status AS reported_status,
       (SELECT count(*) FROM reports x WHERE x.reported_user_id = r.reported_user_id) AS total_reports
  FROM reports r LEFT JOIN users ru ON ru.id = r.reported_user_id
 WHERE r.status = 'bekliyor' ORDER BY r.created_at;
