DO $$
DECLARE ali UUID; zey UUID; cem UUID; ev UUID; ev2 UUID; app UUID; grp UUID; n INT; b TEXT;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905100000001', now(), '{"username":"ali","full_name":"Ali Yılmaz"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905100000002', now(), '{"username":"zeynep","full_name":"Zeynep Arslan"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905100000003', now(), '{"username":"cem","full_name":"Cem Yavuz"}') RETURNING id INTO cem;
  PERFORM set_config('role','authenticated', true);

  -- 1) Başvuru → organizatöre 'basvuru'
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Çarşamba Maçı', 1, 6, ali, 'Yıldız', now() + interval '2 days', 10, 1) RETURNING id INTO ev;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id, message) VALUES (ev, zey, 'Ben varım') RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*), max(body) INTO n, b FROM notifications WHERE type = 'basvuru';  ASSERT n = 1 AND b LIKE 'Zeynep Arslan, Çarşamba Maçı için başvurdu: "Ben varım"', 'organizatöre başvuru bildirimi: ' || b;
  RAISE NOTICE '✓ 1  Başvuru → organizatöre bildirim';

  -- 2) Organizatör onayı → başvurana 'onay'; çift onay → 'kadro' + organizatöre 'doldu'
  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'onay' AND title = 'Ali seni onayladı';  ASSERT n = 1, 'başvurana onay bildirimi';
  UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT count(*) INTO n FROM notifications WHERE type = 'kadro' AND title LIKE 'Kadrodasın%';  ASSERT n = 1, 'başvurana kadro bildirimi';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'doldu';  ASSERT n = 1, 'organizatöre doldu bildirimi (1 eksik, 1 doldu)';
  RAISE NOTICE '✓ 2  Onay → çift onay bildirimleri';

  -- 3) Mesaj: gönderen almaz, diğer üye alır; ikinci mesaj aynı satırı günceller (yığın yok)
  grp := group_conversation_for(ev);
  INSERT INTO messages(conversation_id, sender_id, content) VALUES (grp, ali, 'Forma beyaz');
  INSERT INTO messages(conversation_id, sender_id, content) VALUES (grp, ali, 'Saat 21:00 sahada');
  SELECT count(*) INTO n FROM notifications WHERE type = 'mesaj';  ASSERT n = 0, 'gönderen kendi mesajının bildirimini almamalı';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*), max(body) INTO n, b FROM notifications WHERE type = 'mesaj' AND is_read = false;
  ASSERT n = 1 AND b = 'Saat 21:00 sahada', 'tek satır, son mesaj: ' || n || ' ' || b;
  RAISE NOTICE '✓ 3  Mesaj bildirimi sohbet başına tek satır';

  -- 4) Tercih: mesaj bildirimi kapalı olan almaz; sessize alınan grup bildirim üretmez
  UPDATE users SET notif_mesaj = false WHERE id = zey;
  UPDATE notifications SET is_read = true WHERE type = 'mesaj';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO messages(conversation_id, sender_id, content) VALUES (grp, ali, 'Bu gelmemeli');
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'mesaj' AND is_read = false;  ASSERT n = 0, 'tercih kapalıyken mesaj bildirimi olmamalı';
  UPDATE users SET notif_mesaj = true WHERE id = zey;
  UPDATE conversation_members SET is_muted = true WHERE conversation_id = grp AND user_id = zey;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO messages(conversation_id, sender_id, content) VALUES (grp, ali, 'Sessiz grup');
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'mesaj' AND is_read = false;  ASSERT n = 0, 'sessize alınan grup bildirim üretmemeli';
  UPDATE conversation_members SET is_muted = false WHERE conversation_id = grp AND user_id = zey;
  RAISE NOTICE '✓ 4  Bildirim tercihi ve sessize alma';

  -- 5) Ret → başvurana 'red'
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Cem Maçı', 1, 6, cem, 'X', now() + interval '2 hours', 10, 2) RETURNING id INTO ev2;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev2, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  UPDATE applications SET status = 'reddedildi' WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'red';  ASSERT n = 1, 'ret bildirimi';
  RAISE NOTICE '✓ 5  Ret bildirimi';

  -- 6) Hatırlatma: 2 saat sonraki maç → organizatör + kadro; ikinci çalıştırma tekrar üretmez; 4 saat önce bitmiş maç → yoklama
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  UPDATE events SET event_date = now() - interval '4 hours' WHERE id = ev;   -- Ali'nin maçı bitmiş olsun
  SELECT send_event_reminders() INTO n;  ASSERT n = 2, 'bir hatırlatma + bir yoklama: ' || n;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'hatirlatma';  ASSERT n = 1, 'Cem hatırlatma almalı';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'yoklama';  ASSERT n = 1, 'Ali yoklama hatırlatması almalı';
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  SELECT send_event_reminders() INTO n;  ASSERT n = 0, 'ikinci çalıştırma boş';
  RAISE NOTICE '✓ 6  Hatırlatmalar tek sefer';

  -- 7) Haftalık seri: gelecek hafta açılınca gruba 'tekrar' bildirimi
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, recurrence) VALUES ('Seri', 1, 6, ali, 'X', now() - interval '2 hours', 10, 2, 'haftalik') RETURNING id INTO ev2;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev2, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);  UPDATE applications SET applicant_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  PERFORM complete_event(ev2);
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'tekrar';  ASSERT n = 1, 'seri üyesine tekrar bildirimi';
  RAISE NOTICE '✓ 7  Haftalık seri duyurusu';

  RAISE NOTICE 'TUM BILDIRIM TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
