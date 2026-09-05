-- ============================================================
--  EKSİK VAR — Veritabanı Şeması (PostgreSQL 13+ / Supabase)
-- ============================================================
--  Kurulum:
--    psql -d veritabani_adi -f eksik_var_schema.sql
--    veya Supabase → SQL Editor'e yapıştırıp çalıştırın.
--
--  Not: Tablo/sütun adları İngilizce tutuldu (Türkçe karakterler
--  tanımlayıcılarda sorun çıkarır, sektör pratiği de budur);
--  tüm açıklamalar Türkçedir.
-- ============================================================

-- ---------- ENUM TİPLERİ ----------
CREATE TYPE user_status        AS ENUM ('aktif', 'askida', 'banli');
CREATE TYPE event_status       AS ENUM ('acik', 'doldu', 'iptal', 'tamamlandi');
CREATE TYPE skill_level        AS ENUM ('farketmez', 'baslangic', 'orta', 'ileri');
CREATE TYPE application_status AS ENUM ('beklemede', 'onaylandi', 'reddedildi', 'iptal');
CREATE TYPE attendance_status  AS ENUM ('bekleniyor', 'katildi', 'gelmedi');
CREATE TYPE conversation_type  AS ENUM ('grup', 'birebir');
CREATE TYPE member_role        AS ENUM ('yonetici', 'uye');
CREATE TYPE message_type       AS ENUM ('metin', 'resim', 'sistem');
CREATE TYPE report_status      AS ENUM ('bekliyor', 'incelendi', 'kapatildi');

-- ============================================================
--  1) İLLER  (şimdilik 4 iliniz; büyüyünce satır eklemek yeter)
-- ============================================================
CREATE TABLE cities (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(60) NOT NULL UNIQUE,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
--  2) KATEGORİLER  (etkinlik türleri)
-- ============================================================
CREATE TABLE categories (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(60) NOT NULL UNIQUE,
    icon       VARCHAR(20),
    is_active  BOOLEAN NOT NULL DEFAULT TRUE
);

-- ============================================================
--  3) KULLANICILAR
--     Kayıt: telefon + şifre (öneri: SMS OTP doğrulaması).
--     Not: Supabase Auth kullanırsanız password_hash gerekmez,
--     bu tablo auth.users'a id ile bağlanan profil tablosu olur.
-- ============================================================
CREATE TABLE users (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone            VARCHAR(20)  NOT NULL UNIQUE,
    email            VARCHAR(255) UNIQUE,
    password_hash    TEXT,                       -- bcrypt/argon2 ile saklayın, asla düz metin!
    username         VARCHAR(30)  NOT NULL UNIQUE,
    full_name        VARCHAR(100) NOT NULL,
    avatar_url       TEXT,
    bio              VARCHAR(300),
    city_id          INT REFERENCES cities(id),

    -- Puanlama sistemi (trigger'lar otomatik günceller)
    rating_avg       NUMERIC(3,2) NOT NULL DEFAULT 0,
    rating_count     INT          NOT NULL DEFAULT 0,

    -- Güvenilirlik takibi ("geliyorum deyip gelmeme" problemi için)
    events_joined    INT NOT NULL DEFAULT 0,     -- katıldı olarak işaretlenen etkinlik sayısı
    events_organized INT NOT NULL DEFAULT 0,
    no_show_count    INT NOT NULL DEFAULT 0,     -- gelmedi sayısı
    reliability_pct  NUMERIC(5,1) GENERATED ALWAYS AS (
        CASE WHEN events_joined + no_show_count = 0 THEN NULL
             ELSE ROUND(events_joined::numeric * 100 / (events_joined + no_show_count), 1)
        END
    ) STORED,                                    -- örn. %95 katılım — profilde gösterin

    is_verified      BOOLEAN NOT NULL DEFAULT FALSE,   -- SMS doğrulaması yapıldı mı
    status           user_status NOT NULL DEFAULT 'aktif',
    last_seen_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  4) ETKİNLİKLER
--     Organizatör "eksik" talebini burada oluşturur.
-- ============================================================
CREATE TABLE events (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id          INT  NOT NULL REFERENCES categories(id),
    city_id              INT  NOT NULL REFERENCES cities(id),
    title                VARCHAR(120) NOT NULL,
    description          TEXT,
    venue_name           VARCHAR(150),            -- örn. "Yıldız Halı Saha"
    address              TEXT,
    latitude             NUMERIC(9,6),
    longitude            NUMERIC(9,6),
    event_date           TIMESTAMPTZ NOT NULL,
    total_capacity       INT NOT NULL CHECK (total_capacity > 0),   -- toplam kadro (örn. 14)
    needed_count         INT NOT NULL CHECK (needed_count > 0),     -- aranan eksik sayısı (örn. 3)
    filled_count         INT NOT NULL DEFAULT 0 CHECK (filled_count >= 0), -- uygulamadan dolan
    price_per_person     NUMERIC(10,2) NOT NULL DEFAULT 0,          -- kişi başı ücret
    skill_level          skill_level NOT NULL DEFAULT 'farketmez',
    status               event_status NOT NULL DEFAULT 'acik',
    application_deadline TIMESTAMPTZ,             -- son başvuru zamanı
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (needed_count <= total_capacity),
    CHECK (filled_count <= needed_count),
    CHECK (application_deadline IS NULL OR application_deadline <= event_date)
);

-- ============================================================
--  5) SOHBETLER  (WhatsApp grup mantığı)
--     grup    → her etkinliğin otomatik grup sohbeti
--     birebir → başvuran ile organizatör arasındaki ön görüşme
-- ============================================================
CREATE TABLE conversations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type        conversation_type NOT NULL,
    event_id    UUID REFERENCES events(id) ON DELETE CASCADE,
    name        VARCHAR(120),
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bir etkinliğin yalnızca 1 grup sohbeti olabilir
CREATE UNIQUE INDEX uq_event_group_chat ON conversations (event_id) WHERE type = 'grup';

