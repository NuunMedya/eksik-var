// Eksik Var — canlı veri katmanı (Supabase). Ekranlar bu dosyanın döndürdüğü şekilleri kullanır;
// demo modundaki nesnelerle birebir aynı alan adları korunur.
import { supabase } from "../supabase";
import { PLAKA } from "../trIlIlce";
import { fmtEventDate, toDateISO } from "../data";

/* ---------- eşleme yardımcıları ---------- */
const LEVEL_TO_UI = { farketmez: "Farketmez", baslangic: "Başlangıç", orta: "Orta", ileri: "İleri" };
const LEVEL_TO_DB = { Farketmez: "farketmez", Başlangıç: "baslangic", Orta: "orta", İleri: "ileri" };
const pad = (n) => String(n).padStart(2, "0");
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const fmtTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return hhmm(d);
  const diff = (now - d) / 86400000;
  if (diff < 1.5) return "Dün";
  if (diff < 7) return ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"][d.getDay()];
  return `${d.getDate()}.${pad(d.getMonth() + 1)}`;
};

const USER_COLS = "id, full_name, username, bio, skill_level, avatar_url, rating_avg, rating_count, reliability_pct, events_joined, events_organized, no_show_count, city_id, district_id, positions, fav_cat, fav_cats, cat_levels, team_name, mvp_count, is_verified, status, status_reason, suspended_until, contact_mode, contact_scope, quiet_enabled, quiet_start, quiet_end, notif_basvuru, notif_mesaj, notif_hatirlatma, notif_yakin, cities(name), districts(name)";

export function mapUser(u) {
  if (!u) return null;
  const rel = u.reliability_pct == null ? 100 : Math.round(Number(u.reliability_pct));   // ham; gösterim relInfo() ile yumuşatılır
  return {
    id: u.id, name: u.full_name, username: u.username, avatar: u.avatar_url || null,
    rating: Number(u.rating_avg || 0), count: u.rating_count || 0, rel,
    joined: u.events_joined || 0, organized: u.events_organized || 0, noShow: u.no_show_count || 0,
    city: u.cities ? u.cities.name : null, district: u.districts ? u.districts.name : null,
    cityId: u.city_id, districtId: u.district_id,
    verified: !!u.is_verified, status: u.status || "aktif", statusReason: u.status_reason || null, suspendedUntil: u.suspended_until || null,
    positions: u.positions || [], favCat: u.fav_cat || null, favCats: Array.isArray(u.fav_cats) ? u.fav_cats : [], catLevels: u.cat_levels || {}, teamName: u.team_name || null, mvpCount: u.mvp_count || 0,
    bio: u.bio || "", level: LEVEL_TO_UI[u.skill_level] || "Farketmez",
    contact: {
      mode: u.contact_mode || "ikisi", scope: u.contact_scope || "herkes",
      quiet: { enabled: !!u.quiet_enabled, start: (u.quiet_start || "22:00").slice(0, 5), end: (u.quiet_end || "08:00").slice(0, 5) },
    },
    notif: { basvuru: u.notif_basvuru !== false, mesaj: u.notif_mesaj !== false, hatirlatma: u.notif_hatirlatma !== false, yakin: u.notif_yakin !== false },
  };
}

// ctx: { meId, joinedIds:Set }
export function mapEvent(e, ctx) {
  const d = new Date(e.event_date);
  const dateISO = toDateISO(d);
  const time = hhmm(d);
  const org = e.organizer ? mapUser(e.organizer) : null;
  const mine = e.organizer_id === ctx.meId;
  return {
    id: e.id, title: e.title, cat: e.category_id,
    city: e.city ? e.city.name : "", district: e.district ? e.district.name : null,
    venue: e.venue_name || "", date: fmtEventDate(dateISO, time), dateISO, time, weekday: d.getDay(),
    price: Number(e.price_per_person || 0), capacity: e.total_capacity, needed: e.needed_count, filled: e.filled_count,
    level: LEVEL_TO_UI[e.skill_level] || "Farketmez", status: e.status,
    org: mine ? null : org, mine, joined: ctx.joinedIds.has(e.id),
    ended: d < new Date(), recurrence: e.recurrence || "yok", seriesId: e.series_id,
    needs: e.needed_positions || {}, filledPos: (ctx.fill && ctx.fill[e.id]) || {},
    kind: e.kind || "oyuncu", teamName: e.team_name || null, format: e.format || null, venueMode: e.venue_mode || null, costMode: e.cost_mode || null,
    offlineRegulars: e.offline_regulars || 0, availabilityAsked: !!e.availability_asked_at,
    score: e.score_home != null && e.score_away != null ? { home: e.score_home, away: e.score_away, label: e.score_label || "" } : null,
    guests: ctx.guests && ctx.guests[e.id] ? ctx.guests[e.id] : [],
    stats: ctx.stats && ctx.stats[e.id] ? ctx.stats[e.id] : [],
    payments: ctx.payments && ctx.payments[e.id] ? ctx.payments[e.id].filter((p) => p.id !== ctx.meId) : [],
    myPayment: ctx.payments && ctx.payments[e.id] ? (ctx.payments[e.id].find((p) => p.id === ctx.meId) || null) : null,
    mvp: ctx.mvp && ctx.mvp[e.id] ? ctx.mvp[e.id] : null,
    venueLat: e.venue_lat ?? null, venueLng: e.venue_lng ?? null,
    availability: ctx.availability && ctx.availability[e.id] ? ctx.availability[e.id] : null,
    waitlistCount: (ctx.waitCount && ctx.waitCount[e.id]) || 0, myWaitlist: !!(ctx.myWait && ctx.myWait[e.id]),
    myWaitPos: ctx.myWait ? ctx.myWait[e.id] || null : null, waitlist: (ctx.waitlists && ctx.waitlists[e.id]) || [],
    recurrenceUntil: e.recurrence_until, desc: e.description || "Detaylar için mesaj atabilirsin.",
    attendance: null, myAttendance: ctx.attendance ? ctx.attendance[e.id] || null : null, checkedIn: !!(ctx.checked && ctx.checked[e.id]),
    checkedIns: (ctx.checkedIns && ctx.checkedIns[e.id]) || [],
  };
}

function mapApplicationStatus(a) {
  if (a.status === "onaylandi") return "onaylandi";
  if (a.status === "reddedildi" || a.status === "iptal") return "reddedildi";
  if (a.organizer_approved && !a.applicant_approved) return "orgBekliyor";
  return "beklemede";
}

// organizatör gözünden: who = başvuran; başvuran gözünden: who = "me"
export function mapApplication(a, meId) {
  return {
    id: a.id, eventId: a.event_id, conversationId: a.conversation_id,
    who: a.applicant_id === meId ? "me" : mapUser(a.applicant), position: a.position || null, invited: !!a.invited_by,
    fromWaitlist: !!a.from_waitlist, offerExpiresAt: a.offer_expires_at ? fmtTime(a.offer_expires_at) : null,
    note: a.message || "", status: mapApplicationStatus(a),
    organizerApproved: !!a.organizer_approved, applicantApproved: !!a.applicant_approved,
  };
}

