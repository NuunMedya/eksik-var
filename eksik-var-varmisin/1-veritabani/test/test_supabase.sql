DO $$
DECLARE ali UUID; zey UUID; cem UUID; ev UUID; grp UUID; dm UUID; app UUID; n INT; st TEXT; ok BOOLEAN;
BEGIN
  -- 1) Kayıt: auth.users'a düşen kullanıcı → public.users profili otomatik
  INSERT INTO auth.users(email, raw_user_meta_data) VALUES ('ali@test.com', '{"username":"Ali Kaptan","full_name":"Ali Yılmaz","city_id":"1","phone":"05550001"}') RETURNING id INTO ali;
  INSERT INTO auth.users(email, raw_user_meta_data) VALUES ('zeynep@test.com', '{"username":"zeynepa","full_name":"Zeynep Arslan","city_id":"2"}') RETURNING id INTO zey;
  INSERT INTO auth.users(email, raw_user_meta_data) VALUES ('cem@test.com', '{"username":"zeynepa","full_name":"Cem Yavuz"}') RETURNING id INTO cem;
  SELECT username INTO st FROM users WHERE id = ali;  ASSERT st = 'alikaptan', 'kullanıcı adı temizlenmeli: ' || st;
  SELECT username INTO st FROM users WHERE id = cem;  ASSERT st = 'zeynepa1', 'çakışan kullanıcı adına ek gelmeli: ' || st;
  RAISE NOTICE '✓ 1  kayıt → profil, kullanıcı adı temizleme ve çakışma';

  -- 2) Ali oturum açar, etkinlik açar → grup sohbeti otomatik
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); PERFORM set_config('role', 'authenticated', true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Çarşamba Halı Saha', 1, 1, ali, 'Yıldız Halı Saha', now() + interval '2 day', 14, 3) RETURNING id INTO ev;
  SELECT id INTO grp FROM conversations WHERE event_id = ev AND type = 'grup';
  ASSERT grp IS NOT NULL, 'Ali grup sohbetini görebilmeli';
  RAISE NOTICE '✓ 2  Ali etkinlik açtı, grup sohbeti otomatik kuruldu';

  -- 3) Ali başkasının adına etkinlik açamaz (RLS)
  BEGIN
    INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
      VALUES ('Sahte', 1, 1, zey, 'X', now() + interval '1 day', 10, 1);
    RAISE EXCEPTION 'RLS delinmiş: başkası adına etkinlik açıldı';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '✓ 3  Başkası adına etkinlik açmak engellendi';
  END;

  -- 4) Zeynep oturum açar: Ali'nin grup sohbetini GÖREMEZ, etkinliği GÖRÜR
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM conversations WHERE id = grp;  ASSERT n = 0, 'Zeynep üyesi olmadığı grubu görmemeli';
  SELECT count(*) INTO n FROM events WHERE id = ev;          ASSERT n = 1, 'Zeynep açık etkinliği görmeli';
  RAISE NOTICE '✓ 4  Zeynep etkinliği görüyor, üyesi olmadığı sohbeti göremiyor';

  -- 5) Zeynep başvurur → birebir sohbet otomatik, ikisi de görür; Zeynep mesaj atar
  INSERT INTO applications(event_id, applicant_id, message) VALUES (ev, zey, 'Kaleci lazımsa ben varım') RETURNING id, conversation_id INTO app, dm;
  ASSERT dm IS NOT NULL, 'başvuru sohbeti açılmalı';
  SELECT count(*) INTO n FROM conversations WHERE id = dm;  ASSERT n = 1, 'Zeynep başvuru sohbetini görmeli';
  INSERT INTO messages(conversation_id, sender_id, content) VALUES (dm, zey, 'Selam, ben varım!');
  RAISE NOTICE '✓ 5  Başvuru → birebir sohbet + mesaj';

  -- 6) Zeynep Ali'nin profilini değiştiremez (0 satır)
  UPDATE users SET full_name = 'Hack' WHERE id = ali;  GET DIAGNOSTICS n = ROW_COUNT;
  ASSERT n = 0, 'başkasının profili güncellenmemeli';
  -- kendi tercihini değiştirebilir
  UPDATE users SET contact_mode = 'mesaj' WHERE id = zey;  GET DIAGNOSTICS n = ROW_COUNT;  ASSERT n = 1, 'kendi profilini güncelleyebilmeli';
  RAISE NOTICE '✓ 6  Profil: başkasınınki kilitli, kendisininki açık';

  -- 7) Ali "yalnızca arama" yapınca Zeynep'in mesajı sunucuda reddedilir
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE users SET contact_mode = 'arama' WHERE id = ali;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN
    INSERT INTO messages(conversation_id, sender_id, content) VALUES (dm, zey, 'Bu geçmemeli');
    RAISE EXCEPTION 'mesaj izni delinmiş';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%MESAJ_IZNI_YOK%' THEN RAISE NOTICE '✓ 7  Yalnızca-arama kullanıcısına mesaj sunucuda engellendi'; ELSE RAISE; END IF;
  END;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE users SET contact_mode = 'ikisi' WHERE id = ali;

  -- 8) Çift onay: Ali onaylar, Zeynep onaylar → kadroya girer, gruba eklenir, grubu görür
  UPDATE applications SET organizer_approved = true WHERE id = app;  GET DIAGNOSTICS n = ROW_COUNT;  ASSERT n = 1, 'organizatör onaylayabilmeli';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  UPDATE applications SET applicant_approved = true WHERE id = app;  GET DIAGNOSTICS n = ROW_COUNT;  ASSERT n = 1, 'başvuran onaylayabilmeli';
  SELECT count(*) INTO n FROM participants WHERE event_id = ev AND user_id = zey;  ASSERT n = 1, 'kadroya girmeli';
  SELECT count(*) INTO n FROM conversations WHERE id = grp;  ASSERT n = 1, 'artık grubu görmeli';
  SELECT filled_count INTO n FROM events WHERE id = ev;      ASSERT n = 1, 'kontenjan 1 dolmalı';
  RAISE NOTICE '✓ 8  Çift onay → kadro, grup üyeliği, kontenjan';

  -- 9) Arama izni + kayıt: Zeynep yalnızca-mesaj olduğu için Ali arayamaz
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  ASSERT can_call(ali, zey) = FALSE, 'Zeynep aranamamalı';
  INSERT INTO calls(caller_id, callee_id) VALUES (ali, zey) RETURNING status::text INTO st;
  ASSERT st = 'engellendi', 'izinsiz arama engellendi olmalı: ' || st;
  BEGIN
    INSERT INTO calls(caller_id, callee_id) VALUES (zey, ali);
    RAISE EXCEPTION 'RLS delinmiş: başkası adına arama';
  EXCEPTION WHEN insufficient_privilege THEN RAISE NOTICE '✓ 9  Arama izni + başkası adına arama engeli';
  END;

  -- 10) Cem (yabancı) Ali-Zeynep sohbetini ve mesajlarını göremez
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  SELECT count(*) INTO n FROM messages WHERE conversation_id = dm;  ASSERT n = 0, 'yabancı mesajları görmemeli';
  SELECT count(*) INTO n FROM conversation_members WHERE conversation_id = dm;  ASSERT n = 0, 'yabancı üyeleri görmemeli';
  RAISE NOTICE '✓ 10 Yabancı kullanıcı başkalarının sohbetini göremiyor';

  -- 11) Anonim (giriş yapmamış) hiçbir profil göremez, şehirleri görür
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'anon', true);
  BEGIN
    SELECT count(*) INTO n FROM users;
    RAISE EXCEPTION 'anon profil tablosunu sorgulayamamalı';
  EXCEPTION WHEN insufficient_privilege THEN NULL;  -- beklenen: izin yok
  END;
  SELECT count(*) INTO n FROM cities;  ASSERT n > 0, 'anon şehirleri görmeli';
  RAISE NOTICE '✓ 11 Giriş yapmamış kullanıcı profillere erişemiyor, şehirleri görüyor';

  RAISE NOTICE 'TUM SUPABASE TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
