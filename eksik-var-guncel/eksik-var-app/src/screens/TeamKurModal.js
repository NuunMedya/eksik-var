import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet } from "react-native";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";

/* 10 saniyelik takım kurulumu: ad yaz, kur. */
export default function TeamKurModal({ onClose, onCreate }) {
  const [ad, setAd] = useState("");
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <View style={st.kutu}>
          <Text style={{ fontSize: 34, textAlign: "center" }}>🛡</Text>
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.ink, textAlign: "center" }}>{t("Takımını kur")}</Text>
          <TextInput value={ad} onChangeText={setAd} maxLength={40} autoFocus
            placeholder={t("Takım adı")} placeholderTextColor={C.placeholder} style={st.giris} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={onClose} style={[st.btn, { backgroundColor: C.chalk }]}>
              <Text style={[st.btnText, { color: C.faint }]}>{t("Vazgeç")}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={ad.trim().length < 2} onPress={() => onCreate(ad.trim())}
              style={[st.btn, { backgroundColor: C.turf, flex: 1 }, ad.trim().length < 2 && { opacity: 0.4 }]}>
              <Text style={st.btnText}>{t("Kur")} 🛡</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
const mkSt = () => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 28 },
  kutu: { backgroundColor: C.surface, borderRadius: 20, padding: 18, width: "100%", gap: 12 },
  giris: { backgroundColor: C.chalk, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 12, fontSize: 15, fontWeight: "800", color: C.ink, textAlign: "center" },
  btn: { alignItems: "center", justifyContent: "center", paddingVertical: 12, borderRadius: 12, paddingHorizontal: 16 },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
