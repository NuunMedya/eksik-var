-- ============================================================
--  EKSİK VAR — SUPABASE KURULUM (tek dosya)
--  Supabase > SQL Editor > New query'ye yapıştırıp Run'a basın.
--  İçerik: ana şema (Supabase Auth'a uyarlı) + iletişim tercihleri
--  + otomatik profil + satır güvenliği (RLS) + gerçek zamanlı yayın
-- ============================================================
BEGIN;

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
    id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,  -- Supabase Auth kullanıcısı
    phone            VARCHAR(20)  UNIQUE,
    email            VARCHAR(255) UNIQUE,
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

-- ============================================================
--  EKSİK VAR — 2. migrasyon: İletişim tercihleri + aramalar
--  Mevcut şemanın (eksik_var_schema.sql) üzerine çalıştırılır.
--  Uygulamadaki kurallarla birebir aynı mantık sunucuda da
--  uygulanır; böylece ayarlar istemci tarafında atlatılamaz.
-- ============================================================

-- 1) Enum tipleri
CREATE TYPE contact_mode  AS ENUM ('ikisi', 'mesaj', 'arama');   -- sana nasıl ulaşılsın?
CREATE TYPE contact_scope AS ENUM ('herkes', 'kadro');           -- kimler ulaşabilir?
CREATE TYPE call_status   AS ENUM ('araniyor', 'cevaplandi', 'cevapsiz', 'reddedildi', 'engellendi');

-- 2) Kullanıcı tercihleri
ALTER TABLE users
    ADD COLUMN contact_mode     contact_mode  NOT NULL DEFAULT 'ikisi',
    ADD COLUMN contact_scope    contact_scope NOT NULL DEFAULT 'herkes',
    ADD COLUMN quiet_enabled    BOOLEAN       NOT NULL DEFAULT FALSE,
    ADD COLUMN quiet_start      TIME          NOT NULL DEFAULT '22:00',
    ADD COLUMN quiet_end        TIME          NOT NULL DEFAULT '08:00',
    ADD COLUMN notif_basvuru    BOOLEAN       NOT NULL DEFAULT TRUE,
    ADD COLUMN notif_mesaj      BOOLEAN       NOT NULL DEFAULT TRUE,
    ADD COLUMN notif_hatirlatma BOOLEAN       NOT NULL DEFAULT TRUE;

-- 3) Arama kayıtları (numaralar hiç saklanmaz; aramalar uygulama içi)
CREATE TABLE calls (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    caller_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callee_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       call_status NOT NULL DEFAULT 'araniyor',
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    answered_at  TIMESTAMPTZ,
    ended_at     TIMESTAMPTZ,
    CHECK (caller_id <> callee_id)
);
CREATE INDEX idx_calls_callee ON calls (callee_id, started_at DESC);
CREATE INDEX idx_calls_caller ON calls (caller_id, started_at DESC);

-- 4) Yardımcı: aynı kadroda mıyız? (ortak etkinlikte katılımcı/organizatör)
CREATE OR REPLACE FUNCTION shares_squad(p_a UUID, p_b UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT EXISTS (
        SELECT 1
        FROM (
            SELECT event_id, user_id FROM participants
            UNION
            SELECT id AS event_id, organizer_id AS user_id FROM events
        ) m1
        JOIN (
            SELECT event_id, user_id FROM participants
            UNION
            SELECT id AS event_id, organizer_id AS user_id FROM events
        ) m2 ON m1.event_id = m2.event_id
        WHERE m1.user_id = p_a AND m2.user_id = p_b
    );
$$;

-- 5) Yardımcı: sessiz saatlerde mi? (gece yarısını aşan aralıkları da destekler)
CREATE OR REPLACE FUNCTION in_quiet_hours(p_user UUID, p_now TIME DEFAULT localtime)
RETURNS BOOLEAN LANGUAGE sql STABLE AS $$
    SELECT COALESCE((
        SELECT quiet_enabled AND (
            CASE WHEN quiet_start <= quiet_end
                 THEN p_now >= quiet_start AND p_now < quiet_end
                 ELSE p_now >= quiet_start OR  p_now < quiet_end
            END)
        FROM users WHERE id = p_user
    ), FALSE);
$$;

-- 6) İzin kontrolü: p_caller, p_callee'yi arayabilir mi?
CREATE OR REPLACE FUNCTION can_call(p_caller UUID, p_callee UUID)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE u users%ROWTYPE;
BEGIN
    SELECT * INTO u FROM users WHERE id = p_callee;
    IF NOT FOUND OR p_caller = p_callee THEN RETURN FALSE; END IF;
    -- engel her iki yönde de keser
    IF EXISTS (SELECT 1 FROM blocks
               WHERE (blocker_id = p_callee AND blocked_id = p_caller)
                  OR (blocker_id = p_caller AND blocked_id = p_callee)) THEN RETURN FALSE; END IF;
    IF u.contact_mode = 'mesaj' THEN RETURN FALSE; END IF;
    IF u.contact_scope = 'kadro' AND NOT shares_squad(p_caller, p_callee) THEN RETURN FALSE; END IF;
    IF in_quiet_hours(p_callee) THEN RETURN FALSE; END IF;
    RETURN TRUE;
