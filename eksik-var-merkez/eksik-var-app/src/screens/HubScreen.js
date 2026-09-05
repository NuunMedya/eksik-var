import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";

/* Merkez: uygulamanın komuta ekranı — kart ızgarası.
   props: onGo(key), user */
const KARTLAR = [
  { key: "create",  emoji: "⚡", renk: "#DCFCE7", title: "Hızlı Maç Kur",   desc: "İlanını aç, kadron dolsun" },
  { key: "kadro",   emoji: "📋", renk: "#E0F2FE", title: "Kadro Dene",      desc: "İsimleri yapıştır, dengeli kura çek" },
  { key: "penalti", emoji: "🥅", renk: "#FEE2E2", title: "Penaltı",         desc: "5 atışlık düello — kaleciyi yen" },
  { key: "pazar",   emoji: "🧍", renk: "#FEF3C7", title: "Transfer Pazarı", desc: "Takım arayan oyuncuları keşfet" },
  { key: "vitrin",  emoji: "🏪", renk: "#FFEDD5", title: "Vitrine Çık",     desc: "Kendini tanıt, teklifler gelsin" },
  { key: "rakip",   emoji: "🆚", renk: "#FCE7F3", title: "Rakip Bul",       desc: "Takımına rakip, hazır maç" },
  { key: "kesfet",  emoji: "🧭", renk: "#EDE9FE", title: "Keşfet",          desc: "Oyuncu paylaşımları ve arama" },
  { key: "sahalar", emoji: "🗺", renk: "#D1FAE5", title: "Sahalar",         desc: "Yakınındaki sahaları bul" },
  { key: "turnuva", emoji: "🏆", renk: "#F3E8FF", title: "Turnuvalar",      desc: "Kayıt aç, fikstürü izle", badge: "YAKINDA" },
  { key: "video",   emoji: "🎬", renk: "#FFE4E6", title: "Videolu İlan",    desc: "Keşfet'te video paylaş", badge: "YAKINDA" },
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
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 130 }}>
        <View style={st.grid}>
          {KARTLAR.map((k) => (
            <TouchableOpacity key={k.key} onPress={() => onGo(k.key)} activeOpacity={0.85} style={st.card}>
              <View style={[st.bubble, { backgroundColor: k.renk }]}>
                <Text style={{ fontSize: 24 }}>{k.emoji}</Text>
              </View>
              {k.badge && (
                <View style={st.badge}><Text style={st.badgeText}>{t(k.badge)}</Text></View>
              )}
              <Text style={st.title}>{t(k.title)}</Text>
              <Text style={st.desc}>{t(k.desc)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  card: {
    width: "48.5%", backgroundColor: C.surface, borderRadius: 20, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: C.line, minHeight: 150,
  },
  bubble: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  badge: { position: "absolute", top: 12, right: 12, backgroundColor: C.kitSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5, color: C.kit },
  title: { fontSize: 16, fontWeight: "900", color: C.ink },
  desc: { fontSize: 12, color: C.faint, marginTop: 3, lineHeight: 16 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
