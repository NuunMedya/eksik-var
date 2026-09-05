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

const USER_COLS = "id, full_name, username, avatar_url, rating_avg, rating_count, reliability_pct, events_joined, events_organized, no_show_count, city_id, district_id, positions, is_verified, status, status_reason, suspended_until, contact_mode, contact_scope, quiet_enabled, quiet_start, quiet_end, notif_basvuru, notif_mesaj, notif_hatirlatma, cities(name), districts(name)";

export function mapUser(u) {
  if (!u) return null;
  const rel = u.reliability_pct == null ? 100 : Math.round(Number(u.reliability_pct));
  return {
    id: u.id, name: u.full_name, username: u.username, avatar: u.avatar_url || null,
    rating: Number(u.rating_avg || 0), count: u.rating_count || 0, rel,
    joined: u.events_joined || 0, organized: u.events_organized || 0, noShow: u.no_show_count || 0,
    city: u.cities ? u.cities.name : null, district: u.districts ? u.districts.name : null,
    cityId: u.city_id, districtId: u.district_id,
    verified: !!u.is_verified, status: u.status || "aktif", statusReason: u.status_reason || null, suspendedUntil: u.suspended_until || null,
    positions: u.positions || [],
    contact: {
      mode: u.contact_mode || "ikisi", scope: u.contact_scope || "herkes",
      quiet: { enabled: !!u.quiet_enabled, start: (u.quiet_start || "22:00").slice(0, 5), end: (u.quiet_end || "08:00").slice(0, 5) },
    },
    notif: { basvuru: u.notif_basvuru !== false, mesaj: u.notif_mesaj !== false, hatirlatma: u.notif_hatirlatma !== false },
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
    waitlistCount: (ctx.waitCount && ctx.waitCount[e.id]) || 0, myWaitlist: !!(ctx.myWait && ctx.myWait[e.id]),
    myWaitPos: ctx.myWait ? ctx.myWait[e.id] || null : null, waitlist: (ctx.waitlists && ctx.waitlists[e.id]) || [],
    recurrenceUntil: e.recurrence_until, desc: e.description || "Detaylar için mesaj atabilirsin.",
    attendance: null, myAttendance: ctx.attendance ? ctx.attendance[e.id] || null : null,
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
  const msgs = raw.map((m) => ({
    id: String(m.id), dbId: m.id,
    from: m.type === "sistem" || !m.sender_id ? "sys" : m.sender_id === ctx.meId ? "me" : m.sender_id,
    name: m.users ? m.users.full_name : undefined, text: m.content, time: fmtTime(m.created_at),
  }));
  const other = c.type === "birebir" ? members.find((m) => m.id !== "me") : null;
  // başvuru sohbeti: organizatör onayladı, son onay bende → onay kartı
  const app = ctx.myApps.find((a) => a.conversationId === c.id);
  if (app && (app.status === "orgBekliyor" || app.status === "onaylandi")) {
    msgs.push({ id: "approval-" + app.id, from: "approval", appId: app.id, time: "" });
  }
  const unread = raw.filter((m) => m.id > lastRead && m.sender_id && m.sender_id !== ctx.meId).length;
  const last = raw[raw.length - 1];
  return {
    id: c.id, type: c.type, eventId: c.event_id, seriesId: c.series_id,
    title: c.type === "grup" ? c.name || "Grup" : other ? other.name : "Sohbet",
    sub: c.type === "grup" ? `${members.length} üye` : "",
    otherId: other ? other.id : null, other: other || null, appId: app ? app.id : null,
    members: c.type === "grup" ? members : undefined,
    unread, lastTime: last ? fmtTime(last.created_at) : fmtTime(c.created_at), msgs,
  };
}

/* ---------- kimlik: telefon + SMS kodu ---------- */
// Kayıt: profil bilgileri metadata olarak gider, profil trigger'ı kullanır. Giriş: kayıtlı olmayan numara hata döner.
export async function sendOtp({ mode, phone, name, username, city, district }) {
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
      data: register ? { full_name: name, username, city_id: cityId ? String(cityId) : "", district_id: districtId ? String(districtId) : "", phone } : undefined,
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
    notif_basvuru: n.basvuru, notif_mesaj: n.mesaj, notif_hatirlatma: n.hatirlatma,
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
  const form = new FormData();
  form.append("file", { uri, name: "avatar.jpg", type: "image/jpeg" });
  const { error } = await supabase.storage.from("avatars").upload(path, form, { contentType: "image/jpeg", upsert: true });
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
const EVENT_COLS = "*, organizer:users(id, full_name, username, avatar_url, rating_avg, rating_count, reliability_pct, contact_mode, contact_scope, quiet_enabled, quiet_start, quiet_end), district:districts(name), city:cities(name)";

export async function listEvents(meId, cityId) {
  const since = new Date(Date.now() - 3 * 86400000).toISOString();
  const [feed, mine, part] = await Promise.all([
    supabase.from("events").select(EVENT_COLS).eq("city_id", cityId).in("status", ["acik", "doldu"]).gte("event_date", since).order("event_date"),
    supabase.from("events").select(EVENT_COLS).eq("organizer_id", meId).gte("event_date", since).order("event_date"),
    supabase.from("participants").select("event_id, attendance, events(" + EVENT_COLS + ")").eq("user_id", meId),
  ]);
  for (const r of [feed, mine, part]) if (r.error) throw r.error;
  const joinedIds = new Set(part.data.map((p) => p.event_id));
  const attendance = {};
  part.data.forEach((p) => { attendance[p.event_id] = p.attendance === "bekleniyor" ? null : p.attendance; });
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
  const ctx = { meId, joinedIds, attendance, fill, waitCount, myWait, waitlists };
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
  }).select("id").single();
  if (error) throw error;
  return data.id;
}

