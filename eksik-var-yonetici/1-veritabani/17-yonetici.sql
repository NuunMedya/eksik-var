-- ============================================================
--  EKSİK VAR — 17. migrasyon: Yönetici paneli
--  Yöneticiler normal kullanıcıdır (admins tablosu). Panel telefon girişiyle çalışır,
--  yetki sunucuda is_admin() ile denetlenir; gizli anahtar hiçbir yere yazılmaz.
-- ============================================================

ALTER TABLE reports ADD COLUMN admin_note VARCHAR(300), ADD COLUMN resolved_at TIMESTAMPTZ;

CREATE TABLE admins (
    user_id  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note     VARCHAR(120)
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;   -- politika yok: yalnızca sunucu fonksiyonları okur

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());
$$;

-- Yönetici okuma yetkileri (RLS): tüm şikayetler, tüm kullanıcılar (banlılar dahil), yasaklı özetler
CREATE POLICY reports_admin_read   ON reports FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY reports_admin_update ON reports FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY users_admin_read     ON users   FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY banned_admin_read    ON banned_identifiers FOR SELECT TO authenticated USING (is_admin());

-- Yaptırım fonksiyonları: JWT'siz (SQL editörü) ya da yönetici
CREATE OR REPLACE FUNCTION ban_user(p_user UUID, p_reason TEXT DEFAULT 'kural ihlali')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF auth.uid() IS NOT NULL AND auth.uid() = p_user THEN RAISE EXCEPTION 'KENDINI_BANLAYAMAZSIN'; END IF;
    PERFORM _apply_sanction(p_user, 'banli', p_reason, NULL);
END $$;
CREATE OR REPLACE FUNCTION suspend_user(p_user UUID, p_days INT DEFAULT 7, p_reason TEXT DEFAULT 'inceleme')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF auth.uid() IS NOT NULL AND auth.uid() = p_user THEN RAISE EXCEPTION 'KENDINI_ASKIYA_ALAMAZSIN'; END IF;
    PERFORM _apply_sanction(p_user, 'askida', p_reason, now() + make_interval(days => GREATEST(p_days, 1)));
END $$;
CREATE OR REPLACE FUNCTION reinstate_user(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    UPDATE users SET status = 'aktif', status_reason = NULL, suspended_until = NULL WHERE id = p_user;
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user;
END $$;

-- Şikayeti sonuçlandır
CREATE OR REPLACE FUNCTION resolve_report(p_report BIGINT, p_status TEXT, p_note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF p_status NOT IN ('incelendi', 'kapatildi') THEN RAISE EXCEPTION 'DURUM_GECERSIZ'; END IF;
    UPDATE reports SET status = p_status::report_status, admin_note = COALESCE(p_note, admin_note), resolved_at = now() WHERE id = p_report;
END $$;

-- Yoklama itirazı haklıysa: "gelmedi" → "katıldı" (sayaçlar trigger'la düzelir)
CREATE OR REPLACE FUNCTION revert_no_show(p_event UUID, p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    UPDATE participants SET attendance = 'katildi' WHERE event_id = p_event AND user_id = p_user AND attendance = 'gelmedi';
END $$;

-- Panel özeti
CREATE OR REPLACE FUNCTION admin_stats() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    RETURN jsonb_build_object(
        'users', (SELECT count(*) FROM users), 'users_today', (SELECT count(*) FROM users WHERE created_at > now() - INTERVAL '1 day'),
        'suspended', (SELECT count(*) FROM users WHERE status = 'askida'), 'banned', (SELECT count(*) FROM users WHERE status = 'banli'),
        'events_open', (SELECT count(*) FROM events WHERE status IN ('acik', 'doldu') AND event_date > now()),
        'events_week', (SELECT count(*) FROM events WHERE created_at > now() - INTERVAL '7 days'),
        'reports_pending', (SELECT count(*) FROM reports WHERE status = 'bekliyor'),
        'disputes_pending', (SELECT count(*) FROM reports WHERE status = 'bekliyor' AND reason = 'yoklama_itiraz'));
END $$;

-- Şikayet kuyruğu: artık çağıranın yetkisiyle çalışır (RLS uygulanır → yalnızca yöneticiler tümünü görür)
DROP VIEW IF EXISTS v_report_queue;
CREATE VIEW v_report_queue WITH (security_invoker = true) AS
SELECT r.id, r.created_at, r.reason, r.description, r.status, r.admin_note, r.event_id,
       r.reporter_id, rp.username AS reporter_username, rp.full_name AS reporter_name,
       r.reported_user_id, ru.username AS reported_username, ru.full_name AS reported_name, ru.status AS reported_status,
       ru.reliability_pct AS reported_reliability, ru.no_show_count AS reported_no_show,
       e.title AS event_title, e.event_date, e.organizer_id AS event_organizer_id,
       (SELECT count(*) FROM reports x WHERE x.reported_user_id = r.reported_user_id) AS total_reports
  FROM reports r
  LEFT JOIN users rp ON rp.id = r.reporter_id
  LEFT JOIN users ru ON ru.id = r.reported_user_id
  LEFT JOIN events e ON e.id = r.event_id;