// ctx: { meId, myApps:[], participantsByEvent: {eventId:Set(userId)} }
export function mapChat(c, ctx) {
  const members = (c.conversation_members || []).map((m) => {
    const u = mapUser(m.users);
    const inSquad = c.event_id && ctx.participantsByEvent[c.event_id] && ctx.participantsByEvent[c.event_id].has(m.user_id);
    return { ...(u || { id: m.user_id, name: "Kullanıcı", username: "-", rating: 0, count: 0, rel: 100 }),
      id: m.user_id === ctx.meId ? "me" : m.user_id, role: m.role === "yonetici" ? "organizator" : "uye", via: inSquad ? "uygulama" : "ekip" };
  });
  const me = (c.conversation_members || []).find((m) => m.user_id === ctx.meId);
  const lastRead = me && me.last_read_message_id ? me.last_read_message_id : 0;
  const raw = (c.messages || []).slice().sort((a, b) => a.id - b.id);
  const nameOf = (uid) => { const mm = members.find((x) => (x.id === "me" ? ctx.meId : x.id) === uid); return mm ? mm.name : "Üye"; };
  const byId = new Map(raw.map((m) => [m.id, m]));
  const msgs = raw.map((m) => {
    const reactions = {};
    (m.message_reactions || []).forEach((r) => {
      (reactions[r.emoji] = reactions[r.emoji] || []).push({ id: r.user_id === ctx.meId ? "me" : r.user_id, name: nameOf(r.user_id) });
    });
    const orig = m.reply_to_id ? byId.get(m.reply_to_id) : null;
    return {
      id: String(m.id), dbId: m.id,
      from: m.type === "sistem" || !m.sender_id ? "sys" : m.sender_id === ctx.meId ? "me" : m.sender_id,
      name: m.users ? m.users.full_name : undefined, text: m.content, time: fmtTime(m.created_at),
      poll: m.poll_id && ctx.polls && ctx.polls[m.poll_id] ? ctx.polls[m.poll_id] : undefined,
      image: m.image_url || undefined,
      reactions: Object.keys(reactions).length ? reactions : undefined,
      replyTo: orig ? { id: String(orig.id), dbId: orig.id,
        name: orig.sender_id === ctx.meId ? null : (orig.users ? orig.users.full_name : nameOf(orig.sender_id)),
        text: String(orig.content || (orig.image_url ? "📷 Fotoğraf" : "")).slice(0, 90) } : undefined,
    };
  });
  const other = c.type === "birebir" ? members.find((m) => m.id !== "me") : null;
  // başvuru sohbeti: organizatör onayladı, son onay bende → onay kartı
  const app = ctx.myApps.find((a) => a.conversationId === c.id);
  if (app && (app.status === "orgBekliyor" || app.status === "onaylandi")) {
    msgs.push({ id: "approval-" + app.id, from: "approval", appId: app.id, time: "" });
  }
  const unread = raw.filter((m) => m.id > lastRead && m.sender_id && m.sender_id !== ctx.meId).length;
  const last = raw[raw.length - 1];
  return {
    id: c.id, type: c.type, eventId: c.event_id, seriesId: c.series_id, teamId: c.team_id || null,
    title: c.type === "grup" ? c.name || "Grup" : other ? other.name : "Sohbet",
    sub: c.type === "grup" ? `${members.length} üye` : "",
    otherId: other ? other.id : null, other: other || null, appId: app ? app.id : null,
    members: c.type === "grup" ? members : undefined,
    pinned: c.pinned ? { id: String(c.pinned.id), text: c.pinned.content || "📷 Fotoğraf" } : null,
    muted: !!(me && me.is_muted), archived: !!(me && me.archived), hiddenAt: (me && me.hidden_at) || null,
    lastRaw: last ? last.created_at : c.created_at, hasMore: raw.length >= 60,
    unread, lastTime: last ? fmtTime(last.created_at) : fmtTime(c.created_at), msgs,
  };
}

/* ---------- kimlik: telefon + SMS kodu ---------- */
// Kayıt: profil bilgileri metadata olarak gider, profil trigger'ı kullanır. Giriş: kayıtlı olmayan numara hata döner.
export async function sendOtp({ mode, phone, name, username, city, district, favCats, positions }) {
  const register = mode === "register";
  let districtId = null;
  const cityId = PLAKA[city] || null;
  if (register && district && cityId) {
    const { data: d } = await supabase.from("districts").select("id").eq("city_id", cityId).eq("name", district).maybeSingle();
    districtId = d ? d.id : null;
  }
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: {
      channel: "sms",
      shouldCreateUser: register,
      data: register ? { full_name: name, username, city_id: cityId ? String(cityId) : "", district_id: districtId ? String(districtId) : "", phone, fav_cats: favCats || [], positions: positions || [] } : undefined,
    },
  });
  if (error) throw error;
}
export async function verifyOtp(phone, token) {
  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
  if (error) throw error;
  return data.session;
}

/* ---------- kimlik (e-posta; yedek) ---------- */
export async function signUp({ email, pass, name, username, phone, city, district }) {
  const cityId = PLAKA[city] || null;
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(), password: pass,
    options: { data: { full_name: name.trim(), username: username.trim(), phone: (phone || "").trim(), city_id: cityId ? String(cityId) : "" } },
  });
  if (error) throw error;
  const uid = data.user && data.user.id;
  if (uid && district && cityId) {
    const { data: d } = await supabase.from("districts").select("id").eq("city_id", cityId).eq("name", district).maybeSingle();
    if (d) await supabase.from("users").update({ district_id: d.id }).eq("id", uid);
  }
  return data.session;
}
export async function signIn({ email, pass }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
  if (error) throw error;
  return data.session;
}
export const signOut = () => supabase.auth.signOut();
export const getSession = async () => (await supabase.auth.getSession()).data.session;
export const onAuthChange = (cb) => supabase.auth.onAuthStateChange((_e, session) => cb(session));

/* ---------- profil ---------- */
export async function getProfile(uid) {
  const { data, error } = await supabase.from("users").select(USER_COLS).eq("id", uid).maybeSingle();
  if (error) throw error;
  return mapUser(data);
}
export async function updateSettings(uid, settings) {
  const c = settings.contact, n = settings.notif;
  const { error } = await supabase.from("users").update({
    contact_mode: c.mode, contact_scope: c.scope, quiet_enabled: c.quiet.enabled, quiet_start: c.quiet.start, quiet_end: c.quiet.end,
    notif_basvuru: n.basvuru, notif_mesaj: n.mesaj, notif_hatirlatma: n.hatirlatma, notif_yakin: n.yakin !== false,
  }).eq("id", uid);
  if (error) throw error;
}
export async function changeCity(uid, city) {
  const { error } = await supabase.from("users").update({ city_id: PLAKA[city], district_id: null }).eq("id", uid);
  if (error) throw error;
}
export async function uploadAvatar(uid, uri) {
  if (!uri) {
    await supabase.from("users").update({ avatar_url: null }).eq("id", uid);
    return null;
  }
  const path = `${uid}/avatar-${Date.now()}.jpg`;
  const yanit = await fetch(uri);
  const blob = await yanit.blob();
  const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
  if (error) throw error;
  const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
  await supabase.from("users").update({ avatar_url: url }).eq("id", uid);
  return url;
}
export async function deleteAccount() {
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;
  await supabase.auth.signOut();
}

/* ---------- etkinlikler ---------- */
const EVENT_COLS = "*, organizer:users!organizer_id(id, full_name, username, avatar_url, rating_avg, rating_count, reliability_pct, contact_mode, contact_scope, quiet_enabled, quiet_start, quiet_end), district:districts(name), city:cities(name)";

