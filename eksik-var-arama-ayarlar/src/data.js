// Eksik Var — örnek veriler + yardımcılar
// Not: Supabase bağlantısı yapılana kadar uygulama bu verilerle çalışır.

export const CITIES = ["Ankara", "İstanbul", "İzmir", "Bursa"];

export const CATEGORIES = [
  { id: 1, name: "Halı Saha", icon: "⚽" },
  { id: 2, name: "Basketbol", icon: "🏀" },
  { id: 3, name: "Voleybol", icon: "🏐" },
  { id: 4, name: "Tenis", icon: "🎾" },
];

// İletişim tercihleri: mode = ikisi | mesaj | arama, scope = herkes | kadro
export const DEFAULT_CONTACT = {
  mode: "ikisi", scope: "herkes",
  quiet: { enabled: false, start: "22:00", end: "08:00" },
};
export const DEFAULT_SETTINGS = {
  contact: DEFAULT_CONTACT,
  notif: { basvuru: true, mesaj: true, hatirlatma: true },
};
export const MODE_LABEL = { ikisi: "Mesaj ve arama açık", mesaj: "Yalnızca mesaj", arama: "Yalnızca arama" };

export const ORGS = {
  ali:    { id: "ali",    name: "Ali Yılmaz",    username: "ali_kaptan", rating: 4.8, count: 34, rel: 96,
            contact: { mode: "ikisi", scope: "herkes", quiet: { enabled: false, start: "22:00", end: "08:00" } } },
  zeynep: { id: "zeynep", name: "Zeynep Arslan", username: "zeynepa",    rating: 4.9, count: 51, rel: 98,
            contact: { mode: "mesaj", scope: "herkes", quiet: { enabled: false, start: "22:00", end: "08:00" } } },
  murat:  { id: "murat",  name: "Murat Şahin",   username: "murat07",    rating: 4.2, count: 9,  rel: 78,
            contact: { mode: "ikisi", scope: "kadro",  quiet: { enabled: true,  start: "23:00", end: "08:00" } } },
  ozan:   { id: "ozan",   name: "Ozan Demir",    username: "ozandmr",    rating: 4.5, count: 21, rel: 90,
            contact: { mode: "arama", scope: "herkes", quiet: { enabled: false, start: "22:00", end: "08:00" } } },
};

export const SEED_EVENTS = [
  {
    id: "e1", title: "Çarşamba Halı Saha", cat: 1, city: "Ankara",
    venue: "Yıldız Halı Saha, Çankaya", date: "Çar · 21:00", price: 150,
    capacity: 14, needed: 3, filled: 2, level: "Orta", status: "acik",
    org: ORGS.ali, joined: false, mine: false,
    desc: "Her hafta oynayan sıkı bir ekibiz, bu hafta 3 kişi eksiğiz. Kaleci öncelikli! Saha ücreti çıkışta bölüşülür.",
  },
  {
    id: "e2", title: "Pazar Ligi Maçı", cat: 1, city: "Ankara",
    venue: "Arena Spor Tesisleri, Keçiören", date: "Paz · 18:00", price: 120,
    capacity: 12, needed: 2, filled: 0, level: "Farketmez", status: "acik",
    org: null, joined: false, mine: true,
    desc: "Pazar ligimizin bu haftaki maçı için 2 oyuncu arıyoruz. Stoper ve orta saha eksik.",
  },
  {
    id: "e3", title: "3x3 Sokak Basketbolu", cat: 2, city: "İstanbul",
    venue: "Maltepe Sahil Sahası", date: "Cmt · 16:00", price: 0,
    capacity: 6, needed: 2, filled: 1, level: "Başlangıç", status: "acik",
    org: ORGS.zeynep, joined: false, mine: false,
    desc: "Rahat tempolu 3x3 maçı, yeni başlayanlar da gelebilir. Top bizden.",
  },
  {
    id: "e4", title: "Karışık Voleybol Akşamı", cat: 3, city: "İzmir",
    venue: "Bostanlı Spor Salonu", date: "Per · 20:00", price: 80,
    capacity: 12, needed: 4, filled: 1, level: "Orta", status: "acik",
    org: ORGS.ozan, joined: false, mine: false,
    desc: "Karışık takım, file boyu standart. Salona uygun spor ayakkabı zorunlu.",
  },
  {
    id: "e5", title: "Tenis Eşleşmesi", cat: 4, city: "Bursa",
    venue: "Nilüfer Kort 2", date: "Cum · 19:00", price: 200,
    capacity: 2, needed: 1, filled: 0, level: "İleri", status: "acik",
    org: ORGS.zeynep, joined: false, mine: false,
    desc: "Tek maç için rakip arıyorum, ileri seviye. Kort ücreti yarı yarıya.",
  },
  {
    id: "e6", title: "Cuma Akşam Maçı", cat: 1, city: "İstanbul",
    venue: "GoldSaha, Kadıköy", date: "Cum · 22:00", price: 170,
    capacity: 14, needed: 2, filled: 2, level: "Orta", status: "doldu",
    org: ORGS.ali, joined: false, mine: false,
    desc: "Kadro tamamlandı, iyi maçlar!",
  },
];

