DO $$
DECLARE ali UUID; zey UUID; ev UUID; ev2 UUID; ser UUID; app UUID; n INT; late BOOLEAN; grp UUID;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905000000001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905000000002', now(), '{"username":"zeynep","full_name":"Zeynep Arslan"}') RETURNING id INTO zey;
  -- Yardımcı: Zeynep'i ev'e sok
  PERFORM set_config('role','authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Uzak Maç', 1, 6, ali, 'X', now() + interval '3 days', 10, 2) RETURNING id INTO ev;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);  UPDATE applications SET applicant_approved = true WHERE id = app;

  -- 1) Ayrılma (>24 saat): kontenjan açılır, başvuru silinir, grup üyeliği düşer, geç değil
  SELECT leave_event(ev) INTO late;
  ASSERT late = false, 'uzak maçtan ayrılma geç sayılmamalı';
  SELECT filled_count INTO n FROM events WHERE id = ev;  ASSERT n = 0, 'kontenjan açılmalı';
  SELECT count(*) INTO n FROM participants WHERE event_id = ev AND user_id = zey;  ASSERT n = 0, 'kadrodan çıkmalı';
  grp := group_conversation_for(ev);
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM conversation_members WHERE conversation_id = grp AND user_id = zey;  ASSERT n = 0, 'tek seferlik grup üyeliği düşmeli';
  SELECT count(*) INTO n FROM messages WHERE conversation_id = grp AND content LIKE '%kadrodan ayrıldı%';  ASSERT n = 1, 'gruba sistem mesajı';
  SELECT count(*) INTO n FROM notifications WHERE type = 'kadro' AND user_id = ali AND title = 'Kadrodan ayrılan var';  ASSERT n = 1, 'organizatöre bildirim';
  SELECT no_show_count INTO n FROM users WHERE id = zey;  ASSERT n = 0, 'no_show artmamalı';
  RAISE NOTICE '✓ 1  Kadrodan ayrılma (erken): kontenjan, üyelik, mesaj, bildirim';

  -- 2) Aynı kişi yeniden başvurabilir (başvuru silindiği için)
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  RAISE NOTICE '✓ 2  Ayrılan yeniden başvurabiliyor';

  -- 3) Yakın maçta ayrılma geç sayılır → no_show +1
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Yakın Maç', 1, 6, ali, 'X', now() + interval '5 hours', 10, 2) RETURNING id INTO ev2;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev2, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);  UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT leave_event(ev2) INTO late;  ASSERT late = true, 'yakın maçtan ayrılma geç sayılmalı';
  SELECT no_show_count INTO n FROM users WHERE id = zey;  ASSERT n = 1, 'geç ayrılma no_show +1';
  RAISE NOTICE '✓ 3  Geç ayrılma güvenilirliğe işledi';

  -- 4) Yabancı iptal edemez; organizatör iptal eder → mesaj + bildirim; yakın maçta geç iptal
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN
    PERFORM cancel_event(ev2);
    RAISE EXCEPTION 'yabancı iptal edememeli';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YETKI_YOK%' THEN NULL; ELSE RAISE; END IF;
  END;
  -- Zeynep tekrar kadroya girsin (bildirim testi için)
  INSERT INTO applications(event_id, applicant_id) VALUES (ev2, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);  UPDATE applications SET applicant_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT cancel_event(ev2, 'Saha kapalı') INTO late;  ASSERT late = true, 'yakın maç iptali geç sayılmalı';
  SELECT count(*) INTO n FROM events WHERE id = ev2 AND status = 'iptal';  ASSERT n = 1, 'iptal olmalı';
  SELECT no_show_count INTO n FROM users WHERE id = ali;  ASSERT n = 1, 'geç iptal organizatöre işledi';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'etkinlik_iptal' AND body = 'Saha kapalı';  ASSERT n = 1, 'katılımcıya iptal bildirimi';
  RAISE NOTICE '✓ 4  İptal: yetki, geç iptal, sistem mesajı, bildirim';

  -- 5) Seri grubunda ayrılan üyelik korur (ekip kalır)
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, recurrence) VALUES ('Seri', 1, 6, ali, 'X', now() + interval '3 days', 10, 2, 'haftalik') RETURNING id INTO ser;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ser, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);  UPDATE applications SET applicant_approved = true WHERE id = app;
  PERFORM leave_event(ser);
  grp := group_conversation_for(ser);
  SELECT count(*) INTO n FROM conversation_members WHERE conversation_id = grp AND user_id = zey;  ASSERT n = 1, 'seri grubunda üyelik kalmalı';
  RAISE NOTICE '✓ 5  Seri grubunda ayrılan ekipte kalıyor';

  -- 6) Güncelleme duyurusu
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE events SET needed_count = 3 WHERE id = ser;
  PERFORM event_updated_notice(ser);
  SELECT count(*) INTO n FROM messages WHERE conversation_id = grp AND content LIKE 'Etkinlik güncellendi%3 eksik';  ASSERT n = 1, 'güncelleme duyurusu';
  RAISE NOTICE '✓ 6  Güncelleme duyurusu';

  RAISE NOTICE 'TUM YONETIM TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