-- ============================================================
--  6) MESAJLAR
-- ============================================================
CREATE TABLE messages (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,  -- sıralama/sayfalama için
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID REFERENCES users(id) ON DELETE SET NULL,     -- NULL = sistem mesajı
    type            message_type NOT NULL DEFAULT 'metin',
    content         TEXT,
    image_url       TEXT,
    reply_to_id     BIGINT REFERENCES messages(id) ON DELETE SET NULL, -- mesajı yanıtlama
    is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,                    -- "bu mesaj silindi"
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (content IS NOT NULL OR image_url IS NOT NULL)
);

-- ============================================================
--  7) SOHBET ÜYELERİ
--     Okundu bilgisi WhatsApp'taki gibi "son okunan mesaj"
--     üzerinden tutulur (grup sohbetlerinde en verimli yöntem).
-- ============================================================
CREATE TABLE conversation_members (
    conversation_id      UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role                 member_role NOT NULL DEFAULT 'uye',
    is_muted             BOOLEAN NOT NULL DEFAULT FALSE,   -- bildirim sessize alma
    last_read_message_id BIGINT REFERENCES messages(id),
    joined_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (conversation_id, user_id)
);

-- ============================================================
--  8) BAŞVURULAR  (çift taraflı onay akışının kalbi)
--     Akış: başvuru → birebir sohbet (otomatik açılır)
--           → organizatör onayı → başvuran son onayı
--           → trigger kontenjanı doldurur, gruba ekler.
-- ============================================================
CREATE TABLE applications (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id              UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    applicant_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id       UUID REFERENCES conversations(id),  -- otomatik açılan birebir sohbet
    message               VARCHAR(500),                       -- başvuru notu: "Kaleci lazımsa ben varım"
    status                application_status NOT NULL DEFAULT 'beklemede',
    organizer_approved    BOOLEAN NOT NULL DEFAULT FALSE,
    organizer_approved_at TIMESTAMPTZ,
    applicant_approved    BOOLEAN NOT NULL DEFAULT FALSE,
    applicant_approved_at TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, applicant_id)     -- aynı etkinliğe ikinci kez başvurulamaz
);

-- ============================================================
--  9) KATILIMCILAR  (kesinleşmiş kadro + yoklama)
-- ============================================================
CREATE TABLE participants (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    attendance     attendance_status NOT NULL DEFAULT 'bekleniyor',  -- etkinlik sonrası organizatör işaretler
    joined_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);

