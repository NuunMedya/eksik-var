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
-- (il tohumu: 5. bölümde 81 il + 973 ilçe olarak yükleniyor)

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

-- ============================================================
--  EKSİK VAR — 5. migrasyon: Türkiye çapı il/ilçe (81 il, 973 ilçe)
--  cities.id = plaka kodu · districts.id = resmi ilçe kimliği
-- ============================================================
INSERT INTO cities (id, name) VALUES
    (1, 'Adana'),
    (2, 'Adıyaman'),
    (3, 'Afyonkarahisar'),
    (4, 'Ağrı'),
    (5, 'Amasya'),
    (6, 'Ankara'),
    (7, 'Antalya'),
    (8, 'Artvin'),
    (9, 'Aydın'),
    (10, 'Balıkesir'),
    (11, 'Bilecik'),
    (12, 'Bingöl'),
    (13, 'Bitlis'),
    (14, 'Bolu'),
    (15, 'Burdur'),
    (16, 'Bursa'),
    (17, 'Çanakkale'),
    (18, 'Çankırı'),
    (19, 'Çorum'),
    (20, 'Denizli'),
    (21, 'Diyarbakır'),
    (22, 'Edirne'),
    (23, 'Elazığ'),
    (24, 'Erzincan'),
    (25, 'Erzurum'),
    (26, 'Eskişehir'),
    (27, 'Gaziantep'),
    (28, 'Giresun'),
    (29, 'Gümüşhane'),
    (30, 'Hakkari'),
    (31, 'Hatay'),
    (32, 'Isparta'),
    (33, 'Mersin'),
    (34, 'İstanbul'),
    (35, 'İzmir'),
    (36, 'Kars'),
    (37, 'Kastamonu'),
    (38, 'Kayseri'),
    (39, 'Kırklareli'),
    (40, 'Kırşehir'),
    (41, 'Kocaeli'),
    (42, 'Konya'),
    (43, 'Kütahya'),
    (44, 'Malatya'),
    (45, 'Manisa'),
    (46, 'Kahramanmaraş'),
    (47, 'Mardin'),
    (48, 'Muğla'),
    (49, 'Muş'),
    (50, 'Nevşehir'),
    (51, 'Niğde'),
    (52, 'Ordu'),
    (53, 'Rize'),
    (54, 'Sakarya'),
    (55, 'Samsun'),
    (56, 'Siirt'),
    (57, 'Sinop'),
    (58, 'Sivas'),
    (59, 'Tekirdağ'),
    (60, 'Tokat'),
    (61, 'Trabzon'),
    (62, 'Tunceli'),
    (63, 'Şanlıurfa'),
    (64, 'Uşak'),
    (65, 'Van'),
    (66, 'Yozgat'),
    (67, 'Zonguldak'),
    (68, 'Aksaray'),
    (69, 'Bayburt'),
    (70, 'Karaman'),
    (71, 'Kırıkkale'),
    (72, 'Batman'),
    (73, 'Şırnak'),
    (74, 'Bartın'),
    (75, 'Ardahan'),
    (76, 'Iğdır'),
    (77, 'Yalova'),
    (78, 'Karabük'),
    (79, 'Kilis'),
    (80, 'Osmaniye'),
    (81, 'Düzce');
SELECT setval(pg_get_serial_sequence('cities','id'), (SELECT max(id) FROM cities));

