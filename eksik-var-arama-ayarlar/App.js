import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, SafeAreaView,
  Platform, StatusBar as RNStatusBar, StyleSheet,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { C } from "./src/theme";
import { SEED_EVENTS, SEED_CHATS, SEED_APPS, ORGS, DEFAULT_SETTINGS, contactRules, nowTime, uid } from "./src/data";
import { Toast } from "./src/components";
import AuthScreen from "./src/screens/AuthScreen";
import HomeScreen from "./src/screens/HomeScreen";
import EventDetailScreen from "./src/screens/EventDetailScreen";
import CreateScreen from "./src/screens/CreateScreen";
import ChatsScreen from "./src/screens/ChatsScreen";
import ChatRoomScreen from "./src/screens/ChatRoomScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import CallScreen from "./src/screens/CallScreen";
import { ApplySheet, RateSheet } from "./src/screens/sheets";

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("home");
  const [view, setView] = useState({ name: "root" });
  const [events, setEvents] = useState(SEED_EVENTS);
  const [chats, setChats] = useState(SEED_CHATS);
  const [apps, setApps] = useState(SEED_APPS);
  const [pendingRate, setPendingRate] = useState(true);
  const [toast, setToast] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS); // iletişim + bildirim tercihleri
  const [call, setCall] = useState(null);                     // aktif arama: { chatId, name }

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
        e.id === ev.id
          ? { ...e, filled: newFilled, joined: true, status: full ? "doldu" : e.status }
          : e
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
      org: null, joined: false, mine: true,
      desc: f.desc || "Detaylar için mesaj atabilirsin.",
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

  /* --- iletişim izinleri & arama --- */
  const sharesSquad = (otherId) =>
    events.some((e) => e.joined && e.org && e.org.id === otherId) ||
    apps.some((a) => a.who && a.who.id === otherId && a.status === "onaylandi");

  const rulesFor = (chat) => {
    if (!chat || chat.type !== "birebir") return null;
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
      <View style={{ flex: 1, backgroundColor: C.turf }}>
        <StatusBar style="light" />
        <SafeAreaView style={{ flex: 1, paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0 }}>
          <AuthScreen
            onLogin={(u) =>
              setUser({ ...u, rating: 4.6, count: 12, rel: 92, joined: 23, organized: 5 })
            }
          />
        </SafeAreaView>
      </View>
    );

  const activeChat = view.name === "chat" ? chats.find((c) => c.id === view.id) : null;
  const activeEvent = view.name === "event" ? events.find((e) => e.id === view.id) : null;
  const applyEvent = view.name === "apply" ? events.find((e) => e.id === view.id) : null;
  const myAppFor = (evId) => apps.find((a) => a.eventId === evId && a.who === "me");
  const totalUnread = chats.reduce((s, c) => s + (c.unread || 0), 0);
  const hideTabs = view.name === "chat" || view.name === "create" || view.name === "settings" || !!activeEvent || !!call;

  return (
    <View style={{ flex: 1, backgroundColor: C.turf }}>
      <StatusBar style="light" />
      {/* üst güvenli alan koyu çim, alt beyaz */}
      <SafeAreaView style={{ flex: 0, backgroundColor: C.turf, paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0 }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={{ flex: 1, backgroundColor: C.chalk }}>
          {tab === "home" && view.name !== "event" && (
            <HomeScreen user={user} events={events} onOpen={(id) => setView({ name: "event", id })} />
          )}
          {tab === "chats" && view.name !== "chat" && <ChatsScreen chats={chats} onOpen={openChat} />}
          {tab === "chats" && view.name === "chat" && activeChat && (
            <ChatRoomScreen
              chat={activeChat}
              apps={apps}
              rules={rulesFor(activeChat)}
              onCall={() => startCall(activeChat)}
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
              pendingRate={pendingRate}
              onRate={() => setView({ name: "rate" })}
              onSettings={() => setView({ name: "settings" })}
              onLogout={() => { setUser(null); setView({ name: "root" }); setTab("home"); }}
            />
          )}

          {/* ayarlar kaplama */}
          {view.name === "settings" && (
            <View style={StyleSheet.absoluteFill}>
              <SettingsScreen settings={settings} onChange={setSettings} onBack={() => setView({ name: "root" })} />
            </View>
          )}

          {/* etkinlik detayı kaplama */}
          {activeEvent && (
            <View style={StyleSheet.absoluteFill}>
              <EventDetailScreen
                ev={activeEvent}
                apps={apps}
                myApp={myAppFor(activeEvent.id)}
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
              <CreateScreen user={user} onBack={() => setView({ name: "root" })} onCreate={createEvent} />
            </View>
          )}

          {/* aktif arama kaplama */}
          {call && (
            <View style={StyleSheet.absoluteFill}>
              <CallScreen call={call} onEnd={endCall} />
            </View>
          )}

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
          <RateSheet
            visible={view.name === "rate"}
            onClose={() => setView({ name: "root" })}
            onSubmit={() => {
              setPendingRate(false);
              setView({ name: "root" });
              showToast("Puanın kaydedildi ⭐ Teşekkürler!");
            }}
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
