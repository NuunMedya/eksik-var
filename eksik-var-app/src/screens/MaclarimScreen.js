import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BACK_ICON } from "../components";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { CATEGORIES } from "../data";

/* Maçlarım — katıldığın ve kurduğun maçların tek listesi. */
export default function MaclarimScreen({ events = [], onOpen = () => {}, onBack }) {
  const benim = (e) => e.joined || e.mine;
  const yaklasan = events.filter((e) => benim(e) && !e.ended && e.status !== "iptal");
  const gecmis = events.filter((e) => benim(e) && e.ended).slice(0, 20);
  const Satir = ({ e }) => {
    const kat = CATEGORIES.find((c) => c.id === e.cat) || {};
    return (
      <TouchableOpacity onPress={() => onOpen(e.id)} style={st.satir}>
        <Text style={{ fontSize: 20 }}>{kat.icon || "⚽"}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13.5, fontWeight: "800", color: C.ink }} numberOfLines={1}>{e.title}</Text>
          <Text style={{ fontSize: 11.5, color: C.faint }}>{e.date} · {e.venue}{e.mine ? " · " + t("organizatörsün") : ""}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.gray} />
      </TouchableOpacity>
    );
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <Ionicons name={BACK_ICON} size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>🗓 {t("Maçlarım")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {yaklasan.length === 0 && gecmis.length === 0 && (
          <Text style={{ textAlign: "center", color: C.faint, fontSize: 13, marginTop: 30 }}>{t("Henüz maçın yok — Ana Sayfa'dan bir tane kur ⚽")}</Text>
        )}
        {yaklasan.length > 0 && <Text style={st.bolum}>{t("Yaklaşan")} · {yaklasan.length}</Text>}
        {yaklasan.map((e) => <Satir key={e.id} e={e} />)}
        {gecmis.length > 0 && <Text style={[st.bolum, { marginTop: 16 }]}>{t("Geçmiş")}</Text>}
        {gecmis.map((e) => <Satir key={e.id} e={e} />)}
      </ScrollView>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.pitchDark, paddingTop: 58, paddingBottom: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  bolum: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText, marginBottom: 8 },
  satir: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 11, marginBottom: 8 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
