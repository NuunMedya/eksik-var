import { useState, useEffect, useRef } from "react";
import {
  Home, MessageCircle, User, Plus, ChevronLeft, MapPin, Calendar,
  Banknote, Users, Star, Send, CheckCheck, Bell, LogOut,
  AlertTriangle, ShieldCheck, Trophy, X, Check
} from "lucide-react";

/* ============================================================
   EKSİK VAR — Tıklanabilir Prototip
   Tema: "Halı saha gecesi" — koyu çim yeşili, tebeşir beyazı,
   forma turuncusu. İmza öğe: kadro dizilimi (SquadDots).
   ============================================================ */

const C = {
  turf: "#0B3D2E",      // koyu çim — marka
  turfLight: "#125A3F", // gradyan ucu
  pitch: "#17994F",     // aksiyon yeşili (CTA)
  pitchSoft: "#E3F4EA", // yeşil yumuşak zemin
  chalk: "#F7F6F2",     // tebeşir beyazı — uygulama zemini
  kit: "#F4600C",       // forma turuncusu — "eksik" aciliyeti
  kitSoft: "#FFEDE0",
  star: "#F5B301",      // puan sarısı
  ink: "#14201B",       // metin
  faint: "#6B7A72",     // ikincil metin
  line: "#E8E5DD",
  waBg: "#ECE5DD",      // sohbet duvar kağıdı
  waMine: "#D9FDD3",    // kendi balonum
  waNotice: "#FCF4DB",  // sistem mesajı
};

const CITIES = ["Ankara", "İstanbul", "İzmir", "Bursa"];
const CATEGORIES = [
  { id: 1, name: "Halı Saha", icon: "⚽" },
  { id: 2, name: "Basketbol", icon: "🏀" },
  { id: 3, name: "Voleybol", icon: "🏐" },
  { id: 4, name: "Tenis", icon: "🎾" },
];

const ORGS = {
  ali:    { id: "ali",    name: "Ali Yılmaz",    username: "ali_kaptan", rating: 4.8, count: 34, rel: 96 },
  zeynep: { id: "zeynep", name: "Zeynep Arslan", username: "zeynepa",    rating: 4.9, count: 51, rel: 98 },
  murat:  { id: "murat",  name: "Murat Şahin",   username: "murat07",   rating: 4.2, count: 9,  rel: 78 },
  ozan:   { id: "ozan",   name: "Ozan Demir",    username: "ozandmr",   rating: 4.5, count: 21, rel: 90 },
};

const SEED_EVENTS = [
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
    desc: "Karışık takım, file boyu standart. Salon ayak numarasına uygun spor ayakkabı zorunlu.",
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

const SEED_CHATS = [
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
    id: "dm-zeynep", type: "birebir", eventId: null, title: "Zeynep Arslan", sub: "",
    unread: 0, lastTime: "Cts",
    msgs: [
      { id: "m1", from: "zeynep", name: "Zeynep Arslan", text: "Geçen maç için tekrar teşekkürler 🙌", time: "Cts" },
      { id: "m2", from: "me", text: "Ben teşekkür ederim, yine bekleriz!", time: "Cts" },
    ],
  },
];

const SEED_APPS = [
  { id: "a1", eventId: "e2", who: ORGS.murat, note: "Stoper oynarım hocam, ben varım", status: "beklemede" },
];

const MY_COMMENTS = [
  { from: "Ali Yılmaz", stars: 5, text: "Dakik ve centilmen, her maça alırım 👏" },
  { from: "Zeynep Arslan", stars: 5, text: "Takım oyununa katkısı süper" },
  { from: "Ozan Demir", stars: 4, text: "İyi maçtı, yine bekleriz" },
];

/* ---------- yardımcılar ---------- */
const nowTime = () =>
  new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
const uid = () => Math.random().toString(36).slice(2, 9);
const initials = (name) =>
  name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const AVATAR_BG = ["#0B3D2E", "#1D5FBF", "#7C3AED", "#B4232A", "#B45309"];
const avatarBg = (name) => AVATAR_BG[(name?.charCodeAt(0) || 0) % AVATAR_BG.length];
const SENDER_COLOR = ["#0B6B3A", "#1D5FBF", "#7C3AED", "#B4232A", "#B45309"];
const senderColor = (id) => SENDER_COLOR[(id?.charCodeAt(0) || 0) % SENDER_COLOR.length];

/* ---------- küçük parçalar ---------- */
function Avatar({ name, size = 40 }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, backgroundColor: avatarBg(name), fontSize: size * 0.36 }}
    >
      {initials(name || "?")}
    </div>
  );
}

function Stars({ value, size = 13 }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          fill={i <= Math.round(value) ? C.star : "none"}
          color={i <= Math.round(value) ? C.star : "#C9C4B8"}
        />
      ))}
    </span>
  );
}

/* İmza öğe: kadro dizilimi — koyu: mevcut ekip, yeşil: uygulamadan
   katılan, kesikli: hâlâ eksik */
function SquadDots({ capacity, needed, filled, size = 9 }) {
  const base = capacity - needed;
  const dots = [];
  for (let i = 0; i < capacity; i++) {
    let style;
    if (i < base) style = { backgroundColor: C.turf };
    else if (i < base + filled) style = { backgroundColor: C.pitch };
    else style = { backgroundColor: "transparent", border: `1.5px dashed ${C.kit}` };
    dots.push(
      <span key={i} className="rounded-full" style={{ width: size, height: size, ...style }} />
    );
  }
  return <div className="flex flex-wrap items-center gap-1">{dots}</div>;
}

