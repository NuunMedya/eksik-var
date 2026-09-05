// Eksik Var — örnek veriler + yardımcılar
import { C } from "./theme";
import { t } from "./i18n";
// Not: Supabase bağlantısı yapılana kadar uygulama bu verilerle çalışır.

export const CITIES = ["Ankara", "İstanbul", "İzmir", "Bursa"];

export const LEVELS = ["Farketmez", "Başlangıç", "Orta", "İleri"];
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
  notif: { basvuru: true, mesaj: true, hatirlatma: true, yakin: true },
};
export const MODE_LABEL = { ikisi: "Mesaj ve arama açık", mesaj: "Yalnızca mesaj", arama: "Yalnızca arama" };

export const ORGS = {
  ali:    { id: "ali",    name: "Ali Yılmaz",    username: "ali_kaptan", rating: 4.8, count: 34, rel: 96, joined: 48, noShow: 2, teamName: "Çankaya Yıldızları", teamMatches: 12,
            contact: { mode: "ikisi", scope: "herkes", quiet: { enabled: false, start: "22:00", end: "08:00" } } },
  zeynep: { id: "zeynep", name: "Zeynep Arslan", username: "zeynepa",    rating: 4.9, count: 51, rel: 98, joined: 61, noShow: 1,
            contact: { mode: "mesaj", scope: "herkes", quiet: { enabled: false, start: "22:00", end: "08:00" } } },
  murat:  { id: "murat",  name: "Murat Şahin",   username: "murat07",    rating: 4.2, count: 9,  rel: 78, joined: 7, noShow: 2, teamName: "Etimesgut Boğaları", teamMatches: 2,
            contact: { mode: "ikisi", scope: "kadro",  quiet: { enabled: true,  start: "23:00", end: "08:00" } } },
  ozan:   { id: "ozan",   name: "Ozan Demir",    username: "ozandmr",    rating: 4.5, count: 21, rel: 90, joined: 27, noShow: 3,
            contact: { mode: "arama", scope: "herkes", quiet: { enabled: false, start: "22:00", end: "08:00" } } },
};