END $$;

-- 7) İzin kontrolü: birebir mesaj gönderilebilir mi?
--    p_application_chat = TRUE ise (organizatörün açık talebine başvuru) kapsam kısıtı uygulanmaz.
CREATE OR REPLACE FUNCTION can_message(p_sender UUID, p_receiver UUID, p_application_chat BOOLEAN DEFAULT FALSE)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE AS $$
DECLARE u users%ROWTYPE;
BEGIN
    SELECT * INTO u FROM users WHERE id = p_receiver;
    IF NOT FOUND OR p_sender = p_receiver THEN RETURN FALSE; END IF;
    IF EXISTS (SELECT 1 FROM blocks
               WHERE (blocker_id = p_receiver AND blocked_id = p_sender)
                  OR (blocker_id = p_sender AND blocked_id = p_receiver)) THEN RETURN FALSE; END IF;
    IF u.contact_mode = 'arama' THEN RETURN FALSE; END IF;
    IF u.contact_scope = 'kadro' AND NOT p_application_chat AND NOT shares_squad(p_sender, p_receiver) THEN RETURN FALSE; END IF;
    RETURN TRUE;
END $$;

-- 8) Arama başlatılırken izin yoksa kayıt 'engellendi' olarak düşer, arama kurulmaz
CREATE OR REPLACE FUNCTION trg_calls_check()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NOT can_call(NEW.caller_id, NEW.callee_id) THEN
        NEW.status := 'engellendi';
        NEW.ended_at := now();
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER calls_check BEFORE INSERT ON calls
    FOR EACH ROW EXECUTE FUNCTION trg_calls_check();

-- 9) Arama geçmişi görünümü (sohbetteki "📞 Sesli arama · 2 dk" kaydı buradan beslenir)
CREATE VIEW v_call_log AS
SELECT c.id, c.caller_id, c.callee_id, c.status, c.started_at,
       CASE WHEN c.answered_at IS NOT NULL AND c.ended_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (c.ended_at - c.answered_at))::INT END AS duration_sec
FROM calls c;

-- ============================================================
--  SUPABASE KATMANI
--  a) Kayıt olan her Supabase kullanıcısı için otomatik profil
--  b) Trigger/yardımcı fonksiyonlar RLS'i güvenle aşar (SECURITY DEFINER)
--  c) Satır güvenliği (RLS): kim neyi görür / değiştirir
--  d) Mesaj gönderme izni sunucuda da denetlenir
--  e) Gerçek zamanlı yayın
-- ============================================================

-- a) Yeni kullanıcı → public.users profili
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base TEXT; uname TEXT; n INT := 0;
BEGIN
    base := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username',''),
                     split_part(COALESCE(NEW.email,''),'@',1), 'oyuncu');
    base := regexp_replace(translate(lower(base), 'çğıöşüâîû', 'cgiosuaiu'), '[^a-z0-9_]', '', 'g');
    IF base = '' THEN base := 'oyuncu'; END IF;
    uname := left(base, 30);
    WHILE EXISTS (SELECT 1 FROM users WHERE username = uname) LOOP
        n := n + 1; uname := left(base, 26) || n::text;
    END LOOP;
    INSERT INTO users (id, email, phone, username, full_name, city_id)
    VALUES (NEW.id, NEW.email, NULLIF(NEW.raw_user_meta_data->>'phone',''), uname,
            COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name',''), 'Yeni Oyuncu'),
            NULLIF(NEW.raw_user_meta_data->>'city_id','')::INT);
    RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- b) Trigger ve yardımcılar RLS'ten bağımsız çalışsın
ALTER FUNCTION set_updated_at()            SECURITY DEFINER SET search_path = public;
ALTER FUNCTION on_event_created()          SECURITY DEFINER SET search_path = public;
ALTER FUNCTION on_application_insert()     SECURITY DEFINER SET search_path = public;
ALTER FUNCTION on_application_approved()   SECURITY DEFINER SET search_path = public;
ALTER FUNCTION on_rating_change()          SECURITY DEFINER SET search_path = public;
ALTER FUNCTION validate_rating()           SECURITY DEFINER SET search_path = public;
ALTER FUNCTION on_attendance_change()      SECURITY DEFINER SET search_path = public;
ALTER FUNCTION shares_squad(UUID, UUID)    SECURITY DEFINER SET search_path = public;
ALTER FUNCTION in_quiet_hours(UUID, TIME)  SECURITY DEFINER SET search_path = public;
ALTER FUNCTION can_call(UUID, UUID)        SECURITY DEFINER SET search_path = public;
ALTER FUNCTION can_message(UUID, UUID, BOOLEAN) SECURITY DEFINER SET search_path = public;
ALTER FUNCTION trg_calls_check()           SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION is_conversation_member(p_conv UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = p_conv AND user_id = auth.uid());
$$;
CREATE OR REPLACE FUNCTION is_event_organizer(p_event UUID) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT EXISTS (SELECT 1 FROM events WHERE id = p_event AND organizer_id = auth.uid());
$$;