CREATE TABLE districts (
    id      INT PRIMARY KEY,
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name    VARCHAR(60) NOT NULL,
    UNIQUE (city_id, name)
);
INSERT INTO districts (id, city_id, name) VALUES
    (1757, 1, 'Aladağ'),
    (1219, 1, 'Ceyhan'),
    (2033, 1, 'Çukurova'),
    (1329, 1, 'Feke'),
    (1806, 1, 'İmamoğlu'),
    (1437, 1, 'Karaisalı'),
    (1443, 1, 'Karataş'),
    (1486, 1, 'Kozan'),
    (1580, 1, 'Pozantı'),
    (1588, 1, 'Saimbeyli'),
    (2032, 1, 'Sarıçam'),
    (1104, 1, 'Seyhan'),
    (1687, 1, 'Tufanbeyli'),
    (1734, 1, 'Yumurtalık'),
    (1748, 1, 'Yüreğir'),
    (1182, 2, 'Besni'),
    (1246, 2, 'Çelikhan'),
    (1347, 2, 'Gerger'),
    (1354, 2, 'Gölbaşı'),
    (1425, 2, 'Kahta'),
    (1105, 2, 'Merkez'),
    (1592, 2, 'Samsat'),
    (1985, 2, 'Sincik'),
    (1989, 2, 'Tut'),
    (1771, 3, 'Başmakçı'),
    (1773, 3, 'Bayat'),
    (1200, 3, 'Bolvadin'),
    (1239, 3, 'Çay'),
    (1906, 3, 'Çobanlar'),
    (1267, 3, 'Dazkırı'),
    (1281, 3, 'Dinar'),
    (1306, 3, 'Emirdağ'),
    (1923, 3, 'Evciler'),
    (1944, 3, 'Hocalar'),
    (1404, 3, 'İhsaniye'),
    (1809, 3, 'İscehisar'),
    (1961, 3, 'Kızılören'),
    (1108, 3, 'Merkez'),
    (1594, 3, 'Sandıklı'),
    (1626, 3, 'Sinanpaşa'),
    (1639, 3, 'Sultandağı'),
    (1664, 3, 'Şuhut'),
    (1283, 4, 'Diyadin'),
    (1287, 4, 'Doğubayazıt'),
    (1301, 4, 'Eleşkirt'),
    (1379, 4, 'Hamur'),
    (1111, 4, 'Merkez'),
    (1568, 4, 'Patnos'),
    (1667, 4, 'Taşlıçay'),
    (1691, 4, 'Tutak'),
    (1363, 5, 'Göynücek'),
    (1368, 5, 'Gümüşhacıköy'),
    (1938, 5, 'Hamamözü'),
    (1134, 5, 'Merkez'),
    (1524, 5, 'Merzifon'),
    (1641, 5, 'Suluova'),
    (1668, 5, 'Taşova'),
    (1872, 6, 'Akyurt'),
    (1130, 6, 'Altındağ'),
    (1157, 6, 'Ayaş'),
    (1167, 6, 'Bala'),
    (1187, 6, 'Beypazarı'),
    (1227, 6, 'Çamlıdere'),
    (1231, 6, 'Çankaya'),
    (1260, 6, 'Çubuk'),
    (1302, 6, 'Elmadağ'),
    (1922, 6, 'Etimesgut'),
    (1924, 6, 'Evren'),
    (1744, 6, 'Gölbaşı'),
    (1365, 6, 'Güdül'),
    (1387, 6, 'Haymana'),
    (1815, 6, 'Kahramankazan'),
    (1427, 6, 'Kalecik'),
    (1745, 6, 'Keçiören'),
    (1473, 6, 'Kızılcahamam'),
    (1746, 6, 'Mamak'),
    (1539, 6, 'Nallıhan'),
    (1578, 6, 'Polatlı'),
    (2034, 6, 'Pursaklar'),
    (1747, 6, 'Sincan'),
    (1658, 6, 'Şereflikoçhisar'),
    (1723, 6, 'Yenimahalle'),
    (1121, 7, 'Akseki'),
    (2035, 7, 'Aksu'),
    (1126, 7, 'Alanya'),
    (1811, 7, 'Demre'),
    (2036, 7, 'Döşemealtı'),
    (1303, 7, 'Elmalı'),
    (1333, 7, 'Finike'),
    (1337, 7, 'Gazipaşa'),
    (1370, 7, 'Gündoğmuş'),
    (1946, 7, 'İbradı'),
    (1451, 7, 'Kaş'),
    (1959, 7, 'Kemer'),
    (2037, 7, 'Kepez'),
    (2038, 7, 'Konyaaltı'),
    (1483, 7, 'Korkuteli'),
    (1492, 7, 'Kumluca'),
    (1512, 7, 'Manavgat'),
    (2039, 7, 'Muratpaşa'),
    (1616, 7, 'Serik'),
    (1145, 8, 'Ardanuç'),
    (1147, 8, 'Arhavi'),
    (1202, 8, 'Borçka'),
    (1395, 8, 'Hopa'),
    (2105, 8, 'Kemalpaşa'),
    (1152, 8, 'Merkez'),
    (1828, 8, 'Murgul'),
    (1653, 8, 'Şavşat'),
    (1736, 8, 'Yusufeli'),
    (1206, 9, 'Bozdoğan'),
    (1781, 9, 'Buharkent'),
    (1256, 9, 'Çine'),
    (2000, 9, 'Didim'),
    (2076, 9, 'Efeler'),
    (1348, 9, 'Germencik'),
    (1807, 9, 'İncirliova'),
    (1435, 9, 'Karacasu'),
    (1957, 9, 'Karpuzlu'),
    (1479, 9, 'Koçarlı'),
    (1968, 9, 'Köşk'),
    (1497, 9, 'Kuşadası'),
    (1498, 9, 'Kuyucak'),
    (1542, 9, 'Nazilli'),
    (1637, 9, 'Söke'),
    (1640, 9, 'Sultanhisar'),
    (1724, 9, 'Yenipazar'),
    (2077, 10, 'Altıeylül'),
    (1161, 10, 'Ayvalık'),
    (1169, 10, 'Balya'),
    (1171, 10, 'Bandırma'),
    (1191, 10, 'Bigadiç'),
    (1216, 10, 'Burhaniye'),
    (1291, 10, 'Dursunbey'),
    (1294, 10, 'Edremit'),
    (1310, 10, 'Erdek'),
    (1928, 10, 'Gömeç'),
    (1360, 10, 'Gönen'),
    (1384, 10, 'Havran'),
    (1418, 10, 'İvrindi'),
    (2078, 10, 'Karesi'),
    (1462, 10, 'Kepsut'),
    (1514, 10, 'Manyas'),
    (1824, 10, 'Marmara'),
    (1608, 10, 'Savaştepe'),
    (1619, 10, 'Sındırgı'),
    (1644, 10, 'Susurluk'),
    (1210, 11, 'Bozüyük'),
    (1359, 11, 'Gölpazarı'),
    (1948, 11, 'İnhisar'),
    (1192, 11, 'Merkez'),
    (1559, 11, 'Osmaneli'),
    (1571, 11, 'Pazaryeri'),
    (1636, 11, 'Söğüt'),
    (1857, 11, 'Yenipazar'),
    (1750, 12, 'Adaklı'),
    (1344, 12, 'Genç'),
    (1446, 12, 'Karlıova'),
    (1475, 12, 'Kiğı'),
    (1193, 12, 'Merkez'),
    (1633, 12, 'Solhan'),
    (1855, 12, 'Yayladere'),
    (1996, 12, 'Yedisu'),
    (1106, 13, 'Adilcevaz'),
    (1112, 13, 'Ahlat'),
    (1798, 13, 'Güroymak'),
    (1394, 13, 'Hizan'),
    (1196, 13, 'Merkez'),
    (1537, 13, 'Mutki'),
    (1669, 13, 'Tatvan'),
    (1916, 14, 'Dörtdivan'),
    (1346, 14, 'Gerede'),
    (1364, 14, 'Göynük'),
    (1466, 14, 'Kıbrıscık'),
    (1522, 14, 'Mengen'),
    (1199, 14, 'Merkez'),
    (1531, 14, 'Mudurnu'),
    (1610, 14, 'Seben'),
    (1997, 14, 'Yeniçağa'),
    (1109, 15, 'Ağlasun'),
    (1874, 15, 'Altınyayla'),
    (1211, 15, 'Bucak'),
    (1899, 15, 'Çavdır'),
    (1903, 15, 'Çeltikçi'),
    (1357, 15, 'Gölhisar'),
    (1813, 15, 'Karamanlı'),
    (1816, 15, 'Kemer'),
    (1215, 15, 'Merkez'),
    (1672, 15, 'Tefenni'),
    (1728, 15, 'Yeşilova'),
    (1783, 16, 'Büyükorhan'),
    (1343, 16, 'Gemlik'),
    (1935, 16, 'Gürsu'),
    (1799, 16, 'Harmancık'),
    (1411, 16, 'İnegöl'),
    (1420, 16, 'İznik'),
    (1434, 16, 'Karacabey'),
    (1457, 16, 'Keles'),
    (1960, 16, 'Kestel'),
    (1530, 16, 'Mudanya'),
    (1535, 16, 'Mustafakemalpaşa'),
    (1829, 16, 'Nilüfer'),
    (1553, 16, 'Orhaneli'),
    (1554, 16, 'Orhangazi'),
    (1832, 16, 'Osmangazi'),
    (1725, 16, 'Yenişehir'),
    (1859, 16, 'Yıldırım'),
    (1160, 17, 'Ayvacık'),
    (1180, 17, 'Bayramiç'),
    (1190, 17, 'Biga'),
    (1205, 17, 'Bozcaada'),
    (1229, 17, 'Çan'),
    (1293, 17, 'Eceabat'),
    (1326, 17, 'Ezine'),
    (1340, 17, 'Gelibolu'),
    (1408, 17, 'Gökçeada'),
    (1503, 17, 'Lapseki'),
    (1230, 17, 'Merkez'),
    (1722, 17, 'Yenice'),
    (1765, 18, 'Atkaracalar'),
    (1885, 18, 'Bayramören'),
    (1248, 18, 'Çerkeş'),
    (1300, 18, 'Eldivan'),
    (1399, 18, 'Ilgaz'),
    (1817, 18, 'Kızılırmak'),
    (1963, 18, 'Korgun'),
    (1494, 18, 'Kurşunlu'),
    (1232, 18, 'Merkez'),
    (1555, 18, 'Orta'),
    (1649, 18, 'Şabanözü'),
    (1718, 18, 'Yapraklı'),
    (1124, 19, 'Alaca'),
    (1177, 19, 'Bayat'),
    (1778, 19, 'Boğazkale'),
    (1911, 19, 'Dodurga'),
    (1414, 19, 'İskilip'),
    (1445, 19, 'Kargı'),
    (1972, 19, 'Laçin'),
    (1520, 19, 'Mecitözü'),
    (1259, 19, 'Merkez'),
    (1976, 19, 'Oğuzlar'),
    (1556, 19, 'Ortaköy'),
    (1558, 19, 'Osmancık'),
    (1642, 19, 'Sungurlu'),
    (1850, 19, 'Uğurludağ'),
    (1102, 20, 'Acıpayam'),
    (1769, 20, 'Babadağ'),
    (1881, 20, 'Baklan'),
    (1774, 20, 'Bekilli'),
    (1888, 20, 'Beyağaç'),
    (1889, 20, 'Bozkurt'),
    (1214, 20, 'Buldan'),
    (1224, 20, 'Çal'),
    (1226, 20, 'Çameli'),
    (1233, 20, 'Çardak'),
    (1257, 20, 'Çivril'),
    (1371, 20, 'Güney'),
    (1803, 20, 'Honaz'),
    (1426, 20, 'Kale'),
    (2079, 20, 'Merkezefendi'),
    (1871, 20, 'Pamukkale'),
    (1597, 20, 'Sarayköy'),
    (1840, 20, 'Serinhisar'),
    (1670, 20, 'Tavas'),
    (2040, 21, 'Bağlar'),
    (1195, 21, 'Bismil'),
    (1249, 21, 'Çermik'),
    (1253, 21, 'Çınar'),
    (1263, 21, 'Çüngüş'),
    (1278, 21, 'Dicle'),
    (1791, 21, 'Eğil'),
    (1315, 21, 'Ergani'),
    (1381, 21, 'Hani'),
    (1389, 21, 'Hazro'),
    (2041, 21, 'Kayapınar'),
    (1962, 21, 'Kocaköy'),
    (1490, 21, 'Kulp'),
    (1504, 21, 'Lice'),
    (1624, 21, 'Silvan'),
    (2042, 21, 'Sur'),
    (2043, 21, 'Yenişehir'),
    (1307, 22, 'Enez'),
    (1385, 22, 'Havsa'),
    (1412, 22, 'İpsala'),
    (1464, 22, 'Keşan'),
    (1502, 22, 'Lalapaşa'),
    (1523, 22, 'Meriç'),
    (1295, 22, 'Merkez'),
    (1988, 22, 'Süloğlu'),
    (1705, 22, 'Uzunköprü'),
    (1110, 23, 'Ağın'),
    (1873, 23, 'Alacakaya'),
    (1762, 23, 'Arıcak'),
    (1173, 23, 'Baskil'),
    (1438, 23, 'Karakoçan'),
    (1455, 23, 'Keban'),
    (1820, 23, 'Kovancılar'),
    (1506, 23, 'Maden'),
    (1298, 23, 'Merkez'),
    (1566, 23, 'Palu'),
    (1631, 23, 'Sivrice'),
    (1243, 24, 'Çayırlı'),
    (1406, 24, 'İliç'),
    (1459, 24, 'Kemah'),
    (1460, 24, 'Kemaliye'),
    (1318, 24, 'Merkez'),
    (1977, 24, 'Otlukbeli'),
    (1583, 24, 'Refahiye'),
    (1675, 24, 'Tercan'),
    (1853, 24, 'Üzümlü'),
    (1153, 25, 'Aşkale'),
    (1945, 25, 'Aziziye'),
    (1235, 25, 'Çat'),
    (1392, 25, 'Hınıs'),
    (1396, 25, 'Horasan'),
    (1416, 25, 'İspir'),
    (1812, 25, 'Karaçoban'),
    (1444, 25, 'Karayazı'),
    (1967, 25, 'Köprüköy'),
    (1540, 25, 'Narman'),
    (1550, 25, 'Oltu'),
    (1551, 25, 'Olur'),
    (2044, 25, 'Palandöken'),
    (1567, 25, 'Pasinler'),
    (1865, 25, 'Pazaryolu'),
    (1657, 25, 'Şenkaya'),
    (1674, 25, 'Tekman'),
    (1683, 25, 'Tortum'),
    (1851, 25, 'Uzundere'),
    (2045, 25, 'Yakutiye'),
    (1759, 26, 'Alpu'),
    (1777, 26, 'Beylikova'),
    (1255, 26, 'Çifteler'),
    (1934, 26, 'Günyüzü'),
    (1939, 26, 'Han'),
    (1808, 26, 'İnönü'),
    (1508, 26, 'Mahmudiye'),
    (1973, 26, 'Mihalgazi'),
    (1527, 26, 'Mihalıççık'),
    (2046, 26, 'Odunpazarı'),
    (1599, 26, 'Sarıcakaya'),
    (1618, 26, 'Seyitgazi'),
    (1632, 26, 'Sivrihisar'),
    (2047, 26, 'Tepebaşı'),
    (1139, 27, 'Araban'),
    (1415, 27, 'İslahiye'),
    (1956, 27, 'Karkamış'),
    (1546, 27, 'Nizip'),
    (1974, 27, 'Nurdağı'),
    (1549, 27, 'Oğuzeli'),
    (1841, 27, 'Şahinbey'),
    (1844, 27, 'Şehitkamil'),
    (1720, 27, 'Yavuzeli'),
    (1133, 28, 'Alucra'),
    (1212, 28, 'Bulancak'),
    (1893, 28, 'Çamoluk'),
    (1894, 28, 'Çanakçı'),
    (1272, 28, 'Dereli'),
    (1912, 28, 'Doğankent'),
    (1320, 28, 'Espiye'),
    (1324, 28, 'Eynesil'),
    (1361, 28, 'Görele'),
    (1930, 28, 'Güce'),
    (1465, 28, 'Keşap'),
    (1352, 28, 'Merkez'),
    (1837, 28, 'Piraziz'),
    (1654, 28, 'Şebinkarahisar'),
    (1678, 28, 'Tirebolu'),
    (1854, 28, 'Yağlıdere'),
    (1458, 29, 'Kelkit'),
    (1822, 29, 'Köse'),
    (1971, 29, 'Kürtün'),
    (1369, 29, 'Merkez'),
    (1660, 29, 'Şiran'),
    (1684, 29, 'Torul'),
    (1261, 30, 'Çukurca'),
    (2107, 30, 'Derecik'),
    (1377, 30, 'Merkez'),
    (1656, 30, 'Şemdinli'),
    (1737, 30, 'Yüksekova'),
    (1131, 31, 'Altınözü'),
    (2080, 31, 'Antakya'),
    (2081, 31, 'Arsuz'),
    (1887, 31, 'Belen'),
    (2082, 31, 'Defne'),
    (1289, 31, 'Dörtyol'),
    (1792, 31, 'Erzin'),
    (1382, 31, 'Hassa'),
    (1413, 31, 'İskenderun'),
    (1468, 31, 'Kırıkhan'),
    (1970, 31, 'Kumlu'),
    (2083, 31, 'Payas'),
    (1585, 31, 'Reyhanlı'),
    (1591, 31, 'Samandağ'),
    (1721, 31, 'Yayladağı'),
    (1755, 32, 'Aksu'),
    (1154, 32, 'Atabey'),
    (1297, 32, 'Eğirdir'),
    (1341, 32, 'Gelendost'),
    (1929, 32, 'Gönen'),
    (1456, 32, 'Keçiborlu'),
    (1401, 32, 'Merkez'),
    (1615, 32, 'Senirkent'),
    (1648, 32, 'Sütçüler'),
    (1651, 32, 'Şarkikaraağaç'),
    (1699, 32, 'Uluborlu'),
    (1717, 32, 'Yalvaç'),
    (2001, 32, 'Yenişarbademli'),
    (2064, 33, 'Akdeniz'),
    (1135, 33, 'Anamur'),
    (1766, 33, 'Aydıncık'),
    (1779, 33, 'Bozyazı'),
    (1892, 33, 'Çamlıyayla'),
    (1311, 33, 'Erdemli'),
    (1366, 33, 'Gülnar'),
    (2065, 33, 'Mezitli'),
    (1536, 33, 'Mut'),
    (1621, 33, 'Silifke'),
    (1665, 33, 'Tarsus'),
    (2066, 33, 'Toroslar'),
    (2067, 33, 'Yenişehir'),
    (1103, 34, 'Adalar'),
    (2048, 34, 'Arnavutköy'),
    (2049, 34, 'Ataşehir'),
    (2003, 34, 'Avcılar'),
    (2004, 34, 'Bağcılar'),
    (2005, 34, 'Bahçelievler'),
    (1166, 34, 'Bakırköy'),
    (2050, 34, 'Başakşehir'),
    (1886, 34, 'Bayrampaşa'),
    (1183, 34, 'Beşiktaş'),
    (1185, 34, 'Beykoz'),
    (2051, 34, 'Beylikdüzü'),
    (1186, 34, 'Beyoğlu'),
    (1782, 34, 'Büyükçekmece'),
    (1237, 34, 'Çatalca'),
    (2052, 34, 'Çekmeköy'),
    (2016, 34, 'Esenler'),
    (2053, 34, 'Esenyurt'),
    (1325, 34, 'Eyüpsultan'),
    (1327, 34, 'Fatih'),
    (1336, 34, 'Gaziosmanpaşa'),
    (2010, 34, 'Güngören'),
    (1421, 34, 'Kadıköy'),
    (1810, 34, 'Kağıthane'),
    (1449, 34, 'Kartal'),
    (1823, 34, 'Küçükçekmece'),
    (2012, 34, 'Maltepe'),
    (1835, 34, 'Pendik'),
    (2054, 34, 'Sancaktepe'),
    (1604, 34, 'Sarıyer'),
    (1622, 34, 'Silivri'),
    (2014, 34, 'Sultanbeyli'),
    (2055, 34, 'Sultangazi'),
    (1659, 34, 'Şile'),
    (1663, 34, 'Şişli'),
    (2015, 34, 'Tuzla'),
    (1852, 34, 'Ümraniye'),
    (1708, 34, 'Üsküdar'),
    (1739, 34, 'Zeytinburnu'),
    (1128, 35, 'Aliağa'),
    (2006, 35, 'Balçova'),
    (1178, 35, 'Bayındır'),
    (2056, 35, 'Bayraklı'),
    (1181, 35, 'Bergama'),
    (1776, 35, 'Beydağ'),
    (1203, 35, 'Bornova'),
    (1780, 35, 'Buca'),
    (1251, 35, 'Çeşme'),
    (2007, 35, 'Çiğli'),
    (1280, 35, 'Dikili'),
    (1334, 35, 'Foça'),
    (2009, 35, 'Gaziemir'),
    (2018, 35, 'Güzelbahçe'),
    (2057, 35, 'Karabağlar'),
    (1432, 35, 'Karaburun'),
    (1448, 35, 'Karşıyaka'),
    (1461, 35, 'Kemalpaşa'),
    (1467, 35, 'Kınık'),
    (1477, 35, 'Kiraz'),
    (1819, 35, 'Konak'),
    (1826, 35, 'Menderes'),
    (1521, 35, 'Menemen'),
    (2013, 35, 'Narlıdere'),
    (1563, 35, 'Ödemiş'),
    (1611, 35, 'Seferihisar'),
    (1612, 35, 'Selçuk'),
    (1677, 35, 'Tire'),
    (1682, 35, 'Torbalı'),
    (1703, 35, 'Urla'),
    (1756, 36, 'Akyaka'),
    (1149, 36, 'Arpaçay'),
    (1279, 36, 'Digor'),
    (1424, 36, 'Kağızman'),
    (1447, 36, 'Merkez'),
    (1601, 36, 'Sarıkamış'),
    (1614, 36, 'Selim'),
    (1645, 36, 'Susuz'),
    (1101, 37, 'Abana'),
    (1867, 37, 'Ağlı'),
    (1140, 37, 'Araç'),
    (1162, 37, 'Azdavay'),
    (1208, 37, 'Bozkurt'),
    (1221, 37, 'Cide'),
    (1238, 37, 'Çatalzeytin'),
    (1264, 37, 'Daday'),
    (1277, 37, 'Devrekani'),
    (1915, 37, 'Doğanyurt'),
    (1940, 37, 'Hanönü'),
    (1805, 37, 'İhsangazi'),
    (1410, 37, 'İnebolu'),
    (1499, 37, 'Küre'),
    (1450, 37, 'Merkez'),
    (1836, 37, 'Pınarbaşı'),
    (1984, 37, 'Seydiler'),
    (1845, 37, 'Şenpazar'),
    (1666, 37, 'Taşköprü'),
    (1685, 37, 'Tosya'),
    (1752, 38, 'Akkışla'),
    (1218, 38, 'Bünyan'),
    (1275, 38, 'Develi'),
    (1330, 38, 'Felahiye'),
    (1936, 38, 'Hacılar'),
    (1409, 38, 'İncesu'),
    (1863, 38, 'Kocasinan'),
    (1864, 38, 'Melikgazi'),
    (1978, 38, 'Özvatan'),
    (1576, 38, 'Pınarbaşı'),
    (1603, 38, 'Sarıoğlan'),
    (1605, 38, 'Sarız'),
    (1846, 38, 'Talas'),
    (1680, 38, 'Tomarza'),
    (1715, 38, 'Yahyalı'),
    (1727, 38, 'Yeşilhisar'),
    (1163, 39, 'Babaeski'),
    (1270, 39, 'Demirköy'),
    (1480, 39, 'Kofçaz'),
    (1505, 39, 'Lüleburgaz'),
    (1471, 39, 'Merkez'),
    (1572, 39, 'Pehlivanköy'),
    (1577, 39, 'Pınarhisar'),
    (1714, 39, 'Vize'),
    (1869, 40, 'Akçakent'),
    (1754, 40, 'Akpınar'),
    (1890, 40, 'Boztepe'),
    (1254, 40, 'Çiçekdağı'),
    (1429, 40, 'Kaman'),
    (1472, 40, 'Merkez'),
    (1529, 40, 'Mucur'),
    (2058, 41, 'Başiskele'),
    (2059, 41, 'Çayırova'),
    (2060, 41, 'Darıca'),
    (2030, 41, 'Derince'),
    (2061, 41, 'Dilovası'),
    (1338, 41, 'Gebze'),
    (1355, 41, 'Gölcük'),
    (2062, 41, 'İzmit'),
    (1430, 41, 'Kandıra'),
    (1440, 41, 'Karamürsel'),
    (2063, 41, 'Kartepe'),
    (1821, 41, 'Körfez'),
    (1868, 42, 'Ahırlı'),
    (1753, 42, 'Akören'),
    (1122, 42, 'Akşehir'),
    (1760, 42, 'Altınekin'),
    (1188, 42, 'Beyşehir'),
    (1207, 42, 'Bozkır'),
    (1222, 42, 'Cihanbeyli'),
    (1902, 42, 'Çeltik'),
    (1262, 42, 'Çumra'),
    (1907, 42, 'Derbent'),
    (1789, 42, 'Derebucak'),
    (1285, 42, 'Doğanhisar'),
    (1920, 42, 'Emirgazi'),
    (1312, 42, 'Ereğli'),
    (1933, 42, 'Güneysınır'),
    (1375, 42, 'Hadim'),
    (1937, 42, 'Halkapınar'),
    (1804, 42, 'Hüyük'),
    (1400, 42, 'Ilgın'),
    (1422, 42, 'Kadınhanı'),
    (1441, 42, 'Karapınar'),
    (1814, 42, 'Karatay'),
    (1491, 42, 'Kulu'),
    (1827, 42, 'Meram'),
    (1598, 42, 'Sarayönü'),
    (1839, 42, 'Selçuklu'),
    (1617, 42, 'Seydişehir'),
    (1848, 42, 'Taşkent'),
    (1990, 42, 'Tuzlukçu'),
    (1994, 42, 'Yalıhüyük'),
    (1735, 42, 'Yunak'),
    (1132, 43, 'Altıntaş'),
    (1764, 43, 'Aslanapa'),
    (1898, 43, 'Çavdarhisar'),
    (1288, 43, 'Domaniç'),
    (1790, 43, 'Dumlupınar'),
    (1304, 43, 'Emet'),
    (1339, 43, 'Gediz'),
    (1802, 43, 'Hisarcık'),
    (1500, 43, 'Merkez'),
    (1979, 43, 'Pazarlar'),
    (1625, 43, 'Simav'),
    (1843, 43, 'Şaphane'),
    (1671, 43, 'Tavşanlı'),
    (1114, 44, 'Akçadağ'),
    (1143, 44, 'Arapgir'),
    (1148, 44, 'Arguvan'),
    (1772, 44, 'Battalgazi'),
    (1265, 44, 'Darende'),
    (1286, 44, 'Doğanşehir'),
    (1914, 44, 'Doğanyol'),
    (1390, 44, 'Hekimhan'),
    (1953, 44, 'Kale'),
    (1969, 44, 'Kuluncak'),
    (1582, 44, 'Pütürge'),
    (1995, 44, 'Yazıhan'),
    (1729, 44, 'Yeşilyurt'),
    (1751, 45, 'Ahmetli'),
    (1118, 45, 'Akhisar'),
    (1127, 45, 'Alaşehir'),
    (1269, 45, 'Demirci'),
    (1793, 45, 'Gölmarmara'),
    (1362, 45, 'Gördes'),
    (1470, 45, 'Kırkağaç'),
    (1965, 45, 'Köprübaşı'),
    (1489, 45, 'Kula'),
    (1590, 45, 'Salihli'),
    (1600, 45, 'Sarıgöl'),
    (1606, 45, 'Saruhanlı'),
    (1613, 45, 'Selendi'),
    (1634, 45, 'Soma'),
    (2086, 45, 'Şehzadeler'),
    (1689, 45, 'Turgutlu'),
    (2087, 45, 'Yunusemre'),
    (1107, 46, 'Afşin'),
    (1136, 46, 'Andırın'),
    (1785, 46, 'Çağlayancerit'),
    (2084, 46, 'Dulkadiroğlu'),
    (1919, 46, 'Ekinözü'),
    (1299, 46, 'Elbistan'),
    (1353, 46, 'Göksun'),
    (1975, 46, 'Nurhak'),
    (2085, 46, 'Onikişubat'),
    (1570, 46, 'Pazarcık'),
    (1694, 46, 'Türkoğlu'),
    (2088, 47, 'Artuklu'),
    (1787, 47, 'Dargeçit'),
    (1273, 47, 'Derik'),
    (1474, 47, 'Kızıltepe'),
    (1519, 47, 'Mazıdağı'),
    (1526, 47, 'Midyat'),
    (1547, 47, 'Nusaybin'),
    (1564, 47, 'Ömerli'),
    (1609, 47, 'Savur'),
    (2002, 47, 'Yeşilli'),
    (1197, 48, 'Bodrum'),
    (1742, 48, 'Dalaman'),
    (1266, 48, 'Datça'),
    (1331, 48, 'Fethiye'),
    (1958, 48, 'Kavaklıdere'),
    (1488, 48, 'Köyceğiz'),
    (1517, 48, 'Marmaris'),
    (2089, 48, 'Menteşe'),
    (1528, 48, 'Milas'),
    (1831, 48, 'Ortaca'),
    (2090, 48, 'Seydikemer'),
    (1695, 48, 'Ula'),
    (1719, 48, 'Yatağan'),
    (1213, 49, 'Bulanık'),
    (1801, 49, 'Hasköy'),
    (1964, 49, 'Korkut'),
    (1510, 49, 'Malazgirt'),
    (1534, 49, 'Merkez'),
    (1711, 49, 'Varto'),
    (1749, 50, 'Acıgöl'),
    (1155, 50, 'Avanos'),
    (1274, 50, 'Derinkuyu'),
    (1367, 50, 'Gülşehir'),
    (1374, 50, 'Hacıbektaş'),
    (1485, 50, 'Kozaklı'),
    (1543, 50, 'Merkez'),
    (1707, 50, 'Ürgüp'),
    (1876, 51, 'Altunhisar'),
    (1201, 51, 'Bor'),
    (1225, 51, 'Çamardı'),
    (1904, 51, 'Çiftlik'),
    (1544, 51, 'Merkez'),
    (1700, 51, 'Ulukışla'),
    (1119, 52, 'Akkuş'),
    (2103, 52, 'Altınordu'),
    (1158, 52, 'Aybastı'),
    (1891, 52, 'Çamaş'),
    (1897, 52, 'Çatalpınar'),
    (1900, 52, 'Çaybaşı'),
    (1328, 52, 'Fatsa'),
    (1358, 52, 'Gölköy'),
    (1795, 52, 'Gülyalı'),
    (1797, 52, 'Gürgentepe'),
    (1947, 52, 'İkizce'),
    (1950, 52, 'Kabadüz'),
    (1951, 52, 'Kabataş'),
    (1482, 52, 'Korgan'),
    (1493, 52, 'Kumru'),
    (1525, 52, 'Mesudiye'),
    (1573, 52, 'Perşembe'),
    (1696, 52, 'Ulubey'),
    (1706, 52, 'Ünye'),
    (1146, 53, 'Ardeşen'),
    (1228, 53, 'Çamlıhemşin'),
    (1241, 53, 'Çayeli'),
    (1908, 53, 'Derepazarı'),
    (1332, 53, 'Fındıklı'),
    (1796, 53, 'Güneysu'),
    (1943, 53, 'Hemşin'),
    (1405, 53, 'İkizdere'),
    (1949, 53, 'İyidere'),
    (1428, 53, 'Kalkandere'),
    (1586, 53, 'Merkez'),
    (1569, 53, 'Pazar'),
    (2068, 54, 'Adapazarı'),
    (1123, 54, 'Akyazı'),
    (2069, 54, 'Arifiye'),
    (2070, 54, 'Erenler'),
    (1925, 54, 'Ferizli'),
    (1351, 54, 'Geyve'),
    (1391, 54, 'Hendek'),
    (1955, 54, 'Karapürçek'),
    (1442, 54, 'Karasu'),
    (1453, 54, 'Kaynarca'),
    (1818, 54, 'Kocaali'),
    (1833, 54, 'Pamukova'),
    (1595, 54, 'Sapanca'),
    (2071, 54, 'Serdivan'),
    (1986, 54, 'Söğütlü'),
    (1847, 54, 'Taraklı'),
    (1125, 55, 'Alaçam'),
    (1763, 55, 'Asarcık'),
    (2072, 55, 'Atakum'),
    (1879, 55, 'Ayvacık'),
    (1164, 55, 'Bafra'),
    (2073, 55, 'Canik'),
    (1234, 55, 'Çarşamba'),
    (1386, 55, 'Havza'),
    (2074, 55, 'İlkadım'),
    (1452, 55, 'Kavak'),
    (1501, 55, 'Ladik'),
    (1838, 55, 'Salıpazarı'),
    (1849, 55, 'Tekkeköy'),
    (1676, 55, 'Terme'),
    (1712, 55, 'Vezirköprü'),
    (1993, 55, 'Yakakent'),
    (1830, 55, '19 Mayıs'),
    (1179, 56, 'Baykan'),
    (1317, 56, 'Eruh'),
    (1495, 56, 'Kurtalan'),
    (1620, 56, 'Merkez'),
    (1575, 56, 'Pervari'),
    (1662, 56, 'Şirvan'),
    (1878, 56, 'Tillo'),
    (1156, 57, 'Ayancık'),
    (1204, 57, 'Boyabat'),
    (1910, 57, 'Dikmen'),
    (1290, 57, 'Durağan'),
    (1314, 57, 'Erfelek'),
    (1349, 57, 'Gerze'),
    (1627, 57, 'Merkez'),
    (1981, 57, 'Saraydüzü'),
    (1693, 57, 'Türkeli'),
    (1870, 58, 'Akıncılar'),
    (1875, 58, 'Altınyayla'),
    (1282, 58, 'Divriği'),
    (1913, 58, 'Doğanşar'),
    (1342, 58, 'Gemerek'),
    (1927, 58, 'Gölova'),
    (1373, 58, 'Gürün'),
    (1376, 58, 'Hafik'),
    (1407, 58, 'İmranlı'),
    (1431, 58, 'Kangal'),
    (1484, 58, 'Koyulhisar'),
    (1628, 58, 'Merkez'),
    (1646, 58, 'Suşehri'),
    (1650, 58, 'Şarkışla'),
    (1991, 58, 'Ulaş'),
    (1731, 58, 'Yıldızeli'),
    (1738, 58, 'Zara'),
    (1250, 59, 'Çerkezköy'),
    (1258, 59, 'Çorlu'),
    (2094, 59, 'Ergene'),
    (1388, 59, 'Hayrabolu'),
    (2095, 59, 'Kapaklı'),
    (1511, 59, 'Malkara'),
    (1825, 59, 'Marmaraereğlisi'),
    (1538, 59, 'Muratlı'),
    (1596, 59, 'Saray'),
    (2096, 59, 'Süleymanpaşa'),
    (1652, 59, 'Şarköy'),
    (1129, 60, 'Almus'),
    (1151, 60, 'Artova'),
    (1883, 60, 'Başçiftlik'),
    (1308, 60, 'Erbaa'),
    (1679, 60, 'Merkez'),
    (1545, 60, 'Niksar'),
    (1834, 60, 'Pazar'),
    (1584, 60, 'Reşadiye'),
    (1987, 60, 'Sulusaray'),
    (1690, 60, 'Turhal'),
    (1858, 60, 'Yeşilyurt'),
    (1740, 60, 'Zile'),
    (1113, 61, 'Akçaabat'),
    (1141, 61, 'Araklı'),
    (1150, 61, 'Arsin'),
    (1775, 61, 'Beşikdüzü'),
    (1896, 61, 'Çarşıbaşı'),
    (1244, 61, 'Çaykara'),
    (1909, 61, 'Dernekpazarı'),
    (1917, 61, 'Düzköy'),
    (1942, 61, 'Hayrat'),
    (1966, 61, 'Köprübaşı'),
    (1507, 61, 'Maçka'),
    (1548, 61, 'Of'),
    (2097, 61, 'Ortahisar'),
    (1647, 61, 'Sürmene'),
    (1842, 61, 'Şalpazarı'),
    (1681, 61, 'Tonya'),
    (1709, 61, 'Vakfıkebir'),
    (1732, 61, 'Yomra'),
    (1247, 62, 'Çemişgezek'),
    (1397, 62, 'Hozat'),
    (1518, 62, 'Mazgirt'),
    (1688, 62, 'Merkez'),
    (1541, 62, 'Nazımiye'),
    (1562, 62, 'Ovacık'),
    (1574, 62, 'Pertek'),
    (1581, 62, 'Pülümür'),
    (1115, 63, 'Akçakale'),
    (1194, 63, 'Birecik'),
    (1209, 63, 'Bozova'),
    (1220, 63, 'Ceylanpınar'),
    (2091, 63, 'Eyyübiye'),
    (1378, 63, 'Halfeti'),
    (2092, 63, 'Haliliye'),
    (1800, 63, 'Harran'),
    (1393, 63, 'Hilvan'),
    (2093, 63, 'Karaköprü'),
    (1630, 63, 'Siverek'),
    (1643, 63, 'Suruç'),
    (1713, 63, 'Viranşehir'),
    (1170, 64, 'Banaz'),
    (1323, 64, 'Eşme'),
    (1436, 64, 'Karahallı'),
    (1704, 64, 'Merkez'),
    (1629, 64, 'Sivaslı'),
    (1697, 64, 'Ulubey'),
    (1770, 65, 'Bahçesaray'),
    (1175, 65, 'Başkale'),
    (1786, 65, 'Çaldıran'),
    (1236, 65, 'Çatak'),
    (1918, 65, 'Edremit'),
    (1309, 65, 'Erciş'),
    (1350, 65, 'Gevaş'),
    (1372, 65, 'Gürpınar'),
    (2098, 65, 'İpekyolu'),
    (1533, 65, 'Muradiye'),
    (1565, 65, 'Özalp'),
    (1980, 65, 'Saray'),
    (2099, 65, 'Tuşba'),
    (1117, 66, 'Akdağmadeni'),
    (1877, 66, 'Aydıncık'),
    (1198, 66, 'Boğazlıyan'),
    (1895, 66, 'Çandır'),
    (1242, 66, 'Çayıralan'),
    (1245, 66, 'Çekerek'),
    (1952, 66, 'Kadışehri'),
    (1733, 66, 'Merkez'),
    (1982, 66, 'Saraykent'),
    (1602, 66, 'Sarıkaya'),
    (1635, 66, 'Sorgun'),
    (1655, 66, 'Şefaatli'),
    (1998, 66, 'Yenifakılı'),
    (1726, 66, 'Yerköy'),
    (1758, 67, 'Alaplı'),
    (1240, 67, 'Çaycuma'),
    (1276, 67, 'Devrek'),
    (1313, 67, 'Ereğli'),
    (1926, 67, 'Gökçebey'),
    (2100, 67, 'Kilimli'),
    (2101, 67, 'Kozlu'),
    (1741, 67, 'Merkez'),
    (1860, 68, 'Ağaçören'),
    (1921, 68, 'Eskil'),
    (1932, 68, 'Gülağaç'),
    (1861, 68, 'Güzelyurt'),
    (1120, 68, 'Merkez'),
    (1557, 68, 'Ortaköy'),
    (1866, 68, 'Sarıyahşi'),
    (2106, 68, 'Sultanhanı'),
    (1767, 69, 'Aydıntepe'),
    (1788, 69, 'Demirözü'),
    (1176, 69, 'Merkez'),
    (1768, 70, 'Ayrancı'),
    (1884, 70, 'Başyayla'),
    (1316, 70, 'Ermenek'),
    (1862, 70, 'Kazımkarabekir'),
    (1439, 70, 'Merkez'),
    (1983, 70, 'Sarıveliler'),
    (1880, 71, 'Bahşılı'),
    (1882, 71, 'Balışeyh'),
    (1901, 71, 'Çelebi'),
    (1268, 71, 'Delice'),
    (1954, 71, 'Karakeçili'),
    (1463, 71, 'Keskin'),
    (1469, 71, 'Merkez'),
    (1638, 71, 'Sulakyurt'),
    (1992, 71, 'Yahşihan'),
    (1184, 72, 'Beşiri'),
    (1345, 72, 'Gercüş'),
    (1941, 72, 'Hasankeyf'),
    (1487, 72, 'Kozluk'),
    (1174, 72, 'Merkez'),
    (1607, 72, 'Sason'),
    (1189, 73, 'Beytüşşebap'),
    (1223, 73, 'Cizre'),
    (1931, 73, 'Güçlükonak'),
    (1403, 73, 'İdil'),
    (1661, 73, 'Merkez'),
    (1623, 73, 'Silopi'),
    (1698, 73, 'Uludere'),
    (1761, 74, 'Amasra'),
    (1496, 74, 'Kurucaşile'),
    (1172, 74, 'Merkez'),
    (1701, 74, 'Ulus'),
    (1252, 75, 'Çıldır'),
    (2008, 75, 'Damal'),
    (1356, 75, 'Göle'),
    (1380, 75, 'Hanak'),
    (1144, 75, 'Merkez'),
    (1579, 75, 'Posof'),
    (1142, 76, 'Aralık'),
    (2011, 76, 'Karakoyunlu'),
    (1398, 76, 'Merkez'),
    (1692, 76, 'Tuzluca'),
    (2019, 77, 'Altınova'),
    (2020, 77, 'Armutlu'),
    (2021, 77, 'Çınarcık'),
    (2022, 77, 'Çiftlikköy'),
    (1716, 77, 'Merkez'),
    (2026, 77, 'Termal'),
    (1296, 78, 'Eflani'),
    (1321, 78, 'Eskipazar'),
    (1433, 78, 'Merkez'),
    (1561, 78, 'Ovacık'),
    (1587, 78, 'Safranbolu'),
    (1856, 78, 'Yenice'),
    (2023, 79, 'Elbeyli'),
    (1476, 79, 'Merkez'),
    (2024, 79, 'Musabeyli'),
    (2025, 79, 'Polateli'),
    (1165, 80, 'Bahçe'),
    (1743, 80, 'Düziçi'),
    (2027, 80, 'Hasanbeyli'),
    (1423, 80, 'Kadirli'),
    (1560, 80, 'Merkez'),
    (2028, 80, 'Sumbas'),
    (2029, 80, 'Toprakkale'),
    (1116, 81, 'Akçakoca'),
    (1784, 81, 'Cumayeri'),
    (1905, 81, 'Çilimli'),
    (1794, 81, 'Gölyaka'),
    (2017, 81, 'Gümüşova'),
    (2031, 81, 'Kaynaşlı'),
    (1292, 81, 'Merkez'),
    (1730, 81, 'Yığılca');