-- ============================================================
-- 10) PUANLAMALAR
--     Yalnızca tamamlanmış etkinlikte yer alanlar birbirini
--     puanlayabilir (trigger ile korunur). 1-5 yıldız + yorum.
-- ============================================================
CREATE TABLE ratings (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    rater_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- puanı veren
    rated_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- puanlanan
    score      SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment    VARCHAR(300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, rater_id, rated_id),  -- aynı etkinlik için aynı kişiye tek puan
    CHECK (rater_id <> rated_id)
);

-- ============================================================
-- 11) BİLDİRİMLER
-- ============================================================
CREATE TABLE notifications (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       VARCHAR(50) NOT NULL,   -- 'yeni_basvuru', 'basvuru_onaylandi', 'yeni_mesaj', 'etkinlik_iptal'...
    title      VARCHAR(120) NOT NULL,
    body       VARCHAR(300),
    data       JSONB,                  -- yönlendirme için: {"event_id": "...", "conversation_id": "..."}
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 12) ENGELLEMELER  (engellenen kişi başvuru yapamaz)
-- ============================================================
CREATE TABLE blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);

-- ============================================================
-- 13) ŞİKAYETLER
-- ============================================================
CREATE TABLE reports (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    reporter_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_id         UUID REFERENCES events(id) ON DELETE SET NULL,
    message_id       BIGINT REFERENCES messages(id) ON DELETE SET NULL,
    reason           VARCHAR(60) NOT NULL,   -- 'taciz', 'sahte_etkinlik', 'gelmedi', 'diger'...
    description      VARCHAR(500),
    status           report_status NOT NULL DEFAULT 'bekliyor',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
--  OTOMATİK AKIŞLAR (TRIGGER'LAR)
-- ============================================================

-- (A) updated_at alanını otomatik güncelle
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_events_updated       BEFORE UPDATE ON events       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- (B) Etkinlik oluşunca: grup sohbetini aç, organizatörü yönetici yap,
--     organizatörün sayaçlarını güncelle. (WhatsApp grubu otomatik kurulur.)
CREATE OR REPLACE FUNCTION on_event_created() RETURNS TRIGGER AS $$
DECLARE
    v_chat_id UUID;
BEGIN
    INSERT INTO conversations (type, event_id, name, created_by)
    VALUES ('grup', NEW.id, NEW.title, NEW.organizer_id)
    RETURNING id INTO v_chat_id;

    INSERT INTO conversation_members (conversation_id, user_id, role)
    VALUES (v_chat_id, NEW.organizer_id, 'yonetici');

    UPDATE users SET events_organized = events_organized + 1
    WHERE id = NEW.organizer_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_event_created
AFTER INSERT ON events
FOR EACH ROW EXECUTE FUNCTION on_event_created();

-- (C) Başvuru gelirken doğrula + organizatörle birebir sohbeti otomatik aç
CREATE OR REPLACE FUNCTION on_application_insert() RETURNS TRIGGER AS $$
DECLARE
    v_event events%ROWTYPE;
    v_chat_id UUID;
BEGIN
    SELECT * INTO v_event FROM events WHERE id = NEW.event_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Etkinlik bulunamadı';
    END IF;
    IF v_event.status <> 'acik' THEN
        RAISE EXCEPTION 'Bu etkinlik başvuruya kapalı';
    END IF;
    IF v_event.application_deadline IS NOT NULL AND now() > v_event.application_deadline THEN
        RAISE EXCEPTION 'Son başvuru zamanı geçti';
    END IF;
    IF v_event.organizer_id = NEW.applicant_id THEN
        RAISE EXCEPTION 'Kendi etkinliğinize başvuramazsınız';
    END IF;
    IF EXISTS (SELECT 1 FROM blocks
               WHERE (blocker_id = v_event.organizer_id AND blocked_id = NEW.applicant_id)
                  OR (blocker_id = NEW.applicant_id     AND blocked_id = v_event.organizer_id)) THEN
        RAISE EXCEPTION 'Bu etkinliğe başvuru yapılamıyor';
    END IF;

    -- Ön görüşme için birebir sohbet
    INSERT INTO conversations (type, event_id, created_by)
    VALUES ('birebir', NEW.event_id, NEW.applicant_id)
    RETURNING id INTO v_chat_id;

    INSERT INTO conversation_members (conversation_id, user_id)
    VALUES (v_chat_id, v_event.organizer_id), (v_chat_id, NEW.applicant_id);

    NEW.conversation_id := v_chat_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_application_insert
BEFORE INSERT ON applications
FOR EACH ROW EXECUTE FUNCTION on_application_insert();

-- (D) ÇİFT ONAY: iki taraf da onay verince
--     → başvuru kesinleşir → katılımcı eklenir → kontenjan artar
--     → doluysa etkinlik 'doldu' olur → kişi grup sohbetine eklenir
CREATE OR REPLACE FUNCTION on_application_approved() RETURNS TRIGGER AS $$
DECLARE
    v_event    events%ROWTYPE;
    v_group_id UUID;
    v_username TEXT;
BEGIN
    IF NEW.organizer_approved AND NEW.applicant_approved AND NEW.status = 'beklemede' THEN

        -- Yarış durumlarına karşı etkinlik satırını kilitle
        SELECT * INTO v_event FROM events WHERE id = NEW.event_id FOR UPDATE;

        IF v_event.filled_count >= v_event.needed_count THEN
            RAISE EXCEPTION 'Kontenjan dolu';
        END IF;

        NEW.status := 'onaylandi';

        INSERT INTO participants (event_id, user_id, application_id)
        VALUES (NEW.event_id, NEW.applicant_id, NEW.id);

        UPDATE events
        SET filled_count = filled_count + 1,
            status = CASE WHEN filled_count + 1 >= needed_count
                          THEN 'doldu'::event_status ELSE status END
        WHERE id = NEW.event_id;

        -- Grup sohbetine ekle + sistem mesajı düş
        SELECT id INTO v_group_id FROM conversations
        WHERE event_id = NEW.event_id AND type = 'grup';

        IF v_group_id IS NOT NULL THEN
            INSERT INTO conversation_members (conversation_id, user_id)
            VALUES (v_group_id, NEW.applicant_id)
            ON CONFLICT DO NOTHING;

            SELECT username INTO v_username FROM users WHERE id = NEW.applicant_id;
            INSERT INTO messages (conversation_id, sender_id, type, content)
            VALUES (v_group_id, NULL, 'sistem', v_username || ' etkinliğe katıldı');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_application_approved
BEFORE UPDATE ON applications
FOR EACH ROW EXECUTE FUNCTION on_application_approved();

-- (E) Puan girildiğinde kullanıcının ortalamasını güncelle
CREATE OR REPLACE FUNCTION on_rating_change() RETURNS TRIGGER AS $$
DECLARE
    v_user UUID := COALESCE(NEW.rated_id, OLD.rated_id);
BEGIN
    UPDATE users SET
        rating_avg   = COALESCE((SELECT ROUND(AVG(score)::numeric, 2) FROM ratings WHERE rated_id = v_user), 0),
        rating_count = (SELECT COUNT(*) FROM ratings WHERE rated_id = v_user)
    WHERE id = v_user;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rating_change
AFTER INSERT OR UPDATE OR DELETE ON ratings
FOR EACH ROW EXECUTE FUNCTION on_rating_change();

-- (F) Puan doğrulama: yalnızca tamamlanmış etkinlikte yer alanlar
CREATE OR REPLACE FUNCTION validate_rating() RETURNS TRIGGER AS $$
DECLARE
    v_status event_status;
BEGIN
    SELECT status INTO v_status FROM events WHERE id = NEW.event_id;
    IF v_status IS DISTINCT FROM 'tamamlandi' THEN
        RAISE EXCEPTION 'Puanlama yalnızca tamamlanmış etkinlikler için yapılabilir';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM participants WHERE event_id = NEW.event_id AND user_id = NEW.rater_id
        UNION
        SELECT 1 FROM events WHERE id = NEW.event_id AND organizer_id = NEW.rater_id
    ) THEN
        RAISE EXCEPTION 'Yalnızca etkinlikte yer alanlar puan verebilir';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM participants WHERE event_id = NEW.event_id AND user_id = NEW.rated_id
        UNION
        SELECT 1 FROM events WHERE id = NEW.event_id AND organizer_id = NEW.rated_id
    ) THEN
        RAISE EXCEPTION 'Puanlanan kişi bu etkinlikte yer almamış';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_rating_validate
