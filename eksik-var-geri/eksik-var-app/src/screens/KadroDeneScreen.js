import React, { useState, useMemo } from "react";
import { BACK_ICON } from "../components";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Share, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { parseRoster } from "../roster";
import { makeTeams, TEAM_NAMES } from "../lineup";

/* Kadro Dene: maç/etkinlik gerekmeden isim listesinden dengeli kura.
   Çiplere dokununca 🧤 kaleci işareti açılıp kapanır. */
export default function KadroDeneScreen({ onBack }) {
  const [metin, setMetin] = useState("");
  const [gkAyar, setGkAyar] = useState({});           // isim → true/false (elle değişiklik)
  const [takimlar, setTakimlar] = useState(null);

  const adaylar = useMemo(() => parseRoster(metin).map((p) => ({
    ...p, gk: gkAyar[p.name] != null ? gkAyar[p.name] : p.gk,
  })), [metin, gkAyar]);

  const oyuncular = adaylar.map((p, i) => ({
    id: "k" + i, name: p.name, rating: 4, positions: p.gk ? ["kaleci"] : [],
  }));

  const cek = () => setTakimlar(makeTeams(oyuncular, "dengeli"));
  const paylas = () => {
    if (!takimlar) return;
    const satir = (tn, team) => `${tn.emoji} ${tn.name}: ${team.map((p) => p.name).join(", ")}`;
    Share.share({ message: `⚽ ${t("Kadro Denemesi")}\n${satir(TEAM_NAMES[0], takimlar.A)}\n${satir(TEAM_NAMES[1], takimlar.B)}` }).catch(() => {});
  };

  const TakimKutu = ({ tn, team, renk, cerceve }) => (
    <View style={[st.takim, { borderColor: cerceve }]}>
      <View style={[st.takimBas, { backgroundColor: renk }]}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{tn.emoji} {tn.name}</Text>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 11 }}>{team.length} {t("kişi")}</Text>
      </View>
      {team.map((p) => (
        <View key={p.id} style={st.satir}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink, flex: 1 }} numberOfLines={1}>{p.name}</Text>
          {(p.positions || []).includes("kaleci") && <Text style={{ fontSize: 12 }}>🧤</Text>}
        </View>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.chalk }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name={BACK_ICON} size={24} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>📋 {t("Kadro Dene")}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>{t("Yaz ya da WhatsApp'tan yapıştır — kaleci için çipe dokun")}</Text>
        </View>
        {takimlar && (
          <TouchableOpacity onPress={paylas} style={st.iconBtn}><Ionicons name="share-social-outline" size={18} color="#fff" /></TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <TextInput value={metin} onChangeText={(x) => { setMetin(x); setTakimlar(null); }} multiline
          placeholder={"Ali Yılmaz\nVeli (kaleci)\nHasan\nOzan…"} placeholderTextColor={C.placeholder} style={st.giris} />
        {adaylar.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {adaylar.map((p, i) => (
              <TouchableOpacity key={i} onPress={() => { setGkAyar((g) => ({ ...g, [p.name]: !p.gk })); setTakimlar(null); }}
                style={[st.cip, p.gk && { backgroundColor: C.kitSoft, borderColor: C.kit }]}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: p.gk ? C.kit : C.turfText }}>{p.gk ? "🧤 " : ""}{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity disabled={oyuncular.length < 2} onPress={cek}
          style={[st.cta, oyuncular.length < 2 && { opacity: 0.4 }]}>
          <Ionicons name="shuffle" size={17} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
            {takimlar ? t("Yeniden karıştır") : `${t("Kurayı çek")}${oyuncular.length ? ` (${oyuncular.length})` : ""}`}
          </Text>
        </TouchableOpacity>

        {takimlar && (
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TakimKutu tn={TEAM_NAMES[0]} team={takimlar.A} renk={C.pitch} cerceve={C.pitchSoft} />
            <TakimKutu tn={TEAM_NAMES[1]} team={takimlar.B} renk={C.kit} cerceve={C.kitSoft} />
          </View>
        )}
        {takimlar && (
          <Text style={{ fontSize: 12, color: C.faint, textAlign: "center", marginTop: 12 }}>
            {t("Kaleciler ayrı takımlara dağıtıldı. Beğenmediysen yeniden karıştır, beğendiysen paylaş →")} 📤
          </Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  giris: { backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12, minHeight: 110, maxHeight: 190, fontSize: 14, color: C.ink, textAlignVertical: "top" },
  cip: { backgroundColor: C.surface, borderRadius: 999, borderWidth: 1, borderColor: C.line, paddingHorizontal: 10, paddingVertical: 5 },
  cta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.turf, borderRadius: 14, paddingVertical: 13, marginTop: 14 },
  takim: { flex: 1, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1.5, overflow: "hidden" },
  takimBas: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 10, paddingVertical: 7 },
  satir: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