ALTER TABLE events ADD COLUMN district_id INT REFERENCES districts(id);
ALTER TABLE users  ADD COLUMN district_id INT REFERENCES districts(id);
CREATE INDEX idx_events_district ON events (district_id, status);
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY districts_read ON districts FOR SELECT USING (true);

-- İlçe filtresi sıralaması: en çok açık etkinliği olan ilçe önde
CREATE VIEW v_district_activity AS
SELECT d.id, d.city_id, d.name,
       count(e.id) FILTER (WHERE e.status = 'acik' AND e.event_date > now()) AS open_events
  FROM districts d LEFT JOIN events e ON e.district_id = d.id
 GROUP BY d.id, d.city_id, d.name;
ALTER VIEW v_district_activity SET (security_invoker = true);
GRANT SELECT ON districts, v_district_activity TO anon, authenticated;

-- ============================================================
--  EKSİK VAR — 6. migrasyon: Hesap silme + profil fotoğrafı deposu
-- ============================================================

-- a) Kullanıcı kendi hesabını siler (auth kaydı → profil CASCADE; mesajlar anonimleşir)
CREATE OR REPLACE FUNCTION delete_own_account() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    DELETE FROM auth.users WHERE id = auth.uid();
END $$;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;

-- b) Profil fotoğrafları: herkese açık okunur "avatars" deposu; herkes yalnızca kendi klasörüne yazar
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
        EXECUTE $q$ CREATE POLICY avatars_public_read ON storage.objects FOR SELECT USING (bucket_id = 'avatars') $q$;
        EXECUTE $q$ CREATE POLICY avatars_own_insert ON storage.objects FOR INSERT TO authenticated
                    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text) $q$;
        EXECUTE $q$ CREATE POLICY avatars_own_update ON storage.objects FOR UPDATE TO authenticated
                    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text) $q$;
        EXECUTE $q$ CREATE POLICY avatars_own_delete ON storage.objects FOR DELETE TO authenticated
                    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text) $q$;
    END IF;
