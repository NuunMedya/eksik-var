import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, Share, BackHandler, ActivityIndicator, Image,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { C, onThemeChange } from "../theme";
import { contactRules, DEFAULT_SETTINGS, buildShareText, buildInviteText, buildTeamInvite, extractIban, guestPlayers, mapsUrl, buildMatchSummary, REPORT_REASONS, memberFromOrg, openPositions } from "../data";
import { useDeepLink } from "../deeplink";
import { copyText } from "../clipboard";
import { pickPhoto } from "../avatar";
import { addToCalendar } from "../calendar";
import { Linking, Platform } from "react-native";
import { t, onLangChange } from "../i18n";
import { saveTheme, saveLang } from "../prefs";
import { Toast, PickerSheet } from "../components";
import { Alert } from "react-native";
import * as api from "./api";
import { DEFAULT_SPONSORS } from "../sponsors";
import { cloneForRepeat } from "../data";
import PostComposer from "../screens/PostComposer";
import VenueSheet from "../screens/VenueSheet";
import HubScreen from "../screens/HubScreen";
import PenaltyScreen from "../screens/PenaltyScreen";
import KadroDeneScreen from "../screens/KadroDeneScreen";
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
import EditProfileScreen from "../screens/EditProfileScreen";
import OnboardingScreen from "../screens/OnboardingScreen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApplySheet } from "../screens/sheets";

// Hata mesajlarını kullanıcı diline çevir
// Sunucunun (supabase/setup.sql) döndürdüğü hata anahtarları → kullanıcı mesajı
const HATA_MESAJI = {
  cok_hizli:            "Biraz yavaş 🙂 Kısa bir ara verip tekrar dene",
  cok_hizli_ilan:       "Bugünlük ilan hakkın doldu (günde 5) — yarın devam",
  cok_fazla_acik_ilan:  "Aynı anda en fazla 10 açık ilanın olabilir — önce birini kapat",
  cok_hizli_basvuru:    "Bugünlük başvuru hakkın doldu — yarın tekrar dene",
  engellendi:           "Bu kişiyle aranızda engel var",
  kadro_dolu:           "Kontenjan doldu — yedek listesine girebilirsin",
  yetki_yok:            "Bu işlem için yetkin yok",
  kapali_hesap:         "Hesabın şu an işlem yapamıyor. Bilgi için destek@eksikvar.app",
  kapali_ilan:          "Bu etkinlik başvuruya kapalı",
  zaten_kadroda:        "Zaten kadrodasın",
  zaten_sikayet:        "Bu kişiyi bugün zaten şikayet ettin — ekip inceliyor",
  gecmis_tarih:         "Geçmiş bir tarihe ilan açılamaz",
  kendi_ilanin:         "Kendi ilanına başvuramazsın",
  bulunamadi:           "Kayıt bulunamadı — sayfayı yenileyip tekrar dene",
  gecersiz:             "Geçersiz değer",
  mac_tamamlanmadi:     "Maç henüz tamamlanmadı",
  mac_oynanmadi:        "Maç saati gelmeden tamamlanamaz",
  oylama_kapandi:       "MVP oylaması kapandı",
  yedek_kapali:         "Yedek listesi yalnızca kadro dolunca açılır",
  kod_hatali:           "Kod yanlış",
  kod_kapali:           "Organizatör henüz kodu açmadı",
  erken:                "Sahadayım işareti maç saatine yakın kullanılabilir",
  iban_yok:             "Önce Ayarlar > Ödeme bilgileri'ne IBAN'ını yaz",
  grup_yok:             "Bu maçın grup sohbeti bulunamadı",
};

