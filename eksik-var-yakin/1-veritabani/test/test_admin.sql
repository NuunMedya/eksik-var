DO $$
DECLARE civ UUID; ali UUID; zey UUID; ev UUID; app UUID; rid BIGINT; n INT; st TEXT; j JSONB;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905100100001', now(), '{"username":"civan","full_name":"Civan"}') RETURNING id INTO civ;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905100100002', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905100100003', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  INSERT INTO admins(user_id, note) VALUES (civ, 'kurucu');
  -- Ali bir maç açar, Zeynep katılır, Ali Zeynep'i gelmedi işaretler, Zeynep itiraz eder
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Dün', 1, 6, ali, 'X', now() - interval '3 hours', 10, 2) RETURNING id INTO ev;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); UPDATE applications SET applicant_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE participants SET attendance = 'gelmedi' WHERE event_id = ev AND user_id = zey;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO reports(reporter_id, reported_user_id, event_id, reason, description) VALUES (zey, ali, ev, 'yoklama_itiraz', 'Oradaydım!') RETURNING id INTO rid;
  INSERT INTO reports(reporter_id, reported_user_id, reason) VALUES (zey, ali, 'taciz');

  -- 1) Sıradan kullanıcı: kuyruğu göremez (kendi şikayetleri hariç), iç fonksiyonları çağıramaz
  SELECT count(*) INTO n FROM v_report_queue;  ASSERT n = 2, 'sıradan kullanıcı yalnızca kendi şikayetlerini görür: ' || n;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM v_report_queue;  ASSERT n = 0, 'şikayet edilen hiçbir şey görmemeli';
  BEGIN PERFORM _apply_sanction(zey, 'banli', 'x', NULL); RAISE EXCEPTION 'iç fonksiyon çağrılmamalı';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM notify_user(zey, 'mesaj', 'spam', 'spam'); RAISE EXCEPTION 'notify_user çağrılmamalı';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM suspend_user(zey, 7); RAISE EXCEPTION 'sıradan kullanıcı askıya alamamalı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YETKI_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  ASSERT is_admin() = false, 'Ali yönetici değil';
  RAISE NOTICE '✓ 1  Sıradan kullanıcı: sızıntı yok, iç fonksiyonlar kapalı';

  -- 2) Yönetici: tüm kuyruk, özet, banlı kullanıcılar dahil arama
  PERFORM set_config('request.jwt.claim.sub', civ::text, true);
  ASSERT is_admin() = true, 'Civan yönetici';
  SELECT count(*) INTO n FROM v_report_queue;  ASSERT n = 2, 'yönetici tüm kuyruğu görür';
  SELECT admin_stats() INTO j;  ASSERT (j->>'reports_pending')::INT = 2 AND (j->>'disputes_pending')::INT = 1, 'özet: ' || j::text;
  RAISE NOTICE '✓ 2  Yönetici kuyruk ve özet';

  -- 3) İtiraz haklı: gelmedi geri alınır (güvenilirlik düzelir), şikayet kapanır
  SELECT no_show_count INTO n FROM users WHERE id = zey;  ASSERT n = 1, 'itirazdan önce 1 gelmedi';
  PERFORM revert_no_show(ev, zey);
  SELECT no_show_count INTO n FROM users WHERE id = zey;  ASSERT n = 0, 'gelmedi geri alınmalı';
  PERFORM resolve_report(rid, 'kapatildi', 'itiraz haklı, geri alındı');
  SELECT status::text INTO st FROM reports WHERE id = rid;  ASSERT st = 'kapatildi', 'şikayet kapanmalı';
  RAISE NOTICE '✓ 3  İtiraz çözümü';

  -- 4) Yönetici askıya alır, geri açar; kendini askıya alamaz
  PERFORM suspend_user(ali, 3, 'uyarı');
  SELECT status::text INTO st FROM users WHERE id = ali;  ASSERT st = 'askida', 'askıya alınmalı';
  PERFORM reinstate_user(ali);
  SELECT status::text INTO st FROM users WHERE id = ali;  ASSERT st = 'aktif', 'geri açılmalı';
  BEGIN PERFORM suspend_user(civ, 3); RAISE EXCEPTION 'kendini askıya alamamalı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%KENDINI%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 4  Yönetici yaptırımları';

  -- 5) Banlı kullanıcı yöneticiye görünür, sıradan kullanıcıya görünmez
  PERFORM ban_user(ali, 'test');
  SELECT count(*) INTO n FROM users WHERE id = ali;  ASSERT n = 1, 'yönetici banlıyı görür';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM users WHERE id = ali;  ASSERT n = 0, 'sıradan kullanıcı banlıyı görmez';
  RAISE NOTICE '✓ 5  Banlı görünürlüğü';

  RAISE NOTICE 'TUM YONETICI TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
