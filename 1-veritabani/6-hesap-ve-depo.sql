-- ============================================================
--  EKSİK VAR — 6. migrasyon: Hesap silme + profil fotoğrafı deposu
-- ============================================================

-- a) Kullanıcı kendi hesabını siler (auth kaydı → profil CASCADE; mesajlar anonimleşir)
CREATE OR REPLACE FUNCTION delete_own_account() RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
BEGIN
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'YETKI_YOK'; END IF;
    DELETE FROM auth.users WHERE id = auth.uid();
END $$;
GRANT EXECUTE ON FUNCTION delete_own_account() TO authenticated;

-- b) Profil fotoğrafları: herkese açık okunur "avatars" deposu; herkes yalnızca kendi klasörüne yazar
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
        EXECUTE $q$ CREATE POLICY avatars_public_read ON storage.objects FOR SELECT USING (bucket_id = 'avatars') $q$;
        EXECUTE $q$ CREATE POLICY avatars_own_insert ON storage.objects FOR INSERT TO authenticated
                    WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text) $q$;
        EXECUTE $q$ CREATE POLICY avatars_own_update ON storage.objects FOR UPDATE TO authenticated
                    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text) $q$;
        EXECUTE $q$ CREATE POLICY avatars_own_delete ON storage.objects FOR DELETE TO authenticated
                    USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text) $q$;
    END IF;
END $$;
