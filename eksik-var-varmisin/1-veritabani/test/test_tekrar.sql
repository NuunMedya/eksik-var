DO $$
DECLARE ali UUID; zey UUID; ev UUID; ev_next UUID; ev2 UUID; app UUID; grp UUID; n INT; k INT; g INT; nx UUID; d TIMESTAMPTZ; st TEXT;
BEGIN
  INSERT INTO auth.users(email, raw_user_meta_data) VALUES ('ali@t.com','{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(email, raw_user_meta_data) VALUES ('zey@t.com','{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true); PERFORM set_config('role','authenticated', true);

  -- 1) Haftalık seri (test için ilk maç dün): series_id = kendi id'si, tek grup
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, recurrence)
    VALUES ('Çarşamba Halı Saha', 1, 1, ali, 'Yıldız', now() - interval '1 day', 14, 2, 'haftalik') RETURNING id INTO ev;
  SELECT series_id INTO nx FROM events WHERE id = ev;  ASSERT nx = ev, 'ilk etkinlik serinin başı olmalı';
  SELECT id INTO grp FROM conversations WHERE type='grup' AND series_id = ev;  ASSERT grp IS NOT NULL, 'seri grubu açılmalı';
  ASSERT group_conversation_for(ev) = grp, 'grup çözümlemesi seri grubunu vermeli';
  RAISE NOTICE '✓ 1  Haftalık seri: seri kimliği ve kalıcı grup';

  -- 2) Zeynep bu haftaya başvurur, çift onay → seri grubuna eklenir
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (ev, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT count(*) INTO n FROM conversation_members WHERE conversation_id = grp AND user_id = zey;  ASSERT n = 1, 'Zeynep seri grubunda olmalı';
  RAISE NOTICE '✓ 2  Çift onay → seri grubuna üyelik';

  -- 3) Ali maçı tamamlar → gelecek hafta otomatik, aynı grup, duyuru mesajı, üyelik korunur
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  SELECT * INTO k, g, nx FROM complete_event(ev);
  ASSERT nx IS NOT NULL, 'gelecek hafta açılmalı';
  SELECT event_date, status::text, series_id INTO d, st, ev_next FROM events WHERE id = nx;
  ASSERT st = 'acik' AND ev_next = ev, 'gelecek hafta açık ve aynı seride olmalı';
  ASSERT (SELECT event_date + interval '7 days' FROM events WHERE id = ev) = d, 'tarih +7 gün olmalı';
  SELECT count(*) INTO n FROM conversations WHERE type='grup' AND series_id = ev;  ASSERT n = 1, 'ikinci grup AÇILMAMALI';
  SELECT count(*) INTO n FROM messages WHERE conversation_id = grp AND content LIKE 'Haftaya aynı saat%';  ASSERT n = 1, 'gruba duyuru düşmeli';
  SELECT count(*) INTO n FROM conversation_members WHERE conversation_id = grp AND user_id = zey;  ASSERT n = 1, 'üyelik korunmalı';
  SELECT filled_count, needed_count INTO n, k FROM events WHERE id = nx;  ASSERT n = 0 AND k = 2, 'yeni haftada kontenjan sıfırlanmalı';
  SELECT events_organized INTO n FROM users WHERE id = ali;  ASSERT n = 2, 'organize sayacı 2 olmalı';
  RAISE NOTICE '✓ 3  Tamamla → gelecek hafta otomatik, tek grup, duyuru, üyelik korunur';

  -- 4) Zeynep gelecek haftaya yeniden başvurur → katılımcı olur, grup üyeliği çakışma yaratmaz
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  INSERT INTO applications(event_id, applicant_id) VALUES (nx, zey) RETURNING id INTO app;
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE applications SET organizer_approved = true WHERE id = app;
  PERFORM set_config('request.jwt.claim.sub', zey::text, true);
  UPDATE applications SET applicant_approved = true WHERE id = app;
  SELECT count(*) INTO n FROM participants WHERE event_id = nx AND user_id = zey;  ASSERT n = 1, 'gelecek haftanın kadrosunda olmalı';
  RAISE NOTICE '✓ 4  Aynı kişi haftaya yeniden başvurabiliyor';

  -- 5) Süresi dolan seri: gelecek hafta AÇILMAZ
  PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count, recurrence, recurrence_until)
    VALUES ('Biten Seri', 1, 1, ali, 'Yıldız', now() - interval '2 hours', 10, 1, 'haftalik', current_date) RETURNING id INTO ev2;
  SELECT * INTO k, g, nx FROM complete_event(ev2);
  ASSERT nx IS NULL, 'süresi dolan seride yeni hafta açılmamalı';
  RAISE NOTICE '✓ 5  Bitiş tarihi geçince seri durur';

  -- 6) Tek seferlik etkinlikte hiçbir şey değişmez
  INSERT INTO events(title, category_id, city_id, organizer_id, venue_name, event_date, total_capacity, needed_count)
    VALUES ('Tek Maç', 1, 1, ali, 'Yıldız', now() - interval '2 hours', 10, 1) RETURNING id INTO ev2;
  SELECT count(*) INTO n FROM conversations WHERE type='grup' AND event_id = ev2 AND series_id IS NULL;  ASSERT n = 1, 'tek seferlik kendi grubunu açmalı';
  SELECT * INTO k, g, nx FROM complete_event(ev2);
  ASSERT nx IS NULL, 'tek seferlik maçta gelecek hafta olmaz';
  RAISE NOTICE '✓ 6  Tek seferlik etkinlik eski davranışını koruyor';

  RAISE NOTICE 'TUM TEKRAR TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
