-- EKSİK VAR — Uçtan uca test senaryosu (veri ROLLBACK ile temizlenir)
BEGIN;

DO $$
DECLARE
    v_org   UUID;  -- organizatör
    v_veli  UUID;  -- başvuran
    v_event UUID;
    v_appl  UUID;
    v_group UUID;
    v_cnt   INT;
    v_stat  event_status;
BEGIN
    -- 1) Kayıt ol
    INSERT INTO users (phone, username, full_name, city_id, password_hash)
    VALUES ('+905550000001', 'ali_organizator', 'Ali Yılmaz', 1, 'hash1') RETURNING id INTO v_org;
    INSERT INTO users (phone, username, full_name, city_id, password_hash)
    VALUES ('+905550000002', 'veli_kaleci', 'Veli Demir', 1, 'hash2') RETURNING id INTO v_veli;
    RAISE NOTICE '[OK] 1. Kullanici kaydi';

    -- 2) Organizatör "2 eksik var" talebi açar
    INSERT INTO events (organizer_id, category_id, city_id, title, venue_name,
                        event_date, total_capacity, needed_count, price_per_person)
    VALUES (v_org, 1, 1, 'Çarşamba Halı Saha', 'Yıldız Halı Saha',
            now() + interval '2 days', 14, 2, 150) RETURNING id INTO v_event;

    SELECT id INTO v_group FROM conversations WHERE event_id = v_event AND type = 'grup';
    ASSERT v_group IS NOT NULL, 'HATA: grup sohbeti otomatik olusmadi';
    ASSERT EXISTS (SELECT 1 FROM conversation_members
                   WHERE conversation_id = v_group AND user_id = v_org AND role = 'yonetici'),
           'HATA: organizator gruba yonetici olarak eklenmedi';
    RAISE NOTICE '[OK] 2. Etkinlik + otomatik grup sohbeti (organizator yonetici)';

    -- 3) Veli başvurur → birebir sohbet otomatik açılmalı
    INSERT INTO applications (event_id, applicant_id, message)
    VALUES (v_event, v_veli, 'Kaleci lazımsa ben varım') RETURNING id INTO v_appl;

    ASSERT (SELECT conversation_id FROM applications WHERE id = v_appl) IS NOT NULL,
           'HATA: birebir sohbet olusmadi';
    RAISE NOTICE '[OK] 3. Basvuru + otomatik birebir sohbet';

    -- 3b) Organizatör kendi etkinliğine başvuramamalı
    BEGIN
        INSERT INTO applications (event_id, applicant_id) VALUES (v_event, v_org);
        RAISE EXCEPTION 'HATA: organizator kendine basvurabildi!';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%başvuramazsınız%' THEN
            RAISE NOTICE '[OK] 3b. Organizatorun kendine basvurusu engellendi';
        ELSE RAISE; END IF;
    END;

    -- 4) ÇİFT ONAY
    UPDATE applications SET organizer_approved = TRUE, organizer_approved_at = now() WHERE id = v_appl;
    UPDATE applications SET applicant_approved = TRUE, applicant_approved_at = now() WHERE id = v_appl;

    ASSERT (SELECT status FROM applications WHERE id = v_appl) = 'onaylandi',
           'HATA: basvuru kesinlesmedi';
    SELECT filled_count INTO v_cnt FROM events WHERE id = v_event;
    ASSERT v_cnt = 1, 'HATA: kontenjan artmadi';
    ASSERT EXISTS (SELECT 1 FROM participants WHERE event_id = v_event AND user_id = v_veli),
           'HATA: katilimci olusmadi';
    ASSERT EXISTS (SELECT 1 FROM conversation_members WHERE conversation_id = v_group AND user_id = v_veli),
           'HATA: katilimci grup sohbetine eklenmedi';
    ASSERT EXISTS (SELECT 1 FROM messages WHERE conversation_id = v_group AND type = 'sistem'),
           'HATA: sistem mesaji dusmedi';
    RAISE NOTICE '[OK] 4. Cift onay -> kontenjan doldu, gruba eklendi, sistem mesaji dustu';

    -- 5) Grup mesajlaşması
    INSERT INTO messages (conversation_id, sender_id, content) VALUES (v_group, v_org, 'Herkes 20:00''de sahada olsun');
    INSERT INTO messages (conversation_id, sender_id, content) VALUES (v_group, v_veli, 'Tamamdır hocam 👍');
    RAISE NOTICE '[OK] 5. Grup mesajlasmasi';

    -- 6) Etkinlik tamamlandı, yoklama alındı
    UPDATE events SET status = 'tamamlandi' WHERE id = v_event;
    UPDATE participants SET attendance = 'katildi' WHERE event_id = v_event AND user_id = v_veli;
    ASSERT (SELECT events_joined FROM users WHERE id = v_veli) = 1, 'HATA: katilim sayaci artmadi';
    ASSERT (SELECT reliability_pct FROM users WHERE id = v_veli) = 100.0, 'HATA: guvenilirlik hesaplanmadi';
    RAISE NOTICE '[OK] 6. Yoklama -> guvenilirlik %%100 hesaplandi';

    -- 7) Puanlama (karşılıklı)
    INSERT INTO ratings (event_id, rater_id, rated_id, score, comment)
    VALUES (v_event, v_org, v_veli, 5, 'Süper kaleci, dakikti');
    INSERT INTO ratings (event_id, rater_id, rated_id, score, comment)
    VALUES (v_event, v_veli, v_org, 4, 'Organizasyon iyiydi');
    ASSERT (SELECT rating_avg FROM users WHERE id = v_veli) = 5.00, 'HATA: puan ortalamasi guncellenmedi';
    ASSERT (SELECT rating_avg FROM users WHERE id = v_org)  = 4.00, 'HATA: organizator puani guncellenmedi';
    RAISE NOTICE '[OK] 7. Karsilikli puanlama -> ortalamalar guncellendi';

    -- 7b) Dışarıdan biri puan verememeli
    BEGIN
        INSERT INTO users (phone, username, full_name) VALUES ('+905550000003', 'yabanci', 'Yabancı Kişi') RETURNING id INTO v_org;
        INSERT INTO ratings (event_id, rater_id, rated_id, score) VALUES (v_event, v_org, v_veli, 1);
        RAISE EXCEPTION 'HATA: etkinlikte olmayan biri puan verebildi!';
    EXCEPTION WHEN OTHERS THEN
        IF SQLERRM LIKE '%puan verebilir%' THEN
            RAISE NOTICE '[OK] 7b. Disaridan puanlama engellendi';
        ELSE RAISE; END IF;
    END;

    RAISE NOTICE '=== TUM TESTLER BASARILI ===';
END $$;

ROLLBACK;
