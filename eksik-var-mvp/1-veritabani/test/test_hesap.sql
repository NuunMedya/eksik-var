DO $$
DECLARE u UUID; n INT;
BEGIN
  INSERT INTO auth.users(email, raw_user_meta_data) VALUES ('sil@t.com','{"username":"silinecek","full_name":"Sil"}') RETURNING id INTO u;
  SELECT count(*) INTO n FROM users WHERE id = u;  ASSERT n = 1, 'profil oluşmalı';
  PERFORM set_config('request.jwt.claim.sub', u::text, true); PERFORM set_config('role','authenticated', true);
  PERFORM delete_own_account();
  PERFORM set_config('role','postgres', true);
  SELECT count(*) INTO n FROM auth.users WHERE id = u;  ASSERT n = 0, 'auth kaydı silinmeli';
  SELECT count(*) INTO n FROM users WHERE id = u;       ASSERT n = 0, 'profil silinmeli';
  RAISE NOTICE '✓ hesap silme: auth + profil temizlendi';
  RAISE EXCEPTION 'rollback' USING ERRCODE = 'P0001';
END $$;
