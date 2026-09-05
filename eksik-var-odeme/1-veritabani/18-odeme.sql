-- ============================================================
--  EKSİK VAR — 18. migrasyon: Ödeme takibi (para uygulamadan geçmez)
-- ============================================================

CREATE TYPE payment_status AS ENUM ('bekliyor', 'odedim', 'odendi', 'muaf');   -- odedim: oyuncu beyanı, odendi: organizatör onayı

CREATE TABLE payments (
    event_id         UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount           NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
    status           payment_status NOT NULL DEFAULT 'bekliyor',
    claimed_at       TIMESTAMPTZ,
    confirmed_at     TIMESTAMPTZ,
    reminded_count   SMALLINT NOT NULL DEFAULT 0,
    last_reminded_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, user_id)
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_read ON payments FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR is_event_organizer(event_id));
GRANT SELECT ON payments TO authenticated;             -- yazma yalnızca fonksiyonlarla

-- IBAN: yalnızca sahibi okur/yazar; gruba fonksiyonla gönderilir
CREATE TABLE payment_details (
    user_id     UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    iban        VARCHAR(34) NOT NULL,
    holder_name VARCHAR(80),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE payment_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_details_own ON payment_details FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON payment_details TO authenticated;

-- Kadroya giren için ödeme satırı (ücret > 0 ise); kadrodan çıkanın bekleyen satırı silinir
CREATE OR REPLACE FUNCTION trg_participant_payment() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT * INTO e FROM events WHERE id = NEW.event_id;
        IF e.price_per_person > 0 THEN
            INSERT INTO payments (event_id, user_id, amount) VALUES (NEW.event_id, NEW.user_id, e.price_per_person)
            ON CONFLICT (event_id, user_id) DO NOTHING;
        END IF;
        RETURN NEW;
    ELSE
        DELETE FROM payments WHERE event_id = OLD.event_id AND user_id = OLD.user_id AND status = 'bekliyor';
        RETURN OLD;
    END IF;
END $$;
CREATE TRIGGER participants_payment AFTER INSERT OR DELETE ON participants
    FOR EACH ROW EXECUTE FUNCTION trg_participant_payment();

-- Oyuncu: "ödedim" beyanı
CREATE OR REPLACE FUNCTION claim_payment(p_event UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; aname TEXT;
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    UPDATE payments SET status = 'odedim', claimed_at = now() WHERE event_id = p_event AND user_id = auth.uid() AND status = 'bekliyor';
    IF NOT FOUND THEN RAISE EXCEPTION 'ODEME_YOK'; END IF;
    SELECT * INTO e FROM events WHERE id = p_event;
    SELECT full_name INTO aname FROM users WHERE id = auth.uid();
    PERFORM notify_user(e.organizer_id, 'odeme', 'Ödeme beyanı', aname || ' "' || e.title || '" ücretini ödediğini bildirdi — onayla',
        jsonb_build_object('event_id', p_event));
END $$;
GRANT EXECUTE ON FUNCTION claim_payment(UUID) TO authenticated;

-- Organizatör: onayla / bekliyor'a çevir / muaf tut
CREATE OR REPLACE FUNCTION confirm_payment(p_event UUID, p_user UUID, p_status TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF p_status NOT IN ('odendi', 'bekliyor', 'muaf') THEN RAISE EXCEPTION 'DURUM_GECERSIZ'; END IF;
    UPDATE payments SET status = p_status::payment_status,
           confirmed_at = CASE WHEN p_status = 'odendi' THEN now() ELSE NULL END
     WHERE event_id = p_event AND user_id = p_user;
    IF NOT FOUND THEN RAISE EXCEPTION 'ODEME_YOK'; END IF;
    IF p_status = 'odendi' THEN
        PERFORM notify_user(p_user, 'odeme', 'Ödemen onaylandı ✓', e.title || ' · ' || e.price_per_person || '₺', jsonb_build_object('event_id', p_event));
    END IF;
END $$;
GRANT EXECUTE ON FUNCTION confirm_payment(UUID, UUID, TEXT) TO authenticated;

-- Organizatör: IBAN'ı gruba gönder (kendi IBAN'ı, sistem mesajı olarak)
CREATE OR REPLACE FUNCTION send_iban(p_event UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; d payment_details%ROWTYPE; grp UUID;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    SELECT * INTO d FROM payment_details WHERE user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'IBAN_YOK' USING HINT = 'Önce Ayarlar > Ödeme bilgileri'; END IF;
    grp := group_conversation_for(p_event);
    IF grp IS NULL THEN RAISE EXCEPTION 'GRUP_YOK'; END IF;
    INSERT INTO messages (conversation_id, sender_id, type, content)
    VALUES (grp, NULL, 'sistem', format('💳 Saha ücreti %s₺ · IBAN: %s (%s) · Açıklama: %s', e.price_per_person, d.iban, COALESCE(d.holder_name, ''), e.title));
END $$;
GRANT EXECUTE ON FUNCTION send_iban(UUID) TO authenticated;

-- Organizatör: ödemeyenlere hatırlat (24 saatte bir)
CREATE OR REPLACE FUNCTION remind_payments(p_event UUID) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; p RECORD; n INT := 0;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NOT NULL AND auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    FOR p IN SELECT * FROM payments WHERE event_id = p_event AND status = 'bekliyor'
              AND (last_reminded_at IS NULL OR last_reminded_at < now() - INTERVAL '24 hours') LOOP
        PERFORM notify_user(p.user_id, 'odeme', 'Saha ücreti hatırlatması', e.title || ' · ' || p.amount || '₺ bekliyor — ödeyince "Ödedim" de',
            jsonb_build_object('event_id', p_event));
        UPDATE payments SET reminded_count = reminded_count + 1, last_reminded_at = now() WHERE event_id = p.event_id AND user_id = p.user_id;
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;
GRANT EXECUTE ON FUNCTION remind_payments(UUID) TO authenticated;

-- Sistem: maçtan 2 gün ve 7 gün sonra ödemeyenlere (saat başı)
CREATE OR REPLACE FUNCTION send_payment_reminders() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e RECORD; n INT := 0;
BEGIN
    FOR e IN SELECT ev.id FROM events ev WHERE ev.status = 'tamamlandi' AND ev.price_per_person > 0 AND ev.completed_at IS NOT NULL
              AND EXISTS (SELECT 1 FROM payments p WHERE p.event_id = ev.id AND p.status = 'bekliyor'
                          AND ((p.reminded_count = 0 AND ev.completed_at < now() - INTERVAL '2 days')
                            OR (p.reminded_count = 1 AND ev.completed_at < now() - INTERVAL '7 days'))) LOOP
        n := n + remind_payments(e.id);
    END LOOP;
    RETURN n;
END $$;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('eksikvar-odeme', '50 * * * *', 'SELECT send_payment_reminders()');
    END IF;
END $$;

-- Özetler
CREATE VIEW v_event_payments AS
SELECT p.event_id, p.user_id, u.full_name, u.username, u.avatar_url, p.amount, p.status, p.claimed_at, p.confirmed_at, p.reminded_count
  FROM payments p JOIN users u ON u.id = p.user_id;
ALTER VIEW v_event_payments SET (security_invoker = true);
GRANT SELECT ON v_event_payments TO authenticated;

-- Ödeme düzeni: onaylanan / (onaylanan + 3 günü geçmiş bekleyenler); geç = 3 günden sonra onaylanan
CREATE OR REPLACE FUNCTION payment_stats(p_user UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT jsonb_build_object(
        'paid',    count(*) FILTER (WHERE p.status = 'odendi'),
        'late',    count(*) FILTER (WHERE p.status = 'odendi' AND p.confirmed_at > e.completed_at + INTERVAL '3 days'),
        'overdue', count(*) FILTER (WHERE p.status IN ('bekliyor', 'odedim') AND e.completed_at < now() - INTERVAL '3 days'),
        'pct',     CASE WHEN count(*) FILTER (WHERE p.status = 'odendi' OR (p.status IN ('bekliyor','odedim') AND e.completed_at < now() - INTERVAL '3 days')) = 0 THEN NULL
                   ELSE round(100.0 * count(*) FILTER (WHERE p.status = 'odendi' AND (p.confirmed_at IS NULL OR p.confirmed_at <= e.completed_at + INTERVAL '3 days'))
                        / count(*) FILTER (WHERE p.status = 'odendi' OR (p.status IN ('bekliyor','odedim') AND e.completed_at < now() - INTERVAL '3 days'))) END)
      FROM payments p JOIN events e ON e.id = p.event_id
     WHERE p.user_id = p_user AND e.status = 'tamamlandi';
$$;
GRANT EXECUTE ON FUNCTION payment_stats(UUID) TO authenticated;
