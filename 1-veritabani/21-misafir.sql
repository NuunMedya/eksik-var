-- ============================================================
--  EKSİK VAR — 21. migrasyon: Misafir (uygulamasız) oyuncular
--  Organizatör yalnızca adla oyuncu ekler; seride her haftaya taşınır; yoklama ve ödeme kaydı tutulur.
-- ============================================================

CREATE TABLE guests (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,       -- ekleyen organizatör
    series_id  UUID REFERENCES events(id) ON DELETE CASCADE,                -- seri üyesi (haftalık)
    event_id   UUID REFERENCES events(id) ON DELETE CASCADE,                -- tek maça özel
    name       VARCHAR(80) NOT NULL,
    phone_hash TEXT,                                                        -- kaydolunca eşleştirmek için (özet)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (series_id IS NOT NULL OR event_id IS NOT NULL)
);
CREATE TABLE guest_records (                                                -- maç başına: var mı, geldi mi, ödedi mi
    event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id       UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    available      BOOLEAN NOT NULL DEFAULT TRUE,
    attendance     attendance_status NOT NULL DEFAULT 'bekleniyor',
    amount         NUMERIC(10,2) NOT NULL DEFAULT 0,
    payment_status payment_status NOT NULL DEFAULT 'bekliyor',
    PRIMARY KEY (event_id, guest_id)
);
CREATE INDEX idx_guests_series ON guests (series_id); CREATE INDEX idx_guests_event ON guests (event_id);

-- Görünürlük: organizatör tam yetkili; etkinliğin grup üyeleri okur
CREATE OR REPLACE FUNCTION can_see_guest(p_guest UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM guests g WHERE g.id = p_guest AND (g.owner_id = auth.uid()
        OR EXISTS (SELECT 1 FROM conversations c JOIN conversation_members cm ON cm.conversation_id = c.id
                    WHERE cm.user_id = auth.uid() AND c.type = 'grup' AND (c.series_id = g.series_id OR c.event_id = g.event_id))));
$$;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY guests_read  ON guests FOR SELECT TO authenticated USING (can_see_guest(id));
CREATE POLICY guests_write ON guests FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid() AND is_active_user());
CREATE POLICY records_read ON guest_records FOR SELECT TO authenticated USING (can_see_guest(guest_id));
CREATE POLICY records_write ON guest_records FOR ALL TO authenticated USING (is_event_organizer(event_id)) WITH CHECK (is_event_organizer(event_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON guests, guest_records TO authenticated;

-- Misafir eklenince: seri üyesiyse gelecek tüm maçlara, tek maçsa o maça kayıt
CREATE OR REPLACE FUNCTION trg_guest_added() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e RECORD;
BEGIN
    IF NEW.series_id IS NOT NULL THEN
        FOR e IN SELECT id, price_per_person FROM events WHERE (series_id = NEW.series_id OR id = NEW.series_id) AND status IN ('acik', 'doldu') AND event_date > now() - INTERVAL '48 hours' LOOP
            INSERT INTO guest_records (event_id, guest_id, amount) VALUES (e.id, NEW.id, e.price_per_person) ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
    IF NEW.event_id IS NOT NULL THEN
        INSERT INTO guest_records (event_id, guest_id, amount) SELECT NEW.event_id, NEW.id, price_per_person FROM events WHERE id = NEW.event_id ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER guests_added AFTER INSERT ON guests FOR EACH ROW EXECUTE FUNCTION trg_guest_added();

-- Serinin yeni haftası açılınca misafirler taşınır
CREATE OR REPLACE FUNCTION trg_event_guest_records() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.series_id IS NOT NULL THEN
        INSERT INTO guest_records (event_id, guest_id, amount)
        SELECT NEW.id, g.id, NEW.price_per_person FROM guests g WHERE g.series_id = NEW.series_id ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER events_guest_records AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION trg_event_guest_records();

-- Eksik önerisi: bu hafta "var" olan misafirler kadroya dahil
CREATE OR REPLACE FUNCTION suggested_needed(p_event UUID) RETURNS INT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; pid UUID; in_count INT; guest_count INT; s INT;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT id INTO pid FROM polls WHERE event_id = p_event AND kind = 'varmisin';
    SELECT count(*) INTO in_count FROM (
        SELECT e.organizer_id AS uid
        UNION SELECT user_id FROM participants WHERE event_id = p_event
        UNION SELECT user_id FROM poll_votes WHERE poll_id = pid AND option_id = 'varim'
    ) x;
    SELECT count(*) INTO guest_count FROM guest_records WHERE event_id = p_event AND available;
    s := e.total_capacity - e.offline_regulars - in_count - guest_count;
    RETURN GREATEST(s, e.filled_count, 0);
END $$;

CREATE VIEW v_event_guests WITH (security_invoker = true) AS
SELECT r.event_id, g.id AS guest_id, g.name, g.series_id, r.available, r.attendance, r.amount, r.payment_status
  FROM guest_records r JOIN guests g ON g.id = r.guest_id;
GRANT SELECT ON v_event_guests TO authenticated;
