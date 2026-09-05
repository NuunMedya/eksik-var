DO $$
DECLARE ali UUID; zey UUID; cem UUID; ev UUID; grp UUID; app UUID; pid UUID; n INT;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905700000001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905700000002', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905700000003', now(), '{"username":"cem","full_name":"Cem"}') RETURNING id INTO cem;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Maç', 1, 6, ali, 'X', now() + interval '2 days', 10, 2) RETURNING id INTO ev;
  grp := group_conversation_for(ev);
  -- Zeynep kadroya girsin (grup üyesi)
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);  UPDATE applications SET applicant_approved = true WHERE id = app;

  -- 1) Üye olmayan anket açamaz; üye açar → sohbete mesaj düşer
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN PERFORM create_poll(grp, 'Gün?', '[{"id":"a","text":"Cuma"},{"id":"b","text":"Cumartesi"}]'::jsonb); RAISE EXCEPTION 'üye olmayan açamamalı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YETKI_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT create_poll(grp, 'Bu hafta hangi gün?', '[{"id":"a","text":"Cuma"},{"id":"b","text":"Cumartesi"},{"id":"c","text":"Pazar"}]'::jsonb, false) INTO pid;
  SELECT count(*) INTO n FROM messages WHERE conversation_id = grp AND poll_id = pid AND content LIKE '📊%';  ASSERT n = 1, 'anket mesajı';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM polls WHERE id = pid;  ASSERT n = 1, 'üye anketi görmeli';
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  SELECT count(*) INTO n FROM polls WHERE id = pid;  ASSERT n = 0, 'üye olmayan anketi görmemeli';
  RAISE NOTICE '✓ 1  Anket oluşturma ve görünürlük';

  -- 2) Tek seçimli: yeni oy eskisini siler; geçersiz seçenek reddedilir
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO poll_votes(poll_id, user_id, option_id) VALUES (pid, zey, 'a');
  INSERT INTO poll_votes(poll_id, user_id, option_id) VALUES (pid, zey, 'b');
  SELECT count(*) INTO n FROM poll_votes WHERE poll_id = pid AND user_id = zey;  ASSERT n = 1, 'tek seçimde tek oy';
  SELECT count(*) INTO n FROM poll_votes WHERE poll_id = pid AND user_id = zey AND option_id = 'b';  ASSERT n = 1, 'son oy geçerli';
  BEGIN INSERT INTO poll_votes(poll_id, user_id, option_id) VALUES (pid, zey, 'zzz'); RAISE EXCEPTION 'geçersiz seçenek';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%SECENEK_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 2  Tek seçimli oy kuralları';

  -- 3) Üye olmayan oy veremez (RLS)
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN INSERT INTO poll_votes(poll_id, user_id, option_id) VALUES (pid, cem, 'a'); RAISE EXCEPTION 'üye olmayan oy verememeli';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN NULL; END;
  RAISE NOTICE '✓ 3  Üye olmayan oy veremiyor';

  -- 4) Çoklu seçimli ankette iki oy; anket kapanınca oy yok; kapatmayı yalnızca oluşturan yapar
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT create_poll(grp, 'Hangi saatler uyar?', '[{"id":"a","text":"20:00"},{"id":"b","text":"21:00"},{"id":"c","text":"22:00"}]'::jsonb, true) INTO pid;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO poll_votes(poll_id, user_id, option_id) VALUES (pid, zey, 'a'), (pid, zey, 'b');
  SELECT count(*) INTO n FROM poll_votes WHERE poll_id = pid AND user_id = zey;  ASSERT n = 2, 'çoklu seçimde iki oy';
  UPDATE polls SET closed_at = now() WHERE id = pid;  GET DIAGNOSTICS n = ROW_COUNT;  ASSERT n = 0, 'oluşturmayan kapatamamalı';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE polls SET closed_at = now() WHERE id = pid;  GET DIAGNOSTICS n = ROW_COUNT;  ASSERT n = 1, 'oluşturan kapatabilmeli';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN INSERT INTO poll_votes(poll_id, user_id, option_id) VALUES (pid, zey, 'c'); RAISE EXCEPTION 'kapalı ankete oy';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%ANKET_KAPALI%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 4  Çoklu seçim, kapatma yetkisi, kapalı anket';

  RAISE NOTICE 'TUM ANKET TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
