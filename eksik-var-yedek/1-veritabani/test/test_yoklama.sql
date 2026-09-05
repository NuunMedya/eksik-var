DO $$
DECLARE ali UUID; zey UUID; cem UUID; ev UUID; ev2 UUID; ev3 UUID; app UUID; n INT; k INT; g INT; r NUMERIC; msg TEXT;
BEGIN
  INSERT INTO auth.users(email, raw_user_meta_data) VALUES ('ali@y.com','{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(email, raw_user_meta_data) VALUES ('zey@y.com','{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  INSERT INTO auth.users(email, raw_user_meta_data) VALUES ('cem@y.com','{"username":"cem","full_name":"Cem"}') RETURNING id INTO cem;

  -- Ali dün oynanmış bir maç açar (test için geçmiş tarih), Zeynep ve Cem çift onayla kadroya girer
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); PERFORM set_config('role','authenticated', true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Dünkü Maç', 1, 1, ali, 'Yıldız', now() - interval '3 hours', 12, 2) RETURNING id INTO ev;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  UPDATE applications SET applicant_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev, cem) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT count(*) INTO n FROM participants WHERE event_id = ev;  ASSERT n = 2, 'iki katılımcı olmalı';
  RAISE NOTICE '✓ 1  Geçmiş maç + 2 katılımcı hazır';

  -- 1) Katılımcı kendi yoklamasını değiştiremez (RLS → 0 satır)
  UPDATE participants SET attendance = 'katildi' WHERE event_id = ev AND user_id = cem;  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'katılımcı yoklama işaretleyememeli';
  RAISE NOTICE '✓ 2  Katılımcı yoklamayı kendisi işaretleyemiyor';

  -- 2) Organizatör Zeynep'i gelmedi işaretler → sayaç ve güvenilirlik
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE participants SET attendance = 'gelmedi' WHERE event_id = ev AND user_id = zey;  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 1, 'organizatör işaretleyebilmeli';
  SELECT no_show_count, reliability_pct INTO n, r FROM users WHERE id = zey;
  ASSERT n = 1 AND r = 0.0, 'Zeynep: 1 gelmedi, %0 olmalı';
  RAISE NOTICE '✓ 3  Gelmedi → no_show sayacı ve güvenilirlik güncellendi';

  -- 3) Gelecek maçta yoklama alınamaz
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Yarınki Maç', 1, 1, ali, 'Yıldız', now() + interval '1 day', 12, 2) RETURNING id INTO ev2;
  BEGIN
    PERFORM complete_event(ev2);
    RAISE EXCEPTION 'erken tamamlama geçmemeliydi';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%YOKLAMA_ERKEN%' THEN RAISE NOTICE '✓ 4  Maç saatinden önce tamamlama engellendi'; ELSE RAISE; END IF;
  END;

  -- 4) Yabancı (Cem) Ali'nin maçını tamamlayamaz
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN
    PERFORM complete_event(ev);
    RAISE EXCEPTION 'yabancı tamamlayamamalı';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%YETKI_YOK%' THEN RAISE NOTICE '✓ 5  Sadece organizatör tamamlayabiliyor'; ELSE RAISE; END IF;
  END;

  -- 5) Ali tamamlar: Cem (işaretlenmemiş) katıldı sayılır, organizatör katılım +1, mesaj + bildirim
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT katildi, gelmedi INTO k, g FROM complete_event(ev);
  ASSERT k = 1 AND g = 1, format('1 katıldı 1 gelmedi olmalı (%s/%s)', k, g);
  SELECT attendance::text INTO msg FROM participants WHERE event_id = ev AND user_id = cem;  ASSERT msg = 'katildi', 'Cem katıldı sayılmalı';
  SELECT events_joined INTO n FROM users WHERE id = ali;  ASSERT n = 1, 'organizatör katılım +1';
  SELECT status::text INTO msg FROM events WHERE id = ev;  ASSERT msg = 'tamamlandi', 'etkinlik tamamlanmalı';
  SELECT count(*) INTO n FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.event_id = ev AND m.type = 'sistem' AND m.content LIKE 'Yoklama alındı%';
  ASSERT n = 1, 'gruba sistem mesajı düşmeli';
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'puanlama';  ASSERT n = 1, 'Cem puanlama bildirimi almalı';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'puanlama';  ASSERT n = 0, 'gelmeyen bildirim almamalı';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  RAISE NOTICE '✓ 6  Tamamla: iyi niyet kuralı, sayaçlar, sistem mesajı, bildirimler';

  -- 6) İkinci kez tamamlanamaz
  BEGIN
    PERFORM complete_event(ev);
    RAISE EXCEPTION 'iki kez tamamlanmamalı';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%ZATEN_TAMAMLANDI%' THEN RAISE NOTICE '✓ 7  Çift tamamlama engellendi'; ELSE RAISE; END IF;
  END;

  -- 7) 48 saat geçmiş, yoklaması alınmamış maçı sistem tamamlar
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Unutulan Maç', 1, 1, ali, 'Yıldız', now() - interval '3 days', 12, 2) RETURNING id INTO ev3;
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);  -- cron bağlamı
  SELECT auto_complete_events() INTO n;  ASSERT n = 1, 'bir maç otomatik tamamlanmalı: ' || n;
  SELECT status::text INTO msg FROM events WHERE id = ev3;  ASSERT msg = 'tamamlandi', 'unutulan maç tamamlanmalı';
  SELECT auto_complete_events() INTO n;  ASSERT n = 0, 'ikinci çalıştırma boş dönmeli';
  RAISE NOTICE '✓ 8  48 saat kuralı: sistem otomatik tamamladı';

  -- 8) Güvenilirlik geçmişi görünümü
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); PERFORM set_config('role', 'authenticated', true);
  SELECT count(*) INTO n FROM v_attendance_history WHERE user_id = zey;  ASSERT n = 1, 'Zeynep geçmişte 1 kayıt';
  RAISE NOTICE '✓ 9  Güvenilirlik geçmişi görünümü';

  RAISE NOTICE 'TUM YOKLAMA TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