const friendly = (e) => {
  const m = (e && e.message) || String(e);
  if (HATA_MESAJI[m.trim()]) return HATA_MESAJI[m.trim()];
  if (m.includes("row-level security")) return "Bu işlem için yetkin yok";
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
  if (m.includes("MAC_TAMAMLANMADI")) return "Maç henüz tamamlanmadı";
  if (m.includes("IBAN_YOK")) return "Önce Ayarlar > Ödeme bilgileri'ne IBAN'ını yaz";
  if (m.includes("ZAMAN_DISI")) return "Maçtan 2-3 saat önce ile 4 saat sonra arasında kullanılabilir";
  if (m.includes("KOD_YANLIS")) return "Kod yanlış";
  if (m.includes("KOD_YOK")) return "Organizatör henüz kodu açmadı";
  if (m.includes("YOKLAMA_GEC")) return "Yoklama 30 gün sonra değiştirilemez";
  if (m.includes("ODEME_YOK")) return "Bu maç için ödeme kaydı yok";
  if (m.includes("OYLAMA_KAPANDI")) return "MVP oylaması kapandı";
  if (m.includes("MACTA_DEGILSIN")) return "Bu maçta oynamadığın için oy veremezsin";
  if (m.includes("OYUNCU_MACTA_DEGIL")) return "Bu oyuncu maçta yoktu";
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
  const [sponsors, setSponsors] = useState(DEFAULT_SPONSORS);   // panel listesi varsayılanı ezer
  const [posts, setPosts] = useState([]);
  const [composer, setComposer] = useState(false);
  const [postBusy, setPostBusy] = useState(false);
  const refreshPosts = async () => { try { setPosts(await api.listPosts(meId, user.city)); } catch { /* sessiz */ } };
  const likePost = async (p) => {
    const liked = (p.likes || []).includes("me");
    setPosts((ps) => ps.map((x) => x.id !== p.id ? x : { ...x, likes: liked ? x.likes.filter((l) => l !== "me") : [...x.likes, "me"] }));
    try { await api.togglePostLike(meId, p.id, liked); } catch { refreshPosts(); }
  };
  const sharePost = async (f) => {
    if (postBusy) return;
    setPostBusy(true);
    try { await api.createPost(meId, user, f); setComposer(false); await refreshPosts(); showToast(t("Paylaşıldı! 🎉")); }
    catch (e) { fail(e); } finally { setPostBusy(false); }
  };
  const removePost = (p) => Alert.alert(t("Gönderiyi sil?"), "", [
    { text: t("Vazgeç"), style: "cancel" },
    { text: t("Sil"), style: "destructive", onPress: async () => { try { await api.deletePost(p.id); await refreshPosts(); showToast(t("Gönderi silindi")); } catch (e) { fail(e); } } },
  ]);
  const [market, setMarket] = useState([]);
  const [myListing, setMyListing] = useState(null);
  const refreshMarket = async () => {
    try { setMarket(await api.listMarket(meId, user.city)); setMyListing(await api.myListing(meId)); } catch { /* sessiz */ }
  };
  const saveListing = async (f) => { try { await api.upsertListing(meId, user, f); await refreshMarket(); showToast(t("Vitrindesin! Takımlar seni görebilir 🏪")); } catch (e) { fail(e); } };
  const dropListing = async () => { try { await api.closeListing(meId); await refreshMarket(); showToast(t("Vitrinden indin")); } catch (e) { fail(e); } };
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [tab, setTab] = useState("home");
  const [homeKind, setHomeKind] = useState("oyuncu");
  const [venueHub, setVenueHub] = useState(false);
  const hubGo = (k) => {
    if (k === "create") setView({ name: "create" });
    else if (k === "kadro") setView({ name: "kadroDene" });
    else if (k === "penalti") setView({ name: "penalti" });
    else if (k === "pazar") { setHomeKind("pazar"); setTab("home"); setView({ name: "root" }); }
    else if (k === "rakip") { setHomeKind("rakip"); setTab("home"); setView({ name: "root" }); }
    else if (k === "kesfet") { setTab("search"); setView({ name: "root" }); }
    else if (k === "vitrin") setView({ name: "editProfile" });
    else if (k === "sahalar") setVenueHub(true);
    else showToast(t("Çok yakında 🏗"));
  };

  const [view, setView] = useState({ name: "root" });
  const [call, setCall] = useState(null);
  const [memberSheet, setMemberSheet] = useState(null);
  const [toast, setToast] = useState(null);
  const [blocked, setBlocked] = useState([]);
  const [ratedEvents, setRatedEvents] = useState([]);
  const [mvpVotes, setMvpVotes] = useState({});
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [profileBusy, setProfileBusy] = useState(false);
  const [onboarded, setOnboarded] = useState(null); // null = okunuyor
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const cacheTimer = useRef(null);
  const saveCache = (ev, ch) => { if (cacheTimer.current) clearTimeout(cacheTimer.current); cacheTimer.current = setTimeout(() => AsyncStorage.setItem("ev_cache", JSON.stringify({ events: ev.slice(0, 60), chats: ch.slice(0, 30).map((c) => ({ ...c, msgs: c.msgs.slice(-30) })), ts: Date.now() })).catch(() => {}), 800); };
  useEffect(() => { if (me) saveCache(events, chats); }, [events, chats]);  
  useEffect(() => { AsyncStorage.getItem("ev_onboarded").then((v) => setOnboarded(!!v)).catch(() => setOnboarded(true)); }, []);
  const finishOnboarding = () => { setOnboarded(true); AsyncStorage.setItem("ev_onboarded", "1").catch(() => {}); };
  const [profileError, setProfileError] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const [profile, setProfile] = useState(null); // { user, comments, loading }
  const [recentSearches, setRecentSearches] = useState([]);
  const [inviteTarget, setInviteTarget] = useState(null);
  const [waitEvent, setWaitEvent] = useState(null);

  const viewRef = useRef(view);
  const timers = useRef([]);
  useEffect(() => { viewRef.current = view; }, [view]);
  const activeEventRef = useRef(null);
  const infoChatRef = useRef(null);
  const chatDebounce = useRef(null);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // Derin bağlantı: kullanıcı ve etkinlikler hazır olunca ilgili etkinliği aç
  const [pendingLink, setPendingLink] = useState(null);
  useDeepLink(setPendingLink);
  useEffect(() => {
    if (!pendingLink || !me) return;
    if (events.some((e) => e.id === pendingLink)) { setTab("home"); setView({ name: "event", id: pendingLink }); setPendingLink(null); }
    else if (events.length) { showToast(t("Bu etkinlik artık açık değil")); setPendingLink(null); }
  }, [pendingLink, me, events]);  
  // Android geri tuşu: açık kaplamayı kapat, sohbetten listeye dön, ana sayfadaysan sistem davranışı
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      const v = viewRef.current;
      if (call) { return true; }                                   // arama ekranı: geri tuşu yok
      if (memberSheet) { setMemberSheet(null); return true; }
      if (v.name === "root") { if (tab !== "home") { setTab("home"); return true; } return false; }
      if (v.name === "chat") { setView({ name: "root" }); return true; }
      if (v.name === "groupInfo" || v.name === "lineup") { setView({ name: "chat", id: v.id }); return true; }
      if (v.name === "attendance" || v.name === "rate" || v.name === "apply") { setView({ name: "event", id: v.id }); return true; }
      if (v.name === "blocked") { setView({ name: "settings" }); return true; }
      setView({ name: "root" }); return true;
    });
    return () => sub.remove();
  }, [tab, call, memberSheet]);

  // Tema / dil değişince tüm ağacı yeniden çiz
  const [, setUiVersion] = useState(0);
  useEffect(() => { const a = onThemeChange(() => setUiVersion((v) => v + 1)); const b = onLangChange(() => setUiVersion((v) => v + 1)); return () => { a(); b(); }; }, []);

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

  const refreshEvents = useCallback(async (p) => {
    const prof = p || me; if (!prof) return;
    try { setEvents(await api.listEvents(prof.id, prof.cityId)); setOffline(false); }
    catch (e) { if (String(e && e.message).includes("Network")) { setOffline(true); return; } throw e; }
  }, [me]);
  const refreshApps = useCallback(async (uid) => { const id = uid || meId; if (id) { const a = await api.listApplications(id); setApps(a); return a; } return []; }, [meId]);
  const refreshChats = useCallback(async (uid, appList) => {
    const id = uid || meId; if (!id) return;
    const myApps = (appList || apps).filter((a) => a.who === "me");
    setChats(await api.listChats(id, myApps));
  }, [meId, apps]);

  useEffect(() => {
    if (!session) { setMe(null); return; }
    (async () => {
      try { const raw = await AsyncStorage.getItem("ev_cache"); if (raw) { const c = JSON.parse(raw); if (c.events) setEvents(c.events); if (c.chats) setChats(c.chats); } } catch { /* sessiz */ }
      try {
        const p = await loadProfile(session.user.id);
        const a = await refreshApps(p.id);
        await Promise.all([refreshEvents(p), refreshChats(p.id, a), api.listNotifications().then(setNotifs),
          api.listBlocked(p.id).then(setBlocked).catch(() => {}), api.listRatedEventIds(p.id).then(setRatedEvents).catch(() => {}),
          api.myMvpVotes(p.id).then(setMvpVotes).catch(() => {}), api.getPaymentDetails(p.id).then(setPaymentDetails).catch(() => {}),
          api.paymentStats(p.id).then((ps) => ps && setMe((m) => (m ? { ...m, paymentStats: ps } : m))).catch(() => {}),
          api.playerTotals(p.id).then((t) => t && setMe((m) => (m ? { ...m, totals: t } : m))).catch(() => {}),
          api.listSavedVenues(p.id).then((v) => setMe((m) => (m ? { ...m, savedVenues: v } : m))).catch(() => {})]);
        setOffline(false);
      } catch (e) { if (String(e && e.message).includes("Network")) setOffline(true); else fail(e); }
      finally { setLoading(false); }
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
        if (what === "posts") { refreshPosts(); return; }
        if (what === "chats") { if (chatDebounce.current) clearTimeout(chatDebounce.current); chatDebounce.current = setTimeout(async () => { try { await refreshChats(); await refreshEvents(); } catch { /* sessiz */ } }, 400); return; }
        try {
          if (what === "applications") { const a = await refreshApps(); await Promise.all([refreshEvents(), refreshChats(undefined, a)]); }
          else if (what === "events") await refreshEvents();
          else if (what === "notifications") setNotifs(await api.listNotifications());
        } catch { /* sessiz */ }
      },
    });
    return unsub;
  }, [meId]);

  /* ---------- push: belirteci kaydet, dokununca yönlendir ---------- */
  const [pushTap, setPushTap] = useState(null);
  const pushAsked = useRef(false);
  const askPush = async () => {          // ilk kadroya giriş / ilk ilan sonrasında, gerekçesiyle
    if (pushAsked.current || !meId) return; pushAsked.current = true;
    const flag = await AsyncStorage.getItem("ev_push_asked").catch(() => null);
    if (flag) { const token = await registerForPush(); if (token) api.savePushToken(meId, token); return; }
    Alert.alert(t("Maçı kaçırma"), t("Başvurun onaylanınca, kadro dolunca ve maça 2 saat kala haber verelim mi?"), [
      { text: t("Şimdi değil"), style: "cancel", onPress: () => { pushAsked.current = false; } },
      { text: t("Evet, bildir"), onPress: async () => { AsyncStorage.setItem("ev_push_asked", "1").catch(() => {}); const token = await registerForPush(); if (token) api.savePushToken(meId, token); } },
    ]);
  };
  useEffect(() => {
    if (!meId) return;
    AsyncStorage.getItem("ev_push_asked").then((f) => { if (f) registerForPush().then((token) => { if (token) api.savePushToken(meId, token); }); }).catch(() => {});
    return onNotificationTap((data) => setPushTap({ ...data, t: Date.now() }));
  }, [meId]);
  useEffect(() => {
    if (!pushTap || !meId) return;
    openNotif({ id: "push", type: pushTap.type, data: pushTap });
    setPushTap(null);
  }, [pushTap, meId, chats, events]);  

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
      if (s && f.mode === "register" && f.avatar) { try { await api.uploadAvatar(s.user.id, f.avatar); } catch { /* sessiz */ } }
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
      showToast(t("Başvurun iletildi 👋"));
    } catch (e) { fail(e); }
  };
  const confirmJoin = async (appId) => {
    try { await api.setApplication(appId, { applicant_approved: true }); const a = await refreshApps(); await Promise.all([refreshEvents(), refreshChats(undefined, a)]); showToast(t("Kadrodasın 🎉")); setTimeout(askPush, 1200); }
    catch (e) { fail(e); }
  };
  const approveApp = async (appId) => {
    try { await api.setApplication(appId, { organizer_approved: true }); await refreshApps(); showToast(t("Onayladın · karşı tarafın son onayı bekleniyor")); }
    catch (e) { fail(e); }
  };
  const rejectApp = async (appId) => { try { await api.setApplication(appId, { status: "reddedildi" }); await refreshApps(); } catch (e) { fail(e); } };
  const creatingRef = useRef(false);          // çift dokunuş kilidi
  const createEvent = async (f) => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    try {
      const id = await api.createEvent(meId, f);
      await Promise.all([refreshEvents(), refreshChats()]);
      setTab("home"); setView({ name: "event", id });
      showToast(f.kind === "rakip" ? "Rakip ilanın yayında 🆚" : f.recurrence === "haftalik" ? "Haftalık seri yayında 🔁" : "Talebin yayında 🚀");
      setTimeout(askPush, 1500);
      if (f.preset === "ekip") { const ev = { id, title: f.title, date: `${f.dateISO} ${f.time}`, venue: f.venue, weekday: f.weekday, time: f.time }; setTimeout(() => Share.share({ message: buildTeamInvite(ev, me) }).catch(() => {}), 600); }
      if (f.kind === "rakip" && f.teamName) setMe((m) => ({ ...m, teamName: f.teamName }));
    } catch (e) { fail(e); }
    finally { creatingRef.current = false; }
  };
  const createPoll = async (chatId, q, options, multiple) => { try { await api.createPoll(chatId, q, options, multiple); await refreshChats(); showToast(t("Anket gönderildi 📊")); } catch (e) { fail(e); } };
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
  const closePoll = async (chatId, pollId) => { try { await api.closePoll(pollId); await refreshChats(); showToast(t("Anket kapatıldı")); } catch (e) { fail(e); } };

  /* --- var mısın (sabit kadro) --- */
  const availabilityFor = (ev) => {
    if (!ev || !ev.seriesId) return null;
    const base = ev.availability || { asked: !!ev.availabilityAsked, pollId: null, varim: 0, yokum: 0, belirsiz: 0, cevapsiz: 0, suggested: ev.needed, myAnswer: null };
    const g = groupFor(ev); const msg = g && g.msgs.find((m) => m.poll && m.poll.kind === "varmisin" && m.poll.eventId === ev.id);
    const mine = msg ? Object.entries(msg.poll.votes || {}).find(([, vs]) => vs.some((v) => v.id === "me")) : null;
    return { ...base, chatId: g ? g.id : null, pollId: base.pollId || (msg ? msg.poll.id : null), myAnswer: mine ? mine[0] : null };
  };
  const askAvailability = async (eventId) => { try { await api.askAvailability(eventId); await Promise.all([refreshEvents(), refreshChats()]); showToast(t("Sabit kadroya soruldu 📊")); } catch (e) { fail(e); } };
  const answerAvailability = async (eventId, optionId) => {
    const ev = events.find((e) => e.id === eventId); const av = availabilityFor(ev);
    if (!av || !av.pollId) { showToast(t("Henüz sorulmadı")); return; }
    await vote(av.chatId, av.pollId, optionId, true);
    await refreshEvents();
  };
  const applySuggested = async (eventId) => { try { const n = await api.applySuggestedNeeded(eventId); await Promise.all([refreshEvents(), refreshChats()]); showToast(t("Eksik {p0} olarak güncellendi · kadroya duyuruldu", { p0: n })); } catch (e) { fail(e); } };

  /* --- misafir oyuncular --- */
  const addGuest = async (eventId, name) => { const ev = events.find((e) => e.id === eventId); try { await api.addGuest(meId, ev, name); await refreshEvents(); showToast(t("{p0} eklendi", { p0: name })); } catch (e) { fail(e); } };
  const removeGuest = async (eventId, guestId) => { try { await api.removeGuest(guestId); await refreshEvents(); } catch (e) { fail(e); } };
  const toggleGuest = async (eventId, guestId, available) => { try { await api.setGuestRecord(eventId, guestId, { available }); await refreshEvents(); } catch (e) { fail(e); } };
  const rosterWithGuests = (ev) => [...rosterFor(ev).map((m) => ({ ...m, checkedIn: (ev.checkedIns || []).includes(m.id) })), ...guestPlayers(ev)];

  /* --- takvim & yol tarifi --- */
  const calendarFor = async (ev) => {
    try { await addToCalendar(ev); showToast(t("Takvime eklendi · maçtan 2 saat önce hatırlatır 📅")); }
    catch (e) { const m = String(e && e.message); showToast(m.includes("IZIN_YOK") ? "Takvim izni verilmedi" : "Takvime eklenemedi"); }
  };
  const directionsFor = (ev) => { const u = mapsUrl(ev); Linking.openURL(Platform.OS === "ios" ? u.ios : u.android).catch(() => showToast(t("Harita açılamadı"))); };

  /* --- sohbet: sabitleme, fotoğraf, eski mesajlar, sessize alma; sahadayım; itirazlar --- */
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [disputes, setDisputes] = useState({});
  const pinMessage = async (chatId, msg) => { try { await api.pinMessage(chatId, msg ? msg.dbId : null); await refreshChats(); showToast(msg ? "Mesaj sabitlendi 📌" : "Sabitleme kaldırıldı"); } catch (e) { fail(e); } };
  const sendImage = async (chatId) => { const uri = await pickPhoto(); if (!uri) return; try { await api.sendImage(meId, chatId, uri); } catch (e) { fail(e); } };
  const loadOlder = async (chatId) => {
    const c = chats.find((x) => x.id === chatId); const first = c && c.msgs.find((m) => m.dbId); if (!c || !first) return;
    setLoadingOlder(true);
    try {
      const rows = await api.olderMessages(chatId, first.dbId);
      const mapped = rows.map((m) => ({ id: String(m.id), dbId: m.id, from: m.type === "sistem" || !m.sender_id ? "sys" : m.sender_id === meId ? "me" : m.sender_id, name: m.users ? m.users.full_name : undefined, text: m.content, image: m.image_url || undefined, time: api.fmtTime(m.created_at) }));
      setChats((cs) => cs.map((x) => (x.id === chatId ? { ...x, msgs: [...mapped, ...x.msgs], hasMore: rows.length >= 50 } : x)));
    } catch (e) { fail(e); } finally { setLoadingOlder(false); }
  };
  const muteChat = async (chatId, muted) => { try { await api.setMuted(meId, chatId, muted); setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, muted } : c))); showToast(muted ? "Grup sessize alındı" : "Bildirimler açıldı"); } catch (e) { fail(e); } };
  const checkIn = async (eventId) => { try { await api.checkIn(eventId); await refreshEvents(); showToast(t("Sahadayım dedin ✓")); } catch (e) { fail(e); } };
  const fixAttendance = async (eventId, userId) => { try { await api.fixAttendance(eventId, userId); setDisputes((d) => ({ ...d, [eventId]: (d[eventId] || []).filter((x) => x.userId !== userId) })); showToast(t("Yoklama düzeltildi ✓")); } catch (e) { fail(e); } };
  const canPinIn = (chat) => !!chat && chat.type === "grup" && (chat.members || []).some((m) => m.id === "me" && m.role === "organizator");
  useEffect(() => { if (activeEventRef.current && activeEventRef.current.mine && activeEventRef.current.status === "tamamlandi") api.eventDisputes(activeEventRef.current.id).then((d) => setDisputes((x) => ({ ...x, [activeEventRef.current.id]: d }))); }, [view]);  

  const copyToClipboard = async (text, msg = "IBAN kopyalandı 💳") => { const ok = await copyText(text); showToast(ok ? msg : t("Kopyalanamadı")); };
  const copyIbanFor = (eventId) => {
    const ev = events.find((e) => e.id === eventId); const g = ev && groupFor ? groupFor(ev) : null;
    const gg = g || chats.find((c) => c.type === "grup" && c.eventId === eventId);
    const msg = gg && [...gg.msgs].reverse().find((m) => m.from === "sys" && extractIban(m.text));
    if (!msg) { showToast(t("Organizatör henüz IBAN göndermedi")); return; }
    copyToClipboard(extractIban(msg.text).raw);
  };

  const reactToMessage = async (chatId, msgId, emoji) => {
    const c = chats.find((x) => x.id === chatId);
    const m = c && c.msgs.find((x) => x.id === msgId);
    if (!m || !m.dbId) return;
    const current = (() => { for (const [e, l] of Object.entries(m.reactions || {})) if (l.some((v) => v.id === "me")) return e; return null; })();
    try { await api.toggleReactionApi(meId, m.dbId, emoji, current); await refreshChats(); } catch (e) { fail(e); }
  };

  const sendMessage = async (chatId, text, replyTo = null) => {
    try { await api.sendMessage(meId, chatId, text, replyTo && replyTo.dbId ? replyTo.dbId : null); } catch (e) { fail(e); }
  };
  const startCall = () => showToast(t("Sesli arama yakında geliyor — şimdilik mesajlaşabilirsin"));
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
    try { await api.disputeAttendance(meId, eventId, ev && ev.org ? ev.org.id : null); setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, disputed: true } : e))); showToast(t("İtirazın iletildi")); }
    catch (e) { fail(e); }
  };
  const changeSettings = async (s) => { setSettings(s); try { await api.updateSettings(meId, s); } catch (e) { fail(e); } };
  const changeAvatar = async (uri) => {
    try { const url = await api.uploadAvatar(meId, uri); setMe((m) => ({ ...m, avatar: url })); showToast(url ? "Fotoğrafın güncellendi 📸" : "Fotoğraf kaldırıldı"); }
    catch (e) { fail(e); }
  };
  const changeCity = async (city) => {
    try { await api.changeCity(meId, city); const p = await loadProfile(meId); await refreshEvents(p); showToast(t("{p0} etkinlikleri gösteriliyor", { p0: city })); }
    catch (e) { fail(e); }
  };
  const deleteAccount = async () => { try { await api.deleteAccount(); showToast(t("Hesabın silindi")); } catch (e) { fail(e); } };
  const shareEvent = async (ev) => { try { const r = await Share.share({ message: buildShareText(ev, me) }); if (r.action === Share.sharedAction) showToast(t("Paylaşıldı 🚀")); } catch { /* sessiz */ } };
  const inviteFriends = async () => { try { await Share.share({ message: buildInviteText(me) }); } catch { /* sessiz */ } };

  const messageMember = async (member) => { try { const id = await api.openDirectChat(meId, member.id); await refreshChats(); setMemberSheet(null); openChat(id); } catch (e) { fail(e); } };
  const callMember = () => showToast(t("Sesli arama yakında geliyor — şimdilik mesaj at"));
  const removeMember = async (chatId, member) => {
    const c = chats.find((x) => x.id === chatId);
    try { await api.removeMember(c ? c.eventId : null, chatId, member.id); await Promise.all([refreshChats(), refreshEvents()]); setMemberSheet(null); showToast(t("{p0} kadrodan çıkarıldı", { p0: member.name.split(" ")[0] })); }
    catch (e) { fail(e); }
  };
  /* --- Bağlantı 2: engelleme, şikayet, puanlama, yönetim --- */
  const toggleBlock = async (member) => {
    try {
      if (isBlocked(member.id)) { await api.unblockUser(meId, member.id); setBlocked((b) => b.filter((x) => x.id !== member.id)); showToast(t("Engel kaldırıldı")); }
      else { await api.blockUser(meId, member.id); setBlocked((b) => [...b, member]); setMemberSheet(null); showToast(t("{p0} engellendi", { p0: member.name.split(" ")[0] })); await refreshEvents(); }
    } catch (e) { fail(e); }
  };
  const submitReport = async (reasonLabel) => {
    const r = REPORT_REASONS.find((x) => x.label === reasonLabel); const target = reportTarget;
    setReportTarget(null); setMemberSheet(null);
    if (!target || !r) return;
    try { await api.reportUser(meId, target.id, r.id); showToast(t("Şikayetin iletildi · inceleniyor")); } catch (e) { fail(e); }
  };
  const pendingRatings = events.filter((e) => e.status === "tamamlandi" && (e.joined || e.mine) && !ratedEvents.includes(e.id));
  const peopleFor = (ev) => {
    const people = rosterFor(ev).slice();
    if (!ev.mine && ev.org) people.unshift(memberFromOrg(ev.org, "organizator", "ekip"));
    return people;
  };
  const claimPayment = async (eventId) => { try { await api.claimPayment(eventId); await refreshEvents(); showToast(t("Organizatöre bildirildi")); } catch (e) { fail(e); } };
  /* --- gol/asist, sezon, yoklama kodu --- */
  const [checkinCodes, setCheckinCodes] = useState({});
  const [seasons, setSeasons] = useState({});
  const setStat = async (eventId, m, sv) => {
    setEvents((es) => es.map((e) => (e.id !== eventId ? e : { ...e, stats: [...(e.stats || []).filter((x) => x.id !== m.id), { id: m.id, name: m.name, goals: sv.goals, assists: sv.assists }] })));
    try { await api.setMatchStat(eventId, meId, m, sv); } catch (e) { fail(e); await refreshEvents(); }
  };
  const shareSummary = (ev) => Share.share({ message: buildMatchSummary(ev, { stats: ev.stats || [], mine: ev.mine }) }).catch(() => {});
  const openCode = async (eventId) => { try { const code = await api.openCheckinCode(eventId); setCheckinCodes((c) => ({ ...c, [eventId]: code })); } catch (e) { fail(e); } };
  const checkInWithCode = async (eventId, code) => { try { await api.checkInWithCode(eventId, code); await refreshEvents(); showToast(t("Sahadayım kaydedildi ✓")); } catch (e) { fail(e); } };
  useEffect(() => {
    const c = infoChatRef.current;
    if (c && c.type === "grup" && (c.seriesId || c.eventId)) api.seasonTable(meId, c.seriesId || c.eventId).then((rows) => setSeasons((x) => ({ ...x, [c.id]: rows })));
  }, [view]);  

  const confirmAllPayments = (eventId) => {
    const ev = events.find((e) => e.id === eventId); const pend = ((ev && ev.payments) || []).filter((p) => p.status === "bekliyor" || p.status === "odedim");
    Alert.alert(t("Herkes ödedi"), `${pend.length} kişi 'ödendi' olarak işaretlenecek.`, [{ text: t("Vazgeç"), style: "cancel" }, { text: t("İşaretle"), onPress: async () => {
      try { for (const p of pend) await api.confirmPayment(eventId, p.id, "odendi"); await refreshEvents(); showToast(t("Tüm ödemeler işaretlendi ✓")); } catch (e) { fail(e); }
    } }]);
  };
  const confirmPayment = async (eventId, userId, status) => { try { await api.confirmPayment(eventId, userId, status); await refreshEvents(); } catch (e) { fail(e); } };
  const sendIban = async (eventId) => { if (!paymentDetails) { showToast(t("Önce Ayarlar > Ödeme bilgileri'ne IBAN'ını yaz")); setView({ name: "settings" }); return; } try { await api.sendIban(eventId); await refreshChats(); showToast(t("IBAN gruba gönderildi 💳")); } catch (e) { fail(e); } };
  const remindPayments = async (eventId) => { try { const n = await api.remindPayments(eventId); await refreshEvents(); showToast(n ? `${n} kişiye hatırlatma gönderildi` : "Bekleyen ödeme yok ya da 24 saat dolmadı"); } catch (e) { fail(e); } };
  const saveIban = async (d) => { try { await api.savePaymentDetails(meId, d); setPaymentDetails(d); showToast(t("Ödeme bilgilerin kaydedildi 💳")); } catch (e) { fail(e); } };
  const recordScore = async (eventId, home, away) => { try { await api.recordScore(eventId, home, away); await Promise.all([refreshEvents(), refreshChats()]); showToast(t("Skor kaydedildi · {p0} – {p1}", { p0: home, p1: away })); } catch (e) { fail(e); } };
  const submitRatings = async (eventId, ratings, mvpId = null) => {
    try {
      if (mvpId) { await api.voteMvp(meId, eventId, mvpId); setMvpVotes((v) => ({ ...v, [eventId]: mvpId })); }
      const n = await api.rateTeammates(meId, eventId, ratings);
      if (n > 0) setRatedEvents((r) => [...r, eventId]);
      await refreshEvents();
      await refreshChats();
      showToast(t("{p0} puan kaydedildi ⭐", { p0: n })); setView({ name: "event", id: eventId });
    } catch (e) { fail(e); }
  };
  const updateEvent = async (id, f) => {
    try { await api.updateEvent(id, f); await Promise.all([refreshEvents(), refreshChats()]); showToast(t("Değişiklikler kaydedildi · kadroya duyuruldu")); setView({ name: "event", id }); }
    catch (e) { fail(e); }
  };
  const cancelEvent = (id) => {
    const ev = events.find((e) => e.id === id); if (!ev) return;
    Alert.alert(t("Etkinliği iptal et"), `${ev.title} iptal edilecek, kadrodakilere bildirim gidecek. Maça 24 saatten az kaldıysa geç iptal olarak güvenilirliğine işler.`,
      [{ text: t("Vazgeç"), style: "cancel" }, { text: t("İptal et"), style: "destructive", onPress: async () => {
        try { const late = await api.cancelEvent(id); await Promise.all([refreshEvents(), refreshChats()]); showToast(late ? "İptal edildi · geç iptal güvenilirliğine işlendi" : "Etkinlik iptal edildi, kadroya bildirildi"); setView({ name: "root" }); }
        catch (e) { fail(e); }
      } }]);
  };
  const leaveEvent = (id) => {
    Alert.alert(t("Kadrodan ayrıl"), t("Yerin yeniden açılır ve organizatöre haber gider. Maça 24 saatten az kaldıysa geç ayrılma sayılır ve güvenilirliğin düşer."),
      [{ text: t("Vazgeç"), style: "cancel" }, { text: t("Ayrıl"), style: "destructive", onPress: async () => {
        try { const late = await api.leaveEvent(id); await Promise.all([refreshEvents(), refreshChats(), refreshApps()]); showToast(late ? "Ayrıldın · geç ayrılma güvenilirliğine işlendi" : "Kadrodan ayrıldın"); setView({ name: "root" }); }
        catch (e) { fail(e); }
      } }]);
  };

  const openProfile = async (member) => {
    setMemberSheet(null);
    setProfile({ user: member, comments: [], loading: true }); setView({ name: "profile", id: member.id });
    try { const p = await api.getPublicProfile(member.id); const [ps, tt] = await Promise.all([api.paymentStats(member.id), api.playerTotals(member.id)]); setProfile({ user: { ...p.user, role: member.role, paymentStats: ps, totals: tt }, comments: p.comments, loading: false }); }
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
    try { await api.joinWaitlist(meId, ev.id, position); await refreshEvents(); showToast(t("Yedek listesindesin · yer açılınca 2 saatlik onay teklifi gelecek")); }
    catch (e) { fail(e); }
  };
  const leaveWaitlist = async (id) => { try { await api.leaveWaitlist(meId, id); await refreshEvents(); showToast(t("Yedek listesinden ayrıldın")); } catch (e) { fail(e); } };
  const myOpenEvents = events.filter((e) => e.mine && e.status === "acik" && !e.ended);
  const inviteTo = async (member, ev) => {
    setInviteTarget(null);
    const slots = openPositions(ev);
    const slot = slots.find((sl) => (member.positions || []).includes(sl.id)) || slots.find((sl) => sl.id === "farketmez") || slots[0];
    try {
      await api.inviteUser(ev.id, member.id, slot && slot.id !== "farketmez" ? slot.id : null);
      const a = await refreshApps(); await refreshChats(undefined, a);
      showToast(t("Davet gönderildi · {p0} cevaplayınca haber vereceğiz", { p0: member.name.split(" ")[0] }));
    } catch (e) { fail(e); }
  };
  const declineInvite = async (appId) => { try { await api.setApplication(appId, { status: "reddedildi" }); await refreshApps(); showToast(t("Davet reddedildi")); } catch (e) { fail(e); } };

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

  useEffect(() => { if (meId && user) refreshMarket(); }, [meId, user && user.city]);
  useEffect(() => { if (meId && user) refreshPosts(); }, [meId, user && user.city]);
  useEffect(() => { if (meId) api.listSponsors().then((x) => { if (x.length) setSponsors(x); }).catch(() => { /* tablo yoksa varsayılan */ }); }, [meId]);

  /* ---------- yerleşim ---------- */
  if (session === undefined)
    return (
      <View style={{ flex: 1, backgroundColor: C.turf, alignItems: "center", justifyContent: "center" }}>
        <StatusBar style="light" />
        <Image source={require("../../assets/logo-mark.png")} style={{ width: 120, height: 120, marginBottom: 20 }} resizeMode="contain" />
        <ActivityIndicator color="#fff" />
      </View>
    );

  if (!session && onboarded === false) return <OnboardingScreen onDone={finishOnboarding} />;
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
        <Text style={{ color: C.mist, marginTop: 14, textAlign: "center" }}>{t("Profil yükleniyor…")}</Text>
        <TouchableOpacity onPress={logout} style={{ marginTop: 24 }}><Text style={{ color: "#fff", fontWeight: "800" }}>{t("Çıkış yap")}</Text></TouchableOpacity>
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
          <Text style={{ color: "#fff", fontWeight: "800" }}>{t("Çıkış yap")}</Text>
        </TouchableOpacity>
      </View>
    );

  const activeChat = view.name === "chat" ? chats.find((c) => c.id === view.id) : null;
  const infoChat = view.name === "groupInfo" ? chats.find((c) => c.id === view.id) : null;
  infoChatRef.current = infoChat;
  const activeEvent = view.name === "event" ? events.find((e) => e.id === view.id) : null;
  activeEventRef.current = activeEvent;
  const applyEvent = view.name === "apply" ? events.find((e) => e.id === view.id) : null;
  const attendanceEvent = view.name === "attendance" ? events.find((e) => e.id === view.id) : null;
  const rateEvent = view.name === "rate" ? events.find((e) => e.id === view.id) : null;
  const lineupChat = view.name === "lineup" ? chats.find((c) => c.id === view.id) : null;
  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);
  const unreadNotifs = notifs.filter((n) => !n.read).length;
  const hideTabs = ["chat", "create", "settings", "groupInfo", "attendance", "notifications", "rate", "blocked", "profile", "lineup", "editProfile", "penalti", "kadroDene"].includes(view.name);
  const ustEkran = ["hub", "penalti", "kadroDene"].includes(view.name) || !!activeEvent || !!call;
  const user = { ...me, city: me.city || "Ankara" };

  return (
    <View style={{ flex: 1, backgroundColor: C.turf }}>
      <StatusBar style="light" />
      <SafeAreaView edges={["top"]} style={{ flex: 0, backgroundColor: C.turf }} />
      <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: C.surface }}>
        <View style={{ flex: 1, backgroundColor: C.chalk }}>
          {tab === "home" && !ustEkran && view.name !== "event" && (
            <HomeScreen user={user} events={events} onOpen={(id) => setView({ name: "event", id })}
              onAttendance={(id) => setView({ name: "attendance", id })} onChangeCity={changeCity}
              onNotifications={() => setView({ name: "notifications" })} unreadCount={unreadNotifs} blockedIds={blocked.map((b) => b.id)}
              onCreate={() => setView({ name: "create" })} onBringTeam={() => setView({ name: "create", preset: "ekip" })} loading={loading} offline={offline}
              sponsors={sponsors}
              onSponsor={(sp) => { api.sponsorClick(sp.id).catch(() => {}); Linking.openURL(sp.url).catch(() => showToast(t("Bağlantı açılamadı"))); }}
              market={market} onOpenPlayer={(p) => p.userId !== "me" && openProfile({ id: p.userId, name: p.name })}
              onEditListing={() => setView({ name: "editProfile" })}
              key={homeKind} initialKind={homeKind}
              onOfferPlayer={async (p) => { try {
                const id = await api.openDirectChat(meId, p.userId);
                await api.sendMessage(meId, id, t("💌 Transfer teklifi: Merhaba {p0}! Vitrinini gördüm, takımımızda oynamanı çok isteriz. Uygun musun?", { p0: p.name.split(" ")[0] }));
                await refreshChats(); openChat(id);
              } catch (e) { fail(e); } }} />
          )}
          {tab === "search" && !ustEkran && (
            <SearchScreen onSearchUsers={searchUsers} onSearchEvents={searchEvents} suggestions={suggestions}
              recent={recentSearches} onAddRecent={addRecent} onOpenUser={openProfile} onOpenEvent={openSearchedEvent}
              posts={posts} onLikePost={likePost} onDeletePost={removePost} onCompose={() => setComposer(true)} />
          )}
          {tab === "chats" && !ustEkran && view.name !== "chat" && <ChatsScreen chats={chats} onOpen={openChat} />}
          {tab === "chats" && view.name === "chat" && activeChat && (
            <ChatRoomScreen chat={activeChat} apps={apps} rules={rulesFor(activeChat)} onCall={() => startCall(activeChat)}
              onInfo={() => openInfo(activeChat)}
              onLineup={() => setView({ name: "lineup", id: activeChat.id })}
              onCreatePoll={createPoll} onVote={vote} onClosePoll={closePoll} onCopy={copyToClipboard} onReact={reactToMessage}
              onPin={pinMessage} canPin={canPinIn(activeChat)} onSendImage={sendImage} onLoadOlder={loadOlder} loadingOlder={loadingOlder} onBack={() => setView({ name: "root" })} onSend={sendMessage}
              onConfirmJoin={confirmJoin} onGoChat={openChat} />
          )}
          {tab === "profile" && !ustEkran && view.name !== "settings" && (
            <ProfileScreen user={user} settings={settings} pendingRate={pendingRatings[0] || null} onRate={(id) => { setTab("home"); setView({ name: "rate", id }); }}
              events={events} onOpenEvent={(id) => { setTab("home"); setView({ name: "event", id }); }}
              onPositionsChange={async (list) => { setMe((m) => ({ ...m, positions: list })); try { await api.updatePositions(meId, list); } catch (e) { fail(e); } }}
              marketMine={myListing} onMarket={() => setView({ name: "editProfile" })}
              onEdit={() => setView({ name: "editProfile" })} onBringTeam={() => setView({ name: "create", preset: "ekip" })}
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
                onRecordScore={recordScore} myMvpVote={mvpVotes[activeEvent.id] || null}
                onClaimPayment={claimPayment} onConfirmPayment={confirmPayment} onSendIban={sendIban} onRemindPayments={remindPayments} onCopyIban={copyIbanFor}
                onCalendar={calendarFor} onDirections={directionsFor} onAddGuest={addGuest} onAddGuests={async (evId, list) => { const e = events.find((x) => x.id === evId); if (!e) return; try { for (const p of list) await api.addGuest(meId, e, p.name); await refreshEvents(); } catch (er) { fail(er); } }} onRepeat={(ev) => setView({ name: "create", repeat: true, initial: cloneForRepeat(ev) })} onRemoveGuest={removeGuest} onToggleGuest={toggleGuest}
                onCheckIn={checkIn} disputes={disputes[activeEvent.id] || []} onFixAttendance={fixAttendance} onConfirmAllPayments={confirmAllPayments}
                statRoster={rosterWithGuests(activeEvent)} onSetStat={setStat} onShareSummary={shareSummary}
                checkinCode={checkinCodes[activeEvent.id] || null} onOpenCode={openCode} onCheckInWithCode={checkInWithCode}
                onJoinWaitlist={(id) => setWaitEvent(events.find((e) => e.id === id) || null)} onLeaveWaitlist={leaveWaitlist}
                onBack={() => setView({ name: "root" })} onApply={() => setView({ name: "apply", id: activeEvent.id })}
                onApprove={approveApp} onReject={rejectApp} onGoChat={(id) => { const g = groupFor(activeEvent); openChat(g ? g.id : id); }} />
            </View>
          )}
          {view.name === "create" && (
            <View style={StyleSheet.absoluteFill}>
              <CreateScreen user={user} preset={view.preset || null} initial={view.id ? events.find((e) => e.id === view.id) : (view.initial || null)} repeat={!!view.repeat}
                onBack={() => setView(view.id ? { name: "event", id: view.id } : { name: "root" })}
                onCreate={(f) => (view.id ? updateEvent(view.id, f) : createEvent(f))}
                onListVenues={(city, cat, q) => api.listVenues(city, cat, q)}
                onAddVenue={(city, cat, name, lat, lng) => api.addVenue(meId, city, cat, name, lat, lng)} />
            </View>
          )}
          {view.name === "hub" && <HubScreen user={user} onGo={hubGo} />}
          {view.name === "penalti" && <PenaltyScreen onBack={() => setView({ name: "hub" })} />}
          {view.name === "kadroDene" && <KadroDeneScreen onBack={() => setView({ name: "hub" })} />}
          {view.name === "settings" && (
            <View style={StyleSheet.absoluteFill}>
              <SettingsScreen settings={settings} onChange={changeSettings} onBack={() => setView({ name: "root" })} onDeleteAccount={deleteAccount}
                blockedCount={blocked.length} onBlocked={() => setView({ name: "blocked" })} paymentDetails={paymentDetails} onSaveIban={saveIban} onTheme={saveTheme} onLang={saveLang} />
            </View>
          )}
          {rateEvent && (
            <View style={StyleSheet.absoluteFill}>
              <RateScreen event={rateEvent} people={peopleFor(rateEvent)} myMvpVote={mvpVotes[rateEvent.id] || null} onBack={() => setView({ name: "event", id: rateEvent.id })} onSubmit={(r, mvpId) => submitRatings(rateEvent.id, r, mvpId)} />
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
          {view.name === "editProfile" && (
            <View style={StyleSheet.absoluteFill}>
              <EditProfileScreen user={me} busy={profileBusy} error={profileError} marketMine={myListing} onSaveListing={saveListing} onDropListing={dropListing} onAvatar={changeAvatar} onBack={() => setView({ name: "root" })}
                onSave={async (f) => { setProfileBusy(true); setProfileError(null); try { await api.updateProfileInfo(meId, f); await loadProfile(meId); setView({ name: "root" }); showToast(t("Profilin güncellendi")); } catch (e) { setProfileError(friendly(e)); } finally { setProfileBusy(false); } }} />
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
                players={[...(lineupChat.members || []).map((m) => (m.id === "me" ? { ...me, id: "me", role: m.role, positions: (me.positions || []) } : m)), ...guestPlayers(events.find((e) => e.id === lineupChat.eventId) || {})]}
                onBack={() => setView({ name: "groupInfo", id: lineupChat.id })}
                onSend={(text) => { sendMessage(lineupChat.id, text); showToast(t("Kura gruba gönderildi ⚽")); setView({ name: "chat", id: lineupChat.id }); }}
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
              <AttendanceScreen event={attendanceEvent} roster={rosterWithGuests(attendanceEvent)} onBack={() => setView({ name: "event", id: attendanceEvent.id })} onSave={(marks) => saveAttendance(attendanceEvent.id, marks)} />
            </View>
          )}
          {infoChat && (
            <View style={StyleSheet.absoluteFill}>
              <GroupInfoScreen chat={infoChat} event={infoChat.eventId ? events.find((e) => e.id === infoChat.eventId) : null} me={{ ...me, id: "me" }}
                onBack={() => setView({ name: "chat", id: infoChat.id })} onOpenEvent={(id) => { setTab("home"); setView({ name: "event", id }); }}
                onSelectMember={(member) => setMemberSheet({ member, chatId: infoChat.id })}
                onLineup={() => setView({ name: "lineup", id: infoChat.id })}
                guests={(events.find((e) => e.id === infoChat.eventId) || {}).guests || []}
                onMute={muteChat} season={seasons[infoChat.id] || null} />
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
            onClose={() => setInviteTarget(null)} placeholder={t("Etkinlik ara…")} />
          <PickerSheet visible={!!reportTarget} title={reportTarget ? `${reportTarget.name.split(" ")[0]} için şikayet nedeni` : "Şikayet"}
            items={REPORT_REASONS.map((r) => r.label)} value={null} onSelect={submitReport} onClose={() => setReportTarget(null)} placeholder={t("Neden ara…")} />

          <VenueSheet visible={venueHub} onClose={() => setVenueHub(false)} cityName={user.city}
            categoryName={t("Halı Saha")}
            onList={(q) => api.listVenues(user.city, 1, q)}
            onAdd={(name, lat, lng) => api.addVenue(meId, user.city, 1, name, lat, lng)}
            onPick={(v) => { setVenueHub(false); const u = mapsUrl({ venue: v.name, city: user.city, venueLat: v.lat, venueLng: v.lng }); Linking.openURL(Platform.OS === "ios" ? u.ios : u.android).catch(() => {}); }} />
          <PostComposer visible={composer} onClose={() => setComposer(false)} busy={postBusy}
            hasListing={!!(myListing && myListing.active)} onShare={sharePost} />
          <Toast text={toast} />

          {!hideTabs && (
            <View style={st.tabbar}>
              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("home"); setView({ name: "root" }); }}>
                <Ionicons name={tab === "home" ? "home" : "home-outline"} size={22} color={tab === "home" ? C.turfText : C.gray} />
                <Text style={[st.tabLabel, { color: tab === "home" ? C.turfText : C.gray }]}>{t("tab.home")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("search"); setView({ name: "root" }); }}>
                <Ionicons name={tab === "search" ? "search" : "search-outline"} size={22} color={tab === "search" ? C.turfText : C.gray} />
                <Text style={[st.tabLabel, { color: tab === "search" ? C.turfText : C.gray }]}>{t("tab.search")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.fab} onPress={() => setView({ name: view.name === "hub" ? "root" : "hub" })}>
                <Ionicons name="add" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("chats"); setView({ name: "root" }); }}>
                <View>
                  <Ionicons name={tab === "chats" ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} size={22} color={tab === "chats" ? C.turfText : C.gray} />
                  {totalUnread > 0 && (<View style={st.tabBadge}><Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>{totalUnread}</Text></View>)}
                </View>
                <Text style={[st.tabLabel, { color: tab === "chats" ? C.turfText : C.gray }]}>{t("tab.chats")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("profile"); setView({ name: "root" }); }}>
                <Ionicons name={tab === "profile" ? "person" : "person-outline"} size={22} color={tab === "profile" ? C.turfText : C.gray} />
                <Text style={[st.tabLabel, { color: tab === "profile" ? C.turfText : C.gray }]}>{t("tab.profile")}</Text>
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

const mkSt = () => StyleSheet.create({
  tabbar: {
    position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around",
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8, paddingBottom: 10, paddingHorizontal: 8,
  },
  tabBtn: { alignItems: "center", gap: 2, paddingHorizontal: 8 },
  tabLabel: { fontSize: 10, fontWeight: "800" },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.kit, alignItems: "center", justifyContent: "center", marginTop: -30, elevation: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  tabBadge: { position: "absolute", top: -4, right: -8, backgroundColor: C.pitch, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