END $$;

-- ============================================================
--  EKSİK VAR — 7. migrasyon: Telefon doğrulama + hesap yaptırımları
--  Giriş artık telefon + SMS kodu (Supabase Phone OTP). Doğrulanmış numara,
--  ban sisteminin temelidir: yasaklı numara/e-posta yalnızca özet (hash)
--  olarak tutulur, yeni kayıt trigger'ı bu listeyi kontrol eder.
-- ============================================================

-- a) Kullanıcı durumu alanları
ALTER TABLE users
    ADD COLUMN suspended_until TIMESTAMPTZ,
    ADD COLUMN status_reason   VARCHAR(120);

-- b) Yasaklı kimlik özetleri (açık numara/e-posta saklanmaz)
CREATE TABLE banned_identifiers (
    id_hash    TEXT PRIMARY KEY,
    kind       TEXT NOT NULL CHECK (kind IN ('phone', 'email')),
    reason     VARCHAR(120),
    banned_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ                       -- NULL = kalıcı
);
ALTER TABLE banned_identifiers ENABLE ROW LEVEL SECURITY;  -- politika yok: yalnızca sunucu fonksiyonları okur
CREATE OR REPLACE FUNCTION ident_hash(p TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
    SELECT encode(sha256(convert_to(regexp_replace(lower(trim(p)), '[^a-z0-9@.]', '', 'g'), 'UTF8')), 'hex');
$$;
CREATE OR REPLACE FUNCTION is_banned_identifier(p TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT p IS NOT NULL AND length(trim(p)) > 0 AND EXISTS (
        SELECT 1 FROM banned_identifiers b
         WHERE b.id_hash = ident_hash(p) AND (b.expires_at IS NULL OR b.expires_at > now()));
$$;

-- c) Yeni kullanıcı trigger'ı: telefonlu kayıt, ilçe, doğrulama işareti, yasak kontrolü
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE base TEXT; uname TEXT; n INT := 0; v_phone TEXT;
BEGIN
    v_phone := COALESCE(NULLIF(NEW.phone, ''), NULLIF(NEW.raw_user_meta_data->>'phone', ''));
    IF is_banned_identifier(v_phone) OR is_banned_identifier(NEW.email) THEN
        RAISE EXCEPTION 'HESAP_YASAKLI' USING HINT = 'Bu telefon numarası veya e-posta ile hesap açılamaz';
    END IF;
    base := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''),
                     split_part(COALESCE(NEW.email, ''), '@', 1), 'oyuncu');
    base := regexp_replace(translate(lower(base), 'çğıöşüâîû', 'cgiosuaiu'), '[^a-z0-9_]', '', 'g');
    IF base = '' THEN base := 'oyuncu'; END IF;
    uname := left(base, 30);
    WHILE EXISTS (SELECT 1 FROM users WHERE username = uname) LOOP
        n := n + 1; uname := left(base, 26) || n::text;
    END LOOP;
    INSERT INTO users (id, email, phone, username, full_name, city_id, district_id, is_verified)
    VALUES (NEW.id, NEW.email, v_phone, uname,
            COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'Yeni Oyuncu'),
            NULLIF(NEW.raw_user_meta_data->>'city_id', '')::INT,
            NULLIF(NEW.raw_user_meta_data->>'district_id', '')::INT,
            NEW.phone IS NOT NULL AND NEW.phone <> '');
    RETURN NEW;
END $$;

-- d) Aktiflik: askı süresi dolmuşsa aktif sayılır
CREATE OR REPLACE FUNCTION is_active_user() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE((SELECT status = 'aktif' OR (status = 'askida' AND suspended_until IS NOT NULL AND suspended_until < now())
                       FROM users WHERE id = auth.uid()), FALSE);
$$;

-- Yazma politikaları aktiflik şartı alır (mesaj/etkinlik/başvuru/puan/arama/sohbet açma)
DROP POLICY events_insert_own ON events;
CREATE POLICY events_insert_own ON events FOR INSERT TO authenticated WITH CHECK (organizer_id = auth.uid() AND is_active_user());
DROP POLICY applications_insert_own ON applications;
CREATE POLICY applications_insert_own ON applications FOR INSERT TO authenticated WITH CHECK (applicant_id = auth.uid() AND is_active_user());
DROP POLICY messages_insert ON messages;
CREATE POLICY messages_insert ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid() AND is_conversation_member(conversation_id) AND is_active_user());
DROP POLICY ratings_insert_own ON ratings;
CREATE POLICY ratings_insert_own ON ratings FOR INSERT TO authenticated WITH CHECK (rater_id = auth.uid() AND is_active_user());
DROP POLICY calls_insert_own ON calls;
CREATE POLICY calls_insert_own ON calls FOR INSERT TO authenticated WITH CHECK (caller_id = auth.uid() AND is_active_user());
DROP POLICY conversations_insert_own ON conversations;
CREATE POLICY conversations_insert_own ON conversations FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid() AND is_active_user());
-- Kapatılmış hesaplar başkalarına görünmez
DROP POLICY users_read ON users;
CREATE POLICY users_read ON users FOR SELECT TO authenticated USING (status <> 'banli' OR id = auth.uid());

