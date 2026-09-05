-- ============================================================
--  EKSİK VAR — 16. migrasyon: Maç sonucu + MVP
-- ============================================================

ALTER TABLE events
    ADD COLUMN completed_at     TIMESTAMPTZ,
    ADD COLUMN score_home       SMALLINT CHECK (score_home BETWEEN 0 AND 99),
    ADD COLUMN score_away       SMALLINT CHECK (score_away BETWEEN 0 AND 99),
    ADD COLUMN score_label      VARCHAR(60),                      -- "Yelekliler – Yeleksizler" / "Biz – Rakip"
    ADD COLUMN mvp_user_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN mvp_finalized_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN mvp_count INT NOT NULL DEFAULT 0;

-- Tamamlanma zamanı (MVP oylaması 48 saat sürer)
CREATE OR REPLACE FUNCTION trg_event_completed_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status = 'tamamlandi' AND (OLD.status IS DISTINCT FROM 'tamamlandi') THEN NEW.completed_at := now(); END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER events_completed_at BEFORE UPDATE OF status ON events
    FOR EACH ROW EXECUTE FUNCTION trg_event_completed_at();

CREATE TABLE mvp_votes (
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    voter_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voted_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (event_id, voter_id),
    CHECK (voter_id <> voted_id)
);
ALTER TABLE mvp_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY mvp_read   ON mvp_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY mvp_insert ON mvp_votes FOR INSERT TO authenticated WITH CHECK (voter_id = auth.uid() AND is_active_user());
GRANT SELECT, INSERT ON mvp_votes TO authenticated;

-- Maçta olan (organizatör ya da katılan katılımcı)
CREATE OR REPLACE FUNCTION played_in(p_event UUID, p_user UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM events WHERE id = p_event AND organizer_id = p_user)
        OR EXISTS (SELECT 1 FROM participants WHERE event_id = p_event AND user_id = p_user AND attendance = 'katildi');
$$;

CREATE OR REPLACE FUNCTION trg_mvp_vote_check() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    IF NOT FOUND OR e.status <> 'tamamlandi' THEN RAISE EXCEPTION 'MAC_TAMAMLANMADI'; END IF;
    IF e.mvp_finalized_at IS NOT NULL OR (e.completed_at IS NOT NULL AND e.completed_at < now() - INTERVAL '48 hours') THEN
        RAISE EXCEPTION 'OYLAMA_KAPANDI';
    END IF;
    IF NOT played_in(NEW.event_id, NEW.voter_id) THEN RAISE EXCEPTION 'MACTA_DEGILSIN'; END IF;
    IF NOT played_in(NEW.event_id, NEW.voted_id) THEN RAISE EXCEPTION 'OYUNCU_MACTA_DEGIL'; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER mvp_votes_check BEFORE INSERT ON mvp_votes
    FOR EACH ROW EXECUTE FUNCTION trg_mvp_vote_check();

-- Anlık sıralama (herkes görür)
CREATE VIEW v_event_mvp AS
SELECT v.event_id, v.voted_id, u.full_name, count(*)::INT AS votes,
       row_number() OVER (PARTITION BY v.event_id ORDER BY count(*) DESC, min(v.created_at)) AS rnk
  FROM mvp_votes v JOIN users u ON u.id = v.voted_id
 GROUP BY v.event_id, v.voted_id, u.full_name;
GRANT SELECT ON v_event_mvp TO authenticated;

-- Skor: organizatör, tamamlanmış maçta
CREATE OR REPLACE FUNCTION record_score(p_event UUID, p_home INT, p_away INT, p_label TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; grp UUID;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF e.status <> 'tamamlandi' THEN RAISE EXCEPTION 'MAC_TAMAMLANMADI'; END IF;
    UPDATE events SET score_home = p_home, score_away = p_away,
           score_label = COALESCE(NULLIF(p_label, ''), CASE WHEN e.kind = 'rakip' THEN e.team_name || ' – Rakip' ELSE 'Yelekliler – Yeleksizler' END)
     WHERE id = p_event;
    grp := group_conversation_for(p_event);
    IF grp IS NOT NULL THEN
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (grp, NULL, 'sistem', format('Maç sonucu: %s %s – %s', COALESCE(NULLIF(p_label, ''), CASE WHEN e.kind = 'rakip' THEN e.team_name || ' – Rakip' ELSE 'Yelekliler – Yeleksizler' END), p_home, p_away));
    END IF;
END $$;
GRANT EXECUTE ON FUNCTION record_score(UUID, INT, INT, TEXT) TO authenticated;

-- MVP ilanı: tamamlanmadan 48 saat sonra (saat başı)
CREATE OR REPLACE FUNCTION finalize_mvp() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e RECORD; w RECORD; grp UUID; n INT := 0;
BEGIN
    FOR e IN SELECT * FROM events WHERE status = 'tamamlandi' AND mvp_finalized_at IS NULL AND completed_at < now() - INTERVAL '48 hours' LOOP
        SELECT voted_id, full_name, votes INTO w FROM v_event_mvp WHERE event_id = e.id AND rnk = 1;
        IF FOUND THEN
            UPDATE events SET mvp_user_id = w.voted_id, mvp_finalized_at = now() WHERE id = e.id;
            UPDATE users SET mvp_count = mvp_count + 1 WHERE id = w.voted_id;
            PERFORM notify_user(w.voted_id, 'mvp', 'Maçın oyuncusu sensin! 🏆', e.title || ' · ' || w.votes || ' oy', jsonb_build_object('event_id', e.id));
            grp := group_conversation_for(e.id);
            IF grp IS NOT NULL THEN
                INSERT INTO messages (conversation_id, sender_id, type, content)
                VALUES (grp, NULL, 'sistem', format('🏆 Maçın oyuncusu: %s (%s oy)', w.full_name, w.votes));
            END IF;
        ELSE
            UPDATE events SET mvp_finalized_at = now() WHERE id = e.id;   -- oy yok, kapat
        END IF;
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('eksikvar-mvp', '45 * * * *', 'SELECT finalize_mvp()');
    END IF;
END $$;