export async function listEvents(meId, cityId) {
  const since = new Date(Date.now() - 3 * 86400000).toISOString();
  const [feed, mine, part] = await Promise.all([
    supabase.from("events").select(EVENT_COLS).eq("city_id", cityId).in("status", ["acik", "doldu"]).gte("event_date", since).order("event_date"),
    supabase.from("events").select(EVENT_COLS).eq("organizer_id", meId).gte("event_date", since).order("event_date"),
    supabase.from("participants").select("event_id, attendance, checked_in_at, events(" + EVENT_COLS + ")").eq("user_id", meId),
  ]);
  for (const r of [feed, mine, part]) if (r.error) throw r.error;
  const joinedIds = new Set(part.data.map((p) => p.event_id));
  const attendance = {};
  const checked = {};
  part.data.forEach((p) => { attendance[p.event_id] = p.attendance === "bekleniyor" ? null : p.attendance; checked[p.event_id] = !!p.checked_in_at; });
  const byId = new Map();
  [...feed.data, ...mine.data, ...part.data.map((p) => p.events).filter(Boolean)].forEach((e) => byId.set(e.id, e));
  const fill = {};
  const ids = [...byId.keys()];
  if (ids.length) {
    const { data: fr } = await supabase.from("v_event_position_fill").select("event_id, position, filled").in("event_id", ids);
    (fr || []).forEach((r) => { (fill[r.event_id] = fill[r.event_id] || {})[r.position] = r.filled; });
  }
  const waitCount = {}, myWait = {}, waitlists = {};
  if (ids.length) {
    const [wc, mw] = await Promise.all([
      supabase.from("v_event_waitlist_count").select("event_id, waiting").in("event_id", ids),
      supabase.from("waitlist").select("event_id, user_id, position, created_at, users(full_name, username)").in("event_id", ids).order("created_at"),
    ]);
    (wc.data || []).forEach((r) => { waitCount[r.event_id] = r.waiting; });
    (mw.data || []).forEach((r) => {
      if (r.user_id === meId) myWait[r.event_id] = r.position || "farketmez";
      (waitlists[r.event_id] = waitlists[r.event_id] || []).push({ id: r.user_id, name: r.users ? r.users.full_name : "Kullanıcı", position: r.position });
    });
  }
  const availability = {};
  const seriesIds = [...byId.values()].filter((e) => e.series_id).map((e) => e.id);
  if (seriesIds.length) {
    const { data: av } = await supabase.from("v_event_availability").select("*").in("event_id", seriesIds);
    (av || []).forEach((a) => { availability[a.event_id] = { asked: !!a.availability_asked_at, pollId: a.poll_id, varim: a.varim, yokum: a.yokum, belirsiz: a.belirsiz, cevapsiz: a.cevapsiz, suggested: a.suggested, myAnswer: null }; });
  }
  const mvp = {};
  const doneIds = [...byId.values()].filter((e) => e.status === "tamamlandi").map((e) => e.id);
  if (doneIds.length) {
    const { data: mv } = await supabase.from("v_event_mvp").select("event_id, voted_id, full_name, votes, rnk").in("event_id", doneIds).eq("rnk", 1);
    (mv || []).forEach((r) => { const e = byId.get(r.event_id); mvp[r.event_id] = { id: r.voted_id, name: r.full_name, votes: r.votes, final: !!(e && e.mvp_finalized_at) }; });
    [...byId.values()].forEach((e) => { if (e.mvp_user_id && e.mvp_finalized_at && !mvp[e.id]) mvp[e.id] = { id: e.mvp_user_id, name: "MVP", votes: 0, final: true }; });
  }
  const payments = {};
  const { data: pays } = await supabase.from("v_event_payments").select("*").in("event_id", ids);
  (pays || []).forEach((p) => { (payments[p.event_id] = payments[p.event_id] || []).push({ id: p.user_id, name: p.full_name, avatar: p.avatar_url, amount: Number(p.amount), status: p.status }); });
  const checkedIns = {};
  const mineIds = [...byId.values()].filter((e) => e.organizer_id === meId).map((e) => e.id);
  if (mineIds.length) {
    const { data: ci } = await supabase.from("participants").select("event_id, user_id").in("event_id", mineIds).not("checked_in_at", "is", null);
    (ci || []).forEach((r) => { (checkedIns[r.event_id] = checkedIns[r.event_id] || []).push(r.user_id); });
  }
  const stats = {};
  const doneForStats = [...byId.values()].filter((e) => e.status === "tamamlandi").map((e) => e.id);
  if (doneForStats.length) {
    const { data: ms } = await supabase.from("match_stats").select("event_id, user_id, guest_id, goals, assists, users(full_name), guests(name)").in("event_id", doneForStats);
    (ms || []).forEach((r) => { (stats[r.event_id] = stats[r.event_id] || []).push({ id: r.user_id ? (r.user_id === meId ? "me" : r.user_id) : "g:" + r.guest_id, name: r.users ? r.users.full_name : r.guests ? r.guests.name : "Oyuncu", goals: r.goals, assists: r.assists }); });
  }
  const guests = {};
  const { data: gs } = await supabase.from("v_event_guests").select("*").in("event_id", ids);
  (gs || []).forEach((g) => { (guests[g.event_id] = guests[g.event_id] || []).push({ id: g.guest_id, name: g.name, position: g.position || null, available: g.available, attendance: g.attendance, payment: g.payment_status, amount: Number(g.amount) }); });
  // misafir ödemeleri organizatörün ödeme listesine eklenir
  Object.keys(guests).forEach((eid) => { guests[eid].forEach((g) => { if (g.amount > 0) (payments[eid] = payments[eid] || []).push({ id: "g:" + g.id, name: g.name, amount: g.amount, status: g.payment, guest: true }); }); });
  const ctx = { meId, joinedIds, attendance, fill, waitCount, myWait, waitlists, availability, mvp, payments, guests, checked, checkedIns, stats };
  return [...byId.values()].map((e) => mapEvent(e, ctx)).sort((a, b) => (a.dateISO + a.time).localeCompare(b.dateISO + b.time));
}

export async function createEvent(meId, f) {
  const cityId = PLAKA[f.city];
  const { data: d } = await supabase.from("districts").select("id").eq("city_id", cityId).eq("name", f.district).maybeSingle();
  const eventDate = new Date(`${f.dateISO}T${f.time}:00`);
  const weekly = f.recurrence === "haftalik";
  let until = null;
  if (weekly && f.weeks) { const u = new Date(eventDate); u.setDate(u.getDate() + f.weeks * 7 - 1); until = toDateISO(u); }
  const { data, error } = await supabase.from("events").insert({
    organizer_id: meId, category_id: Number(f.cat), city_id: cityId, district_id: d ? d.id : null,
    title: f.title.trim(), description: f.desc || null, venue_name: f.venue.trim(),
    event_date: eventDate.toISOString(), total_capacity: Number(f.capacity), needed_count: Number(f.needed),
    price_per_person: Number(f.price) || 0, skill_level: LEVEL_TO_DB[f.level] || "farketmez",
    recurrence: weekly ? "haftalik" : "yok", recurrence_until: until, needed_positions: f.needs || {},
    kind: f.kind || "oyuncu", team_name: f.teamName || null, format: f.format || null, venue_mode: f.venueMode || null, cost_mode: f.costMode || null,
    offline_regulars: Number(f.offlineRegulars) || 0,
    venue_lat: f.venueLat ?? null, venue_lng: f.venueLng ?? null,
  }).select("id").single();
  if (f.kind === "rakip" && f.teamName) await supabase.from("users").update({ team_name: f.teamName }).eq("id", meId);
  if (error) throw error;
  return data.id;
}

/* ---------- başvurular ---------- */
const APP_COLS = "*, applicant:users!applicant_id(id, full_name, username, avatar_url, rating_avg, rating_count, reliability_pct)";
export async function listApplications(meId) {
  const { data, error } = await supabase.from("applications").select(APP_COLS).order("created_at", { ascending: false });
  if (error) throw error;   // RLS: yalnızca başvuranı ya da organizatörü olduğum başvurular gelir
  return data.map((a) => mapApplication(a, meId));
}
export async function applyToEvent(meId, eventId, note, position = null) {
  const { data, error } = await supabase.from("applications").insert({ event_id: eventId, applicant_id: meId, message: note, position }).select("id, conversation_id").single();
  if (error) throw error;
  return data;
}
export async function setApplication(appId, patch) {
  const { error } = await supabase.from("applications").update(patch).eq("id", appId);
  if (error) throw error;
}

