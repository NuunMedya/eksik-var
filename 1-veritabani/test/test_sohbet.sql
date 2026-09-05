DO $$
DECLARE ali UUID; zey UUID; cem UUID; ev UUID; grp UUID; app UUID; mid BIGINT; n INT; st TEXT;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905600600001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905600600002', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905600600003', now(), '{"username":"cem","full_name":"Cem"}') RETURNING id INTO cem;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Maç', 1, 6, ali, 'X', now() + interval '1 hour', 10, 2) RETURNING id INTO ev;
  grp := group_conversation_for(ev);
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); UPDATE applications SET applicant_approved = true WHERE id = app;

  -- 1) Sabitleme: yönetici sabitler, üye sabitleyemez
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO messages(conversation_id, sender_id, content) VALUES (grp, ali, 'Saha adresi: Yıldız, kapı 2') RETURNING id INTO mid;
  PERFORM pin_message(grp, mid);
  SELECT count(*) INTO n FROM conversations WHERE id = grp AND pinned_message_id = mid;  ASSERT n = 1, 'sabitlenmeli';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN PERFORM pin_message(grp, NULL); RAISE EXCEPTION 'üye sabitleyememeli';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YETKI_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 1  Sabitlenmiş mesaj';

  -- 2) Fotoğraf mesajı (image_url) ve sessize alma bildirimi keser
  INSERT INTO messages(conversation_id, sender_id, type, content, image_url) VALUES (grp, zey, 'resim', NULL, 'https://x/y.jpg');
  SELECT count(*) INTO n FROM messages WHERE conversation_id = grp AND image_url IS NOT NULL;  ASSERT n = 1, 'fotoğraf mesajı';
  UPDATE conversation_members SET is_muted = true WHERE conversation_id = grp AND user_id = zey;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO messages(conversation_id, sender_id, content) VALUES (grp, ali, 'sessiz');
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'mesaj' AND is_read = false AND body = 'sessiz';  ASSERT n = 0, 'sessize alınan grup bildirim üretmez';
  RAISE NOTICE '✓ 2  Fotoğraf ve sessize alma';

  -- 3) Sahadayım: zaman penceresi ve kadro kontrolü
  PERFORM check_in(ev);
  SELECT count(*) INTO n FROM participants WHERE event_id = ev AND user_id = zey AND checked_in_at IS NOT NULL;  ASSERT n = 1, 'sahadayım kaydı';
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN PERFORM check_in(ev); RAISE EXCEPTION 'kadroda olmayan';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%KADRODA_DEGIL%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Uzak', 1, 6, ali, 'X', now() + interval '2 days', 10, 2) RETURNING id INTO app;
  BEGIN PERFORM check_in(app); RAISE EXCEPTION 'zaman dışı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%ZAMAN_DISI%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 3  Sahadayım';

  -- 4) İtiraz organizatöre gider; organizatör düzeltince itiraz kapanır, oyuncuya bildirim
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  UPDATE events SET event_date = now() - interval '3 hours' WHERE id = ev;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE participants SET attendance = 'gelmedi' WHERE event_id = ev AND user_id = zey;
  PERFORM complete_event(ev);
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO reports(reporter_id, reported_user_id, event_id, reason, description) VALUES (zey, ali, ev, 'yoklama_itiraz', 'Oradaydım');
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'itiraz' AND title = 'Yoklama itirazı';  ASSERT n = 1, 'organizatöre itiraz bildirimi';
  UPDATE participants SET attendance = 'katildi' WHERE event_id = ev AND user_id = zey;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT status::text INTO st FROM reports WHERE event_id = ev AND reporter_id = zey;  ASSERT st = 'kapatildi', 'itiraz kapanmalı';
  SELECT count(*) INTO n FROM notifications WHERE type = 'itiraz' AND title LIKE 'İtirazın kabul%';  ASSERT n = 1, 'oyuncuya kabul bildirimi';
  SELECT no_show_count INTO n FROM users WHERE id = zey;  ASSERT n = 0, 'no_show geri alınmalı';
  RAISE NOTICE '✓ 4  İtiraz → organizatör → düzeltme';

  -- 5) Başvuru bildirimleri birleşir: aynı etkinliğe 2 başvuru → tek satır "2 yeni başvuru"
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Yeni', 1, 6, ali, 'X', now() + interval '2 days', 10, 3) RETURNING id INTO ev;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey);
  PERFORM set_config('request.jwt.claim.sub', cem::text, true); INSERT INTO applications(event_id, applicant_id) VALUES (ev, cem);
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'basvuru' AND is_read = false AND data->>'event_id' = ev::text;  ASSERT n = 1, 'tek satır';
  SELECT title INTO st FROM notifications WHERE type = 'basvuru' AND is_read = false AND data->>'event_id' = ev::text;  ASSERT st = '2 yeni başvuru', 'sayaçlı başlık: ' || st;
  RAISE NOTICE '✓ 5  Başvuru bildirimleri birleşti';

  RAISE NOTICE 'TUM SOHBET TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
