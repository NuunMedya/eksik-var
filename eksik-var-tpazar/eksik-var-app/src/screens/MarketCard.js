import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar } from "../components";
import { CATEGORIES, GUNLER, posLabel } from "../data";

// Transfer Pazarı kartı: öz beyan değil, profilden gelen kanıtlı istatistik.
export default function MarketCard({ p, onOpen, onOffer = null }) {
  const kat = CATEGORIES.find((c) => c.id === p.cat) || {};
  return (
    <TouchableOpacity onPress={onOpen} activeOpacity={0.85} style={st.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar name={p.name} uri={p.avatar} size={44} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: "900", color: C.ink }} numberOfLines={1}>{p.name}</Text>
            {p.userId === "me" && <View style={st.senPill}><Text style={st.senText}>{t("SEN")}</Text></View>}
          </View>
          <Text style={{ fontSize: 12, color: C.faint, marginTop: 1 }}>
            ⭐ {p.rating} ({p.count} {t("maç")}) · %{p.rel} {t("güvenilir")}{p.district ? " · " + p.district : ""}
          </Text>
        </View>
        <View style={st.katChip}><Text style={{ fontSize: 15 }}>{kat.icon}</Text></View>
      </View>
      {(p.positions || []).length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 9 }}>
          {p.positions.map((id) => (
            <View key={id} style={{ backgroundColor: C.pitchSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: C.pitch }}>{posLabel(id)}</Text>
            </View>
          ))}
        </View>
      )}
      {(p.days || []).length > 0 && (
        <View style={{ flexDirection: "row", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
          {p.days.map((d) => (
            <View key={d} style={st.dayChip}><Text style={st.dayText}>{GUNLER[d]}</Text></View>
          ))}
        </View>
      )}
      {!!p.bio && <Text style={{ fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 18 }} numberOfLines={2}>{p.bio}</Text>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
          <Text style={{ fontSize: 12, fontWeight: "900", color: C.pitch }}>{t("Profili gör")}</Text>
          <Ionicons name="chevron-forward" size={13} color={C.pitch} />
        </View>
        {onOffer && p.userId !== "me" && (
          <TouchableOpacity onPress={() => onOffer(p)}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.kit, borderRadius: 12, paddingVertical: 11 }}>
            <Text style={{ fontSize: 14 }}>💌</Text>
            <Text style={{ fontSize: 13, fontWeight: "900", color: "#fff" }}>{t("Teklif gönder")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

const mkSt = () => StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  senPill: { backgroundColor: C.kitSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  senText: { fontSize: 9, fontWeight: "900", color: C.kit, letterSpacing: 0.5 },
  katChip: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.chalk, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  dayChip: { backgroundColor: C.pitchSoft, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  dayText: { fontSize: 11, fontWeight: "800", color: C.turfText },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