/* ---------- sohbetler ---------- */
const CHAT_COLS = "id, type, event_id, series_id, team_id, name, created_at, pinned_message_id, pinned:messages!conversations_pinned_message_id_fkey(id, content, image_url), conversation_members(user_id, role, is_muted, archived, hidden_at, last_read_message_id, users(" + USER_COLS + ")), messages!messages_conversation_id_fkey(id, sender_id, type, content, image_url, created_at, poll_id, reply_to_id, users!messages_sender_id_fkey(full_name), message_reactions(user_id, emoji))";
export async function listChats(meId, myApps) {
  const { data, error } = await supabase.from("conversations").select(CHAT_COLS)
    .order("id", { referencedTable: "messages", ascending: false }).limit(60, { referencedTable: "messages" });
  if (error) throw error;
  const eventIds = data.map((c) => c.event_id).filter(Boolean);
  const participantsByEvent = {};
  if (eventIds.length) {
    const { data: ps } = await supabase.from("participants").select("event_id, user_id").in("event_id", eventIds);
    (ps || []).forEach((p) => { (participantsByEvent[p.event_id] = participantsByEvent[p.event_id] || new Set()).add(p.user_id); });
  }
  const polls = {};
  const convIds = data.map((c) => c.id);
  if (convIds.length) {
    const { data: ps } = await supabase.from("polls").select("id, question, options, multiple, closed_at, created_by, kind, event_id, poll_votes(user_id, option_id, users(full_name))").in("conversation_id", convIds);
    (ps || []).forEach((p) => {
      const votes = {};
      (p.poll_votes || []).forEach((v) => { (votes[v.option_id] = votes[v.option_id] || []).push({ id: v.user_id === meId ? "me" : v.user_id, name: v.users ? v.users.full_name : "Üye" }); });
      polls[p.id] = { id: p.id, question: p.question, options: p.options, multiple: !!p.multiple, closed: !!p.closed_at, createdBy: p.created_by === meId ? "me" : p.created_by, votes, kind: p.kind || "serbest", eventId: p.event_id || null };
    });
  }
  const ctx = { meId, myApps, participantsByEvent, polls };
  return data.map((c) => mapChat(c, ctx)).sort((a, b) => {
    const la = a.msgs.length ? a.msgs[a.msgs.length - 1].dbId || 0 : 0, lb = b.msgs.length ? b.msgs[b.msgs.length - 1].dbId || 0 : 0;
    return lb - la;
  });
}
/* ---------- takım + teklifler + kulüp ---------- */
export async function myTeam(meId) {
  const { data } = await supabase.from("teams").select("id, name, emblem, category_id, misafirler").eq("owner_id", meId).limit(1).maybeSingle();
  return data || null;
}
export async function createTeam(meId, user, name, emblem = "🛡") {
  const { data, error } = await supabase.from("teams")
    .insert({ owner_id: meId, name: name.trim(), emblem, city_id: PLAKA[user.city] || null })
    .select("id, name, emblem").single();
  if (error) throw error;
  return data;
}
export async function teamMembers(teamId) {
  const { data, error } = await supabase.from("team_members")
    .select("user_id, role, joined_at, users!team_members_user_id_fkey(full_name, avatar_url, rating_avg)")
    .eq("team_id", teamId).order("joined_at");
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.user_id, role: r.role, name: (r.users && r.users.full_name) || "Oyuncu",
    avatar: r.users && r.users.avatar_url, rating: Number(r.users && r.users.rating_avg) || 0 }));
}
export async function uploadTeamLogo(meId, teamId, uri) {
  const blob = await (await fetch(uri)).blob();
  const path = `${meId}/takim_${teamId}.jpg`;
  const { error } = await supabase.storage.from("avatars").upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
  if (error) throw error;
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl + "?v=" + Date.now();
}
export async function updateTeam(teamId, fields) {
  const { error } = await supabase.from("teams").update(fields).eq("id", teamId);
  if (error) throw error;
}
export async function removeTeamMember(teamId, userId) {
  const { error } = await supabase.from("team_members").delete().eq("team_id", teamId).eq("user_id", userId);
  if (error) throw error;
}
export async function createOffer(meId, { kind, toUser, teamId = null, message = "" }) {
  const { error } = await supabase.from("offers").insert({ kind, from_user: meId, to_user: toUser, team_id: teamId, message: message || null });
  if (error) throw error;
}
export async function myOffers(meId) {
  const { data, error } = await supabase.from("offers")
    .select("id, kind, status, message, created_at, from_user, to_user, gonderen:users!offers_from_user_fkey(full_name, avatar_url), alan:users!offers_to_user_fkey(full_name, avatar_url), teams(name, emblem)")
    .or(`from_user.eq.${meId},to_user.eq.${meId}`).order("created_at", { ascending: false }).limit(40);
  if (error) throw error;
  return (data || []).map((r) => ({
    id: r.id, kind: r.kind, status: r.status, message: r.message || "", createdAt: r.created_at, yorumSayi: (r.post_comments && r.post_comments[0] && r.post_comments[0].count) || 0,
    yon: r.from_user === meId ? "giden" : "gelen",
    kisi: r.from_user === meId ? (r.alan && r.alan.full_name) : (r.gonderen && r.gonderen.full_name),
    kisiId: r.from_user === meId ? r.to_user : r.from_user,
    avatar: r.from_user === meId ? (r.alan && r.alan.avatar_url) : (r.gonderen && r.gonderen.avatar_url),
    takim: r.teams ? `${String(r.teams.emblem || "").startsWith("http") ? "🛡" : r.teams.emblem} ${r.teams.name}` : null,
  }));
}
export async function decideOffer(offerId, status) {
  const { error } = await supabase.from("offers").update({ status }).eq("id", offerId);
  if (error) throw error;
}
export async function listClub(cityName) {
  const cityId = PLAKA[cityName] || null;
  let q = supabase.from("club_listings")
    .select("team_id, bio, positions, active, teams!inner(name, emblem, owner_id, city_id, category_id, team_members(count))")
    .eq("active", true);
  if (cityId) q = q.eq("teams.city_id", cityId);
  const { data, error } = await q.limit(40);
  if (error) throw error;
  return (data || []).map((r) => ({
    teamId: r.team_id, bio: r.bio || "", positions: r.positions || [],
    name: r.teams.name, emblem: r.teams.emblem, ownerId: r.teams.owner_id,
    cat: r.teams.category_id || 1,
    uye: (r.teams.team_members && r.teams.team_members[0] && r.teams.team_members[0].count) || 1,
  }));
}
export async function upsertClubListing(teamId, { bio = "", positions = [], active = true } = {}) {
  const { error } = await supabase.from("club_listings").upsert({
    team_id: teamId, bio: (bio || "").trim() || null, positions, active, updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

/* ---------- kişi profil ekstraları ---------- */
export async function updateEventNeeds(id, needs) {
  const { error } = await supabase.from("events").update({ needed_positions: needs || {} }).eq("id", id);
  if (error) throw error;
}
export async function stopSeries(id) {
  const bugun = new Date().toISOString().slice(0, 10);
  const { error } = await supabase.from("events").update({ recurrence_until: bugun }).eq("id", id);
  if (error) throw error;
}
export async function updateEventDesc(id, desc) {
  const { error } = await supabase.from("events").update({ description: (desc || "").trim() || null }).eq("id", id);
  if (error) throw error;
}
export async function updatePostCaption(id, caption) {
  const { error } = await supabase.from("posts").update({ caption: caption || null }).eq("id", id);
  if (error) throw error;
}
export async function archivePost(id) {
  const { error } = await supabase.from("posts").update({ archived: true }).eq("id", id);
  if (error) throw error;
}
export async function listComments(postId) {
  const { data, error } = await supabase.from("post_comments")
    .select("id, body, created_at, user_id, users!post_comments_user_id_fkey(full_name, avatar_url)")
    .eq("post_id", postId).order("created_at").limit(100);
  if (error) throw error;
  return (data || []).map((r) => ({ id: r.id, body: r.body, createdAt: r.created_at, userId: r.user_id,
    name: (r.users && r.users.full_name) || "Oyuncu", avatar: r.users && r.users.avatar_url }));
}
export async function addComment(meId, postId, body) {
  const { error } = await supabase.from("post_comments").insert({ post_id: postId, user_id: meId, body: body.trim() });
  if (error) throw error;
}
export async function deleteComment(id) {
  const { error } = await supabase.from("post_comments").delete().eq("id", id);
  if (error) throw error;
}
export async function userExtras(userId) {
  const [{ data: ls }, { data: ps }] = await Promise.all([
    supabase.from("player_listings").select("category_id, positions, bio").eq("user_id", userId).eq("active", true).maybeSingle(),
    supabase.from("posts").select("id, caption, image_url, video_url, created_at, post_likes(user_id)")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(3),
  ]);
  return {
    listing: ls ? { cat: ls.category_id, positions: ls.positions || [], bio: ls.bio || "" } : null,
    posts: (ps || []).map((r) => ({ id: r.id, caption: r.caption || "", image: r.image_url, video: r.video_url, createdAt: r.created_at, likes: r.post_likes || [] })),
  };
}

/* ---------- keşfet ---------- */
export async function listPosts(meId, cityName) {
  const cityId = PLAKA[cityName] || null;
  let q = supabase.from("posts")
    .select("id, user_id, caption, image_url, video_url, attach_listing, created_at, users!posts_user_id_fkey(full_name, avatar_url), post_likes(user_id), post_comments(count)")
    .order("created_at", { ascending: false }).limit(40);
  q = q.eq("archived", false);
  if (cityId) q = q.eq("city_id", cityId);
  const { data, error } = await q;
  if (error) throw error;
  const rows = data || [];
  // vitrin ekli gönderiler için ilanları tek sorguda çek
  const ekliler = [...new Set(rows.filter((r) => r.attach_listing).map((r) => r.user_id))];
  const vitrin = {};
  if (ekliler.length) {
    const { data: ls } = await supabase.from("player_listings")
      .select("user_id, category_id, positions, users(rating_avg, reliability_pct, cat_levels, cities(name), districts(name))")
      .in("user_id", ekliler).eq("active", true);
    (ls || []).forEach((l) => { vitrin[l.user_id] = { cat: l.category_id, positions: l.positions || [],
      rating: Number(l.users && l.users.rating_avg) || 0, rel: (l.users && l.users.reliability_pct) ?? 100,
      city: l.users && l.users.cities && l.users.cities.name, district: l.users && l.users.districts && l.users.districts.name,
      level: l.users && l.users.cat_levels && l.users.cat_levels[l.category_id] }; });
  }
  return rows.map((r) => ({
    id: r.id, userId: r.user_id === meId ? "me" : r.user_id,
    name: (r.users && r.users.full_name) || "Oyuncu", avatar: (r.users && r.users.avatar_url) || undefined,
    caption: r.caption || "", image: r.image_url || null, video: r.video_url || null, createdAt: r.created_at,
    likes: (r.post_likes || []).map((x) => (x.user_id === meId ? "me" : x.user_id)),
    attach: r.attach_listing, listing: r.attach_listing ? vitrin[r.user_id] || null : null,
  }));
}
export async function createPost(meId, user, { caption, imageUri, videoUri, attach }) {
  let image_url = null, video_url = null;
  if (imageUri) {
    const path = `${meId}/post-${Date.now()}.jpg`;
    const blob = await (await fetch(imageUri)).blob();
    const { error: e1 } = await supabase.storage.from("posts").upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
    if (e1) throw e1;
    image_url = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
  }
  if (videoUri) {
    const blob = await (await fetch(videoUri)).blob();
    if (blob.size > 40 * 1024 * 1024) throw new Error("Video çok büyük — 30 saniyeyi ve 40MB'ı aşmasın.");
    const path = `${meId}/post-${Date.now()}.mp4`;
    const { error: e2 } = await supabase.storage.from("posts").upload(path, blob, { contentType: blob.type || "video/mp4", upsert: true });
    if (e2) throw e2;
    video_url = supabase.storage.from("posts").getPublicUrl(path).data.publicUrl;
  }
  const { error } = await supabase.from("posts").insert({
    user_id: meId, city_id: PLAKA[user.city] || null,
    caption: (caption || "").trim() || null, image_url, video_url, attach_listing: !!attach,
  });
  if (error) throw error;
}
export async function deletePost(postId) {
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw error;
}
export async function togglePostLike(meId, postId, liked) {
  const q = liked
    ? supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", meId)
    : supabase.from("post_likes").insert({ post_id: postId, user_id: meId });
  const { error } = await q;
  if (error && error.code !== "23505") throw error;
}

/* ---------- transfer pazarı ---------- */
const mapListing = (r, meId) => ({
  id: r.user_id, userId: r.user_id === meId ? "me" : r.user_id,
  name: (r.users && r.users.full_name) || "Oyuncu", avatar: (r.users && r.users.avatar_url) || undefined,
  rating: Number(r.users && r.users.rating_avg) || 0, count: (r.users && r.users.rating_count) || 0,
  rel: r.users && r.users.reliability_pct != null ? r.users.reliability_pct : 100,
  cat: r.category_id, positions: r.positions || [], days: r.days || [],
  district: (r.districts && r.districts.name) || "", bio: r.bio || "", active: r.active,
});
export async function listMarket(meId, cityName) {
  const cityId = PLAKA[cityName];
  if (!cityId) return [];
  const { data, error } = await supabase.from("player_listings")
    .select("*, users!player_listings_user_id_fkey(full_name, avatar_url, rating_avg, rating_count, reliability_pct), districts(name)")
    .eq("city_id", cityId).eq("active", true)
    .order("updated_at", { ascending: false }).limit(60);
  if (error) throw error;
  return (data || []).map((r) => mapListing(r, meId));
}
export async function myListing(meId) {
  const { data, error } = await supabase.from("player_listings").select("*").eq("user_id", meId).maybeSingle();
  if (error) throw error;
  return data ? { cat: data.category_id, positions: data.positions || [], days: data.days || [], bio: data.bio || "", active: data.active } : null;
}
export async function upsertListing(meId, user, f) {
  const row = { user_id: meId, category_id: f.cat, city_id: PLAKA[user.city] || null,
    district_id: user.districtId || null, positions: f.positions || [], days: f.days || [],
    bio: (f.bio || "").trim() || null, active: true, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("player_listings").upsert(row);
  if (error) throw error;
}
export async function closeListing(meId) {
  const { error } = await supabase.from("player_listings").update({ active: false, updated_at: new Date().toISOString() }).eq("user_id", meId);
  if (error) throw error;
}

/* ---------- saha havuzu ---------- */
export async function listVenues(cityName, categoryId, q = "") {
  const cityId = PLAKA[cityName];
  if (!cityId) return [];
  let query = supabase.from("venues").select("id, name, lat, lng, category_id, source")
    .eq("city_id", cityId).eq("category_id", categoryId).order("name").limit(60);
  if (q && q.trim()) query = query.ilike("name", "%" + q.trim() + "%");
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
export async function addVenue(meId, cityName, categoryId, name, lat, lng) {
  const cityId = PLAKA[cityName];
  const row = { city_id: cityId, category_id: categoryId, name: name.trim(),
    lat: lat ?? null, lng: lng ?? null, source: "user", created_by: meId };
  const { data, error } = await supabase.from("venues").insert(row).select("id, name, lat, lng").single();
  if (!error) return data;
  if (error.code === "23505") {   // aynı ad zaten havuzda
    const { data: eski } = await supabase.from("venues").select("id, name, lat, lng")
      .eq("city_id", cityId).eq("category_id", categoryId).ilike("name", name.trim()).maybeSingle();
    if (eski) {
      const bozuk = !(Number(eski.lat) > 35 && Number(eski.lat) < 43);
      if (bozuk && lat != null) {   // koordinatı yoksa: bu noktaya otur
        const { data: tam } = await supabase.from("venues").update({ lat, lng })
          .eq("id", eski.id).select("id, name, lat, lng").maybeSingle();
        if (tam) return tam;
      }
      return eski;
    }
  }
  throw error;
}

/* ---------- sponsorlar ---------- */
// Panelden yönetilir: Table Editor > sponsors. Boşsa uygulama varsayılanı gösterir.
export async function listSponsors() {
  const { data, error } = await supabase.from("sponsors")
    .select("id, name, emoji, color, tagline, cta, url, priority, logo_url")
    .eq("active", true).order("priority");
  if (error) throw error;
  return data || [];
}
export async function sponsorClick(id) {
  const { error } = await supabase.rpc("sponsor_click", { p_id: id });
  if (error) throw error;
}

export async function sendMessage(meId, conversationId, text, replyToDbId = null) {
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: meId, content: text, reply_to_id: replyToDbId });
  if (error) throw error;
}
// Tepki: aynı emoji → kaldır; farklı ya da yok → tek tepki olarak yaz (PK: mesaj+kullanıcı)
export async function toggleReactionApi(meId, messageDbId, emoji, current) {
  const q = current === emoji
    ? supabase.from("message_reactions").delete().eq("message_id", messageDbId).eq("user_id", meId)
    : supabase.from("message_reactions").upsert({ message_id: messageDbId, user_id: meId, emoji });
  const { error } = await q;
  if (error) throw error;
}
export async function markChatRead(meId, conversationId, lastDbId) {
  if (!lastDbId) return;
  await supabase.from("conversation_members").update({ last_read_message_id: lastDbId }).eq("conversation_id", conversationId).eq("user_id", meId);
}
export async function setChatFlags(meId, convId, patch) {
  const { error } = await supabase.from("conversation_members").update(patch)
    .eq("conversation_id", convId).eq("user_id", meId);
  if (error) throw error;
}
export async function createGroupChat(name, memberIds) {
  const { data, error } = await supabase.rpc("rpc_create_group", { p_name: name, p_members: memberIds });
  if (error) throw error;
  return data;
}
export async function openDirectChat(meId, otherId) {
  // Var olan birebir sohbeti bul; yoksa oluştur (RLS: created_by = ben; üyeler = ben + karşı taraf)
  const { data: existing } = await supabase.from("conversations").select("id, conversation_members(user_id)").eq("type", "birebir").is("event_id", null);
  const found = (existing || []).find((c) => c.conversation_members.some((m) => m.user_id === otherId));
  if (found) return found.id;
  const { data: c, error } = await supabase.from("conversations").insert({ type: "birebir", created_by: meId }).select("id").single();
  if (error) throw error;
  const { error: e2 } = await supabase.from("conversation_members").insert([{ conversation_id: c.id, user_id: meId }, { conversation_id: c.id, user_id: otherId }]);
  if (e2) throw e2;
  return c.id;
}
export async function removeMember(eventId, conversationId, userId) {
  await supabase.from("participants").delete().eq("event_id", eventId).eq("user_id", userId);
  await supabase.from("conversation_members").delete().eq("conversation_id", conversationId).eq("user_id", userId);
}

/* ---------- yoklama ---------- */
export async function saveAttendance(eventId, marks) {
  for (const [key, v] of Object.entries(marks)) {
    if (String(key).startsWith("g:")) { await setGuestRecord(eventId, key.slice(2), { attendance: v }); continue; }
    const { error } = await supabase.from("participants").update({ attendance: v }).eq("event_id", eventId).eq("user_id", key);
    if (error) throw error;
  }
  const { data, error } = await supabase.rpc("complete_event", { p_event: eventId });
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
export async function disputeAttendance(meId, eventId, organizerId) {
  const { error } = await supabase.from("reports").insert({ reporter_id: meId, reported_user_id: organizerId, event_id: eventId, reason: "yoklama_itiraz", description: "Gelmedi işaretine itiraz" });
  if (error) throw error;
}

/* ---------- bildirimler & aramalar ---------- */
export async function listNotifications() {
  const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return data.map((n) => ({ id: String(n.id), dbId: n.id, type: n.type, title: n.title, body: n.body || "", time: fmtTime(n.created_at), read: !!n.is_read, data: n.data || {} }));
}
export const markNotifRead = (dbId) => supabase.from("notifications").update({ is_read: true }).eq("id", dbId);
export const savePushToken = (uid, token) => supabase.from("users").update({ push_token: token }).eq("id", uid);
export const markAllNotifsRead = () => supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
export async function logCall(meId, calleeId) {
  const { data, error } = await supabase.from("calls").insert({ caller_id: meId, callee_id: calleeId }).select("id, status").single();
  if (error) throw error;
  return data;
}
export const answerCall = (callId) =>
  supabase.from("calls").update({ status: "cevaplandi", answered_at: new Date().toISOString() }).eq("id", callId);
export const endCall = (callId, answered) =>
  supabase.from("calls").update({ status: answered ? "cevaplandi" : "cevapsiz", answered_at: answered ? new Date().toISOString() : null, ended_at: new Date().toISOString() }).eq("id", callId);

/* ---------- gerçek zamanlı ---------- */
export function subscribe({ onMessage, onChange, onChangeCalls = null }) {
  const ch = supabase.channel("eksik-var")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => onMessage(p.new))
    .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => onChange("applications"))
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => onChange("events"))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_members" }, () => onChange("chats"))
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => onChange("notifications"))
    .on("postgres_changes", { event: "*", schema: "public", table: "poll_votes" }, () => onChange("chats"))
    .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () => onChange("chats"))
    .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => onChange("posts"))
    .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, () => onChange("posts"))
    .on("postgres_changes", { event: "*", schema: "public", table: "offers" }, () => onChange("offers"))
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "polls" }, () => onChange("chats"))
    .on("postgres_changes", { event: "*", schema: "public", table: "waitlist" }, () => onChange("events"))
    .on("postgres_changes", { event: "*", schema: "public", table: "calls" }, (p) => { if (onChangeCalls) onChangeCalls(p); })
    .subscribe();
  return () => supabase.removeChannel(ch);
}

