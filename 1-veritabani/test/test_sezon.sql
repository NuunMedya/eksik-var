DO $$
DECLARE ali UUID; zey UUID; cem UUID; ser UUID; ev2 UUID; app UUID; g1 UUID; n INT; st TEXT; j JSONB; r RECORD;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905700700001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905700700002', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905700700003', now(), '{"username":"cem","full_name":"Cem"}') RETURNING id INTO cem;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, district_id, organizer_id, venue_name, event_date, total_capacity, needed_count, recurrence, price_per_person)
    VALUES ('Seri', 1, 6, 1130, ali, 'Yıldız Halı Saha', now() + interval '1 hour', 10, 2, 'haftalik', 150) RETURNING id INTO ser;
  INSERT INTO guests(owner_id, series_id, name) VALUES (ali, ser, 'Hasan') RETURNING id INTO g1;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); INSERT INTO applications(event_id, applicant_id) VALUES (ser, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); UPDATE applications SET applicant_approved = true WHERE id = app;

  -- 1) Kayıtlı saha: ilan açılınca kaydedildi; ikinci ilanda sayaç 2
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT used_count INTO n FROM saved_venues WHERE user_id = ali AND name = 'Yıldız Halı Saha';  ASSERT n = 1, 'saha kaydı';
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Tek', 1, 6, ali, 'Yıldız Halı Saha', now() + interval '3 days', 10, 2) RETURNING id INTO ev2;
  SELECT used_count INTO n FROM saved_venues WHERE user_id = ali AND name = 'Yıldız Halı Saha';  ASSERT n = 2, 'sayaç 2';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM saved_venues;  ASSERT n = 0, 'sahalar kişisel';
  RAISE NOTICE '✓ 1  Kayıtlı sahalar';

  -- 2) Yoklama kodu: organizatör açar (maç saatine 1 saat var), oyuncu doğru kodla sahadayım; yanlış kod reddedilir
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT open_checkin_code(ser) INTO st;  ASSERT length(st) = 4, 'kod 4 hane';
  ASSERT open_checkin_code(ser) = st, 'aynı kod tekrar';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN PERFORM check_in_with_code(ser, '0000'); RAISE EXCEPTION 'yanlış kod';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%KOD_YANLIS%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM check_in_with_code(ser, st);
  SELECT count(*) INTO n FROM participants WHERE event_id = ser AND user_id = zey AND checked_in_at IS NOT NULL;  ASSERT n = 1, 'kodla sahadayım';
  RAISE NOTICE '✓ 2  Yoklama kodu';

  -- 3) Gol/asist: tamamlanmadan giriş yok; tamamlanınca organizatör girer; maçta olmayan reddedilir
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  BEGIN PERFORM set_match_stat(ser, zey, NULL, 2, 1); RAISE EXCEPTION 'bitmeden istatistik';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%MAC_TAMAMLANMADI%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  UPDATE events SET event_date = now() - interval '3 hours' WHERE id = ser;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE guest_records SET attendance = 'katildi' WHERE event_id = ser AND guest_id = g1;
  PERFORM complete_event(ser);
  PERFORM set_match_stat(ser, zey, NULL, 2, 1);
  PERFORM set_match_stat(ser, NULL, g1, 1, 0);
  PERFORM set_match_stat(ser, ali, NULL, 0, 2);
  PERFORM set_match_stat(ser, zey, NULL, 3, 1);   -- güncelleme
  BEGIN PERFORM set_match_stat(ser, cem, NULL, 1, 0); RAISE EXCEPTION 'maçta olmayan';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%OYUNCU_MACTA_DEGIL%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN PERFORM set_match_stat(ser, zey, NULL, 9, 9); RAISE EXCEPTION 'oyuncu kendi giremez';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YETKI_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 3  Gol/asist girişi';

  -- 4) Sezon tablosu: Zeynep 3 gol 1 asist, Hasan (misafir) 1 gol, Ali 2 asist; sıralama gole göre
  SELECT * INTO r FROM season_table(ser) LIMIT 1;
  ASSERT r.name = 'Zeynep' AND r.goals = 3 AND r.assists = 1 AND r.matches = 1, 'ilk sıra Zeynep: ' || r.name || ' ' || r.goals;
  SELECT count(*) INTO n FROM season_table(ser) WHERE is_guest;  ASSERT n = 1, 'misafir tabloda';
  SELECT player_totals(zey) INTO j;  ASSERT (j->>'goals')::INT = 3 AND (j->>'assists')::INT = 1, 'profil toplamları: ' || j::text;
  RAISE NOTICE '✓ 4  Sezon tablosu ve profil toplamları';

  RAISE NOTICE 'TUM SEZON TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
