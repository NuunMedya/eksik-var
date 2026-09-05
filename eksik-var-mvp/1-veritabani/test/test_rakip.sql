DO $$
DECLARE ali UUID; oz UUID; mur UUID; ev UUID; app UUID; n INT; st TEXT;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905500000001', now(), '{"username":"ali","full_name":"Ali Yılmaz"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905500000002', now(), '{"username":"ozan","full_name":"Ozan Demir"}') RETURNING id INTO oz;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905500000003', now(), '{"username":"murat","full_name":"Murat Şahin"}') RETURNING id INTO mur;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);

  -- 1) Takım adı olmadan rakip ilanı açılamaz; açılınca eksik = 1, mevki boş, varsayılanlar dolu
  BEGIN
    INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, kind)
      VALUES ('Rakip', 1, 6, ali, 'Yıldız', now() + interval '2 days', 7, 5, 'rakip');
    RAISE EXCEPTION 'takım adı zorunlu olmalı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%TAKIM_ADI%' THEN NULL; ELSE RAISE; END IF; END;
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, needed_positions, kind, team_name, format)
    VALUES ('Cumartesi 20:00 rakip', 1, 6, ali, 'Yıldız', now() + interval '2 days', 7, 5, '{"kaleci":1}', 'rakip', 'Çankaya Yıldızları', '7v7') RETURNING id INTO ev;
  SELECT needed_count, venue_mode INTO n, st FROM events WHERE id = ev;  ASSERT n = 1 AND st = 'farketmez', 'rakip varsayılanları';
  SELECT count(*) INTO n FROM events WHERE id = ev AND needed_positions = '{}'::jsonb;  ASSERT n = 1, 'mevki boş';
  RAISE NOTICE '✓ 1  Rakip ilanı kuralları';

  -- 2) Ozan'ın takımı teklif verir → organizatöre "Yeni rakip teklifi"
  PERFORM set_config('request.jwt.claim.sub', oz::text, true);
  UPDATE users SET team_name = 'Kızılay Gücü' WHERE id = oz;
  INSERT INTO applications(event_id, applicant_id, message) VALUES (ev, oz, '7 kişiyiz, saha sizde olur') RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE title = 'Yeni rakip teklifi' AND body LIKE 'Kızılay Gücü takımı%';  ASSERT n = 1, 'rakip teklifi bildirimi';
  RAISE NOTICE '✓ 2  Rakip teklifi → bildirim';

  -- 3) Çift onay → "Rakip bulundu": ilan doldu, iki tarafa bildirim, kaptan sohbetine sistem mesajı; üçüncü takım teklif veremez
  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', oz::text, true);
  UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT status::text INTO st FROM events WHERE id = ev;  ASSERT st = 'doldu', 'rakip bulundu (doldu)';
  SELECT count(*) INTO n FROM notifications WHERE title LIKE 'Maç ayarlandı%';  ASSERT n = 1, 'teklif verene maç ayarlandı';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE title LIKE 'Rakip bulundu%';  ASSERT n = 1, 'organizatöre rakip bulundu';
  SELECT count(*) INTO n FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.event_id = ev AND c.type = 'grup' AND m.content LIKE 'Maç kesinleşti%';  ASSERT n = 1, 'kaptan sohbetine sistem mesajı';
  PERFORM set_config('request.jwt.claim.sub', mur::text, true);
  BEGIN INSERT INTO applications(event_id, applicant_id) VALUES (ev, mur); RAISE EXCEPTION 'üçüncü takım teklif verememeli';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%kapalı%' OR SQLERRM LIKE '%MEVKI_DOLU%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 3  Çift onay → maç kesinleşti';

  -- 4) Oyuncu ilanları etkilenmedi: normal etkinlik hâlâ eski davranışta
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Normal', 1, 6, ali, 'X', now() + interval '2 days', 14, 3) RETURNING id INTO ev;
  SELECT needed_count, kind::text INTO n, st FROM events WHERE id = ev;  ASSERT n = 3 AND st = 'oyuncu', 'oyuncu ilanı korunmalı';
  RAISE NOTICE '✓ 4  Oyuncu ilanları aynı';

  RAISE NOTICE 'TUM RAKIP TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
