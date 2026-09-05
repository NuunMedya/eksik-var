import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { CATEGORIES, POSITIONS, GUNLER } from "../data";
import { Chip } from "../components";

/* Vitrine çıkma / düzenleme kaplaması.
   props: visible, onClose, initial (null | {cat, positions, days, bio, active}),
          onSave(f), onCloseListing() */
export default function MarketSheet({ visible, onClose, initial, onSave, onCloseListing }) {
  const [f, setF] = useState({ cat: 1, positions: [], days: [], bio: "" });
  useEffect(() => {
    if (visible) setF(initial ? { cat: initial.cat, positions: initial.positions || [], days: initial.days || [], bio: initial.bio || "" }
      : { cat: 1, positions: [], days: [], bio: "" });
  }, [visible, initial]);

  const posList = POSITIONS[f.cat] || [];
  const togglePos = (id) => setF((x) => ({ ...x, positions: x.positions.includes(id) ? x.positions.filter((p) => p !== id) : [...x.positions, id] }));
  const toggleDay = (d) => setF((x) => ({ ...x, days: x.days.includes(d) ? x.days.filter((p) => p !== d) : [...x.days, d].sort() }));
  const kaydet = () => { onSave({ ...f, bio: f.bio.trim() }); onClose(); };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={st.title}>{initial && initial.active ? t("Vitrinini düzenle") : t("Kendini vitrine çıkar")}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}><Ionicons name="close" size={20} color={C.faint} /></TouchableOpacity>
          </View>
          <Text style={st.sub}>{t("Puanın, güvenilirliğin ve maç sayın profilinden otomatik gelir — takımlar kanıtlı vitrini görür.")}</Text>
          <ScrollView style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
            <Text style={st.label}>{t("Branş")}</Text>
            <View style={st.wrapRow}>
              {CATEGORIES.map((c) => (
                <Chip key={c.id} label={`${c.icon} ${c.name}`} active={f.cat === c.id}
                  onPress={() => setF((x) => ({ ...x, cat: c.id, positions: [] }))} />
              ))}
            </View>
            {posList.length > 0 && (
              <View>
                <Text style={st.label}>{t("Mevkilerin")}</Text>
                <View style={st.wrapRow}>
                  {posList.map((p) => (
                    <Chip key={p.id} label={`${p.icon} ${p.label}`} active={f.positions.includes(p.id)} onPress={() => togglePos(p.id)} />
                  ))}
                </View>
              </View>
            )}
            <Text style={st.label}>{t("Müsait günlerin")}</Text>
            <View style={st.wrapRow}>
              {GUNLER.map((g, i) => (
                <Chip key={g} label={g} active={f.days.includes(i)} onPress={() => toggleDay(i)} />
              ))}
            </View>
            <Text style={st.label}>{t("Kısa tanıtım")}</Text>
            <TextInput value={f.bio} onChangeText={(x) => setF((s) => ({ ...s, bio: x }))} multiline maxLength={200}
              placeholder={t("Örn: Hızlıyım, bitiriciyim. Hafta içi akşamları müsaidim.")} placeholderTextColor={C.placeholder}
              style={st.bio} />
            <Text style={{ fontSize: 11, color: C.faint, textAlign: "right" }}>{f.bio.length}/200</Text>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            {initial && initial.active && (
              <TouchableOpacity onPress={() => { onCloseListing(); onClose(); }} style={[st.btn, { backgroundColor: C.chalk, borderWidth: 1, borderColor: C.line }]}>
                <Text style={[st.btnText, { color: C.danger }]}>{t("Vitrinden in")}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={kaydet} style={[st.btn, { backgroundColor: C.kit }]}>
              <Ionicons name="storefront-outline" size={16} color="#fff" />
              <Text style={st.btnText}>{initial && initial.active ? t("Kaydet") : t("Vitrine çık")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mkSt = () => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { maxHeight: "88%", backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 26 },
  title: { fontSize: 17, fontWeight: "900", color: C.ink },
  sub: { fontSize: 12, color: C.faint, marginTop: 3, marginBottom: 6, lineHeight: 17 },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6, color: C.faint, marginTop: 12, marginBottom: 6 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  bio: { backgroundColor: C.chalk, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 12, minHeight: 70, fontSize: 14, color: C.ink, textAlignVertical: "top" },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, paddingVertical: 13 },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
