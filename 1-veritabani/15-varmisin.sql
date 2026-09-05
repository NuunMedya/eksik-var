-- ============================================================
--  EKSİK VAR — 15. migrasyon: "Var mısın?" — sabit kadro katılım beyanı
--  Haftalık serilerde maçtan 72 saat önce seri grubunda otomatik anket açılır
--  (Varım / Yokum / Belli değil). Cevaplar + bu haftanın kadrosu → önerilen eksik sayısı;
--  organizatör tek dokunuşla uygular.
-- ============================================================

ALTER TABLE polls
    ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    ADD COLUMN kind     VARCHAR(12) NOT NULL DEFAULT 'serbest' CHECK (kind IN ('serbest', 'varmisin'));
CREATE UNIQUE INDEX uq_polls_varmisin ON polls (event_id) WHERE kind = 'varmisin';
ALTER TABLE events
    ADD COLUMN offline_regulars       INT NOT NULL DEFAULT 0 CHECK (offline_regulars >= 0),  -- uygulamada olmayan sabit oyuncular
    ADD COLUMN availability_asked_at  TIMESTAMPTZ;

-- a) Anketi aç (organizatör "Şimdi sor" ya da sistem)
CREATE OR REPLACE FUNCTION ask_availability(p_event UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; grp UUID; pid UUID; m RECORD; q TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NOT NULL AND auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF e.status NOT IN ('acik', 'doldu') OR e.event_date < now() THEN RAISE EXCEPTION 'ETKINLIK_KAPALI'; END IF;
    grp := group_conversation_for(p_event);
    IF grp IS NULL THEN RAISE EXCEPTION 'GRUP_YOK'; END IF;
    SELECT id INTO pid FROM polls WHERE event_id = p_event AND kind = 'varmisin';
    IF pid IS NOT NULL THEN RETURN pid; END IF;                       -- zaten soruldu
    q := 'Bu hafta var mısın? · ' || to_char(e.event_date, 'DD.MM HH24:MI');
    INSERT INTO polls (conversation_id, created_by, question, options, multiple, event_id, kind)
    VALUES (grp, e.organizer_id, q,
            '[{"id":"varim","text":"Varım ✅"},{"id":"yokum","text":"Yokum ❌"},{"id":"belirsiz","text":"Belli değil 🤔"}]'::jsonb,
            FALSE, p_event, 'varmisin') RETURNING id INTO pid;
    INSERT INTO messages (conversation_id, sender_id, content, poll_id) VALUES (grp, e.organizer_id, '📊 ' || q, pid);
    FOR m IN SELECT user_id FROM conversation_members WHERE conversation_id = grp AND user_id <> e.organizer_id LOOP
        PERFORM notify_user(m.user_id, 'varmisin', 'Bu hafta var mısın?',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || ' — bir dokunuşla cevapla',
            jsonb_build_object('event_id', p_event, 'conversation_id', grp, 'poll_id', pid));
    END LOOP;
    UPDATE events SET availability_asked_at = now() WHERE id = p_event;
    RETURN pid;
END $$;
GRANT EXECUTE ON FUNCTION ask_availability(UUID) TO authenticated;

-- b) Sistem: maça 72 saatten az kalan seri maçlarında sor; 24 saat kala cevapsızlara hatırlat
CREATE OR REPLACE FUNCTION send_availability_asks() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e RECORD; n INT := 0; grp UUID; pid UUID; m RECORD;
BEGIN
    FOR e IN SELECT * FROM events WHERE series_id IS NOT NULL AND status IN ('acik', 'doldu') AND availability_asked_at IS NULL
              AND event_date BETWEEN now() AND now() + INTERVAL '72 hours' LOOP
        BEGIN PERFORM ask_availability(e.id); n := n + 1; EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;
    -- hatırlatma: 24 saatten az kalmış, cevap vermemiş üyeler (bir kez)
    FOR e IN SELECT ev.*, p.id AS poll_id FROM events ev JOIN polls p ON p.event_id = ev.id AND p.kind = 'varmisin'
              WHERE ev.status IN ('acik', 'doldu') AND ev.event_date BETWEEN now() AND now() + INTERVAL '24 hours'
                AND ev.availability_asked_at < now() - INTERVAL '12 hours' AND ev.reminded_at IS NULL LOOP
        grp := group_conversation_for(e.id);
        FOR m IN SELECT cm.user_id FROM conversation_members cm WHERE cm.conversation_id = grp AND cm.user_id <> e.organizer_id
                  AND NOT EXISTS (SELECT 1 FROM poll_votes v WHERE v.poll_id = e.poll_id AND v.user_id = cm.user_id) LOOP
            PERFORM notify_user(m.user_id, 'varmisin', 'Hâlâ cevap vermedin', e.title || ' yarın · var mısın?',
                jsonb_build_object('event_id', e.id, 'conversation_id', grp, 'poll_id', e.poll_id));
        END LOOP;
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('eksikvar-varmisin', '30 * * * *', 'SELECT send_availability_asks()');
    END IF;
END $$;

-- c) Özet ve önerilen eksik: kadro = organizatör + "varım" diyenler ∪ bu haftanın onaylı katılımcıları + uygulamada olmayanlar
CREATE OR REPLACE FUNCTION suggested_needed(p_event UUID) RETURNS INT
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; pid UUID; in_count INT; s INT;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RETURN NULL; END IF;
    SELECT id INTO pid FROM polls WHERE event_id = p_event AND kind = 'varmisin';
    SELECT count(*) INTO in_count FROM (
        SELECT e.organizer_id AS uid
        UNION SELECT user_id FROM participants WHERE event_id = p_event
        UNION SELECT user_id FROM poll_votes WHERE poll_id = pid AND option_id = 'varim'
    ) x;
    s := e.total_capacity - e.offline_regulars - in_count;
    RETURN GREATEST(s, e.filled_count, 0);
END $$;

CREATE VIEW v_event_availability AS
SELECT e.id AS event_id, p.id AS poll_id, e.availability_asked_at,
       (SELECT count(*) FROM poll_votes v WHERE v.poll_id = p.id AND v.option_id = 'varim')::INT    AS varim,
       (SELECT count(*) FROM poll_votes v WHERE v.poll_id = p.id AND v.option_id = 'yokum')::INT    AS yokum,
       (SELECT count(*) FROM poll_votes v WHERE v.poll_id = p.id AND v.option_id = 'belirsiz')::INT AS belirsiz,
       (SELECT count(*) FROM conversation_members cm WHERE cm.conversation_id = group_conversation_for(e.id) AND cm.user_id <> e.organizer_id
          AND NOT EXISTS (SELECT 1 FROM poll_votes v WHERE v.poll_id = p.id AND v.user_id = cm.user_id))::INT AS cevapsiz,
       suggested_needed(e.id) AS suggested
  FROM events e LEFT JOIN polls p ON p.event_id = e.id AND p.kind = 'varmisin'
 WHERE e.series_id IS NOT NULL;
GRANT SELECT ON v_event_availability TO authenticated;

-- d) Öneriyi uygula (organizatör): eksik sayısı güncellenir, gruba duyurulur
CREATE OR REPLACE FUNCTION apply_suggested_needed(p_event UUID) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; s INT;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    s := suggested_needed(p_event);
    UPDATE events SET needed_count = s WHERE id = p_event;
    PERFORM event_updated_notice(p_event);
    RETURN s;
END $$;
GRANT EXECUTE ON FUNCTION apply_suggested_needed(UUID) TO authenticated;