/* ---------- başvurular ---------- */
const APP_COLS = "*, applicant:users(id, full_name, username, avatar_url, rating_avg, rating_count, reliability_pct)";
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
const CHAT_COLS = "id, type, event_id, series_id, name, created_at, conversation_members(user_id, role, last_read_message_id, users(" + USER_COLS + ")), messages(id, sender_id, type, content, created_at, users(full_name))";
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
  const ctx = { meId, myApps, participantsByEvent };
  return data.map((c) => mapChat(c, ctx)).sort((a, b) => {
    const la = a.msgs.length ? a.msgs[a.msgs.length - 1].dbId || 0 : 0, lb = b.msgs.length ? b.msgs[b.msgs.length - 1].dbId || 0 : 0;
    return lb - la;
  });
}
export async function sendMessage(meId, conversationId, text) {
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: meId, content: text });
  if (error) throw error;
}
export async function markChatRead(meId, conversationId, lastDbId) {
  if (!lastDbId) return;
  await supabase.from("conversation_members").update({ last_read_message_id: lastDbId }).eq("conversation_id", conversationId).eq("user_id", meId);
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
  for (const [userId, v] of Object.entries(marks)) {
    const { error } = await supabase.from("participants").update({ attendance: v }).eq("event_id", eventId).eq("user_id", userId);
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
export const endCall = (callId, answered) =>
  supabase.from("calls").update({ status: answered ? "cevaplandi" : "cevapsiz", answered_at: answered ? new Date().toISOString() : null, ended_at: new Date().toISOString() }).eq("id", callId);

/* ---------- gerçek zamanlı ---------- */
export function subscribe({ onMessage, onChange }) {
  const ch = supabase.channel("eksik-var")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (p) => onMessage(p.new))
    .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => onChange("applications"))
    .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => onChange("events"))
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_members" }, () => onChange("chats"))
    .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => onChange("notifications"))
    .on("postgres_changes", { event: "*", schema: "public", table: "waitlist" }, () => onChange("events"))
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
