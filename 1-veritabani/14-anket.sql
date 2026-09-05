-- ============================================================
--  EKSİK VAR — 14. migrasyon: Sohbette anket
--  Anket = polls satırı + sohbete düşen bir mesaj (messages.poll_id). Oylar poll_votes;
--  tek seçimli ankette yeni oy eskisini siler; kapanan ankete oy verilemez.
-- ============================================================

CREATE TABLE polls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    question        VARCHAR(200) NOT NULL,
    options         JSONB NOT NULL,                 -- [{"id":"a","text":"Cuma"},...]
    multiple        BOOLEAN NOT NULL DEFAULT FALSE,
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (jsonb_array_length(options) BETWEEN 2 AND 6)
);
CREATE INDEX idx_polls_conversation ON polls (conversation_id, created_at DESC);

CREATE TABLE poll_votes (
    poll_id    UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    option_id  VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (poll_id, user_id, option_id)
);
ALTER TABLE messages ADD COLUMN poll_id UUID REFERENCES polls(id) ON DELETE SET NULL;

-- Güvenlik: yalnızca sohbet üyeleri görür/oy verir; anketi oluşturan kapatır
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY polls_read   ON polls FOR SELECT TO authenticated USING (is_conversation_member(conversation_id));
CREATE POLICY polls_update ON polls FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY votes_read   ON poll_votes FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_id AND is_conversation_member(p.conversation_id)));
CREATE POLICY votes_insert ON poll_votes FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() AND is_active_user() AND EXISTS (SELECT 1 FROM polls p WHERE p.id = poll_id AND is_conversation_member(p.conversation_id)));
CREATE POLICY votes_delete ON poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());
GRANT SELECT, UPDATE ON polls TO authenticated;
GRANT SELECT, INSERT, DELETE ON poll_votes TO authenticated;

-- Anket oluştur: sohbete "📊 soru" mesajı olarak düşer (bildirim/gerçek zamanlı akış mesaj yolundan)
CREATE OR REPLACE FUNCTION create_poll(p_conversation UUID, p_question TEXT, p_options JSONB, p_multiple BOOLEAN DEFAULT FALSE)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID;
BEGIN
    IF auth.uid() IS NULL OR NOT is_conversation_member(p_conversation) THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF NOT is_active_user() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF jsonb_array_length(p_options) < 2 OR jsonb_array_length(p_options) > 6 THEN RAISE EXCEPTION 'SECENEK_SAYISI'; END IF;
    INSERT INTO polls (conversation_id, created_by, question, options, multiple)
    VALUES (p_conversation, auth.uid(), left(trim(p_question), 200), p_options, p_multiple) RETURNING id INTO v_id;
    INSERT INTO messages (conversation_id, sender_id, content, poll_id)
    VALUES (p_conversation, auth.uid(), '📊 ' || left(trim(p_question), 200), v_id);
    RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION create_poll(UUID, TEXT, JSONB, BOOLEAN) TO authenticated;

-- Oy kuralları: kapalı ankete oy yok; geçersiz seçenek yok; tek seçimli ankette eski oy silinir
CREATE OR REPLACE FUNCTION trg_poll_vote_check() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p polls%ROWTYPE;
BEGIN
    SELECT * INTO p FROM polls WHERE id = NEW.poll_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'ANKET_YOK'; END IF;
    IF p.closed_at IS NOT NULL THEN RAISE EXCEPTION 'ANKET_KAPALI'; END IF;
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(p.options) o WHERE o->>'id' = NEW.option_id) THEN RAISE EXCEPTION 'SECENEK_YOK'; END IF;
    IF NOT p.multiple THEN DELETE FROM poll_votes WHERE poll_id = NEW.poll_id AND user_id = NEW.user_id; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER poll_votes_check BEFORE INSERT ON poll_votes
    FOR EACH ROW EXECUTE FUNCTION trg_poll_vote_check();

-- Gerçek zamanlı: oylar anında yenilensin
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes, polls;
    END IF;
END $$;
