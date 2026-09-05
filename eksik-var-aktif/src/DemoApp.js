import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, SafeAreaView, Share,
  Platform, StatusBar as RNStatusBar, StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { C } from "./theme";
import { SEED_EVENTS, SEED_CHATS, SEED_APPS, ORGS, DEFAULT_SETTINGS, contactRules, genMembers, memberFromOrg, relAfterShow, relAfterNoShow, fmtEventDate, addDays, GUNLER_UZUN, buildShareText, buildInviteText, SEED_NOTIFS, REPORT_REASONS, applyRating, hoursUntil, nowTime, uid } from "./data";
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
import { ApplySheet } from "./screens/sheets";
import { Alert } from "react-native";

export default function DemoApp() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [view, setView] = useState({ name: "root" });
  const [events, setEvents] = useState(SEED_EVENTS);
  const [chats, setChats] = useState(SEED_CHATS);
  const [apps, setApps] = useState(SEED_APPS);
  const [ratedEvents, setRatedEvents] = useState([]);       // puanladığım etkinlikler
  const [blocked, setBlocked] = useState([]);                 // engellediğim kişiler
  const [reportTarget, setReportTarget] = useState(null);     // şikayet edilen üye
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS); // iletişim + bildirim tercihleri
  const [call, setCall] = useState(null);                     // aktif arama: { chatId, name }
  const [memberSheet, setMemberSheet] = useState(null);       // açık üye kartı: { member, chatId }
  const [notifs, setNotifs] = useState(SEED_NOTIFS);           // bildirimler (en yeni önde)

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
  const applyToEvent = (ev, note) => {
    const appId = "app-" + ev.id;
    setApps((a) => [...a, { id: appId, eventId: ev.id, who: "me", status: "beklemede" }]);
    const chatId = "dm-" + ev.id;
    setChats((cs) => [
      {
        id: chatId, type: "birebir", eventId: ev.id, otherId: ev.org.id, title: ev.org.name,
        sub: `"${ev.title}" başvurusu`, unread: 0, lastTime: "Şimdi",
        msgs: [
          { id: uid(), from: "sys", text: `"${ev.title}" için başvuru sohbeti açıldı`, time: nowTime() },
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

    setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "onaylandi" } : x)));
    setEvents((es) =>
      es.map((e) =>
        e.id === ev.id
          ? { ...e, filled: newFilled, joined: true, status: full ? "doldu" : e.status }
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
    setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "orgBekliyor" } : x)));
    showToast(`Onayladın · ${app.who.name.split(" ")[0]}'ın son onayı bekleniyor`);
    later(() => {
      setApps((a) => a.map((x) => (x.id === appId ? { ...x, status: "onaylandi" } : x)));
      setEvents((es) =>
        es.map((e) => {
          if (e.id !== app.eventId) return e;
          const nf = e.filled + 1;
          return { ...e, filled: nf, status: nf >= e.needed ? "doldu" : e.status };
        })
      );
      setChats((cs) => cs.map((c) => {
        if (c.id !== "g-" + app.eventId || !c.members) return c;
        const members = [...c.members, memberFromOrg(app.who, "uye", "uygulama")];
        return { ...c, members, sub: `${members.length} üye` };
      }));
      pushMsg("g-e2", { from: "sys", text: `${app.who.name} kadroya katıldı` }, true);
      later(() => pushMsg("g-e2", { from: app.who.id, name: app.who.name, text: "Eyvallah hocam, pazar oradayım 💪" }, true, "Pazar Ligi Maçı"), 900);
      const target = events.find((e) => e.id === app.eventId);
      const willFill = target && target.filled + 1 >= target.needed;
      addNotif(willFill ? "doldu" : "kadro", willFill ? "Kadro tamamlandı 🏆" : "Kadroya katılım",
        `${app.who.name} onayladı ve kadroya eklendi${willFill ? " · kontenjan doldu" : ""}`, { eventId: app.eventId });
      showToast(`${app.who.name.split(" ")[0]} kadroya eklendi 🎉`);
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
      recurrence: weekly ? "haftalik" : "yok", seriesId: weekly ? id : null,
      recurrenceUntil: weekly && f.weeks ? addDays(f.dateISO, f.weeks * 7 - 1) : null,
      price: Number(f.price) || 0, capacity: Number(f.capacity),
      needed: Number(f.needed), filled: 0, level: f.level, status: "acik",
      org: null, joined: false, mine: true,
      desc: f.desc || "Detaylar için mesaj atabilirsin.",
    };
    setEvents((es) => [ev, ...es]);
    const members = [{ id: "me", role: "organizator", via: "ekip" }, ...genMembers(ev.capacity - ev.needed - 1, id, "ekip")];
    setChats((cs) => [
      {
        id: "g-" + id, type: "grup", eventId: id, seriesId: ev.seriesId, title: f.title, members,
        sub: `${members.length} üye`, unread: 0, lastTime: "Şimdi",
        msgs: [{
          id: uid(), from: "sys", time: nowTime(),
          text: weekly
            ? `Ekip grubu kuruldu · Her ${GUNLER_UZUN[f.weekday]} ${f.time}. Her hafta o haftanın eksikleri buraya eklenir`
            : "Grubu oluşturdun · Onaylanan oyuncular buraya eklenir",
        }],
      },
      ...cs,
    ]);
    setTab("home");
    setView({ name: "event", id });
    showToast(weekly ? `Haftalık seri yayında 🔁 Her ${GUNLER_UZUN[f.weekday]} ${f.time}` : "Talebin yayında 🚀 Grup sohbeti kuruldu");
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

  const startCall = (chat) => {
    const r = rulesFor(chat);
    if (r && !r.canCall) { showToast(r.callReason); return; }
    setCall({ chatId: chat.id, name: chat.title });
  };

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

  const callMember = (member) => {
    const r = rulesForMember(member);
    if (!r.canCall) { showToast(r.callReason); return; }
    const c = ensureDirectChat(member);
    setMemberSheet(null);
    setCall({ chatId: c.id, name: member.name, avatar: member.avatar });
  };

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
    showToast(`${member.name.split(" ")[0]} kadrodan çıkarıldı · kontenjan yeniden açıldı`);
  };

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

    setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, status: "tamamlandi", attendance: marks } : e)));
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
      showToast(`Maç tamamlandı · Gelecek hafta otomatik açıldı (${next.date})`);
    } else {
      showToast(`Maç tamamlandı · ${katildi} katıldı, ${gelmedi} gelmedi`);
    }
    addNotif("puanlama", `${ev.title} tamamlandı`, "Takım arkadaşlarını puanla", { rate: true });
    setView({ name: "event", id: eventId });
  };

  const disputeAttendance = (eventId) => {
    setEvents((es) => es.map((e) => (e.id === eventId ? { ...e, disputed: true } : e)));
    showToast("İtirazın organizatöre ve destek ekibine iletildi");
  };

  /* --- paylaşım (telefonun paylaşım menüsü: WhatsApp, Telegram, SMS...) --- */
  const shareEvent = async (ev) => {
    try {
      const res = await Share.share({ message: buildShareText(ev, user) });
      if (res.action === Share.sharedAction) showToast("Paylaşıldı 🚀 Gelen başvurular burada görünecek");
    } catch (e) {
      showToast("Paylaşım açılamadı");
    }
  };
  const inviteFriends = async () => {
    try {
      const res = await Share.share({ message: buildInviteText(user) });
      if (res.action === Share.sharedAction) showToast("Davet gönderildi 🙌");
    } catch (e) {
      showToast("Paylaşım açılamadı");
    }
  };

  /* --- engelleme & şikayet --- */
  const toggleBlock = (member) => {
    if (isBlocked(member.id)) { setBlocked((b) => b.filter((x) => x.id !== member.id)); showToast(`${member.name.split(" ")[0]} için engel kaldırıldı`); }
    else { setBlocked((b) => [...b, member]); setMemberSheet(null); showToast(`${member.name.split(" ")[0]} engellendi`); }
  };
  const submitReport = (reasonLabel) => {
    const r = REPORT_REASONS.find((x) => x.label === reasonLabel);
    setReportTarget(null); setMemberSheet(null);
    showToast(`Şikayetin iletildi (${r ? r.label.toLowerCase() : "diğer"}) · inceleniyor`);
  };

  /* --- puanlama --- */
  const pendingRatings = events.filter((e) => e.status === "tamamlandi" && (e.joined || e.mine) && !ratedEvents.includes(e.id));
  const peopleFor = (ev) => {
    const people = rosterFor(ev).slice();
    if (!ev.mine && ev.org) people.unshift({ ...memberFromOrg(ev.org, "organizator", "ekip") });
    return people;
  };
  const submitRatings = (eventId, ratings) => {
    const ev = events.find((e) => e.id === eventId);
    const given = Object.entries(ratings).filter(([, r]) => r.stars > 0);
    // grup üyelerinin ve organizatörün ortalaması güncellenir (sunucuda ratings tablosu + trigger yapar)
    setChats((cs) => cs.map((c) => c.type === "grup" && c.members
      ? { ...c, members: c.members.map((m) => ratings[m.id] && ratings[m.id].stars ? applyRating(m, ratings[m.id].stars) : m) } : c));
    if (ev && ev.org && ratings[ev.org.id] && ratings[ev.org.id].stars) {
      const upd = applyRating(ev.org, ratings[ev.org.id].stars);
      setEvents((es) => es.map((e) => e.org && e.org.id === ev.org.id ? { ...e, org: { ...e.org, rating: upd.rating, count: upd.count } } : e));
    }
    setRatedEvents((r) => [...r, eventId]);
    setNotifs((ns) => ns.map((n) => n.type === "puanlama" && n.data && n.data.eventId === eventId ? { ...n, read: true } : n));
    showToast(`${given.length} puan kaydedildi ⭐ Teşekkürler`);
    setView({ name: "event", id: eventId });
  };

  /* --- etkinlik yönetimi --- */
  const updateEvent = (id, f) => {
    const gid = (chats.find((c) => c.type === "grup" && c.eventId === id) || {}).id;
    const date = fmtEventDate(f.dateISO, f.time);
    setEvents((es) => es.map((e) => e.id === id ? {
      ...e, title: f.title, cat: Number(f.cat), city: f.city, district: f.district, venue: f.venue,
      dateISO: f.dateISO, time: f.time, weekday: f.weekday, date, price: Number(f.price) || 0,
      capacity: Number(f.capacity), needed: Number(f.needed), level: f.level, desc: f.desc || e.desc,
      status: e.filled >= Number(f.needed) ? "doldu" : "acik",
    } : e));
    if (gid) pushMsg(gid, { from: "sys", text: `Etkinlik güncellendi: ${date} · ${f.venue}` });
    showToast("Değişiklikler kaydedildi · kadroya duyuruldu");
    setView({ name: "event", id });
  };
  const cancelEvent = (id) => {
    const ev = events.find((e) => e.id === id); if (!ev) return;
    const h = hoursUntil(ev); const late = h != null && h < 24;
    Alert.alert("Etkinliği iptal et",
      `${ev.title} iptal edilecek, kadrodakilere bildirim gidecek.${late ? " Maça 24 saatten az kaldığı için geç iptal olarak kaydedilir ve güvenilirliğini etkiler." : ""}`,
      [{ text: "Vazgeç", style: "cancel" }, { text: "İptal et", style: "destructive", onPress: () => {
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
    Alert.alert("Kadrodan ayrıl",
      late ? "Maça 24 saatten az kaldı. Şimdi ayrılırsan bu 'geç ayrılma' sayılır ve güvenilirliğin düşer. Yine de ayrılmak istiyor musun?"
           : "Kadrodan ayrılacaksın; yerin yeniden açılır ve organizatöre haber gider.",
      [{ text: "Vazgeç", style: "cancel" }, { text: "Ayrıl", style: "destructive", onPress: () => {
        setEvents((es) => es.map((e) => e.id === id ? { ...e, joined: false, filled: Math.max(0, e.filled - 1), status: "acik" } : e));
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
    if (d.attendanceId) { setTab("home"); setView({ name: "attendance", id: d.attendanceId }); return; }
    if (d.rate) { setTab("home"); setView({ name: "rate", id: d.eventId || (pendingRatings[0] && pendingRatings[0].id) }); return; }
    if (d.chatId) { openChat(d.chatId); return; }
    if (d.eventId && events.some((e) => e.id === d.eventId)) { setTab("home"); setView({ name: "event", id: d.eventId }); return; }
    setView({ name: "root" });
  };
  const readAllNotifs = () => setNotifs((ns) => ns.map((x) => ({ ...x, read: true })));
  const unreadNotifs = notifs.filter((n) => !n.read).length;

  const sendMessage = (chatId, text) => {
    pushMsg(chatId, { from: "me", text });
    if (chatId === "g-e2" && !repliedRef.current) {
      repliedRef.current = true;
      later(() => pushMsg("g-e2", { from: "ozan", name: "Ozan Demir", text: "Anlaşıldı kaptan 👍" }, true, "Pazar Ligi Maçı"), 1600);
    }
  };

  /* ---------- yerleşim ---------- */
  if (!user)
    return (
      <View style={{ flex: 1, backgroundColor: C.turf }}>
        <StatusBar style="light" />
        <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0 }}>
          <AuthScreen
            onLogin={(u) =>
              setUser({ ...u, rating: 4.6, count: 12, rel: 92, joined: 23, noShow: 2, organized: 5 })
            }
          />
        </SafeAreaView>
      </View>
    );

  const activeChat = view.name === "chat" ? chats.find((c) => c.id === view.id) : null;
  const infoChat = view.name === "groupInfo" ? chats.find((c) => c.id === view.id) : null;
  const attendanceEvent = view.name === "attendance" ? events.find((e) => e.id === view.id) : null;
  const rateEvent = view.name === "rate" ? events.find((e) => e.id === view.id) : null;
  const activeEvent = view.name === "event" ? events.find((e) => e.id === view.id) : null;
  const applyEvent = view.name === "apply" ? events.find((e) => e.id === view.id) : null;
  const myAppFor = (evId) => apps.find((a) => a.eventId === evId && a.who === "me");
  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);
  const hideTabs = ["chat", "create", "settings", "groupInfo", "attendance", "notifications", "rate", "blocked"].includes(view.name) || !!activeEvent || !!call;

  return (
    <View style={{ flex: 1, backgroundColor: C.turf }}>
      <StatusBar style="light" />
      {/* üst güvenli alan koyu çim, alt beyaz */}
      <SafeAreaView style={{ flex: 0, backgroundColor: C.turf, paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0 }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ flex: 1, backgroundColor: C.chalk }}>
          {tab === "home" && view.name !== "event" && (
            <HomeScreen
              user={user}
              events={events}
              onOpen={(id) => setView({ name: "event", id })}
              onAttendance={(id) => setView({ name: "attendance", id })}
              onChangeCity={(city) => { setUser((u) => ({ ...u, city, district: null })); showToast(`${city} etkinlikleri gösteriliyor`); }}
              onNotifications={() => setView({ name: "notifications" })}
              unreadCount={unreadNotifs}
              blockedIds={blocked.map((b) => b.id)}
            />
          )}
          {tab === "chats" && view.name !== "chat" && <ChatsScreen chats={chats} onOpen={openChat} />}
          {tab === "chats" && view.name === "chat" && activeChat && (
            <ChatRoomScreen
              chat={activeChat}
              apps={apps}
              rules={rulesFor(activeChat)}
              onCall={() => startCall(activeChat)}
              onInfo={() => openInfo(activeChat)}
              onBack={() => setView({ name: "root" })}
              onSend={sendMessage}
              onConfirmJoin={confirmJoin}
              onGoChat={openChat}
            />
          )}
          {tab === "profile" && view.name !== "settings" && (
            <ProfileScreen
              user={user}
              settings={settings}
              pendingRate={pendingRatings[0] || null}
              onRate={(id) => { setTab("home"); setView({ name: "rate", id }); }}
              events={events}
              onOpenEvent={(id) => { setTab("home"); setView({ name: "event", id }); }}
              onSettings={() => setView({ name: "settings" })}
              onInvite={inviteFriends}
              onAvatar={(uri) => { setUser((u) => ({ ...u, avatar: uri })); showToast(uri ? "Fotoğrafın güncellendi 📸" : "Fotoğraf kaldırıldı"); }}
              onLogout={() => { setUser(null); setView({ name: "root" }); setTab("home"); }}
            />
          )}

          {/* ayarlar kaplama */}
          {view.name === "settings" && (
            <View style={StyleSheet.absoluteFill}>
              <SettingsScreen
                settings={settings}
                onChange={setSettings}
                onBack={() => setView({ name: "root" })}
                onDeleteAccount={() => { setUser(null); setView({ name: "root" }); setTab("home"); showToast("Hesabın silindi. Umarız yine görüşürüz ⚽"); }}
                blockedCount={blocked.length}
                onBlocked={() => setView({ name: "blocked" })}
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
                initial={view.id ? events.find((e) => e.id === view.id) : null}
                onBack={() => setView(view.id ? { name: "event", id: view.id } : { name: "root" })}
                onCreate={(f) => (view.id ? updateEvent(view.id, f) : createEvent(f))}
              />
            </View>
          )}

          {/* puanlama kaplama */}
          {rateEvent && (
            <View style={StyleSheet.absoluteFill}>
              <RateScreen event={rateEvent} people={peopleFor(rateEvent)} onBack={() => setView({ name: "event", id: rateEvent.id })} onSubmit={(r) => submitRatings(rateEvent.id, r)} />
            </View>
          )}
          {view.name === "blocked" && (
            <View style={StyleSheet.absoluteFill}>
              <BlockedScreen blocked={blocked} onBack={() => setView({ name: "settings" })} onUnblock={toggleBlock} />
            </View>
          )}

          {/* bildirimler kaplama */}
          {view.name === "notifications" && (
            <View style={StyleSheet.absoluteFill}>
              <NotificationsScreen
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
                roster={rosterFor(attendanceEvent)}
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
            />
          )}
          <PickerSheet
            visible={!!reportTarget}
            title={reportTarget ? `${reportTarget.name.split(" ")[0]} için şikayet nedeni` : "Şikayet"}
            items={REPORT_REASONS.map((r) => r.label)}
            value={null}
            onSelect={submitReport}
            onClose={() => setReportTarget(null)}
            placeholder="Neden ara…"
          />

          <Toast text={toast} />

          {/* alt sekme çubuğu */}
          {!hideTabs && (
            <View style={st.tabbar}>
              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("home"); setView({ name: "root" }); }}>
                <Ionicons name={tab === "home" ? "home" : "home-outline"} size={22} color={tab === "home" ? C.turf : C.gray} />
                <Text style={[st.tabLabel, { color: tab === "home" ? C.turf : C.gray }]}>Saha</Text>
              </TouchableOpacity>

              <TouchableOpacity style={st.fab} onPress={() => setView({ name: "create" })}>
                <Ionicons name="add" size={28} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("chats"); setView({ name: "root" }); }}>
                <View>
                  <Ionicons
                    name={tab === "chats" ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
                    size={22}
                    color={tab === "chats" ? C.turf : C.gray}
                  />
                  {totalUnread > 0 && (
                    <View style={st.tabBadge}>
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>{totalUnread}</Text>
                    </View>
                  )}
                </View>
                <Text style={[st.tabLabel, { color: tab === "chats" ? C.turf : C.gray }]}>Sohbet</Text>
              </TouchableOpacity>

              <TouchableOpacity style={st.tabBtn} onPress={() => { setTab("profile"); setView({ name: "root" }); }}>
                <Ionicons name={tab === "profile" ? "person" : "person-outline"} size={22} color={tab === "profile" ? C.turf : C.gray} />
                <Text style={[st.tabLabel, { color: tab === "profile" ? C.turf : C.gray }]}>Profil</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* alt sayfalar */}
          <ApplySheet
            visible={view.name === "apply"}
            ev={applyEvent}
            onClose={() => applyEvent && setView({ name: "event", id: applyEvent.id })}
            onSend={(note) => applyEvent && applyToEvent(applyEvent, note)}
          />

        </View>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  tabbar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around",
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.line,
    paddingTop: 8, paddingBottom: 10, paddingHorizontal: 8,
  },
  tabBtn: { alignItems: "center", gap: 2, paddingHorizontal: 14 },
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
