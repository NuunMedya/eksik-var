import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, Modal, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar } from "../components";
import { timeAgo } from "../data";

/* Yorumlar sayfası — Instagram usulü alt kaplama.
   props: post, rows, meId, busy, onSend(body), onDelete(id), onClose */
export default function CommentsSheet({ post, rows = [], meId, busy = false, onSend, onDelete, onClose }) {
  const [yazi, setYazi] = useState("");
  const gonder = () => { const b = yazi.trim(); if (b.length < 1 || busy) return; onSend(b); setYazi(""); };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sayfa}>
          <View style={st.tutamak} />
          <Text style={st.baslik}>{t("Yorumlar")}</Text>
          <FlatList data={rows} keyExtractor={(r) => r.id}
            style={{ maxHeight: 380 }} contentContainerStyle={{ paddingBottom: 8 }}
            ListEmptyComponent={<Text style={{ textAlign: "center", color: C.faint, fontSize: 13, marginTop: 24 }}>{t("İlk yorumu sen yaz 💬")}</Text>}
            renderItem={({ item }) => (
              <View style={st.satir}>
                <Avatar name={item.name} uri={item.avatar} size={30} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, color: C.ink, lineHeight: 18 }}>
                    <Text style={{ fontWeight: "900" }}>{item.name} </Text>{item.body}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: C.faint, marginTop: 2 }}>{timeAgo(item.createdAt)}</Text>
                </View>
                {(item.userId === meId || (post && post.userId === "me")) && onDelete && (
                  <TouchableOpacity onPress={() => onDelete(item.id)} style={{ padding: 4 }}>
                    <Ionicons name="close" size={14} color={C.faint} />
                  </TouchableOpacity>
                )}
              </View>
            )} />
          <View style={st.girisSatir}>
            <TextInput value={yazi} onChangeText={setYazi} maxLength={200} placeholder={t("Yorum yaz…")}
              placeholderTextColor={C.placeholder} style={st.giris} onSubmitEditing={gonder} returnKeyType="send" />
            <TouchableOpacity disabled={yazi.trim().length < 1 || busy} onPress={gonder}
              style={[st.gonder, (yazi.trim().length < 1 || busy) && { opacity: 0.4 }]}>
              <Ionicons name="arrow-up" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mkSt = () => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sayfa: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 16, paddingBottom: 26, paddingTop: 8 },
  tutamak: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 8 },
  baslik: { fontSize: 14, fontWeight: "900", color: C.ink, textAlign: "center", marginBottom: 8 },
  satir: { flexDirection: "row", gap: 9, paddingVertical: 7, alignItems: "flex-start" },
  girisSatir: { flexDirection: "row", gap: 8, marginTop: 8, alignItems: "center" },
  giris: { flex: 1, backgroundColor: C.chalk, borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13, color: C.ink },
  gonder: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.kit, alignItems: "center", justifyContent: "center" },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
