DO $$
DECLARE ali UUID; zey UUID; cem UUID; ser UUID; nxt UUID; g1 UUID; g2 UUID; app UUID; n INT; s INT; b BOOLEAN;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905500500001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905500500002', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905500500003', now(), '{"username":"cem","full_name":"Cem"}') RETURNING id INTO cem;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, price_per_person, recurrence)
    VALUES ('Seri', 1, 6, ali, 'X', now() - interval '2 hours', 14, 4, 150, 'haftalik') RETURNING id INTO ser;

  -- 1) Misafir ekle (seri): bu haftaya kayıt oluşur; eksik önerisi düşer
  INSERT INTO guests(owner_id, series_id, name) VALUES (ali, ser, 'Hasan Kara') RETURNING id INTO g1;
  INSERT INTO guests(owner_id, series_id, name) VALUES (ali, ser, 'Mehmet Aydın') RETURNING id INTO g2;
  SELECT count(*) INTO n FROM guest_records WHERE event_id = ser;  ASSERT n = 2, 'iki misafir kaydı';
  SELECT amount INTO s FROM guest_records WHERE event_id = ser AND guest_id = g1;  ASSERT s = 150, 'ücret misafire de';
  -- kadro: Ali + 2 misafir = 3 → 14 - 3 = 11 eksik önerisi (needed 4, filled 0 → GREATEST(11,0)=11)
  SELECT suggested_needed(ser) INTO s;  ASSERT s = 11, 'öneri misafirleri sayar: ' || s;
  UPDATE guest_records SET available = false WHERE event_id = ser AND guest_id = g2;
  SELECT suggested_needed(ser) INTO s;  ASSERT s = 12, 'bu hafta yok denen misafir sayılmaz: ' || s;
  RAISE NOTICE '✓ 1  Misafir ekleme ve eksik önerisi';

  -- 2) Görünürlük: grup üyesi (Zeynep) okur, yabancı (Cem) göremez; yabancı yazamaz
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ser, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT count(*) INTO n FROM v_event_guests WHERE event_id = ser;  ASSERT n = 2, 'üye misafirleri görür';
  UPDATE guest_records SET attendance = 'katildi' WHERE event_id = ser;  GET DIAGNOSTICS n = ROW_COUNT;  ASSERT n = 0, 'üye yoklama yazamaz';
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  SELECT count(*) INTO n FROM v_event_guests WHERE event_id = ser;  ASSERT n = 0, 'yabancı göremez';
  BEGIN INSERT INTO guests(owner_id, series_id, name) VALUES (cem, ser, 'Sahte'); RAISE EXCEPTION 'yabancı ekleyememeli';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN NULL; END;
  RAISE NOTICE '✓ 2  Görünürlük ve yazma yetkisi';

  -- 3) Yoklama ve ödeme: organizatör işaretler
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE guest_records SET attendance = 'gelmedi' WHERE event_id = ser AND guest_id = g1;
  UPDATE guest_records SET payment_status = 'odendi' WHERE event_id = ser AND guest_id = g1;
  SELECT count(*) INTO n FROM v_event_guests WHERE event_id = ser AND guest_id = g1 AND attendance = 'gelmedi' AND payment_status = 'odendi';  ASSERT n = 1, 'yoklama/ödeme kaydı';
  RAISE NOTICE '✓ 3  Misafir yoklama ve ödeme';

  -- 4) Maç tamamlanınca gelecek hafta açılır, misafirler taşınır (bu hafta yok denen dahil, varsayılan var)
  PERFORM complete_event(ser);
  SELECT id INTO nxt FROM events WHERE series_id = ser AND id <> ser;
  ASSERT nxt IS NOT NULL, 'gelecek hafta açılmalı';
  SELECT count(*) INTO n FROM guest_records WHERE event_id = nxt AND available;  ASSERT n = 2, 'misafirler yeni haftaya taşınmalı: ' || n;
  RAISE NOTICE '✓ 4  Seride otomatik taşıma';

  -- 5) Misafir silinince kayıtları da gider; tek maça özel misafir
  DELETE FROM guests WHERE id = g2;
  SELECT count(*) INTO n FROM guest_records WHERE guest_id = g2;  ASSERT n = 0, 'kayıtlar silinmeli';
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, price_per_person)
    VALUES ('Tek', 1, 6, ali, 'X', now() + interval '2 days', 10, 2, 100) RETURNING id INTO app;
  INSERT INTO guests(owner_id, event_id, name) VALUES (ali, app, 'Misafir Tek');
  SELECT count(*) INTO n FROM guest_records WHERE event_id = app AND amount = 100;  ASSERT n = 1, 'tek maç misafiri';
  RAISE NOTICE '✓ 5  Silme ve tek maç misafiri';

  RAISE NOTICE 'TUM MISAFIR TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