export const SEED_EVENTS = [
  {
    id: "e0", title: "Salı Halı Saha", cat: 1, city: "Ankara", district: "Çankaya", format: "6v6",
    venue: "Yıldız Halı Saha, Çankaya", date: "Dün · 21:00", price: 150,
    capacity: 12, needed: 2, filled: 2, level: "Orta", status: "doldu",
    org: null, joined: false, mine: true, ended: true, attendance: null,
    guests: [{ id: "g3", name: "Hasan Kara", available: true, attendance: "bekleniyor", payment: "bekliyor" }], checkedIns: ["ozan", "murat"],
    desc: "Dün oynandı. Yoklamayı alıp maçı tamamla; gelmeyenleri işaretle.",
  },
  {
    id: "e8", title: "Cuma Halı Saha", cat: 1, city: "Ankara", district: "Çankaya", format: "7v7",
    venue: "GoldSaha, Kızılay", date: "Geçen Cuma · 22:00", price: 150,
    capacity: 14, needed: 2, filled: 2, level: "Orta", status: "tamamlandi",
    org: ORGS.zeynep, joined: true, mine: false, ended: true,
    myAttendance: "katildi", attendance: { me: "katildi" },
    score: { home: 5, away: 4, label: "Yelekliler – Yeleksizler" }, mvp: { id: "zeynep", name: "Zeynep Arslan", votes: 6, final: true },
    myPayment: { amount: 150, status: "bekliyor" },
    stats: [{ id: "zeynep", name: "Zeynep Arslan", goals: 3, assists: 1 }, { id: "me", name: "Emre Kaya", goals: 1, assists: 2 }, { id: "u-kerem", name: "Kerem Aydın", goals: 1, assists: 0 }],
    desc: "Tamamlandı. Zeynep yoklamayı aldı; katıldın olarak işaretlendin.",
  },
  {
    id: "e1", title: "Çarşamba Halı Saha", cat: 1, city: "Ankara", district: "Çankaya", format: "7v7",
    venue: "Yıldız Halı Saha, Çankaya", date: "Çar · 21:00", price: 150,
    capacity: 14, needed: 3, filled: 2, level: "Orta", status: "acik",
    org: ORGS.ali, joined: false, mine: false, needs: { kaleci: 1, defans: 1, orta: 1 }, filledPos: { defans: 1, orta: 1 },
    desc: "Her hafta oynayan sıkı bir ekibiz, bu hafta 3 kişi eksiğiz. Kaleci öncelikli! Saha ücreti çıkışta bölüşülür.",
  },
  {
    id: "e2", title: "Pazar Ligi Maçı", cat: 1, city: "Ankara", district: "Keçiören", format: "6v6",
    venue: "Arena Spor Tesisleri, Keçiören", date: "Paz · 18:00", price: 120,
    capacity: 12, needed: 2, filled: 0, level: "Farketmez", status: "acik",
    org: null, joined: false, mine: true,
    recurrence: "haftalik", seriesId: "e2", weekday: 0, time: "18:00", recurrenceUntil: null, needs: { defans: 1, orta: 1 }, filledPos: {}, offlineRegulars: 0, availabilityAsked: true,
    guests: [{ id: "g1", name: "Hasan Kara", available: true, attendance: "bekleniyor", payment: "bekliyor" }, { id: "g2", name: "Mehmet Aydın", available: false, attendance: "bekleniyor", payment: "bekliyor" }],
    desc: "Pazar ligimizin bu haftaki maçı için 2 oyuncu arıyoruz. Stoper ve orta saha eksik.",
  },
  {
    id: "e3", title: "3x3 Sokak Basketbolu", cat: 2, city: "İstanbul", district: "Maltepe", format: "3x3",
    venue: "Maltepe Sahil Sahası", date: "Cmt · 16:00", price: 0,
    capacity: 6, needed: 2, filled: 1, level: "Başlangıç", status: "acik",
    org: ORGS.zeynep, joined: false, mine: false,
    desc: "Rahat tempolu 3x3 maçı, yeni başlayanlar da gelebilir. Top bizden.",
  },
  {
    id: "e4", title: "Karışık Voleybol Akşamı", cat: 3, city: "İzmir", district: "Karşıyaka", format: "6v6",
    venue: "Bostanlı Spor Salonu", date: "Per · 20:00", price: 80,
    capacity: 12, needed: 4, filled: 1, level: "Orta", status: "acik",
    org: ORGS.ozan, joined: false, mine: false, needs: { libero: 1 }, filledPos: { smacor: 1 },
    desc: "Karışık takım, file boyu standart. Salona uygun spor ayakkabı zorunlu.",
  },
  {
    id: "e5", title: "Tenis Eşleşmesi", cat: 4, city: "Bursa", district: "Nilüfer", format: "1v1",
    venue: "Nilüfer Kort 2", date: "Cum · 19:00", price: 200,
    capacity: 2, needed: 1, filled: 0, level: "İleri", status: "acik",
    org: ORGS.zeynep, joined: false, mine: false,
    desc: "Tek maç için rakip arıyorum, ileri seviye. Kort ücreti yarı yarıya.",
  },
  {
    id: "e9", title: "Kızılay Akşam Basketi", cat: 2, city: "Ankara", district: "Çankaya", format: "5v5",
    venue: "Kurtuluş Parkı Sahası", date: "Per · 20:00", price: 0,
    capacity: 10, needed: 3, filled: 1, level: "Orta", status: "acik",
    org: ORGS.ozan, joined: false, mine: false, needs: { guard: 1 }, filledPos: { pivot: 1 },
    desc: "Açık hava 5x5, top bizden. Yağmur yağarsa ertelenir.",
  },
  {
    id: "e10", title: "Etimesgut Halı Saha", cat: 1, city: "Ankara", district: "Etimesgut", format: "7v7",
    venue: "Eryaman Spor Kompleksi", date: "Cmt · 19:00", price: 130,
    capacity: 14, needed: 2, filled: 0, level: "Başlangıç", status: "acik",
    org: ORGS.murat, joined: false, mine: false,
    desc: "Rahat tempolu maç, yeni başlayanlar da gelsin.",
  },
  {
    id: "e11", title: "Çankaya Cuma Maçı", cat: 1, city: "Ankara", district: "Çankaya", format: "7v7",
    venue: "Ayrancı Halı Saha", date: "Cum · 21:30", price: 160,
    capacity: 14, needed: 1, filled: 0, level: "İleri", status: "acik",
    org: ORGS.ali, joined: false, mine: false, needs: { defans: 1 }, filledPos: {},
    desc: "Sıkı bir maç, bir stoper arıyoruz.",
  },
  {
    id: "e12", title: "Cumartesi Halı Saha", cat: 1, city: "Ankara", district: "Çankaya",
    venue: "Bilkent Spor Sahası", date: "Cmt · 20:00", price: 140,
    capacity: 14, needed: 2, filled: 2, level: "Orta", status: "doldu",
    org: ORGS.ozan, joined: false, mine: false, needs: { kaleci: 1 }, filledPos: { kaleci: 1, forvet: 1 },
    waitlistCount: 1, myWaitlist: false,
    desc: "Kadro doldu ama ayrılan olursa yedekten çağırırız. Yedek listesine gir!",
  },
  {
    id: "r1", kind: "rakip", title: "7v7 rakip · Cumartesi 20:00", cat: 1, city: "Ankara", district: "Çankaya",
    venue: "Yıldız Halı Saha", date: "Cmt · 20:00", price: 0, teamName: "Çankaya Yıldızları", format: "7v7", venueMode: "bizde", costMode: "yari_yariya",
    capacity: 7, needed: 1, filled: 0, level: "Orta", status: "acik", org: ORGS.ali, joined: false, mine: false,
    desc: "Her hafta oynayan sıkı ekibiz, bu Cumartesi rakibimiz yok. Saha bizde, ücret yarı yarıya, sertliğe gelemeyen gelmesin :)",
  },
  {
    id: "r2", kind: "rakip", title: "6v6 rakip · Pazar 21:00", cat: 1, city: "Ankara", district: "Etimesgut",
    venue: "", date: "Paz · 21:00", price: 0, teamName: "Etimesgut Boğaları", format: "6v6", venueMode: "sizde", costMode: "yari_yariya",
    capacity: 6, needed: 1, filled: 0, level: "Başlangıç", status: "acik", org: ORGS.murat, joined: false, mine: false,
    desc: "Yeni kurulan ekibiz, rahat tempolu maç istiyoruz. Sahayı siz ayarlarsanız geliriz.",
  },
  {
    id: "r3", kind: "rakip", title: "7v7 rakip · Cuma 22:00", cat: 1, city: "Ankara", district: "Keçiören",
    venue: "Arena Spor Tesisleri", date: "Cum · 22:00", price: 0, teamName: "Keçiören Kartalları", format: "7v7", venueMode: "bizde", costMode: "yari_yariya",
    capacity: 7, needed: 1, filled: 0, level: "Orta", status: "acik", org: null, joined: false, mine: true,
    desc: "Cuma gecesi rakip arıyoruz, saha bizde, ücret yarı yarıya.",
  },
  {
    id: "e6", title: "Cuma Akşam Maçı", cat: 1, city: "İstanbul", district: "Kadıköy", format: "7v7",
    venue: "GoldSaha, Kadıköy", date: "Cum · 22:00", price: 170,
    capacity: 14, needed: 2, filled: 2, level: "Orta", status: "doldu",
    org: ORGS.ali, joined: false, mine: false, waitlistCount: 3,
    desc: "Kadro tamamlandı, iyi maçlar!",
  },
];

