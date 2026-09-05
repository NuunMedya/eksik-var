-- ============================================================
--  EKSİK VAR — 23. migrasyon: Gol/asist + sezon istatistikleri, yoklama kodu, kayıtlı sahalar
-- ============================================================

-- a) Gol ve asist (organizatör girer; tamamlanmış maçta; maçta olan oyuncu/misafir)
CREATE TABLE match_stats (
    event_id  UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id   UUID REFERENCES users(id) ON DELETE CASCADE,
    guest_id  UUID REFERENCES guests(id) ON DELETE CASCADE,
    goals     SMALLINT NOT NULL DEFAULT 0 CHECK (goals BETWEEN 0 AND 30),
    assists   SMALLINT NOT NULL DEFAULT 0 CHECK (assists BETWEEN 0 AND 30),
    CHECK ((user_id IS NOT NULL) <> (guest_id IS NOT NULL)),
    UNIQUE (event_id, user_id), UNIQUE (event_id, guest_id)
);
ALTER TABLE match_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY match_stats_read ON match_stats FOR SELECT TO authenticated USING (true);
GRANT SELECT ON match_stats TO authenticated;

CREATE OR REPLACE FUNCTION set_match_stat(p_event UUID, p_user UUID, p_guest UUID, p_goals INT, p_assists INT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF e.status <> 'tamamlandi' THEN RAISE EXCEPTION 'MAC_TAMAMLANMADI'; END IF;
    IF p_user IS NOT NULL AND NOT played_in(p_event, p_user) THEN RAISE EXCEPTION 'OYUNCU_MACTA_DEGIL'; END IF;
    IF p_guest IS NOT NULL AND NOT EXISTS (SELECT 1 FROM guest_records WHERE event_id = p_event AND guest_id = p_guest AND attendance = 'katildi') THEN RAISE EXCEPTION 'OYUNCU_MACTA_DEGIL'; END IF;
    IF p_user IS NOT NULL THEN
        INSERT INTO match_stats (event_id, user_id, goals, assists) VALUES (p_event, p_user, p_goals, p_assists)
        ON CONFLICT (event_id, user_id) DO UPDATE SET goals = EXCLUDED.goals, assists = EXCLUDED.assists;
    ELSE
        INSERT INTO match_stats (event_id, guest_id, goals, assists) VALUES (p_event, p_guest, p_goals, p_assists)
        ON CONFLICT (event_id, guest_id) DO UPDATE SET goals = EXCLUDED.goals, assists = EXCLUDED.assists;
    END IF;
END $$;
GRANT EXECUTE ON FUNCTION set_match_stat(UUID, UUID, UUID, INT, INT) TO authenticated;

-- Sezon tablosu: bir serinin (ya da tek maçın) tamamlanmış maçlarında oyuncu başına toplamlar
CREATE OR REPLACE FUNCTION season_table(p_series UUID)
RETURNS TABLE (player_id TEXT, name TEXT, is_guest BOOLEAN, matches INT, goals INT, assists INT, mvps INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    WITH evs AS (SELECT id FROM events WHERE (id = p_series OR series_id = p_series) AND status = 'tamamlandi'),
    users_played AS (
        SELECT p.user_id AS uid, count(*)::INT AS m FROM participants p JOIN evs ON evs.id = p.event_id WHERE p.attendance = 'katildi' GROUP BY p.user_id
        UNION ALL SELECT e.organizer_id, count(*)::INT FROM events e JOIN evs ON evs.id = e.id GROUP BY e.organizer_id),
    up AS (SELECT uid, sum(m)::INT AS m FROM users_played GROUP BY uid),
    gp AS (SELECT r.guest_id AS gid, count(*)::INT AS m FROM guest_records r JOIN evs ON evs.id = r.event_id WHERE r.attendance = 'katildi' GROUP BY r.guest_id)
    SELECT up.uid::TEXT, u.full_name::TEXT, FALSE, up.m,
           COALESCE((SELECT sum(goals) FROM match_stats s JOIN evs ON evs.id = s.event_id WHERE s.user_id = up.uid), 0)::INT,
           COALESCE((SELECT sum(assists) FROM match_stats s JOIN evs ON evs.id = s.event_id WHERE s.user_id = up.uid), 0)::INT,
           (SELECT count(*) FROM events e JOIN evs ON evs.id = e.id WHERE e.mvp_user_id = up.uid)::INT
      FROM up JOIN users u ON u.id = up.uid
    UNION ALL
    SELECT 'g:' || gp.gid::TEXT, g.name::TEXT, TRUE, gp.m,
           COALESCE((SELECT sum(goals) FROM match_stats s JOIN evs ON evs.id = s.event_id WHERE s.guest_id = gp.gid), 0)::INT,
           COALESCE((SELECT sum(assists) FROM match_stats s JOIN evs ON evs.id = s.event_id WHERE s.guest_id = gp.gid), 0)::INT, 0
      FROM gp JOIN guests g ON g.id = gp.gid
    ORDER BY 5 DESC, 6 DESC, 4 DESC;
$$;
GRANT EXECUTE ON FUNCTION season_table(UUID) TO authenticated;

-- Kişisel toplamlar (profil): tüm tamamlanmış maçlar
CREATE OR REPLACE FUNCTION player_totals(p_user UUID) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT jsonb_build_object('goals', COALESCE(sum(goals), 0), 'assists', COALESCE(sum(assists), 0), 'matches', count(*))
      FROM match_stats s JOIN events e ON e.id = s.event_id WHERE s.user_id = p_user AND e.status = 'tamamlandi';
$$;
GRANT EXECUTE ON FUNCTION player_totals(UUID) TO authenticated;

-- b) Yoklama kodu: organizatör kodu açar (maç günü), gelen kodu girer → "sahadayım" kaydı
ALTER TABLE events ADD COLUMN checkin_code CHAR(4), ADD COLUMN checkin_code_at TIMESTAMPTZ;
CREATE OR REPLACE FUNCTION open_checkin_code(p_event UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; code TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF now() < e.event_date - INTERVAL '3 hours' OR now() > e.event_date + INTERVAL '4 hours' THEN RAISE EXCEPTION 'ZAMAN_DISI'; END IF;
    IF e.checkin_code IS NOT NULL AND e.checkin_code_at > now() - INTERVAL '6 hours' THEN RETURN e.checkin_code; END IF;
    code := lpad((floor(random() * 9000) + 1000)::INT::TEXT, 4, '0');
    UPDATE events SET checkin_code = code, checkin_code_at = now() WHERE id = p_event;
    RETURN code;
END $$;
GRANT EXECUTE ON FUNCTION open_checkin_code(UUID) TO authenticated;
CREATE OR REPLACE FUNCTION check_in_with_code(p_event UUID, p_code TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF e.checkin_code IS NULL OR e.checkin_code_at < now() - INTERVAL '6 hours' THEN RAISE EXCEPTION 'KOD_YOK'; END IF;
    IF e.checkin_code <> lpad(trim(p_code), 4, '0') THEN RAISE EXCEPTION 'KOD_YANLIS'; END IF;
    PERFORM check_in(p_event);
END $$;
GRANT EXECUTE ON FUNCTION check_in_with_code(UUID, TEXT) TO authenticated;

-- c) Kayıtlı sahalar (kişisel)
CREATE TABLE saved_venues (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name      VARCHAR(120) NOT NULL,
    city_id   INT REFERENCES cities(id),
    district_id INT REFERENCES districts(id),
    price     INT,
    used_count INT NOT NULL DEFAULT 1,
    UNIQUE (user_id, name)
);
ALTER TABLE saved_venues ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_venues_own ON saved_venues FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON saved_venues TO authenticated;
-- Her ilan açılışında saha otomatik kaydedilir / sayacı artar
CREATE OR REPLACE FUNCTION trg_remember_venue() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.venue_name IS NULL OR trim(NEW.venue_name) = '' THEN RETURN NEW; END IF;
    INSERT INTO saved_venues (user_id, name, city_id, district_id, price)
    VALUES (NEW.organizer_id, trim(NEW.venue_name), NEW.city_id, NEW.district_id, NEW.price_per_person)
    ON CONFLICT (user_id, name) DO UPDATE SET used_count = saved_venues.used_count + 1, price = EXCLUDED.price, district_id = COALESCE(EXCLUDED.district_id, saved_venues.district_id);
    RETURN NEW;
END $$;
CREATE TRIGGER events_remember_venue AFTER INSERT ON events FOR EACH ROW EXECUTE FUNCTION trg_remember_venue();
