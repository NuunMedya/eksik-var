import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { CATEGORIES } from "../data";

/* Ana akışın üstünde "🏟️ Boş saatler" şeridi — işletmelerin dolmayan saatleri.
   "Bu saati al" → saha/saat/ücret dolu maç ilanı formu açılır. */
export default function BosSaatSerit({ slots = [], onTake, kisi = 14 }) {
  if (!slots.length) return null;
  return (
    <View style={st.kutu}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, marginBottom: 8 }}>
        <Text style={{ fontSize: 14 }}>🏟️</Text>
        <Text style={st.baslik}>{t("Boş saatler")}</Text>
        <Text style={st.alt}>· {t("saha sahiplerinden, ilk alan açar")}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
        {slots.map((s) => {
          const kat = CATEGORIES.find((k) => k.id === s.cat);
          const kisiBasi = s.toplam > 0 ? Math.ceil(s.toplam / kisi) : 0;
          return (
            <View key={s.id} style={st.kart}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 15 }}>{kat ? kat.icon : "🏟️"}</Text>
                <Text style={st.saat} numberOfLines={1}>{s.date}</Text>
              </View>
              <Text style={st.saha} numberOfLines={1}>{s.venue}</Text>
              <Text style={st.meta} numberOfLines={1}>{[s.district, `${s.sure} dk`, s.toplam > 0 ? `${s.toplam}₺ (≈${kisiBasi}₺/kişi)` : t("ücret sorulur")].filter(Boolean).join(" · ")}</Text>
              {s.not ? <Text style={st.not} numberOfLines={1}>{s.not}</Text> : null}
              <TouchableOpacity onPress={() => onTake(s)} activeOpacity={0.9} style={st.al}>
                <Ionicons name="flash" size={13} color="#fff" />
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 12.5 }}>{t("Bu saati al")}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  kutu: { paddingVertical: 10, marginBottom: 4 },
  baslik: { fontSize: 13, fontWeight: "900", color: C.ink },
  alt: { fontSize: 11.5, color: C.faint, flex: 1 },
  kart: { width: 220, backgroundColor: C.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line },
  saat: { fontSize: 13, fontWeight: "900", color: C.kit, flex: 1 },
  saha: { fontSize: 14, fontWeight: "900", color: C.ink, marginTop: 6 },
  meta: { fontSize: 11.5, color: C.faint, marginTop: 3 },
  not: { fontSize: 11, color: C.faint, marginTop: 2, fontStyle: "italic" },
  al: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, backgroundColor: C.turf, borderRadius: 10, paddingVertical: 8, marginTop: 10 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
