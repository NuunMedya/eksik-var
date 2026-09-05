DO $$
DECLARE n INT; ali UUID; cnk INT; kec INT; top TEXT; topn INT;
BEGIN
  SELECT count(*) INTO n FROM cities;     ASSERT n = 81,  '81 il olmalı: ' || n;
  SELECT count(*) INTO n FROM districts;  ASSERT n = 973, '973 ilçe olmalı: ' || n;
  SELECT id INTO n FROM cities WHERE name = 'Ankara';  ASSERT n = 6, 'Ankara plakası 6 olmalı';
  SELECT count(*) INTO n FROM districts WHERE city_id = 6;  ASSERT n = 25, 'Ankara 25 ilçe';
  SELECT count(*) INTO n FROM districts WHERE city_id = 34; ASSERT n = 39, 'İstanbul 39 ilçe';
  RAISE NOTICE '✓ 1  81 il, 973 ilçe; plaka = kimlik';
  INSERT INTO auth.users(email, raw_user_meta_data) VALUES ('a@i.com','{"username":"ali","full_name":"Ali","city_id":"6"}') RETURNING id INTO ali;
  SELECT id INTO cnk FROM districts WHERE city_id = 6 AND name = 'Çankaya';
  SELECT id INTO kec FROM districts WHERE city_id = 6 AND name = 'Keçiören';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); PERFORM set_config('role','authenticated', true);
  INSERT INTO events(title, category_id, city_id, district_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('A', 1, 6, cnk, ali, 'X', now() + interval '1 day', 10, 1),
           ('B', 1, 6, cnk, ali, 'X', now() + interval '2 day', 10, 1),
           ('C', 1, 6, kec, ali, 'X', now() + interval '1 day', 10, 1);
  SELECT name, open_events INTO top, topn FROM v_district_activity WHERE city_id = 6 ORDER BY open_events DESC, name LIMIT 1;
  ASSERT top = 'Çankaya' AND topn = 2, 'en aktif ilçe Çankaya (2) olmalı: ' || top || ' ' || topn;
  SELECT count(*) INTO n FROM v_district_activity WHERE city_id = 6;  ASSERT n = 25, 'görünüm tüm ilçeleri listelemeli';
  RAISE NOTICE '✓ 2  İlçeli etkinlik + aktiviteye göre sıralama görünümü';
  RAISE NOTICE 'TUM ILCE TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
