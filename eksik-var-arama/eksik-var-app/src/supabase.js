// Supabase istemcisi (React Native): oturum AsyncStorage'da saklanır, otomatik yenilenir.
// Gerektirir: npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isLive } from "./config";

export const supabase = isLive()
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { storage: AsyncStorage, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    })
  : null;