/* ---------- Bağlantı 2: engelleme, şikayet, puanlama, etkinlik yönetimi ---------- */
export async function listBlocked(meId) {
  const { data, error } = await supabase.from("blocks").select("blocked_id, users:blocked_id(" + USER_COLS + ")").eq("blocker_id", meId);
  if (error) throw error;
  return data.map((b) => mapUser(b.users)).filter(Boolean);
}
export async function blockUser(meId, otherId) {
  const { error } = await supabase.from("blocks").insert({ blocker_id: meId, blocked_id: otherId });
  if (error && !String(error.message).includes("duplicate")) throw error;
}
export async function unblockUser(meId, otherId) {
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", meId).eq("blocked_id", otherId);
  if (error) throw error;
}
export async function reportUser(meId, otherId, reason, description = null, eventId = null) {
  const { error } = await supabase.from("reports").insert({ reporter_id: meId, reported_user_id: otherId, reason, description, event_id: eventId });
  if (error) throw error;
}
export async function rateTeammates(meId, eventId, ratings) {
  const rows = Object.entries(ratings).filter(([, r]) => r.stars > 0)
    .map(([ratedId, r]) => ({ event_id: eventId, rater_id: meId, rated_id: ratedId, score: r.stars, comment: (r.comment || "").trim() || null }));
  if (!rows.length) return 0;
  const { error } = await supabase.from("ratings").insert(rows);
  if (error) throw error;
  return rows.length;
}
export async function listRatedEventIds(meId) {
  const { data, error } = await supabase.from("ratings").select("event_id").eq("rater_id", meId);
  if (error) throw error;
  return [...new Set(data.map((r) => r.event_id))];
}
export async function updateEvent(eventId, f) {
  const cityId = PLAKA[f.city];
  const { data: d } = await supabase.from("districts").select("id").eq("city_id", cityId).eq("name", f.district).maybeSingle();
  const { error } = await supabase.from("events").update({
    category_id: Number(f.cat), city_id: cityId, district_id: d ? d.id : null, title: f.title.trim(), description: f.desc || null,
    venue_name: f.venue.trim(), event_date: new Date(`${f.dateISO}T${f.time}:00`).toISOString(),
    total_capacity: Number(f.capacity), needed_count: Number(f.needed), price_per_person: Number(f.price) || 0,
    skill_level: LEVEL_TO_DB[f.level] || "farketmez", needed_positions: f.needs || {},
    team_name: f.teamName || null, format: f.format || null, venue_mode: f.venueMode || null, cost_mode: f.costMode || null,
    offline_regulars: Number(f.offlineRegulars) || 0,
  }).eq("id", eventId);
  if (error) throw error;
  await supabase.rpc("event_updated_notice", { p_event: eventId });
}
export async function cancelEvent(eventId, reason = null) {
  const { data, error } = await supabase.rpc("cancel_event", { p_event: eventId, p_reason: reason });
  if (error) throw error;
  return !!data; // geç iptal mi
}
export async function leaveEvent(eventId) {
  const { data, error } = await supabase.rpc("leave_event", { p_event: eventId });
  if (error) throw error;
  return !!data; // geç ayrılma mı
}