function EksikBadge({ ev }) {
  const remaining = ev.needed - ev.filled;
  if (ev.joined)
    return (
      <span className="rounded-lg px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: C.pitch }}>
        Kadrodasın ✓
      </span>
    );
  if (ev.status === "doldu" || remaining <= 0)
    return (
      <span className="rounded-lg px-2 py-1 text-xs font-bold text-white" style={{ backgroundColor: C.turf }}>
        Kadro tamam
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-lg px-2 py-1 text-white" style={{ backgroundColor: C.kit }}>
      <span className="text-base font-black leading-none">{remaining}</span>
      <span className="text-xs font-semibold">eksik</span>
    </span>
  );
}

function Chip({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors"
      style={
        active
          ? { backgroundColor: C.turf, borderColor: C.turf, color: "#fff" }
          : { backgroundColor: "#fff", borderColor: C.line, color: C.ink }
      }
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide" style={{ color: C.faint }}>
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border bg-white px-3 py-2.5 text-sm outline-none focus:ring-2";
const inputStyle = { borderColor: C.line, color: C.ink };

/* ============================================================
   GİRİŞ / KAYIT
   ============================================================ */
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", username: "", phone: "", pass: "", city: "Ankara" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div
      className="flex h-full flex-col justify-center px-6"
      style={{ background: `linear-gradient(160deg, ${C.turf} 0%, ${C.turfLight} 60%, #0B3D2E 100%)` }}
    >
      <div className="mb-8 text-center">
        <div
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl text-3xl"
          style={{ backgroundColor: "rgba(255,255,255,0.12)" }}
        >
          ⚽
        </div>
        <h1 className="text-4xl font-black italic tracking-tight text-white">
          EKSİK <span style={{ color: C.kit }}>VAR</span>
        </h1>
        <p className="mt-2 text-sm" style={{ color: "#BFD9CC" }}>
          Kadron eksik kalmasın.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex rounded-xl p-1" style={{ backgroundColor: C.chalk }}>
          {[
            ["login", "Giriş yap"],
            ["register", "Kayıt ol"],
          ].map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 rounded-lg py-2 text-sm font-bold transition-colors"
              style={mode === m ? { backgroundColor: C.turf, color: "#fff" } : { color: C.faint }}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {mode === "register" && (
            <>
              <Field label="Ad Soyad">
                <input className={inputCls} style={inputStyle} placeholder="Emre Kaya" value={form.name} onChange={set("name")} />
              </Field>
              <Field label="Kullanıcı adı">
                <input className={inputCls} style={inputStyle} placeholder="emre_k" value={form.username} onChange={set("username")} />
              </Field>
              <Field label="İl">
                <select className={inputCls} style={inputStyle} value={form.city} onChange={set("city")}>
                  {CITIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            </>
          )}
          <Field label="Telefon">
            <input className={inputCls} style={inputStyle} placeholder="05xx xxx xx xx" value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Şifre">
            <input type="password" className={inputCls} style={inputStyle} placeholder="••••••••" value={form.pass} onChange={set("pass")} />
          </Field>
        </div>

        <button
          onClick={() =>
            onLogin({
              name: form.name.trim() || "Emre Kaya",
              username: form.username.trim() || "emre_k",
              city: form.city,
            })
          }
          className="mt-4 w-full rounded-xl py-3 text-sm font-black text-white transition-opacity active:opacity-80"
          style={{ backgroundColor: C.pitch }}
        >
          {mode === "login" ? "Giriş yap" : "Kayıt ol ve başla"}
        </button>
        <p className="mt-3 text-center text-xs" style={{ color: C.faint }}>
          Prototip sürümü — bilgiler kaydedilmez, dilediğinle gir.
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   ANA SAYFA — etkinlik listesi
   ============================================================ */
function EventCard({ ev, onOpen }) {
  const cat = CATEGORIES.find((c) => c.id === ev.cat);
  const done = ev.status === "doldu";
  return (
    <button
      onClick={() => onOpen(ev.id)}
      className="w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-transform active:scale-95"
      style={{ borderColor: C.line, opacity: done && !ev.joined ? 0.65 : 1 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl text-xl"
            style={{ backgroundColor: C.pitchSoft }}
          >
            {cat?.icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold leading-tight" style={{ color: C.ink }}>
                {ev.title}
              </h3>
              {ev.mine && (
                <span className="rounded px-1.5 py-0.5 font-bold" style={{ backgroundColor: C.kitSoft, color: C.kit, fontSize: 10 }}>
                  SENİN
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: C.faint }}>
              <MapPin size={12} /> {ev.venue.split(",")[0]} · {ev.city}
            </p>
          </div>
        </div>
        <EksikBadge ev={ev} />
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs font-semibold" style={{ color: C.faint }}>
        <span className="flex items-center gap-1">
          <Calendar size={13} /> {ev.date}
        </span>
        <span className="flex items-center gap-1">
          <Banknote size={13} /> {ev.price === 0 ? "Ücretsiz" : `${ev.price}₺/kişi`}
        </span>
        <span className="flex items-center gap-1">
          <Users size={13} /> {ev.capacity} kadro
        </span>
      </div>

      <div className="mt-3">
        <SquadDots capacity={ev.capacity} needed={ev.needed} filled={ev.filled} />
      </div>

      <div className="mt-3 flex items-center gap-2 border-t pt-3" style={{ borderColor: C.line }}>
        {ev.mine ? (
          <span className="text-xs font-bold" style={{ color: C.turf }}>
            Organizatör: Sen
          </span>
        ) : (
          <>
            <Avatar name={ev.org.name} size={24} />
            <span className="text-xs font-bold" style={{ color: C.ink }}>
              {ev.org.name}
            </span>
            <Stars value={ev.org.rating} size={11} />
            <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: C.pitch }}>
              <ShieldCheck size={12} /> %{ev.org.rel}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

function HomeScreen({ user, events, onOpen }) {
  const [city, setCity] = useState("Tümü");
  const [cat, setCat] = useState(0);
  const list = events.filter(
    (e) => (city === "Tümü" || e.city === city) && (cat === 0 || e.cat === cat)
  );

  return (
    <div className="flex h-full flex-col">
      <div
        className="px-5 pb-4 pt-5 text-white"
        style={{ background: `linear-gradient(150deg, ${C.turf}, ${C.turfLight})` }}
      >
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black italic tracking-tight">
            EKSİK <span style={{ color: C.kit }}>VAR</span>
          </h1>
          <Bell size={20} color="#BFD9CC" />
        </div>
        <p className="mt-2 text-sm font-semibold">Selam {user.name.split(" ")[0]} 👋</p>
        <p className="text-xs" style={{ color: "#BFD9CC" }}>
          Bugün hangi kadroyu tamamlıyoruz?
        </p>
      </div>

      <div className="flex gap-2 overflow-x-auto px-5 py-3">
        {["Tümü", ...CITIES].map((c) => (
          <Chip key={c} active={city === c} onClick={() => setCity(c)}>
            {c}
          </Chip>
        ))}
      </div>
      <div className="flex gap-2 overflow-x-auto px-5 pb-2">
        <Chip active={cat === 0} onClick={() => setCat(0)}>
          Hepsi
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
            {c.icon} {c.name}
          </Chip>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 pb-28 pt-1">
        {list.map((ev) => (
          <EventCard key={ev.id} ev={ev} onOpen={onOpen} />
        ))}
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center" style={{ borderColor: C.line }}>
            <p className="font-bold" style={{ color: C.ink }}>
              Bu filtrede açık talep yok
            </p>
            <p className="mt-1 text-sm" style={{ color: C.faint }}>
              İlk talebi sen aç — alttaki + ile 30 saniyede yayında.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ETKİNLİK DETAY
   ============================================================ */
function EventDetail({ ev, user, apps, myApp, onBack, onApply, onApprove, onReject, onGoChat }) {
  const cat = CATEGORIES.find((c) => c.id === ev.cat);
  const remaining = ev.needed - ev.filled;
  const eventApps = apps.filter((a) => a.eventId === ev.id && a.who !== "me");

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: C.chalk }}>
      <div
        className="px-5 pb-5 pt-4 text-white"
        style={{ background: `linear-gradient(150deg, ${C.turf}, ${C.turfLight})` }}
      >
        <button onClick={onBack} className="mb-3 flex items-center gap-1 text-sm font-semibold" style={{ color: "#BFD9CC" }}>
          <ChevronLeft size={18} /> Geri
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-2xl">{cat?.icon}</span>
            <h1 className="mt-1 text-2xl font-black leading-tight">{ev.title}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: "#BFD9CC" }}>
              <MapPin size={14} /> {ev.venue} · {ev.city}
            </p>
          </div>
          <EksikBadge ev={ev} />
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-32">
        <div className="grid grid-cols-3 gap-2">
          {[
            [<Calendar size={16} key="i" />, ev.date],
            [<Banknote size={16} key="i" />, ev.price === 0 ? "Ücretsiz" : `${ev.price}₺/kişi`],
            [<Trophy size={16} key="i" />, ev.level],
          ].map(([icon, text], i) => (
            <div key={i} className="flex flex-col items-center gap-1 rounded-xl bg-white p-3 text-center shadow-sm">
              <span style={{ color: C.turf }}>{icon}</span>
              <span className="text-xs font-bold" style={{ color: C.ink }}>
                {text}
              </span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: C.turf }}>
              Kadro durumu
            </h3>
            <span className="text-xs font-bold" style={{ color: C.faint }}>
              {ev.capacity - remaining}/{ev.capacity}
            </span>
          </div>
          <div className="mt-3">
            <SquadDots capacity={ev.capacity} needed={ev.needed} filled={ev.filled} size={13} />
          </div>
          <div className="mt-3 flex flex-wrap gap-3 text-xs font-semibold" style={{ color: C.faint }}>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: C.turf }} /> Mevcut ekip
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: C.pitch }} /> Uygulamadan ({ev.filled}/{ev.needed})
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full" style={{ border: `1.5px dashed ${C.kit}` }} /> Eksik
            </span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: C.turf }}>
            Açıklama
          </h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: C.ink }}>
            {ev.desc}
          </p>
        </div>

        {!ev.mine && (
          <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
            <Avatar name={ev.org.name} size={44} />
            <div className="flex-1">
              <p className="font-extrabold" style={{ color: C.ink }}>
                {ev.org.name}
              </p>
              <div className="mt-0.5 flex items-center gap-2 text-xs">
                <Stars value={ev.org.rating} size={12} />
                <span className="font-bold" style={{ color: C.ink }}>
                  {ev.org.rating}
                </span>
                <span style={{ color: C.faint }}>({ev.org.count} puan)</span>
              </div>
              <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold" style={{ color: C.pitch }}>
                <ShieldCheck size={12} /> %{ev.org.rel} güvenilirlik
              </p>
            </div>
          </div>
        )}

        {ev.mine && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: C.turf }}>
              Başvurular ({eventApps.length})
            </h3>
            {eventApps.length === 0 && (
              <p className="mt-2 text-sm" style={{ color: C.faint }}>
                Henüz başvuru yok — talep yayında, gelenler burada listelenecek.
              </p>
            )}
            {eventApps.map((a) => (
              <div key={a.id} className="mt-3 rounded-xl border p-3" style={{ borderColor: C.line }}>
                <div className="flex items-center gap-3">
                  <Avatar name={a.who.name} size={38} />
                  <div className="flex-1">
                    <p className="text-sm font-extrabold" style={{ color: C.ink }}>
                      {a.who.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      <Stars value={a.who.rating} size={11} />
                      <span style={{ color: C.faint }}>{a.who.rating}</span>
                      {a.who.rel < 85 ? (
                        <span className="flex items-center gap-0.5 font-bold" style={{ color: C.kit }}>
                          <AlertTriangle size={11} /> %{a.who.rel} güvenilirlik
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5 font-semibold" style={{ color: C.pitch }}>
                          <ShieldCheck size={11} /> %{a.who.rel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="mt-2 rounded-lg px-3 py-2 text-sm italic" style={{ backgroundColor: C.chalk, color: C.ink }}>
                  “{a.note}”
                </p>
                {a.status === "beklemede" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => onApprove(a.id)}
                      className="flex-1 rounded-xl py-2 text-sm font-black text-white"
                      style={{ backgroundColor: C.pitch }}
                    >
                      Onayla
                    </button>
                    <button
                      onClick={() => onReject(a.id)}
                      className="flex-1 rounded-xl border py-2 text-sm font-bold"
                      style={{ borderColor: C.line, color: C.faint }}
                    >
                      Reddet
                    </button>
                  </div>
                )}
                {a.status === "orgBekliyor" && (
                  <p className="mt-2 text-xs font-bold" style={{ color: C.kit }}>
                    Onayladın · {a.who.name.split(" ")[0]}’ın son onayı bekleniyor…
                  </p>
                )}
                {a.status === "onaylandi" && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-black" style={{ color: C.pitch }}>
                    <Check size={13} /> Kadroda — grup sohbetine eklendi
                  </p>
                )}
                {a.status === "reddedildi" && (
                  <p className="mt-2 text-xs font-bold" style={{ color: C.faint }}>
                    Reddedildi
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {!ev.mine && (
        <div className="absolute bottom-0 left-0 right-0 border-t bg-white p-4" style={{ borderColor: C.line }}>
          {ev.joined ? (
            <button
              onClick={() => onGoChat("g-" + ev.id)}
              className="w-full rounded-xl py-3.5 text-sm font-black text-white"
              style={{ backgroundColor: C.turf }}
            >
              Grup sohbetine git
            </button>
          ) : myApp ? (
            <button
              onClick={() => onGoChat("dm-" + ev.id)}
              className="w-full rounded-xl py-3.5 text-sm font-black"
              style={{ backgroundColor: C.pitchSoft, color: C.turf }}
            >
              Başvurun iletildi · Sohbete git
            </button>
          ) : ev.status === "doldu" ? (
            <button disabled className="w-full rounded-xl py-3.5 text-sm font-black text-white opacity-50" style={{ backgroundColor: C.turf }}>
              Kadro tamamlandı
            </button>
          ) : (
            <button
              onClick={onApply}
              className="w-full rounded-xl py-3.5 text-sm font-black text-white transition-opacity active:opacity-80"
              style={{ backgroundColor: C.pitch }}
            >
              Başvur {ev.price > 0 ? `· ${ev.price}₺/kişi` : ""}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   BAŞVURU ALT SAYFASI
   ============================================================ */
function ApplySheet({ ev, onClose, onSend }) {
  const [note, setNote] = useState("");
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" style={{ backgroundColor: "rgba(11,26,20,0.55)" }}>
      <div className="rounded-t-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black" style={{ color: C.ink }}>
            Başvuru gönder
          </h3>
          <button onClick={onClose}>
            <X size={20} color={C.faint} />
          </button>
        </div>
        <p className="mt-1 text-sm" style={{ color: C.faint }}>
          {ev.org.name} başvurunu görecek ve seninle birebir sohbet açılacak.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Örn: Kaleci lazımsa ben varım, 21:00’e yetişirim"
          className="mt-3 w-full rounded-xl border p-3 text-sm outline-none"
          style={{ borderColor: C.line, color: C.ink }}
        />
        <button
          onClick={() => onSend(note.trim() || "Merhaba, ben varım! Detayları konuşabilir miyiz?")}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black text-white"
          style={{ backgroundColor: C.pitch }}
        >
          <Send size={15} /> Başvuruyu gönder
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ETKİNLİK OLUŞTUR
   ============================================================ */
function CreateScreen({ user, onBack, onCreate }) {
  const [f, setF] = useState({
    title: "", cat: 1, city: user.city || "Ankara", venue: "",
    date: "", capacity: 14, needed: 2, price: 150, level: "Farketmez", desc: "",
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const valid = f.title.trim() && f.venue.trim() && f.date.trim() && Number(f.needed) > 0 && Number(f.needed) <= Number(f.capacity);

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: C.chalk }}>
      <div className="flex items-center gap-2 px-5 pb-4 pt-4 text-white" style={{ background: `linear-gradient(150deg, ${C.turf}, ${C.turfLight})` }}>
        <button onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        <div>
          <h1 className="text-lg font-black">Eksik talebi aç</h1>
          <p className="text-xs" style={{ color: "#BFD9CC" }}>
            30 saniyede yayında, grup sohbeti otomatik kurulur
          </p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5 pb-28">
        <Field label="Etkinlik başlığı">
          <input className={inputCls} style={inputStyle} placeholder="Örn: Perşembe Halı Saha" value={f.title} onChange={set("title")} />
        </Field>

        <Field label="Kategori">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Chip key={c.id} active={Number(f.cat) === c.id} onClick={() => setF((s) => ({ ...s, cat: c.id }))}>
                {c.icon} {c.name}
              </Chip>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="İl">
            <select className={inputCls} style={inputStyle} value={f.city} onChange={set("city")}>
              {CITIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Tarih & saat">
            <input className={inputCls} style={inputStyle} placeholder="Per · 21:00" value={f.date} onChange={set("date")} />
          </Field>
        </div>

        <Field label="Saha / mekan">
          <input className={inputCls} style={inputStyle} placeholder="Örn: Yıldız Halı Saha, Çankaya" value={f.venue} onChange={set("venue")} />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Toplam kadro">
            <input type="number" className={inputCls} style={inputStyle} value={f.capacity} onChange={set("capacity")} />
          </Field>
          <Field label="Eksik sayısı">
            <input type="number" className={inputCls} style={inputStyle} value={f.needed} onChange={set("needed")} />
          </Field>
          <Field label="Ücret (₺)">
            <input type="number" className={inputCls} style={inputStyle} value={f.price} onChange={set("price")} />
          </Field>
        </div>

        <Field label="Seviye">
          <div className="flex flex-wrap gap-2">
            {["Farketmez", "Başlangıç", "Orta", "İleri"].map((l) => (
              <Chip key={l} active={f.level === l} onClick={() => setF((s) => ({ ...s, level: l }))}>
                {l}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Açıklama (isteğe bağlı)">
          <textarea rows={3} className={inputCls} style={inputStyle} placeholder="Mevki, ödeme şekli, kurallar…" value={f.desc} onChange={set("desc")} />
        </Field>

        {Number(f.needed) > Number(f.capacity) && (
          <p className="text-xs font-bold" style={{ color: C.kit }}>
            Eksik sayısı toplam kadrodan büyük olamaz.
          </p>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 border-t bg-white p-4" style={{ borderColor: C.line }}>
        <button
          onClick={() => valid && onCreate(f)}
          disabled={!valid}
          className="w-full rounded-xl py-3.5 text-sm font-black text-white transition-opacity"
          style={{ backgroundColor: C.pitch, opacity: valid ? 1 : 0.45 }}
        >
          Talebi yayınla
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   SOHBETLER — liste
   ============================================================ */
function ChatsScreen({ chats, onOpen }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5 text-white" style={{ background: `linear-gradient(150deg, ${C.turf}, ${C.turfLight})` }}>
        <h1 className="text-xl font-black">Sohbetler</h1>
        <p className="text-xs" style={{ color: "#BFD9CC" }}>
          Her etkinliğin kendi grubu var — tıpkı alıştığın gibi
        </p>
      </div>
      <div className="flex-1 overflow-y-auto pb-28">
        {chats.map((c) => {
          const last = c.msgs[c.msgs.length - 1];
          return (
            <button
              key={c.id}
              onClick={() => onOpen(c.id)}
              className="flex w-full items-center gap-3 border-b bg-white px-5 py-3.5 text-left"
              style={{ borderColor: C.line }}
            >
              {c.type === "grup" ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: C.turf }}>
                  <Users size={20} />
                </div>
              ) : (
                <Avatar name={c.title} size={44} />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="truncate font-extrabold" style={{ color: C.ink }}>
                    {c.title}
                  </p>
                  <span className="ml-2 shrink-0 text-xs" style={{ color: c.unread ? C.pitch : C.faint }}>
                    {c.lastTime}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-sm" style={{ color: C.faint }}>
                    {last?.from === "me" && (
                      <CheckCheck size={14} className="mr-1 inline" color="#4FB6E0" />
                    )}
                    {last?.from === "sys"
                      ? last.text
                      : last?.name
                      ? `${last.name.split(" ")[0]}: ${last.text}`
                      : last?.text}
                  </p>
                  {c.unread > 0 && (
                    <span className="flex h-5 items-center justify-center rounded-full px-1.5 text-xs font-black text-white" style={{ backgroundColor: C.pitch, minWidth: 20 }}>
                      {c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   SOHBET ODASI — WhatsApp grup mantığı
   ============================================================ */
function ChatRoom({ chat, user, apps, onBack, onSend, onConfirmJoin, onGoChat }) {
  const [input, setInput] = useState("");
  const boxRef = useRef(null);

  useEffect(() => {
    if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [chat.msgs.length]);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    onSend(chat.id, t);
    setInput("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ backgroundColor: C.turf }}>
        <button onClick={onBack}>
          <ChevronLeft size={22} />
        </button>
        {chat.type === "grup" ? (
          <div className="flex h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
            <Users size={17} />
          </div>
        ) : (
          <Avatar name={chat.title} size={36} />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold leading-tight">{chat.title}</p>
          <p className="text-xs" style={{ color: "#BFD9CC" }}>
            {chat.type === "grup" ? chat.sub || "grup" : chat.sub || "çevrimiçi"}
          </p>
        </div>
      </div>

      <div ref={boxRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-4" style={{ backgroundColor: C.waBg }}>
        {chat.msgs.map((m) => {
          if (m.from === "sys")
            return (
              <div key={m.id} className="flex justify-center">
                <span className="rounded-lg px-3 py-1 text-center text-xs font-semibold shadow-sm" style={{ backgroundColor: C.waNotice, color: "#6B5E2E" }}>
                  {m.text}
                </span>
              </div>
            );

          if (m.from === "approval") {
            const app = apps.find((a) => a.id === m.appId);
            const done = app?.status === "onaylandi";
            return (
              <div key={m.id} className="flex justify-start">
                <div className="w-full max-w-xs overflow-hidden rounded-2xl bg-white shadow-sm">
                  <div className="px-3 py-2 text-xs font-black text-white" style={{ backgroundColor: done ? C.turf : C.pitch }}>
                    {done ? "KADRODASIN 🎉" : "ORGANİZATÖR ONAYI GELDİ ✅"}
                  </div>
                  <div className="p-3">
                    <p className="text-sm" style={{ color: C.ink }}>
                      {done
                        ? "Yerin kesinleşti ve grup sohbetine eklendin. Maçta görüşürüz!"
                        : "Organizatör seni kadroya almak istiyor. Son onayı verirsen yerin kesinleşir ve kontenjan güncellenir."}
                    </p>
                    {done ? (
                      <button
                        onClick={() => onGoChat("g-" + app.eventId)}
                        className="mt-2 w-full rounded-xl py-2 text-sm font-black"
                        style={{ backgroundColor: C.pitchSoft, color: C.turf }}
                      >
                        Grup sohbetine git
                      </button>
                    ) : (
                      <button
                        onClick={() => onConfirmJoin(m.appId)}
                        className="mt-2 w-full rounded-xl py-2 text-sm font-black text-white"
                        style={{ backgroundColor: C.pitch }}
                      >
                        Onayla ve kadroya katıl
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          }

          const mine = m.from === "me";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-xs rounded-2xl px-3 py-2 shadow-sm"
                style={{
                  backgroundColor: mine ? C.waMine : "#fff",
                  borderTopRightRadius: mine ? 4 : 16,
                  borderTopLeftRadius: mine ? 16 : 4,
                }}
              >
                {!mine && chat.type === "grup" && m.name && (
                  <p className="text-xs font-black" style={{ color: senderColor(m.from) }}>
                    {m.name}
                  </p>
                )}
                <p className="text-sm" style={{ color: C.ink }}>
                  {m.text}
                </p>
                <p className="mt-0.5 flex items-center justify-end gap-1 text-right" style={{ color: "#8CA096", fontSize: 10 }}>
                  {m.time}
                  {mine && <CheckCheck size={13} color="#4FB6E0" />}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t bg-white p-3" style={{ borderColor: C.line }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Mesaj yaz…"
          className="flex-1 rounded-full border px-4 py-2.5 text-sm outline-none"
          style={{ borderColor: C.line, color: C.ink }}
        />
        <button onClick={send} className="flex h-10 w-10 items-center justify-center rounded-full text-white" style={{ backgroundColor: C.pitch }}>
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   PROFİL
   ============================================================ */
function ProfileScreen({ user, pendingRate, onRate, onLogout }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto pb-28" style={{ backgroundColor: C.chalk }}>
      <div className="px-5 pb-6 pt-6 text-center text-white" style={{ background: `linear-gradient(150deg, ${C.turf}, ${C.turfLight})` }}>
        <div className="mx-auto mb-2 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-black" style={{ backgroundColor: "rgba(255,255,255,0.15)" }}>
          {initials(user.name)}
        </div>
        <h1 className="text-xl font-black">{user.name}</h1>
        <p className="text-sm" style={{ color: "#BFD9CC" }}>
          @{user.username} · {user.city}
        </p>
      </div>

      <div className="-mt-4 grid grid-cols-3 gap-2 px-5">
        {[
          ["Puan", <span key="v" className="flex items-center justify-center gap-1"><Star size={14} fill={C.star} color={C.star} /> {user.rating}</span>, `${user.count} değerlendirme`],
          ["Güvenilirlik", `%${user.rel}`, "katılım oranı"],
          ["Katılım", user.joined, `${user.organized} organizasyon`],
        ].map(([label, val, sub], i) => (
          <div key={i} className="rounded-2xl bg-white p-3 text-center shadow-sm">
            <p className="text-lg font-black" style={{ color: C.turf }}>
              {val}
            </p>
            <p className="text-xs font-bold" style={{ color: C.ink }}>
              {label}
            </p>
            <p className="leading-tight" style={{ color: C.faint, fontSize: 10 }}>
              {sub}
            </p>
          </div>
        ))}
      </div>

      {pendingRate && (
        <div className="mx-5 mt-4 rounded-2xl border-2 p-4" style={{ borderColor: C.star, backgroundColor: "#FFFBEF" }}>
          <p className="text-sm font-black" style={{ color: C.ink }}>
            ⭐ Bekleyen puanlama
          </p>
          <p className="mt-1 text-sm" style={{ color: C.faint }}>
            “Cuma Halı Saha” tamamlandı — Zeynep Arslan’ı puanla, topluluk puanları herkes için işlesin.
          </p>
          <button onClick={onRate} className="mt-2 w-full rounded-xl py-2.5 text-sm font-black text-white" style={{ backgroundColor: C.turf }}>
            Şimdi puanla
          </button>
        </div>
      )}

      <div className="mx-5 mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h3 className="text-sm font-black uppercase tracking-wide" style={{ color: C.turf }}>
          Hakkında söylenenler
        </h3>
        {MY_COMMENTS.map((c, i) => (
          <div key={i} className="mt-3 border-b pb-3 last:border-0 last:pb-0" style={{ borderColor: C.line }}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold" style={{ color: C.ink }}>
                {c.from}
              </span>
              <Stars value={c.stars} size={11} />
            </div>
            <p className="mt-1 text-sm" style={{ color: C.faint }}>
              “{c.text}”
            </p>
          </div>
        ))}
      </div>

      <button onClick={onLogout} className="mx-5 mt-4 flex items-center justify-center gap-2 rounded-2xl border bg-white py-3 text-sm font-bold" style={{ borderColor: C.line, color: "#B4232A" }}>
        <LogOut size={15} /> Çıkış yap
      </button>
    </div>
  );
}

/* ============================================================
   PUANLAMA ALT SAYFASI
   ============================================================ */
function RateSheet({ onClose, onSubmit }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end" style={{ backgroundColor: "rgba(11,26,20,0.55)" }}>
      <div className="rounded-t-3xl bg-white p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black" style={{ color: C.ink }}>
            Zeynep Arslan’ı puanla
          </h3>
          <button onClick={onClose}>
            <X size={20} color={C.faint} />
          </button>
        </div>
        <p className="mt-1 text-sm" style={{ color: C.faint }}>
          Cuma Halı Saha · organizatör
        </p>
        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} onClick={() => setStars(i)}>
              <Star size={34} fill={i <= stars ? C.star : "none"} color={i <= stars ? C.star : "#C9C4B8"} />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="İsteğe bağlı yorum: organizasyon, saha, dakiklik…"
          className="mt-4 w-full rounded-xl border p-3 text-sm outline-none"
          style={{ borderColor: C.line, color: C.ink }}
        />
        <button
          onClick={() => stars > 0 && onSubmit(stars)}
          className="mt-3 w-full rounded-xl py-3 text-sm font-black text-white transition-opacity"
          style={{ backgroundColor: C.pitch, opacity: stars > 0 ? 1 : 0.45 }}
        >
          Puanı gönder
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   ANA UYGULAMA
   ============================================================ */
export default function EksikVarApp() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [view, setView] = useState({ name: "root" });
  const [events, setEvents] = useState(SEED_EVENTS);
  const [chats, setChats] = useState(SEED_CHATS);
  const [apps, setApps] = useState(SEED_APPS);
  const [pendingRate, setPendingRate] = useState(true);
  const [toast, setToast] = useState(null);

  const timers = useRef([]);
  const viewRef = useRef(view);
  const repliedRef = useRef(false);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  const showToast = (msg) => {
    setToast(msg);
    later(() => setToast(null), 2800);
  };

  const pushMsg = (chatId, msg, bump = false) =>
    setChats((cs) =>
      cs.map((c) =>
        c.id === chatId
          ? {
              ...c,
              msgs: [...c.msgs, { id: uid(), time: nowTime(), ...msg }],
              lastTime: "Şimdi",
              unread:
                bump && !(viewRef.current.name === "chat" && viewRef.current.id === chatId)
                  ? (c.unread || 0) + 1
                  : c.unread,
            }
          : c
      )
    );

  const openChat = (id) => {
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setTab("chats");
    setView({ name: "chat", id });
  };

  /* --- başvuru akışı (katılımcı tarafı) --- */
  const applyToEvent = (ev, note) => {
    const appId = "app-" + ev.id;
    setApps((a) => [...a, { id: appId, eventId: ev.id, who: "me", status: "beklemede" }]);
    const chatId = "dm-" + ev.id;
    setChats((cs) => [
      {
        id: chatId, type: "birebir", eventId: ev.id, title: ev.org.name,
        sub: `"${ev.title}" başvurusu`, unread: 0, lastTime: "Şimdi",
        msgs: [
          { id: uid(), from: "sys", text: `"${ev.title}" için başvuru sohbeti açıldı`, time: nowTime() },
          { id: uid(), from: "me", text: note, time: nowTime() },
        ],
      },
      ...cs,
    ]);
    openChat(chatId);
    later(() => pushMsg(chatId, { from: ev.org.id, name: ev.org.name, text: "Selam! Başvurunu gördüm 👋 Hangi mevkide oynuyorsun?" }, true), 1500);
    later(() => {
      pushMsg(chatId, { from: ev.org.id, name: ev.org.name, text: "Süper, tam aradığımız profil. Seni onaylıyorum 👍" }, true);
      pushMsg(chatId, { from: "approval", appId }, true);
    }, 4200);
  };

  /* çift onayın 2. adımı: katılımcının son onayı */
  const confirmJoin = (appId) => {
    const app = apps.find((a) => a.id === appId);
    if (!app) return;
    const ev = events.find((e) => e.id === app.eventId);
    if (!ev || ev.filled >= ev.needed) return;
    const newFilled = ev.filled + 1;
    const full = newFilled >= ev.needed;

    setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "onaylandi" } : x)));
    setEvents((es) =>
      es.map((e) =>
        e.id === ev.id ? { ...e, filled: newFilled, joined: true, status: full ? "doldu" : e.status } : e
      )
    );

    const gid = "g-" + ev.id;
    setChats((cs) => [
      {
        id: gid, type: "grup", eventId: ev.id, title: ev.title,
        sub: `${ev.capacity - ev.needed + newFilled} üye`, unread: 0, lastTime: "Şimdi",
        msgs: [
          { id: uid(), from: "sys", text: `"${ev.title}" grup sohbeti`, time: nowTime() },
          { id: uid(), from: "sys", text: `${user.name} kadroya katıldı`, time: nowTime() },
        ],
      },
      ...cs,
    ]);
    later(() => pushMsg(gid, { from: ev.org.id, name: ev.org.name, text: "Aramıza hoş geldin 💪 Maç günü 15 dk önce sahada olalım." }, true), 1800);
    showToast(full ? "Kadrodasın 🎉 Kontenjan tamamlandı!" : "Kadrodasın 🎉 Grup sohbetine eklendin");
  };

  /* --- başvuru akışı (organizatör tarafı, Pazar Ligi) --- */
  const approveApp = (appId) => {
    setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "orgBekliyor" } : x)));
    const app = apps.find((a) => a.id === appId);
    showToast(`Onayladın · ${app.who.name.split(" ")[0]}’ın son onayı bekleniyor`);
    later(() => {
      setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "onaylandi" } : x)));
      setEvents((es) =>
        es.map((e) => {
          if (e.id !== app.eventId) return e;
          const nf = e.filled + 1;
          return { ...e, filled: nf, status: nf >= e.needed ? "doldu" : e.status };
        })
      );
      pushMsg("g-e2", { from: "sys", text: `${app.who.name} kadroya katıldı` }, true);
      later(() => pushMsg("g-e2", { from: app.who.id, name: app.who.name, text: "Eyvallah hocam, pazar oradayım 💪" }, true), 900);
      showToast(`${app.who.name.split(" ")[0]} kadroya eklendi 🎉`);
    }, 2200);
  };

  const rejectApp = (appId) =>
    setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "reddedildi" } : x)));

  /* --- etkinlik oluşturma --- */
  const createEvent = (f) => {
    const id = "e-" + uid();
    const ev = {
      id, title: f.title, cat: Number(f.cat), city: f.city, venue: f.venue,
      date: f.date, price: Number(f.price) || 0, capacity: Number(f.capacity),
      needed: Number(f.needed), filled: 0, level: f.level, status: "acik",
      org: null, joined: false, mine: true, desc: f.desc || "Detaylar için mesaj atabilirsin.",
    };
    setEvents((es) => [ev, ...es]);
    setChats((cs) => [
      {
        id: "g-" + id, type: "grup", eventId: id, title: f.title,
        sub: `${ev.capacity - ev.needed} üye`, unread: 0, lastTime: "Şimdi",
        msgs: [{ id: uid(), from: "sys", text: "Grubu oluşturdun · Onaylanan oyuncular buraya eklenir", time: nowTime() }],
      },
      ...cs,
    ]);
    setTab("home");
    setView({ name: "event", id });
    showToast("Talebin yayında 🚀 Grup sohbeti kuruldu");
  };

  const sendMessage = (chatId, text) => {
    pushMsg(chatId, { from: "me", text });
    if (chatId === "g-e2" && !repliedRef.current) {
      repliedRef.current = true;
      later(() => pushMsg("g-e2", { from: "ozan", name: "Ozan Demir", text: "Anlaşıldı kaptan 👍" }, true), 1600);
    }
  };

  /* ---------- yerleşim ---------- */
  if (!user)
    return (
      <div className="flex h-screen w-full justify-center" style={{ backgroundColor: "#08281E" }}>
        <div className="relative h-full w-full max-w-md overflow-hidden">
          <AuthScreen
            onLogin={(u) =>
              setUser({ ...u, rating: 4.6, count: 12, rel: 92, joined: 23, organized: 5 })
            }
          />
        </div>
      </div>
    );

  const activeChat = view.name === "chat" ? chats.find((c) => c.id === view.id) : null;
  const activeEvent = view.name === "event" ? events.find((e) => e.id === view.id) : null;
  const myAppFor = (evId) => apps.find((a) => a.eventId === evId && a.who === "me");
  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);

  return (
    <div className="flex h-screen w-full justify-center" style={{ backgroundColor: "#08281E", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="relative flex h-full w-full max-w-md flex-col overflow-hidden shadow-2xl" style={{ backgroundColor: C.chalk }}>
        {/* sekmeler */}
        <div className="h-full">
          {tab === "home" && <HomeScreen user={user} events={events} onOpen={(id) => setView({ name: "event", id })} />}
          {tab === "chats" && view.name !== "chat" && <ChatsScreen chats={chats} onOpen={openChat} />}
          {tab === "chats" && view.name === "chat" && activeChat && (
            <ChatRoom
              chat={activeChat}
              user={user}
              apps={apps}
              onBack={() => setView({ name: "root" })}
              onSend={sendMessage}
              onConfirmJoin={confirmJoin}
              onGoChat={openChat}
            />
          )}
          {tab === "profile" && (
            <ProfileScreen
              user={user}
              pendingRate={pendingRate}
              onRate={() => setView({ name: "rate" })}
              onLogout={() => { setUser(null); setView({ name: "root" }); setTab("home"); }}
            />
          )}
        </div>

        {/* etkinlik detay kaplaması */}
        {activeEvent && (
          <div className="absolute inset-0 z-20" style={{ backgroundColor: C.chalk }}>
            <EventDetail
              ev={activeEvent}
              user={user}
              apps={apps}
              myApp={myAppFor(activeEvent.id)}
              onBack={() => setView({ name: "root" })}
              onApply={() => setView({ name: "apply", id: activeEvent.id })}
              onApprove={approveApp}
              onReject={rejectApp}
              onGoChat={openChat}
            />
          </div>
        )}

        {/* oluşturma ekranı */}
        {view.name === "create" && (
          <div className="absolute inset-0 z-20">
            <CreateScreen user={user} onBack={() => setView({ name: "root" })} onCreate={createEvent} />
          </div>
        )}

        {/* başvuru alt sayfası */}
        {view.name === "apply" && (
          <ApplySheet
            ev={events.find((e) => e.id === view.id)}
            onClose={() => setView({ name: "event", id: view.id })}
            onSend={(note) => applyToEvent(events.find((e) => e.id === view.id), note)}
          />
        )}

        {/* puanlama alt sayfası */}
        {view.name === "rate" && (
          <RateSheet
            onClose={() => setView({ name: "root" })}
            onSubmit={() => {
              setPendingRate(false);
              setView({ name: "root" });
              showToast("Puanın kaydedildi ⭐ Teşekkürler!");
            }}
          />
        )}

        {/* bildirim */}
        {toast && (
          <div className="absolute bottom-24 left-1/2 z-40 -translate-x-1/2 rounded-full px-4 py-2 text-sm font-bold text-white shadow-lg" style={{ backgroundColor: C.ink, whiteSpace: "nowrap" }}>
            {toast}
          </div>
        )}

        {/* alt sekme çubuğu */}
        {!(view.name === "chat" || view.name === "create" || activeEvent) && (
          <div className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-around border-t bg-white px-2 pb-3 pt-2" style={{ borderColor: C.line }}>
            <button onClick={() => { setTab("home"); setView({ name: "root" }); }} className="flex flex-col items-center gap-0.5 px-4">
              <Home size={22} color={tab === "home" ? C.turf : "#A8B3AC"} />
              <span className="font-bold" style={{ fontSize: 10, color: tab === "home" ? C.turf : "#A8B3AC" }}>Saha</span>
            </button>
            <button onClick={() => setView({ name: "create" })} className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg" style={{ backgroundColor: C.kit }}>
              <Plus size={26} />
            </button>
            <button onClick={() => { setTab("chats"); setView({ name: "root" }); }} className="relative flex flex-col items-center gap-0.5 px-4">
              <MessageCircle size={22} color={tab === "chats" ? C.turf : "#A8B3AC"} />
              {totalUnread > 0 && (
                <span className="absolute right-0 flex h-4 items-center justify-center rounded-full px-1 font-black text-white" style={{ backgroundColor: C.pitch, minWidth: 16, fontSize: 9, top: -4 }}>
                  {totalUnread}
                </span>
              )}
              <span className="font-bold" style={{ fontSize: 10, color: tab === "chats" ? C.turf : "#A8B3AC" }}>Sohbet</span>
            </button>
            <button onClick={() => { setTab("profile"); setView({ name: "root" }); }} className="flex flex-col items-center gap-0.5 px-4">
              <User size={22} color={tab === "profile" ? C.turf : "#A8B3AC"} />
              <span className="font-bold" style={{ fontSize: 10, color: tab === "profile" ? C.turf : "#A8B3AC" }}>Profil</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