BEFORE INSERT ON ratings
FOR EACH ROW EXECUTE FUNCTION validate_rating();

-- (G) Yoklama işaretlenince güvenilirlik sayaçlarını güncelle
CREATE OR REPLACE FUNCTION on_attendance_change() RETURNS TRIGGER AS $$
BEGIN
    -- Eski değeri geri al
    IF OLD.attendance = 'katildi' THEN
        UPDATE users SET events_joined = events_joined - 1 WHERE id = NEW.user_id;
    ELSIF OLD.attendance = 'gelmedi' THEN
        UPDATE users SET no_show_count = no_show_count - 1 WHERE id = NEW.user_id;
    END IF;
    -- Yeni değeri işle
    IF NEW.attendance = 'katildi' THEN
        UPDATE users SET events_joined = events_joined + 1 WHERE id = NEW.user_id;
    ELSIF NEW.attendance = 'gelmedi' THEN
        UPDATE users SET no_show_count = no_show_count + 1 WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_attendance_change
AFTER UPDATE OF attendance ON participants
FOR EACH ROW
WHEN (OLD.attendance IS DISTINCT FROM NEW.attendance)
EXECUTE FUNCTION on_attendance_change();

-- ============================================================
--  İNDEKSLER (liste ekranları ve sohbet için)
-- ============================================================
CREATE INDEX idx_events_city_status_date ON events (city_id, status, event_date);
CREATE INDEX idx_events_organizer        ON events (organizer_id);
CREATE INDEX idx_events_category         ON events (category_id);
CREATE INDEX idx_applications_event      ON applications (event_id, status);
CREATE INDEX idx_applications_applicant  ON applications (applicant_id);
CREATE INDEX idx_participants_user       ON participants (user_id);
CREATE INDEX idx_messages_conversation   ON messages (conversation_id, id DESC);
CREATE INDEX idx_conversations_event     ON conversations (event_id);
CREATE INDEX idx_notifications_user      ON notifications (user_id, is_read, created_at DESC);