/* ---------- başkasının profili + aldığı yorumlar ---------- */
export async function getPublicProfile(userId) {
  const { data: u, error } = await supabase.from("users").select(USER_COLS).eq("id", userId).maybeSingle();
  if (error) throw error;
  const { data: rs } = await supabase.from("ratings")
    .select("score, comment, created_at, rater:users!ratings_rater_id_fkey(full_name, avatar_url), event:events(title)")
    .eq("rated_id", userId).order("created_at", { ascending: false }).limit(30);
  return {
    user: mapUser(u),
    comments: (rs || []).map((r) => ({ from: r.rater ? r.rater.full_name : "Kullanıcı", avatar: r.rater ? r.rater.avatar_url : null,
      stars: r.score, text: r.comment, event: r.event ? r.event.title : "", time: fmtTime(r.created_at) })),
  };
}

/* ---------- arama ---------- */
const esc = (t) => String(t).replace(/[%_,]/g, "");
export async function searchUsers(term) {
  const t = esc(term);
  const { data, error } = await supabase.from("users").select(USER_COLS)
    .or(`full_name.ilike.%${t}%,username.ilike.%${t}%`).order("rating_count", { ascending: false }).limit(25);
  if (error) throw error;
  return data.map(mapUser).filter(Boolean);
}
export async function searchEvents(meId, term) {
  const t = esc(term);
  const { data, error } = await supabase.from("events").select(EVENT_COLS)
    .or(`title.ilike.%${t}%,venue_name.ilike.%${t}%`).in("status", ["acik", "doldu"]).gte("event_date", new Date().toISOString())
    .order("event_date").limit(25);
  if (error) throw error;
  const ctx = { meId, joinedIds: new Set(), attendance: {} };
  return data.map((e) => mapEvent(e, ctx));
}

