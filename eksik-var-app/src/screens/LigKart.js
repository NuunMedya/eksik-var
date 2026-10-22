import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { CATEGORIES } from "../data";

/* Lig Vitrini kartı — akışın üstünde (öne çıkan) ve her 8 ilanda bir (sponsorlu).
   "LİG İLANI" etiketi bilinçli olarak her zaman görünür. */
const tarihYaz = (iso) => {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? null : d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
};

export default function LigKart({ lig, onApply, onOpen, featured = false }) {
  const kat = CATEGORIES.find((k) => k.id === lig.cat);
  const meta = [lig.district || lig.city || "Tüm Türkiye", kat ? `${kat.icon} ${t(kat.name)}` : null, tarihYaz(lig.baslangic) ? `${tarihYaz(lig.baslangic)}'de başlıyor` : null].filter(Boolean).join("  ·  ");
  return (
    <View style={[st.kart, featured && st.kartOne]}>
      {lig.afis ? (
        <Image source={{ uri: lig.afis }} style={st.afis} resizeMode="cover" />
      ) : (
        <View style={[st.afis, st.afisBos]}>
          <Text style={{ fontSize: 34 }}>🏆</Text>
        </View>
      )}
      <View style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <View style={st.etiket}><Text style={st.etiketYazi}>🏆 {t("LİG İLANI")}</Text></View>
          {lig.kontenjan != null && lig.kontenjan <= 5 ? <Text style={{ fontSize: 11, fontWeight: "800", color: C.kit }}>{t("Son {n} takım", { n: lig.kontenjan })}</Text> : null}
        </View>
        <Text style={st.baslik} numberOfLines={2}>{lig.baslik}</Text>
        <Text style={st.meta} numberOfLines={1}>{meta}</Text>
        {lig.aciklama ? <Text style={st.aciklama} numberOfLines={featured ? 3 : 2}>{lig.aciklama}</Text> : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12 }}>
          {lig.takimUcreti ? (
            <View style={st.cip}><Ionicons name="pricetag-outline" size={12} color={C.turfText} /><Text style={st.cipYazi}>{lig.takimUcreti}</Text></View>
          ) : null}
          <View style={{ flex: 1 }} />
          {lig.link ? (
            <TouchableOpacity onPress={() => onOpen(lig)} style={st.ikincil} activeOpacity={0.85}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: C.turfText }}>{t("Detay")}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity onPress={() => onApply(lig)} style={st.birincil} activeOpacity={0.9}>
            <Ionicons name="logo-whatsapp" size={14} color="#fff" />
            <Text style={{ fontSize: 12, fontWeight: "900", color: "#fff" }}>{t("Başvur")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  kart: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: "hidden", marginBottom: 12 },
  kartOne: { borderColor: C.star, borderWidth: 1.5 },
  afis: { width: "100%", height: 150 },
  afisBos: { backgroundColor: C.turf, alignItems: "center", justifyContent: "center" },
  etiket: { backgroundColor: C.kitSoft, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  etiketYazi: { fontSize: 10, fontWeight: "900", color: C.kit, letterSpacing: 0.5 },
  baslik: { fontSize: 16, fontWeight: "900", color: C.ink },
  meta: { fontSize: 12, color: C.faint, marginTop: 3 },
  aciklama: { fontSize: 13, color: C.ink, lineHeight: 18, marginTop: 8 },
  cip: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.chalk, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  cipYazi: { fontSize: 12, fontWeight: "800", color: C.turfText },
  ikincil: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  birincil: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#25D366", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
