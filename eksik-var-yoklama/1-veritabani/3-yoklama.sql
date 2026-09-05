-- ============================================================
--  EKSİK VAR — 3. migrasyon: Yoklama & güvenilirlik akışı
--  (participants.attendance + users sayaçları ana şemada hazır;
--   bu dosya iş akışını ve otomasyonu ekler)
-- ============================================================

-- a) Yoklama, etkinlik saatinden önce alınamaz
CREATE OR REPLACE FUNCTION trg_attendance_timing() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ed TIMESTAMPTZ;
BEGIN
    IF NEW.attendance = 'bekleniyor' THEN RETURN NEW; END IF;
    SELECT event_date INTO ed FROM events WHERE id = NEW.event_id;
    IF now() < ed THEN
        RAISE EXCEPTION 'YOKLAMA_ERKEN' USING HINT = 'Yoklama etkinlik saatinden sonra alınabilir';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER participants_attendance_timing BEFORE UPDATE OF attendance ON participants
    FOR EACH ROW EXECUTE FUNCTION trg_attendance_timing();

-- b) Maçı tamamla: organizatör (uygulamadan) ya da sistem (cron) çağırır
--    İşaretlenmeyenler iyi niyetle 'katıldı' sayılır; organizatör kendi maçına katılmış sayılır;
--    gruba sistem mesajı düşer; katılanlara puanlama bildirimi gider.
CREATE OR REPLACE FUNCTION complete_event(p_event UUID)
RETURNS TABLE (katildi INT, gelmedi INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; grp UUID; k INT; g INT;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NOT NULL AND auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF e.status = 'tamamlandi' THEN RAISE EXCEPTION 'ZATEN_TAMAMLANDI'; END IF;
    IF e.status = 'iptal' THEN RAISE EXCEPTION 'ETKINLIK_IPTAL'; END IF;
    IF now() < e.event_date THEN RAISE EXCEPTION 'YOKLAMA_ERKEN'; END IF;

    UPDATE participants SET attendance = 'katildi' WHERE event_id = p_event AND attendance = 'bekleniyor';
    UPDATE events SET status = 'tamamlandi' WHERE id = p_event;
    UPDATE users SET events_joined = events_joined + 1 WHERE id = e.organizer_id;

    SELECT count(*) FILTER (WHERE attendance = 'katildi'),
           count(*) FILTER (WHERE attendance = 'gelmedi')
      INTO k, g FROM participants WHERE event_id = p_event;

    SELECT id INTO grp FROM conversations WHERE event_id = p_event AND type = 'grup';
    IF grp IS NOT NULL THEN
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (grp, NULL, 'sistem',
                format('Yoklama alındı: %s katıldı, %s gelmedi. Takım arkadaşlarını puanlayabilirsin.', k, g));
    END IF;

    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT user_id, 'puanlama', e.title || ' tamamlandı', 'Takım arkadaşlarını puanla',
           jsonb_build_object('event_id', p_event)
      FROM participants WHERE event_id = p_event AND attendance = 'katildi';

    RETURN QUERY SELECT k, g;
END $$;

-- c) 48 saat içinde yoklama alınmazsa sistem tamamlar (kimse haksız yere cezalanmaz)
CREATE OR REPLACE FUNCTION auto_complete_events() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n INT := 0;
BEGIN
    FOR r IN SELECT id FROM events
              WHERE status IN ('acik', 'doldu') AND event_date < now() - INTERVAL '48 hours'
    LOOP
        PERFORM complete_event(r.id);
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;

-- d) Saat başı otomatik tamamlama (Supabase'de pg_cron eklentisi açıksa)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('eksikvar-yoklama-otomatik', '0 * * * *', 'SELECT auto_complete_events()');
    END IF;
END $$;

-- e) Güvenilirlik geçmişi (profil ekranı buradan okur)
CREATE VIEW v_attendance_history AS
SELECT p.user_id, e.id AS event_id, e.title, e.event_date, p.attendance
  FROM participants p JOIN events e ON e.id = p.event_id
 WHERE p.attendance <> 'bekleniyor';
ALTER VIEW v_attendance_history SET (security_invoker = true);

-- f) Görünüm ve fonksiyon yetkileri (ana kurulumdan sonra ayrı çalıştırılırsa gerekir)
GRANT SELECT ON v_attendance_history TO authenticated;
GRANT EXECUTE ON FUNCTION complete_event(UUID) TO authenticated;
