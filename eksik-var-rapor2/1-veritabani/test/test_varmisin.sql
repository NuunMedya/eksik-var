DO $$
DECLARE ali UUID; zey UUID; cem UUID; den UUID; ev UUID; grp UUID; app UUID; pid UUID; n INT; s INT; av RECORD;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905800000001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905800000002', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905800000003', now(), '{"username":"cem","full_name":"Cem"}') RETURNING id INTO cem;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905800000004', now(), '{"username":"deniz","full_name":"Deniz"}') RETURNING id INTO den;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  -- Haftalık seri: 14 kişilik, uygulamada olmayan 8 sabit oyuncu, bu hafta 2 eksik ilanı, maç 48 saat sonra
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, recurrence, offline_regulars)
    VALUES ('Çarşamba Serisi', 1, 6, ali, 'Yıldız', now() + interval '48 hours', 14, 2, 'haftalik', 8) RETURNING id INTO ev;
  grp := group_conversation_for(ev);
  -- Zeynep bu hafta uygulamadan katılır; Cem ve Deniz önceki haftalardan grup üyesi (sabit kadro)
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);  UPDATE applications SET applicant_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  INSERT INTO conversation_members(conversation_id, user_id) VALUES (grp, cem), (grp, den);

  -- 1) Yabancı soramaz; organizatör sorar → anket + üyelere bildirim; ikinci soruş yeni anket açmaz
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN PERFORM ask_availability(ev); RAISE EXCEPTION 'yabancı soramamalı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YETKI_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT ask_availability(ev) INTO pid;
  ASSERT pid IS NOT NULL, 'anket açılmalı';
  SELECT count(*) INTO n FROM messages WHERE conversation_id = grp AND poll_id = pid;  ASSERT n = 1, 'gruba anket mesajı';
  ASSERT ask_availability(ev) = pid, 'ikinci soruş aynı anketi döndürmeli';
  SELECT count(*) INTO n FROM polls WHERE event_id = ev AND kind = 'varmisin';  ASSERT n = 1, 'tek anket';
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'varmisin';  ASSERT n = 1, 'üyeye var mısın bildirimi';
  RAISE NOTICE '✓ 1  Var mısın anketi açıldı, bildirim gitti, tekil';

  -- 2) Cevaplar: Cem varım, Deniz yokum, Zeynep cevapsız → özet ve önerilen eksik
  INSERT INTO poll_votes(poll_id, user_id, option_id) VALUES (pid, cem, 'varim');
  PERFORM set_config('request.jwt.claim.sub', den::text, true);
  INSERT INTO poll_votes(poll_id, user_id, option_id) VALUES (pid, den, 'yokum');
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT * INTO av FROM v_event_availability WHERE event_id = ev;
  ASSERT av.varim = 1 AND av.yokum = 1 AND av.cevapsiz = 1, format('özet: %s/%s/%s', av.varim, av.yokum, av.cevapsiz);
  -- kadro = Ali + Zeynep(katılımcı) + Cem(varım) = 3 → 14 - 8 - 3 = 3 eksik
  ASSERT av.suggested = 3, 'önerilen eksik 3 olmalı: ' || av.suggested;
  RAISE NOTICE '✓ 2  Özet ve önerilen eksik';

  -- 3) Öneriyi uygula → needed 3; yabancı uygulayamaz
  SELECT apply_suggested_needed(ev) INTO s;  ASSERT s = 3, 'uygulanan 3';
  SELECT needed_count INTO n FROM events WHERE id = ev;  ASSERT n = 3, 'eksik güncellenmeli';
  SELECT count(*) INTO n FROM messages WHERE conversation_id = grp AND content LIKE 'Etkinlik güncellendi%2 eksik';  ASSERT n = 1, 'gruba duyuru';
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN PERFORM apply_suggested_needed(ev); RAISE EXCEPTION 'yabancı uygulayamamalı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YETKI_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  RAISE NOTICE '✓ 3  Öneri uygulandı, yetki korunuyor';

  -- 4) Öneri dolu kontenjanın altına inemez (filled_count tabanı)
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE events SET offline_regulars = 13 WHERE id = ev;  -- 14-13-3 = -2 → filled(1)
  SELECT suggested_needed(ev) INTO s;  ASSERT s = 1, 'öneri en az dolu sayısı kadar: ' || s;
  UPDATE events SET offline_regulars = 8 WHERE id = ev;
  RAISE NOTICE '✓ 4  Öneri alt sınırı';

  -- 5) Sistem görevi: 72 saat içindeki sorulmamış seri maçını sorar; sorulmuşu tekrar sormaz
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, recurrence)
    VALUES ('Yakın Seri', 1, 6, ali, 'X', now() + interval '30 hours', 10, 2, 'haftalik') RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  SELECT send_availability_asks() INTO n;  ASSERT n = 1, 'bir maç sorulmalı: ' || n;
  SELECT count(*) INTO n FROM polls WHERE event_id = app AND kind = 'varmisin';  ASSERT n = 1, 'yakın seride anket';
  SELECT send_availability_asks() INTO n;  ASSERT n = 0, 'ikinci çalıştırma boş';
  RAISE NOTICE '✓ 5  Otomatik sorma tek sefer';

  RAISE NOTICE 'TUM VARMISIN TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
