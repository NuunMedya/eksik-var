-- ============================================================
--  EKSİK VAR — 4. migrasyon: Tekrar eden etkinlikler (haftalık seri)
--  Fikir: "Her Çarşamba 21:00" bir seridir. Her hafta yeni bir etkinlik
--  kaydı açılır (başvuru ve yoklama ona işler) ama ekip grubu tektir
--  ve kalıcıdır. Maç tamamlanınca gelecek hafta otomatik açılır.
-- ============================================================

-- a) Tipler ve sütunlar
CREATE TYPE recurrence_type AS ENUM ('yok', 'haftalik');

ALTER TABLE events
    ADD COLUMN recurrence       recurrence_type NOT NULL DEFAULT 'yok',
    ADD COLUMN recurrence_until DATE,                                       -- NULL = süresiz
    ADD COLUMN series_id        UUID REFERENCES events(id) ON DELETE SET NULL; -- serinin ilk etkinliği
CREATE INDEX idx_events_series ON events (series_id, event_date);

ALTER TABLE conversations
    ADD COLUMN series_id UUID REFERENCES events(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX uq_series_group_chat ON conversations (series_id) WHERE type = 'grup' AND series_id IS NOT NULL;

-- b) Serinin ilk etkinliği kendi serisinin başıdır
CREATE OR REPLACE FUNCTION trg_event_series_init() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.recurrence <> 'yok' AND NEW.series_id IS NULL THEN
        NEW.series_id := NEW.id;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER events_series_init BEFORE INSERT ON events
    FOR EACH ROW EXECUTE FUNCTION trg_event_series_init();

-- c) Etkinliğin grup sohbeti: seri varsa serinin grubu, yoksa etkinliğin kendi grubu
CREATE OR REPLACE FUNCTION group_conversation_for(p_event UUID) RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT c.id
      FROM events e
      JOIN conversations c ON c.type = 'grup'
       AND ((e.series_id IS NOT NULL AND c.series_id = e.series_id)
         OR (e.series_id IS NULL AND c.event_id = e.id))
     WHERE e.id = p_event
     LIMIT 1;
$$;

-- d) Etkinlik oluşunca: serinin grubu varsa yenisini AÇMA, gruba duyuru düş
CREATE OR REPLACE FUNCTION on_event_created() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_chat_id UUID;
BEGIN
    IF NEW.series_id IS NOT NULL THEN
        SELECT id INTO v_chat_id FROM conversations WHERE type = 'grup' AND series_id = NEW.series_id;
    END IF;
    IF v_chat_id IS NULL THEN
        INSERT INTO conversations (type, event_id, series_id, name, created_by)
        VALUES ('grup', NEW.id, NEW.series_id, NEW.title, NEW.organizer_id)
        RETURNING id INTO v_chat_id;
        INSERT INTO conversation_members (conversation_id, user_id, role)
        VALUES (v_chat_id, NEW.organizer_id, 'yonetici');
    ELSE
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (v_chat_id, NULL, 'sistem',
                format('Haftaya aynı saat: %s · %s eksik, başvurular açık',
                       to_char(NEW.event_date, 'DD.MM HH24:MI'), NEW.needed_count));
    END IF;
    UPDATE users SET events_organized = events_organized + 1 WHERE id = NEW.organizer_id;
    RETURN NEW;
END $$;

-- e) Çift onay: kişi serinin (kalıcı) grubuna eklenir
CREATE OR REPLACE FUNCTION on_application_approved() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_event events%ROWTYPE; v_group_id UUID; v_username TEXT;
BEGIN
    IF NEW.organizer_approved AND NEW.applicant_approved AND NEW.status = 'beklemede' THEN
        SELECT * INTO v_event FROM events WHERE id = NEW.event_id FOR UPDATE;
        IF v_event.filled_count >= v_event.needed_count THEN
            RAISE EXCEPTION 'Kontenjan dolu';
        END IF;
        NEW.status := 'onaylandi';
        INSERT INTO participants (event_id, user_id, application_id)
        VALUES (NEW.event_id, NEW.applicant_id, NEW.id);
        UPDATE events
           SET filled_count = filled_count + 1,
               status = CASE WHEN filled_count + 1 >= needed_count THEN 'doldu'::event_status ELSE status END
         WHERE id = NEW.event_id;
        v_group_id := group_conversation_for(NEW.event_id);
        IF v_group_id IS NOT NULL THEN
            INSERT INTO conversation_members (conversation_id, user_id)
            VALUES (v_group_id, NEW.applicant_id) ON CONFLICT DO NOTHING;
            SELECT username INTO v_username FROM users WHERE id = NEW.applicant_id;
            INSERT INTO messages (conversation_id, sender_id, type, content)
            VALUES (v_group_id, NULL, 'sistem', v_username || ' kadroya katıldı');
        END IF;
    END IF;
    RETURN NEW;
END $$;

-- f) Maçı tamamla (genişletilmiş): seri devam ediyorsa gelecek haftayı açar
DROP FUNCTION IF EXISTS complete_event(UUID);
CREATE OR REPLACE FUNCTION complete_event(p_event UUID)
RETURNS TABLE (katildi INT, gelmedi INT, next_event_id UUID)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; grp UUID; k INT; g INT; v_next UUID; v_next_date TIMESTAMPTZ;
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

    grp := group_conversation_for(p_event);
    IF grp IS NOT NULL THEN
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (grp, NULL, 'sistem',
                format('Yoklama alındı: %s katıldı, %s gelmedi. Takım arkadaşlarını puanlayabilirsin.', k, g));
    END IF;

    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT user_id, 'puanlama', e.title || ' tamamlandı', 'Takım arkadaşlarını puanla',
           jsonb_build_object('event_id', p_event)
      FROM participants WHERE event_id = p_event AND attendance = 'katildi';

    -- Haftalık seri: gelecek hafta (süre dolmadıysa)
    v_next_date := e.event_date + INTERVAL '7 days';
    IF e.recurrence = 'haftalik'
       AND (e.recurrence_until IS NULL OR v_next_date::date <= e.recurrence_until) THEN
        INSERT INTO events (organizer_id, category_id, city_id, title, description, venue_name, address,
                            latitude, longitude, event_date, total_capacity, needed_count, price_per_person,
                            skill_level, status, recurrence, recurrence_until, series_id)
        VALUES (e.organizer_id, e.category_id, e.city_id, e.title, e.description, e.venue_name, e.address,
                e.latitude, e.longitude, v_next_date, e.total_capacity, e.needed_count, e.price_per_person,
                e.skill_level, 'acik', e.recurrence, e.recurrence_until, e.series_id)
        RETURNING id INTO v_next;
    END IF;

    RETURN QUERY SELECT k, g, v_next;
END $$;
GRANT EXECUTE ON FUNCTION complete_event(UUID) TO authenticated;
