-- ============================================================
--  EKSİK VAR — Yetki sıkılaştırma (toplu GRANT'lerden SONRA çalışmalı)
--  İç fonksiyonlar ve yönetici görünümleri istemciden çağrılamaz.
-- ============================================================
REVOKE EXECUTE ON FUNCTION _apply_sanction(UUID, user_status, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION notify_user(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION promote_from_waitlist(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION expire_waitlist_offers() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION finalize_mvp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION send_event_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION send_availability_asks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION auto_complete_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION is_banned_identifier(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON admins FROM anon, authenticated;
REVOKE ALL ON banned_identifiers FROM anon;
GRANT SELECT ON banned_identifiers TO authenticated;          -- RLS: yalnızca yönetici okur
GRANT SELECT ON v_report_queue TO authenticated;              -- security_invoker: RLS uygulanır
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
