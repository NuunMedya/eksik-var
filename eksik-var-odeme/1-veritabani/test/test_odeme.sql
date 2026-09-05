DO $$
DECLARE ali UUID; zey UUID; cem UUID; ev UUID; app UUID; n INT; st TEXT; j JSONB; grp UUID;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905200200001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905200200002', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905200200003', now(), '{"username":"cem","full_name":"Cem"}') RETURNING id INTO cem;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, price_per_person)
    VALUES ('Cuma Maçı', 1, 6, ali, 'Yıldız', now() - interval '2 hours', 10, 2, 150) RETURNING id INTO ev;
  -- Zeynep ve Cem kadroya
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); UPDATE applications SET applicant_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true); INSERT INTO applications(event_id, applicant_id) VALUES (ev, cem) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true); UPDATE applications SET applicant_approved = true WHERE id = app;

  -- 1) Kadroya girince ödeme satırı; herkes yalnızca kendininkini, organizatör hepsini görür
  SELECT count(*) INTO n FROM payments WHERE event_id = ev;  ASSERT n = 1, 'Cem yalnızca kendi satırını görür: ' || n;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM v_event_payments WHERE event_id = ev AND status = 'bekliyor' AND amount = 150;  ASSERT n = 2, 'organizatör 2 satır görür';
  RAISE NOTICE '✓ 1  Ödeme satırları ve görünürlük';

  -- 2) IBAN yoksa gönderilemez; IBAN kaydı yalnızca sahibine görünür; gönderince gruba sistem mesajı
  BEGIN PERFORM send_iban(ev); RAISE EXCEPTION 'IBAN yokken gönderilmemeli';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%IBAN_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  INSERT INTO payment_details(user_id, iban, holder_name) VALUES (ali, 'TR12 0006 4000 0011 2345 6789 01', 'Ali Yılmaz');
  PERFORM send_iban(ev);
  grp := group_conversation_for(ev);
  SELECT count(*) INTO n FROM messages WHERE conversation_id = grp AND content LIKE '💳 Saha ücreti 150%TR12%';  ASSERT n = 1, 'IBAN mesajı';
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM payment_details;  ASSERT n = 0, 'IBAN tablosu başkasına görünmez';
  RAISE NOTICE '✓ 2  IBAN gizli, gruba fonksiyonla gider';

  -- 3) Zeynep "ödedim" der → organizatöre bildirim; organizatör onaylar → Zeynep'e bildirim; yabancı onaylayamaz
  PERFORM claim_payment(ev);
  SELECT status::text INTO st FROM payments WHERE event_id = ev AND user_id = zey;  ASSERT st = 'odedim', 'ödedim beyanı';
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'odeme' AND title = 'Ödeme beyanı';  ASSERT n = 1, 'organizatöre beyan bildirimi';
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN PERFORM confirm_payment(ev, zey, 'odendi'); RAISE EXCEPTION 'yabancı onaylayamamalı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YETKI_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  PERFORM confirm_payment(ev, zey, 'odendi');
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'odeme' AND title LIKE 'Ödemen onaylandı%';  ASSERT n = 1, 'onay bildirimi';
  RAISE NOTICE '✓ 3  Ödedim → onay akışı';

  -- 4) Hatırlatma: yalnızca bekleyene (Cem), 24 saatte bir; sistem görevi tamamlanmadan 2 gün sonra
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  PERFORM complete_event(ev);
  SELECT remind_payments(ev) INTO n;  ASSERT n = 1, 'bir kişiye hatırlatma: ' || n;
  SELECT remind_payments(ev) INTO n;  ASSERT n = 0, '24 saat içinde tekrar yok';
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'odeme' AND title LIKE 'Saha ücreti hatırlatması%';  ASSERT n = 1, 'Cem hatırlatma aldı';
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  UPDATE payments SET last_reminded_at = NULL, reminded_count = 0 WHERE event_id = ev AND user_id = cem;
  UPDATE events SET completed_at = now() - interval '4 days' WHERE id = ev; UPDATE payments SET confirmed_at = now() - interval '4 days' WHERE event_id = ev AND user_id = zey;
  SELECT send_payment_reminders() INTO n;  ASSERT n = 1, 'sistem 2 gün sonra hatırlatmalı: ' || n;
  RAISE NOTICE '✓ 4  Hatırlatmalar';

  -- 5) Ödeme düzeni istatistiği: Zeynep 1 ödendi (zamanında), Cem 3 gündür bekliyor → %0
  SELECT payment_stats(zey) INTO j;  ASSERT (j->>'paid')::INT = 1 AND (j->>'pct')::INT = 100, 'Zeynep %100: ' || j::text;
  SELECT payment_stats(cem) INTO j;  ASSERT (j->>'overdue')::INT = 1 AND (j->>'pct')::INT = 0, 'Cem gecikmiş: ' || j::text;
  RAISE NOTICE '✓ 5  Ödeme düzeni';

  RAISE NOTICE 'TUM ODEME TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
