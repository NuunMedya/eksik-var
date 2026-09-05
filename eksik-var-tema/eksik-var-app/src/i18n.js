// Çeviri katmanı: t("anahtar") → seçili dil; anahtar yoksa Türkçe, o da yoksa anahtarın kendisi.
// Not: uygulamanın tamamı henüz çevrilmedi; sözlükte olmayan metinler Türkçe kalır ve buraya eklendikçe İngilizceye geçer.
const listeners = new Set();
let lang = "tr";
export const LANGS = [["tr", "Türkçe"], ["en", "English"]];
export const getLang = () => lang;
export const onLangChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export function setLang(next) { lang = LANGS.some(([id]) => id === next) ? next : "tr"; listeners.forEach((fn) => { try { fn(lang); } catch { /* sessiz */ } }); }
export function systemLang() { try { const l = Intl.DateTimeFormat().resolvedOptions().locale || ""; return l.toLowerCase().startsWith("en") ? "en" : "tr"; } catch { return "tr"; } }

const TR = {
  "tab.home": "Saha", "tab.search": "Ara", "tab.chats": "Sohbet", "tab.profile": "Profil",
  "common.cancel": "Vazgeç", "common.save": "Kaydet", "common.back": "Geri", "common.continue": "Devam", "common.send": "Gönder", "common.ok": "Tamam", "common.soon": "yakında",
  "onb.1.title": "\"Eksik var\" de, kadro dolsun", "onb.1.text": "İlçe, saha, saat ve kaç kişi eksik olduğunuz. 30 saniyede yayında; yakındaki oyunculara bildirim gider.",
  "onb.2.title": "Başvur, çift onayla söz ver", "onb.2.text": "Organizatör onaylar, son sözü sen söylersin. Gelmeyen yoklamada işaretlenir; güvenilirlik puanı herkese görünür.",
  "onb.3.title": "Ekibini getir", "onb.3.text": "Haftalık maçını bir kez tanımla: \"Var mısın?\" sorusunu uygulama sorar, eksiği bulur, parayı ve yoklamayı takip eder. WhatsApp grubu sadece muhabbete kalır.",
  "onb.skip": "Geç", "onb.next": "Devam", "onb.start": "Başla",
  "auth.tagline": "Kadron eksik kalmasın.", "auth.login": "Giriş yap", "auth.register": "Kayıt ol", "auth.name": "Ad Soyad", "auth.username": "Kullanıcı adı", "auth.where": "Nerede oynuyorsun?",
  "auth.phone": "Cep telefonu", "auth.phoneHint": "SMS ile 6 haneli kod göndereceğiz. Numaran hiçbir kullanıcıya gösterilmez.", "auth.sendCode": "SMS kodu gönder", "auth.sending": "Gönderiliyor…",
  "auth.enterCode": "Kodu gir", "auth.codeSent": "numarasına 6 haneli bir kod gönderdik.", "auth.verifyRegister": "Doğrula ve hesabı aç", "auth.verifyLogin": "Doğrula ve giriş yap", "auth.verifying": "Doğrulanıyor…",
  "auth.changeNumber": "Numarayı değiştir", "auth.resend": "Kodu yeniden gönder", "auth.resendIn": "Yeniden gönder",
  "home.greeting": "Bugün hangi kadroyu tamamlıyoruz?", "home.allDistricts": "Tüm ilçeler", "home.otherDistricts": "Diğer ilçeler ▾", "home.all": "Hepsi", "home.forMe": "🧤 Bana uygun",
  "home.players": "👤 Eksik oyuncu", "home.opponents": "🆚 Rakip arayanlar", "home.upcoming": "YAKLAŞAN MAÇLARIN", "home.today": "BUGÜN",
  "home.bringTeam": "Ekibini getir", "home.openRequest": "Eksik talebi aç", "home.openOpponent": "Rakip ilanı aç", "home.offline": "Bağlantı yok — son veriler gösteriliyor",
  "settings.title": "Ayarlar", "settings.appearance": "GÖRÜNÜM VE DİL", "settings.theme": "Tema", "settings.theme.system": "Sistem", "settings.theme.light": "Açık", "settings.theme.dark": "Koyu", "settings.language": "Dil",
  "settings.contact": "İLETİŞİM", "settings.notifications": "BİLDİRİMLER", "settings.payment": "ÖDEME BİLGİLERİ", "settings.legal": "HESAP VE HUKUKİ",
  "profile.edit": "Profili düzenle", "profile.bringTeam": "Ekibini getir", "profile.settings": "Ayarlar", "profile.logout": "Çıkış yap", "profile.myMatches": "MAÇLARIM", "profile.positions": "MEVKİLERİM", "profile.reliability": "GÜVENİLİRLİK",
  "event.apply": "Başvur", "event.applied": "Başvurdun · sohbete git", "event.joined": "Kadrodasın", "event.share": "Paylaş", "event.directions": "Yol tarifi", "event.calendar": "Takvime ekle",
  "chats.title": "Sohbetler", "notif.title": "Bildirimler", "create.title": "Eksik talebi aç", "create.publish": "Talebi yayınla", "search.title": "Ara",
};
const EN = {
  "tab.home": "Pitch", "tab.search": "Search", "tab.chats": "Chats", "tab.profile": "Profile",
  "common.cancel": "Cancel", "common.save": "Save", "common.back": "Back", "common.continue": "Continue", "common.send": "Send", "common.ok": "OK", "common.soon": "soon",
  "onb.1.title": "Say \"one short\", fill the squad", "onb.1.text": "District, pitch, time and how many you're short. Live in 30 seconds; nearby players get notified.",
  "onb.2.title": "Apply, commit with double approval", "onb.2.text": "The organizer approves, you have the final say. No-shows are marked at roll call; reliability is visible to everyone.",
  "onb.3.title": "Bring your team", "onb.3.text": "Set up your weekly game once: the app asks \"Are you in?\", finds the missing players, tracks money and attendance. WhatsApp stays for banter.",
  "onb.skip": "Skip", "onb.next": "Next", "onb.start": "Start",
  "auth.tagline": "Never play a man short.", "auth.login": "Log in", "auth.register": "Sign up", "auth.name": "Full name", "auth.username": "Username", "auth.where": "Where do you play?",
  "auth.phone": "Mobile number", "auth.phoneHint": "We'll text you a 6-digit code. Your number is never shown to other users.", "auth.sendCode": "Send SMS code", "auth.sending": "Sending…",
  "auth.enterCode": "Enter the code", "auth.codeSent": "— we sent a 6-digit code to this number.", "auth.verifyRegister": "Verify and create account", "auth.verifyLogin": "Verify and log in", "auth.verifying": "Verifying…",
  "auth.changeNumber": "Change number", "auth.resend": "Resend code", "auth.resendIn": "Resend",
  "home.greeting": "Which squad are we completing today?", "home.allDistricts": "All districts", "home.otherDistricts": "Other districts ▾", "home.all": "All", "home.forMe": "🧤 For me",
  "home.players": "👤 Players needed", "home.opponents": "🆚 Looking for opponents", "home.upcoming": "YOUR UPCOMING GAMES", "home.today": "TODAY",
  "home.bringTeam": "Bring your team", "home.openRequest": "Post a request", "home.openOpponent": "Post opponent ad", "home.offline": "No connection — showing last data",
  "settings.title": "Settings", "settings.appearance": "APPEARANCE & LANGUAGE", "settings.theme": "Theme", "settings.theme.system": "System", "settings.theme.light": "Light", "settings.theme.dark": "Dark", "settings.language": "Language",
  "settings.contact": "CONTACT", "settings.notifications": "NOTIFICATIONS", "settings.payment": "PAYMENT DETAILS", "settings.legal": "ACCOUNT & LEGAL",
  "profile.edit": "Edit profile", "profile.bringTeam": "Bring your team", "profile.settings": "Settings", "profile.logout": "Log out", "profile.myMatches": "MY GAMES", "profile.positions": "MY POSITIONS", "profile.reliability": "RELIABILITY",
  "event.apply": "Apply", "event.applied": "Applied · open chat", "event.joined": "You're in the squad", "event.share": "Share", "event.directions": "Directions", "event.calendar": "Add to calendar",
  "chats.title": "Chats", "notif.title": "Notifications", "create.title": "Post a request", "create.publish": "Publish", "search.title": "Search",
};
const DICT = { tr: TR, en: EN };
export function t(key, params) {
  let s = (DICT[lang] && DICT[lang][key]) || TR[key] || key;
  if (params) Object.entries(params).forEach(([k, v]) => { s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(v)); });
  return s;
}
