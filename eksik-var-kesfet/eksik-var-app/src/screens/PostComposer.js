import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, Image, Modal, Switch, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { pickPhoto } from "../avatar";

/* Keşfet paylaşımı oluşturma.
   props: visible, onClose, hasListing (vitrin aktif mi), onShare({caption, imageUri, attach}), busy */
export default function PostComposer({ visible, onClose, hasListing = false, onShare, busy = false }) {
  const [caption, setCaption] = useState("");
  const [imageUri, setImageUri] = useState(null);
  const [attach, setAttach] = useState(false);
  useEffect(() => { if (visible) { setCaption(""); setImageUri(null); setAttach(false); } }, [visible]);

  const gecerli = caption.trim().length > 0 || !!imageUri;
  const paylas = () => { if (gecerli && !busy) onShare({ caption: caption.trim(), imageUri, attach: attach && hasListing }); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={st.title}>{t("Paylaşım oluştur")}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}><Ionicons name="close" size={20} color={C.faint} /></TouchableOpacity>
          </View>

          <TextInput value={caption} onChangeText={setCaption} multiline maxLength={300} autoFocus
            placeholder={t("Kendini anlat: nasıl oynarsın, ne arıyorsun? 📸 foto da ekleyebilirsin")}
            placeholderTextColor={C.placeholder} style={st.input} />
          <Text style={{ fontSize: 11, color: C.faint, textAlign: "right" }}>{caption.length}/300</Text>

          {imageUri ? (
            <View style={{ marginTop: 8 }}>
              <Image source={{ uri: imageUri }} style={st.onizleme} resizeMode="cover" />
              <TouchableOpacity onPress={() => setImageUri(null)} style={st.fotoSil}>
                <Ionicons name="close" size={15} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={async () => { const u = await pickPhoto(); if (u) setImageUri(u); }} style={st.fotoBtn}>
              <Ionicons name="image-outline" size={18} color={C.turfText} />
              <Text style={{ fontSize: 13, fontWeight: "800", color: C.turfText }}>{t("Fotoğraf ekle")}</Text>
            </TouchableOpacity>
          )}

          {hasListing && (
            <View style={st.attachRow}>
              <Text style={{ fontSize: 16 }}>🏪</Text>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: C.ink }}>{t("Vitrinimi ekle")}</Text>
              <Switch value={attach} onValueChange={setAttach} trackColor={{ true: C.kit, false: C.line }} thumbColor="#fff" />
            </View>
          )}

          <TouchableOpacity disabled={!gecerli || busy} onPress={paylas}
            style={[st.cta, (!gecerli || busy) && { opacity: 0.4 }]}>
            <Ionicons name="paper-plane" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{busy ? t("Paylaşılıyor…") : t("Paylaş")}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mkSt = () => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 26 },
  title: { fontSize: 17, fontWeight: "900", color: C.ink },
  input: { backgroundColor: C.chalk, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 12, minHeight: 84, maxHeight: 150, fontSize: 14, color: C.ink, textAlignVertical: "top", marginTop: 10 },
  fotoBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.pitch, paddingVertical: 12, marginTop: 8 },
  onizleme: { width: "100%", height: 180, borderRadius: 12 },
  fotoSil: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 12, padding: 5 },
  attachRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: C.kitSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.kit, borderRadius: 14, paddingVertical: 13, marginTop: 12 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
