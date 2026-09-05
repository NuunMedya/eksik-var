DO $$
DECLARE ali UUID; zey UUID; cem UUID; ev UUID; app UUID; n INT; st TEXT;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905300000001', now(), '{"username":"ali","full_name":"Ali Yılmaz"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905300000002', now(), '{"username":"zeynep","full_name":"Zeynep Arslan"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905300000003', now(), '{"username":"cem","full_name":"Cem Yavuz"}') RETURNING id INTO cem;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, needed_positions)
    VALUES ('Çarşamba', 1, 6, ali, 'Yıldız', now() + interval '2 days', 14, 2, '{"kaleci":1}') RETURNING id INTO ev;

  -- 1) Yabancı davet edemez; organizatör kendini davet edemez
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN PERFORM invite_user(ev, zey); RAISE EXCEPTION 'yabancı davet edememeli';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YETKI_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  BEGIN PERFORM invite_user(ev, ali); RAISE EXCEPTION 'kendini davet edememeli';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%KENDINI%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 1  Davet yetkisi';

  -- 2) Davet: organizatör onayı hazır, sohbet + sistem mesajı, davet edilene bildirim; organizatöre "yeni başvuru" gitmez
  SELECT invite_user(ev, zey, 'kaleci') INTO app;
  SELECT count(*) INTO n FROM applications WHERE id = app AND organizer_approved AND invited_by = ali AND conversation_id IS NOT NULL;  ASSERT n = 1, 'davet kaydı';
  SELECT count(*) INTO n FROM notifications WHERE type = 'basvuru';  ASSERT n = 0, 'organizatöre başvuru bildirimi gitmemeli';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'davet' AND title = 'Ali seni kadroya davet etti';  ASSERT n = 1, 'davet bildirimi';
  SELECT count(*) INTO n FROM messages m JOIN applications a ON a.conversation_id = m.conversation_id WHERE a.id = app AND m.type = 'sistem' AND m.content LIKE '%davet etti%';  ASSERT n = 1, 'sohbete sistem mesajı';
  RAISE NOTICE '✓ 2  Davet → sohbet, sistem mesajı, bildirim';

  -- 3) Aynı kişiye ikinci davet reddedilir
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  BEGIN PERFORM invite_user(ev, zey); RAISE EXCEPTION 'çift davet olmamalı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%DAVET_VAR%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 3  Çift davet engeli';

  -- 4) Kabul → kadro, mevki dolu, organizatöre "davetini kabul etti"
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT status::text INTO st FROM applications WHERE id = app;  ASSERT st = 'onaylandi', 'kabul → onaylandı';
  SELECT count(*) INTO n FROM participants WHERE event_id = ev AND user_id = zey;  ASSERT n = 1, 'kadroya girmeli';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'kadro' AND body LIKE '%davetini kabul etti%';  ASSERT n = 1, 'organizatöre kabul bildirimi';
  ASSERT position_available(ev, 'kaleci') = false, 'kaleci dolmalı';
  RAISE NOTICE '✓ 4  Kabul → kadro ve mevki';

  -- 5) Red → organizatöre "davet reddedildi"
  SELECT invite_user(ev, cem) INTO app;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  UPDATE applications SET status = 'reddedildi' WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'red' AND title = 'Davet reddedildi';  ASSERT n = 1, 'red bildirimi organizatöre';
  RAISE NOTICE '✓ 5  Davet reddi';

  -- 6) Engel varsa davet edilemez
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  DELETE FROM applications WHERE id = app;  -- test için temizle (RLS: sahibi)
  INSERT INTO blocks(blocker_id, blocked_id) VALUES (cem, ali);
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  BEGIN PERFORM invite_user(ev, cem); RAISE EXCEPTION 'engelliye davet olmamalı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%ENGEL%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 6  Engel varsa davet yok';

  RAISE NOTICE 'TUM DAVET TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