-- e) Yaptırım işlemleri (iç fonksiyon; dışarıdan çağrılamaz)
CREATE OR REPLACE FUNCTION _apply_sanction(p_user UUID, p_status user_status, p_reason TEXT, p_until TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_phone TEXT; v_email TEXT; r RECORD;
BEGIN
    UPDATE users SET status = p_status, status_reason = p_reason, suspended_until = p_until WHERE id = p_user;
    IF p_status = 'banli' THEN
        SELECT phone, email INTO v_phone, v_email FROM users WHERE id = p_user;
        INSERT INTO banned_identifiers (id_hash, kind, reason)
            SELECT ident_hash(v_phone), 'phone', p_reason WHERE v_phone IS NOT NULL AND v_phone <> ''
            ON CONFLICT (id_hash) DO NOTHING;
        INSERT INTO banned_identifiers (id_hash, kind, reason)
            SELECT ident_hash(v_email), 'email', p_reason WHERE v_email IS NOT NULL AND v_email <> ''
            ON CONFLICT (id_hash) DO NOTHING;
        -- kişisel veriler silinir, kimlik yalnızca özet olarak kalır
        UPDATE users SET phone = NULL, email = NULL, full_name = 'Kapatılmış hesap', avatar_url = NULL, bio = NULL WHERE id = p_user;
    END IF;
    -- açtığı gelecek etkinlikler iptal, kadroya bildirim
    FOR r IN SELECT id, title FROM events WHERE organizer_id = p_user AND status IN ('acik', 'doldu') AND event_date > now() LOOP
        UPDATE events SET status = 'iptal' WHERE id = r.id;
        INSERT INTO notifications (user_id, type, title, body, data)
            SELECT user_id, 'etkinlik_iptal', r.title || ' iptal edildi', 'Organizatörün hesabı kapatıldı', jsonb_build_object('event_id', r.id)
              FROM participants WHERE event_id = r.id;
    END LOOP;
    -- girdiği gelecek kadrolardan çıkar, kontenjanı aç
    FOR r IN SELECT p.event_id FROM participants p JOIN events e ON e.id = p.event_id
              WHERE p.user_id = p_user AND e.event_date > now() AND e.status IN ('acik', 'doldu') LOOP
        DELETE FROM participants WHERE event_id = r.event_id AND user_id = p_user;
        UPDATE events SET filled_count = GREATEST(0, filled_count - 1), status = 'acik' WHERE id = r.event_id;
    END LOOP;
    UPDATE applications SET status = 'iptal' WHERE applicant_id = p_user AND status = 'beklemede';
    DELETE FROM conversation_members WHERE user_id = p_user;
    -- kimlik katmanı: oturum düşer, giriş engellenir (Supabase Auth 'banned_until')
    UPDATE auth.users SET banned_until = COALESCE(p_until, now() + INTERVAL '100 years') WHERE id = p_user;
END $$;
REVOKE ALL ON FUNCTION _apply_sanction(UUID, user_status, TEXT, TIMESTAMPTZ) FROM PUBLIC, authenticated, anon;

-- Yönetici çağrıları: yalnızca JWT'siz bağlam (Supabase SQL editörü / service role)
CREATE OR REPLACE FUNCTION ban_user(p_user UUID, p_reason TEXT DEFAULT 'kural ihlali')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    PERFORM _apply_sanction(p_user, 'banli', p_reason, NULL);
END $$;
CREATE OR REPLACE FUNCTION suspend_user(p_user UUID, p_days INT DEFAULT 7, p_reason TEXT DEFAULT 'inceleme')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    PERFORM _apply_sanction(p_user, 'askida', p_reason, now() + make_interval(days => p_days));
END $$;
CREATE OR REPLACE FUNCTION reinstate_user(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    UPDATE users SET status = 'aktif', status_reason = NULL, suspended_until = NULL WHERE id = p_user;
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user;
END $$;
REVOKE ALL ON FUNCTION ban_user(UUID, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION suspend_user(UUID, INT, TEXT) FROM PUBLIC, authenticated, anon;
REVOKE ALL ON FUNCTION reinstate_user(UUID) FROM PUBLIC, authenticated, anon;

-- f) Otomatik askı: 30 günde farklı 3 kişiden aynı nedenle şikayet → 7 gün askı (inceleme için)
CREATE OR REPLACE FUNCTION trg_report_auto_suspend() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
    IF NEW.reported_user_id IS NULL OR NEW.reason = 'yoklama_itiraz' THEN RETURN NEW; END IF;
    SELECT count(DISTINCT reporter_id) INTO n FROM reports
     WHERE reported_user_id = NEW.reported_user_id AND reason = NEW.reason AND created_at > now() - INTERVAL '30 days';
    IF n >= 3 AND (SELECT status FROM users WHERE id = NEW.reported_user_id) = 'aktif' THEN
        PERFORM _apply_sanction(NEW.reported_user_id, 'askida', 'otomatik: ' || n || ' şikayet (' || NEW.reason || ')', now() + INTERVAL '7 days');
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER reports_auto_suspend AFTER INSERT ON reports
    FOR EACH ROW EXECUTE FUNCTION trg_report_auto_suspend();

-- g) İnceleme kuyruğu (yöneticiler Supabase panelinden bakar)
CREATE VIEW v_report_queue AS
SELECT r.id, r.created_at, r.reason, r.description, r.status,
       ru.username AS reported_username, ru.status AS reported_status,
       (SELECT count(*) FROM reports x WHERE x.reported_user_id = r.reported_user_id) AS total_reports
  FROM reports r LEFT JOIN users ru ON ru.id = r.reported_user_id
 WHERE r.status = 'bekliyor' ORDER BY r.created_at;

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

-- ============================================================
--  EKSİK VAR — 9. migrasyon: Bildirim üretimi + hatırlatmalar + push belirteci
--  Bildirimler sunucuda üretilir; uygulama yalnızca gösterir. Push iletimi
--  notifications tablosuna bağlı Database Webhook → Edge Function (send-push).
-- ============================================================

ALTER TABLE users  ADD COLUMN push_token TEXT;
ALTER TABLE events ADD COLUMN reminded_at TIMESTAMPTZ, ADD COLUMN attendance_reminded_at TIMESTAMPTZ;

-- a) Tek giriş noktası: kullanıcı tercihlerine bakar, mesaj bildirimlerini sohbet başına tek satırda toplar
CREATE OR REPLACE FUNCTION notify_user(p_user UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u users%ROWTYPE;
BEGIN
    IF p_user IS NULL THEN RETURN; END IF;
    SELECT * INTO u FROM users WHERE id = p_user;
    IF NOT FOUND OR u.status = 'banli' THEN RETURN; END IF;
    IF p_type = 'basvuru'    AND NOT u.notif_basvuru    THEN RETURN; END IF;
    IF p_type = 'mesaj'      AND NOT u.notif_mesaj      THEN RETURN; END IF;
    IF p_type = 'hatirlatma' AND NOT u.notif_hatirlatma THEN RETURN; END IF;
    IF p_type = 'mesaj' THEN
        UPDATE notifications SET title = p_title, body = p_body, created_at = now()
         WHERE user_id = p_user AND type = 'mesaj' AND is_read = FALSE
           AND data->>'conversation_id' = p_data->>'conversation_id';
        IF FOUND THEN RETURN; END IF;
    END IF;
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (p_user, p_type, p_title, p_body, p_data);
END $$;

-- b) Başvuru geldi → organizatör
CREATE OR REPLACE FUNCTION trg_notify_application_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; aname TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    PERFORM notify_user(e.organizer_id, 'basvuru', 'Yeni başvuru',
        aname || ', ' || e.title || ' için başvurdu' || COALESCE(': "' || NULLIF(NEW.message, '') || '"', ''),
        jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
    RETURN NEW;
END $$;
CREATE TRIGGER notify_application_insert AFTER INSERT ON applications
    FOR EACH ROW EXECUTE FUNCTION trg_notify_application_insert();

-- c) Başvuru durumu değişti → onay / kadro / doldu / ret
CREATE OR REPLACE FUNCTION trg_notify_application_update() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; oname TEXT; aname TEXT; grp UUID;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    SELECT full_name INTO oname FROM users WHERE id = e.organizer_id;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    IF NEW.organizer_approved AND NOT OLD.organizer_approved AND NEW.status = 'beklemede' THEN
        PERFORM notify_user(NEW.applicant_id, 'onay', split_part(oname, ' ', 1) || ' seni onayladı',
            '"' || e.title || '" için son onayı sen ver, yerin kesinleşsin',
            jsonb_build_object('conversation_id', NEW.conversation_id, 'event_id', NEW.event_id, 'application_id', NEW.id));
    END IF;
    IF NEW.status = 'onaylandi' AND OLD.status <> 'onaylandi' THEN
        grp := group_conversation_for(NEW.event_id);
        PERFORM notify_user(NEW.applicant_id, 'kadro', 'Kadrodasın! 🎉',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || ' · ' || COALESCE(e.venue_name, ''),
            jsonb_build_object('event_id', NEW.event_id, 'conversation_id', grp));
        PERFORM notify_user(e.organizer_id, CASE WHEN e.filled_count >= e.needed_count THEN 'doldu' ELSE 'kadro' END,
            CASE WHEN e.filled_count >= e.needed_count THEN 'Kadro tamamlandı 🏆' ELSE 'Kadroya katılım' END,
            aname || ' onayladı ve kadroya eklendi' || CASE WHEN e.filled_count >= e.needed_count THEN ' · kontenjan doldu' ELSE '' END,
            jsonb_build_object('event_id', NEW.event_id));
    END IF;
    IF NEW.status = 'reddedildi' AND OLD.status <> 'reddedildi' THEN
        PERFORM notify_user(NEW.applicant_id, 'red', 'Başvurun kabul edilmedi', e.title || ' · başka bir kadro dene', jsonb_build_object('event_id', NEW.event_id));
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER notify_application_update AFTER UPDATE ON applications
    FOR EACH ROW EXECUTE FUNCTION trg_notify_application_update();

-- d) Mesaj geldi → sohbetin diğer üyeleri (gönderen ve sessize alanlar hariç)
CREATE OR REPLACE FUNCTION trg_notify_message() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c conversations%ROWTYPE; sname TEXT; m RECORD;
BEGIN
    IF NEW.sender_id IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO c FROM conversations WHERE id = NEW.conversation_id;
    SELECT full_name INTO sname FROM users WHERE id = NEW.sender_id;
    FOR m IN SELECT user_id FROM conversation_members
              WHERE conversation_id = NEW.conversation_id AND user_id <> NEW.sender_id AND NOT is_muted LOOP
        PERFORM notify_user(m.user_id, 'mesaj',
            sname || CASE WHEN c.type = 'grup' THEN ' · ' || COALESCE(c.name, 'Grup') ELSE '' END,
            left(COALESCE(NEW.content, '📷 Fotoğraf'), 120),
            jsonb_build_object('conversation_id', NEW.conversation_id));
    END LOOP;
    RETURN NEW;
END $$;
CREATE TRIGGER notify_message AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION trg_notify_message();

-- e) Haftalık seri: gelecek hafta açılınca gruba duyuru bildirimi (on_event_created genişletildi)
CREATE OR REPLACE FUNCTION on_event_created() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_chat_id UUID; m RECORD;
BEGIN
    IF NEW.series_id IS NOT NULL THEN
        SELECT id INTO v_chat_id FROM conversations WHERE type = 'grup' AND series_id = NEW.series_id;
    END IF;
    IF v_chat_id IS NULL THEN
        INSERT INTO conversations (type, event_id, series_id, name, created_by)
        VALUES ('grup', NEW.id, NEW.series_id, NEW.title, NEW.organizer_id) RETURNING id INTO v_chat_id;
        INSERT INTO conversation_members (conversation_id, user_id, role) VALUES (v_chat_id, NEW.organizer_id, 'yonetici');
    ELSE
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (v_chat_id, NULL, 'sistem', format('Haftaya aynı saat: %s · %s eksik, başvurular açık', to_char(NEW.event_date, 'DD.MM HH24:MI'), NEW.needed_count));
        FOR m IN SELECT user_id FROM conversation_members WHERE conversation_id = v_chat_id AND user_id <> NEW.organizer_id LOOP
            PERFORM notify_user(m.user_id, 'tekrar', 'Haftaya aynı saat',
                NEW.title || ' · ' || to_char(NEW.event_date, 'DD.MM HH24:MI') || ' · ' || NEW.needed_count || ' eksik, başvurular açık',
                jsonb_build_object('event_id', NEW.id, 'conversation_id', v_chat_id));
        END LOOP;
    END IF;
    UPDATE users SET events_organized = events_organized + 1 WHERE id = NEW.organizer_id;
    RETURN NEW;
END $$;

-- f) Saatlik hatırlatmalar: maça ~2 saat kala herkese; maç bitince organizatöre "yoklama bekliyor"
CREATE OR REPLACE FUNCTION send_event_reminders() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e RECORD; p RECORD; n INT := 0;
BEGIN
    FOR e IN SELECT * FROM events WHERE status IN ('acik', 'doldu') AND reminded_at IS NULL
              AND event_date BETWEEN now() + INTERVAL '90 minutes' AND now() + INTERVAL '3 hours' LOOP
        PERFORM notify_user(e.organizer_id, 'hatirlatma', 'Maç 2 saat sonra',
            e.title || ' · ' || COALESCE(e.venue_name, '') || ' · ' || to_char(e.event_date, 'HH24:MI'), jsonb_build_object('event_id', e.id));
        FOR p IN SELECT user_id FROM participants WHERE event_id = e.id LOOP
            PERFORM notify_user(p.user_id, 'hatirlatma', 'Maç 2 saat sonra',
                e.title || ' · ' || COALESCE(e.venue_name, '') || ' · ' || to_char(e.event_date, 'HH24:MI'), jsonb_build_object('event_id', e.id));
        END LOOP;
        UPDATE events SET reminded_at = now() WHERE id = e.id;
        n := n + 1;
    END LOOP;
    FOR e IN SELECT * FROM events WHERE status IN ('acik', 'doldu') AND attendance_reminded_at IS NULL
              AND event_date < now() - INTERVAL '3 hours' AND event_date > now() - INTERVAL '48 hours' LOOP
        PERFORM notify_user(e.organizer_id, 'yoklama', 'Yoklama bekliyor',
            e.title || ' oynandı — gelmeyenleri işaretle, maçı tamamla', jsonb_build_object('event_id', e.id));
        UPDATE events SET attendance_reminded_at = now() WHERE id = e.id;
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('eksikvar-hatirlatma', '15 * * * *', 'SELECT send_event_reminders()');
    END IF;
END $$;

-- g) Bildirimler gerçek zamanlı yayınlanır (uygulama listeyi anında günceller)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

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

-- ============================================================
--  EKSİK VAR — 11. migrasyon: Kadroya davet
--  Davet = organizatör onayı hazır bir başvuru (invited_by dolu). Oyuncunun kabulü
--  son onaydır; kadro, grup, mevki kotası ve bildirimler aynı yoldan işler.
-- ============================================================

ALTER TABLE applications
    ADD COLUMN invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN invited_at TIMESTAMPTZ;

-- Organizatör davet eder (RLS'i aşan tek yol; tüm kontroller burada)
CREATE OR REPLACE FUNCTION invite_user(p_event UUID, p_user UUID, p_position TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; v_id UUID;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL OR auth.uid() <> e.organizer_id THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF NOT is_active_user() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF p_user = e.organizer_id THEN RAISE EXCEPTION 'KENDINI_DAVET_EDEMEZSIN'; END IF;
    IF e.status <> 'acik' OR e.event_date < now() THEN RAISE EXCEPTION 'ETKINLIK_KAPALI'; END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user AND status <> 'banli') THEN RAISE EXCEPTION 'KULLANICI_YOK'; END IF;
    IF EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = p_user AND blocked_id = e.organizer_id) OR (blocker_id = e.organizer_id AND blocked_id = p_user)) THEN
        RAISE EXCEPTION 'ENGEL' USING HINT = 'Bu kişiyle aranızda engel var';
    END IF;
    IF EXISTS (SELECT 1 FROM applications WHERE event_id = p_event AND applicant_id = p_user) THEN
        RAISE EXCEPTION 'DAVET_VAR' USING HINT = 'Bu kişi zaten başvurmuş ya da davet edilmiş';
    END IF;
    INSERT INTO applications (event_id, applicant_id, position, organizer_approved, organizer_approved_at, invited_by, invited_at, message)
    VALUES (p_event, p_user, NULLIF(p_position, ''), TRUE, now(), e.organizer_id, now(), NULL)
    RETURNING id INTO v_id;
    RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION invite_user(UUID, UUID, TEXT) TO authenticated;

-- Başvuru geldi → organizatör; davet geldi → davet edilen
CREATE OR REPLACE FUNCTION trg_notify_application_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; aname TEXT; oname TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    IF NEW.invited_by IS NOT NULL THEN
        SELECT full_name INTO oname FROM users WHERE id = NEW.invited_by;
        PERFORM notify_user(NEW.applicant_id, 'davet', split_part(oname, ' ', 1) || ' seni kadroya davet etti',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || COALESCE(' · ' || NULLIF(NEW.position, ''), ''),
            jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (NEW.conversation_id, NULL, 'sistem', oname || ' seni "' || e.title || '" kadrosuna davet etti. Kabul edersen yerin kesinleşir.');
        RETURN NEW;
    END IF;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    PERFORM notify_user(e.organizer_id, 'basvuru', 'Yeni başvuru',
        aname || ', ' || e.title || ' için başvurdu' || COALESCE(': "' || NULLIF(NEW.message, '') || '"', ''),
        jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
    RETURN NEW;
END $$;

-- Durum değişimi: davet reddi organizatöre gider; kabulde metin "davetini kabul etti"
CREATE OR REPLACE FUNCTION trg_notify_application_update() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; oname TEXT; aname TEXT; grp UUID; invited BOOLEAN;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    SELECT full_name INTO oname FROM users WHERE id = e.organizer_id;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    invited := NEW.invited_by IS NOT NULL;
    IF NOT invited AND NEW.organizer_approved AND NOT OLD.organizer_approved AND NEW.status = 'beklemede' THEN
        PERFORM notify_user(NEW.applicant_id, 'onay', split_part(oname, ' ', 1) || ' seni onayladı',
            '"' || e.title || '" için son onayı sen ver, yerin kesinleşsin',
            jsonb_build_object('conversation_id', NEW.conversation_id, 'event_id', NEW.event_id, 'application_id', NEW.id));
    END IF;
    IF NEW.status = 'onaylandi' AND OLD.status <> 'onaylandi' THEN
        grp := group_conversation_for(NEW.event_id);
        PERFORM notify_user(NEW.applicant_id, 'kadro', 'Kadrodasın! 🎉',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || ' · ' || COALESCE(e.venue_name, ''),
            jsonb_build_object('event_id', NEW.event_id, 'conversation_id', grp));
        PERFORM notify_user(e.organizer_id, CASE WHEN e.filled_count >= e.needed_count THEN 'doldu' ELSE 'kadro' END,
            CASE WHEN e.filled_count >= e.needed_count THEN 'Kadro tamamlandı 🏆' ELSE 'Kadroya katılım' END,
            aname || CASE WHEN invited THEN ' davetini kabul etti' ELSE ' onayladı' END || ' ve kadroya eklendi'
              || CASE WHEN e.filled_count >= e.needed_count THEN ' · kontenjan doldu' ELSE '' END,
            jsonb_build_object('event_id', NEW.event_id));
    END IF;
    IF NEW.status = 'reddedildi' AND OLD.status <> 'reddedildi' THEN
        IF invited THEN
            PERFORM notify_user(e.organizer_id, 'red', 'Davet reddedildi', aname || ', ' || e.title || ' davetini kabul etmedi', jsonb_build_object('event_id', NEW.event_id));
        ELSE
            PERFORM notify_user(NEW.applicant_id, 'red', 'Başvurun kabul edilmedi', e.title || ' · başka bir kadro dene', jsonb_build_object('event_id', NEW.event_id));
        END IF;
    END IF;
    RETURN NEW;
END $$;

-- ============================================================
--  EKSİK VAR — 12. migrasyon: Yedek listesi
--  Kadro doluyken yedek olunur (mevki tercihli). Yer açılınca sıradaki uygun yedeğe
--  organizatör onaylı bir "teklif" (başvuru) açılır; teklif süresince yer rezervedir,
--  süre dolarsa sıradaki yedeğe geçilir.
-- ============================================================

CREATE TABLE waitlist (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position   VARCHAR(20),                  -- NULL = farketmez
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (event_id, user_id)
);
CREATE INDEX idx_waitlist_event ON waitlist (event_id, created_at);
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY waitlist_read   ON waitlist FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_event_organizer(event_id));
CREATE POLICY waitlist_insert ON waitlist FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND is_active_user());
CREATE POLICY waitlist_delete ON waitlist FOR DELETE TO authenticated USING (user_id = auth.uid() OR is_event_organizer(event_id));
GRANT SELECT, INSERT, DELETE ON waitlist TO authenticated;

