DO $$
DECLARE ali UUID; zey UUID; n INT;
BEGIN
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905400400001', now(), '{"username":"ali","full_name":"Ali"}') RETURNING id INTO ali;
  INSERT INTO auth.users(phone, phone_confirmed_at, raw_user_meta_data) VALUES ('905400400002', now(), '{"username":"zeynep","full_name":"Zeynep"}') RETURNING id INTO zey;
  PERFORM set_config('role','authenticated', true); PERFORM set_config('request.jwt.claim.sub', ali::text, true);
  UPDATE users SET full_name = 'Ali Yılmaz', username = 'ali_kaptan', bio = 'Kaleye de geçerim', skill_level = 'ileri', city_id = 6, district_id = 1130 WHERE id = ali;
  SELECT count(*) INTO n FROM users WHERE id = ali AND username = 'ali_kaptan' AND skill_level = 'ileri' AND bio = 'Kaleye de geçerim';  ASSERT n = 1, 'profil güncellenmeli';
  BEGIN UPDATE users SET username = 'zeynep' WHERE id = ali; RAISE EXCEPTION 'alınmış kullanıcı adı kabul edilmemeli';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  UPDATE users SET full_name = 'Hack' WHERE id = zey;  GET DIAGNOSTICS n = ROW_COUNT;  ASSERT n = 0, 'başkasının profili değiştirilemez';
  RAISE NOTICE '✓ 1  Profil düzenleme: kendi satırı, benzersiz kullanıcı adı';
  RAISE NOTICE 'TUM PROFIL TESTLERI BASARILI';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
