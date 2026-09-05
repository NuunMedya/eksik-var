import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";

/* Merkez 2.0 — Eksik Var imzası:
   1) Takım & Topluluk: tam genişlik satır kartlar
   2) Maç & Oyuncu: kompakt 3'lü kareler
   3) Oyun Salonu: koyu, yana kayan arcade şeridi  */
const SATIRLAR = [
  { key: "maclarim", emoji: "🗓", renk: "#DBEAFE", title: "Maçlarım",       desc: "Katıldığın ve kurduğun maçlar" },
  { key: "kulup",   emoji: "🏘", renk: "#FEF9C3", title: "Kulüp İlanları", desc: "Oyuncu arayan takımlara katıl" },
  { key: "sahalar", emoji: "🗺", renk: "#D1FAE5", title: "Sahalar",        desc: "Yakınındaki sahaları bul, yol tarifi al" },
  { key: "kadro",   emoji: "📋", renk: "#DBEAFE", title: "Kadro Dene",     desc: "Diziliş tahtasında takımını kur" },
  { key: "vitrin",  emoji: "🎽", renk: "#FFEDD5", title: "Vitrine Çık",    desc: "Kendini tanıt, teklifler gelsin" },
];

const OYUNLAR = [
  { key: "arena",    emoji: "🧠", renk: "#4C1D95", title: "Arena",          desc: "Bilgi" },
  { key: "penalti",  emoji: "🥅", renk: "#14532D", title: "Penaltı",        desc: "Düello" },
  { key: "basket",   emoji: "🏀", renk: "#7C2D12", title: "Basket Yağmuru", desc: "45 sn" },
  { key: "voleybol", emoji: "🏐", renk: "#1E3A5F", title: "Libero",         desc: "Kurtar" },
  { key: "tenis",    emoji: "🎾", renk: "#3F6212", title: "Duvar Rallisi",  desc: "Ralli" },
];

export default function HubScreen({ onGo, user }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 20 }}>{t("Merkez")}</Text>
        <Text style={{ color: C.mist, fontSize: 12, marginTop: 2 }}>
          {t("Ne lazımsa tek ekranda")}{user && user.name ? ` · ${user.name.split(" ")[0]}` : ""} ⚽
        </Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 130 }}>
        <Text style={st.bolum}>{t("TOPLULUK & SAHA")}</Text>
        {SATIRLAR.map((k) => (
          <TouchableOpacity key={k.key} onPress={() => onGo(k.key)} activeOpacity={0.85} style={st.satir}>
            <View style={[st.rozet, { backgroundColor: k.renk }]}><Text style={{ fontSize: 22 }}>{k.emoji}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={st.satirBaslik}>{t(k.title)}</Text>
              <Text style={st.satirAlt}>{t(k.desc)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.gray} />
          </TouchableOpacity>
        ))}

        <Text style={st.bolum}>🎮 {t("OYUN SALONU")} · {OYUNLAR.length}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 6 }}>
          {OYUNLAR.map((o) => (
            <TouchableOpacity key={o.key} onPress={() => onGo(o.key)} activeOpacity={0.85}
              style={[st.oyun, { backgroundColor: o.renk }]}>
              <Text style={{ fontSize: 34 }}>{o.emoji}</Text>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{t(o.title)}</Text>
              <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{t(o.desc)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={st.yakinda}>
          <Text style={{ fontSize: 12, color: C.faint }}>
            🏆 {t("Turnuvalar")} · 🎬 {t("Videolu İlan")} — <Text style={{ fontWeight: "900", color: C.kit }}>{t("YAKINDA")}</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  bolum: { fontSize: 11, fontWeight: "900", letterSpacing: 1, color: C.turfText, marginTop: 16, marginBottom: 8, marginLeft: 4 },
  satir: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12, marginBottom: 8 },
  rozet: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  satirBaslik: { fontSize: 15, fontWeight: "900", color: C.ink },
  satirAlt: { fontSize: 11.5, color: C.faint, marginTop: 1 },
  kareIzgara: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kare: { width: "31.5%", aspectRatio: 1.05, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, alignItems: "center", justifyContent: "center", gap: 6 },
  kareBaslik: { fontSize: 11.5, fontWeight: "900", color: C.turfText },
  kareRozet: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  oyun: { width: 128, borderRadius: 18, padding: 14, gap: 4 },
  yakinda: { alignItems: "center", marginTop: 18, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingVertical: 10 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
