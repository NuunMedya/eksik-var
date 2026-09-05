import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BACK_ICON } from "../components";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";

const OYUNLAR = [
  { key: "arena",    emoji: "🧠", renk: "#4C1D95", title: "Arena",          desc: "Futbol bilgisi · solo & düello" },
  { key: "penalti",  emoji: "🥅", renk: "#14532D", title: "Penaltı",        desc: "Sırayla at-tut düellosu" },
  { key: "basket",   emoji: "🏀", renk: "#7C2D12", title: "Basket Yağmuru", desc: "45 saniyede kaç basket?" },
  { key: "voleybol", emoji: "🏐", renk: "#1E3A5F", title: "Libero",         desc: "Topları yere düşürme" },
  { key: "tenis",    emoji: "🎾", renk: "#3F6212", title: "Duvar Rallisi",  desc: "Ralli ne kadar sürer?" },
];

export default function OyunSalonuScreen({ onBack, onGo }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <Ionicons name={BACK_ICON} size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>🎮 {t("Oyun Salonu")}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>{t("Mola arasında kısa bir keyif")}</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {OYUNLAR.map((o) => (
            <TouchableOpacity key={o.key} onPress={() => onGo(o.key)} activeOpacity={0.88}
              style={[st.kart, { backgroundColor: o.renk }]}>
              <Text style={{ fontSize: 40 }}>{o.emoji}</Text>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15, marginTop: 6 }}>{t(o.title)}</Text>
              <Text style={{ color: "rgba(255,255,255,0.72)", fontSize: 11.5, marginTop: 3 }}>{t(o.desc)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.pitchDark, paddingTop: 58, paddingBottom: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  kart: { width: "47.5%", borderRadius: 18, padding: 14, minHeight: 128 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