export async function updatePositions(uid, positions) {
  const { error } = await supabase.from("users").update({ positions }).eq("id", uid);
  if (error) throw error;
}

export async function inviteUser(eventId, userId, position = null) {
  const { data, error } = await supabase.rpc("invite_user", { p_event: eventId, p_user: userId, p_position: position });
  if (error) throw error;
  return data;
}

/* ---------- yedek listesi ---------- */
export async function joinWaitlist(meId, eventId, position = null) {
  const { error } = await supabase.from("waitlist").insert({ event_id: eventId, user_id: meId, position });
  if (error) throw error;
}
export async function leaveWaitlist(meId, eventId) {
  const { error } = await supabase.from("waitlist").delete().eq("event_id", eventId).eq("user_id", meId);
  if (error) throw error;
}

/* ---------- anket ---------- */
export async function createPoll(conversationId, question, options, multiple) {
  const opts = options.map((t, i) => ({ id: "abcdef"[i], text: t }));
  const { data, error } = await supabase.rpc("create_poll", { p_conversation: conversationId, p_question: question, p_options: opts, p_multiple: !!multiple });
  if (error) throw error;
  return data;
}
export async function vote(meId, pollId, optionId, selected) {
  const q = selected
    ? supabase.from("poll_votes").upsert({ poll_id: pollId, user_id: meId, option_id: optionId }, { onConflict: "poll_id,user_id" })
    : supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("user_id", meId).eq("option_id", optionId);
  const { error } = await q;
  if (error) throw error;
}
export async function closePoll(pollId) {
  const { error } = await supabase.from("polls").update({ closed_at: new Date().toISOString() }).eq("id", pollId);
  if (error) throw error;
}

/* ---------- var mısın ---------- */
export async function askAvailability(eventId) {
  const { data, error } = await supabase.rpc("ask_availability", { p_event: eventId });
  if (error) throw error;
  return data;
}
export async function applySuggestedNeeded(eventId) {
  const { data, error } = await supabase.rpc("apply_suggested_needed", { p_event: eventId });
  if (error) throw error;
  return data;
}

/* ---------- skor + MVP ---------- */
export async function recordScore(eventId, home, away) {
  const { error } = await supabase.rpc("record_score", { p_event: eventId, p_home: home, p_away: away, p_label: null });
  if (error) throw error;
}
export async function voteMvp(meId, eventId, votedId) {
  const { error } = await supabase.from("mvp_votes").insert({ event_id: eventId, voter_id: meId, voted_id: votedId });
  if (error) throw error;
}
export async function myMvpVotes(meId) {
  const { data, error } = await supabase.from("mvp_votes").select("event_id, voted_id").eq("voter_id", meId);
  if (error) throw error;
  const out = {}; (data || []).forEach((r) => { out[r.event_id] = r.voted_id; }); return out;
}