/* ---------- kadro üyeleri ---------- */
const NAME_POOL = ["Burak Çelik", "Kerem Aydın", "Serkan Öz", "Tolga Kılıç", "Can Yıldırım", "Mert Doğan",
  "Halil Koç", "Yusuf Akın", "Barış Erdem", "Onur Taş", "Emir Sarı", "Deniz Kurt", "Furkan Aslan",
  "Kaan Polat", "Eren Güneş", "Umut Bulut", "Arda Şen", "Cem Yavuz", "Hakan Tekin", "Selim Ateş"];
const slug = (name) => name.toLowerCase().replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
  .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u").replace(/\s+/g, "_");
const hash = (str) => { let h = 7; for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };

// ORGS kaydından üye nesnesi (role: organizator | uye · via: ekip | uygulama)
export const memberFromOrg = (o, role = "uye", via = "ekip") =>
  ({ id: o.id, name: o.name, username: o.username, rating: o.rating, count: o.count, rel: o.rel, joined: o.joined, noShow: o.noShow, teamName: o.teamName, teamMatches: o.teamMatches, role, via });

// Mevcut ekip için deterministik örnek üyeler (aynı seed → aynı isimler)
export function genMembers(n, seed, via = "ekip") {
  const out = [];
  const start = hash(seed) % NAME_POOL.length;
  for (let i = 0; i < Math.max(0, n); i++) {
    const name = NAME_POOL[(start + i) % NAME_POOL.length];
    const h = hash(seed + name + i);
    out.push({
      id: `u-${slug(name)}-${i}-${h % 97}`, name, username: slug(name) + (10 + (h % 90)),
      rating: +(3.9 + (h % 12) / 10).toFixed(1), count: 5 + (h % 40), joined: 3 + ((h * 7) % 28), noShow: (h % 5 === 0 ? 2 : h % 3), rel: 82 + (h % 18), role: "uye", via,
    });
  }
  return out;
}

const E2_TEAM = [memberFromOrg(ORGS.ozan), ...genMembers(9, "e2")];
export const SEED_CHATS = [
  {
    id: "g-r3", type: "grup", eventId: "r3", title: "Keçiören Kartalları · kaptanlar", sub: "1 üye",
    unread: 0, lastTime: "Dün", members: [{ id: "me", role: "organizator", via: "ekip" }],
    msgs: [{ id: "s1", from: "sys", text: "Kaptanlar sohbeti · Rakip takımın kaptanı kabul edilince buraya eklenir", time: "Dün" }],
  },
  {
    id: "g-e0", type: "grup", eventId: "e0", title: "Salı Halı Saha", sub: "12 üye",
    unread: 0, lastTime: "Dün",
    members: [{ id: "me", role: "organizator", via: "ekip" }, memberFromOrg(ORGS.murat, "uye", "uygulama"),
              memberFromOrg(ORGS.ozan, "uye", "uygulama"), ...genMembers(9, "e0")],
    msgs: [
      { id: "s1", from: "sys", text: "Maç dün 21:00'de oynandı · Yoklama bekleniyor", time: "Dün" },
      { id: "m1", from: "ozan", name: "Ozan Demir", text: "İyi maçtı, haftaya aynı saat mi?", time: "Dün" },
    ],
  },
  {
    id: "g-e2", type: "grup", eventId: "e2", seriesId: "e2", title: "Pazar Ligi Maçı", sub: "11 üye",
    unread: 0, lastTime: "14:02", pinned: { id: "pin1", text: "📍 Saha: Arena Spor Tesisleri, Keçiören · Kapı 2 · Otopark var" },
    members: [{ id: "me", role: "organizator", via: "ekip" }, ...E2_TEAM],
    msgs: [
      { id: "s1", from: "sys", text: "Grubu oluşturdun · Onaylanan oyuncular buraya eklenir", time: "12:40" },
      { id: "m1", from: "ozan", name: "Ozan Demir", text: "Bu hafta forma beyaz mı hocam?", time: "13:58" },
      { id: "pv", from: "me", text: "📊 Bu hafta var mısın? · Paz 18:00", time: "13:40",
        poll: { id: "poll-varmisin-e2", kind: "varmisin", eventId: "e2", question: "Bu hafta var mısın? · Paz 18:00", multiple: false, closed: false, createdBy: "me",
                options: [{ id: "varim", text: "Varım ✅" }, { id: "yokum", text: "Yokum ❌" }, { id: "belirsiz", text: "Belli değil 🤔" }],
                votes: { varim: E2_TEAM.slice(0, 8).map((m) => ({ id: m.id, name: m.name })), yokum: [{ id: E2_TEAM[8].id, name: E2_TEAM[8].name }], belirsiz: [] } } },
      { id: "p1", from: "me", text: "📊 Pazar 18:00 mi 19:00 mu?", time: "14:05",
        poll: { id: "poll-1", question: "Pazar 18:00 mi 19:00 mu?", multiple: false, closed: false, createdBy: "me",
                options: [{ id: "a", text: "18:00" }, { id: "b", text: "19:00" }],
                votes: { a: [{ id: "ozan", name: "Ozan Demir" }], b: [{ id: "u-burak", name: "Burak Çelik" }, { id: "u-kerem", name: "Kerem Aydın" }] } } },
      { id: "m2", from: "me", text: "Beyaz getirin, rakip koyu giyiyor", time: "14:02" },
    ],
  },
  {
    id: "g-old", type: "grup", eventId: null, title: "Salı Basketbol Ekibi", sub: "8 üye",
    unread: 2, lastTime: "Dün",
    members: [{ id: "me", role: "uye", via: "uygulama" }, memberFromOrg(ORGS.zeynep, "organizator"),
              memberFromOrg(ORGS.ozan), ...genMembers(5, "old")],
    msgs: [
      { id: "s1", from: "sys", text: "Zeynep Arslan kadroya katıldı", time: "Dün" },
      { id: "m1", from: "zeynep", name: "Zeynep Arslan", text: "Salı 20:00 kesinleşti mi?", time: "Dün" },
      { id: "m2", from: "ozan", name: "Ozan Demir", text: "Kesin, salon onaylandı 👍", time: "Dün" },
    ],
  },
  {
    id: "dm-e11", type: "birebir", eventId: "e11", otherId: "ali", title: "Ali Yılmaz", sub: "\"Çankaya Cuma Maçı\" daveti",
    unread: 1, lastTime: "15:20",
    msgs: [
      { id: "s1", from: "sys", text: "Ali Yılmaz seni \"Çankaya Cuma Maçı\" kadrosuna davet etti. Kabul edersen yerin kesinleşir.", time: "15:20" },
      { id: "m1", from: "ali", name: "Ali Yılmaz", text: "Cuma stoper lazım, gelir misin? 🙏", time: "15:20" },
      { id: "ap", from: "approval", appId: "app-e11" },
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
  { id: "a1", eventId: "e2", who: ORGS.murat, note: "Stoper oynarım hocam, ben varım", status: "beklemede", position: "defans" },
  { id: "app-e11", eventId: "e11", who: "me", note: "", status: "orgBekliyor", invited: true, position: "defans" },
  { id: "a-r3", eventId: "r3", who: { ...ORGS.ozan, teamName: "Kızılay Gücü" }, note: "7 kişiyiz, saha sizde olur, ücrete varız", status: "beklemede" },
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

/* ---------- yoklama & güvenilirlik ---------- */
// Örnek veri: 20 maçlık geçmiş varsayımıyla yeni yüzdeyi hesaplar (sunucuda gerçek sayaçlar kullanılır)
export const relAfterShow   = (rel) => Math.min(100, Math.round((((rel || 90) * 20) / 100 + 1) * 100 / 21));
export const relAfterNoShow = (rel) => Math.round(((rel || 90) * 20) / 21);

export const MY_ATTENDANCE = [
  { title: "Cuma Halı Saha",     date: "Geçen Cuma",    status: "katildi" },
  { title: "Salı Basketbol",     date: "2 hafta önce",  status: "katildi" },
  { title: "Perşembe Halı Saha", date: "3 hafta önce",  status: "gelmedi" },
  { title: "Pazar Ligi Maçı",    date: "1 ay önce",     status: "katildi" },
  { title: "Cuma Halı Saha",     date: "1 ay önce",     status: "katildi" },
];

/* ---------- tarih & tekrar yardımcıları ---------- */
export const GUNLER = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
export const GUNLER_UZUN = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];
export const AYLAR = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

const pad = (n) => String(n).padStart(2, "0");
export const toDateISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const addDays = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return toDateISO(d); };

// Önümüzdeki n gün: [{ iso, label, weekday }] — bugün ve yarın özel etiketli
export function nextDates(n = 14) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const label = i === 0 ? "Bugün" : i === 1 ? "Yarın" : `${GUNLER[d.getDay()]} ${d.getDate()}`;
    out.push({ iso: toDateISO(d), label, weekday: d.getDay() });
  }
  return out;
}

