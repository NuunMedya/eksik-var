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
    id: "e0", title: "Salı Halı Saha", cat: 1, city: "Ankara", district: "Çankaya",
    venue: "Yıldız Halı Saha, Çankaya", date: "Dün · 21:00", price: 150,
    capacity: 12, needed: 2, filled: 2, level: "Orta", status: "doldu",
    org: null, joined: false, mine: true, ended: true, attendance: null,
    desc: "Dün oynandı. Yoklamayı alıp maçı tamamla; gelmeyenleri işaretle.",
  },
  {
    id: "e8", title: "Cuma Halı Saha", cat: 1, city: "Ankara", district: "Çankaya",
    venue: "GoldSaha, Kızılay", date: "Geçen Cuma · 22:00", price: 150,
    capacity: 14, needed: 2, filled: 2, level: "Orta", status: "tamamlandi",
    org: ORGS.zeynep, joined: true, mine: false, ended: true,
    myAttendance: "katildi", attendance: { me: "katildi" },
    desc: "Tamamlandı. Zeynep yoklamayı aldı; katıldın olarak işaretlendin.",
  },
  {
    id: "e1", title: "Çarşamba Halı Saha", cat: 1, city: "Ankara", district: "Çankaya",
    venue: "Yıldız Halı Saha, Çankaya", date: "Çar · 21:00", price: 150,
    capacity: 14, needed: 3, filled: 2, level: "Orta", status: "acik",
    org: ORGS.ali, joined: false, mine: false,
    desc: "Her hafta oynayan sıkı bir ekibiz, bu hafta 3 kişi eksiğiz. Kaleci öncelikli! Saha ücreti çıkışta bölüşülür.",
  },
  {
    id: "e2", title: "Pazar Ligi Maçı", cat: 1, city: "Ankara", district: "Keçiören",
    venue: "Arena Spor Tesisleri, Keçiören", date: "Paz · 18:00", price: 120,
    capacity: 12, needed: 2, filled: 0, level: "Farketmez", status: "acik",
    org: null, joined: false, mine: true,
    recurrence: "haftalik", seriesId: "e2", weekday: 0, time: "18:00", recurrenceUntil: null,
    desc: "Pazar ligimizin bu haftaki maçı için 2 oyuncu arıyoruz. Stoper ve orta saha eksik.",
  },
  {
    id: "e3", title: "3x3 Sokak Basketbolu", cat: 2, city: "İstanbul", district: "Maltepe",
    venue: "Maltepe Sahil Sahası", date: "Cmt · 16:00", price: 0,
    capacity: 6, needed: 2, filled: 1, level: "Başlangıç", status: "acik",
    org: ORGS.zeynep, joined: false, mine: false,
    desc: "Rahat tempolu 3x3 maçı, yeni başlayanlar da gelebilir. Top bizden.",
  },
  {
    id: "e4", title: "Karışık Voleybol Akşamı", cat: 3, city: "İzmir", district: "Karşıyaka",
    venue: "Bostanlı Spor Salonu", date: "Per · 20:00", price: 80,
    capacity: 12, needed: 4, filled: 1, level: "Orta", status: "acik",
    org: ORGS.ozan, joined: false, mine: false,
    desc: "Karışık takım, file boyu standart. Salona uygun spor ayakkabı zorunlu.",
  },
  {
    id: "e5", title: "Tenis Eşleşmesi", cat: 4, city: "Bursa", district: "Nilüfer",
    venue: "Nilüfer Kort 2", date: "Cum · 19:00", price: 200,
    capacity: 2, needed: 1, filled: 0, level: "İleri", status: "acik",
    org: ORGS.zeynep, joined: false, mine: false,
    desc: "Tek maç için rakip arıyorum, ileri seviye. Kort ücreti yarı yarıya.",
  },
  {
    id: "e9", title: "Kızılay Akşam Basketi", cat: 2, city: "Ankara", district: "Çankaya",
    venue: "Kurtuluş Parkı Sahası", date: "Per · 20:00", price: 0,
    capacity: 10, needed: 3, filled: 1, level: "Orta", status: "acik",
    org: ORGS.ozan, joined: false, mine: false,
    desc: "Açık hava 5x5, top bizden. Yağmur yağarsa ertelenir.",
  },
  {
    id: "e10", title: "Etimesgut Halı Saha", cat: 1, city: "Ankara", district: "Etimesgut",
    venue: "Eryaman Spor Kompleksi", date: "Cmt · 19:00", price: 130,
    capacity: 14, needed: 2, filled: 0, level: "Başlangıç", status: "acik",
    org: ORGS.murat, joined: false, mine: false,
    desc: "Rahat tempolu maç, yeni başlayanlar da gelsin.",
  },
  {
    id: "e11", title: "Çankaya Cuma Maçı", cat: 1, city: "Ankara", district: "Çankaya",
    venue: "Ayrancı Halı Saha", date: "Cum · 21:30", price: 160,
    capacity: 14, needed: 1, filled: 0, level: "İleri", status: "acik",
    org: ORGS.ali, joined: false, mine: false,
    desc: "Sıkı bir maç, bir stoper arıyoruz.",
  },
  {
    id: "e6", title: "Cuma Akşam Maçı", cat: 1, city: "İstanbul", district: "Kadıköy",
    venue: "GoldSaha, Kadıköy", date: "Cum · 22:00", price: 170,
    capacity: 14, needed: 2, filled: 2, level: "Orta", status: "doldu",
    org: ORGS.ali, joined: false, mine: false,
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
  ({ id: o.id, name: o.name, username: o.username, rating: o.rating, count: o.count, rel: o.rel, role, via });

// Mevcut ekip için deterministik örnek üyeler (aynı seed → aynı isimler)
export function genMembers(n, seed, via = "ekip") {
  const out = [];
  const start = hash(seed) % NAME_POOL.length;
  for (let i = 0; i < Math.max(0, n); i++) {
    const name = NAME_POOL[(start + i) % NAME_POOL.length];
    const h = hash(seed + name + i);
    out.push({
      id: `u-${slug(name)}-${i}-${h % 97}`, name, username: slug(name) + (10 + (h % 90)),
      rating: +(3.9 + (h % 12) / 10).toFixed(1), count: 5 + (h % 40), rel: 82 + (h % 18), role: "uye", via,
    });
  }
  return out;
}

export const SEED_CHATS = [
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
    id: "g-e2", type: "grup", eventId: "e2", title: "Pazar Ligi Maçı", sub: "11 üye",
    unread: 0, lastTime: "14:02",
    members: [{ id: "me", role: "organizator", via: "ekip" }, memberFromOrg(ORGS.ozan), ...genMembers(9, "e2")],
    msgs: [
      { id: "s1", from: "sys", text: "Grubu oluşturdun · Onaylanan oyuncular buraya eklenir", time: "12:40" },
      { id: "m1", from: "ozan", name: "Ozan Demir", text: "Bu hafta forma beyaz mı hocam?", time: "13:58" },
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
  const day = diff === 0 ? "Bugün" : diff === 1 ? "Yarın"
    : diff > 1 && diff < 7 ? GUNLER[d.getDay()] : `${GUNLER[d.getDay()]} ${d.getDate()} ${AYLAR[d.getMonth()]}`;
  return `${day} · ${time}`;
}

/* ---------- paylaşım ---------- */
// Not: eksikvar.app alan adı yayın aşamasında bağlanacak; o güne kadar link yer tutucu,
// mesajın kendisi WhatsApp'ta okunabilir. ?d= parametresi daveti kimin attığını taşır.
export const APP_LINK = "https://eksikvar.app";

export function buildShareText(ev, user) {
  const cat = CATEGORIES.find((c) => c.id === ev.cat);
  const remaining = Math.max(0, ev.needed - ev.filled);
  const price = ev.price === 0 ? "Ücretsiz" : `${ev.price}₺/kişi`;
  const lines = [
    `${cat ? cat.icon : "⚽"} ${ev.title}`,
    `📍 ${ev.venue} · ${ev.city}`,
    `🗓 ${ev.date} · ${price}`,
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
