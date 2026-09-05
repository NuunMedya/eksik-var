import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { SPONSOR_LOGOS } from "../sponsorAssets";

// Akış içi sponsor kartı. "SPONSORLU" etiketi bilinçli olarak her zaman görünür.
// compact: boş akışta başlığın altında ince şerit olarak kullanılır.
export default function SponsorCard({ s, onPress, compact = false }) {
  const logo = s.logo_url ? { uri: s.logo_url } : SPONSOR_LOGOS[s.id];
  if (compact) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[st.compact, { borderColor: s.color }]}>
        {logo
          ? <Image source={logo} style={st.compactLogo} resizeMode="contain" />
          : <Text style={{ fontSize: 18 }}>{s.emoji}</Text>}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: C.ink }} numberOfLines={1}>
            {s.name} <Text style={{ color: C.faint, fontWeight: "700" }}>· {t("Sponsorlu")}</Text>
          </Text>
          <Text style={{ fontSize: 11, color: C.faint }} numberOfLines={1}>{s.tagline}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={s.color} />
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={[st.card, { borderColor: s.color }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {logo ? (
          <View style={st.logoImgBox}><Image source={logo} style={{ width: 40, height: 40 }} resizeMode="contain" /></View>
        ) : (
          <View style={[st.logo, { backgroundColor: s.color }]}>
            <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: C.ink }} numberOfLines={1}>{s.name}</Text>
            <View style={st.pill}><Text style={st.pillText}>{t("SPONSORLU")}</Text></View>
          </View>
          <Text style={{ fontSize: 12, color: C.faint, marginTop: 2, lineHeight: 17 }} numberOfLines={2}>{s.tagline}</Text>
        </View>
      </View>
      <View style={[st.cta, { backgroundColor: s.color }]}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{s.cta || t("İncele")}</Text>
        <Ionicons name="arrow-forward" size={14} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

const mkSt = () => StyleSheet.create({
  card: {
    backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1.5, borderStyle: "dashed",
  },
  logo: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  logoImgBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  compactLogo: { width: 28, height: 28, borderRadius: 7, backgroundColor: "#FFFFFF" },
  pill: { backgroundColor: C.chalk, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.line },
  pillText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.6, color: C.faint },
  cta: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: 12, paddingVertical: 10, marginTop: 12,
  },
  compact: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface,
    borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", paddingHorizontal: 12, paddingVertical: 9, marginBottom: 12,
  },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
