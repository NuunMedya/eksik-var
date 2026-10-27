// Supabase bağlantı bilgileri — Project Settings > API
// Boş bırakılırsa uygulama örnek verilerle (demo modunda) çalışır.
export const SUPABASE_URL = "https://rxmngndtwndqbmlljhth.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bW5nbmR0d25kcWJtbGxqaHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTU1ODksImV4cCI6MjEwMzk5MTU4OX0.ckpunuwIGPFBqil8VQVD3oVfE0Cb_maDfXqfok4AXkc";  // "anon public" anahtar (paylaşılabilir)

export const isLive = () => SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

// Çökme raporlama (Sentry) ve davranış ölçümü (PostHog). Boşsa ikisi de sessizce kapalıdır.
// Sentry: sentry.io → proje oluştur (React Native) → DSN'i buraya yapıştır.
export const SENTRY_DSN = "";
// PostHog: posthog.com (EU bölgesi önerilir) → Project API key.
export const POSTHOG_KEY = "";
export const POSTHOG_HOST = "https://eu.i.posthog.com";