-- d) Birebir mesaj izni sunucuda da denetlenir (uygulama atlatılamaz)
CREATE OR REPLACE FUNCTION trg_message_permission() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c conversations%ROWTYPE; other UUID; is_app BOOLEAN;
BEGIN
    IF NEW.sender_id IS NULL THEN RETURN NEW; END IF;             -- sistem mesajı
    SELECT * INTO c FROM conversations WHERE id = NEW.conversation_id;
    IF c.type = 'birebir' THEN
        SELECT user_id INTO other FROM conversation_members
         WHERE conversation_id = c.id AND user_id <> NEW.sender_id LIMIT 1;
        SELECT EXISTS (SELECT 1 FROM applications WHERE conversation_id = c.id) INTO is_app;
        IF other IS NOT NULL AND NOT can_message(NEW.sender_id, other, is_app) THEN
            RAISE EXCEPTION 'MESAJ_IZNI_YOK' USING HINT = 'Alıcının iletişim tercihleri bu mesaja izin vermiyor';
        END IF;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER messages_permission BEFORE INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION trg_message_permission();

-- c) Satır güvenliği
ALTER TABLE cities               ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages             ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls                ENABLE ROW LEVEL SECURITY;

-- Herkese açık başvuru verileri
CREATE POLICY cities_read     ON cities     FOR SELECT USING (true);
CREATE POLICY categories_read ON categories FOR SELECT USING (true);

-- Profiller: uygulama içinde herkes görür, herkes yalnızca kendini düzenler
CREATE POLICY users_read       ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY users_update_own ON users FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Etkinlikler: herkes görür, organizatör yönetir
CREATE POLICY events_read       ON events FOR SELECT TO authenticated USING (true);
CREATE POLICY events_insert_own ON events FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid());
CREATE POLICY events_update_own ON events FOR UPDATE TO authenticated USING (organizer_id = auth.uid()) WITH CHECK (organizer_id = auth.uid());
CREATE POLICY events_delete_own ON events FOR DELETE TO authenticated USING (organizer_id = auth.uid());

-- Sohbetler: yalnızca üyeler görür
CREATE POLICY conversations_read_member ON conversations FOR SELECT TO authenticated USING (is_conversation_member(id));
CREATE POLICY conversations_insert_own  ON conversations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY members_read           ON conversation_members FOR SELECT TO authenticated USING (is_conversation_member(conversation_id));
CREATE POLICY members_insert_creator ON conversation_members FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.created_by = auth.uid()));
CREATE POLICY members_update_own     ON conversation_members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY members_delete         ON conversation_members FOR DELETE TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM conversations c JOIN events e ON e.id = c.event_id
                                           WHERE c.id = conversation_id AND e.organizer_id = auth.uid()));

-- Mesajlar: üyeler okur, kendi adına gönderir
CREATE POLICY messages_read       ON messages FOR SELECT TO authenticated USING (is_conversation_member(conversation_id));
CREATE POLICY messages_insert     ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND is_conversation_member(conversation_id));
CREATE POLICY messages_update_own ON messages FOR UPDATE TO authenticated USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());

-- Başvurular: başvuran ve organizatör
CREATE POLICY applications_read       ON applications FOR SELECT TO authenticated USING (applicant_id = auth.uid() OR is_event_organizer(event_id));
CREATE POLICY applications_insert_own ON applications FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid());
CREATE POLICY applications_update     ON applications FOR UPDATE TO authenticated
    USING (applicant_id = auth.uid() OR is_event_organizer(event_id))
    WITH CHECK (applicant_id = auth.uid() OR is_event_organizer(event_id));

-- Kadro: herkes görür; yoklamayı organizatör işaretler; ayrılma / çıkarma
CREATE POLICY participants_read             ON participants FOR SELECT TO authenticated USING (true);
CREATE POLICY participants_update_organizer ON participants FOR UPDATE TO authenticated USING (is_event_organizer(event_id)) WITH CHECK (is_event_organizer(event_id));
CREATE POLICY participants_delete           ON participants FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_event_organizer(event_id));

