DO $$
DECLARE ali UUID; zey UUID; cem UUID; ev UUID; app UUID; n INT; st TEXT; ph TEXT;
BEGIN
  -- 1) Telefonla kayıt: profil telefonlu ve doğrulanmış, ilçe metadata'dan
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data)
    VALUES ('905321112233', now(), '{"username":"ali","full_name":"Ali","city_id":"6","district_id":"1130"}') RETURNING id INTO ali;
  SELECT phone, is_verified::text, district_id INTO ph, st, n FROM users WHERE id = ali;
  ASSERT ph = '905321112233' AND st = 'true' AND n = 1130, 'telefonlu profil: ' || ph || ' ' || st;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905324445566', now(), '{"username":"zeynep","full_name":"Zeynep","city_id":"6"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905327778899', now(), '{"username":"cem","full_name":"Cem","city_id":"6"}') RETURNING id INTO cem;
  RAISE NOTICE '✓ 1  Telefonla kayıt → doğrulanmış profil, ilçe';

  -- 2) Ali etkinlik açar, Zeynep kadroya girer (ban temizliğini test için)
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); PERFORM set_config('role','authenticated', true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Yarın Maç', 1, 6, ali, 'X', now() + interval '1 day', 10, 2) RETURNING id INTO ev;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT filled_count INTO n FROM events WHERE id = ev;  ASSERT n = 1, 'Zeynep kadroda';
  RAISE NOTICE '✓ 2  Ön koşul: etkinlik + kadro hazır';

  -- 3) İstemci ban_user çağıramaz
  BEGIN
    PERFORM ban_user(ali, 'deneme');
    RAISE EXCEPTION 'istemci ban atamamalı';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    IF SQLERRM LIKE '%YETKI_YOK%' OR SQLERRM LIKE '%permission denied%' THEN RAISE NOTICE '✓ 3  İstemci ban_user çağıramıyor'; ELSE RAISE; END IF;
  END;

  -- 4) Yönetici (JWT'siz) Zeynep'i banlar: durum, PII silinir, özet kaydı, kadro temizliği, auth banı
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  PERFORM ban_user(zey, 'taciz');
  SELECT status::text INTO st FROM users WHERE id = zey;  ASSERT st = 'banli', 'durum banli olmalı';
  SELECT phone INTO ph FROM users WHERE id = zey;         ASSERT ph IS NULL, 'telefon silinmeli';
  SELECT count(*) INTO n FROM banned_identifiers WHERE id_hash = ident_hash('905324445566');  ASSERT n = 1, 'telefon özeti listede olmalı';
  SELECT count(*) INTO n FROM participants WHERE event_id = ev AND user_id = zey;  ASSERT n = 0, 'kadrodan çıkarılmalı';
  SELECT filled_count INTO n FROM events WHERE id = ev;   ASSERT n = 0, 'kontenjan açılmalı';
  SELECT count(*) INTO n FROM conversation_members WHERE user_id = zey;  ASSERT n = 0, 'sohbetlerden çıkarılmalı';
  SELECT count(*) INTO n FROM auth.users WHERE id = zey AND banned_until > now();  ASSERT n = 1, 'auth banı konmalı';
  RAISE NOTICE '✓ 4  Ban: durum, PII silme, özet kaydı, kadro/sohbet temizliği, auth banı';

  -- 5) Aynı numarayla yeni kayıt reddedilir (farklı biçimde yazılsa da)
  BEGIN
    INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('+905324445566', now(), '{"username":"zeynep2","full_name":"Z"}');
    RAISE EXCEPTION 'yasaklı numara kayıt olamamalı';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE '%HESAP_YASAKLI%' THEN RAISE NOTICE '✓ 5  Yasaklı numarayla yeniden kayıt engellendi'; ELSE RAISE; END IF;
  END;

  -- 6) Banlı kullanıcı başkalarına görünmez; banlı yazamaz (RLS aktiflik şartı)
  PERFORM set_config('request.jwt.claim.sub', cem::text, true); PERFORM set_config('role','authenticated', true);
  SELECT count(*) INTO n FROM users WHERE id = zey;  ASSERT n = 0, 'banlı profil görünmemeli';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN
    INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
      VALUES ('Banlı', 1, 6, zey, 'X', now() + interval '1 day', 10, 1);
    RAISE EXCEPTION 'banlı etkinlik açamamalı';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '✓ 6  Banlı: görünmez ve yazamaz';
  END;

  -- 7) Otomatik askı: farklı 3 kişi Cem'i aynı nedenle şikayet eder → askıda, 7 gün
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  PERFORM reinstate_user(zey);  -- test için Zeynep'i geri al (şikayetçi olsun)
  PERFORM set_config('role','authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO reports(reporter_id, reported_user_id, reason) VALUES (ali, cem, 'taciz');
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO reports(reporter_id, reported_user_id, reason) VALUES (zey, cem, 'taciz');
  SELECT status::text INTO st FROM users WHERE id = cem;  ASSERT st = 'aktif', '2 şikayette hâlâ aktif';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO reports(reporter_id, reported_user_id, reason, description) VALUES (ali, cem, 'taciz', 'tekrar');  -- aynı kişi: sayılmaz
  SELECT status::text INTO st FROM users WHERE id = cem;  ASSERT st = 'aktif', 'aynı kişinin ikinci şikayeti sayılmaz';
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905320001122', now(), '{"username":"deniz","full_name":"Deniz"}') RETURNING id INTO app;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', app::text, true);
  INSERT INTO reports(reporter_id, reported_user_id, reason) VALUES (app, cem, 'taciz');
  SELECT status::text, (suspended_until > now() + interval '6 days')::text INTO st, ph FROM users WHERE id = cem;
  ASSERT st = 'askida' AND ph = 'true', 'üçüncü farklı şikayette askıya alınmalı: ' || st;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN
    INSERT INTO conversations(type, created_by) VALUES ('birebir', cem);
    RAISE EXCEPTION 'askıdaki yazamamalı';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '✓ 7  Otomatik askı: 3 farklı şikayet → 7 gün askı, yazamaz';
  END;

  -- 8) İnceleme kuyruğu görünümü
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  SELECT count(*) INTO n FROM v_report_queue WHERE reported_username = 'cem';  ASSERT n = 4, 'kuyrukta 4 şikayet: ' || n;
  RAISE NOTICE '✓ 8  İnceleme kuyruğu';

  RAISE NOTICE 'TUM TELEFON/YAPTIRIM TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
