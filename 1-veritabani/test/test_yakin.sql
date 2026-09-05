DO $$
DECLARE ali UUID; kal UUID; forv UUID; uzak UUID; kapali UUID; kaptan UUID; ev UUID; n INT; i INT;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905300300001', now(), '{"username":"ali","full_name":"Ali","city_id":"6","district_id":"1130"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905300300002', now(), '{"username":"kaleci","full_name":"Kaleci Kemal","city_id":"6","district_id":"1130"}') RETURNING id INTO kal;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905300300003', now(), '{"username":"forvet","full_name":"Forvet Fatih","city_id":"6","district_id":"1130"}') RETURNING id INTO forv;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905300300004', now(), '{"username":"uzak","full_name":"Uzak Umut","city_id":"6","district_id":"1134"}') RETURNING id INTO uzak;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905300300005', now(), '{"username":"kapali","full_name":"Kapalı Kaan","city_id":"6","district_id":"1130"}') RETURNING id INTO kapali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905300300006', now(), '{"username":"kaptan","full_name":"Kaptan Koray","city_id":"6","district_id":"1134"}') RETURNING id INTO kaptan;
  UPDATE users SET positions = ARRAY['kaleci'] WHERE id = kal;
  UPDATE users SET positions = ARRAY['forvet'] WHERE id = forv;
  UPDATE users SET positions = ARRAY['kaleci'] WHERE id = uzak;
  UPDATE users SET positions = ARRAY['kaleci'], notif_yakin = false WHERE id = kapali;
  UPDATE users SET team_name = 'Etimesgut Boğaları' WHERE id = kaptan;

  -- 1) Kaleci ilanı (tüm eksikler mevkiye bağlı): aynı ilçedeki kaleci alır; forvet, başka ilçedeki kaleci, tercihi kapalı olan almaz
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, district_id, organizer_id, venue_name, event_date, total_capacity, needed_count, needed_positions)
    VALUES ('Çarşamba', 1, 6, 1130, ali, 'Yıldız Halı Saha', now() + interval '2 days', 14, 1, '{"kaleci":1}') RETURNING id INTO ev;
  PERFORM set_config('request.jwt.claim.sub', kal::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin' AND body LIKE 'Yıldız Halı Saha%kaleci arıyorlar';  ASSERT n = 1, 'kaleciye bildirim: ' || n;
  PERFORM set_config('request.jwt.claim.sub', forv::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin';  ASSERT n = 0, 'forvete gitmemeli';
  PERFORM set_config('request.jwt.claim.sub', uzak::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin';  ASSERT n = 0, 'başka ilçeye gitmemeli';
  PERFORM set_config('request.jwt.claim.sub', kapali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin';  ASSERT n = 0, 'tercihi kapalıya gitmemeli';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin';  ASSERT n = 0, 'organizatöre gitmemeli';
  RAISE NOTICE '✓ 1  Mevki + ilçe + tercih eşleşmesi';

  -- 2) Serbest kontenjanlı ilan: ilçedeki herkes (forvet dahil) alır
  INSERT INTO events(title, category_id, city_id, district_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Cuma', 1, 6, 1130, ali, 'GoldSaha', now() + interval '3 days', 14, 2) RETURNING id INTO ev;
  PERFORM set_config('request.jwt.claim.sub', forv::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin' AND body LIKE 'GoldSaha%2 eksik';  ASSERT n = 1, 'serbest kontenjan herkese';
  RAISE NOTICE '✓ 2  Serbest kontenjan → ilçedeki herkes';

  -- 3) Günlük sınır: kaleci bugün 2 bildirim aldı; üçüncü ilan gitmez
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, district_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Cumartesi', 1, 6, 1130, ali, 'Arena', now() + interval '4 days', 14, 2);
  PERFORM set_config('request.jwt.claim.sub', kal::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin';  ASSERT n = 2, 'günde en fazla 2: ' || n;
  RAISE NOTICE '✓ 3  Günlük sınır';

  -- 4) Engel varsa gitmez (günlük sayaç sıfırlanmış forvet)
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  DELETE FROM notifications WHERE user_id = forv;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', forv::text, true);
  INSERT INTO blocks(blocker_id, blocked_id) VALUES (forv, ali);
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, district_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Pazar', 1, 6, 1130, ali, 'Yıldız', now() + interval '5 days', 14, 2);
  PERFORM set_config('request.jwt.claim.sub', forv::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin';  ASSERT n = 0, 'engelledikten sonra bildirim yok: ' || n;
  RAISE NOTICE '✓ 4  Engel';

  -- 5) Rakip ilanı: şehirdeki kaptanlara (takım adı olanlar) gider, ilçe fark etmez
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, district_id, organizer_id, venue_name, event_date, total_capacity, needed_count, kind, team_name, format)
    VALUES ('Rakip', 1, 6, 1130, ali, 'Yıldız', now() + interval '6 days', 7, 1, 'rakip', 'Çankaya Yıldızları', '7v7');
  PERFORM set_config('request.jwt.claim.sub', kaptan::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin' AND title LIKE 'Rakip arayan%';  ASSERT n = 1, 'kaptana rakip bildirimi';
  PERFORM set_config('request.jwt.claim.sub', uzak::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin' AND title LIKE 'Rakip arayan%';  ASSERT n = 0, 'takımı olmayana gitmez';
  RAISE NOTICE '✓ 5  Rakip ilanı → kaptanlar';

  -- 6) Serinin sonraki haftası duyurulmaz
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, district_id, organizer_id, venue_name, event_date, total_capacity, needed_count, recurrence)
    VALUES ('Seri', 1, 6, 1134, ali, 'X', now() + interval '2 days', 14, 2, 'haftalik') RETURNING id INTO ev;
  PERFORM set_config('request.jwt.claim.sub', uzak::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin' AND body LIKE 'X%';  ASSERT n = 1, 'serinin ilk haftası duyurulur';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, district_id, organizer_id, venue_name, event_date, total_capacity, needed_count, recurrence, series_id)
    VALUES ('Seri', 1, 6, 1134, ali, 'X', now() + interval '9 days', 14, 2, 'haftalik', ev);   -- ikinci hafta
  PERFORM set_config('request.jwt.claim.sub', uzak::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yakin' AND body LIKE 'X%';  ASSERT n = 1, 'sonraki hafta duyurulmaz';
  RAISE NOTICE '✓ 6  Seri tekrarları sessiz';

  RAISE NOTICE 'TUM YAKIN TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
