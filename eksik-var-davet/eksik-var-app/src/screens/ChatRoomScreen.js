import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, TextInput, FlatList,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { senderColor } from "../data";
import { Avatar } from "../components";

export default function ChatRoomScreen({
  chat, apps, rules, onBack, onSend, onConfirmJoin, onGoChat, onCall, onInfo,
}) {
  const [input, setInput] = useState("");
  const listRef = useRef(null);

  const send = () => {
    const t = input.trim();
    if (!t) return;
    onSend(chat.id, t);
    setInput("");
  };

  const renderMsg = ({ item: m }) => {
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
      return (
        <View style={{ alignItems: "flex-start", marginVertical: 4 }}>
          <View style={st.approvalCard}>
            <View style={[st.approvalHead, { backgroundColor: done ? C.turf : C.pitch }]}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 11, letterSpacing: 0.4 }}>
                {done ? "KADRODASIN 🎉" : invited ? "KADROYA DAVET EDİLDİN 🎉" : "ORGANİZATÖR ONAYI GELDİ ✅"}
              </Text>
            </View>
            <View style={{ padding: 12 }}>
              <Text style={{ fontSize: 13, color: C.ink, lineHeight: 19 }}>
                {done
                  ? "Yerin kesinleşti ve grup sohbetine eklendin. Maçta görüşürüz!"
                  : invited ? "Organizatör seni doğrudan kadroya davet etti. Kabul edersen yerin kesinleşir; istemiyorsan etkinlik sayfasından reddedebilirsin."
                  : "Organizatör seni kadroya almak istiyor. Son onayı verirsen yerin kesinleşir ve kontenjan güncellenir."}
              </Text>
              {done ? (
                <TouchableOpacity
                  onPress={() => onGoChat("g-" + app.eventId)}
                  style={[st.approvalBtn, { backgroundColor: C.pitchSoft }]}
                >
                  <Text style={{ color: C.turf, fontWeight: "900", fontSize: 13 }}>Grup sohbetine git</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => onConfirmJoin(m.appId)}
                  style={[st.approvalBtn, { backgroundColor: C.pitch }]}
                >
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>
                    {invited ? "Daveti kabul et" : "Onayla ve kadroya katıl"}
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
        <View
          style={[
            st.bubble,
            {
              backgroundColor: mine ? C.waMine : "#fff",
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
            <Text style={{ fontSize: 10, color: "#8CA096" }}>{m.time}</Text>
            {mine && <Ionicons name="checkmark-done" size={13} color="#4FB6E0" />}
          </View>
        </View>
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
        {chat.type === "birebir" && (
          <TouchableOpacity
            onPress={onCall}
            style={[st.callBtn, rules && !rules.canCall && { opacity: 0.35 }]}
          >
            <Ionicons name="call" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={listRef}
        data={chat.msgs}
        keyExtractor={(m) => m.id}
        renderItem={renderMsg}
        style={{ backgroundColor: C.waBg }}
        contentContainerStyle={{ padding: 10, paddingBottom: 16 }}
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
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>Ara</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={st.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Mesaj yaz…"
            placeholderTextColor="#9AA79F"
            style={st.input}
            onSubmitEditing={send}
            returnKeyType="send"
          />
          <TouchableOpacity onPress={send} style={st.sendBtn}>
            <Ionicons name="send" size={17} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
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
    backgroundColor: "#fff", borderRadius: 16, overflow: "hidden",
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
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.line, padding: 10,
  },
  input: {
    flex: 1, backgroundColor: "#fff", borderWidth: 1, borderColor: C.line,
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 9,
    fontSize: 14, color: C.ink,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: C.pitch,
    alignItems: "center", justifyContent: "center",
  },
  callBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", marginLeft: 6,
  },
  blockedBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.line,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  blockedText: { flex: 1, fontSize: 13, color: C.faint, fontWeight: "600" },
  blockedCall: {
    flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.pitch,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
});