-- Puanlar, bildirimler, engeller, şikayetler, aramalar
CREATE POLICY ratings_read       ON ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY ratings_insert_own ON ratings FOR INSERT TO authenticated WITH CHECK (rater_id = auth.uid());
CREATE POLICY notifications_read_own   ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY notifications_update_own ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY blocks_own         ON blocks  FOR ALL    TO authenticated USING (blocker_id = auth.uid()) WITH CHECK (blocker_id = auth.uid());
CREATE POLICY reports_insert_own ON reports FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
CREATE POLICY reports_read_own   ON reports FOR SELECT TO authenticated USING (reporter_id = auth.uid());
CREATE POLICY calls_read_own     ON calls FOR SELECT TO authenticated USING (caller_id = auth.uid() OR callee_id = auth.uid());
CREATE POLICY calls_insert_own   ON calls FOR INSERT TO authenticated WITH CHECK (caller_id = auth.uid());
CREATE POLICY calls_update_parties ON calls FOR UPDATE TO authenticated
    USING (caller_id = auth.uid() OR callee_id = auth.uid()) WITH CHECK (caller_id = auth.uid() OR callee_id = auth.uid());

-- Görünümler de çağıranın yetkisiyle çalışsın
ALTER VIEW v_open_events SET (security_invoker = true);
ALTER VIEW v_call_log    SET (security_invoker = true);

-- e) Gerçek zamanlı yayın (mesajlar, başvurular, etkinlikler, üyelikler)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE messages, applications, events, conversation_members;
    END IF;
END $$;

-- ============================================================
--  EKSİK VAR — 3. migrasyon: Yoklama & güvenilirlik akışı
--  (participants.attendance + users sayaçları ana şemada hazır;
--   bu dosya iş akışını ve otomasyonu ekler)
-- ============================================================

-- a) Yoklama, etkinlik saatinden önce alınamaz
CREATE OR REPLACE FUNCTION trg_attendance_timing() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ed TIMESTAMPTZ;
BEGIN
    IF NEW.attendance = 'bekleniyor' THEN RETURN NEW; END IF;
    SELECT event_date INTO ed FROM events WHERE id = NEW.event_id;
    IF now() < ed THEN
        RAISE EXCEPTION 'YOKLAMA_ERKEN' USING HINT = 'Yoklama etkinlik saatinden sonra alınabilir';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER participants_attendance_timing BEFORE UPDATE OF attendance ON participants
    FOR EACH ROW EXECUTE FUNCTION trg_attendance_timing();

-- b) Maçı tamamla: organizatör (uygulamadan) ya da sistem (cron) çağırır
--    İşaretlenmeyenler iyi niyetle 'katıldı' sayılır; organizatör kendi maçına katılmış sayılır;
--    gruba sistem mesajı düşer; katılanlara puanlama bildirimi gider.
CREATE OR REPLACE FUNCTION complete_event(p_event UUID)
RETURNS TABLE (katildi INT, gelmedi INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; grp UUID; k INT; g INT;
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

    SELECT id INTO grp FROM conversations WHERE event_id = p_event AND type = 'grup';
    IF grp IS NOT NULL THEN
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (grp, NULL, 'sistem',
                format('Yoklama alındı: %s katıldı, %s gelmedi. Takım arkadaşlarını puanlayabilirsin.', k, g));
    END IF;

    INSERT INTO notifications (user_id, type, title, body, data)
    SELECT user_id, 'puanlama', e.title || ' tamamlandı', 'Takım arkadaşlarını puanla',
           jsonb_build_object('event_id', p_event)
      FROM participants WHERE event_id = p_event AND attendance = 'katildi';

    RETURN QUERY SELECT k, g;
END $$;

-- c) 48 saat içinde yoklama alınmazsa sistem tamamlar (kimse haksız yere cezalanmaz)
CREATE OR REPLACE FUNCTION auto_complete_events() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r RECORD; n INT := 0;
BEGIN
    FOR r IN SELECT id FROM events
              WHERE status IN ('acik', 'doldu') AND event_date < now() - INTERVAL '48 hours'
    LOOP
        PERFORM complete_event(r.id);
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;

-- d) Saat başı otomatik tamamlama (Supabase'de pg_cron eklentisi açıksa)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('eksikvar-yoklama-otomatik', '0 * * * *', 'SELECT auto_complete_events()');
    END IF;
END $$;

-- e) Güvenilirlik geçmişi (profil ekranı buradan okur)
CREATE VIEW v_attendance_history AS
SELECT p.user_id, e.id AS event_id, e.title, e.event_date, p.attendance
  FROM participants p JOIN events e ON e.id = p.event_id
 WHERE p.attendance <> 'bekleniyor';
ALTER VIEW v_attendance_history SET (security_invoker = true);

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

-- f) Data API yetkileri (Supabase 2026: yeni projelerde açıkça verilmeli;
--    satır bazında kim neyi görür sorusunu yukarıdaki RLS kuralları belirler)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON cities, categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;
