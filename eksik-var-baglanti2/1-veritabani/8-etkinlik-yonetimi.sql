-- ============================================================
--  EKSİK VAR — 8. migrasyon: Etkinlik yönetimi (iptal, ayrılma, duyuru)
--  Kural: maça 24 saatten az kala iptal/ayrılma "geç" sayılır ve
--  ilgili kişinin no_show sayacına işler (güvenilirlik düşer).
-- ============================================================

CREATE OR REPLACE FUNCTION cancel_event(p_event UUID, p_reason TEXT DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; grp UUID; late BOOLEAN;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF e.status IN ('iptal', 'tamamlandi') THEN RAISE EXCEPTION 'DURUM_UYGUN_DEGIL'; END IF;
    late := e.event_date > now() AND e.event_date < now() + INTERVAL '24 hours';
    UPDATE events SET status = 'iptal' WHERE id = p_event;
    IF late THEN UPDATE users SET no_show_count = no_show_count + 1 WHERE id = e.organizer_id; END IF;
    grp := group_conversation_for(p_event);
    IF grp IS NOT NULL THEN
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (grp, NULL, 'sistem', format('Maç iptal edildi (%s)%s', to_char(e.event_date, 'DD.MM HH24:MI'),
                CASE WHEN p_reason IS NULL OR p_reason = '' THEN '' ELSE ': ' || p_reason END));
    END IF;
    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT user_id, 'etkinlik_iptal', e.title || ' iptal edildi', COALESCE(NULLIF(p_reason, ''), 'Organizatör iptal etti'),
           jsonb_build_object('event_id', p_event)
      FROM participants WHERE event_id = p_event;
    RETURN late;
END $$;

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
    DELETE FROM participants WHERE event_id = p_event AND user_id = auth.uid();
    DELETE FROM applications WHERE event_id = p_event AND applicant_id = auth.uid();   -- yeniden başvurabilsin
    UPDATE events SET filled_count = GREATEST(0, filled_count - 1), status = 'acik' WHERE id = p_event;
    IF late THEN UPDATE users SET no_show_count = no_show_count + 1 WHERE id = auth.uid(); END IF;
    grp := group_conversation_for(p_event);
    IF grp IS NOT NULL THEN
        IF e.series_id IS NULL THEN DELETE FROM conversation_members WHERE conversation_id = grp AND user_id = auth.uid(); END IF;
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (grp, NULL, 'sistem', format('%s kadrodan ayrıldı · başvurular yeniden açık', uname));
    END IF;
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (e.organizer_id, 'kadro', 'Kadrodan ayrılan var', uname || ', ' || e.title || ' kadrosundan ayrıldı',
            jsonb_build_object('event_id', p_event));
    RETURN late;
END $$;

CREATE OR REPLACE FUNCTION event_updated_notice(p_event UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; grp UUID;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    grp := group_conversation_for(p_event);
    IF grp IS NOT NULL THEN
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (grp, NULL, 'sistem', format('Etkinlik güncellendi: %s · %s · %s eksik',
                to_char(e.event_date, 'DD.MM HH24:MI'), COALESCE(e.venue_name, ''), GREATEST(0, e.needed_count - e.filled_count)));
    END IF;
END $$;

GRANT EXECUTE ON FUNCTION cancel_event(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION leave_event(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION event_updated_notice(UUID) TO authenticated;
