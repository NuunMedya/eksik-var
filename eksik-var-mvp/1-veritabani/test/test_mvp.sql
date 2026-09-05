DO $$
DECLARE ali UUID; zey UUID; cem UUID; den UUID; ev UUID; app UUID; n INT; st TEXT; grp UUID;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905900000001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905900000002', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905900000003', now(), '{"username":"cem","full_name":"Cem"}') RETURNING id INTO cem;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905900000004', now(), '{"username":"deniz","full_name":"Deniz"}') RETURNING id INTO den;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Dünkü Maç', 1, 6, ali, 'Yıldız', now() - interval '3 hours', 10, 2) RETURNING id INTO ev;
  -- Zeynep ve Cem kadroda
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true); UPDATE applications SET applicant_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true); INSERT INTO applications(event_id, applicant_id) VALUES (ev, cem) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', cem::text, true); UPDATE applications SET applicant_approved = true WHERE id = app;

  -- 1) Maç bitmeden oy/skor yok
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN INSERT INTO mvp_votes(event_id, voter_id, voted_id) VALUES (ev, zey, cem); RAISE EXCEPTION 'bitmeden oy';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%MAC_TAMAMLANMADI%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  BEGIN PERFORM record_score(ev, 5, 4); RAISE EXCEPTION 'bitmeden skor';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%MAC_TAMAMLANMADI%' THEN NULL; ELSE RAISE; END IF; END;
  -- tamamla (Cem gelmedi)
  UPDATE participants SET attendance = 'gelmedi' WHERE event_id = ev AND user_id = cem;
  PERFORM complete_event(ev);
  SELECT count(*) INTO n FROM events WHERE id = ev AND completed_at IS NOT NULL;  ASSERT n = 1, 'completed_at dolmalı';
  RAISE NOTICE '✓ 1  Maç bitmeden oylama ve skor kapalı';

  -- 2) Skor: yalnızca organizatör; gruba sistem mesajı
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN PERFORM record_score(ev, 5, 4); RAISE EXCEPTION 'yabancı skor';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%YETKI_YOK%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  PERFORM record_score(ev, 5, 4);
  SELECT score_label INTO st FROM events WHERE id = ev;  ASSERT st = 'Yelekliler – Yeleksizler', 'varsayılan etiket: ' || st;
  grp := group_conversation_for(ev);
  SELECT count(*) INTO n FROM messages WHERE conversation_id = grp AND content LIKE 'Maç sonucu:%5 – 4';  ASSERT n = 1, 'skor mesajı';
  RAISE NOTICE '✓ 2  Skor kaydı';

  -- 3) MVP oyları: kendine oy yok, gelmeyen oy veremez, gelmeyene oy verilemez, maçta olmayan (Deniz) oy veremez
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN INSERT INTO mvp_votes(event_id, voter_id, voted_id) VALUES (ev, zey, zey); RAISE EXCEPTION 'kendine oy';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN INSERT INTO mvp_votes(event_id, voter_id, voted_id) VALUES (ev, zey, cem); RAISE EXCEPTION 'gelmeyene oy';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%OYUNCU_MACTA_DEGIL%' THEN NULL; ELSE RAISE; END IF; END;
  INSERT INTO mvp_votes(event_id, voter_id, voted_id) VALUES (ev, zey, ali);
  PERFORM set_config('request.jwt.claim.sub', cem::text, true);
  BEGIN INSERT INTO mvp_votes(event_id, voter_id, voted_id) VALUES (ev, cem, ali); RAISE EXCEPTION 'gelmeyen oy verdi';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%MACTA_DEGILSIN%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', den::text, true);
  BEGIN INSERT INTO mvp_votes(event_id, voter_id, voted_id) VALUES (ev, den, ali); RAISE EXCEPTION 'yabancı oy verdi';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE '%MACTA_DEGILSIN%' THEN NULL; ELSE RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO mvp_votes(event_id, voter_id, voted_id) VALUES (ev, ali, zey);
  SELECT count(*) INTO n FROM v_event_mvp WHERE event_id = ev;  ASSERT n = 2, 'iki aday';
  RAISE NOTICE '✓ 3  Oy kuralları';

  -- 4) 48 saat sonra ilan: Ali (Zeynep'in oyu, önce verildi) ve Zeynep 1-1 → ilk oy alan (Ali) kazanır; sayaç, bildirim, mesaj
  PERFORM set_config('request.jwt.claim.sub', '', true); PERFORM set_config('role', 'postgres', true);
  UPDATE events SET completed_at = now() - interval '49 hours' WHERE id = ev;
  SELECT finalize_mvp() INTO n;  ASSERT n = 1, 'bir maç ilan edilmeli';
  SELECT count(*) INTO n FROM events WHERE id = ev AND mvp_user_id = ali AND mvp_finalized_at IS NOT NULL;  ASSERT n = 1, 'MVP Ali';
  SELECT mvp_count INTO n FROM users WHERE id = ali;  ASSERT n = 1, 'MVP sayacı';
  SELECT count(*) INTO n FROM messages WHERE conversation_id = grp AND content LIKE '🏆 Maçın oyuncusu: Ali%';  ASSERT n = 1, 'gruba MVP mesajı';
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT count(*) INTO n FROM notifications WHERE type = 'mvp';  ASSERT n = 1, 'MVP bildirimi';
  -- kapanınca oy yok
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  BEGIN INSERT INTO mvp_votes(event_id, voter_id, voted_id) VALUES (ev, zey, ali); RAISE EXCEPTION 'kapalı oylama';
  EXCEPTION WHEN raise_exception OR unique_violation THEN NULL; END;
  RAISE NOTICE '✓ 4  MVP ilanı: sayaç, bildirim, kapanış';

  RAISE NOTICE 'TUM MVP TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
