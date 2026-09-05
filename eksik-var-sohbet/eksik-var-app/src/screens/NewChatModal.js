import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar } from "../components";

/* Yeni sohbet kurucu — kişi (birebir) ya da grup.
   props: mode 'kisi'|'grup', onClose, onSearch(q)=>users, onCreateDirect(user), onCreateGroup(name, users), busy */
export default function NewChatModal({ mode, onClose, onSearch, onCreateDirect, onCreateGroup, busy = false }) {
  const grup = mode === "grup";
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [ariyor, setAriyor] = useState(false);
  const [secili, setSecili] = useState([]);
  const [ad, setAd] = useState("");
  const ara = async () => {
    const term = q.trim(); if (term.length < 2) return;
    setAriyor(true);
    try { setRows(await onSearch(term)); } catch { setRows([]); }
    setAriyor(false);
  };
  const sec = (u) => {
    if (!grup) return onCreateDirect(u);
    setSecili((l) => l.some((x) => x.id === u.id) ? l.filter((x) => x.id !== u.id) : [...l, u]);
  };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sayfa}>
          <View style={st.tutamak} />
          <Text style={st.baslik}>{grup ? "👥 " + t("Yeni grup") : "👤 " + t("Yeni kişi sohbeti")}</Text>
          {grup && (
            <TextInput value={ad} onChangeText={setAd} maxLength={40} placeholder={t("Grup adı (örn: Salı Maçı Ekibi)")}
              placeholderTextColor={C.placeholder} style={[st.giris, { marginBottom: 8 }]} />
          )}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={q} onChangeText={setQ} placeholder={t("Ad veya @kullanıcı adı ara")}
              placeholderTextColor={C.placeholder} style={[st.giris, { flex: 1 }]}
              onSubmitEditing={ara} returnKeyType="search" autoCapitalize="none" />
            <TouchableOpacity onPress={ara} style={st.araBtn}><Ionicons name="search" size={18} color="#fff" /></TouchableOpacity>
          </View>
          {grup && secili.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {secili.map((u) => (
                <TouchableOpacity key={u.id} onPress={() => sec(u)} style={st.seciliCip}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: "#fff" }}>{u.name.split(" ")[0]} ✕</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <FlatList data={rows} keyExtractor={(u) => String(u.id)} style={{ maxHeight: 300, marginTop: 8 }}
            ListEmptyComponent={ariyor
              ? <ActivityIndicator style={{ marginTop: 18 }} color={C.pitch} />
              : <Text style={{ textAlign: "center", color: C.faint, fontSize: 12.5, marginTop: 18 }}>{t("Kişi bulmak için ara 🔎")}</Text>}
            renderItem={({ item: u }) => {
              const isaretli = grup && secili.some((x) => x.id === u.id);
              return (
                <TouchableOpacity onPress={() => sec(u)} style={st.satir}>
                  <Avatar name={u.name} uri={u.avatar} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13.5, fontWeight: "900", color: C.ink }}>{u.name}</Text>
                    <Text style={{ fontSize: 11.5, color: C.faint }}>@{u.username}</Text>
                  </View>
                  {grup
                    ? <Ionicons name={isaretli ? "checkbox" : "square-outline"} size={20} color={isaretli ? C.pitch : C.faint} />
                    : <Ionicons name="chatbubble-ellipses-outline" size={18} color={C.pitch} />}
                </TouchableOpacity>
              );
            }} />
          {grup && (
            <TouchableOpacity disabled={busy || ad.trim().length < 2 || secili.length < 1}
              onPress={() => onCreateGroup(ad.trim(), secili)}
              style={[st.kurBtn, (busy || ad.trim().length < 2 || secili.length < 1) && { opacity: 0.4 }]}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
                {busy ? t("Kuruluyor…") : `👥 ${t("Grubu kur")}${secili.length ? ` (${secili.length + 1})` : ""}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mkSt = () => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sayfa: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingBottom: 26, paddingTop: 8 },
  tutamak: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 8 },
  baslik: { fontSize: 14, fontWeight: "900", color: C.ink, textAlign: "center", marginBottom: 10 },
  giris: { backgroundColor: C.chalk, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.ink },
  araBtn: { width: 42, borderRadius: 12, backgroundColor: C.pitch, alignItems: "center", justifyContent: "center" },
  seciliCip: { backgroundColor: C.pitch, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  satir: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  kurBtn: { backgroundColor: C.kit, borderRadius: 12, paddingVertical: 12, alignItems: "center", marginTop: 8 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
