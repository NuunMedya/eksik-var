-- ============================================================
--  EKSİK VAR — 20. migrasyon: Profil düzenleme (seviye alanı)
-- ============================================================
ALTER TABLE users ADD COLUMN skill_level skill_level NOT NULL DEFAULT 'farketmez';
