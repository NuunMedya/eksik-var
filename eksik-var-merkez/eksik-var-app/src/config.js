// Supabase bağlantı bilgileri — Project Settings > API
// Boş bırakılırsa uygulama örnek verilerle (demo modunda) çalışır.
export const SUPABASE_URL = "https://rxmngndtwndqbmlljhth.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bW5nbmR0d25kcWJtbGxqaHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTU1ODksImV4cCI6MjEwMzk5MTU4OX0.ckpunuwIGPFBqil8VQVD3oVfE0Cb_maDfXqfok4AXkc";  // "anon public" anahtar (paylaşılabilir)

export const isLive = () => SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