ALTER TABLE applications
    ADD COLUMN from_waitlist    BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN offer_expires_at TIMESTAMPTZ;

-- Herkese açık yedek sayısı
CREATE VIEW v_event_waitlist_count AS SELECT event_id, count(*)::INT AS waiting FROM waitlist GROUP BY event_id;
GRANT SELECT ON v_event_waitlist_count TO authenticated;

-- Yedek olma kuralları: kadroda/başvuruda olmayan, etkinliği açık olmayan (dolu) ya da mevkisi dolu kişiler
CREATE OR REPLACE FUNCTION trg_waitlist_check() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    IF e.organizer_id = NEW.user_id THEN RAISE EXCEPTION 'KENDI_ETKINLIGIN'; END IF;
    IF e.status NOT IN ('acik', 'doldu') OR e.event_date < now() THEN RAISE EXCEPTION 'ETKINLIK_KAPALI'; END IF;
    IF EXISTS (SELECT 1 FROM participants WHERE event_id = NEW.event_id AND user_id = NEW.user_id) THEN RAISE EXCEPTION 'ZATEN_KADRODA'; END IF;
    IF EXISTS (SELECT 1 FROM applications WHERE event_id = NEW.event_id AND applicant_id = NEW.user_id AND status = 'beklemede') THEN RAISE EXCEPTION 'BASVURU_VAR'; END IF;
    IF position_available(NEW.event_id, NEW.position) THEN RAISE EXCEPTION 'YER_VAR' USING HINT = 'Bu mevkide yer var, doğrudan başvur'; END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER waitlist_check BEFORE INSERT ON waitlist FOR EACH ROW EXECUTE FUNCTION trg_waitlist_check();

-- Doluluk gerçek kadrodan sayılır (ayrılan/çıkarılan yer açar); bekleyen yedek teklifleri yeri rezerve eder
CREATE OR REPLACE FUNCTION position_available(p_event UUID, p_position TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; quota INT; used INT; specified INT; free_total INT; free_used INT; pos TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RETURN FALSE; END IF;
    pos := COALESCE(NULLIF(p_position, ''), 'farketmez');
    quota := (e.needed_positions ->> pos)::INT;
    IF quota IS NOT NULL THEN
        SELECT count(*) INTO used FROM (
            SELECT a.position FROM participants p JOIN applications a ON a.id = p.application_id WHERE p.event_id = p_event
            UNION ALL
            SELECT a.position FROM applications a WHERE a.event_id = p_event AND a.from_waitlist AND a.status = 'beklemede' AND a.offer_expires_at > now()
        ) x WHERE x.position = pos;
        RETURN used < quota;
    END IF;
    SELECT COALESCE(SUM((v.value)::INT), 0) INTO specified FROM jsonb_each_text(e.needed_positions) v;
    free_total := e.needed_count - specified;
    SELECT count(*) INTO free_used FROM (
        SELECT a.position FROM participants p LEFT JOIN applications a ON a.id = p.application_id WHERE p.event_id = p_event
        UNION ALL
        SELECT a.position FROM applications a WHERE a.event_id = p_event AND a.from_waitlist AND a.status = 'beklemede' AND a.offer_expires_at > now()
    ) x WHERE x.position IS NULL OR NOT (e.needed_positions ? x.position);
    RETURN free_used < free_total;
END $$;

-- Yer açılınca sıradaki uygun yedeğe teklif aç
CREATE OR REPLACE FUNCTION promote_from_waitlist(p_event UUID) RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; w RECORD; n INT := 0; v_until TIMESTAMPTZ; v_id UUID;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND OR e.status NOT IN ('acik', 'doldu') OR e.event_date < now() THEN RETURN 0; END IF;
    FOR w IN SELECT * FROM waitlist WHERE event_id = p_event ORDER BY created_at LOOP
        IF NOT position_available(p_event, w.position) THEN CONTINUE; END IF;
        IF EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = w.user_id AND blocked_id = e.organizer_id) OR (blocker_id = e.organizer_id AND blocked_id = w.user_id))
           OR EXISTS (SELECT 1 FROM applications WHERE event_id = p_event AND applicant_id = w.user_id AND status = 'beklemede')
           OR NOT EXISTS (SELECT 1 FROM users WHERE id = w.user_id AND status = 'aktif') THEN
            DELETE FROM waitlist WHERE id = w.id; CONTINUE;
        END IF;
        v_until := LEAST(now() + INTERVAL '2 hours', e.event_date);
        BEGIN
            INSERT INTO applications (event_id, applicant_id, position, organizer_approved, organizer_approved_at, invited_by, invited_at, from_waitlist, offer_expires_at)
            VALUES (p_event, w.user_id, w.position, TRUE, now(), e.organizer_id, now(), TRUE, v_until) RETURNING id INTO v_id;
        EXCEPTION WHEN OTHERS THEN CONTINUE;   -- eski başvuru kaydı vb. çakışmalar: sıradakine geç
        END;
        DELETE FROM waitlist WHERE id = w.id;
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;

-- Tetikleyiciler: kadrodan çıkış ve kontenjan artışı
CREATE OR REPLACE FUNCTION trg_participant_deleted() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Yaklaşan, açık/dolu etkinlikte kadrodan çıkış = kontenjan açılır (ayrılma, çıkarma, ban: hepsi buradan)
    UPDATE events SET filled_count = GREATEST(0, filled_count - 1), status = 'acik'
     WHERE id = OLD.event_id AND status IN ('acik', 'doldu') AND event_date > now();
    PERFORM promote_from_waitlist(OLD.event_id);
    RETURN OLD;
END $$;
CREATE TRIGGER participants_deleted AFTER DELETE ON participants FOR EACH ROW EXECUTE FUNCTION trg_participant_deleted();

CREATE OR REPLACE FUNCTION trg_event_capacity_changed() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.needed_count > OLD.needed_count OR NEW.needed_positions IS DISTINCT FROM OLD.needed_positions THEN
        PERFORM promote_from_waitlist(NEW.id);
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER events_capacity_changed AFTER UPDATE OF needed_count, needed_positions ON events
    FOR EACH ROW EXECUTE FUNCTION trg_event_capacity_changed();

-- Süresi dolan teklifler: iptal + bildirim + sıradaki (cron, 10 dakikada bir)
CREATE OR REPLACE FUNCTION expire_waitlist_offers() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a RECORD; n INT := 0; t TEXT;
BEGIN
    FOR a IN SELECT * FROM applications WHERE from_waitlist AND status = 'beklemede' AND offer_expires_at < now() LOOP
        UPDATE applications SET status = 'iptal' WHERE id = a.id;
        SELECT title INTO t FROM events WHERE id = a.event_id;
        PERFORM notify_user(a.applicant_id, 'red', 'Yedek teklifi süresi doldu', t || ' için açılan yer sıradaki yedeğe geçti', jsonb_build_object('event_id', a.event_id));
        PERFORM promote_from_waitlist(a.event_id);
        n := n + 1;
    END LOOP;
    RETURN n;
END $$;
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule('eksikvar-yedek-teklif', '*/10 * * * *', 'SELECT expire_waitlist_offers()');
    END IF;
END $$;

