// Eksik Var — çökme raporlama (Sentry) + davranış ölçümü (PostHog), tek giriş noktası.
// Anahtarlar config.js'te boşsa hiçbir şey yüklenmez; ekranlar yalnızca olay(), kimlik(), hata() çağırır.
import { SENTRY_DSN, POSTHOG_KEY, POSTHOG_HOST } from "./config";

let Sentry = null, posthog = null;

export function izlemeBaslat() {
  if (SENTRY_DSN) {
    try {
      Sentry = require("@sentry/react-native");
      Sentry.init({ dsn: SENTRY_DSN, enableAutoSessionTracking: true, tracesSampleRate: 0.1, sendDefaultPii: false });
    } catch { Sentry = null; }
  }
  if (POSTHOG_KEY) {
    try {
      const { PostHog } = require("posthog-react-native");
      posthog = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST, captureAppLifecycleEvents: true });
    } catch { posthog = null; }
  }
}

/* Olay: kısa Türkçe anahtar + küçük özellik nesnesi. Kişisel veri (telefon, isim) GÖNDERME. */
export function olay(ad, ozellik) {
  try { if (posthog) posthog.capture(ad, ozellik || {}); } catch { /* sessiz */ }
}
/* Oturum açınca anonim kimlik yerine kullanıcı kimliği (uuid) — telefon/isim yok */
export function kimlik(uid, ozellik) {
  try {
    if (posthog) { if (uid) posthog.identify(uid, ozellik || {}); else posthog.reset(); }
    if (Sentry) Sentry.setUser(uid ? { id: uid } : null);
  } catch { /* sessiz */ }
}
/* Yakalanmış hatalar (try/catch içindekiler) da raporlansın */
export function hata(e, baglam) {
  try { if (Sentry) Sentry.captureException(e, baglam ? { extra: baglam } : undefined); } catch { /* sessiz */ }
}
export const sentryWrap = (Comp) => { try { return Sentry ? Sentry.wrap(Comp) : Comp; } catch { return Comp; } };
