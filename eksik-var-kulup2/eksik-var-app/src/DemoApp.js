import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, Share, BackHandler,
  StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { C, onThemeChange } from "./theme";
import { SEED_EVENTS, SEED_CHATS, SEED_APPS, ORGS, DEFAULT_SETTINGS, contactRules, genMembers, memberFromOrg, relAfterShow, relAfterNoShow, fmtEventDate, addDays, GUNLER_UZUN, buildShareText, buildInviteText, buildTeamInvite, extractIban, guestPlayers, isGuestKey, buildMatchSummary, SEED_NOTIFS, REPORT_REASONS, applyRating, hoursUntil, commentsFor, positionAvailable, posLabel, openPositions, teamLabel, OPTION_IDS, availabilityFor, VARMISIN_OPTIONS, nowTime, uid, APP_LINK, toggleReaction, cloneForRepeat, SEED_MARKET, SEED_POSTS } from "./data";
import { MY_TEAM } from "./team";
import { DEFAULT_SPONSORS } from "./sponsors";
import { filterVenues, mergeVenues } from "./venues";
import { buildWeeklyDigest, buildDigestShare } from "./badges";
import { useDeepLink } from "./deeplink";
import { copyText } from "./clipboard";
import { pickPhoto } from "./avatar";
import { addToCalendar } from "./calendar";
import { Linking } from "react-native";
import { t, onLangChange } from "./i18n";
import { saveTheme, saveLang } from "./prefs";
import { Toast, PickerSheet } from "./components";
import AuthScreen from "./screens/AuthScreen";
import HomeScreen from "./screens/HomeScreen";
import EventDetailScreen from "./screens/EventDetailScreen";
import CreateScreen from "./screens/CreateScreen";
import ChatsScreen from "./screens/ChatsScreen";
import ChatRoomScreen from "./screens/ChatRoomScreen";
import ProfileScreen from "./screens/ProfileScreen";
import SettingsScreen from "./screens/SettingsScreen";
import CallScreen from "./screens/CallScreen";
import GroupInfoScreen, { MemberSheet } from "./screens/GroupInfoScreen";
import AttendanceScreen from "./screens/AttendanceScreen";
import NotificationsScreen from "./screens/NotificationsScreen";
import RateScreen from "./screens/RateScreen";
import BlockedScreen from "./screens/BlockedScreen";
import UserProfileScreen from "./screens/UserProfileScreen";
import PostComposer from "./screens/PostComposer";
import { yolSec } from "./yol";
import VenueSheet from "./screens/VenueSheet";
import HubScreen from "./screens/HubScreen";
import PenaltyScreen from "./screens/PenaltyScreen";
import KadroDeneScreen from "./screens/KadroDeneScreen";
import BasketScreen from "./screens/BasketScreen";
import OffersScreen from "./screens/OffersScreen";
import ClubBoardScreen from "./screens/ClubBoardScreen";
import TakimScreen from "./screens/TakimScreen";
import VolleyScreen from "./screens/VolleyScreen";
import TennisScreen from "./screens/TennisScreen";
import LineupScreen from "./screens/LineupScreen";
import SearchScreen, { matchesQuery } from "./screens/SearchScreen";
import EditProfileScreen from "./screens/EditProfileScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import TeamScreen from "./screens/TeamScreen";
import SummarySheet from "./screens/SummarySheet";
import { ApplySheet } from "./screens/sheets";
import { Alert } from "react-native";