-- Bildirim: yedek teklifi ayrı metinle (davet trigger'ı genişletildi)
CREATE OR REPLACE FUNCTION trg_notify_application_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; aname TEXT; oname TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    IF NEW.from_waitlist THEN
        PERFORM notify_user(NEW.applicant_id, 'yedek', 'Yer açıldı! 🎉',
            e.title || ' · ' || to_char(NEW.offer_expires_at, 'HH24:MI') || '''ye kadar onaylarsan yerin kesin',
            jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (NEW.conversation_id, NULL, 'sistem', 'Yedek listesinden yer açıldı: "' || e.title || '". ' || to_char(NEW.offer_expires_at, 'HH24:MI') || '''ye kadar onaylarsan yerin kesinleşir.');
        RETURN NEW;
    END IF;
    IF NEW.invited_by IS NOT NULL THEN
        SELECT full_name INTO oname FROM users WHERE id = NEW.invited_by;
        PERFORM notify_user(NEW.applicant_id, 'davet', split_part(oname, ' ', 1) || ' seni kadroya davet etti',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || COALESCE(' · ' || NULLIF(NEW.position, ''), ''),
            jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (NEW.conversation_id, NULL, 'sistem', oname || ' seni "' || e.title || '" kadrosuna davet etti. Kabul edersen yerin kesinleşir.');
        RETURN NEW;
    END IF;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    PERFORM notify_user(e.organizer_id, 'basvuru', 'Yeni başvuru',
        aname || ', ' || e.title || ' için başvurdu' || COALESCE(': "' || NULLIF(NEW.message, '') || '"', ''),
        jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
    RETURN NEW;
END $$;

-- leave_event: kontenjan düşürme artık kadro silme trigger'ında (çift düşüş olmasın)
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
    DELETE FROM applications WHERE event_id = p_event AND applicant_id = auth.uid();   -- önce başvuru (yeniden başvurabilsin)
    DELETE FROM participants WHERE event_id = p_event AND user_id = auth.uid();         -- trigger: kontenjan + yedek
    IF late THEN UPDATE users SET no_show_count = no_show_count + 1 WHERE id = auth.uid(); END IF;
    grp := group_conversation_for(p_event);
    IF grp IS NOT NULL THEN
        IF e.series_id IS NULL THEN DELETE FROM conversation_members WHERE conversation_id = grp AND user_id = auth.uid(); END IF;
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (grp, NULL, 'sistem', format('%s kadrodan ayrıldı · başvurular yeniden açık', uname));
    END IF;
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES (e.organizer_id, 'kadro', 'Kadrodan ayrılan var', uname || ', ' || e.title || ' kadrosundan ayrıldı', jsonb_build_object('event_id', p_event));
    RETURN late;
END $$;

CREATE OR REPLACE FUNCTION _apply_sanction(p_user UUID, p_status user_status, p_reason TEXT, p_until TIMESTAMPTZ)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v_phone TEXT; v_email TEXT; r RECORD;
BEGIN
    UPDATE users SET status = p_status, status_reason = p_reason, suspended_until = p_until WHERE id = p_user;
    IF p_status = 'banli' THEN
        SELECT phone, email INTO v_phone, v_email FROM users WHERE id = p_user;
        INSERT INTO banned_identifiers (id_hash, kind, reason) SELECT ident_hash(v_phone), 'phone', p_reason WHERE v_phone IS NOT NULL AND v_phone <> '' ON CONFLICT (id_hash) DO NOTHING;
        INSERT INTO banned_identifiers (id_hash, kind, reason) SELECT ident_hash(v_email), 'email', p_reason WHERE v_email IS NOT NULL AND v_email <> '' ON CONFLICT (id_hash) DO NOTHING;
        UPDATE users SET phone = NULL, email = NULL, full_name = 'Kapatılmış hesap', avatar_url = NULL, bio = NULL WHERE id = p_user;
    END IF;
    FOR r IN SELECT id, title FROM events WHERE organizer_id = p_user AND status IN ('acik', 'doldu') AND event_date > now() LOOP
        UPDATE events SET status = 'iptal' WHERE id = r.id;
        INSERT INTO notifications (user_id, type, title, body, data)
            SELECT user_id, 'etkinlik_iptal', r.title || ' iptal edildi', 'Organizatörün hesabı kapatıldı', jsonb_build_object('event_id', r.id)
              FROM participants WHERE event_id = r.id;
    END LOOP;
    UPDATE applications SET status = 'iptal' WHERE applicant_id = p_user AND status = 'beklemede';
    DELETE FROM participants p USING events e WHERE p.user_id = p_user AND e.id = p.event_id AND e.event_date > now() AND e.status IN ('acik', 'doldu');  -- trigger: kontenjan + yedek
    DELETE FROM conversation_members WHERE user_id = p_user;
    UPDATE auth.users SET banned_until = COALESCE(p_until, now() + INTERVAL '100 years') WHERE id = p_user;
END $$;

-- Kabul anındaki mevki kontrolü: yedek teklifi kendi rezervasyonunu kullanır (süresi geçmediyse)
CREATE OR REPLACE FUNCTION trg_approval_position_check() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.organizer_approved AND NEW.applicant_approved AND OLD.status = 'beklemede' THEN
        IF NEW.from_waitlist THEN
            IF NEW.offer_expires_at IS NOT NULL AND NEW.offer_expires_at < now() THEN
                RAISE EXCEPTION 'TEKLIF_SURESI_DOLDU' USING HINT = 'Yedek teklifinin süresi geçti';
            END IF;
            RETURN NEW;   -- yer bu kişiye rezerve
        END IF;
        IF NOT position_available(NEW.event_id, NEW.position) THEN
            RAISE EXCEPTION 'MEVKI_DOLU' USING HINT = 'Bu mevki bu arada doldu';
        END IF;
    END IF;
    RETURN NEW;
END $$;

-- Durum senkronu: kontenjan/doluluk değişince açık ↔ dolu otomatik (iptal/tamamlandı dokunulmaz)
CREATE OR REPLACE FUNCTION trg_event_status_sync() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.status IN ('acik', 'doldu') THEN
        NEW.status := CASE WHEN NEW.filled_count >= NEW.needed_count THEN 'doldu' ELSE 'acik' END;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER events_status_sync BEFORE UPDATE OF needed_count, filled_count, needed_positions ON events
    FOR EACH ROW EXECUTE FUNCTION trg_event_status_sync();

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE waitlist;
    END IF;
END $$;

-- ============================================================
--  EKSİK VAR — 13. migrasyon: Rakip bul (takım-takım eşleşme)
--  kind='rakip' ilanı: eksik = 1 rakip takım. Teklif = başvuru, kabul = çift onay.
-- ============================================================

CREATE TYPE event_kind AS ENUM ('oyuncu', 'rakip');
ALTER TABLE events
    ADD COLUMN kind       event_kind NOT NULL DEFAULT 'oyuncu',
    ADD COLUMN team_name  VARCHAR(60),
    ADD COLUMN format     VARCHAR(8),                                              -- 5v5, 6v6, 7v7, 8v8, 11v11
    ADD COLUMN venue_mode VARCHAR(10) CHECK (venue_mode IN ('bizde', 'sizde', 'farketmez')),
    ADD COLUMN cost_mode  VARCHAR(12) CHECK (cost_mode IN ('yari_yariya', 'biz', 'siz'));
ALTER TABLE users ADD COLUMN team_name VARCHAR(60);
CREATE INDEX idx_events_kind ON events (kind, city_id, status, event_date);

-- Rakip ilanında kontenjan tek rakiptir; takım adı zorunlu
CREATE OR REPLACE FUNCTION trg_rakip_defaults() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.kind = 'rakip' THEN
        IF NEW.team_name IS NULL OR trim(NEW.team_name) = '' THEN RAISE EXCEPTION 'TAKIM_ADI_GEREKLI'; END IF;
        NEW.needed_count := 1;
        NEW.needed_positions := '{}'::jsonb;
        NEW.venue_mode := COALESCE(NEW.venue_mode, 'farketmez');
        NEW.cost_mode := COALESCE(NEW.cost_mode, 'yari_yariya');
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER a_events_rakip_defaults BEFORE INSERT OR UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION trg_rakip_defaults();

-- Teklif veren kaptanın takım adı: users.team_name, yoksa adı
CREATE OR REPLACE FUNCTION team_label(p_user UUID) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT COALESCE(NULLIF(team_name, ''), full_name) FROM users WHERE id = p_user;
$$;

-- Bildirimler: rakip ilanına teklif ve maç ayarlandı metinleri
CREATE OR REPLACE FUNCTION trg_notify_application_insert() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; aname TEXT; oname TEXT;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    IF NEW.from_waitlist THEN
        PERFORM notify_user(NEW.applicant_id, 'yedek', 'Yer açıldı! 🎉',
            e.title || ' · ' || to_char(NEW.offer_expires_at, 'HH24:MI') || '''ye kadar onaylarsan yerin kesin',
            jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (NEW.conversation_id, NULL, 'sistem', 'Yedek listesinden yer açıldı: "' || e.title || '". ' || to_char(NEW.offer_expires_at, 'HH24:MI') || '''ye kadar onaylarsan yerin kesinleşir.');
        RETURN NEW;
    END IF;
    IF NEW.invited_by IS NOT NULL THEN
        SELECT full_name INTO oname FROM users WHERE id = NEW.invited_by;
        PERFORM notify_user(NEW.applicant_id, 'davet', split_part(oname, ' ', 1) || ' seni kadroya davet etti',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || COALESCE(' · ' || NULLIF(NEW.position, ''), ''),
            jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
        INSERT INTO messages (conversation_id, sender_id, type, content)
        VALUES (NEW.conversation_id, NULL, 'sistem', oname || ' seni "' || e.title || '" kadrosuna davet etti. Kabul edersen yerin kesinleşir.');
        RETURN NEW;
    END IF;
    IF e.kind = 'rakip' THEN
        PERFORM notify_user(e.organizer_id, 'basvuru', 'Yeni rakip teklifi',
            team_label(NEW.applicant_id) || ' takımı ' || e.title || ' için rakip olmak istiyor' || COALESCE(': "' || NULLIF(NEW.message, '') || '"', ''),
            jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
        RETURN NEW;
    END IF;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    PERFORM notify_user(e.organizer_id, 'basvuru', 'Yeni başvuru',
        aname || ', ' || e.title || ' için başvurdu' || COALESCE(': "' || NULLIF(NEW.message, '') || '"', ''),
        jsonb_build_object('event_id', NEW.event_id, 'application_id', NEW.id, 'conversation_id', NEW.conversation_id));
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION trg_notify_application_update() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; oname TEXT; aname TEXT; grp UUID; invited BOOLEAN;
BEGIN
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    SELECT full_name INTO oname FROM users WHERE id = e.organizer_id;
    SELECT full_name INTO aname FROM users WHERE id = NEW.applicant_id;
    invited := NEW.invited_by IS NOT NULL;
    IF NOT invited AND NOT NEW.from_waitlist AND NEW.organizer_approved AND NOT OLD.organizer_approved AND NEW.status = 'beklemede' THEN
        PERFORM notify_user(NEW.applicant_id, 'onay', split_part(oname, ' ', 1) || ' seni onayladı',
            CASE WHEN e.kind = 'rakip' THEN '"' || e.title || '" maçı için son onayı ver, maç kesinleşsin' ELSE '"' || e.title || '" için son onayı sen ver, yerin kesinleşsin' END,
            jsonb_build_object('conversation_id', NEW.conversation_id, 'event_id', NEW.event_id, 'application_id', NEW.id));
    END IF;
    IF NEW.status = 'onaylandi' AND OLD.status <> 'onaylandi' THEN
        grp := group_conversation_for(NEW.event_id);
        IF e.kind = 'rakip' THEN
            PERFORM notify_user(NEW.applicant_id, 'kadro', 'Maç ayarlandı! 🆚', e.team_name || ' ile ' || to_char(e.event_date, 'DD.MM HH24:MI') || ' · ' || COALESCE(e.venue_name, 'saha konuşulacak'),
                jsonb_build_object('event_id', NEW.event_id, 'conversation_id', grp));
            PERFORM notify_user(e.organizer_id, 'doldu', 'Rakip bulundu! 🆚', team_label(NEW.applicant_id) || ' takımıyla maç kesinleşti · ' || to_char(e.event_date, 'DD.MM HH24:MI'),
                jsonb_build_object('event_id', NEW.event_id, 'conversation_id', grp));
            IF grp IS NOT NULL THEN
                INSERT INTO messages (conversation_id, sender_id, type, content)
                VALUES (grp, NULL, 'sistem', 'Maç kesinleşti: ' || e.team_name || ' 🆚 ' || team_label(NEW.applicant_id) || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || '. Saha ve ücret detaylarını burada netleştirin.');
            END IF;
            RETURN NEW;
        END IF;
        PERFORM notify_user(NEW.applicant_id, 'kadro', 'Kadrodasın! 🎉',
            e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI') || ' · ' || COALESCE(e.venue_name, ''),
            jsonb_build_object('event_id', NEW.event_id, 'conversation_id', grp));
        PERFORM notify_user(e.organizer_id, CASE WHEN e.filled_count >= e.needed_count THEN 'doldu' ELSE 'kadro' END,
            CASE WHEN e.filled_count >= e.needed_count THEN 'Kadro tamamlandı 🏆' ELSE 'Kadroya katılım' END,
            aname || CASE WHEN invited THEN ' davetini kabul etti' WHEN NEW.from_waitlist THEN ' yedekten geldi' ELSE ' onayladı' END || ' ve kadroya eklendi'
              || CASE WHEN e.filled_count >= e.needed_count THEN ' · kontenjan doldu' ELSE '' END,
            jsonb_build_object('event_id', NEW.event_id));
    END IF;
    IF NEW.status = 'reddedildi' AND OLD.status <> 'reddedildi' THEN
        IF invited THEN
            PERFORM notify_user(e.organizer_id, 'red', 'Davet reddedildi', aname || ', ' || e.title || ' davetini kabul etmedi', jsonb_build_object('event_id', NEW.event_id));
        ELSE
            PERFORM notify_user(NEW.applicant_id, 'red', CASE WHEN e.kind = 'rakip' THEN 'Rakip teklifin kabul edilmedi' ELSE 'Başvurun kabul edilmedi' END, e.title || ' · başka bir ilan dene', jsonb_build_object('event_id', NEW.event_id));
        END IF;
    END IF;
    RETURN NEW;
END $$;

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),   -- eşitlikte gerçekten ilk oy alan kazanır
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
       row_number() OVER (PARTITION BY v.event_id ORDER BY count(*) DESC, min(v.created_at), v.voted_id) AS rnk
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

-- ============================================================
--  EKSİK VAR — 17. migrasyon: Yönetici paneli
--  Yöneticiler normal kullanıcıdır (admins tablosu). Panel telefon girişiyle çalışır,
--  yetki sunucuda is_admin() ile denetlenir; gizli anahtar hiçbir yere yazılmaz.
-- ============================================================

ALTER TABLE reports ADD COLUMN admin_note VARCHAR(300), ADD COLUMN resolved_at TIMESTAMPTZ;

CREATE TABLE admins (
    user_id  UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    note     VARCHAR(120)
);
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;   -- politika yok: yalnızca sunucu fonksiyonları okur

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid());
$$;

-- Yönetici okuma yetkileri (RLS): tüm şikayetler, tüm kullanıcılar (banlılar dahil), yasaklı özetler
CREATE POLICY reports_admin_read   ON reports FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY reports_admin_update ON reports FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY users_admin_read     ON users   FOR SELECT TO authenticated USING (is_admin());
CREATE POLICY banned_admin_read    ON banned_identifiers FOR SELECT TO authenticated USING (is_admin());

-- Yaptırım fonksiyonları: JWT'siz (SQL editörü) ya da yönetici
CREATE OR REPLACE FUNCTION ban_user(p_user UUID, p_reason TEXT DEFAULT 'kural ihlali')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF auth.uid() IS NOT NULL AND auth.uid() = p_user THEN RAISE EXCEPTION 'KENDINI_BANLAYAMAZSIN'; END IF;
    PERFORM _apply_sanction(p_user, 'banli', p_reason, NULL);
END $$;
CREATE OR REPLACE FUNCTION suspend_user(p_user UUID, p_days INT DEFAULT 7, p_reason TEXT DEFAULT 'inceleme')
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF auth.uid() IS NOT NULL AND auth.uid() = p_user THEN RAISE EXCEPTION 'KENDINI_ASKIYA_ALAMAZSIN'; END IF;
    PERFORM _apply_sanction(p_user, 'askida', p_reason, now() + make_interval(days => GREATEST(p_days, 1)));
END $$;
CREATE OR REPLACE FUNCTION reinstate_user(p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
    IF auth.uid() IS NOT NULL AND NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    UPDATE users SET status = 'aktif', status_reason = NULL, suspended_until = NULL WHERE id = p_user;
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user;
END $$;

-- Şikayeti sonuçlandır
CREATE OR REPLACE FUNCTION resolve_report(p_report BIGINT, p_status TEXT, p_note TEXT DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF p_status NOT IN ('incelendi', 'kapatildi') THEN RAISE EXCEPTION 'DURUM_GECERSIZ'; END IF;
    UPDATE reports SET status = p_status::report_status, admin_note = COALESCE(p_note, admin_note), resolved_at = now() WHERE id = p_report;
END $$;

-- Yoklama itirazı haklıysa: "gelmedi" → "katıldı" (sayaçlar trigger'la düzelir)
CREATE OR REPLACE FUNCTION revert_no_show(p_event UUID, p_user UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    UPDATE participants SET attendance = 'katildi' WHERE event_id = p_event AND user_id = p_user AND attendance = 'gelmedi';
END $$;

-- Panel özeti
CREATE OR REPLACE FUNCTION admin_stats() RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NOT is_admin() THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    RETURN jsonb_build_object(
        'users', (SELECT count(*) FROM users), 'users_today', (SELECT count(*) FROM users WHERE created_at > now() - INTERVAL '1 day'),
        'suspended', (SELECT count(*) FROM users WHERE status = 'askida'), 'banned', (SELECT count(*) FROM users WHERE status = 'banli'),
        'events_open', (SELECT count(*) FROM events WHERE status IN ('acik', 'doldu') AND event_date > now()),
        'events_week', (SELECT count(*) FROM events WHERE created_at > now() - INTERVAL '7 days'),
        'reports_pending', (SELECT count(*) FROM reports WHERE status = 'bekliyor'),
        'disputes_pending', (SELECT count(*) FROM reports WHERE status = 'bekliyor' AND reason = 'yoklama_itiraz'));
END $$;

-- Şikayet kuyruğu: artık çağıranın yetkisiyle çalışır (RLS uygulanır → yalnızca yöneticiler tümünü görür)
DROP VIEW IF EXISTS v_report_queue;
CREATE VIEW v_report_queue WITH (security_invoker = true) AS
SELECT r.id, r.created_at, r.reason, r.description, r.status, r.admin_note, r.event_id,
       r.reporter_id, rp.username AS reporter_username, rp.full_name AS reporter_name,
       r.reported_user_id, ru.username AS reported_username, ru.full_name AS reported_name, ru.status AS reported_status,
       ru.reliability_pct AS reported_reliability, ru.no_show_count AS reported_no_show,
       e.title AS event_title, e.event_date, e.organizer_id AS event_organizer_id,
       (SELECT count(*) FROM reports x WHERE x.reported_user_id = r.reported_user_id) AS total_reports
  FROM reports r
  LEFT JOIN users rp ON rp.id = r.reporter_id
  LEFT JOIN users ru ON ru.id = r.reported_user_id
  LEFT JOIN events e ON e.id = r.event_id;

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

-- ============================================================
--  EKSİK VAR — 19. migrasyon: "Yakınında maç açıldı" bildirimi
--  Yeni ilan → aynı ilçe/il, mevki eşleşmesi, tercih, engel, günlük sınır (2), ilan başına 50 kişi.
-- ============================================================

ALTER TABLE users ADD COLUMN notif_yakin BOOLEAN NOT NULL DEFAULT TRUE;

-- Tercih denetimi: notify_user 'yakin' türünü tanısın (mesaj/başvuru/hatırlatma kuralları aynen)
CREATE OR REPLACE FUNCTION notify_user(p_user UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u users%ROWTYPE;
BEGIN
    IF p_user IS NULL THEN RETURN; END IF;
    SELECT * INTO u FROM users WHERE id = p_user;
    IF NOT FOUND OR u.status = 'banli' THEN RETURN; END IF;
    IF p_type = 'basvuru'    AND NOT u.notif_basvuru    THEN RETURN; END IF;
    IF p_type = 'mesaj'      AND NOT u.notif_mesaj      THEN RETURN; END IF;
    IF p_type = 'hatirlatma' AND NOT u.notif_hatirlatma THEN RETURN; END IF;
    IF p_type = 'yakin'      AND NOT u.notif_yakin      THEN RETURN; END IF;
    IF p_type = 'mesaj' THEN
        UPDATE notifications SET title = p_title, body = p_body, created_at = now()
         WHERE user_id = p_user AND type = 'mesaj' AND is_read = FALSE
           AND data->>'conversation_id' = p_data->>'conversation_id';
        IF FOUND THEN RETURN; END IF;
    END IF;
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (p_user, p_type, p_title, p_body, p_data);
END $$;

CREATE OR REPLACE FUNCTION trg_notify_nearby() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u RECORD; pos_keys TEXT[]; specified INT; free_slots INT; v_title TEXT; v_body TEXT; n INT := 0; pos_label TEXT;
BEGIN
    IF NEW.status <> 'acik' OR NEW.event_date < now() OR NEW.needed_count <= 0 THEN RETURN NEW; END IF;
    IF NEW.series_id IS NOT NULL AND NEW.series_id <> NEW.id THEN RETURN NEW; END IF;   -- serinin sonraki haftaları duyurulmaz

    IF NEW.kind = 'rakip' THEN
        v_title := 'Rakip arayan takım var 🆚';
        v_body := COALESCE(NEW.team_name, 'Bir takım') || ' · ' || COALESCE(NEW.format, '') || ' · ' || to_char(NEW.event_date, 'DD.MM HH24:MI') || COALESCE(' · ' || NULLIF(NEW.venue_name, ''), '');
        FOR u IN SELECT id FROM users
                  WHERE city_id = NEW.city_id AND id <> NEW.organizer_id AND status = 'aktif' AND notif_yakin
                    AND team_name IS NOT NULL AND team_name <> ''
                    AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = users.id AND b.blocked_id = NEW.organizer_id) OR (b.blocker_id = NEW.organizer_id AND b.blocked_id = users.id))
                    AND (SELECT count(*) FROM notifications nn WHERE nn.user_id = users.id AND nn.type = 'yakin' AND nn.created_at > now() - INTERVAL '24 hours') < 2
                  ORDER BY random() LIMIT 50 LOOP
            PERFORM notify_user(u.id, 'yakin', v_title, v_body, jsonb_build_object('event_id', NEW.id));
        END LOOP;
        RETURN NEW;
    END IF;

    SELECT array_agg(k) INTO pos_keys FROM jsonb_object_keys(NEW.needed_positions) k;
    SELECT COALESCE(SUM((v.value)::INT), 0) INTO specified FROM jsonb_each_text(NEW.needed_positions) v;
    free_slots := NEW.needed_count - specified;
    IF pos_keys IS NOT NULL AND array_length(pos_keys, 1) > 0 AND free_slots <= 0 THEN
        SELECT string_agg(k, ' / ') INTO pos_label FROM unnest(pos_keys) k;
        v_body := COALESCE(NULLIF(NEW.venue_name, ''), NEW.title) || ' · ' || to_char(NEW.event_date, 'DD.MM HH24:MI') || ' · ' || pos_label || ' arıyorlar';
    ELSE
        v_body := COALESCE(NULLIF(NEW.venue_name, ''), NEW.title) || ' · ' || to_char(NEW.event_date, 'DD.MM HH24:MI') || ' · ' || NEW.needed_count || ' eksik';
    END IF;
    v_title := 'Yakınında maç açıldı ⚽';

    FOR u IN SELECT id FROM users
              WHERE city_id = NEW.city_id AND id <> NEW.organizer_id AND status = 'aktif' AND notif_yakin
                AND (NEW.district_id IS NULL OR district_id IS NULL OR district_id = NEW.district_id)
                AND (free_slots > 0 OR pos_keys IS NULL OR positions && pos_keys)     -- mevki eşleşmesi
                AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = users.id AND b.blocked_id = NEW.organizer_id) OR (b.blocker_id = NEW.organizer_id AND b.blocked_id = users.id))
                AND (SELECT count(*) FROM notifications nn WHERE nn.user_id = users.id AND nn.type = 'yakin' AND nn.created_at > now() - INTERVAL '24 hours') < 2
              ORDER BY (positions && COALESCE(pos_keys, '{}')) DESC, random() LIMIT 50 LOOP
        PERFORM notify_user(u.id, 'yakin', v_title, v_body, jsonb_build_object('event_id', NEW.id));
        n := n + 1;
    END LOOP;
    RETURN NEW;
END $$;
CREATE TRIGGER events_notify_nearby AFTER INSERT ON events
    FOR EACH ROW EXECUTE FUNCTION trg_notify_nearby();

-- ============================================================
--  EKSİK VAR — 20. migrasyon: Profil düzenleme (seviye alanı)
-- ============================================================
ALTER TABLE users ADD COLUMN skill_level skill_level NOT NULL DEFAULT 'farketmez';

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

-- ============================================================
--  EKSİK VAR — 22. migrasyon: Sohbet (sabitleme, fotoğraf), "Sahadayım", itiraz organizatöre,
--  başvuru bildirimlerinin birleştirilmesi
-- ============================================================

-- a) Sabitlenmiş mesaj (grup yöneticisi / sohbeti açan)
ALTER TABLE conversations ADD COLUMN pinned_message_id BIGINT REFERENCES messages(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION pin_message(p_conversation UUID, p_message BIGINT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c conversations%ROWTYPE;
BEGIN
    SELECT * INTO c FROM conversations WHERE id = p_conversation;
    IF NOT FOUND THEN RAISE EXCEPTION 'SOHBET_YOK'; END IF;
    IF auth.uid() IS NULL OR NOT (c.created_by = auth.uid() OR EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = p_conversation AND user_id = auth.uid() AND role = 'yonetici')) THEN
        RAISE EXCEPTION 'YETKI_YOK';
    END IF;
    IF p_message IS NOT NULL AND NOT EXISTS (SELECT 1 FROM messages WHERE id = p_message AND conversation_id = p_conversation) THEN RAISE EXCEPTION 'MESAJ_YOK'; END IF;
    UPDATE conversations SET pinned_message_id = p_message WHERE id = p_conversation;
END $$;
GRANT EXECUTE ON FUNCTION pin_message(UUID, BIGINT) TO authenticated;

-- b) Fotoğraf mesajı: messages.image_url + herkese açık okunur "chat" deposu (yükleme: üyeler)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('chat', 'chat', true) ON CONFLICT (id) DO NOTHING;
        EXECUTE $q$ CREATE POLICY chat_public_read ON storage.objects FOR SELECT USING (bucket_id = 'chat') $q$;
        EXECUTE $q$ CREATE POLICY chat_member_insert ON storage.objects FOR INSERT TO authenticated
                    WITH CHECK (bucket_id = 'chat' AND (storage.foldername(name))[1] = auth.uid()::text) $q$;
    END IF;
END $$;

-- c) "Sahadayım": maçtan 2 saat önce–4 saat sonra katılımcı beyanı; organizatör yoklamada görür
ALTER TABLE participants ADD COLUMN checked_in_at TIMESTAMPTZ;
CREATE OR REPLACE FUNCTION check_in(p_event UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE;
BEGIN
    SELECT * INTO e FROM events WHERE id = p_event;
    IF NOT FOUND THEN RAISE EXCEPTION 'ETKINLIK_YOK'; END IF;
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    IF now() < e.event_date - INTERVAL '2 hours' OR now() > e.event_date + INTERVAL '4 hours' THEN RAISE EXCEPTION 'ZAMAN_DISI' USING HINT = 'Maçtan 2 saat önce ile 4 saat sonra arasında'; END IF;
    UPDATE participants SET checked_in_at = now() WHERE event_id = p_event AND user_id = auth.uid();
    IF NOT FOUND THEN RAISE EXCEPTION 'KADRODA_DEGIL'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION check_in(UUID) TO authenticated;

-- d) Yoklama itirazı önce organizatöre: bildirim + tek dokunuşla düzeltme (attendance güncellemesi zaten organizatörde)
CREATE OR REPLACE FUNCTION trg_dispute_notify_organizer() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE e events%ROWTYPE; aname TEXT;
BEGIN
    IF NEW.reason <> 'yoklama_itiraz' OR NEW.event_id IS NULL THEN RETURN NEW; END IF;
    SELECT * INTO e FROM events WHERE id = NEW.event_id;
    SELECT full_name INTO aname FROM users WHERE id = NEW.reporter_id;
    PERFORM notify_user(e.organizer_id, 'itiraz', 'Yoklama itirazı', aname || ', ' || e.title || ' için "oradaydım" diyor — yoklamayı kontrol et',
        jsonb_build_object('event_id', NEW.event_id, 'user_id', NEW.reporter_id, 'report_id', NEW.id));
    RETURN NEW;
END $$;
CREATE TRIGGER reports_dispute_notify AFTER INSERT ON reports FOR EACH ROW EXECUTE FUNCTION trg_dispute_notify_organizer();
-- Organizatör düzeltince itiraz kapanır
CREATE OR REPLACE FUNCTION trg_attendance_fix_closes_dispute() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    IF NEW.attendance = 'katildi' AND OLD.attendance = 'gelmedi' THEN
        UPDATE reports SET status = 'kapatildi', admin_note = 'Organizatör düzeltti', resolved_at = now()
         WHERE event_id = NEW.event_id AND reporter_id = NEW.user_id AND reason = 'yoklama_itiraz' AND status = 'bekliyor';
        PERFORM notify_user(NEW.user_id, 'itiraz', 'İtirazın kabul edildi ✓', 'Yoklama "katıldı" olarak düzeltildi, güvenilirliğin geri geldi', jsonb_build_object('event_id', NEW.event_id));
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER participants_fix_closes_dispute AFTER UPDATE OF attendance ON participants FOR EACH ROW EXECUTE FUNCTION trg_attendance_fix_closes_dispute();
-- Organizatör, tamamlanmış maçta da yoklamayı düzeltebilsin (itiraz için) — 30 gün içinde
CREATE OR REPLACE FUNCTION trg_attendance_timing() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ed TIMESTAMPTZ;
BEGIN
    IF NEW.attendance = 'bekleniyor' THEN RETURN NEW; END IF;
    SELECT event_date INTO ed FROM events WHERE id = NEW.event_id;
    IF now() < ed THEN RAISE EXCEPTION 'YOKLAMA_ERKEN' USING HINT = 'Yoklama etkinlik saatinden sonra alınabilir'; END IF;
    IF now() > ed + INTERVAL '30 days' THEN RAISE EXCEPTION 'YOKLAMA_GEC' USING HINT = 'Yoklama 30 gün sonra değiştirilemez'; END IF;
    RETURN NEW;
END $$;

-- e) Başvuru bildirimleri: aynı etkinliğin okunmamış başvuruları tek satırda ("3 yeni başvuru")
CREATE OR REPLACE FUNCTION notify_user(p_user UUID, p_type TEXT, p_title TEXT, p_body TEXT, p_data JSONB DEFAULT '{}'::jsonb)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u users%ROWTYPE; n INT;
BEGIN
    IF p_user IS NULL THEN RETURN; END IF;
    SELECT * INTO u FROM users WHERE id = p_user;
    IF NOT FOUND OR u.status = 'banli' THEN RETURN; END IF;
    IF p_type = 'basvuru'    AND NOT u.notif_basvuru    THEN RETURN; END IF;
    IF p_type = 'mesaj'      AND NOT u.notif_mesaj      THEN RETURN; END IF;
    IF p_type = 'hatirlatma' AND NOT u.notif_hatirlatma THEN RETURN; END IF;
    IF p_type = 'yakin'      AND NOT u.notif_yakin      THEN RETURN; END IF;
    IF p_type = 'mesaj' THEN
        UPDATE notifications SET title = p_title, body = p_body, created_at = now()
         WHERE user_id = p_user AND type = 'mesaj' AND is_read = FALSE AND data->>'conversation_id' = p_data->>'conversation_id';
        IF FOUND THEN RETURN; END IF;
    END IF;
    IF p_type = 'basvuru' AND p_title = 'Yeni başvuru' AND p_data ? 'event_id' THEN
        SELECT count(*) INTO n FROM notifications WHERE user_id = p_user AND type = 'basvuru' AND is_read = FALSE AND data->>'event_id' = p_data->>'event_id';
        IF n > 0 THEN
            UPDATE notifications SET title = (n + 1) || ' yeni başvuru', body = p_body, created_at = now(), data = data || jsonb_build_object('count', n + 1)
             WHERE user_id = p_user AND type = 'basvuru' AND is_read = FALSE AND data->>'event_id' = p_data->>'event_id';
            RETURN;
        END IF;
    END IF;
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (p_user, p_type, p_title, p_body, p_data);
END $$;

-- f) Daha eski mesajlar için yardımcı (sayfalama) — istemci doğrudan messages tablosundan okur (RLS üye)

-- g) Organizatör, kendi maçının bekleyen itirazlarını görür (reports tablosuna doğrudan erişemez)
CREATE OR REPLACE FUNCTION event_disputes(p_event UUID)
RETURNS TABLE (user_id UUID, full_name TEXT, description TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
    SELECT r.reporter_id, u.full_name::TEXT, r.description::TEXT, r.created_at
      FROM reports r JOIN users u ON u.id = r.reporter_id JOIN events e ON e.id = r.event_id
     WHERE r.event_id = p_event AND r.reason = 'yoklama_itiraz' AND r.status = 'bekliyor' AND e.organizer_id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION event_disputes(UUID) TO authenticated;

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

-- f) Data API yetkileri (Supabase 2026: yeni projelerde açıkça verilmeli;
--    satır bazında kim neyi görür sorusunu yukarıdaki RLS kuralları belirler)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON cities, categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

COMMIT;

-- ============================================================
--  EKSİK VAR — Yetki sıkılaştırma (toplu GRANT'lerden SONRA çalışmalı)
--  İç fonksiyonlar ve yönetici görünümleri istemciden çağrılamaz.
-- ============================================================
REVOKE EXECUTE ON FUNCTION _apply_sanction(UUID, user_status, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION notify_user(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION promote_from_waitlist(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION expire_waitlist_offers() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION finalize_mvp() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION send_event_reminders() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION send_availability_asks() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION auto_complete_events() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION is_banned_identifier(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON admins FROM anon, authenticated;
REVOKE ALL ON banned_identifiers FROM anon;
GRANT SELECT ON banned_identifiers TO authenticated;          -- RLS: yalnızca yönetici okur
GRANT SELECT ON v_report_queue TO authenticated;              -- security_invoker: RLS uygulanır
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
REVOKE EXECUTE ON FUNCTION send_payment_reminders() FROM PUBLIC, anon, authenticated;
