import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { KOSELER, kaleciSec, sut } from "../penalti";

const TOPLAM = 5;
const KOSE_ETIKET = { sol: "↖ Sol", orta: "⬆ Orta", sag: "↗ Sağ" };

export default function PenaltyScreen({ onBack }) {
  const [atislar, setAtislar] = useState([]);        // [{gol, kaleci, secim}]
  const [son, setSon] = useState(null);              // son atışın sahnesi
  const [rekor, setRekor] = useState(0);
  const bitti = atislar.length >= TOPLAM;
  const gol = atislar.filter((a) => a.gol).length;

  const vur = (secim) => {
    if (bitti || son) return;
    const kaleci = kaleciSec();
    const sonuc = sut(secim, kaleci);
    setSon({ ...sonuc, secim });
    setTimeout(() => {
      setAtislar((a) => {
        const yeni = [...a, { ...sonuc, secim }];
        if (yeni.length >= TOPLAM) setRekor((r) => Math.max(r, yeni.filter((x) => x.gol).length));
        return yeni;
      });
      setSon(null);
    }, 900);
  };
  const tekrar = () => { setAtislar([]); setSon(null); };

  const sahne = son
    ? (son.gol ? `⚽ ${t("GOOOL!")} ${t("Kaleci")} ${KOSE_ETIKET[son.kaleci].split(" ")[1]}'a daldı`
               : `🧤 ${t("Kurtardı!")} ${t("Aynı köşeyi okudu")}`)
    : bitti ? "" : t("Köşeni seç ve vur!");

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>🥅 {t("Penaltı Düellosu")}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>{t("5 atış · kaleciye karşı")}{rekor ? ` · ${t("Rekor")}: ${rekor}/5` : ""}</Text>
        </View>
      </View>

      <View style={{ flex: 1, padding: 18, alignItems: "center", justifyContent: "center" }}>
        <View style={st.seri}>
          {Array.from({ length: TOPLAM }).map((_, i) => (
            <Text key={i} style={{ fontSize: 26 }}>
              {i < atislar.length ? (atislar[i].gol ? "⚽" : "❌") : "▫️"}
            </Text>
          ))}
        </View>

        <View style={st.kale}>
          <Text style={{ fontSize: 56 }}>{son ? (son.gol ? "🥳" : "🧤") : "🥅"}</Text>
          <Text style={{ fontSize: 14, fontWeight: "800", color: C.ink, textAlign: "center", marginTop: 8, minHeight: 40 }}>
            {bitti ? `${gol}/${TOPLAM} ${t("gol")} — ${gol === TOPLAM ? t("Kusursuz seri! 🏆") : gol >= 4 ? t("Golcü ayağın var! 🔥") : gol >= 3 ? t("Fena değil — biraz daha soğukkanlılık 😉") : t("Kaleci bugün formda… tekrar dene! 🧤")}` : sahne}
          </Text>
        </View>

        {!bitti ? (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 22 }}>
            {KOSELER.map((k) => (
              <TouchableOpacity key={k} disabled={!!son} onPress={() => vur(k)}
                style={[st.koseBtn, son && { opacity: 0.5 }]}>
                <Text style={{ fontSize: 15, fontWeight: "900", color: "#fff" }}>{t(KOSE_ETIKET[k])}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TouchableOpacity onPress={tekrar} style={[st.koseBtn, { backgroundColor: C.kit, marginTop: 22, paddingHorizontal: 28 }]}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: "900", color: "#fff" }}>{t("Tekrar oyna")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  seri: { flexDirection: "row", gap: 8, marginBottom: 24 },
  kale: { backgroundColor: C.surface, borderRadius: 24, borderWidth: 1, borderColor: C.line, padding: 24, alignItems: "center", width: "100%" },
  koseBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.pitch, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