export default function DemoApp() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [homeKind, setHomeKind] = useState("oyuncu");
  const [venueHub, setVenueHub] = useState(false);
  const hubGo = (k) => {
    if (k === "create") setView({ name: "create" });
    else if (k === "kadro") setView({ name: "kadroDene" });
    else if (k === "penalti") setView({ name: "penalti" });
    else if (k === "basket") setView({ name: "basket" });
    else if (k === "takim") { setView({ name: "takim" }); }
    else if (k === "teklifler") { setView({ name: "teklifler" }); }
    else if (k === "kulup") { setView({ name: "kulup" }); }
    else if (k === "voleybol") setView({ name: "voleybol" });
    else if (k === "tenis") setView({ name: "tenis" });
    else if (k === "pazar") { setHomeKind("pazar"); setTab("home"); setView({ name: "root" }); }
    else if (k === "rakip") { setHomeKind("rakip"); setTab("home"); setView({ name: "root" }); }
    else if (k === "kesfet") { setTab("search"); setView({ name: "root" }); }
    else if (k === "vitrin") setView({ name: "editProfile" });
    else if (k === "sahalar") setVenueHub(true);
    else showToast(t("Çok yakında 🏗"));
  };

  const [view, setView] = useState({ name: "root" });
  const [events, setEvents] = useState(SEED_EVENTS);
  const [chats, setChats] = useState(SEED_CHATS);
  const [communityVenues, setCommunityVenues] = useState([]);
  const [posts, setPosts] = useState(SEED_POSTS);
  const [composer, setComposer] = useState(false);
  const likePost = (p) => setPosts((ps) => ps.map((x) => x.id !== p.id ? x : {
    ...x, likes: x.likes.includes("me") ? x.likes.filter((l) => l !== "me") : [...x.likes, "me"] }));
  const sharePost = ({ caption, imageUri, videoUri, attach }) => {
    const yeni = { id: uid(), userId: "me", name: user.name, avatar: user.avatar, caption,
      image: imageUri || null, video: videoUri || null, createdAt: new Date().toISOString(), likes: [],
      attach, listing: attach && myListing ? { cat: myListing.cat, positions: myListing.positions, rating: user.rating, rel: user.rel } : null };
    setPosts((ps) => [yeni, ...ps]); setComposer(false); showToast(t("Paylaşıldı! 🎉"));
  };
  const removePost = (p) => Alert.alert(t("Gönderiyi sil?"), "", [
    { text: t("Vazgeç"), style: "cancel" },
    { text: t("Sil"), style: "destructive", onPress: () => { setPosts((ps) => ps.filter((x) => x.id !== p.id)); showToast(t("Gönderi silindi")); } },
  ]);
  const [demoOffers, setDemoOffers] = useState([
    { id: "of1", kind: "takim", status: "bekliyor", yon: "gelen", kisi: "Zeynep Arslan", kisiId: "zeynep", message: "🏆 Boğaziçi Yıldızları seni kadrosuna davet ediyor!", takim: "⚡ Boğaziçi Yıldızları", createdAt: new Date(Date.now() - 3600000).toISOString() },
    { id: "of2", kind: "oyuncu", status: "kabul", yon: "giden", kisi: "Ozan Demir", kisiId: "ozan", message: "💌 Vitrinini beğendik!", takim: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
  ]);
  const [market, setMarket] = useState(SEED_MARKET);          // pazar: sahte vitrinler + benimki
  const [myListing, setMyListing] = useState(null);
  const saveListing = (f) => {
    const kayit = { ...f, active: true };
    setMyListing(kayit);
    setMarket((m) => [{ id: "pl-me", userId: "me", name: user.name, rating: user.rating, count: user.count, rel: user.rel, district: user.district, ...f }, ...m.filter((x) => x.userId !== "me")]);
    showToast(t("Vitrindesin! Takımlar seni görebilir 🏪"));
  };
  const dropListing = () => { setMyListing(null); setMarket((m) => m.filter((x) => x.userId !== "me")); showToast(t("Vitrinden indin")); };   // demo: haritadan eklenenler burada birikir
  const [apps, setApps] = useState(SEED_APPS);
  const [ratedEvents, setRatedEvents] = useState([]);       // puanladığım etkinlikler
  const [blocked, setBlocked] = useState([]);                 // engellediğim kişiler
  const [reportTarget, setReportTarget] = useState(null);     // şikayet edilen üye
  const [givenRatings, setGivenRatings] = useState({});       // bu oturumda verdiğim puanlar: userId → [yorum]
  const [mvpVotes, setMvpVotes] = useState({});               // eventId → oy verdiğim kişi
  const [paymentDetails, setPaymentDetails] = useState(null); // { iban, holder }
  const [recentSearches, setRecentSearches] = useState([]);
  const [knownUsers, setKnownUsers] = useState({});           // aramadan gelen kişiler (profil çözümlemesi için)
  const [inviteTarget, setInviteTarget] = useState(null);     // davet edilecek kişi (etkinlik seçimi bekliyor)
  const [waitEvent, setWaitEvent] = useState(null);           // yedek olunacak etkinlik (mevki seçimi bekliyor)
  const [toast, setToast] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [onboarded, setOnboarded] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS); // iletişim + bildirim tercihleri
  const [call, setCall] = useState(null);                     // aktif arama: { chatId, name }
  const [memberSheet, setMemberSheet] = useState(null);       // açık üye kartı: { member, chatId }
  const [notifs, setNotifs] = useState(SEED_NOTIFS);           // bildirimler (en yeni önde)
  const [team, setTeam] = useState(() => ({ ...MY_TEAM, roster: [{ id: "me", role: "kaptan", via: "ekip" }, memberFromOrg(ORGS.ozan), ...genMembers(9, "e2")] }));
  const [summaryOpen, setSummaryOpen] = useState(false);       // haftalık özet kaplaması

  const timers = useRef([]);
  const viewRef = useRef(view);
  const repliedRef = useRef(false);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // Derin bağlantı: kullanıcı ve etkinlikler hazır olunca ilgili etkinliği aç
  const [pendingLink, setPendingLink] = useState(null);
  useDeepLink(setPendingLink);
  useEffect(() => {
    if (!pendingLink || !user) return;
    if (events.some((e) => e.id === pendingLink)) { setTab("home"); setView({ name: "event", id: pendingLink }); setPendingLink(null); }
    else if (events.length) { showToast(t("Bu etkinlik artık açık değil")); setPendingLink(null); }
  }, [pendingLink, user, events]);  
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

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

  const showToast = (msg) => {
    setToast(msg);
    later(() => setToast(null), 2800);
  };

  /* --- bildirimler --- */
  const addNotif = (type, title, body, data = {}, read = false) => {
    if (type === "mesaj" && !settings.notif.mesaj) return;
    if (type === "basvuru" && !settings.notif.basvuru) return;
    if (type === "hatirlatma" && !settings.notif.hatirlatma) return;
    setNotifs((ns) => [{ id: uid(), type, title, body, data, read, time: nowTime() }, ...ns]);
  };
  const isViewingChat = (chatId) => viewRef.current.name === "chat" && viewRef.current.id === chatId;

  const pushMsg = (chatId, msg, bump = false, chatTitle = null) => {
    if (bump && chatTitle && msg.from !== "me" && msg.from !== "sys" && msg.from !== "approval" && !isViewingChat(chatId)) {
      addNotif("mesaj", `${msg.name || "Mesaj"} · ${chatTitle}`, msg.text, { chatId });
    }
    return setChats((cs) =>
      cs.map((c) =>
        c.id === chatId
          ? {
              ...c,
              msgs: [...c.msgs, { id: uid(), time: nowTime(), ...msg }],
              lastTime: "Şimdi",
              unread: bump && !isViewingChat(chatId) ? (c.unread || 0) + 1 : c.unread,
            }
          : c
      )
    );
  };

  const openChat = (id) => {
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)));
    setTab("chats");
    setView({ name: "chat", id });
  };

  /* --- başvuru akışı (katılımcı tarafı) --- */
  const applyToEvent = (ev, note, position = null) => {
    const appId = "app-" + ev.id;
    setApps((a) => [...a, { id: appId, eventId: ev.id, who: "me", status: "beklemede", position }]);
    const chatId = "dm-" + ev.id;
    setChats((cs) => [
      {
        id: chatId, type: "birebir", eventId: ev.id, otherId: ev.org.id, title: ev.org.name,
        sub: `"${ev.title}" başvurusu`, unread: 0, lastTime: "Şimdi",
        msgs: [
          { id: uid(), from: "sys", text: `"${ev.title}" için başvuru sohbeti açıldı${position ? ` · mevki: ${posLabel(position)}` : ""}`, time: nowTime() },
          { id: uid(), from: "me", text: note, time: nowTime() },
        ],
      },
      ...cs,
    ]);
    setView({ name: "root" });
    openChat(chatId);
    later(() => pushMsg(chatId, { from: ev.org.id, name: ev.org.name, text: "Selam! Başvurunu gördüm 👋 Hangi mevkide oynuyorsun?" }, true, ev.org.name), 1500);
    later(() => {
      pushMsg(chatId, { from: ev.org.id, name: ev.org.name, text: "Süper, tam aradığımız profil. Seni onaylıyorum 👍" }, true, ev.org.name);
      pushMsg(chatId, { from: "approval", appId }, true);
      addNotif("onay", `${ev.org.name.split(" ")[0]} seni onayladı`, `"${ev.title}" için son onayı sen ver, yerin kesinleşsin`, { chatId }, isViewingChat(chatId));
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

    const posKey = app.position || "farketmez";
    setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "onaylandi" } : x)));
    setEvents((es) =>
      es.map((e) =>
        e.id === ev.id
          ? { ...e, filled: newFilled, joined: true, status: full ? "doldu" : e.status,
              filledPos: { ...(e.filledPos || {}), [posKey]: ((e.filledPos || {})[posKey] || 0) + 1 } }
          : e
      )
    );

    const gid = "g-" + ev.id;
    const members = [
      memberFromOrg(ev.org, "organizator", "ekip"),
      ...genMembers(ev.capacity - ev.needed - 1, ev.id, "ekip"),
      ...genMembers(ev.filled, ev.id + "-app", "uygulama"),
      { id: "me", role: "uye", via: "uygulama" },
    ];
    setChats((cs) => [
      {
        id: gid, type: "grup", eventId: ev.id, title: ev.title, members,
        sub: `${members.length} üye`, unread: 0, lastTime: "Şimdi",
        msgs: [
          { id: uid(), from: "sys", text: `"${ev.title}" grup sohbeti`, time: nowTime() },
          { id: uid(), from: "sys", text: `${user.name} kadroya katıldı`, time: nowTime() },
        ],
      },
      ...cs,
    ]);
    later(() => pushMsg(gid, { from: ev.org.id, name: ev.org.name, text: "Aramıza hoş geldin 💪 Maç günü 15 dk önce sahada olalım." }, true, ev.title), 1800);
    addNotif("kadro", "Kadrodasın! 🎉", `${ev.title} · ${ev.date} · ${ev.venue.split(",")[0]}`, { chatId: gid });
    showToast(full ? "Kadrodasın 🎉 Kontenjan tamamlandı!" : "Kadrodasın 🎉 Grup sohbetine eklendin");
  };

  /* --- başvuru akışı (organizatör tarafı) --- */
  const approveApp = (appId) => {
    const app = apps.find((a) => a.id === appId);
    if (!app) return;
    const target = events.find((e) => e.id === app.eventId);
    if (target && !positionAvailable(target, app.position)) { showToast(t("{p0} için yer kalmadı", { p0: posLabel(app.position || "farketmez") })); return; }
    setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "orgBekliyor" } : x)));
    showToast(t("Onayladın · {p0}'ın son onayı bekleniyor", { p0: app.who.name.split(" ")[0] }));
    later(() => {
      setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "onaylandi" } : x)));
      setEvents((es) =>
        es.map((e) => {
          if (e.id !== app.eventId) return e;
          const nf = e.filled + 1; const pk = app.position || "farketmez";
          return { ...e, filled: nf, status: nf >= e.needed ? "doldu" : e.status, filledPos: { ...(e.filledPos || {}), [pk]: ((e.filledPos || {})[pk] || 0) + 1 } };
        })
      );
      setChats((cs) => cs.map((c) => {
        if (c.id !== "g-" + app.eventId || !c.members) return c;
        const members = [...c.members, memberFromOrg(app.who, "uye", "uygulama")];
        return { ...c, members, sub: `${members.length} üye` };
      }));
      if (!(target && target.kind === "rakip")) {
        pushMsg("g-" + app.eventId, { from: "sys", text: `${app.who.name} kadroya katıldı` }, true);
        later(() => pushMsg("g-" + app.eventId, { from: app.who.id, name: app.who.name, text: "Eyvallah hocam, pazar oradayım 💪" }, true, target ? target.title : ""), 900);
      } else {
        later(() => pushMsg("g-" + app.eventId, { from: app.who.id, name: app.who.name, text: "Süper, Cuma 22:00 oradayız. Formalarımız beyaz 👕" }, true, target.teamName), 1200);
      }
      const target = events.find((e) => e.id === app.eventId);
      const willFill = target && target.filled + 1 >= target.needed;
      if (target && target.kind === "rakip") {
        addNotif("doldu", "Rakip bulundu! 🆚", `${teamLabel(app.who)} takımıyla maç kesinleşti · ${target.date}`, { eventId: app.eventId });
        pushMsg("g-" + app.eventId, { from: "sys", text: `Maç kesinleşti: ${target.teamName} 🆚 ${teamLabel(app.who)} · ${target.date}. Saha ve ücret detaylarını burada netleştirin.` }, true);
        setChats((cs) => cs.map((c) => (c.id === "g-" + app.eventId ? { ...c, title: `${target.teamName} 🆚 ${teamLabel(app.who)}` } : c)));
      } else {
        addNotif(willFill ? "doldu" : "kadro", willFill ? "Kadro tamamlandı 🏆" : "Kadroya katılım",
          `${app.who.name} onayladı ve kadroya eklendi${willFill ? " · kontenjan doldu" : ""}`, { eventId: app.eventId });
      }
      showToast(t("{p0} kadroya eklendi 🎉", { p0: app.who.name.split(" ")[0] }));
    }, 2200);
  };

  const rejectApp = (appId) =>
    setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "reddedildi" } : x)));

  /* --- etkinlik oluşturma --- */
  const createEvent = (f) => {
    const id = "e-" + uid();
    const weekly = f.recurrence === "haftalik";
    const ev = {
      id, title: f.title, cat: Number(f.cat), city: f.city, district: f.district, venue: f.venue,
      dateISO: f.dateISO, time: f.time, weekday: f.weekday, date: fmtEventDate(f.dateISO, f.time),
      recurrence: weekly ? "haftalik" : "yok", seriesId: weekly ? id : null, needs: f.needs || {}, filledPos: {}, offlineRegulars: Number(f.offlineRegulars) || 0,
      kind: f.kind || "oyuncu", teamName: f.teamName || null, format: f.format || null, venueMode: f.venueMode || null, costMode: f.costMode || null,
      recurrenceUntil: weekly && f.weeks ? addDays(f.dateISO, f.weeks * 7 - 1) : null,
      price: Number(f.price) || 0, capacity: Number(f.capacity),
      needed: Number(f.needed), filled: 0, level: f.level, status: "acik",
      org: null, joined: false, mine: true,
      desc: f.desc || "Detaylar için mesaj atabilirsin.",
    };
    setEvents((es) => [ev, ...es]);
    const members = f.kind === "rakip" ? [{ id: "me", role: "organizator", via: "ekip" }] : [{ id: "me", role: "organizator", via: "ekip" }, ...genMembers(ev.capacity - ev.needed - 1, id, "ekip")];
    setChats((cs) => [
      {
        id: "g-" + id, type: "grup", eventId: id, seriesId: ev.seriesId, title: f.title, members,
        sub: `${members.length} üye`, unread: 0, lastTime: "Şimdi",
        msgs: [{
          id: uid(), from: "sys", time: nowTime(),
          text: f.kind === "rakip" ? "Kaptanlar sohbeti · Rakip takımın kaptanı kabul edilince buraya eklenir"
            : weekly
            ? `Ekip grubu kuruldu · Her ${GUNLER_UZUN[f.weekday]} ${f.time}. Her hafta o haftanın eksikleri buraya eklenir`
            : "Grubu oluşturdun · Onaylanan oyuncular buraya eklenir",
        }],
      },
      ...cs,
    ]);
    if (f.kind === "rakip") setUser((u) => ({ ...u, teamName: f.teamName }));
    setTab("home");
    setView({ name: "event", id });
    if (f.preset === "ekip") later(() => Share.share({ message: buildTeamInvite(ev, user) }).catch(() => {}), 600);
    showToast(f.kind === "rakip" ? "Rakip ilanın yayında 🆚" : weekly ? `Haftalık seri yayında 🔁 Her ${GUNLER_UZUN[f.weekday]} ${f.time}` : "Talebin yayında 🚀 Grup sohbeti kuruldu");
  };

  /* --- iletişim izinleri & arama --- */
  const sharesSquad = (otherId) =>
    events.some((e) => e.joined && e.org && e.org.id === otherId) ||
    apps.some((a) => a.who && a.who.id === otherId && a.status === "onaylandi") ||
    chats.some((c) => c.type === "grup" && c.members && c.members.some((m) => m.id === otherId));

  const rulesFor = (chat) => {
    if (!chat || chat.type !== "birebir") return null;
    if (isBlocked(chat.otherId)) return BLOCK_RULES;
    const other = chat.otherId ? ORGS[chat.otherId] : null;
    return contactRules(other, sharesSquad(chat.otherId), !!chat.eventId);
  };

  const startCall = () => showToast(t("Sesli arama yakında geliyor — şimdilik mesajlaşabilirsin"));
  const endCall = (seconds) => {
    if (call) {
      const m = Math.floor(seconds / 60), sn = seconds % 60;
      pushMsg(call.chatId, {
        from: "sys",
        text: seconds > 0 ? `📞 Sesli arama · ${m} dk ${sn} sn` : "📞 Cevapsız arama",
      });
    }
    setCall(null);
  };

  /* --- grup bilgisi & üye kartı --- */
  const me = user ? { id: "me", name: user.name, username: user.username, rating: user.rating, count: user.count, rel: user.rel, avatar: user.avatar } : null;

  const isBlocked = (id) => blocked.some((b) => b.id === id);
  const BLOCK_RULES = { canMessage: false, canCall: false, messageReason: "Bu kişiyi engelledin", callReason: "Bu kişiyi engelledin" };
  const rulesForMember = (member) => isBlocked(member.id) ? BLOCK_RULES : contactRules(ORGS[member.id] || null, sharesSquad(member.id), false);

  // Üyeyle birebir sohbeti bul ya da aç (sessizce), sohbet nesnesini döndür
  const ensureDirectChat = (member) => {
    const existing = chats.find((c) => c.type === "birebir" && c.otherId === member.id);
    if (existing) return existing;
    const fresh = {
      id: "dm-" + member.id, type: "birebir", eventId: null, otherId: member.id, title: member.name,
      sub: "", unread: 0, lastTime: "Şimdi",
      msgs: [{ id: uid(), from: "sys", text: `${member.name} ile sohbet başlatıldı`, time: nowTime() }],
    };
    setChats((cs) => [fresh, ...cs]);
    return fresh;
  };

  const messageMember = (member) => {
    const c = ensureDirectChat(member);
    setMemberSheet(null);
    openChat(c.id);
  };

  const callMember = () => showToast(t("Sesli arama yakında geliyor — şimdilik mesaj at"));

  const removeMember = (chatId, member) => {
    setChats((cs) => cs.map((c) => {
      if (c.id !== chatId || !c.members) return c;
      const members = c.members.filter((m) => m.id !== member.id);
      return { ...c, members, sub: `${members.length} üye` };
    }));
    const chat = chats.find((c) => c.id === chatId);
    if (chat && chat.eventId && member.via === "uygulama") {
      setEvents((es) => es.map((e) => e.id === chat.eventId
        ? { ...e, filled: Math.max(0, e.filled - 1), status: "acik" } : e));
    }
    pushMsg(chatId, { from: "sys", text: `${member.name} kadrodan çıkarıldı` });
    setMemberSheet(null);
    showToast(t("{p0} kadrodan çıkarıldı · kontenjan yeniden açıldı", { p0: member.name.split(" ")[0] }));
  };

  /* --- yedek listesi --- */
  const fmtHHMM = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const joinWaitlist = (ev, position) => {
    setWaitEvent(null);
    setEvents((es) => es.map((e) => (e.id === ev.id ? { ...e, myWaitlist: true, myWaitPos: position, waitlistCount: (e.waitlistCount || 0) + 1 } : e)));
    showToast(t("Yedek listesindesin · yer açılınca 2 saatlik onay teklifi gelecek", {  }));
    // Demo: 6 saniye sonra biri ayrılır, sıra sana gelir
    later(() => {
      const appId = "wl-" + ev.id; const until = new Date(Date.now() + 2 * 3600000); const untilLabel = fmtHHMM(until);
      const pk = position || "farketmez";
      setEvents((es) => es.map((e) => e.id === ev.id ? { ...e, myWaitlist: false, waitlistCount: Math.max(0, (e.waitlistCount || 1) - 1),
        filled: Math.max(0, e.filled - 1), status: "acik", filledPos: { ...(e.filledPos || {}), [pk]: Math.max(0, ((e.filledPos || {})[pk] || 0) - 1) } } : e));
      setApps((a) => [...a, { id: appId, eventId: ev.id, who: "me", note: "", status: "orgBekliyor", invited: true, fromWaitlist: true, offerExpiresAt: untilLabel, position }]);
      const chatId = "dm-" + ev.id;
      setChats((cs) => cs.some((c) => c.id === chatId) ? cs : [{
        id: chatId, type: "birebir", eventId: ev.id, otherId: ev.org.id, title: ev.org.name, sub: `"${ev.title}" yedek teklifi`, unread: 1, lastTime: "Şimdi",
        msgs: [{ id: uid(), from: "sys", text: `Yedek listesinden yer açıldı: "${ev.title}". ${untilLabel}'ye kadar onaylarsan yerin kesinleşir.`, time: nowTime() }, { id: uid(), from: "approval", appId }],
      }, ...cs]);
      addNotif("yedek", "Yer açıldı! 🎉", `${ev.title} · ${untilLabel}'ye kadar onaylarsan yerin kesin`, { eventId: ev.id, chatId });
      showToast(t("Yer açıldı! Sıra sende ⏳"));
    }, 6000);
  };
  const leaveWaitlist = (id) => {
    setEvents((es) => es.map((e) => (e.id === id ? { ...e, myWaitlist: false, waitlistCount: Math.max(0, (e.waitlistCount || 1) - 1) } : e)));
    showToast(t("Yedek listesinden ayrıldın"));
  };

  /* --- kadroya davet --- */
  const myOpenEvents = events.filter((e) => e.mine && e.status === "acik" && !e.ended);
  const inviteTo = (member, ev) => {
    setInviteTarget(null);
    if (apps.some((a) => a.eventId === ev.id && a.who !== "me" && a.who.id === member.id)) { showToast(t("{p0} bu etkinliğe zaten başvurmuş ya da davetli", { p0: member.name.split(" ")[0] })); return; }
    const slots = openPositions(ev);
    const slot = slots.find((sl) => (member.positions || []).includes(sl.id)) || slots.find((sl) => sl.id === "farketmez") || slots[0];
    if (!slot) { showToast(t("Bu etkinlikte açık yer kalmadı")); return; }
    const position = slot.id === "farketmez" ? null : slot.id;
    const appId = "inv-" + uid();
    setApps((a) => [...a, { id: appId, eventId: ev.id, who: member, note: "", status: "orgBekliyor", invited: true, position }]);
    const chatId = "dm-" + member.id;
    const sys = { id: uid(), from: "sys", text: `${member.name}'i "${ev.title}" kadrosuna davet ettin${position ? ` · ${posLabel(position)}` : ""}`, time: nowTime() };
    setChats((cs) => cs.some((c) => c.id === chatId)
      ? cs.map((c) => (c.id === chatId ? { ...c, msgs: [...c.msgs, sys], lastTime: "Şimdi" } : c))
      : [{ id: chatId, type: "birebir", eventId: null, otherId: member.id, title: member.name, sub: "", unread: 0, lastTime: "Şimdi", msgs: [sys] }, ...cs]);
    showToast(t("Davet gönderildi · {p0} cevaplayınca haber vereceğiz", { p0: member.name.split(" ")[0] }));
    // Demo: kişi 4 saniye sonra kabul eder
    later(() => {
      setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "onaylandi" } : x)));
      const pk = position || "farketmez";
      setEvents((es) => es.map((e) => e.id === ev.id ? { ...e, filled: e.filled + 1, status: e.filled + 1 >= e.needed ? "doldu" : e.status,
        filledPos: { ...(e.filledPos || {}), [pk]: ((e.filledPos || {})[pk] || 0) + 1 } } : e));
      setChats((cs) => cs.map((c) => {
        if (c.type === "grup" && c.eventId === ev.id && c.members) { const members = [...c.members, { ...member, role: "uye", via: "uygulama" }]; return { ...c, members, sub: `${members.length} üye` }; }
        return c;
      }));
      pushMsg(chatId, { from: member.id, name: member.name, text: "Varım! Görüşürüz 💪" }, true, member.name);
      pushMsg("g-" + ev.id, { from: "sys", text: `${member.name} daveti kabul etti, kadroya katıldı` }, true);
      addNotif("kadro", "Kadroya katılım", `${member.name} davetini kabul etti ve kadroya eklendi`, { eventId: ev.id });
    }, 4000);
  };
  const declineInvite = (appId) => {
    const app = apps.find((a) => a.id === appId); if (!app) return;
    setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "reddedildi" } : x)));
    const chatId = "dm-" + app.eventId;
    pushMsg(chatId, { from: "sys", text: "Daveti reddettin" });
    showToast(t("Davet reddedildi"));
  };

  /* --- başkasının profili --- */
  const findMember = (id) => {
    if (knownUsers[id]) return knownUsers[id];
    if (ORGS[id]) return memberFromOrg(ORGS[id]);
    const m = chats.flatMap((c) => c.members || []).find((x) => x.id === id) || blocked.find((b) => b.id === id);
    return m || null;
  };
  const openProfile = (member) => { setMemberSheet(null); setKnownUsers((k) => ({ ...k, [member.id]: member })); setView({ name: "profile", id: member.id }); };

  /* --- arama --- */
  const directory = () => {
    const seen = new Set(); const out = [];
    [...Object.values(ORGS).map((o) => memberFromOrg(o)), ...chats.flatMap((c) => c.members || [])].forEach((m) => {
      if (m.id === "me" || seen.has(m.id)) return; seen.add(m.id); out.push({ ...m, verified: true, city: m.city || "Ankara" });
    });
    return out;
  };
  const searchUsers = async (term) => directory().filter((u) => matchesQuery(u.name, term) || matchesQuery(u.username, term)).slice(0, 25);
  const searchEvents = async (term) => events.filter((e) => !e.ended && e.status !== "iptal" &&
    (matchesQuery(e.title, term) || matchesQuery(e.venue, term) || matchesQuery(e.district || "", term) || matchesQuery(e.city, term))).slice(0, 25);
  const suggestions = directory().filter((u) => chats.some((c) => c.type === "grup" && c.members && c.members.some((m) => m.id === u.id))).slice(0, 6);
  const addRecent = (u) => setRecentSearches((r) => [u, ...r.filter((x) => x.id !== u.id)].slice(0, 5));

  const openInfo = (chat) => {
    if (chat.type === "grup") { setView({ name: "groupInfo", id: chat.id }); return; }
    const org = ORGS[chat.otherId];
    const fromGroups = chats.flatMap((c) => c.members || []).find((m) => m.id === chat.otherId);
    const member = org ? memberFromOrg(org) : fromGroups
      || { id: chat.otherId || chat.id, name: chat.title, username: "-", rating: 0, count: 0, rel: 0 };
    setMemberSheet({ member, chatId: null });
  };

  /* --- yoklama & güvenilirlik --- */
  // Etkinliğin kadrosu: grup sohbetinin üyeleri (organizatör hariç)
  const rosterFor = (ev) => {
    const g = chats.find((c) => c.type === "grup" && c.eventId === ev.id);
    const list = g && g.members ? g.members : genMembers(ev.capacity - 1, ev.id);
    return list.filter((m) => m.id !== "me" && m.role !== "organizator");
  };

  const saveAttendance = (eventId, marks) => {
    const ev = events.find((e) => e.id === eventId);
    if (!ev) return;
    const ids = Object.keys(marks);
    const gelmedi = ids.filter((id) => marks[id] === "gelmedi").length;
    const katildi = ids.length - gelmedi;

    const payments = ev.price > 0 ? rosterWithGuests(ev).map((m) => ({ id: m.id, name: m.name, avatar: m.avatar, amount: ev.price, status: marks[m.id] === "gelmedi" ? "muaf" : "bekliyor", guest: !!m.guest })) : [];
    const guests = (ev.guests || []).map((g) => ({ ...g, attendance: marks["g:" + g.id] || "katildi" }));
    setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, status: "tamamlandi", attendance: marks, payments, guests } : e)));
    // Kadro üyelerinin güvenilirliği güncellenir (sunucuda trigger yapar)
    setChats((cs) => cs.map((c) => {
      if (!(c.type === "grup" && c.eventId === eventId && c.members)) return c;
      return {
        ...c,
        members: c.members.map((m) =>
          marks[m.id] === "gelmedi" ? { ...m, rel: relAfterNoShow(m.rel) }
          : marks[m.id] === "katildi" ? { ...m, rel: relAfterShow(m.rel) } : m),
      };
    }));
    const group = chats.find((c) => c.type === "grup" && c.eventId === eventId);
    const gid = group ? group.id : "g-" + eventId;
    pushMsg(gid, { from: "sys", text: `Yoklama alındı: ${katildi} katıldı, ${gelmedi} gelmedi. Takım arkadaşlarını puanlayabilirsin.` });
    // Organizatör kendi maçına katılmış sayılır
    setUser((u) => ({ ...u, joined: u.joined + 1 }));

    // Haftalık seri: bir sonraki hafta otomatik açılır, ekip grubu aynı kalır
    const nextISO = ev.dateISO ? addDays(ev.dateISO, 7) : null;
    const continues = ev.recurrence === "haftalik" && nextISO && (!ev.recurrenceUntil || nextISO <= ev.recurrenceUntil);
    if (continues) {
      const nid = "e-" + uid();
      const next = {
        ...ev, id: nid, dateISO: nextISO, date: fmtEventDate(nextISO, ev.time),
        status: "acik", filled: 0, ended: false, attendance: null, disputed: false,
      };
      setEvents((es) => [next, ...es]);
      setChats((cs) => cs.map((c) => (c.id === gid ? { ...c, eventId: nid } : c)));
      pushMsg(gid, { from: "sys", text: `Haftaya aynı saat: ${next.date} · ${next.needed} eksik, başvurular açık` }, true);
      addNotif("tekrar", "Haftaya aynı saat", `${next.title} · ${next.date} · ${next.needed} eksik, başvurular açık`, { eventId: nid });
      showToast(t("Maç tamamlandı · Gelecek hafta otomatik açıldı ({p0})", { p0: next.date }));
    } else {
      showToast(t("Maç tamamlandı · {p0} katıldı, {p1} gelmedi", { p0: katildi, p1: gelmedi }));
    }
    addNotif("puanlama", `${ev.title} tamamlandı`, "Takım arkadaşlarını puanla", { rate: true });
    setView({ name: "event", id: eventId });
  };

  const disputeAttendance = (eventId) => {
    setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, disputed: true } : e)));
    showToast(t("İtirazın organizatöre ve destek ekibine iletildi"));
  };

  /* --- paylaşım (telefonun paylaşım menüsü: WhatsApp, Telegram, SMS...) --- */
  const shareEvent = async (ev) => {
    try {
      const res = await Share.share({ message: buildShareText(ev, user) });
      if (res.action === Share.sharedAction) showToast(t("Paylaşıldı 🚀 Gelen başvurular burada görünecek"));
    } catch {
      showToast(t("Paylaşım açılamadı"));
    }
  };
  const inviteFriends = async () => {
    try {
      const res = await Share.share({ message: buildInviteText(user) });
      if (res.action === Share.sharedAction) showToast(t("Davet gönderildi 🙌"));
    } catch {
      showToast(t("Paylaşım açılamadı"));
    }
  };

  /* --- engelleme & şikayet --- */
  const toggleBlock = (member) => {
    if (isBlocked(member.id)) { setBlocked((b) => b.filter((x) => x.id !== member.id)); showToast(t("{p0} için engel kaldırıldı", { p0: member.name.split(" ")[0] })); }
    else { setBlocked((b) => [...b, member]); setMemberSheet(null); showToast(t("{p0} engellendi", { p0: member.name.split(" ")[0] })); }
  };
  const submitReport = (reasonLabel) => {
    const r = REPORT_REASONS.find((x) => x.label === reasonLabel);
    setReportTarget(null); setMemberSheet(null);
    showToast(t("Şikayetin iletildi ({p0}) · inceleniyor", { p0: r ? r.label.toLowerCase() : "diğer" }));
  };

  /* --- puanlama --- */
  const pendingRatings = events.filter((e) => e.status === "tamamlandi" && (e.joined || e.mine) && !ratedEvents.includes(e.id));
  const peopleFor = (ev) => {
    const people = rosterFor(ev).slice();
    if (!ev.mine && ev.org) people.unshift({ ...memberFromOrg(ev.org, "organizator", "ekip") });
    return people;
  };
  /* --- ödeme takibi --- */
  const claimPayment = (eventId) => {
    setEvents((es) => es.map((e) => (e.id === eventId && e.myPayment ? { ...e, myPayment: { ...e.myPayment, status: "odedim" } } : e)));
    showToast(t("Organizatöre bildirildi · onaylayınca 'Ödendi' olur"));
    later(() => { setEvents((es) => es.map((e) => (e.id === eventId && e.myPayment ? { ...e, myPayment: { ...e.myPayment, status: "odendi" } } : e)));
      addNotif("odeme", "Ödemen onaylandı ✓", "Cuma Halı Saha · 150₺", { eventId }); }, 3000);
  };
  /* --- gol/asist, yoklama kodu, özet --- */
  const [checkinCodes, setCheckinCodes] = useState({});
  const setStat = (eventId, m, sv) => setEvents((es) => es.map((e) => {
    if (e.id !== eventId) return e;
    const others = (e.stats || []).filter((x) => x.id !== m.id);
    return { ...e, stats: [...others, { id: m.id, name: m.name, goals: sv.goals, assists: sv.assists }] };
  }));
  const shareSummary = (ev) => Share.share({ message: buildMatchSummary(ev, { stats: ev.stats || [], mine: ev.mine }) }).catch(() => {});
  const openCode = (eventId) => setCheckinCodes((c) => (c[eventId] ? c : { ...c, [eventId]: String(1000 + Math.floor(Math.random() * 9000)) }));
  const checkInWithCode = (eventId, code) => { if (code.length !== 4) { showToast(t("4 haneli kod")); return; } checkIn(eventId); };
  const seasonFor = (chat) => {
    const evs = events.filter((e) => e.status === "tamamlandi" && (e.id === chat.eventId || (chat.seriesId && e.seriesId === chat.seriesId)));
    const acc = {};
    evs.forEach((e) => {
      (e.stats || []).forEach((x) => { const a = acc[x.id] = acc[x.id] || { id: x.id, name: x.name, matches: 0, goals: 0, assists: 0, mvps: 0, guest: isGuestKey(x.id) }; a.goals += x.goals; a.assists += x.assists; });
      if (e.mvp && e.mvp.final) { const a = acc[e.mvp.id] = acc[e.mvp.id] || { id: e.mvp.id, name: e.mvp.name, matches: 0, goals: 0, assists: 0, mvps: 0 }; a.mvps += 1; }
      Object.values(acc).forEach((a) => { a.matches += 1; });
    });
    return Object.values(acc).sort((a, b) => b.goals - a.goals || b.assists - a.assists);
  };

  const confirmAllPayments = (eventId) => {
    Alert.alert(t("Herkes ödedi"), t("Bekleyen ve 'ödedim' diyen herkes 'ödendi' olarak işaretlenecek."), [{ text: t("Vazgeç"), style: "cancel" }, { text: t("İşaretle"), onPress: () => {
      setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, payments: (e.payments || []).map((p) => (p.status === "bekliyor" || p.status === "odedim" ? { ...p, status: "odendi" } : p)) } : e)));
      showToast(t("Tüm ödemeler işaretlendi ✓"));
    } }]);
  };
  const confirmPayment = (eventId, userId, status) =>
    setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, payments: (e.payments || []).map((p) => (p.id === userId ? { ...p, status } : p)) } : e)));
  const sendIban = (eventId) => {
    const ev = events.find((e) => e.id === eventId); if (!ev) return;
    if (!paymentDetails) { showToast(t("Önce Ayarlar > Ödeme bilgileri'ne IBAN'ını yaz")); setView({ name: "settings" }); return; }
    const g = groupOf(ev); if (g) pushMsg(g.id, { from: "sys", text: `💳 Saha ücreti ${ev.price}₺ · IBAN: ${paymentDetails.iban} (${paymentDetails.holder}) · Açıklama: ${ev.title}` });
    showToast(t("IBAN gruba gönderildi 💳"));
  };
  const remindPayments = (eventId) => {
    const ev = events.find((e) => e.id === eventId); const n = ((ev && ev.payments) || []).filter((p) => p.status === "bekliyor").length;
    showToast(n ? `${n} kişiye hatırlatma gönderildi` : "Bekleyen ödeme yok");
  };
  const saveIban = (d) => { setPaymentDetails(d); showToast(t("Ödeme bilgilerin kaydedildi 💳")); };

  const recordScore = (eventId, home, away) => {
    const ev = events.find((e) => e.id === eventId); if (!ev) return;
    const label = ev.kind === "rakip" ? `${ev.teamName} – Rakip` : "Yelekliler – Yeleksizler";
    setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, score: { home, away, label } } : e)));
    const g = groupOf(ev); if (g) pushMsg(g.id, { from: "sys", text: `Maç sonucu: ${label} ${home} – ${away}` });
    showToast(t("Skor kaydedildi · {p0} – {p1}", { p0: home, p1: away }));
  };
  const submitRatings = (eventId, ratings, mvpId = null) => {
    const ev = events.find((e) => e.id === eventId);
    const given = Object.entries(ratings).filter(([, r]) => r.stars > 0);
    if (mvpId) {
      const who = peopleFor(ev).find((p) => p.id === mvpId);
      setMvpVotes((v) => ({ ...v, [eventId]: mvpId }));
      setEvents((es) => es.map((e) => e.id === eventId ? { ...e, mvp: e.mvp && e.mvp.id === mvpId ? { ...e.mvp, votes: e.mvp.votes + 1 } : (e.mvp && e.mvp.votes > 1 ? e.mvp : { id: mvpId, name: who ? who.name : "Oyuncu", votes: (e.mvp && e.mvp.id === mvpId ? e.mvp.votes : 0) + 1, final: false }) } : e));
    }
    // grup üyelerinin ve organizatörün ortalaması güncellenir (sunucuda ratings tablosu + trigger yapar)
    setChats((cs) => cs.map((c) => c.type === "grup" && c.members
      ? { ...c, members: c.members.map((m) => ratings[m.id] && ratings[m.id].stars ? applyRating(m, ratings[m.id].stars) : m) } : c));
    if (ev && ev.org && ratings[ev.org.id] && ratings[ev.org.id].stars) {
      const upd = applyRating(ev.org, ratings[ev.org.id].stars);
      setEvents((es) => es.map((e) => e.org && e.org.id === ev.org.id ? { ...e, org: { ...e.org, rating: upd.rating, count: upd.count } } : e));
    }
    setRatedEvents((r) => [...r, eventId]);
    setGivenRatings((g) => {
      const next = { ...g };
      given.forEach(([id, r]) => { next[id] = [{ from: user.name, stars: r.stars, text: r.comment, event: ev ? ev.title : "", time: "Şimdi" }, ...(next[id] || [])]; });
      return next;
    });
    setNotifs((ns) => ns.map((n) => n.type === "puanlama" && n.data && n.data.eventId === eventId ? { ...n, read: true } : n));
    showToast(`${given.length ? `${given.length} puan` : "Oyun"} kaydedildi ⭐${mvpId ? " · MVP oyun alındı 🏆" : ""}`);
    setView({ name: "event", id: eventId });
  };

  /* --- etkinlik yönetimi --- */
  const updateEvent = (id, f) => {
    const gid = (chats.find((c) => c.type === "grup" && c.eventId === id) || {}).id;
    const date = fmtEventDate(f.dateISO, f.time);
    setEvents((es) => es.map((e) => e.id === id ? {
      ...e, title: f.title, cat: Number(f.cat), city: f.city, district: f.district, venue: f.venue,
      dateISO: f.dateISO, time: f.time, weekday: f.weekday, date, price: Number(f.price) || 0,
      capacity: Number(f.capacity), needed: Number(f.needed), level: f.level, desc: f.desc || e.desc, needs: f.needs || {},
      status: e.filled >= Number(f.needed) ? "doldu" : "acik",
    } : e));
    if (gid) pushMsg(gid, { from: "sys", text: `Etkinlik güncellendi: ${date} · ${f.venue}` });
    showToast(t("Değişiklikler kaydedildi · kadroya duyuruldu"));
    setView({ name: "event", id });
  };
  const cancelEvent = (id) => {
    const ev = events.find((e) => e.id === id); if (!ev) return;
    const h = hoursUntil(ev); const late = h != null && h < 24;
    Alert.alert(t("Etkinliği iptal et"),
      `${ev.title} iptal edilecek, kadrodakilere bildirim gidecek.${late ? " Maça 24 saatten az kaldığı için geç iptal olarak kaydedilir ve güvenilirliğini etkiler." : ""}`,
      [{ text: t("Vazgeç"), style: "cancel" }, { text: t("İptal et"), style: "destructive", onPress: () => {
        setEvents((es) => es.map((e) => e.id === id ? { ...e, status: "iptal", cancelReason: late ? "geç iptal" : null } : e));
        const gid = (chats.find((c) => c.type === "grup" && c.eventId === id) || {}).id;
        if (gid) pushMsg(gid, { from: "sys", text: `Maç iptal edildi (${ev.date}). Bilgi için organizatöre yazabilirsin.` });
        if (late) setUser((u) => ({ ...u, rel: relAfterNoShow(u.rel) }));
        showToast(late ? "İptal edildi · geç iptal güvenilirliğine işlendi" : "Etkinlik iptal edildi, kadroya bildirildi");
        setView({ name: "root" });
      } }]);
  };
  const leaveEvent = (id) => {
    const ev = events.find((e) => e.id === id); if (!ev) return;
    const h = hoursUntil(ev); const late = h != null && h < 24;
    Alert.alert(t("Kadrodan ayrıl"),
      late ? "Maça 24 saatten az kaldı. Şimdi ayrılırsan bu 'geç ayrılma' sayılır ve güvenilirliğin düşer. Yine de ayrılmak istiyor musun?"
           : "Kadrodan ayrılacaksın; yerin yeniden açılır ve organizatöre haber gider.",
      [{ text: t("Vazgeç"), style: "cancel" }, { text: t("Ayrıl"), style: "destructive", onPress: () => {
        const myApp = apps.find((x) => x.eventId === id && x.who === "me"); const pk = (myApp && myApp.position) || "farketmez";
        setEvents((es) => es.map((e) => e.id === id ? { ...e, joined: false, filled: Math.max(0, e.filled - 1), status: "acik",
          filledPos: { ...(e.filledPos || {}), [pk]: Math.max(0, ((e.filledPos || {})[pk] || 0) - 1) } } : e));
        setApps((a) => a.filter((x) => !(x.eventId === id && x.who === "me")));
        const gid = "g-" + id;
        setChats((cs) => cs.map((c) => c.id === gid && c.members ? { ...c, members: c.members.filter((m) => m.id !== "me"), sub: `${c.members.length - 1} üye` } : c));
        pushMsg(gid, { from: "sys", text: `${user.name} kadrodan ayrıldı · 1 eksik, başvurular yeniden açık` });
        if (late) setUser((u) => ({ ...u, rel: relAfterNoShow(u.rel) }));
        showToast(late ? "Ayrıldın · geç ayrılma güvenilirliğine işlendi" : "Kadrodan ayrıldın, organizatöre haber verildi");
        setView({ name: "root" });
      } }]);
  };

  const openNotif = (n) => {
    setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    const d = n.data || {};
    if (d.summary) { setSummaryOpen(true); return; }
    if (d.attendanceId) { setTab("home"); setView({ name: "attendance", id: d.attendanceId }); return; }
    if (d.rate) { setTab("home"); setView({ name: "rate", id: d.eventId || (pendingRatings[0] && pendingRatings[0].id) }); return; }
    if (d.chatId) { openChat(d.chatId); return; }
    if (d.eventId && events.some((e) => e.id === d.eventId)) { setTab("home"); setView({ name: "event", id: d.eventId }); return; }
    setView({ name: "root" });
  };
  const readAllNotifs = () => setNotifs((ns) => ns.map((x) => ({ ...x, read: true })));
  const unreadNotifs = notifs.filter((n) => !n.read).length;

  /* --- anket --- */
  const updatePoll = (chatId, pollId, fn) => setChats((cs) => cs.map((c) => c.id !== chatId ? c :
    { ...c, msgs: c.msgs.map((m) => (m.poll && m.poll.id === pollId ? { ...m, poll: fn(m.poll) } : m)) }));
  const castVote = (poll, voter, optionId, selected) => {
    const votes = { ...(poll.votes || {}) };
    Object.keys(votes).forEach((k) => { votes[k] = votes[k].filter((v) => v.id !== voter.id || (poll.multiple && k !== optionId)); });
    if (selected) votes[optionId] = [...(votes[optionId] || []), voter];
    return { ...poll, votes };
  };
  const createPoll = (chatId, question, options, multiple) => {
    const pollId = "poll-" + uid();
    const poll = { id: pollId, question, multiple, closed: false, createdBy: "me", options: options.map((t, i) => ({ id: OPTION_IDS[i], text: t })), votes: {} };
    pushMsg(chatId, { from: "me", text: "📊 " + question, poll });
    showToast(t("Anket gönderildi 📊"));
    // Demo: gruptan iki kişi birkaç saniye içinde oy verir
    const chat = chats.find((c) => c.id === chatId);
    const voters = (chat && chat.members ? chat.members : []).filter((m) => m.id !== "me").slice(0, 3);
    voters.forEach((m, i) => later(() => updatePoll(chatId, pollId, (p) => castVote(p, { id: m.id, name: m.name }, OPTION_IDS[(i + 1) % poll.options.length], true)), 2000 + i * 1500));
  };
  const vote = (chatId, pollId, optionId, selected) => updatePoll(chatId, pollId, (p) => castVote(p, { id: "me", name: user.name }, optionId, selected));
  const closePoll = (chatId, pollId) => { updatePoll(chatId, pollId, (p) => ({ ...p, closed: true })); showToast(t("Anket kapatıldı")); };

  /* --- var mısın (sabit kadro) --- */
  const groupOf = (ev) => chats.find((c) => c.type === "grup" && (c.eventId === ev.id || (c.seriesId && c.seriesId === ev.seriesId)));
  const askAvailability = (eventId) => {
    const ev = events.find((e) => e.id === eventId); const g = ev && groupOf(ev); if (!g) return;
    const pollId = "poll-varmisin-" + ev.id;
    const poll = { id: pollId, kind: "varmisin", eventId: ev.id, question: `Bu hafta var mısın? · ${ev.date}`, multiple: false, closed: false, createdBy: "me", options: VARMISIN_OPTIONS, votes: {} };
    pushMsg(g.id, { from: "me", text: "📊 " + poll.question, poll });
    setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, availabilityAsked: true } : e)));
    showToast(t("Sabit kadroya soruldu · cevaplar geldikçe özet güncellenir"));
    (g.members || []).filter((m) => m.id !== "me").forEach((m, i) =>
      later(() => updatePoll(g.id, pollId, (p) => castVote(p, { id: m.id, name: m.name }, i % 4 === 3 ? "yokum" : "varim", true)), 1500 + i * 700));
  };
  const answerAvailability = (eventId, optionId) => {
    const ev = events.find((e) => e.id === eventId); const av = ev && availabilityFor(ev, chats);
    if (!av || !av.pollId) return;
    updatePoll(av.chatId, av.pollId, (p) => castVote(p, { id: "me", name: user.name }, optionId, true));
    showToast(optionId === "varim" ? "Varım olarak işaretlendin ✅" : optionId === "yokum" ? "Yokum olarak işaretlendin — organizatör eksiği güncelleyebilir" : "Belli değil olarak işaretlendin");
  };
  const applySuggested = (eventId) => {
    const ev = events.find((e) => e.id === eventId); const av = ev && availabilityFor(ev, chats); if (!av) return;
    av.suggested = Math.max(av.suggested - guestPlayers(ev).length, ev.filled, 0);
    setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, needed: av.suggested, status: e.filled >= av.suggested ? "doldu" : "acik" } : e)));
    const g = groupOf(ev); if (g) pushMsg(g.id, { from: "sys", text: `Eksik sayısı güncellendi: ${av.suggested} · ${ev.date} · başvurular açık` });
    showToast(t("Eksik {p0} olarak güncellendi · kadroya duyuruldu", { p0: av.suggested }));
  };

  /* --- misafir oyuncular --- */
  const addGuest = (eventId, name, gk = false) => {
    const g = { id: "g-" + uid(), name, available: true, attendance: "bekleniyor", payment: "bekliyor" , gk };
    setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, guests: [...(e.guests || []), g] } : e)));
    showToast(t("{p0} eklendi · yoklama, ödeme ve kurada yer alır", { p0: name }));
  };
  const removeGuest = (eventId, guestId) => setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, guests: (e.guests || []).filter((g) => g.id !== guestId) } : e)));
  const toggleGuest = (eventId, guestId, available) => setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, guests: (e.guests || []).map((g) => (g.id === guestId ? { ...g, available } : g)) } : e)));
  const rosterWithGuests = (ev) => [...rosterFor(ev).map((m) => ({ ...m, checkedIn: (ev.checkedIns || []).includes(m.id) })), ...guestPlayers(ev)];

  /* --- takvim & yol tarifi --- */
  const calendarFor = async (ev) => {
    try { await addToCalendar(ev); showToast(t("Takvime eklendi · maçtan 2 saat önce hatırlatır 📅")); }
    catch (e) { const m = String(e && e.message); showToast(m.includes("TARIH_YOK") ? "Bu etkinliğin tarih bilgisi yok" : m.includes("IZIN_YOK") ? "Takvim izni verilmedi" : "Takvime eklenemedi"); }
  };
  const directionsFor = (ev) => yolSec(ev.venue || t("Saha"), ev.venueLat, ev.venueLng, `${ev.venue || ""} ${ev.city || user.city}`);

  /* --- sohbet: sabitleme, fotoğraf, sessize alma; sahadayım --- */
  const pinMessage = (chatId, msg) => { setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, pinned: msg ? { id: msg.id, text: msg.text || "📷 Fotoğraf" } : null } : c))); showToast(msg ? "Mesaj sabitlendi 📌" : "Sabitleme kaldırıldı"); };
  const sendImage = async (chatId) => { const uri = await pickPhoto(); if (!uri) return; pushMsg(chatId, { from: "me", image: uri, text: "" }); };
  const muteChat = (chatId, muted) => { setChats((cs) => cs.map((c) => (c.id === chatId ? { ...c, muted } : c))); showToast(muted ? "Grup sessize alındı" : "Bildirimler açıldı"); };
  const checkIn = (eventId) => { setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, checkedIn: true } : e))); showToast(t("Sahadayım dedin ✓ organizatör yoklamada görecek")); };
  const canPinIn = (chat) => !!chat && chat.type === "grup" && (chat.members || []).some((m) => m.id === "me" && m.role === "organizator");

  const copyToClipboard = async (text, msg = "IBAN kopyalandı 💳") => { const ok = await copyText(text); showToast(ok ? msg : t("Kopyalanamadı")); };
  const copyIbanFor = (eventId) => {
    const ev = events.find((e) => e.id === eventId); const g = ev ? groupOf(ev) : null;
    const gg = g || chats.find((c) => c.type === "grup" && c.eventId === eventId);
    const msg = gg && [...gg.msgs].reverse().find((m) => m.from === "sys" && extractIban(m.text));
    if (!msg) { showToast(t("Organizatör henüz IBAN göndermedi")); return; }
    copyToClipboard(extractIban(msg.text).raw);
  };

  const reactToMessage = (chatId, msgId, emoji) =>
    setChats((cs) => cs.map((c) => c.id !== chatId ? c : {
      ...c, msgs: c.msgs.map((m) => m.id !== msgId ? m : { ...m, reactions: toggleReaction(m.reactions, emoji, { id: "me", name: user.name }) }),
    }));

  const sendMessage = (chatId, text, replyTo = null) => {
    pushMsg(chatId, { from: "me", text, ...(replyTo ? { replyTo } : {}) });
    if (chatId === "g-e2" && !repliedRef.current) {
      repliedRef.current = true;
      later(() => pushMsg("g-e2", { from: "ozan", name: "Ozan Demir", text: "Anlaşıldı kaptan 👍" }, true, "Pazar Ligi Maçı"), 1600);
    }
  };

  /* ---------- yerleşim ---------- */
  if (!user && !onboarded) return <OnboardingScreen onDone={() => setOnboarded(true)} />;
  if (!user)
    return (
      <View style={{ flex: 1, backgroundColor: C.turf }}>
        <StatusBar style="light" />
        <SafeAreaView style={{ flex: 1 }}>
          <AuthScreen
            demoHint="Demo modu: SMS gelmez, kod 123456"
            error={authError}
            onSendCode={async () => { setAuthError(null); showToast(t("Demo: SMS kodu 123456")); return true; }}
            onVerify={async (code, u) => {
              if (code !== "123456") { setAuthError("Kod hatalı. Demo kodu: 123456"); return; }
              setAuthError(null);
              setUser({ ...u, name: u.name || "Emre Kaya", username: u.username || "emre_k", verified: true, positions: ["kaleci", "defans"], teamName: "Keçiören Kartalları", mvpCount: 1, paymentStats: { paid: 12, late: 1, overdue: 0, pct: 92 },
                        totals: { goals: 14, assists: 6, matches: 23 }, savedVenues: [{ name: "Arena Spor Tesisleri", district: "Keçiören", price: 120, used: 5 }, { name: "Yıldız Halı Saha", district: "Çankaya", price: 150, used: 2 }],
                        rating: 4.6, count: 12, rel: 92, joined: 23, noShow: 2, organized: 5, founder: true, streak: 7 });
            }}
          />
        </SafeAreaView>
      </View>
    );

  const activeChat = view.name === "chat" ? chats.find((c) => c.id === view.id) : null;
  const infoChat = view.name === "groupInfo" ? chats.find((c) => c.id === view.id) : null;
  const attendanceEvent = view.name === "attendance" ? events.find((e) => e.id === view.id) : null;
  const rateEvent = view.name === "rate" ? events.find((e) => e.id === view.id) : null;
  const lineupChat = view.name === "lineup" ? chats.find((c) => c.id === view.id) : null;
  const profileUser = view.name === "profile" ? findMember(view.id) : null;
  const activeEvent = view.name === "event" ? events.find((e) => e.id === view.id) : null;
  const applyEvent = view.name === "apply" ? events.find((e) => e.id === view.id) : null;
  const myAppFor = (evId) => apps.find((a) => a.eventId === evId && a.who === "me");
  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);
  const hideTabs = ["chat", "create", "settings", "groupInfo", "attendance", "notifications", "rate", "blocked", "profile", "lineup", "editProfile", "penalti", "kadroDene", "basket", "voleybol", "tenis", "teklifler", "kulup", "takim"].includes(view.name);
  const ustEkran = ["hub", "penalti", "kadroDene", "basket", "voleybol", "tenis", "teklifler", "kulup", "takim"].includes(view.name) || !!activeEvent || !!call;

  return (
    <View style={{ flex: 1, backgroundColor: C.turf }}>
      <StatusBar style="light" />
      {/* üst güvenli alan koyu çim, alt beyaz */}
      <SafeAreaView edges={["top"]} style={{ flex: 0, backgroundColor: C.turf }} />
      <SafeAreaView edges={["left", "right", "bottom"]} style={{ flex: 1, backgroundColor: C.surface }}>
        <View style={{ flex: 1, backgroundColor: C.chalk }}>
          {tab === "home" && !ustEkran && view.name !== "event" && (
            <HomeScreen
              user={user}
              events={events}
              onOpen={(id) => setView({ name: "event", id })}
              onAttendance={(id) => setView({ name: "attendance", id })}
              onChangeCity={(city) => { setUser((u) => ({ ...u, city, district: null })); showToast(t("{p0} etkinlikleri gösteriliyor", { p0: city })); }}
              onNotifications={() => setView({ name: "notifications" })}
              unreadCount={unreadNotifs}
              blockedIds={blocked.map((b) => b.id)}
              onCreate={() => setView({ name: "create" })} onBringTeam={() => setView({ name: "create", preset: "ekip" })}
            />
          )}
          {tab === "search" && !ustEkran && (
            <SearchScreen onSearchUsers={searchUsers} onSearchEvents={searchEvents} suggestions={suggestions}
              posts={posts} onLikePost={likePost} onDeletePost={removePost} onCompose={() => setComposer(true)}
              onOfferPost={() => showToast(t("💌 Teklif DM olarak iletildi (demo)"))}
              recent={recentSearches} onAddRecent={addRecent} onOpenUser={openProfile}
              onOpenEvent={(e) => { setTab("home"); setView({ name: "event", id: e.id }); }} />
          )}
          {tab === "chats" && !ustEkran && view.name !== "chat" && <ChatsScreen chats={chats} onOpen={openChat} />}
          {tab === "chats" && view.name === "chat" && activeChat && (
            <ChatRoomScreen
              chat={activeChat}
              apps={apps}
              rules={rulesFor(activeChat)}
              onCall={() => startCall(activeChat)}
              onInfo={() => openInfo(activeChat)}
              onLineup={() => setView({ name: "lineup", id: activeChat.id })}
              onCreatePoll={createPoll} onVote={vote} onClosePoll={closePoll} onCopy={copyToClipboard} onReact={reactToMessage}
              onPin={pinMessage} canPin={canPinIn(activeChat)} onSendImage={sendImage}
              onBack={() => setView({ name: "root" })}
              onSend={sendMessage}
              onConfirmJoin={confirmJoin}
              onGoChat={openChat}
            />
          )}
          {tab === "profile" && !ustEkran && view.name !== "settings" && (
            <ProfileScreen
              user={user}
              settings={settings}
              pendingRate={pendingRatings[0] || null}
              onRate={(id) => { setTab("home"); setView({ name: "rate", id }); }}
              events={events}
              team={team}
              onTeam={() => setView({ name: "team" })}
              sponsors={DEFAULT_SPONSORS}
              market={market} onOpenPlayer={(p) => p.userId !== "me" && openProfile(p.userId)}
              onEditListing={() => setView({ name: "editProfile" })}
              key={homeKind} initialKind={homeKind}
              onOfferPlayer={(p) => showToast(t("💌 Teklif DM olarak iletildi (demo)"))}
              onSponsor={(sp) => Linking.openURL(sp.url).catch(() => showToast(t("Bağlantı açılamadı")))}
              onOpenEvent={(id) => { setTab("home"); setView({ name: "event", id }); }}
              onPositionsChange={(list) => setUser((u) => ({ ...u, positions: list }))}
              marketMine={myListing} onMarket={() => setView({ name: "editProfile" })}
              onEdit={() => setView({ name: "editProfile" })}
              onBringTeam={() => setView({ name: "create", preset: "ekip" })}
              onSettings={() => setView({ name: "settings" })}
              onInvite={inviteFriends}
              onAvatar={(uri) => { setUser((u) => ({ ...u, avatar: uri })); showToast(uri ? "Fotoğrafın güncellendi 📸" : "Fotoğraf kaldırıldı"); }}
              onLogout={() => { setUser(null); setView({ name: "root" }); setTab("home"); }}
            />
          )}

          {/* ayarlar kaplama */}
          {view.name === "hub" && <HubScreen user={user} onGo={hubGo} />}
          {view.name === "penalti" && <PenaltyScreen onBack={() => setView({ name: "hub" })} />}
          {view.name === "basket" && <BasketScreen onBack={() => setView({ name: "hub" })} />}
          {view.name === "takim" && <TakimScreen meId="me"
            team={{ id: "dt", name: "Perşembe Gücü", emblem: "🔥" }}
            members={[{ id: "me", role: "kaptan", name: user.name, avatar: user.avatar, rating: user.rating },
                      { id: "zeynep", role: "oyuncu", name: "Zeynep Arslan", rating: 4.9 }]}
            onBack={() => setView({ name: "hub" })}
            onSave={() => showToast(t("Takım güncellendi 🛡"))} onRemove={() => showToast(t("Çıkarıldı"))}
            onLeave={() => setView({ name: "hub" })} onCreateTeam={() => {}}
            onGoMarket={() => { setHomeKind("pazar"); setTab("home"); setView({ name: "root" }); }}
            onGoClub={() => setView({ name: "kulup" })} onOpenUser={() => {}} />}
          {view.name === "teklifler" && <OffersScreen offers={demoOffers} onBack={() => setView({ name: "hub" })}
            onDecide={(id, st2) => { setDemoOffers((o) => o.map((x) => x.id === id ? { ...x, status: st2 } : x)); if (st2 === "kabul") showToast(t("Kadroya işlendi ✅")); }}
            onCancel={(id) => setDemoOffers((o) => o.map((x) => x.id === id ? { ...x, status: "iptal" } : x))}
            onOpenUser={() => {}} />}
          {view.name === "kulup" && <ClubBoardScreen meId="me" myTeam={null}
            rows={[{ teamId: "d1", name: "Boğaziçi Yıldızları", emblem: "⚡", bio: "Çarşamba maçlarına düzenli stoper arıyoruz.", ownerId: "zeynep", cat: 1, uye: 9, positions: ["stoper", "kaleci"] }]} appliedIds={[]}
            onBack={() => setView({ name: "hub" })}
            onApply={() => showToast(t("Başvurun iletildi 🙋"))}
            onPublish={() => showToast(t("İlan yayında 📣"))} onCloseListing={() => {}}
            onCreateTeam={() => showToast(t("Takım kurma canlı modda 🛡"))} />}
          {view.name === "voleybol" && <VolleyScreen onBack={() => setView({ name: "hub" })} />}
          {view.name === "tenis" && <TennisScreen onBack={() => setView({ name: "hub" })} />}
          {view.name === "kadroDene" && <KadroDeneScreen onBack={() => setView({ name: "hub" })} />}
          {view.name === "settings" && (
            <View style={StyleSheet.absoluteFill}>
              <SettingsScreen
                settings={settings}
                onChange={setSettings}
                onBack={() => setView({ name: "root" })}
                onDeleteAccount={() => { setUser(null); setView({ name: "root" }); setTab("home"); showToast(t("Hesabın silindi. Umarız yine görüşürüz ⚽")); }}
                blockedCount={blocked.length}
                onBlocked={() => setView({ name: "blocked" })}
                paymentDetails={paymentDetails} onSaveIban={saveIban} onTheme={saveTheme} onLang={saveLang}
              />
            </View>
          )}

          {/* takım profili kaplama */}
          {view.name === "team" && (
            <View style={StyleSheet.absoluteFill}>
              <TeamScreen
                team={team}
                user={user}
                roster={team.roster}
                weeklyEvent={events.find((e) => e.seriesId && e.seriesId === team.seriesId && !e.ended && e.status !== "iptal") || null}
                onBack={() => setView({ name: "root" })}
                onSave={(f) => { setTeam((tm) => ({ ...tm, ...f })); if (f.name) setUser((u) => ({ ...u, teamName: f.name })); showToast(t("Takım profili güncellendi")); }}
                onMember={openProfile}
                onOpenEvent={(id) => { setTab("home"); setView({ name: "event", id }); }}
                onFindOpponent={() => setView({ name: "create", preset: "rakip" })}
                onInvite={(ev) => Share.share({ message: buildTeamInvite(ev, user) }).catch(() => {})}
              />
            </View>
          )}

          {/* etkinlik detayı kaplama */}
          {activeEvent && (
            <View style={StyleSheet.absoluteFill}>
              <EventDetailScreen
                ev={activeEvent}
                apps={apps}
                myApp={myAppFor(activeEvent.id)}
                roster={activeEvent.ended ? rosterFor(activeEvent) : []}
                onAttendance={(id) => setView({ name: "attendance", id })}
                onDispute={disputeAttendance}
                onShare={shareEvent}
                onEdit={(id) => setView({ name: "create", id })}
                onCancel={cancelEvent}
                onLeave={leaveEvent}
                onRate={(id) => setView({ name: "rate", id })}
                rated={ratedEvents.includes(activeEvent.id)}
                onOrganizer={(org) => setView({ name: "profile", id: org.id })}
                onAcceptInvite={confirmJoin}
                onDeclineInvite={declineInvite}
                availability={(() => { const a = availabilityFor(activeEvent, chats); if (a) a.suggested = Math.max(a.suggested - guestPlayers(activeEvent).length, activeEvent.filled, 0); return a; })()}
                onAskAvailability={askAvailability} onApplySuggested={applySuggested} onAnswer={answerAvailability}
                onRecordScore={recordScore} myMvpVote={mvpVotes[activeEvent.id] || null}
                onClaimPayment={claimPayment} onConfirmPayment={confirmPayment} onSendIban={sendIban} onRemindPayments={remindPayments} onCopyIban={copyIbanFor}
                onCalendar={calendarFor} onDirections={directionsFor} onAddGuest={addGuest} onAddGuests={(evId, list) => list.forEach((p) => addGuest(evId, p.name, p.gk))} onRepeat={(ev) => setView({ name: "create", repeat: true, initial: cloneForRepeat(ev) })} onRemoveGuest={removeGuest} onToggleGuest={toggleGuest}
                onCheckIn={checkIn} onConfirmAllPayments={confirmAllPayments}
                statRoster={rosterWithGuests(activeEvent).filter((m) => (activeEvent.attendance || {})[m.id] !== "gelmedi")} onSetStat={setStat} onShareSummary={shareSummary}
                checkinCode={checkinCodes[activeEvent.id] || null} onOpenCode={openCode} onCheckInWithCode={checkInWithCode}
                onJoinWaitlist={(id) => setWaitEvent(events.find((e) => e.id === id) || null)}
                onLeaveWaitlist={leaveWaitlist}
                onBack={() => setView({ name: "root" })}
                onApply={() => setView({ name: "apply", id: activeEvent.id })}
                onApprove={approveApp}
                onReject={rejectApp}
                onGoChat={openChat}
              />
            </View>
          )}

          {/* oluşturma ekranı kaplama */}
          {view.name === "create" && (
            <View style={StyleSheet.absoluteFill}>
              <CreateScreen
                user={user}
                preset={view.preset || null}
                initial={view.id ? events.find((e) => e.id === view.id) : (view.initial || null)} repeat={!!view.repeat}
                onBack={() => setView(view.id ? { name: "event", id: view.id } : { name: "root" })}
                onCreate={(f) => (view.id ? updateEvent(view.id, f) : createEvent(f))}
                onListVenues={(city, cat, q) => Promise.resolve(filterVenues(communityVenues.filter((v) => v.city === city && v.category_id === cat), q))}
                onAddVenue={(city, cat, name, lat, lng) => {
                  const v = { id: uid(), city, category_id: cat, name, lat, lng };
                  setCommunityVenues((cs) => mergeVenues(cs, [v]));
                  return Promise.resolve(v);
                }}
              />
            </View>
          )}

          {/* puanlama kaplama */}
          {rateEvent && (
            <View style={StyleSheet.absoluteFill}>
              <RateScreen event={rateEvent} people={peopleFor(rateEvent)} myMvpVote={mvpVotes[rateEvent.id] || null} onBack={() => setView({ name: "event", id: rateEvent.id })} onSubmit={(r, mvpId) => submitRatings(rateEvent.id, r, mvpId)} />
            </View>
          )}
          {profileUser && (
            <View style={StyleSheet.absoluteFill}>
              <UserProfileScreen
                listing={(() => { const l = market.find((x) => profileUser && x.userId === profileUser.id); return l ? { cat: l.cat, positions: l.positions, bio: l.bio } : null; })()}
                posts={posts.filter((p) => profileUser && p.userId === profileUser.id)}
                onOffer={() => showToast(t("💌 Teklif DM olarak iletildi (demo)"))}
                onTeamInvite={() => showToast(t("🏆 Takım daveti DM olarak gitti (demo)"))}
                user={{ ...profileUser, verified: true, joined: profileUser.count != null ? Math.max(profileUser.count, 5) : undefined, organized: ORGS[profileUser.id] ? 5 : 1 }}
                comments={[...(givenRatings[profileUser.id] || []), ...commentsFor(profileUser)]}
                rules={rulesForMember(profileUser)} blocked={isBlocked(profileUser.id)}
                onBack={() => setView({ name: "root" })} onMessage={messageMember} onCall={callMember}
                onBlock={(m) => { toggleBlock(m); }} onReport={(m) => setReportTarget(m)}
                onInvite={myOpenEvents.length ? (m) => setInviteTarget(m) : undefined} />
            </View>
          )}
          {view.name === "editProfile" && (
            <View style={StyleSheet.absoluteFill}>
              <EditProfileScreen user={user} marketMine={myListing} onSaveListing={saveListing} onDropListing={dropListing} onBack={() => setView({ name: "root" })}
                onSave={(f) => { setUser((u) => ({ ...u, ...f, district: f.district || null })); setView({ name: "root" }); showToast(t("Profilin güncellendi")); }} />
            </View>
          )}
          {view.name === "blocked" && (
            <View style={StyleSheet.absoluteFill}>
              <BlockedScreen blocked={blocked} onBack={() => setView({ name: "settings" })} onUnblock={toggleBlock} />
            </View>
          )}

          {/* bildirimler kaplama */}
          {lineupChat && (
            <View style={StyleSheet.absoluteFill}>
              <LineupScreen
                title={lineupChat.title}
                players={[...(lineupChat.members || []).map((m) => (m.id === "me" ? { ...user, id: "me", role: m.role, positions: (user.positions || []) } : m)), ...guestPlayers(events.find((e) => e.id === lineupChat.eventId) || {})]}
                onBack={() => setView({ name: "groupInfo", id: lineupChat.id })}
                onSend={(text) => { sendMessage(lineupChat.id, text); showToast(t("Kura gruba gönderildi ⚽")); setView({ name: "chat", id: lineupChat.id }); }}
              />
            </View>
          )}
          {view.name === "notifications" && (
            <View style={StyleSheet.absoluteFill}>
              <NotificationsScreen attendance={events.filter((e) => e.mine && e.ended && e.status !== "tamamlandi")} onAttendance={(id) => setView({ name: "attendance", id })}
                notifications={notifs}
                onBack={() => setView({ name: "root" })}
                onOpen={openNotif}
                onReadAll={readAllNotifs}
                onSettings={() => setView({ name: "settings" })}
              />
            </View>
          )}

          {/* yoklama kaplama */}
          {attendanceEvent && (
            <View style={StyleSheet.absoluteFill}>
              <AttendanceScreen
                event={attendanceEvent}
                roster={rosterWithGuests(attendanceEvent)}
                onBack={() => setView({ name: "event", id: attendanceEvent.id })}
                onSave={(marks) => saveAttendance(attendanceEvent.id, marks)}
              />
            </View>
          )}

          {/* grup bilgisi kaplama */}
          {infoChat && (
            <View style={StyleSheet.absoluteFill}>
              <GroupInfoScreen
                chat={infoChat}
                event={infoChat.eventId ? events.find((e) => e.id === infoChat.eventId) : null}
                me={me}
                onBack={() => setView({ name: "chat", id: infoChat.id })}
                onOpenEvent={(id) => { setTab("home"); setView({ name: "event", id }); }}
                onSelectMember={(member) => setMemberSheet({ member, chatId: infoChat.id })}
                onLineup={() => setView({ name: "lineup", id: infoChat.id })}
                guests={(events.find((e) => e.id === infoChat.eventId) || {}).guests || []}
                onMute={muteChat} season={seasonFor(infoChat)}
              />
            </View>
          )}

          {/* aktif arama kaplama */}
          {call && (
            <View style={StyleSheet.absoluteFill}>
              <CallScreen call={call} onEnd={endCall} />
            </View>
          )}

          {memberSheet && (
            <MemberSheet
              member={memberSheet.member}
              rules={rulesForMember(memberSheet.member)}
              canRemove={
                !!memberSheet.chatId && memberSheet.member.id !== "me" && memberSheet.member.role !== "organizator" &&
                !!chats.find((c) => c.id === memberSheet.chatId && c.members &&
                  c.members.some((m) => m.id === "me" && m.role === "organizator"))
              }
              onClose={() => setMemberSheet(null)}
              onMessage={messageMember}
              onCall={callMember}
              onRemove={(member) => removeMember(memberSheet.chatId, member)}
              blocked={isBlocked(memberSheet.member.id)}
              onBlock={toggleBlock}
              onReport={(member) => setReportTarget(member)}
              onProfile={openProfile}
              onInvite={myOpenEvents.length ? (m) => { setMemberSheet(null); setInviteTarget(m); } : undefined}
            />
          )}
          <PickerSheet
            visible={!!inviteTarget}
            title={inviteTarget ? `${inviteTarget.name.split(" ")[0]} — hangi kadroya davet edelim?` : "Davet"}
            items={myOpenEvents.map((e) => ({ label: `${e.title} · ${e.date}`, sub: `${e.needed - e.filled} eksik` }))}
            value={null}
            onSelect={(label) => { const ev = myOpenEvents.find((e) => `${e.title} · ${e.date}` === label); if (ev && inviteTarget) inviteTo(inviteTarget, ev); }}
            onClose={() => setInviteTarget(null)}
            placeholder={t("Etkinlik ara…")}
          />
          <PickerSheet
            visible={!!reportTarget}
            title={reportTarget ? `${reportTarget.name.split(" ")[0]} için şikayet nedeni` : "Şikayet"}
            items={REPORT_REASONS.map((r) => r.label)}
            value={null}
            onSelect={submitReport}
            onClose={() => setReportTarget(null)}
            placeholder={t("Neden ara…")}
          />

          {summaryOpen && (
            <SummarySheet
              digest={buildWeeklyDigest(user, events)}
              onClose={() => setSummaryOpen(false)}
              onOpenEvent={(id) => { setSummaryOpen(false); setTab("home"); setView({ name: "event", id }); }}
              onShare={() => Share.share({ message: buildDigestShare(user, buildWeeklyDigest(user, events), APP_LINK) }).catch(() => {})}
            />
          )}

          <VenueSheet visible={venueHub} onClose={() => setVenueHub(false)} cityName={user.city}
        categoryName={t("Halı Saha")}
        onList={(q) => Promise.resolve(filterVenues(communityVenues.filter((v) => v.city === user.city && v.category_id === 1), q))}
        onAdd={(name, lat, lng) => Promise.resolve({ name, lat, lng })}
        onPick={(v) => { setVenueHub(false); yolSec(v.name, v.lat, v.lng, `${v.name} ${user.city}`); }} />
      <PostComposer visible={composer} onClose={() => setComposer(false)}
        hasListing={!!(myListing && myListing.active !== false)} onShare={sharePost} />
      <Toast text={toast} />

          {/* alt sekme çubuğu */}
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
                  <Ionicons
                    name={tab === "chats" ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                    size={22}
                    color={tab === "chats" ? C.turfText : C.gray}
                  />
                  {totalUnread > 0 && (
                    <View style={st.tabBadge}>
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>{totalUnread}</Text>
                    </View>
                  )}
                </View>
                <Text style={[st.tabLabel, { color: tab === "chats" ? C.turfText : C.gray }]}>{t("tab.chats")}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("profile"); setView({ name: "root" }); }}>
                <Ionicons name={tab === "profile" ? "person" : "person-outline"} size={22} color={tab === "profile" ? C.turfText : C.gray} />
                <Text style={[st.tabLabel, { color: tab === "profile" ? C.turfText : C.gray }]}>{t("tab.profile")}</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* alt sayfalar */}
          <ApplySheet
            visible={!!waitEvent}
            ev={waitEvent}
            mode="yedek"
            myPositions={user.positions || []}
            onClose={() => setWaitEvent(null)}
            onSend={(note, position) => waitEvent && joinWaitlist(waitEvent, position)}
          />
          <ApplySheet
            visible={view.name === "apply"}
            ev={applyEvent}
            onClose={() => applyEvent && setView({ name: "event", id: applyEvent.id })}
            myPositions={user.positions || []}
            onSend={(note, position) => applyEvent && applyToEvent(applyEvent, note, position)}
          />

        </View>
      </SafeAreaView>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  tabbar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around",
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line,
    paddingTop: 8, paddingBottom: 10, paddingHorizontal: 8,
  },
  tabBtn: { alignItems: "center", gap: 2, paddingHorizontal: 8 },
  tabLabel: { fontSize: 10, fontWeight: "800" },
  fab: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.kit,
    alignItems: "center", justifyContent: "center", marginTop: -30,
    elevation: 6,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  tabBadge: {
    position: "absolute", top: -4, right: -8,
    backgroundColor: C.pitch, borderRadius: 8, minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
  },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