-- ============================================================
--  GÖRÜNÜM: Ana ekrandaki "açık etkinlikler" listesi
-- ============================================================
CREATE VIEW v_open_events AS
SELECT e.id, e.title, e.event_date, e.venue_name, e.price_per_person,
       e.skill_level, e.needed_count, e.filled_count,
       (e.needed_count - e.filled_count)          AS remaining_slots,   -- kalan boş yer
       c.name                                     AS category_name,
       ci.name                                    AS city_name,
       u.id                                       AS organizer_id,
       u.username                                 AS organizer_username,
       u.rating_avg                               AS organizer_rating,
       u.reliability_pct                          AS organizer_reliability
FROM events e
JOIN users      u  ON u.id  = e.organizer_id
JOIN categories c  ON c.id  = e.category_id
JOIN cities     ci ON ci.id = e.city_id
WHERE e.status = 'acik'
ORDER BY e.event_date;

-- ============================================================
--  BAŞLANGIÇ VERİLERİ
-- ============================================================
-- !!! Aşağıdaki 4 ili kendi illerinizle güncelleyin !!!
INSERT INTO cities (name) VALUES
    ('Ankara'), ('İstanbul'), ('İzmir'), ('Bursa');

INSERT INTO categories (name, icon) VALUES
    ('Halı Saha', '⚽'),
    ('Basketbol', '🏀'),
    ('Voleybol',  '🏐'),
    ('Tenis',     '🎾'),
    ('Diğer',     '📌');

-- ============================================================
--  NOTLAR / YAPILACAKLAR
-- ============================================================
-- 1. Zamanlanmış görev (pg_cron veya backend cron):
--    - event_date geçen 'acik'/'doldu' etkinlikleri 'tamamlandi' yap,
--    - etkinlikten 24 saat sonra katılımcılara "puanla" bildirimi gönder.
-- 2. Uygulama katmanı: mesaj gönderme yetkisi (yalnızca sohbet üyeleri),
--    etkinlik iptalinde katılımcılara bildirim.
-- 3. Supabase kullanılırsa: RLS (satır seviyesi güvenlik) politikaları
--    eklenmelidir; sohbet için Supabase Realtime, messages tablosuna
--    abone olunarak kullanılır.
-- 4. KVKK: telefon/e-posta kişisel veridir; açık rıza metni ve veri
--    silme (hesap kapatma) akışını unutmayın.
