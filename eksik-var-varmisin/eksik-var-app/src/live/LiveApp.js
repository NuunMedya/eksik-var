import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Share, ActivityIndicator, Image,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { C } from "../theme";
import { contactRules, DEFAULT_SETTINGS, buildShareText, buildInviteText, REPORT_REASONS, memberFromOrg, openPositions } from "../data";
import { useDeepLink } from "../deeplink";
import { Toast, PickerSheet } from "../components";
import { Alert } from "react-native";
import * as api from "./api";
import { registerForPush, onNotificationTap } from "../push";
import AuthScreen from "../screens/AuthScreen";
import HomeScreen from "../screens/HomeScreen";
import EventDetailScreen from "../screens/EventDetailScreen";
import CreateScreen from "../screens/CreateScreen";
import ChatsScreen from "../screens/ChatsScreen";
import ChatRoomScreen from "../screens/ChatRoomScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SettingsScreen from "../screens/SettingsScreen";
import CallScreen from "../screens/CallScreen";
import GroupInfoScreen, { MemberSheet } from "../screens/GroupInfoScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import RateScreen from "../screens/RateScreen";
import BlockedScreen from "../screens/BlockedScreen";
import UserProfileScreen from "../screens/UserProfileScreen";
import LineupScreen from "../screens/LineupScreen";
import SearchScreen from "../screens/SearchScreen";
import { ApplySheet } from "../screens/sheets";

// Hata mesajlarını kullanıcı diline çevir
const friendly = (e) => {
  const m = (e && e.message) || String(e);
  if (m.includes("MESAJ_IZNI_YOK")) return "Karşı tarafın iletişim tercihleri bu mesaja izin vermiyor";
  if (m.includes("Kontenjan dolu")) return "Kontenjan doldu";
  if (m.includes("başvuruya kapalı")) return "Bu etkinlik başvuruya kapalı";
  if (m.includes("Invalid login")) return "Giriş bilgileri hatalı";
  if (m.includes("already registered")) return "Bu numara zaten kayıtlı — Giriş yap sekmesini kullan";
  if (m.includes("Signups not allowed") || m.includes("otp_disabled")) return "Bu numara kayıtlı değil — Kayıt ol sekmesini kullan";
  if (m.includes("Token has expired") || m.includes("invalid") && m.includes("otp")) return "Kod hatalı ya da süresi dolmuş";
  if (m.includes("banned")) return "Bu hesap kapatılmış. İtiraz için destek@eksikvar.app";
  if (m.includes("HESAP_YASAKLI")) return "Bu numara ile hesap açılamıyor. Bilgi için destek@eksikvar.app";
  if (m.includes("rate limit") || m.includes("Too many")) return "Çok fazla deneme — biraz bekleyip tekrar dene";
  if (m.includes("MEVKI_DOLU")) return "Bu mevki için yer kalmadı";
  if (m.includes("DAVET_VAR")) return "Bu kişi zaten başvurmuş ya da davetli";
  if (m.includes("ENGEL")) return "Bu kişiyle aranızda engel var";
  if (m.includes("ETKINLIK_KAPALI")) return "Etkinlik başvuruya kapalı";
  if (m.includes("KENDINI_DAVET")) return "Kendini davet edemezsin";
  if (m.includes("TAKIM_ADI")) return "Takım adı gerekli";
  if (m.includes("YER_VAR")) return "Bu mevkide yer var — doğrudan başvurabilirsin";
  if (m.includes("ZATEN_KADRODA")) return "Zaten kadrodasın";
  if (m.includes("BASVURU_VAR")) return "Zaten bekleyen bir başvurun var";
  if (m.includes("TEKLIF_SURESI_DOLDU")) return "Yedek teklifinin süresi doldu";
  if (m.includes("MEVKI_TOPLAMI_FAZLA")) return "Mevki sayıları eksik oyuncu sayısını aşamaz";
  if (m.includes("Password should be")) return "Şifre en az 6 karakter olmalı";
  if (m.includes("users_username_key")) return "Bu kullanıcı adı alınmış";
  if (m.includes("Network request failed")) return "İnternet bağlantısı yok";
  return m.length > 90 ? m.slice(0, 90) + "…" : m;
};

