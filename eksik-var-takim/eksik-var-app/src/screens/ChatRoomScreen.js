import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  KeyboardAvoidingView, Platform, Image, Alert, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { senderColor } from "../data";
import { Avatar } from "../components";
import { PollSheet } from "./sheets";
import { pollVoters, extractIban } from "../data";

export default function ChatRoomScreen({
  chat, apps, rules, onBack, onSend, onConfirmJoin, onGoChat, onCall, onInfo, onLineup,
  onCreatePoll, onVote, onClosePoll, onCopy = () => {},
  onPin = null, canPin = false, onSendImage = null, onLoadOlder = null, loadingOlder = false,
}) {
  const longPress = (m) => {
    if (!canPin || !onPin || m.from === "sys" || m.from === "approval" || m.poll) return;
    const isPinned = chat.pinned && chat.pinned.id === m.id;
    Alert.alert(t("Mesaj"), (m.text || "Fotoğraf").slice(0, 60), [
      { text: t("Vazgeç"), style: "cancel" },
      { text: isPinned ? "Sabitlemeyi kaldır" : "Sabitle", onPress: () => onPin(chat.id, isPinned ? null : m) },
    ], { cancelable: true });
  };
  const [showPoll, setShowPoll] = useState(false);
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  const send = () => {
    const txt = input.trim();
    if (!txt) return;
    onSend(chat.id, txt);
    setInput("");
  };

  const PollCard = ({ m }) => {
    const poll = m.poll;
    const total = pollVoters(poll);
    const mine = new Set(Object.entries(poll.votes || {}).filter(([, vs]) => vs.some((v) => v.id === "me")).map(([id]) => id));
    return (
      <View style={st.pollCard}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Ionicons name="stats-chart" size={16} color={C.turfText} />
          <Text style={{ flex: 1, fontWeight: "900", fontSize: 14, color: C.ink }}>{poll.question}</Text>
        </View>
        <Text style={{ fontSize: 11, color: C.faint, marginTop: 2, marginBottom: 8 }}>
          {m.from === "me" ? "Sen" : m.name} · {poll.multiple ? "çoklu seçim" : "tek seçim"}{poll.closed ? " · kapandı" : ""}
        </Text>
        {poll.options.map((o) => {
          const vs = (poll.votes && poll.votes[o.id]) || [];
          const pct = total ? Math.round((vs.length / total) * 100) : 0;
          const sel = mine.has(o.id);
          return (
            <TouchableOpacity key={o.id} disabled={poll.closed} onPress={() => onVote && onVote(chat.id, poll.id, o.id, !sel)} style={st.pollOpt}>
              <View style={[st.pollBar, { width: `${Math.max(pct, 4)}%`, backgroundColor: sel ? C.pitch : C.pitchSoft }]} />
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10 }}>
                <Ionicons name={sel ? (poll.multiple ? "checkbox" : "radio-button-on") : (poll.multiple ? "square-outline" : "radio-button-off")} size={18} color={sel ? "#fff" : C.turfText} />
                <Text style={{ flex: 1, fontWeight: "800", fontSize: 13, color: sel ? "#fff" : C.ink }}>{o.text}</Text>
                <Text style={{ fontSize: 12, fontWeight: "900", color: sel ? "#fff" : C.turfText }}>{vs.length} · %{pct}</Text>
              </View>
              {vs.length > 0 && (
                <Text style={{ fontSize: 11, color: sel ? "rgba(255,255,255,0.85)" : C.faint, paddingHorizontal: 10, paddingBottom: 6, marginTop: -4 }} numberOfLines={1}>
                  {vs.slice(0, 3).map((v) => (v.id === "me" ? "Sen" : v.name.split(" ")[0])).join(", ")}{vs.length > 3 ? ` +${vs.length - 3}` : ""}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
          <Text style={{ fontSize: 11, color: C.faint }}>{total} kişi oy verdi</Text>
          {poll.createdBy === "me" && !poll.closed && onClosePoll && (
            <TouchableOpacity onPress={() => onClosePoll(chat.id, poll.id)}><Text style={{ fontSize: 11, fontWeight: "800", color: C.kit }}>{t("Anketi kapat")}</Text></TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderMsg = ({ item: m }) => {
    if (m.poll) return <View style={{ marginVertical: 6 }}><PollCard m={m} /></View>;
    if (m.image) {
      const mine = m.from === "me";
      return (
        <TouchableOpacity onLongPress={() => longPress(m)} activeOpacity={0.9} style={[st.imgWrap, mine ? { alignSelf: "flex-end" } : { alignSelf: "flex-start" }]}>
          {!mine && m.name && <Text style={st.imgName}>{m.name.split(" ")[0]}</Text>}
          <Image source={{ uri: m.image }} style={st.img} resizeMode="cover" />
          <Text style={[st.time, { alignSelf: "flex-end", marginTop: 4 }]}>{m.time}</Text>
        </TouchableOpacity>
      );
    }
    if (m.from === "sys" && extractIban(m.text)) {
      const ib = extractIban(m.text);
      return (
        <View style={st.ibanCard}>
          <Text style={{ fontSize: 12, color: C.faint }} selectable>{m.text.replace(/IBAN:\s*TR[0-9 ]+/i, "").replace(" ·  ·", " ·")}</Text>
          <Text style={{ fontSize: 15, fontWeight: "900", color: C.ink, marginTop: 6, letterSpacing: 0.5 }} selectable>{ib.display}</Text>
          <TouchableOpacity onPress={() => onCopy(ib.raw)} style={st.copyBtn}>
            <Ionicons name="copy-outline" size={15} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>{t("IBAN'ı kopyala")}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (m.from === "sys")
      return (
        <View style={{ alignItems: "center", marginVertical: 4 }}>
          <View style={st.sysPill}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: "#6B5E2E", textAlign: "center" }}>
              {m.text}
            </Text>
          </View>
        </View>
      );

    if (m.from === "approval") {
      const app = apps.find((a) => a.id === m.appId);
      const done = app?.status === "onaylandi";
      const invited = !!(app && app.invited);
      const offer = !!(app && app.fromWaitlist);
      return (
        <View style={{ alignItems: "flex-start", marginVertical: 4 }}>
          <View style={st.approvalCard}>
            <View style={[st.approvalHead, { backgroundColor: done ? C.turf : C.pitch }]}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 11, letterSpacing: 0.4 }}>
                {done ? "KADRODASIN 🎉" : offer ? "YER AÇILDI ⏳" : invited ? "KADROYA DAVET EDİLDİN 🎉" : "ORGANİZATÖR ONAYI GELDİ ✅"}
              </Text>
            </View>
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 13, color: C.ink, lineHeight: 19 }}>
                {done
                  ? "Yerin kesinleşti ve grup sohbetine eklendin. Maçta görüşürüz!"
                  : offer ? `Yedek listesinden sıra sana geldi. ${app.offerExpiresAt ? app.offerExpiresAt + "'ye kadar" : "Süresi içinde"} onaylarsan yerin kesinleşir; yoksa sıradaki yedeğe geçer.`
                  : invited ? "Organizatör seni doğrudan kadroya davet etti. Kabul edersen yerin kesinleşir; istemiyorsan etkinlik sayfasından reddedebilirsin."
                  : "Organizatör seni kadroya almak istiyor. Son onayı sen veriyorsun çünkü bu bir söz: onaylayınca yerin kesinleşir, gelmezsen güvenilirliğin düşer. Emin değilsen önce konuş, sonra onayla."}
              </Text>
              {done ? (
                <TouchableOpacity
                  onPress={() => onGoChat("g-" + app.eventId)}
                  style={[st.approvalBtn, { backgroundColor: C.pitchSoft }]}
                >
                  <Text style={{ color: C.turfText, fontWeight: "900", fontSize: 13 }}>{t("Grup sohbetine git")}</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => onConfirmJoin(m.appId)}
                  style={[st.approvalBtn, { backgroundColor: C.pitch }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>
                    {offer ? "Yerimi onayla" : invited ? "Daveti kabul et" : "Onayla ve kadroya katıl"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      );
    }

    const mine = m.from === "me";
    return (
      <View style={{ alignItems: mine ? "flex-end" : "flex-start", marginVertical: 3 }}>
        <TouchableOpacity
          onLongPress={() => longPress(m)} activeOpacity={0.85}
          style={[
            st.bubble,
            {
              backgroundColor: mine ? C.waMine : C.surface,
              borderTopRightRadius: mine ? 4 : 16,
              borderTopLeftRadius: mine ? 16 : 4,
            },
          ]}
        >
          {!mine && chat.type === "grup" && m.name && (
            <Text style={{ fontSize: 11, fontWeight: "900", color: senderColor(m.from) }}>
              {m.name}
            </Text>
          )}
          <Text style={{ fontSize: 14, color: C.ink }}>{m.text}</Text>
          <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 3, marginTop: 2 }}>
            <Text style={{ fontSize: 11, color: "#8CA096" }}>{m.time}</Text>
            {mine && <Ionicons name="checkmark-done" size={13} color="#4FB6E0" />}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 44 : 0}
    >
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 6 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onInfo} style={{ flex: 1, flexDirection: "row", alignItems: "center" }}>
          {chat.type === "grup" ? (
            <View style={st.groupIcon}>
              <Ionicons name="people" size={17} color="#fff" />
            </View>
          ) : (
            <Avatar name={chat.title} size={36} />
          )}
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text numberOfLines={1} style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
              {chat.title}
            </Text>
            <Text style={{ color: C.mist, fontSize: 11 }}>
              {chat.type === "grup"
                ? `${chat.members ? chat.members.length + " üye" : chat.sub} · bilgi için dokun`
                : chat.sub || "profil için dokun"}
            </Text>
          </View>
        </TouchableOpacity>
        {chat.type === "grup" && onLineup && (chat.members || []).length >= 4 && (
          <TouchableOpacity onPress={onLineup} style={st.callBtn}>
            <Ionicons name="shuffle" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        {chat.type === "birebir" && (
          <TouchableOpacity
            onPress={onCall}
            style={[st.callBtn, rules && !rules.canCall && { opacity: 0.35 }]}
          >
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {chat.pinned && (
        <TouchableOpacity onPress={() => canPin && onPin && onPin(chat.id, null)} style={st.pinBar} activeOpacity={canPin ? 0.7 : 1}>
          <Ionicons name="pin" size={14} color={C.kit} />
          <Text style={{ flex: 1, fontSize: 12, color: C.ink }} numberOfLines={2}>{chat.pinned.text}</Text>
          {canPin && <Ionicons name="close" size={14} color={C.faint} />}
        </TouchableOpacity>
      )}
      <FlatList
        ref={listRef}
        data={chat.msgs}
        keyExtractor={(m) => m.id}
        renderItem={renderMsg}
        style={{ backgroundColor: C.waBg }}
        contentContainerStyle={{ padding: 10, paddingBottom: 16 }}
        ListHeaderComponent={chat.hasMore && onLoadOlder ? (
          <TouchableOpacity onPress={() => onLoadOlder(chat.id)} disabled={loadingOlder} style={st.olderBtn}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.turfText }}>{loadingOlder ? "Yükleniyor…" : "Daha eski mesajları göster"}</Text>
          </TouchableOpacity>
        ) : null}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
      />

      {rules && !rules.canMessage ? (
        <View style={st.blockedBar}>
          <Ionicons name="lock-closed-outline" size={16} color={C.faint} />
          <Text style={st.blockedText}>{rules.messageReason}</Text>
          {rules.canCall && (
            <TouchableOpacity onPress={onCall} style={st.blockedCall}>
              <Ionicons name="call" size={14} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{t("Ara")}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={st.inputBar}>
          {chat.type === "grup" && onCreatePoll && (
            <TouchableOpacity onPress={() => setShowPoll(true)} style={st.pollBtn}>
              <Ionicons name="stats-chart-outline" size={20} color={C.turfText} />
            </TouchableOpacity>
          )}
          {onSendImage && (
            <TouchableOpacity onPress={() => onSendImage(chat.id)} style={[st.pollBtn, { backgroundColor: C.chalk }]}>
              <Ionicons name="image-outline" size={20} color={C.turfText} />
            </TouchableOpacity>
          )}
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t("Mesaj yaz…")}
            placeholderTextColor={C.placeholder}
            style={st.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={send} style={st.sendBtn}>
            <Ionicons name="send" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
      <PollSheet visible={showPoll} onClose={() => setShowPoll(false)} onSend={(q, options, multiple) => { setShowPoll(false); onCreatePoll(chat.id, q, options, multiple); }} />
    </KeyboardAvoidingView>
  );
}

const mkSt = () => StyleSheet.create({
  header: {
    backgroundColor: C.turf, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 10, paddingVertical: 10,
  },
  groupIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  sysPill: {
    backgroundColor: C.waNotice, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, maxWidth: "85%",
  },
  approvalCard: {
    backgroundColor: C.surface, borderRadius: 16, overflow: "hidden",
    maxWidth: "88%", elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  approvalHead: { paddingHorizontal: 12, paddingVertical: 8 },
  approvalBtn: { borderRadius: 12, alignItems: "center", paddingVertical: 9, marginTop: 10 },
  bubble: {
    borderRadius: 16, paddingHorizontal: 10, paddingVertical: 7, maxWidth: "80%",
    elevation: 1,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 },
  },
  inputBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, padding: 10,
  },
  input: {
    flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9,
    fontSize: 14, color: C.ink,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.pitch,
    alignItems: "center", justifyContent: "center",
  },
  ibanCard: { alignSelf: "center", backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.pitchSoft, padding: 12, marginVertical: 8, maxWidth: "88%" },
  copyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.turf, borderRadius: 10, paddingVertical: 9, marginTop: 10 },
  pinBar: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.kitSoft, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  olderBtn: { alignSelf: "center", backgroundColor: C.pitchSoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 10 },
  imgWrap: { maxWidth: "75%", marginVertical: 4, backgroundColor: C.surface, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: C.line },
  imgName: { fontSize: 11, fontWeight: "800", color: C.turfText, marginLeft: 4, marginBottom: 2 },
  img: { width: 220, height: 165, borderRadius: 10 },
  pollBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.pitchSoft, alignItems: "center", justifyContent: "center", marginRight: 8 },
  pollCard: { backgroundColor: C.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line, maxWidth: "92%", alignSelf: "flex-start", minWidth: "80%" },
  pollOpt: { borderRadius: 12, overflow: "hidden", backgroundColor: C.chalk, marginBottom: 6 },
  pollBar: { position: "absolute", left: 0, top: 0, bottom: 0 },
  callBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", marginLeft: 6,
  },
  blockedBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  blockedText: { flex: 1, fontSize: 13, color: C.faint, fontWeight: "600" },
  blockedCall: {
    flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.pitch,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
