DO $$
DECLARE a UUID; b UUID; c UUID; ev UUID; st call_status;
BEGIN
  INSERT INTO users(phone, username, full_name) VALUES ('+905550000001','t_ali','Test Ali') RETURNING id INTO a;
  INSERT INTO users(phone, username, full_name) VALUES ('+905550000002','t_zeynep','Test Zeynep') RETURNING id INTO b;
  INSERT INTO users(phone, username, full_name) VALUES ('+905550000003','t_murat','Test Murat') RETURNING id INTO c;
  -- Zeynep: yalnızca mesaj → aranamaz, yazılabilir
  UPDATE users SET contact_mode='mesaj' WHERE id=b;
  ASSERT can_call(a,b) = FALSE, 'Zeynep aranamamali';
  ASSERT can_message(a,b) = TRUE, 'Zeynepe yazilabilmeli';
  -- Murat: sadece kadro → yabancı arayamaz/yazamaz; başvuru sohbeti açık
  UPDATE users SET contact_scope='kadro' WHERE id=c;
  ASSERT can_call(a,c) = FALSE, 'Murat yabanci tarafindan aranamamali';
  ASSERT can_message(a,c) = FALSE, 'Murata yabanci yazamamali';
  ASSERT can_message(a,c,TRUE) = TRUE, 'basvuru sohbeti acik olmali';
  -- Aynı kadroya girince arama açılır
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Test Mac', 1, 1, a, 'Test Saha', now() + interval '1 day', 10, 2) RETURNING id INTO ev;
  INSERT INTO participants(event_id, user_id) VALUES (ev, c);
  ASSERT shares_squad(a,c) = TRUE, 'ayni kadroda olmali';
  ASSERT can_call(a,c) = TRUE, 'kadrodaki arayabilmeli';
  -- Sessiz saat 22:00-08:00
  UPDATE users SET quiet_enabled=TRUE, quiet_start='22:00', quiet_end='08:00' WHERE id=c;
  ASSERT in_quiet_hours(c, '02:00') = TRUE, 'gece sessiz olmali';
  ASSERT in_quiet_hours(c, '14:00') = FALSE, 'gunduz acik olmali';
  UPDATE users SET quiet_enabled=FALSE WHERE id=c;
  -- Engel her şeyi keser
  INSERT INTO blocks(blocker_id, blocked_id) VALUES (c, a);
  ASSERT can_call(a,c) = FALSE, 'engelli arayamamali';
  ASSERT can_message(a,c,TRUE) = FALSE, 'engelli yazamamali';
  -- Trigger: izinsiz arama 'engellendi', izinli arama 'araniyor'
  INSERT INTO calls(caller_id, callee_id) VALUES (a, b) RETURNING status INTO st;
  ASSERT st = 'engellendi', 'izinsiz arama engellenmeli';
  DELETE FROM blocks WHERE blocker_id=c;
  INSERT INTO calls(caller_id, callee_id) VALUES (a, c) RETURNING status INTO st;
  ASSERT st = 'araniyor', 'izinli arama kurulmali';
  RAISE NOTICE 'TUM TESTLER BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';  -- test verisini geri al
END $$;
