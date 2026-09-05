// Supabase bağlantı bilgileri — Project Settings > API
// Boş bırakılırsa uygulama örnek verilerle (demo modunda) çalışır.
export const SUPABASE_URL = "";       // örn. "https://abcdefgh.supabase.co"
export const SUPABASE_ANON_KEY = "";  // "anon public" (veya "publishable") anahtar

export const isLive = () => SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