export const SEED_CHATS = [
  {
    id: "g-e2", type: "grup", eventId: "e2", title: "Pazar Ligi Maçı", sub: "11 üye",
    unread: 0, lastTime: "14:02",
    msgs: [
      { id: "s1", from: "sys", text: "Grubu oluşturdun · Onaylanan oyuncular buraya eklenir", time: "12:40" },
      { id: "m1", from: "ozan", name: "Ozan Demir", text: "Bu hafta forma beyaz mı hocam?", time: "13:58" },
      { id: "m2", from: "me", text: "Beyaz getirin, rakip koyu giyiyor", time: "14:02" },
    ],
  },
  {
    id: "g-old", type: "grup", eventId: null, title: "Salı Basketbol Ekibi", sub: "8 üye",
    unread: 2, lastTime: "Dün",
    msgs: [
      { id: "s1", from: "sys", text: "Zeynep Arslan kadroya katıldı", time: "Dün" },
      { id: "m1", from: "zeynep", name: "Zeynep Arslan", text: "Salı 20:00 kesinleşti mi?", time: "Dün" },
      { id: "m2", from: "ozan", name: "Ozan Demir", text: "Kesin, salon onaylandı 👍", time: "Dün" },
    ],
  },
  {
    id: "dm-zeynep", type: "birebir", eventId: null, otherId: "zeynep", title: "Zeynep Arslan", sub: "",
    unread: 0, lastTime: "Cts",
    msgs: [
      { id: "m1", from: "zeynep", name: "Zeynep Arslan", text: "Geçen maç için tekrar teşekkürler 🙌", time: "Cts" },
      { id: "m2", from: "me", text: "Ben teşekkür ederim, yine bekleriz!", time: "Cts" },
    ],
  },
];

export const SEED_APPS = [
  { id: "a1", eventId: "e2", who: ORGS.murat, note: "Stoper oynarım hocam, ben varım", status: "beklemede" },
];

export const MY_COMMENTS = [
  { from: "Ali Yılmaz", stars: 5, text: "Dakik ve centilmen, her maça alırım 👏" },
  { from: "Zeynep Arslan", stars: 5, text: "Takım oyununa katkısı süper" },
  { from: "Ozan Demir", stars: 4, text: "İyi maçtı, yine bekleriz" },
];

/* ---------- yardımcılar ---------- */
export const nowTime = () =>
  new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

export const uid = () => Math.random().toString(36).slice(2, 9);

export const initials = (name) =>
  (name || "?").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const AVATAR_BG = ["#0B3D2E", "#1D5FBF", "#7C3AED", "#B4232A", "#B45309"];
export const avatarBg = (name) =>
  AVATAR_BG[((name || "?").charCodeAt(0) || 0) % AVATAR_BG.length];

const SENDER_COLOR = ["#0B6B3A", "#1D5FBF", "#7C3AED", "#B4232A", "#B45309"];
export const senderColor = (id) =>
  SENDER_COLOR[((id || "?").charCodeAt(0) || 0) % SENDER_COLOR.length];

/* ---------- iletişim izinleri ---------- */
export function inQuietHours(quiet, now = new Date()) {
  if (!quiet || !quiet.enabled) return false;
  const [sh, sm] = quiet.start.split(":").map(Number);
  const [eh, em] = quiet.end.split(":").map(Number);
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = sh * 60 + sm, e = eh * 60 + em;
  return s <= e ? cur >= s && cur < e : cur >= s || cur < e; // gece yarısını aşan aralık
}

/* other: karşı tarafın kaydı · sharesSquad: aynı kadroda mıyız
   applicationChat: başvuru sohbeti mi (bunlar kapsam kısıtından muaf) */
export function contactRules(other, sharesSquad, applicationChat = false) {
  const c = (other && other.contact) || DEFAULT_CONTACT;
  const first = ((other && other.name) || "Bu kişi").split(" ")[0];
  const r = { canMessage: true, canCall: true, messageReason: null, callReason: null };
  if (c.mode === "arama") { r.canMessage = false; r.messageReason = `${first} yalnızca arama kabul ediyor`; }
  if (c.mode === "mesaj") { r.canCall = false; r.callReason = `${first} aramaları kapatmış`; }
  if (c.scope === "kadro" && !sharesSquad) {
    if (r.canCall) { r.canCall = false; r.callReason = `${first} yalnızca kadrosundakilerden arama alıyor`; }
    if (r.canMessage && !applicationChat) { r.canMessage = false; r.messageReason = `${first} yalnızca kadrosundakilerden mesaj alıyor`; }
  }
  if (r.canCall && inQuietHours(c.quiet)) {
    r.canCall = false; r.callReason = `${first} şu an sessiz saatlerde (${c.quiet.start}–${c.quiet.end})`;
  }
  return r;
}
