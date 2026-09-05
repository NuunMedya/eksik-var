DO $$
DECLARE ali UUID; z UUID; c UUID; d UUID; ev UUID; app UUID; ok BOOLEAN; n INT;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905200000001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905200000002', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO z;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905200000003', now(), '{"username":"cem","full_name":"Cem"}') RETURNING id INTO c;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905200000004', now(), '{"username":"deniz","full_name":"Deniz"}') RETURNING id INTO d;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);

  -- 1) Mevki toplamı kontenjanı aşamaz
  BEGIN
    INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, needed_positions)
      VALUES ('Hatalı', 1, 6, ali, 'X', now() + interval '1 day', 14, 2, '{"kaleci":2,"defans":1}');
    RAISE EXCEPTION 'toplam fazla kabul edilmemeliydi';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%MEVKI_TOPLAMI_FAZLA%' THEN NULL; ELSE RAISE; END IF;
  END;
  -- 3 eksik: 1 kaleci + 1 defans + 1 serbest
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, needed_positions)
    VALUES ('Çarşamba', 1, 6, ali, 'X', now() + interval '1 day', 14, 3, '{"kaleci":1,"defans":1}') RETURNING id INTO ev;
  RAISE NOTICE '✓ 1  Mevki kotaları: toplam kontrolü';

  -- 2) Kaleci başvurusu + çift onay → kaleci dolu; ikinci kaleci başvurusu reddedilir
  PERFORM set_config('request.jwt.claim.sub', z::text, true);
  INSERT INTO applications(event_id, applicant_id, position) VALUES (ev, z, 'kaleci') RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', z::text, true);    UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT filled INTO n FROM v_event_position_fill WHERE event_id = ev AND position = 'kaleci';  ASSERT n = 1, 'kaleci dolu görünmeli';
  PERFORM set_config('request.jwt.claim.sub', c::text, true);
  BEGIN
    INSERT INTO applications(event_id, applicant_id, position) VALUES (ev, c, 'kaleci');
    RAISE EXCEPTION 'dolu mevkiye başvuru kabul edilmemeliydi';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%MEVKI_DOLU%' THEN NULL; ELSE RAISE; END IF;
  END;
  RAISE NOTICE '✓ 2  Dolu mevkiye başvuru engellendi';

  -- 3) Serbest kontenjan: forvet (kotasız) 1 kişi için açık, ikincisi dolu
  INSERT INTO applications(event_id, applicant_id, position) VALUES (ev, c, 'forvet') RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', c::text, true);    UPDATE applications SET applicant_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', d::text, true);
  BEGIN
    INSERT INTO applications(event_id, applicant_id, position) VALUES (ev, d, 'orta');
    RAISE EXCEPTION 'serbest kontenjan dolmuşken kabul edilmemeliydi';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%MEVKI_DOLU%' THEN NULL; ELSE RAISE; END IF;
  END;
  -- defans hâlâ açık
  ASSERT position_available(ev, 'defans') = true, 'defans açık olmalı';
  INSERT INTO applications(event_id, applicant_id, position) VALUES (ev, d, 'defans') RETURNING id INTO app;
  RAISE NOTICE '✓ 3  Serbest kontenjan ve kotalı mevki ayrımı';

  -- 4) Onay anında yarış: iki defans başvurusu, ilki onaylanınca ikincisinin son onayı reddedilir
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', d::text, true);    UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT filled_count INTO n FROM events WHERE id = ev;  ASSERT n = 3, '3 kişi dolmalı';
  RAISE NOTICE '✓ 4  Kadro mevki bazında doldu';

  -- 5) Kullanıcı mevkileri
  PERFORM set_config('request.jwt.claim.sub', z::text, true);
  UPDATE users SET positions = ARRAY['kaleci','defans'] WHERE id = z;
  SELECT array_length(positions, 1) INTO n FROM users WHERE id = z;  ASSERT n = 2, 'mevkiler kaydedilmeli';
  RAISE NOTICE '✓ 5  Profil mevkileri';

  RAISE NOTICE 'TUM MEVKI TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