export default function LiveApp() {
  const [session, setSession] = useState(undefined); // undefined = yükleniyor, null = çıkış
  const [me, setMe] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [events, setEvents] = useState([]);
  const [apps, setApps] = useState([]);
  const [chats, setChats] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [tab, setTab] = useState("home");
  const [view, setView] = useState({ name: "root" });
  const [call, setCall] = useState(null);
  const [memberSheet, setMemberSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const [ratedEvents, setRatedEvents] = useState([]);
  const [reportTarget, setReportTarget] = useState(null);
  const [profile, setProfile] = useState(null); // { user, comments, loading }
  const [recentSearches, setRecentSearches] = useState([]);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [waitEvent, setWaitEvent] = useState(null);

  const viewRef = useRef(view);
  const timers = useRef([]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // Derin bağlantı: kullanıcı ve etkinlikler hazır olunca ilgili etkinliği aç
  const [pendingLink, setPendingLink] = useState(null);
  useDeepLink(setPendingLink);
  useEffect(() => {
    if (!pendingLink || !me) return;
    if (events.some((e) => e.id === pendingLink)) { setTab("home"); setView({ name: "event", id: pendingLink }); setPendingLink(null); }
    else if (events.length) { showToast("Bu etkinlik artık açık değil"); setPendingLink(null); }
  }, [pendingLink, me, events]); // eslint-disable-line
  const showToast = (msg) => { setToast(msg); timers.current.push(setTimeout(() => setToast(null), 3000)); };
  const fail = (e) => showToast(friendly(e));
  const meId = me ? me.id : null;
  const isViewingChat = (chatId) => viewRef.current.name === "chat" && viewRef.current.id === chatId;

  /* ---------- oturum ---------- */
  useEffect(() => {
    api.getSession().then(setSession).catch(() => setSession(null));
    const { data } = api.onAuthChange(setSession);
    return () => data.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (uid) => {
    const p = await api.getProfile(uid);
    if (!p) throw new Error("Profil bulunamadı — kayıt tamamlanmamış olabilir");
    setMe(p);
    setSettings({ contact: p.contact, notif: p.notif });
    return p;
  }, []);

  const refreshEvents = useCallback(async (p) => { const prof = p || me; if (prof) setEvents(await api.listEvents(prof.id, prof.cityId)); }, [me]);
  const refreshApps = useCallback(async (uid) => { const id = uid || meId; if (id) { const a = await api.listApplications(id); setApps(a); return a; } return []; }, [meId]);
  const refreshChats = useCallback(async (uid, appList) => {
    const id = uid || meId; if (!id) return;
    const myApps = (appList || apps).filter((a) => a.who === "me");
    setChats(await api.listChats(id, myApps));
  }, [meId, apps]);

  useEffect(() => {
    if (!session) { setMe(null); return; }
    (async () => {
      try {
        const p = await loadProfile(session.user.id);
        const a = await refreshApps(p.id);
        await Promise.all([refreshEvents(p), refreshChats(p.id, a), api.listNotifications().then(setNotifs),
          api.listBlocked(p.id).then(setBlocked).catch(() => {}), api.listRatedEventIds(p.id).then(setRatedEvents).catch(() => {})]);
      } catch (e) { fail(e); }
    })();
  }, [session]);

  /* ---------- gerçek zamanlı ---------- */
  useEffect(() => {
    if (!meId) return;
    const unsub = api.subscribe({
      onMessage: (row) => {
        setChats((cs) => {
          const idx = cs.findIndex((c) => c.id === row.conversation_id);
          if (idx < 0 || row.poll_id) { refreshChats(); return cs; }
          const c = cs[idx];
          if (c.msgs.some((m) => m.dbId === row.id)) return cs;
          const senderName = (c.members || []).concat(c.other ? [c.other] : []).find((m) => m.id === row.sender_id);
          const msg = {
            id: String(row.id), dbId: row.id,
            from: row.type === "sistem" || !row.sender_id ? "sys" : row.sender_id === meId ? "me" : row.sender_id,
            name: senderName ? senderName.name : undefined, text: row.content, time: api.fmtTime(row.created_at),
          };
          const bump = msg.from !== "me" && !isViewingChat(c.id);
          const updated = { ...c, msgs: [...c.msgs.filter((m) => m.from !== "approval"), msg, ...c.msgs.filter((m) => m.from === "approval")], lastTime: msg.time, unread: bump ? c.unread + 1 : c.unread };
          const next = cs.slice(); next.splice(idx, 1); return [updated, ...next];
        });
      },
      onChange: async (what) => {
        try {
          if (what === "applications") { const a = await refreshApps(); await Promise.all([refreshEvents(), refreshChats(undefined, a)]); }
          else if (what === "events") await refreshEvents();
          else if (what === "chats") { await refreshChats(); await refreshEvents(); }
          else if (what === "notifications") setNotifs(await api.listNotifications());
        } catch (e) { /* sessiz */ }
      },
    });
    return unsub;
  }, [meId]);

  /* ---------- push: belirteci kaydet, dokununca yönlendir ---------- */
  const [pushTap, setPushTap] = useState(null);
  useEffect(() => {
    if (!meId) return;
    registerForPush().then((token) => { if (token) api.savePushToken(meId, token); });
    return onNotificationTap((data) => setPushTap({ ...data, t: Date.now() }));
  }, [meId]);
  useEffect(() => {
    if (!pushTap || !meId) return;
    openNotif({ id: "push", type: pushTap.type, data: pushTap });
    setPushTap(null);
  }, [pushTap, meId, chats, events]); // eslint-disable-line

  /* ---------- kimlik ---------- */
  const handleSendCode = async (f) => {
    setAuthError(null); setAuthBusy(true);
    try { await api.sendOtp(f); return true; }
    catch (e) { setAuthError(friendly(e)); return false; }
    finally { setAuthBusy(false); }
  };
  const handleVerify = async (code, f) => {
    setAuthError(null); setAuthBusy(true);
    try {
      const s = await api.verifyOtp(f.phone, code);
      if (s && f.mode === "register" && f.avatar) { try { await api.uploadAvatar(s.user.id, f.avatar); } catch (e) { /* fotoğraf sonra */ } }
    } catch (e) { setAuthError(friendly(e)); }
    finally { setAuthBusy(false); }
  };
  const logout = async () => { await api.signOut(); setView({ name: "root" }); setTab("home"); };

  /* ---------- yardımcılar ---------- */
  const groupFor = (ev) => chats.find((c) => c.type === "grup" && (c.eventId === ev.id || (ev.seriesId && c.seriesId === ev.seriesId)));
  const rosterFor = (ev) => { const g = groupFor(ev); return g && g.members ? g.members.filter((m) => m.id !== "me" && m.role !== "organizator") : []; };
  const sharesSquad = (otherId) =>
    chats.some((c) => c.type === "grup" && c.members && c.members.some((m) => m.id === otherId)) ||
    events.some((e) => e.joined && e.org && e.org.id === otherId);
  const isBlocked = (id) => blocked.some((b) => b.id === id);
  const BLOCK_RULES = { canMessage: false, canCall: false, messageReason: "Bu kişiyi engelledin", callReason: "Bu kişiyi engelledin" };
  const rulesFor = (chat) => (!chat || chat.type !== "birebir") ? null : isBlocked(chat.otherId) ? BLOCK_RULES : contactRules(chat.other, sharesSquad(chat.otherId), !!chat.eventId);
  const rulesForMember = (member) => isBlocked(member.id) ? BLOCK_RULES : contactRules(member && member.contact ? member : null, sharesSquad(member.id), false);
  const myAppFor = (evId) => apps.find((a) => a.eventId === evId && a.who === "me");

  const openChat = (id) => {
    const c = chats.find((x) => x.id === id);
    setChats((cs) => cs.map((x) => (x.id === id ? { ...x, unread: 0 } : x)));
    setTab("chats"); setView({ name: "chat", id });
    if (c && c.msgs.length) { const last = [...c.msgs].reverse().find((m) => m.dbId); if (last) api.markChatRead(meId, id, last.dbId); }
  };

  /* ---------- akışlar ---------- */
  const applyToEvent = async (ev, note, position = null) => {
    try {
      const r = await api.applyToEvent(meId, ev.id, note, position);
      const a = await refreshApps(); await refreshChats(undefined, a);
      setView({ name: "root" });
      if (r.conversation_id) { setTab("chats"); setView({ name: "chat", id: r.conversation_id }); }
      showToast("Başvurun iletildi 👋");
    } catch (e) { fail(e); }
  };
  const confirmJoin = async (appId) => {
    try { await api.setApplication(appId, { applicant_approved: true }); const a = await refreshApps(); await Promise.all([refreshEvents(), refreshChats(undefined, a)]); showToast("Kadrodasın 🎉"); }
    catch (e) { fail(e); }
  };
  const approveApp = async (appId) => {
    try { await api.setApplication(appId, { organizer_approved: true }); await refreshApps(); showToast("Onayladın · karşı tarafın son onayı bekleniyor"); }
    catch (e) { fail(e); }
  };
  const rejectApp = async (appId) => { try { await api.setApplication(appId, { status: "reddedildi" }); await refreshApps(); } catch (e) { fail(e); } };
  const createEvent = async (f) => {
    try {
      const id = await api.createEvent(meId, f);
      await Promise.all([refreshEvents(), refreshChats()]);
      setTab("home"); setView({ name: "event", id });
      showToast(f.kind === "rakip" ? "Rakip ilanın yayında 🆚" : f.recurrence === "haftalik" ? "Haftalık seri yayında 🔁" : "Talebin yayında 🚀");
      if (f.kind === "rakip" && f.teamName) setMe((m) => ({ ...m, teamName: f.teamName }));
    } catch (e) { fail(e); }
  };
  const createPoll = async (chatId, q, options, multiple) => { try { await api.createPoll(chatId, q, options, multiple); await refreshChats(); showToast("Anket gönderildi 📊"); } catch (e) { fail(e); } };
  const vote = async (chatId, pollId, optionId, selected) => {
    // iyimser güncelleme, sonra sunucu
    setChats((cs) => cs.map((c) => c.id !== chatId ? c : { ...c, msgs: c.msgs.map((m) => {
      if (!m.poll || m.poll.id !== pollId) return m;
      const votes = { ...(m.poll.votes || {}) };
      Object.keys(votes).forEach((k) => { votes[k] = votes[k].filter((v) => v.id !== "me" || (m.poll.multiple && k !== optionId)); });
      if (selected) votes[optionId] = [...(votes[optionId] || []), { id: "me", name: me.name }];
      return { ...m, poll: { ...m.poll, votes } };
    }) }));
    try { await api.vote(meId, pollId, optionId, selected); } catch (e) { fail(e); await refreshChats(); }
  };
  const closePoll = async (chatId, pollId) => { try { await api.closePoll(pollId); await refreshChats(); showToast("Anket kapatıldı"); } catch (e) { fail(e); } };

  /* --- var mısın (sabit kadro) --- */
  const availabilityFor = (ev) => {
    if (!ev || !ev.seriesId) return null;
    const base = ev.availability || { asked: !!ev.availabilityAsked, pollId: null, varim: 0, yokum: 0, belirsiz: 0, cevapsiz: 0, suggested: ev.needed, myAnswer: null };
    const g = groupFor(ev); const msg = g && g.msgs.find((m) => m.poll && m.poll.kind === "varmisin" && m.poll.eventId === ev.id);
    const mine = msg ? Object.entries(msg.poll.votes || {}).find(([, vs]) => vs.some((v) => v.id === "me")) : null;
    return { ...base, chatId: g ? g.id : null, pollId: base.pollId || (msg ? msg.poll.id : null), myAnswer: mine ? mine[0] : null };
  };
  const askAvailability = async (eventId) => { try { await api.askAvailability(eventId); await Promise.all([refreshEvents(), refreshChats()]); showToast("Sabit kadroya soruldu 📊"); } catch (e) { fail(e); } };
  const answerAvailability = async (eventId, optionId) => {
    const ev = events.find((e) => e.id === eventId); const av = availabilityFor(ev);
    if (!av || !av.pollId) { showToast("Henüz sorulmadı"); return; }
    await vote(av.chatId, av.pollId, optionId, true);
    await refreshEvents();
  };
  const applySuggested = async (eventId) => { try { const n = await api.applySuggestedNeeded(eventId); await Promise.all([refreshEvents(), refreshChats()]); showToast(`Eksik ${n} olarak güncellendi · kadroya duyuruldu`); } catch (e) { fail(e); } };

  const sendMessage = async (chatId, text) => {
    try { await api.sendMessage(meId, chatId, text); } catch (e) { fail(e); }
  };
  const startCall = async (chat) => {
    const r = rulesFor(chat);
    if (r && !r.canCall) { showToast(r.callReason); return; }
    try {
      const row = await api.logCall(meId, chat.otherId);
      if (row.status === "engellendi") { showToast("Karşı taraf şu an aranamıyor"); return; }
      setCall({ chatId: chat.id, name: chat.title, avatar: chat.other ? chat.other.avatar : null, callId: row.id });
    } catch (e) { fail(e); }
  };
  const endCall = (seconds) => { if (call && call.callId) api.endCall(call.callId, seconds > 0); setCall(null); };
  const saveAttendance = async (eventId, marks) => {
    try {
      const r = await api.saveAttendance(eventId, marks);
      await Promise.all([refreshEvents(), refreshChats()]);
      showToast(r ? `Maç tamamlandı · ${r.katildi} katıldı, ${r.gelmedi} gelmedi${r.next_event_id ? " · gelecek hafta açıldı" : ""}` : "Maç tamamlandı");
      setView({ name: "event", id: eventId });
    } catch (e) { fail(e); }
  };
  const disputeAttendance = async (eventId) => {
    const ev = events.find((e) => e.id === eventId);
    try { await api.disputeAttendance(meId, eventId, ev && ev.org ? ev.org.id : null); setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, disputed: true } : e))); showToast("İtirazın iletildi"); }
    catch (e) { fail(e); }
  };
  const changeSettings = async (s) => { setSettings(s); try { await api.updateSettings(meId, s); } catch (e) { fail(e); } };
  const changeAvatar = async (uri) => {
    try { const url = await api.uploadAvatar(meId, uri); setMe((m) => ({ ...m, avatar: url })); showToast(url ? "Fotoğrafın güncellendi 📸" : "Fotoğraf kaldırıldı"); }
    catch (e) { fail(e); }
  };
  const changeCity = async (city) => {
    try { await api.changeCity(meId, city); const p = await loadProfile(meId); await refreshEvents(p); showToast(`${city} etkinlikleri gösteriliyor`); }
    catch (e) { fail(e); }
  };
  const deleteAccount = async () => { try { await api.deleteAccount(); showToast("Hesabın silindi"); } catch (e) { fail(e); } };
  const shareEvent = async (ev) => { try { const r = await Share.share({ message: buildShareText(ev, me) }); if (r.action === Share.sharedAction) showToast("Paylaşıldı 🚀"); } catch (e) { /* iptal */ } };
  const inviteFriends = async () => { try { await Share.share({ message: buildInviteText(me) }); } catch (e) { /* iptal */ } };

  const messageMember = async (member) => { try { const id = await api.openDirectChat(meId, member.id); await refreshChats(); setMemberSheet(null); openChat(id); } catch (e) { fail(e); } };
  const callMember = async (member) => {
    const r = rulesForMember(member); if (!r.canCall) { showToast(r.callReason); return; }
    try { const id = await api.openDirectChat(meId, member.id); await refreshChats(); setMemberSheet(null); const row = await api.logCall(meId, member.id); if (row.status === "engellendi") { showToast("Şu an aranamıyor"); return; } setCall({ chatId: id, name: member.name, avatar: member.avatar, callId: row.id }); }
    catch (e) { fail(e); }
  };
  const removeMember = async (chatId, member) => {
    const c = chats.find((x) => x.id === chatId);
    try { await api.removeMember(c ? c.eventId : null, chatId, member.id); await Promise.all([refreshChats(), refreshEvents()]); setMemberSheet(null); showToast(`${member.name.split(" ")[0]} kadrodan çıkarıldı`); }
    catch (e) { fail(e); }
  };
  /* --- Bağlantı 2: engelleme, şikayet, puanlama, yönetim --- */
  const toggleBlock = async (member) => {
    try {
      if (isBlocked(member.id)) { await api.unblockUser(meId, member.id); setBlocked((b) => b.filter((x) => x.id !== member.id)); showToast("Engel kaldırıldı"); }
      else { await api.blockUser(meId, member.id); setBlocked((b) => [...b, member]); setMemberSheet(null); showToast(`${member.name.split(" ")[0]} engellendi`); await refreshEvents(); }
    } catch (e) { fail(e); }
  };
  const submitReport = async (reasonLabel) => {
    const r = REPORT_REASONS.find((x) => x.label === reasonLabel); const target = reportTarget;
    setReportTarget(null); setMemberSheet(null);
    if (!target || !r) return;
    try { await api.reportUser(meId, target.id, r.id); showToast("Şikayetin iletildi · inceleniyor"); } catch (e) { fail(e); }
  };
  const pendingRatings = events.filter((e) => e.status === "tamamlandi" && (e.joined || e.mine) && !ratedEvents.includes(e.id));
  const peopleFor = (ev) => {
    const people = rosterFor(ev).slice();
    if (!ev.mine && ev.org) people.unshift(memberFromOrg(ev.org, "organizator", "ekip"));
    return people;
  };
  const submitRatings = async (eventId, ratings) => {
    try {
      const n = await api.rateTeammates(meId, eventId, ratings);
      setRatedEvents((r) => [...r, eventId]);
      await refreshChats();
      showToast(`${n} puan kaydedildi ⭐`); setView({ name: "event", id: eventId });
    } catch (e) { fail(e); }
  };
  const updateEvent = async (id, f) => {
    try { await api.updateEvent(id, f); await Promise.all([refreshEvents(), refreshChats()]); showToast("Değişiklikler kaydedildi · kadroya duyuruldu"); setView({ name: "event", id }); }
    catch (e) { fail(e); }
  };
  const cancelEvent = (id) => {
    const ev = events.find((e) => e.id === id); if (!ev) return;
    Alert.alert("Etkinliği iptal et", `${ev.title} iptal edilecek, kadrodakilere bildirim gidecek. Maça 24 saatten az kaldıysa geç iptal olarak güvenilirliğine işler.`,
      [{ text: "Vazgeç", style: "cancel" }, { text: "İptal et", style: "destructive", onPress: async () => {
        try { const late = await api.cancelEvent(id); await Promise.all([refreshEvents(), refreshChats()]); showToast(late ? "İptal edildi · geç iptal güvenilirliğine işlendi" : "Etkinlik iptal edildi, kadroya bildirildi"); setView({ name: "root" }); }
        catch (e) { fail(e); }
      } }]);
  };
  const leaveEvent = (id) => {
    Alert.alert("Kadrodan ayrıl", "Yerin yeniden açılır ve organizatöre haber gider. Maça 24 saatten az kaldıysa geç ayrılma sayılır ve güvenilirliğin düşer.",
      [{ text: "Vazgeç", style: "cancel" }, { text: "Ayrıl", style: "destructive", onPress: async () => {
        try { const late = await api.leaveEvent(id); await Promise.all([refreshEvents(), refreshChats(), refreshApps()]); showToast(late ? "Ayrıldın · geç ayrılma güvenilirliğine işlendi" : "Kadrodan ayrıldın"); setView({ name: "root" }); }
        catch (e) { fail(e); }
      } }]);
  };

  const openProfile = async (member) => {
    setMemberSheet(null);
    setProfile({ user: member, comments: [], loading: true }); setView({ name: "profile", id: member.id });
    try { const p = await api.getPublicProfile(member.id); setProfile({ user: { ...p.user, role: member.role }, comments: p.comments, loading: false }); }
    catch (e) { setProfile((x) => x ? { ...x, loading: false } : x); fail(e); }
  };

  const searchUsers = (term) => api.searchUsers(term);
  const searchEvents = (term) => api.searchEvents(meId, term);
  const openSearchedEvent = (e) => {
    setEvents((es) => (es.some((x) => x.id === e.id) ? es : [...es, e]));
    setTab("home"); setView({ name: "event", id: e.id });
  };
  const suggestions = (() => { const seen = new Set(); const out = [];
    chats.forEach((c) => (c.members || []).forEach((m) => { if (m.id !== "me" && !seen.has(m.id)) { seen.add(m.id); out.push(m); } }));
    return out.slice(0, 6); })();
  const addRecent = (u) => setRecentSearches((r) => [u, ...r.filter((x) => x.id !== u.id)].slice(0, 5));

  const joinWaitlist = async (ev, position) => {
    setWaitEvent(null);
    try { await api.joinWaitlist(meId, ev.id, position); await refreshEvents(); showToast("Yedek listesindesin · yer açılınca 2 saatlik onay teklifi gelecek"); }
    catch (e) { fail(e); }
  };
  const leaveWaitlist = async (id) => { try { await api.leaveWaitlist(meId, id); await refreshEvents(); showToast("Yedek listesinden ayrıldın"); } catch (e) { fail(e); } };
  const myOpenEvents = events.filter((e) => e.mine && e.status === "acik" && !e.ended);
  const inviteTo = async (member, ev) => {
    setInviteTarget(null);
    const slots = openPositions(ev);
    const slot = slots.find((sl) => (member.positions || []).includes(sl.id)) || slots.find((sl) => sl.id === "farketmez") || slots[0];
    try {
      await api.inviteUser(ev.id, member.id, slot && slot.id !== "farketmez" ? slot.id : null);
      const a = await refreshApps(); await refreshChats(undefined, a);
      showToast(`Davet gönderildi · ${member.name.split(" ")[0]} cevaplayınca haber vereceğiz`);
    } catch (e) { fail(e); }
  };
  const declineInvite = async (appId) => { try { await api.setApplication(appId, { status: "reddedildi" }); await refreshApps(); showToast("Davet reddedildi"); } catch (e) { fail(e); } };

  const openInfo = (chat) => {
    if (chat.type === "grup") { setView({ name: "groupInfo", id: chat.id }); return; }
    setMemberSheet({ member: chat.other || { id: chat.otherId, name: chat.title, username: "-", rating: 0, count: 0, rel: 100 }, chatId: null });
  };
  const openNotif = (n) => {
    setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.dbId) api.markNotifRead(n.dbId);
    const d = n.data || {};
    const evId = d.event_id || d.eventId, chId = d.conversation_id || d.chatId;
    if (n.type === "yoklama" && evId) { setTab("home"); setView({ name: "attendance", id: evId }); return; }
    if (n.type === "puanlama" && evId) { setTab("home"); setView({ name: "rate", id: evId }); return; }
    if (chId && chats.some((c) => c.id === chId)) { openChat(chId); return; }
    if (evId && events.some((e) => e.id === evId)) { setTab("home"); setView({ name: "event", id: evId }); return; }
    setView({ name: "root" });
  };
  const readAllNotifs = () => { setNotifs((ns) => ns.map((x) => ({ ...x, read: true }))); api.markAllNotifsRead(); };

  /* ---------- yerleşim ---------- */
  if (session === undefined)
    return (
      <View style={{ flex: 1, backgroundColor: C.turf, alignItems: "center", justifyContent: "center" }}>
        <StatusBar style="light" />
        <Image source={require("../../assets/logo-mark.png")} style={{ width: 120, height: 120, marginBottom: 20 }} resizeMode="contain" />
        <ActivityIndicator color="#fff" />
      </View>
    );

  if (!session)
    return (
      <View style={{ flex: 1, backgroundColor: C.turf }}>
        <StatusBar style="light" />
        <SafeAreaView style={{ flex: 1 }}>
          <AuthScreen onSendCode={handleSendCode} onVerify={handleVerify} busy={authBusy} error={authError} />
        </SafeAreaView>
      </View>
    );

  if (!me)
    return (
      <View style={{ flex: 1, backgroundColor: C.turf, alignItems: "center", justifyContent: "center", padding: 24 }}>
        <StatusBar style="light" />
        <ActivityIndicator color="#fff" />
        <Text style={{ color: C.mist, marginTop: 14, textAlign: "center" }}>Profil yükleniyor…</Text>
        <TouchableOpacity onPress={logout} style={{ marginTop: 24 }}><Text style={{ color: "#fff", fontWeight: "800" }}>Çıkış yap</Text></TouchableOpacity>
        <Toast text={toast} />
      </View>
    );

  const suspended = me.status === "askida" && (!me.suspendedUntil || new Date(me.suspendedUntil) > new Date());
  if (me.status === "banli" || suspended)
    return (
      <View style={{ flex: 1, backgroundColor: C.turf, alignItems: "center", justifyContent: "center", padding: 28 }}>
        <StatusBar style="light" />
        <Ionicons name="lock-closed" size={44} color={C.kit} />
        <Text style={{ color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 16, textAlign: "center" }}>
          {me.status === "banli" ? "Hesabın kapatıldı" : "Hesabın askıya alındı"}
        </Text>
        <Text style={{ color: C.mist, fontSize: 14, marginTop: 10, textAlign: "center", lineHeight: 20 }}>
          {me.statusReason ? `Sebep: ${me.statusReason}. ` : ""}
          {suspended && me.suspendedUntil ? `Askı ${new Date(me.suspendedUntil).toLocaleDateString("tr-TR")} tarihine kadar sürecek. ` : ""}
          İtiraz etmek için destek@eksikvar.app adresine yazabilirsin.
        </Text>
        <TouchableOpacity onPress={logout} style={{ marginTop: 26, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "800" }}>Çıkış yap</Text>
        </TouchableOpacity>
      </View>
    );

  const activeChat = view.name === "chat" ? chats.find((c) => c.id === view.id) : null;
  const infoChat = view.name === "groupInfo" ? chats.find((c) => c.id === view.id) : null;
  const activeEvent = view.name === "event" ? events.find((e) => e.id === view.id) : null;
  const applyEvent = view.name === "apply" ? events.find((e) => e.id === view.id) : null;
  const attendanceEvent = view.name === "attendance" ? events.find((e) => e.id === view.id) : null;
  const rateEvent = view.name === "rate" ? events.find((e) => e.id === view.id) : null;
  const lineupChat = view.name === "lineup" ? chats.find((c) => c.id === view.id) : null;
  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);
  const unreadNotifs = notifs.filter((n) => !n.read).length;
  const hideTabs = ["chat", "create", "settings", "groupInfo", "attendance", "notifications", "rate", "blocked", "profile", "lineup"].includes(view.name) || !!activeEvent || !!call;
  const user = { ...me, city: me.city || "Ankara" };

  return (
    <View style={{ flex: 1, backgroundColor: C.turf }}>
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} style={{ flex: 0, backgroundColor: C.turf }} />
      <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ flex: 1, backgroundColor: C.chalk }}>
          {tab === "home" && view.name !== "event" && (
            <HomeScreen user={user} events={events} onOpen={(id) => setView({ name: "event", id })}
              onAttendance={(id) => setView({ name: "attendance", id })} onChangeCity={changeCity}
              onNotifications={() => setView({ name: "notifications" })} unreadCount={unreadNotifs} blockedIds={blocked.map((b) => b.id)} />
          )}
          {tab === "search" && (
            <SearchScreen onSearchUsers={searchUsers} onSearchEvents={searchEvents} suggestions={suggestions}
              recent={recentSearches} onAddRecent={addRecent} onOpenUser={openProfile} onOpenEvent={openSearchedEvent} />
          )}
          {tab === "chats" && view.name !== "chat" && <ChatsScreen chats={chats} onOpen={openChat} />}
          {tab === "chats" && view.name === "chat" && activeChat && (
            <ChatRoomScreen chat={activeChat} apps={apps} rules={rulesFor(activeChat)} onCall={() => startCall(activeChat)}
              onInfo={() => openInfo(activeChat)}
              onLineup={() => setView({ name: "lineup", id: activeChat.id })}
              onCreatePoll={createPoll} onVote={vote} onClosePoll={closePoll} onBack={() => setView({ name: "root" })} onSend={sendMessage}
              onConfirmJoin={confirmJoin} onGoChat={openChat} />
          )}
          {tab === "profile" && view.name !== "settings" && (
            <ProfileScreen user={user} settings={settings} pendingRate={pendingRatings[0] || null} onRate={(id) => { setTab("home"); setView({ name: "rate", id }); }}
              events={events} onOpenEvent={(id) => { setTab("home"); setView({ name: "event", id }); }}
              onPositionsChange={async (list) => { setMe((m) => ({ ...m, positions: list })); try { await api.updatePositions(meId, list); } catch (e) { fail(e); } }}
              onSettings={() => setView({ name: "settings" })} onInvite={inviteFriends} onAvatar={changeAvatar} onLogout={logout} />
          )}

          {activeEvent && (
            <View style={StyleSheet.absoluteFill}>
              <EventDetailScreen ev={activeEvent} apps={apps} myApp={myAppFor(activeEvent.id)} roster={activeEvent.ended ? rosterFor(activeEvent) : []}
                onAttendance={(id) => setView({ name: "attendance", id })} onDispute={disputeAttendance} onShare={shareEvent}
                onEdit={(id) => setView({ name: "create", id })} onCancel={cancelEvent} onLeave={leaveEvent}
                onRate={(id) => setView({ name: "rate", id })} rated={ratedEvents.includes(activeEvent.id)}
                onOrganizer={(org) => openProfile(org)}
                onAcceptInvite={confirmJoin} onDeclineInvite={declineInvite}
                availability={availabilityFor(activeEvent)} onAskAvailability={askAvailability} onApplySuggested={applySuggested} onAnswer={answerAvailability}
                onJoinWaitlist={(id) => setWaitEvent(events.find((e) => e.id === id) || null)} onLeaveWaitlist={leaveWaitlist}
                onBack={() => setView({ name: "root" })} onApply={() => setView({ name: "apply", id: activeEvent.id })}
                onApprove={approveApp} onReject={rejectApp} onGoChat={(id) => { const g = groupFor(activeEvent); openChat(g ? g.id : id); }} />
            </View>
          )}
          {view.name === "create" && (
            <View style={StyleSheet.absoluteFill}>
              <CreateScreen user={user} initial={view.id ? events.find((e) => e.id === view.id) : null}
                onBack={() => setView(view.id ? { name: "event", id: view.id } : { name: "root" })}
                onCreate={(f) => (view.id ? updateEvent(view.id, f) : createEvent(f))} />
            </View>
          )}
          {view.name === "settings" && (
            <View style={StyleSheet.absoluteFill}>
              <SettingsScreen settings={settings} onChange={changeSettings} onBack={() => setView({ name: "root" })} onDeleteAccount={deleteAccount}
                blockedCount={blocked.length} onBlocked={() => setView({ name: "blocked" })} />
            </View>
          )}
          {rateEvent && (
            <View style={StyleSheet.absoluteFill}>
              <RateScreen event={rateEvent} people={peopleFor(rateEvent)} onBack={() => setView({ name: "event", id: rateEvent.id })} onSubmit={(r) => submitRatings(rateEvent.id, r)} />
            </View>
          )}
          {view.name === "profile" && profile && (
            <View style={StyleSheet.absoluteFill}>
              <UserProfileScreen user={profile.user} comments={profile.comments} loading={profile.loading}
                rules={rulesForMember(profile.user)} blocked={isBlocked(profile.user.id)}
                onBack={() => setView({ name: "root" })} onMessage={messageMember} onCall={callMember}
                onBlock={toggleBlock} onReport={(m) => setReportTarget(m)}
                onInvite={myOpenEvents.length ? (m) => setInviteTarget(m) : undefined} />
            </View>
          )}
          {view.name === "blocked" && (
            <View style={StyleSheet.absoluteFill}>
              <BlockedScreen blocked={blocked} onBack={() => setView({ name: "settings" })} onUnblock={toggleBlock} />
            </View>
          )}
          {lineupChat && (
            <View style={StyleSheet.absoluteFill}>
              <LineupScreen
                title={lineupChat.title}
                players={(lineupChat.members || []).map((m) => (m.id === "me" ? { ...me, id: "me", role: m.role, positions: (me.positions || []) } : m))}
                onBack={() => setView({ name: "groupInfo", id: lineupChat.id })}
                onSend={(text) => { sendMessage(lineupChat.id, text); showToast("Kura gruba gönderildi ⚽"); setView({ name: "chat", id: lineupChat.id }); }}
              />
            </View>
          )}
          {view.name === "notifications" && (
            <View style={StyleSheet.absoluteFill}>
              <NotificationsScreen notifications={notifs} onBack={() => setView({ name: "root" })} onOpen={openNotif} onReadAll={readAllNotifs} onSettings={() => setView({ name: "settings" })} />
            </View>
          )}
          {attendanceEvent && (
            <View style={StyleSheet.absoluteFill}>
              <AttendanceScreen event={attendanceEvent} roster={rosterFor(attendanceEvent)} onBack={() => setView({ name: "event", id: attendanceEvent.id })} onSave={(marks) => saveAttendance(attendanceEvent.id, marks)} />
            </View>
          )}
          {infoChat && (
            <View style={StyleSheet.absoluteFill}>
              <GroupInfoScreen chat={infoChat} event={infoChat.eventId ? events.find((e) => e.id === infoChat.eventId) : null} me={{ ...me, id: "me" }}
                onBack={() => setView({ name: "chat", id: infoChat.id })} onOpenEvent={(id) => { setTab("home"); setView({ name: "event", id }); }}
                onSelectMember={(member) => setMemberSheet({ member, chatId: infoChat.id })}
                onLineup={() => setView({ name: "lineup", id: infoChat.id })} />
            </View>
          )}
          {call && (<View style={StyleSheet.absoluteFill}><CallScreen call={call} onEnd={endCall} /></View>)}

          {memberSheet && (
            <MemberSheet member={memberSheet.member} rules={rulesForMember(memberSheet.member)}
              canRemove={!!memberSheet.chatId && memberSheet.member.id !== "me" && memberSheet.member.role !== "organizator" &&
                !!chats.find((c) => c.id === memberSheet.chatId && c.members && c.members.some((m) => m.id === "me" && m.role === "organizator"))}
              onClose={() => setMemberSheet(null)} onMessage={messageMember} onCall={callMember}
              onRemove={(member) => removeMember(memberSheet.chatId, member)}
              blocked={isBlocked(memberSheet.member.id)} onBlock={toggleBlock} onReport={(member) => setReportTarget(member)} onProfile={openProfile}
              onInvite={myOpenEvents.length ? (m) => { setMemberSheet(null); setInviteTarget(m); } : undefined} />
          )}
          <PickerSheet visible={!!inviteTarget} title={inviteTarget ? `${inviteTarget.name.split(" ")[0]}'i hangi kadroya davet edelim?` : "Davet"}
            items={myOpenEvents.map((e) => ({ label: `${e.title} · ${e.date}`, sub: `${e.needed - e.filled} eksik` }))} value={null}
            onSelect={(label) => { const ev = myOpenEvents.find((e) => `${e.title} · ${e.date}` === label); if (ev && inviteTarget) inviteTo(inviteTarget, ev); }}
            onClose={() => setInviteTarget(null)} placeholder="Etkinlik ara…" />
          <PickerSheet visible={!!reportTarget} title={reportTarget ? `${reportTarget.name.split(" ")[0]} için şikayet nedeni` : "Şikayet"}
            items={REPORT_REASONS.map((r) => r.label)} value={null} onSelect={submitReport} onClose={() => setReportTarget(null)} placeholder="Neden ara…" />

          <Toast text={toast} />

          {!hideTabs && (
            <View style={st.tabbar}>
              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("home"); setView({ name: "root" }); }}>
                <Ionicons name={tab === "home" ? "home" : "home-outline"} size={22} color={tab === "home" ? C.turf : C.gray} />
                <Text style={[st.tabLabel, { color: tab === "home" ? C.turf : C.gray }]}>Saha</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("search"); setView({ name: "root" }); }}>
                <Ionicons name={tab === "search" ? "search" : "search-outline"} size={22} color={tab === "search" ? C.turf : C.gray} />
                <Text style={[st.tabLabel, { color: tab === "search" ? C.turf : C.gray }]}>Ara</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.fab} onPress={() => setView({ name: "create" })}>
                <Ionicons name="add" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("chats"); setView({ name: "root" }); }}>
                <View>
                  <Ionicons name={tab === "chats" ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={22} color={tab === "chats" ? C.turf : C.gray} />
                  {totalUnread > 0 && (<View style={st.tabBadge}><Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>{totalUnread}</Text></View>)}
                </View>
                <Text style={[st.tabLabel, { color: tab === "chats" ? C.turf : C.gray }]}>Sohbet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("profile"); setView({ name: "root" }); }}>
                <Ionicons name={tab === "profile" ? "person" : "person-outline"} size={22} color={tab === "profile" ? C.turf : C.gray} />
                <Text style={[st.tabLabel, { color: tab === "profile" ? C.turf : C.gray }]}>Profil</Text>
              </TouchableOpacity>
            </View>
          )}

          <ApplySheet visible={!!waitEvent} ev={waitEvent} mode="yedek" myPositions={me.positions || []}
            onClose={() => setWaitEvent(null)} onSend={(note, position) => waitEvent && joinWaitlist(waitEvent, position)} />
          <ApplySheet visible={view.name === "apply"} ev={applyEvent}
            onClose={() => applyEvent && setView({ name: "event", id: applyEvent.id })}
            myPositions={me.positions || []}
            onSend={(note, position) => applyEvent && applyToEvent(applyEvent, note, position)} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  tabbar: {
    position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around",
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, paddingBottom: 10, paddingHorizontal: 8,
  },
  tabBtn: { alignItems: "center", gap: 2, paddingHorizontal: 8 },
  tabLabel: { fontSize: 10, fontWeight: "800" },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.kit, alignItems: "center", justifyContent: "center", marginTop: -30, elevation: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  tabBadge: { position: "absolute", top: -4, right: -8, backgroundColor: C.pitch, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
});
