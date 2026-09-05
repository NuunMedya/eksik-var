DO $$
DECLARE ali UUID; zey UUID; cem UUID; den UUID; ev UUID; ev2 UUID; app UUID; n INT; st TEXT; off UUID;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905400000001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905400000002', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905400000003', now(), '{"username":"cem","full_name":"Cem"}') RETURNING id INTO cem;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905400000004', now(), '{"username":"deniz","full_name":"Deniz"}') RETURNING id INTO den;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Dolu Maç', 1, 6, ali, 'X', now() + interval '3 days', 10, 1) RETURNING id INTO ev;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);  UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT status::text INTO st FROM events WHERE id = ev;  ASSERT st = 'doldu', 'doldu olmalı';

  -- 1) Yer varken yedek olunamaz; doluyken olunur; sayı herkese açık
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count) VALUES ('Açık Maç', 1, 6, ali, 'X', now() + interval '3 days', 10, 2) RETURNING id INTO ev2;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN INSERT INTO waitlist(event_id, user_id) VALUES (ev2, cem); RAISE EXCEPTION 'yer varken yedek olmamalı';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YER_VAR%' THEN NULL; ELSE RAISE; END IF; END;
  INSERT INTO waitlist(event_id, user_id) VALUES (ev, cem);
  PERFORM set_config('request.jwt.claim.sub', den::text, true);
  INSERT INTO waitlist(event_id, user_id) VALUES (ev, den);
  SELECT waiting INTO n FROM v_event_waitlist_count WHERE event_id = ev;  ASSERT n = 2, '2 yedek';
  RAISE NOTICE '✓ 1  Yedek olma kuralları ve sayı';

  -- 2) Zeynep ayrılır → sıradaki Cem'e süreli teklif (organizatör onaylı başvuru + sohbet + bildirim); Deniz beklemede
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  PERFORM leave_event(ev);
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  SELECT id INTO off FROM applications WHERE event_id = ev AND applicant_id = cem AND from_waitlist AND organizer_approved AND status = 'beklemede' AND offer_expires_at > now();
  ASSERT off IS NOT NULL, 'Cem teklif almalı';
  SELECT count(*) INTO n FROM applications WHERE id = off AND conversation_id IS NOT NULL;  ASSERT n = 1, 'teklifle sohbet açılmalı';
  SELECT count(*) INTO n FROM notifications WHERE type IN ('davet', 'yedek') AND is_read = false;  ASSERT n >= 1, 'Cem bildirim almalı';
  SELECT waiting INTO n FROM v_event_waitlist_count WHERE event_id = ev;  ASSERT n = 1, 'Deniz listede kalmalı';
  -- teklif süresince yer rezerve: Deniz normal başvuramaz (yer yok görünür)
  ASSERT position_available(ev, NULL) = false, 'teklif yer rezerve etmeli';
  RAISE NOTICE '✓ 2  Yer açılınca süreli teklif, yer rezerve';

  -- 3) Cem kabul eder → kadro, doldu
  UPDATE applications SET applicant_approved = true WHERE id = off;
  SELECT count(*) INTO n FROM participants WHERE event_id = ev AND user_id = cem;  ASSERT n = 1, 'Cem kadroda';
  SELECT status::text INTO st FROM events WHERE id = ev;  ASSERT st = 'doldu', 'yeniden doldu';
  RAISE NOTICE '✓ 3  Teklif kabul → kadro';

  -- 4) Cem ayrılır → Deniz'e teklif; süre dolar → iptal ve bildirim
  PERFORM leave_event(ev);
  PERFORM set_config('request.jwt.claim.sub', den::text, true);
  SELECT id INTO off FROM applications WHERE event_id = ev AND applicant_id = den AND from_waitlist AND status = 'beklemede';
  ASSERT off IS NOT NULL, 'Deniz teklif almalı';
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  UPDATE applications SET offer_expires_at = now() - interval '1 minute' WHERE id = off;
  SELECT expire_waitlist_offers() INTO n;  ASSERT n = 1, 'bir teklif süresi dolmalı: ' || n;
  SELECT status::text INTO st FROM applications WHERE id = off;  ASSERT st IN ('iptal', 'reddedildi'), 'süresi dolan kapanmalı: ' || st;
  ASSERT position_available(ev, NULL) = true, 'rezervasyon kalkmalı';
  RAISE NOTICE '✓ 4  Teklif süresi dolunca yer serbest';

  -- 5) Mevkiye göre sıra: kaleci kotalı maç; Cem (defans) ve Deniz (kaleci) yedek; kaleci ayrılınca Deniz teklif alır, Cem bekler
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, needed_positions)
    VALUES ('Kaleci Maçı', 1, 6, ali, 'X', now() + interval '3 days', 10, 1, '{"kaleci":1}') RETURNING id INTO ev2;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id, position) VALUES (ev2, zey, 'kaleci') RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);  UPDATE applications SET applicant_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  INSERT INTO waitlist(event_id, user_id, position) VALUES (ev2, cem, 'defans');
  PERFORM set_config('request.jwt.claim.sub', den::text, true);
  INSERT INTO waitlist(event_id, user_id, position) VALUES (ev2, den, 'kaleci');
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  PERFORM leave_event(ev2);
  PERFORM set_config('request.jwt.claim.sub', den::text, true);
  SELECT count(*) INTO n FROM applications WHERE event_id = ev2 AND applicant_id = den AND from_waitlist;  ASSERT n = 1, 'kaleci yedeği teklif almalı';
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  SELECT count(*) INTO n FROM waitlist WHERE event_id = ev2 AND user_id = cem;  ASSERT n = 1, 'defans yedeği beklemeli';
  RAISE NOTICE '✓ 5  Mevkiye göre sıra';

  -- 6) Yedekten kendi isteğiyle çıkma
  DELETE FROM waitlist WHERE event_id = ev2 AND user_id = cem;
  SELECT count(*) INTO n FROM waitlist WHERE event_id = ev2 AND user_id = cem;  ASSERT n = 0, 'yedekten çıkabilmeli';
  RAISE NOTICE '✓ 6  Yedekten çıkma';

  RAISE NOTICE 'TUM YEDEK TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
