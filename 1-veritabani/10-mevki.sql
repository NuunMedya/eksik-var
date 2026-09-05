-- ============================================================
--  EKSİK VAR — 10. migrasyon: Mevki ihtiyacı
--  events.needed_positions: {"kaleci":1,"defans":1} (toplamı needed_count'u aşamaz;
--  kalan kontenjan "farketmez"). applications.position: başvurulan mevki.
--  Onayda mevki kontenjanı sunucuda denetlenir.
-- ============================================================

ALTER TABLE events       ADD COLUMN needed_positions JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE applications ADD COLUMN position VARCHAR(20);
ALTER TABLE users        ADD COLUMN positions TEXT[] NOT NULL DEFAULT '{}';

-- Mevki toplamı kontenjanı aşamaz
CREATE OR REPLACE FUNCTION trg_event_positions_check() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE total INT;
BEGIN
    SELECT COALESCE(SUM((v.value)::INT), 0) INTO total FROM jsonb_each_text(NEW.needed_positions) v;
    IF total > NEW.needed_count THEN
        RAISE EXCEPTION 'MEVKI_TOPLAMI_FAZLA' USING HINT = 'Mevki sayıları eksik oyuncu sayısını aşamaz';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER events_positions_check BEFORE INSERT OR UPDATE OF needed_positions, needed_count ON events
    FOR EACH ROW EXECUTE FUNCTION trg_event_positions_check();

-- Mevki başına dolu sayısı (onaylanmış başvurular). Görünüm sahibi olarak çalışır: yalnızca sayılar dışarı çıkar.
CREATE VIEW v_event_position_fill AS
SELECT event_id, COALESCE(position, 'farketmez') AS position, count(*)::INT AS filled
  FROM applications WHERE status = 'onaylandi' GROUP BY event_id, COALESCE(position, 'farketmez');
GRANT SELECT ON v_event_position_fill TO authenticated;

-- Bu mevkiye hâlâ yer var mı?  Belirtilmemiş mevkiler ve 'farketmez', kalan serbest kontenjanı kullanır.
CREATE OR REPLACE FUNCTION position_available(p_event UUID, p_position TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; quota INT; used INT; specified INT; free_total INT; free_used INT; pos TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    pos := COALESCE(NULLIF(p_position, ''), 'farketmez');
    quota := (e.needed_positions ->> pos)::INT;
    IF quota IS NOT NULL THEN
        SELECT count(*) INTO used FROM applications WHERE event_id = p_event AND status = 'onaylandi' AND position = pos;
        RETURN used < quota;
    END IF;
    -- serbest kontenjan: needed_count - belirtilen mevkiler; kullanılanı: mevkisi belirtilmemiş/kotasız onaylılar
    SELECT COALESCE(SUM((v.value)::INT), 0) INTO specified FROM jsonb_each_text(e.needed_positions) v;
    free_total := e.needed_count - specified;
    SELECT count(*) INTO free_used FROM applications a
     WHERE a.event_id = p_event AND a.status = 'onaylandi'
       AND (a.position IS NULL OR NOT (e.needed_positions ? a.position));
    RETURN free_used < free_total;
END $$;

-- Başvuruda mevki kontrolü (kota yoksa serbest kontenjan olmalı)
CREATE OR REPLACE FUNCTION trg_application_position_check() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT position_available(NEW.event_id, NEW.position) THEN
        RAISE EXCEPTION 'MEVKI_DOLU' USING HINT = 'Bu mevki için yer kalmadı';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER applications_position_check BEFORE INSERT ON applications
    FOR EACH ROW EXECUTE FUNCTION trg_application_position_check();

-- Çift onay tamamlanırken de kontrol (aynı mevkiye iki kişi onaylanmasın)
CREATE OR REPLACE FUNCTION trg_approval_position_check() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.organizer_approved AND NEW.applicant_approved AND OLD.status = 'beklemede'
       AND NOT position_available(NEW.event_id, NEW.position) THEN
        RAISE EXCEPTION 'MEVKI_DOLU' USING HINT = 'Bu mevki bu arada doldu';
    END IF;
    RETURN NEW;
END $$;
-- on_application_approved (BEFORE UPDATE) durumu 'onaylandi' yapmadan önce çalışsın: alfabetik sıra → "a_" öneki
CREATE TRIGGER a_approval_position_check BEFORE UPDATE OF organizer_approved, applicant_approved ON applications
    FOR EACH ROW EXECUTE FUNCTION trg_approval_position_check();
