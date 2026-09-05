import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View, Text, TouchableOpacity, SafeAreaView, Share, ActivityIndicator, Image,
  Platform, StatusBar as RNStatusBar, StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { C } from "../theme";
import { contactRules, DEFAULT_SETTINGS, buildShareText, buildInviteText } from "../data";
import { Toast } from "../components";
import * as api from "./api";
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
import { ApplySheet, RateSheet } from "../screens/sheets";

// Hata mesajlarını kullanıcı diline çevir
const friendly = (e) => {
  const m = (e && e.message) || String(e);
  if (m.includes("MESAJ_IZNI_YOK")) return "Karşı tarafın iletişim tercihleri bu mesaja izin vermiyor";
  if (m.includes("Kontenjan dolu")) return "Kontenjan doldu";
  if (m.includes("başvuruya kapalı")) return "Bu etkinlik başvuruya kapalı";
  if (m.includes("Invalid login")) return "E-posta ya da şifre hatalı";
  if (m.includes("already registered")) return "Bu e-posta zaten kayıtlı";
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

  const viewRef = useRef(view);
  const timers = useRef([]);
  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
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
        await Promise.all([refreshEvents(p), refreshChats(p.id, a), api.listNotifications().then(setNotifs)]);
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
          if (idx < 0) { refreshChats(); return cs; }
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
        if (row.sender_id && row.sender_id !== meId && !isViewingChat(row.conversation_id) && settings.notif.mesaj) {
          // sunucu bildirimi Bağlantı 3'te; şimdilik yerel bildirim
          setNotifs((ns) => [{ id: "local-" + row.id, type: "mesaj", title: "Yeni mesaj", body: row.content || "", time: api.fmtTime(row.created_at), read: false, data: { conversation_id: row.conversation_id } }, ...ns]);
        }
      },
      onChange: async (what) => {
        try {
          if (what === "applications") { const a = await refreshApps(); await Promise.all([refreshEvents(), refreshChats(undefined, a)]); }
          else if (what === "events") await refreshEvents();
          else if (what === "chats") await refreshChats();
        } catch (e) { /* sessiz */ }
      },
    });
    return unsub;
  }, [meId]);

  /* ---------- kimlik ---------- */
  const handleAuth = async (f) => {
    setAuthError(null);
    if (!f.email || !f.pass) { setAuthError("E-posta ve şifre gerekli"); return; }
    if (f.mode === "register" && (!f.name.trim() || !f.username.trim())) { setAuthError("Ad soyad ve kullanıcı adı gerekli"); return; }
    setAuthBusy(true);
    try {
      if (f.mode === "register") {
        const s = await api.signUp(f);
        if (!s) { setAuthError("Kayıt alındı. E-posta doğrulaması açıksa gelen kutunu kontrol et."); return; }
        if (f.avatar) { try { await api.uploadAvatar(s.user.id, f.avatar); } catch (e) { /* fotoğraf sonra */ } }
      } else {
        await api.signIn(f);
      }
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
  const rulesFor = (chat) => (!chat || chat.type !== "birebir") ? null : contactRules(chat.other, sharesSquad(chat.otherId), !!chat.eventId);
  const rulesForMember = (member) => contactRules(member && member.contact ? member : null, sharesSquad(member.id), false);
  const myAppFor = (evId) => apps.find((a) => a.eventId === evId && a.who === "me");

  const openChat = (id) => {
    const c = chats.find((x) => x.id === id);
    setChats((cs) => cs.map((x) => (x.id === id ? { ...x, unread: 0 } : x)));
    setTab("chats"); setView({ name: "chat", id });
    if (c && c.msgs.length) { const last = [...c.msgs].reverse().find((m) => m.dbId); if (last) api.markChatRead(meId, id, last.dbId); }
  };

  /* ---------- akışlar ---------- */
  const applyToEvent = async (ev, note) => {
    try {
      const r = await api.applyToEvent(meId, ev.id, note);
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
      showToast(f.recurrence === "haftalik" ? "Haftalık seri yayında 🔁" : "Talebin yayında 🚀");
    } catch (e) { fail(e); }
  };
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
  const openInfo = (chat) => {
    if (chat.type === "grup") { setView({ name: "groupInfo", id: chat.id }); return; }
    setMemberSheet({ member: chat.other || { id: chat.otherId, name: chat.title, username: "-", rating: 0, count: 0, rel: 100 }, chatId: null });
  };
  const openNotif = (n) => {
    setNotifs((ns) => ns.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (n.dbId) api.markNotifRead(n.dbId);
    const d = n.data || {};
    const evId = d.event_id || d.eventId, chId = d.conversation_id || d.chatId;
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
        <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0 }}>
          <AuthScreen onLogin={handleAuth} busy={authBusy} error={authError} />
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

  const activeChat = view.name === "chat" ? chats.find((c) => c.id === view.id) : null;
  const infoChat = view.name === "groupInfo" ? chats.find((c) => c.id === view.id) : null;
  const activeEvent = view.name === "event" ? events.find((e) => e.id === view.id) : null;
  const applyEvent = view.name === "apply" ? events.find((e) => e.id === view.id) : null;
  const attendanceEvent = view.name === "attendance" ? events.find((e) => e.id === view.id) : null;
  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);
  const unreadNotifs = notifs.filter((n) => !n.read).length;
  const hideTabs = ["chat", "create", "settings", "groupInfo", "attendance", "notifications"].includes(view.name) || !!activeEvent || !!call;
  const user = { ...me, city: me.city || "Ankara" };

  return (
    <View style={{ flex: 1, backgroundColor: C.turf }}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 0, backgroundColor: C.turf, paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0 }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ flex: 1, backgroundColor: C.chalk }}>
          {tab === "home" && view.name !== "event" && (
            <HomeScreen user={user} events={events} onOpen={(id) => setView({ name: "event", id })}
              onAttendance={(id) => setView({ name: "attendance", id })} onChangeCity={changeCity}
              onNotifications={() => setView({ name: "notifications" })} unreadCount={unreadNotifs} />
          )}
          {tab === "chats" && view.name !== "chat" && <ChatsScreen chats={chats} onOpen={openChat} />}
          {tab === "chats" && view.name === "chat" && activeChat && (
            <ChatRoomScreen chat={activeChat} apps={apps} rules={rulesFor(activeChat)} onCall={() => startCall(activeChat)}
              onInfo={() => openInfo(activeChat)} onBack={() => setView({ name: "root" })} onSend={sendMessage}
              onConfirmJoin={confirmJoin} onGoChat={openChat} />
          )}
          {tab === "profile" && view.name !== "settings" && (
            <ProfileScreen user={user} settings={settings} pendingRate={false} onRate={() => {}}
              onSettings={() => setView({ name: "settings" })} onInvite={inviteFriends} onAvatar={changeAvatar} onLogout={logout} />
          )}

          {activeEvent && (
            <View style={StyleSheet.absoluteFill}>
              <EventDetailScreen ev={activeEvent} apps={apps} myApp={myAppFor(activeEvent.id)} roster={activeEvent.ended ? rosterFor(activeEvent) : []}
                onAttendance={(id) => setView({ name: "attendance", id })} onDispute={disputeAttendance} onShare={shareEvent}
                onBack={() => setView({ name: "root" })} onApply={() => setView({ name: "apply", id: activeEvent.id })}
                onApprove={approveApp} onReject={rejectApp} onGoChat={(id) => { const g = groupFor(activeEvent); openChat(g ? g.id : id); }} />
            </View>
          )}
          {view.name === "create" && (
            <View style={StyleSheet.absoluteFill}><CreateScreen user={user} onBack={() => setView({ name: "root" })} onCreate={createEvent} /></View>
          )}
          {view.name === "settings" && (
            <View style={StyleSheet.absoluteFill}>
              <SettingsScreen settings={settings} onChange={changeSettings} onBack={() => setView({ name: "root" })} onDeleteAccount={deleteAccount} />
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
                onSelectMember={(member) => setMemberSheet({ member, chatId: infoChat.id })} />
            </View>
          )}
          {call && (<View style={StyleSheet.absoluteFill}><CallScreen call={call} onEnd={endCall} /></View>)}

          {memberSheet && (
            <MemberSheet member={memberSheet.member} rules={rulesForMember(memberSheet.member)}
              canRemove={!!memberSheet.chatId && memberSheet.member.id !== "me" && memberSheet.member.role !== "organizator" &&
                !!chats.find((c) => c.id === memberSheet.chatId && c.members && c.members.some((m) => m.id === "me" && m.role === "organizator"))}
              onClose={() => setMemberSheet(null)} onMessage={messageMember} onCall={callMember}
              onRemove={(member) => removeMember(memberSheet.chatId, member)} />
          )}

          <Toast text={toast} />

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

          <ApplySheet visible={view.name === "apply"} ev={applyEvent}
            onClose={() => applyEvent && setView({ name: "event", id: applyEvent.id })}
            onSend={(note) => applyEvent && applyToEvent(applyEvent, note)} />
          <RateSheet visible={view.name === "rate"} onClose={() => setView({ name: "root" })} onSubmit={() => setView({ name: "root" })} />
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
  tabBtn: { alignItems: "center", gap: 2, paddingHorizontal: 14 },
  tabLabel: { fontSize: 10, fontWeight: "800" },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.kit, alignItems: "center", justifyContent: "center", marginTop: -30, elevation: 6, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  tabBadge: { position: "absolute", top: -4, right: -8, backgroundColor: C.pitch, borderRadius: 8, minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
});