/* ---------- ödeme takibi ---------- */
export async function claimPayment(eventId) { const { error } = await supabase.rpc("claim_payment", { p_event: eventId }); if (error) throw error; }
export async function confirmPayment(eventId, userId, status) {
  if (String(userId).startsWith("g:")) { await setGuestRecord(eventId, String(userId).slice(2), { payment_status: status }); return; }
  const { error } = await supabase.rpc("confirm_payment", { p_event: eventId, p_user: userId, p_status: status }); if (error) throw error;
}
export async function sendIban(eventId) { const { error } = await supabase.rpc("send_iban", { p_event: eventId }); if (error) throw error; }
export async function remindPayments(eventId) { const { data, error } = await supabase.rpc("remind_payments", { p_event: eventId }); if (error) throw error; return data || 0; }
export async function getPaymentDetails(uid) {
  const { data } = await supabase.from("payment_details").select("iban, holder_name").eq("user_id", uid).maybeSingle();
  return data ? { iban: data.iban, holder: data.holder_name || "" } : null;
}
export async function savePaymentDetails(uid, d) {
  const { error } = await supabase.from("payment_details").upsert({ user_id: uid, iban: d.iban, holder_name: d.holder || null, updated_at: new Date().toISOString() });
  if (error) throw error;
}
export async function paymentStats(userId) {
  const { data, error } = await supabase.rpc("payment_stats", { p_user: userId });
  if (error) return null;
  return data ? { paid: Number(data.paid || 0), late: Number(data.late || 0), overdue: Number(data.overdue || 0), pct: data.pct == null ? null : Number(data.pct) } : null;
}

/* ---------- profil bilgisi ---------- */
export async function updateIdentity(uid, { favCats = [], positions = [], levels = {} }) {
  const { error } = await supabase.from("users")
    .update({ fav_cats: favCats, positions, cat_levels: levels }).eq("id", uid);
  if (error) throw error;
}
export async function updateProfileInfo(uid, f) {
  const cityId = PLAKA[f.city] || null;
  let districtId = null;
  if (f.district && cityId) { const { data: d } = await supabase.from("districts").select("id").eq("city_id", cityId).eq("name", f.district).maybeSingle(); districtId = d ? d.id : null; }
  const { error } = await supabase.from("users").update({ full_name: f.name, username: f.username, city_id: cityId, district_id: districtId, bio: f.bio || null, skill_level: LEVEL_TO_DB[f.level] || "farketmez" }).eq("id", uid);
  if (error) throw error;
}

/* ---------- misafir (uygulamasız) oyuncular ---------- */
export async function addGuest(meId, ev, name, position = null) {
  const row = ev.seriesId ? { owner_id: meId, series_id: ev.seriesId, name, position } : { owner_id: meId, event_id: ev.id, name, position };
  const { error } = await supabase.from("guests").insert(row);
  if (error) throw error;
}
export async function removeGuest(guestId) { const { error } = await supabase.from("guests").delete().eq("id", guestId); if (error) throw error; }
export async function setGuestRecord(eventId, guestId, patch) {
  const { error } = await supabase.from("guest_records").update(patch).eq("event_id", eventId).eq("guest_id", guestId);
  if (error) throw error;
}

/* ---------- sohbet: sabitleme, fotoğraf, eski mesajlar, sessize alma; sahadayım; itirazlar ---------- */
export async function pinMessage(conversationId, messageDbId) { const { error } = await supabase.rpc("pin_message", { p_conversation: conversationId, p_message: messageDbId }); if (error) throw error; }
export async function sendImage(meId, conversationId, uri) {
  const path = `${meId}/${Date.now()}.jpg`;
  const blob = await (await fetch(uri)).blob();
  const { error: e1 } = await supabase.storage.from("chat").upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
  if (e1) throw e1;
  const url = supabase.storage.from("chat").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: meId, type: "resim", image_url: url });
  if (error) throw error;
}
export async function sendVoiceMessage(meId, conversationId, uri, sec) {
  const blob = await (await fetch(uri)).blob();
  const path = `${meId}/ses-${conversationId}-${Date.now()}.m4a`;
  const { error: e1 } = await supabase.storage.from("chat").upload(path, blob, { contentType: "audio/m4a", upsert: true });
  if (e1) throw e1;
  const url = supabase.storage.from("chat").getPublicUrl(path).data.publicUrl;
  return sendMessage(meId, conversationId, `\u{1F399}VOICE|${url}|${Math.max(1, Math.round(sec))}`);
}
export async function olderMessages(conversationId, beforeDbId) {
  const { data, error } = await supabase.from("messages").select("id, sender_id, type, content, image_url, created_at, poll_id, reply_to_id, users!messages_sender_id_fkey(full_name), message_reactions(user_id, emoji)")
    .eq("conversation_id", conversationId).lt("id", beforeDbId).order("id", { ascending: false }).limit(50);
  if (error) throw error;
  return (data || []).reverse();
}
export async function setMuted(meId, conversationId, muted) { const { error } = await supabase.from("conversation_members").update({ is_muted: muted }).eq("conversation_id", conversationId).eq("user_id", meId); if (error) throw error; }
export async function checkIn(eventId) { const { error } = await supabase.rpc("check_in", { p_event: eventId }); if (error) throw error; }
export async function eventDisputes(eventId) { const { data, error } = await supabase.rpc("event_disputes", { p_event: eventId }); if (error) return []; return (data || []).map((d) => ({ userId: d.user_id, name: d.full_name, description: d.description })); }
export async function fixAttendance(eventId, userId) { const { error } = await supabase.from("participants").update({ attendance: "katildi" }).eq("event_id", eventId).eq("user_id", userId); if (error) throw error; }

/* ---------- gol/asist, sezon, yoklama kodu, kayıtlı sahalar ---------- */
export async function setMatchStat(eventId, meId, m, sv) {
  const isGuest = String(m.id).startsWith("g:");
  const userId = isGuest ? null : (m.id === "me" ? meId : m.id);
  const { error } = await supabase.rpc("set_match_stat", { p_event: eventId, p_user: userId, p_guest: isGuest ? String(m.id).slice(2) : null, p_goals: sv.goals, p_assists: sv.assists });
  if (error) throw error;
}
export async function seasonTable(meId, seriesId) {
  const { data, error } = await supabase.rpc("season_table", { p_series: seriesId });
  if (error) return [];
  return (data || []).map((r) => ({ id: r.player_id === meId ? "me" : r.player_id, name: r.name, guest: !!r.is_guest, matches: r.matches, goals: r.goals, assists: r.assists, mvps: r.mvps }));
}
export async function playerTotals(userId) {
  const { data, error } = await supabase.rpc("player_totals", { p_user: userId });
  if (error || !data) return null;
  return { goals: Number(data.goals || 0), assists: Number(data.assists || 0), matches: Number(data.matches || 0) };
}
export async function openCheckinCode(eventId) { const { data, error } = await supabase.rpc("open_checkin_code", { p_event: eventId }); if (error) throw error; return data; }
export async function checkInWithCode(eventId, code) { const { error } = await supabase.rpc("check_in_with_code", { p_event: eventId, p_code: code }); if (error) throw error; }
export async function listSavedVenues(uid) {
  const { data } = await supabase.from("saved_venues")
    .select("name, venue_id, lat, lng, category_id, used_count")
    .eq("user_id", uid).order("used_count", { ascending: false }).limit(8);
  return (data || []).map((v) => ({ ...v, lat: Number(v.lat), lng: Number(v.lng) }));
}
export async function toggleSavedVenue(uid, v, categoryId, kayitli) {
  if (kayitli) {
    const { error } = await supabase.from("saved_venues").delete().eq("user_id", uid).eq("name", v.name);
    if (error) throw error; return false;
  }
  const { error } = await supabase.from("saved_venues").upsert({
    user_id: uid, name: v.name, venue_id: v.venueId || v.id || null,
    lat: v.lat ?? null, lng: v.lng ?? null, category_id: categoryId || null,
  }, { onConflict: "user_id,name" });
  if (error) throw error; return true;
}