export const TIMES = [];
for (let h = 8; h <= 23; h++) { TIMES.push(`${pad(h)}:00`); TIMES.push(`${pad(h)}:30`); }

// "Bugün · 21:00", "Yarın · 21:00", "Çar · 21:00" (7 gün içinde), "Çar 3 Eyl · 21:00"
export function fmtEventDate(iso, time) {
  const d = new Date(iso + "T12:00:00");
  const today = new Date(); today.setHours(12, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  const day = diff === 0 ? "Bugün" : diff === 1 ? "Yarın" : `${GUNLER[d.getDay()]} ${d.getDate()} ${AYLAR[d.getMonth()]}`;
  return `${day} · ${time}`;
}

/* ---------- paylaşım ---------- */
// Not: eksikvar.app alan adı yayın aşamasında bağlanacak; o güne kadar link yer tutucu,
// mesajın kendisi WhatsApp'ta okunabilir. ?d= parametresi daveti kimin attığını taşır.
export const APP_LINK = "https://eksikvar.app";

export function buildShareText(ev, user) {
  const cat = CATEGORIES.find((c) => c.id === ev.cat);
  if (ev.kind === "rakip") {
    return [
      `🆚 Rakip arıyoruz · ${ev.teamName}`,
      `${cat ? cat.icon : "⚽"} ${ev.format} · ${ev.level} · ${ev.date}`,
      `📍 ${ev.venue || "Saha konuşulur"} · ${venueModeLabel(ev.venueMode)} · ${costModeLabel(ev.costMode)} · ${ev.district || ev.city}`,
      ``,
      `Teklif vermek için: ${APP_LINK}/e/${ev.id}?d=${user.username}`,
      ``,
      `Eksik Var · kadron eksik kalmasın`,
    ].join("\n");
  }
  const remaining = Math.max(0, ev.needed - ev.filled);
  const price = ev.price === 0 ? "Ücretsiz" : `${ev.price}₺/kişi`;
  const lines = [
    `${cat ? cat.icon : "⚽"} ${ev.title}`,
    `📍 ${ev.venue} · ${ev.city}`,
    `🗓 ${ev.date} · ${price}${ev.format ? ` · ${formatLabel(ev.cat, ev.format)}` : ""}`,
    ev.recurrence === "haftalik" ? `🔁 Her ${GUNLER_UZUN[ev.weekday]}` : null,
    ``,
    remaining > 0 ? `👥 ${remaining} EKSİK VAR! Kadro ${ev.capacity} kişi, ${ev.capacity - remaining} hazır.` : `👥 Kadro tamam.`,
    `Başvurmak için: ${APP_LINK}/e/${ev.id}?d=${user.username}`,
    ``,
    `Eksik Var · kadron eksik kalmasın`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

export function buildInviteText(user) {
  return [
    `Selam! Halı saha / basket / voleybol için kadro tamamlama uygulaması kullanıyorum: Eksik Var.`,
    `"Bir kişi eksiğiz" mesajı yerine talep açıyorsun, gelenler başvuruyor, çift onayla kadro doluyor; kim güvenilir kim gelmiyor puanla belli.`,
    ``,
    `İndir: ${APP_LINK}?d=${user.username}`,
  ].join("\n");
}

/* ---------- ilçe sıralaması: en çok açık etkinliği olan önde, sonra alfabetik ---------- */
export function districtCounts(events, city) {
  const counts = {};
  events.forEach((e) => {
    if (e.city === city && e.status === "acik" && !e.ended && e.district) counts[e.district] = (counts[e.district] || 0) + 1;
  });
  return counts;
}
export function sortDistricts(districts, counts) {
  return [...districts].sort((a, b) => (counts[b] || 0) - (counts[a] || 0) || districts.indexOf(a) - districts.indexOf(b));
}

/* ---------- bildirimler ---------- */
export const NOTIF_META = {
  basvuru:    { icon: "person-add",          color: "kit",     bg: "kitSoft" },
  onay:       { icon: "checkmark-circle",    color: "pitch",   bg: "pitchSoft" },
  kadro:      { icon: "people",              color: "pitch",   bg: "pitchSoft" },
  doldu:      { icon: "trophy",              color: "turf",    bg: "pitchSoft" },
  mesaj:      { icon: "chatbubble-ellipses", color: "#1D5FBF", bg: "#E8F0FF" },
  hatirlatma: { icon: "alarm",               color: "kit",     bg: "kitSoft" },
  yoklama:    { icon: "clipboard",           color: "kit",     bg: "kitSoft" },
  puanlama:   { icon: "star",                color: "star", bg: "kitSoft" },
  tekrar:     { icon: "repeat",              color: "turf",    bg: "pitchSoft" },
  red:        { icon: "close-circle",        color: "faint",   bg: "line" },
  davet:      { icon: "mail-open",           color: "pitch",   bg: "pitchSoft" },
  varmisin:   { icon: "hand-right",          color: "pitch",   bg: "pitchSoft" },
  mvp:        { icon: "trophy",              color: "star", bg: "kitSoft" },
  odeme:      { icon: "cash",                color: "turf",    bg: "pitchSoft" },
  yakin:      { icon: "location",            color: "kit",     bg: "kitSoft" },
  ozet:       { icon: "newspaper",           color: "turf",    bg: "pitchSoft" },
  itiraz:     { icon: "alert-circle",        color: "kit",     bg: "kitSoft" },
  yedek:      { icon: "hourglass",           color: "kit",     bg: "kitSoft" },
  etkinlik_iptal: { icon: "close-circle",    color: "kit",     bg: "kitSoft" },
};

export const SEED_NOTIFS = [
  { id: "nw", type: "ozet", title: "Haftalık özetin hazır 📬", body: "Geçen hafta 2 maç oynadın — rozet ilerlemen ve bu haftanın programı içeride", time: "Pzt", read: false, data: { summary: true } },
  { id: "ny", type: "yakin", title: "Yakınında maç açıldı ⚽", body: "Ayrancı Halı Saha · Cum 21:30 · 🛡️ defans arıyorlar", time: "16:10", read: false, data: { eventId: "e11" } },
  { id: "n0", type: "davet", title: "Ali seni kadroya davet etti", body: "Çankaya Cuma Maçı · Cum 21:30 · Defans", time: "15:20", read: false, data: { eventId: "e11", chatId: "dm-e11" } },
  { id: "n1", type: "basvuru", title: "Yeni başvuru", body: "Murat Şahin, Pazar Ligi Maçı için başvurdu: \"Stoper oynarım hocam, ben varım\"", time: "14:05", read: false, data: { eventId: "e2" } },
  { id: "n2", type: "yoklama", title: "Yoklama bekliyor", body: "Salı Halı Saha dün oynandı — gelmeyenleri işaretle, maçı tamamla", time: "09:00", read: false, data: { attendanceId: "e0" } },
  { id: "n3", type: "puanlama", title: "Cuma Halı Saha tamamlandı", body: "Zeynep Arslan'ı ve takım arkadaşlarını puanla", time: "Cts", read: false, data: { rate: true, eventId: "e8" } },
  { id: "n4", type: "hatirlatma", title: "Maç 2 saat sonra", body: "Cuma Halı Saha · GoldSaha, Kızılay · 22:00", time: "Cum", read: true, data: { eventId: "e8" } },
  { id: "n5", type: "mesaj", title: "Ozan Demir · Pazar Ligi Maçı", body: "Bu hafta forma beyaz mı hocam?", time: "Cum", read: true, data: { chatId: "g-e2" } },
];

/* ---------- şikayet & puanlama ---------- */
export const REPORT_REASONS = [
  { label: "Taciz veya hakaret", id: "taciz" },
  { label: "Sahte etkinlik / yanlış bilgi", id: "sahte_etkinlik" },
  { label: "Sürekli gelmiyor", id: "gelmedi" },
  { label: "Dolandırıcılık / para", id: "dolandiricilik" },
  { label: "Diğer", id: "diger" },
];
// yeni puanla güncellenen ortalama (ekranda gösterim için)
export const applyRating = (m, stars) => {
  const count = (m.count || 0) + 1;
  const rating = +((((m.rating || 0) * (m.count || 0)) + stars) / count).toFixed(1);
  return { ...m, rating, count };
};
// maça kaç saat kaldı (tarih bilinmiyorsa null)
export const hoursUntil = (ev) => {
  if (!ev.dateISO || !ev.time) return null;
  return (new Date(`${ev.dateISO}T${ev.time}:00`) - new Date()) / 3600000;
};

/* ---------- telefon numarası ---------- */
// "0532 123 45 67", "532...", "+90 532..." → "+905321234567" (Türkiye cep); geçersizse null
export function normalizePhone(input) {
  let d = String(input || "").replace(/\D/g, "");
  if (d.startsWith("0090")) d = d.slice(4);
  else if (d.startsWith("90") && d.length === 12) d = d.slice(2);
  else if (d.startsWith("0") && d.length === 11) d = d.slice(1);
  if (d.length !== 10 || d[0] !== "5") return null;
  return "+90" + d;
}
export const formatPhone = (e164) => {
  const d = String(e164 || "").replace(/\D/g, "").slice(-10);
  return d.length === 10 ? `0${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : e164;
};

/* ---------- başkalarının aldığı yorumlar (örnek) ---------- */
const CURATED_COMMENTS = {
  ali:    [{ from: "Zeynep Arslan", stars: 5, text: "Organizasyonu tıkır tıkır, saha hep hazır", event: "Çarşamba Halı Saha" },
           { from: "Ozan Demir", stars: 5, text: "Kadro dağılmıyor, her hafta aynı saat", event: "Çarşamba Halı Saha" },
           { from: "Kerem Aydın", stars: 4, text: "Ücreti çıkışta topluyor, düzenli", event: "Cuma Akşam Maçı" }],
  zeynep: [{ from: "Ali Yılmaz", stars: 5, text: "Dakik ve centilmen, her maça alırım", event: "Cuma Halı Saha" },
           { from: "Deniz Kurt", stars: 5, text: "Takım oyununa katkısı süper", event: "Salı Basketbol" },
           { from: "Burak Çelik", stars: 5, text: "Hakem gibi adil", event: "Cuma Halı Saha" }],
  murat:  [{ from: "Ali Yılmaz", stars: 3, text: "Son dakika iptal etti, kadro açık kaldı", event: "Pazar Ligi Maçı" },
           { from: "Serkan Öz", stars: 5, text: "İyi stoper, sert ama temiz", event: "Etimesgut Halı Saha" }],
  ozan:   [{ from: "Emre Kaya", stars: 4, text: "İyi maçtı, yine bekleriz", event: "Pazar Ligi Maçı" },
           { from: "Zeynep Arslan", stars: 5, text: "Pozitif enerji, moral kaynağı", event: "Salı Basketbol" }],
};
const COMMENT_POOL = ["Dakik, sahaya ilk gelen", "İyi paslaşıyor, bencil değil", "Bir kez geç kaldı ama haber verdi", "Sert oyuncu, dikkat",
  "Kaleye geçmeyi kabul etti, eyvallah", "Her hafta gelen güvenilir isim", "Ücreti geç ödedi", "Sakin, hakemle tartışmıyor"];
export function commentsFor(member) {
  if (!member) return [];
  if (CURATED_COMMENTS[member.id]) return CURATED_COMMENTS[member.id];
  const h = hash(member.id); const n = 1 + (h % 3); const out = [];
  for (let i = 0; i < n; i++) {
    const k = (h + i * 7) % COMMENT_POOL.length;
    out.push({ from: NAME_POOL[(h + i * 3) % NAME_POOL.length], stars: 3 + ((h + i) % 3), text: COMMENT_POOL[k], event: i % 2 ? "Salı Halı Saha" : "Pazar Ligi Maçı" });
  }
  return out;
}

/* ---------- mevkiler ---------- */
export const POSITIONS = {
  1: [{ id: "kaleci", label: "Kaleci", icon: "🧤" }, { id: "defans", label: "Defans", icon: "🛡️" }, { id: "orta", label: "Orta saha", icon: "🔁" }, { id: "forvet", label: "Forvet", icon: "🎯" }],
  2: [{ id: "guard", label: "Guard", icon: "🏀" }, { id: "forvet_b", label: "Forvet", icon: "🏀" }, { id: "pivot", label: "Pivot", icon: "🏀" }],
  3: [{ id: "pasor", label: "Pasör", icon: "🏐" }, { id: "smacor", label: "Smaçör", icon: "🏐" }, { id: "orta_v", label: "Orta oyuncu", icon: "🏐" }, { id: "libero", label: "Libero", icon: "🏐" }],
};
export const ALL_POSITIONS = Object.values(POSITIONS).flat();
export const posLabel = (id) => t(id === "farketmez" ? "Farketmez" : (ALL_POSITIONS.find((p) => p.id === id) || { label: id }).label);
export const posIcon = (id) => (ALL_POSITIONS.find((p) => p.id === id) || { icon: "•" }).icon;

// ev.needs = {mevki: kota}, ev.filledPos = {mevki: dolu}; serbest kontenjan = needed - kotalar
export function positionSlots(ev) {
  const needs = ev.needs || {}; const filledPos = ev.filledPos || {};
  const specified = Object.values(needs).reduce((a, b) => a + Number(b), 0);
  const free = Math.max(0, (ev.needed || 0) - specified);
  const freeUsed = Object.entries(filledPos).filter(([p]) => !(p in needs)).reduce((a, [, v]) => a + Number(v), 0);
  const slots = Object.entries(needs).map(([id, quota]) => ({ id, label: posLabel(id), icon: posIcon(id), quota: Number(quota), filled: Number(filledPos[id] || 0) }));
  if (free > 0) slots.push({ id: "farketmez", label: "Farketmez", icon: "•", quota: free, filled: freeUsed });
  return slots;
}
export const openPositions = (ev) => positionSlots(ev).filter((s) => s.filled < s.quota);
export function needsSummary(ev) {
  const open = openPositions(ev).filter((s) => s.id !== "farketmez");
  return open.length ? open.map((s) => `${s.icon} ${s.quota - s.filled} ${s.label.toLowerCase()}`).join(" · ") : null;
}
export const matchesMyPositions = (ev, mine) => openPositions(ev).some((s) => s.id === "farketmez" || (mine || []).includes(s.id));
export const positionAvailable = (ev, pos) => { const s = positionSlots(ev).find((x) => x.id === (pos || "farketmez")); return s ? s.filled < s.quota : openPositions(ev).some((x) => x.id === "farketmez"); };

/* ---------- rakip bul ---------- */
export const FORMATS = ["5v5", "6v6", "7v7", "8v8", "11v11"];
export const VENUE_MODES = [["bizde", "Saha bizde"], ["sizde", "Saha sizde"], ["farketmez", "Farketmez"]];
export const COST_MODES = [["yari_yariya", "Ücret yarı yarıya"], ["biz", "Biz karşılarız"], ["siz", "Siz karşılarsınız"]];
export const venueModeLabel = (m) => t((VENUE_MODES.find(([id]) => id === m) || [null, "Saha konuşulur"])[1]);
export const costModeLabel = (m) => t((COST_MODES.find(([id]) => id === m) || [null, "Ücret konuşulur"])[1]);
export const isRakip = (ev) => ev.kind === "rakip";
export const teamLabel = (who) => (who && (who.teamName || who.name)) || "Takım";

/* ---------- anket ---------- */
export const POLL_TEMPLATES = [
  { label: "📅 Gün seçimi", q: "Bu hafta hangi gün oynayalım?", options: ["Cuma", "Cumartesi", "Pazar"], multiple: false },
  { label: "🕘 Saat seçimi", q: "Hangi saatler uyar?", options: ["20:00", "21:00", "22:00"], multiple: true },
  { label: "🙋 Var mısın?", q: "Bu hafta var mısın?", options: ["Varım", "Yokum", "Belli değil"], multiple: false },
  { label: "👕 Forma", q: "Forma rengi?", options: ["Beyaz", "Koyu", "Yelek dağıtırız"], multiple: false },
];
export const OPTION_IDS = ["a", "b", "c", "d", "e", "f"];
export const pollVoters = (poll) => new Set(Object.values(poll.votes || {}).flat().map((v) => v.id)).size;

/* ---------- var mısın (sabit kadro) ---------- */
export const VARMISIN_OPTIONS = [{ id: "varim", text: "Varım ✅" }, { id: "yokum", text: "Yokum ❌" }, { id: "belirsiz", text: "Belli değil 🤔" }];
// Demo: seri grubundaki var mısın anketinden özet + önerilen eksik
export function availabilityFor(ev, chats) {
  if (!ev.seriesId) return null;
  const g = chats.find((c) => c.type === "grup" && (c.eventId === ev.id || (c.seriesId && c.seriesId === ev.seriesId)));
  const msg = g && g.msgs.find((m) => m.poll && m.poll.kind === "varmisin" && m.poll.eventId === ev.id);
  const poll = msg ? msg.poll : null;
  const members = (g && g.members ? g.members : []).filter((m) => m.role !== "organizator");
  const votes = poll ? poll.votes || {} : {};
  const voters = new Set(Object.values(votes).flat().map((v) => v.id));
  const varim = (votes.varim || []).length, yokum = (votes.yokum || []).length, belirsiz = (votes.belirsiz || []).length;
  const cevapsiz = members.filter((m) => !voters.has(m.id)).length;
  const inSet = new Set(["me", ...(votes.varim || []).map((v) => v.id), ...members.filter((m) => m.via === "uygulama").map((m) => m.id)]);
  const suggested = Math.max(ev.capacity - (ev.offlineRegulars || 0) - inSet.size, ev.filled, 0);
  const mine = Object.entries(votes).find(([, vs]) => vs.some((v) => v.id === "me"));
  return { asked: !!poll || !!ev.availabilityAsked, pollId: poll ? poll.id : null, chatId: g ? g.id : null, varim, yokum, belirsiz, cevapsiz, suggested, myAnswer: mine ? mine[0] : null };
}

/* ---------- ödeme takibi ---------- */
export const PAYMENT_LABEL = { bekliyor: "Bekliyor", odedim: "Ödedim (onay bekliyor)", odendi: "Ödendi ✓", muaf: "Muaf" };
export function paymentSummary(list) {
  const total = list.length, paid = list.filter((p) => p.status === "odendi" || p.status === "muaf").length;
  const pending = list.filter((p) => p.status === "bekliyor" || p.status === "odedim").reduce((a, p) => a + Number(p.amount), 0);
  return { total, paid, pending };
}
export const isValidIban = (v) => /^TR\d{24}$/.test(String(v || "").replace(/\s/g, "").toUpperCase());
export const formatIban = (v) => String(v || "").replace(/\s/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();

/* ---------- spor formatları (kadro sayısı formattan gelir) ---------- */
export const SPORT_FORMATS = {
  1: [{ id: "5v5", label: "5v5", players: 10 }, { id: "6v6", label: "6v6", players: 12 }, { id: "7v7", label: "7v7", players: 14 }, { id: "8v8", label: "8v8", players: 16 }, { id: "11v11", label: "11v11", players: 22 }],
  2: [{ id: "3x3", label: "3x3", players: 6 }, { id: "5v5", label: "5v5", players: 10 }],
  3: [{ id: "2v2", label: "2v2 · Plaj", players: 4 }, { id: "4v4", label: "4v4", players: 8 }, { id: "6v6", label: "6v6", players: 12 }],
  4: [{ id: "1v1", label: "Tekler · 1v1", players: 2 }, { id: "2v2", label: "Çiftler · 2v2", players: 4 }],
};
export const DEFAULT_FORMAT = { 1: "7v7", 2: "5v5", 3: "6v6", 4: "1v1" };
export const sportFormats = (cat) => SPORT_FORMATS[Number(cat)] || SPORT_FORMATS[1];
export const formatInfo = (cat, id) => sportFormats(cat).find((f) => f.id === id) || null;
export const formatLabel = (cat, id) => { const f = formatInfo(cat, id); return f ? t(f.label) : id || ""; };
export const formatPlayers = (cat, id) => { const f = formatInfo(cat, id); return f ? f.players : null; };
// Kadro sayısından format tahmini (eski kayıtlar için)
export const inferFormat = (cat, capacity) => { const f = sportFormats(cat).find((x) => x.players === Number(capacity)); return f ? f.id : DEFAULT_FORMAT[Number(cat)] || null; };

/* ---------- güvenilirlik gösterimi ---------- */
// 5 maçtan az: "Yeni oyuncu · N maç"; sonrası yumuşatılmış yüzde (ilk maçta gelmeyen %0 görünmesin)
export function relInfo(u) {
  const joined = Number(u.joined || 0), noShow = Number(u.noShow || 0), total = joined + noShow;
  if (u.joined == null && u.noShow == null) return { pct: u.rel == null ? 100 : u.rel, isNew: false, matches: null, text: `%${u.rel == null ? 100 : u.rel}` };
  if (total < 5) return { pct: null, isNew: true, matches: total, text: `Yeni · ${total} maç` };
  const pct = Math.round(((joined + 4) / (total + 4)) * 100);
  return { pct, isNew: false, matches: total, text: `%${pct}` };
}
export const relColor = (u) => { const r = relInfo(u); return r.isNew ? C.faint : r.pct < 85 ? C.kit : C.pitch; };

export function buildTeamInvite(ev, user) {
  return [
    `⚽ Ekibimizi Eksik Var'a taşıyorum: "${ev.title}"`,
    `🗓 Her ${GUNLER_UZUN[ev.weekday] || ""} ${ev.time || ""}${ev.venue ? ` · 📍 ${ev.venue}` : ""}`,
    ``,
    `Her hafta "kim var?" diye sormak yerine uygulama soruyor; eksik olursa kendisi buluyor, yoklama ve para takibi de içinde.`,
    `Katıl: ${APP_LINK}/e/${ev.id}?d=${user.username}`,
  ].join("\n");
}

// Mesaj metninden IBAN: { display: "TR12 0006 …", raw: "TR120006…" }
export function extractIban(text) {
  const m = String(text || "").match(/IBAN:\s*(TR[0-9 ]{24,40})/i);
  if (!m) return null;
  const raw = m[1].replace(/\s/g, "").toUpperCase().slice(0, 26);
  return raw.length === 26 ? { raw, display: formatIban(raw) } : null;
}

/* ---------- etkinlik aşaması ---------- */
export function eventPhase(ev) {
  if (ev.status === "iptal") return "iptal";
  if (ev.status === "tamamlandi") return "tamamlandi";
  if (ev.ended) return "oynandi";
  if (ev.dateISO && ev.dateISO === toDateISO(new Date())) return "bugun";
  return ev.status === "doldu" ? "dolu" : "acik";
}

/* ---------- misafir (uygulamasız) oyuncular ---------- */
export const guestKey = (g) => "g:" + g.id;
export const isGuestKey = (id) => String(id).startsWith("g:");
export const guestPlayers = (ev) => (ev.guests || []).filter((g) => g.available !== false).map((g) => ({ id: guestKey(g), name: g.name, rating: 4.0, count: 0, positions: [], guest: true, role: "uye", via: "misafir" }));
export function mapsUrl(ev) {
  const parts = [ev.venue, ev.district, ev.city].filter(Boolean); const q = encodeURIComponent(parts.filter((x, i) => !parts.slice(0, i).some((p) => p.includes(x))).join(", "));
  return { ios: `http://maps.apple.com/?q=${q}`, android: `https://www.google.com/maps/search/?api=1&query=${q}` };
}

/* ---------- maç özeti (WhatsApp köprüsü) ---------- */
export function buildMatchSummary(ev, { stats = [], mine = false } = {}) {
  const lines = [`⚽ ${ev.title} · ${ev.date}`];
  if (ev.score) lines.push(`🏁 ${ev.score.label}: ${ev.score.home} – ${ev.score.away}`);
  if (ev.mvp) lines.push(`⭐ ${ev.mvp.final ? "MVP" : "MVP (önde)"}: ${ev.mvp.name.split(" ")[0]} (${ev.mvp.votes} oy)`);
  const scorers = stats.filter((x) => x.goals > 0).sort((a, b) => b.goals - a.goals);
  if (scorers.length) lines.push(`⚽ Goller: ${scorers.map((x) => `${x.name.split(" ")[0]} ${x.goals}`).join(", ")}`);
  const assists = stats.filter((x) => x.assists > 0).sort((a, b) => b.assists - a.assists);
  if (assists.length) lines.push(`🎯 Asistler: ${assists.map((x) => `${x.name.split(" ")[0]} ${x.assists}`).join(", ")}`);
  if (mine && ev.payments && ev.payments.length) { const sm = paymentSummary(ev.payments); lines.push(`💳 Ödeme: ${sm.paid}/${sm.total} ödendi${sm.pending ? ` · ${sm.pending}₺ bekliyor` : ""}`); }
  lines.push("", "Eksik Var · kadron eksik kalmasın");
  return lines.join("\n");
}
export const statsFor = (ev) => ev.stats || [];
