-- ============================================================
--  EKSİK VAR — 22. migrasyon: Sohbet (sabitleme, fotoğraf), "Sahadayım", itiraz organizatöre,
--  başvuru bildirimlerinin birleştirilmesi
-- ============================================================

-- a) Sabitlenmiş mesaj (grup yöneticisi / sohbeti açan)
ALTER TABLE conversations ADD COLUMN pinned_message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION pin_message(p_conversation UUID, p_message BIGINT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c conversations%ROWTYPE;
BEGIN
    SELECT * INTO c FROM conversations WHERE id = p_conversation;
    IF NOT FOUND THEN RAISE EXCEPTION 'SOHBET_YOK'; END IF;
    IF auth.uid() IS NULL OR NOT (c.created_by = auth.uid() OR EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = p_conversation AND user_id = auth.uid() AND role = 'yonetici')) THEN
        RAISE EXCEPTION 'YETKI_YOK';
    END IF;
    IF p_message IS NOT NULL AND NOT EXISTS (SELECT 1 FROM messages WHERE id = p_message AND conversation_id = p_conversation) THEN RAISE EXCEPTION 'MESAJ_YOK'; END IF;
    UPDATE conversations SET pinned_message_id = p_message WHERE id = p_conversation;
END $$;
GRANT EXECUTE ON FUNCTION pin_message(UUID, BIGINT) TO authenticated;

-- b) Fotoğraf mesajı: messages.image_url + herkese açık okunur "chat" deposu (yükleme: üyeler)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('chat', 'chat', true) ON CONFLICT (id) DO NOTHING;
        EXECUTE $q$ CREATE POLICY chat_public_read ON storage.objects FOR SELECT USING (bucket_id = 'chat') $q$;
        EXECUTE $q$ CREATE POLICY chat_member_insert ON storage.objects FOR INSERT TO authenticated
                    WITH CHECK (bucket_id = 'chat' AND (storage.foldername(name))[1] = auth.uid()::text) $q$;
    END IF;
END $$;

-- c) "Sahadayım": maçtan 2 saat önce–4 saat sonra katılımcı beyanı; organizatör yoklamada görür
ALTER TABLE participants ADD COLUMN checked_in_at TIMESTAMPTZ;
CREATE OR REPLACE FUNCTION check_in(p_event UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF now() < e.event_date - INTERVAL '2 hours' OR now() > e.event_date + INTERVAL '4 hours' THEN RAISE EXCEPTION 'ZAMAN_DISI' USING HINT = 'Maçtan 2 saat önce ile 4 saat sonra arasında'; END IF;
    UPDATE participants SET checked_in_at = now() WHERE event_id = p_event AND user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'KADRODA_DEGIL'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION check_in(UUID) TO authenticated;

-- d) Yoklama itirazı önce organizatöre: bildirim + tek dokunuşla düzeltme (attendance güncellemesi zaten organizatörde)
CREATE OR REPLACE FUNCTION trg_dispute_notify_organizer() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; aname TEXT;
BEGIN
    IF NEW.reason <> 'yoklama_itiraz' OR NEW.event_id IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    SELECT full_name INTO aname FROM users WHERE id = NEW.reporter_id;
    PERFORM notify_user(e.organizer_id, 'itiraz', 'Yoklama itirazı', aname || ', ' || e.title || ' için "oradaydım" diyor — yoklamayı kontrol et',
        jsonb_build_object('event_id', NEW.event_id, 'user_id', NEW.reporter_id, 'report_id', NEW.id));
    RETURN NEW;
END $$;
CREATE TRIGGER reports_dispute_notify AFTER INSERT ON reports FOR EACH ROW EXECUTE FUNCTION trg_dispute_notify_organizer();
-- Organizatör düzeltince itiraz kapanır
CREATE OR REPLACE FUNCTION trg_attendance_fix_closes_dispute() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.attendance = 'katildi' AND OLD.attendance = 'gelmedi' THEN
        UPDATE reports SET status = 'kapatildi', admin_note = 'Organizatör düzeltti', resolved_at = now()
         WHERE event_id = NEW.event_id AND reporter_id = NEW.user_id AND reason = 'yoklama_itiraz' AND status = 'bekliyor';
        PERFORM notify_user(NEW.user_id, 'itiraz', 'İtirazın kabul edildi ✓', 'Yoklama "katıldı" olarak düzeltildi, güvenilirliğin geri geldi', jsonb_build_object('event_id', NEW.event_id));
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER participants_fix_closes_dispute AFTER UPDATE OF attendance ON participants FOR EACH ROW EXECUTE FUNCTION trg_attendance_fix_closes_dispute();
-- Organizatör, tamamlanmış maçta da yoklamayı düzeltebilsin (itiraz için) — 30 gün içinde
CREATE OR REPLACE FUNCTION trg_attendance_timing() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ed TIMESTAMPTZ;
BEGIN
    IF NEW.attendance = 'bekleniyor' THEN RETURN NEW; END IF;
    SELECT event_date INTO ed FROM events WHERE id = NEW.event_id;
    IF now() < ed THEN RAISE EXCEPTION 'YOKLAMA_ERKEN' USING HINT = 'Yoklama etkinlik saatinden sonra alınabilir'; END IF;
    IF now() > ed + INTERVAL '30 days' THEN RAISE EXCEPTION 'YOKLAMA_GEC' USING HINT = 'Yoklama 30 gün sonra değiştirilemez'; END IF;
    RETURN NEW;
END $$;

-- e) Başvuru bildirimleri: aynı etkinliğin okunmamış başvuruları tek satırda ("3 yeni başvuru")
CREATE OR REPLACE FUNCTION notify_user(p_user UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u users%ROWTYPE; n INT;
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
         WHERE user_id = p_user AND type = 'mesaj' AND is_read = FALSE AND data->>'conversation_id' = p_data->>'conversation_id';
        IF FOUND THEN RETURN; END IF;
    END IF;
    IF p_type = 'basvuru' AND p_title = 'Yeni başvuru' AND p_data ? 'event_id' THEN
        SELECT count(*) INTO n FROM notifications WHERE user_id = p_user AND type = 'basvuru' AND is_read = FALSE AND data->>'event_id' = p_data->>'event_id';
        IF n > 0 THEN
            UPDATE notifications SET title = (n + 1) || ' yeni başvuru', body = p_body, created_at = now(), data = data || jsonb_build_object('count', n + 1)
             WHERE user_id = p_user AND type = 'basvuru' AND is_read = FALSE AND data->>'event_id' = p_data->>'event_id';
            RETURN;
        END IF;
    END IF;
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (p_user, p_type, p_title, p_body, p_data);
END $$;

-- f) Daha eski mesajlar için yardımcı (sayfalama) — istemci doğrudan messages tablosundan okur (RLS üye)

-- g) Organizatör, kendi maçının bekleyen itirazlarını görür (reports tablosuna doğrudan erişemez)
CREATE OR REPLACE FUNCTION event_disputes(p_event UUID)
RETURNS TABLE (user_id UUID, full_name TEXT, description TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT r.reporter_id, u.full_name::TEXT, r.description::TEXT, r.created_at
      FROM reports r JOIN users u ON u.id = r.reporter_id JOIN events e ON e.id = r.event_id
     WHERE r.event_id = p_event AND r.reason = 'yoklama_itiraz' AND r.status = 'bekliyor' AND e.organizer_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION event_disputes(UUID) TO authenticated;
