import React, { useState, useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { YONLER, blokYonu, zamanla, smac, volTur } from "../voleybol";

/* Smaç Serisi: pas havalanır, TAM TEPEDE boş yöne vur.
   Erken=file, geç=aut, blokçunun yönü=blok. 3 can, kalıcı rekor. */
const YON_X = { sol: -84, orta: 0, sag: 84 };
const YON_ETIKET = { sol: "↙ Sol", orta: "⬇ Orta", sag: "↘ Sağ" };

export default function VolleyScreen({ onBack }) {
  const [faz, setFaz] = useState("menu");            // menu | ralli | son
  const [skor, setSkor] = useState(0);
  const [can, setCan] = useState(3);
  const [blok, setBlok] = useState("orta");
  const [bant, setBant] = useState("");
  const [rekor, setRekor] = useState(null);
  const [sahaH, setSahaH] = useState(0);

  const topY = useRef(new Animated.Value(0)).current;
  const topX = useRef(new Animated.Value(0)).current;
  const basRef = useRef(0);
  const turRef = useRef(volTur(0));
  const kilit = useRef(false);

  useEffect(() => { AsyncStorage.getItem("ev_voleybol_rekor").then((r) => r && setRekor(Number(r))).catch(() => {}); }, []);

  const pasAt = (sayi) => {
    const tur = volTur(sayi);
    turRef.current = tur;
    setBlok(blokYonu());
    setBant(""); kilit.current = false;
    topY.setValue(0); topX.setValue(0);
    basRef.current = Date.now();
    const tepeY = -(Math.max(sahaH, 260) - 150);
    Animated.sequence([
      Animated.timing(topY, { toValue: tepeY, duration: tur.sure / 2, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(topY, { toValue: 0, duration: tur.sure / 2, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && !kilit.current) sonuc("gec", "orta");   // hiç vurmadı → aut
    });
  };

  const basla = () => { setSkor(0); setCan(3); setFaz("ralli"); setTimeout(() => pasAt(0), 350); };

  const vur = (yon) => {
    if (faz !== "ralli" || kilit.current) return;
    kilit.current = true;
    topY.stopAnimation();
    const gecen = Date.now() - basRef.current;
    const z = zamanla(gecen, turRef.current.sure / 2, turRef.current.tol);
    sonuc(z, yon);
  };

  const sonuc = (z, yon) => {
    kilit.current = true;
    const r = smac(yon, blok, z);
    if (r === "sayi") {
      Animated.parallel([
        Animated.timing(topX, { toValue: YON_X[yon], duration: 260, useNativeDriver: true }),
        Animated.timing(topY, { toValue: -(Math.max(sahaH, 260) - 60), duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      setBant("💥 " + t("SMAÇ!"));
      setSkor((s) => { const n = s + 1; setTimeout(() => pasAt(n), 750); return n; });
    } else {
      setBant(r === "file" ? "🥅 " + t("File! Erken vurdun") : r === "aut" ? "🌪 " + t("Aut! Geç kaldın") : "🙅 " + t("BLOK! Yönü okudular"));
      setCan((c) => {
        const n = c - 1;
        if (n <= 0) { setTimeout(bitir, 700); } else setTimeout(() => pasAt(skor), 850);
        return n;
      });
    }
  };

  const bitir = () => {
    setFaz("son");
    setSkor((s) => {
      if (rekor == null || s > rekor) { setRekor(s); AsyncStorage.setItem("ev_voleybol_rekor", String(s)).catch(() => {}); }
      return s;
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#12324A" }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17, flex: 1 }}>🏐 {t("Smaç Serisi")}</Text>
        {faz === "ralli" && <Text style={{ fontSize: 15 }}>{"❤️".repeat(can)}{"🖤".repeat(3 - can)}</Text>}
      </View>

      {faz === "menu" && (
        <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 56 }}>🏐</Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>{t("Kaç smaç üst üste?")}</Text>
          <Text style={{ color: "#BFDBEF", fontSize: 13, textAlign: "center", lineHeight: 19 }}>
            {t("Pas havalanır — TAM TEPEDEYKEN blokçunun OLMADIĞI yöne bas. Erken = file, geç = aut. 3 canın var; her sayıda hızlanır!")}
          </Text>
          {rekor != null && <Text style={{ color: C.star, fontWeight: "900", fontSize: 15 }}>⭐ {t("Rekor")}: {rekor}</Text>}
          <TouchableOpacity onPress={basla} style={st.buyukBtn}><Text style={st.buyukBtnText}>{t("Başla")} 🏐</Text></TouchableOpacity>
        </View>
      )}

      {(faz === "ralli" || faz === "son") && (
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 26, marginTop: 4 }}>{skor}</Text>

          <View style={st.sahne} onLayout={(e) => setSahaH(e.nativeEvent.layout.height)}>
            <View style={st.file} />
            <View style={{ position: "absolute", top: 26, flexDirection: "row", width: 252, justifyContent: "space-between" }}>
              {YONLER.map((y) => (
                <Text key={y} style={{ fontSize: 34, opacity: blok === y ? 1 : 0.12 }}>🙅</Text>
              ))}
            </View>
            <Animated.Text style={[st.top, { transform: [{ translateX: topX }, { translateY: topY }] }]}>🏐</Animated.Text>
            {!!bant && <View style={st.bant}><Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>{bant}</Text></View>}
          </View>

          {faz === "ralli" && (
            <View style={{ flexDirection: "row", gap: 10, paddingBottom: 28 }}>
              {YONLER.map((y) => (
                <TouchableOpacity key={y} onPress={() => vur(y)} style={st.yonBtn}>
                  <Text style={{ color: "#12324A", fontWeight: "900", fontSize: 15 }}>{t(YON_ETIKET[y])}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {faz === "son" && (
            <View style={{ alignItems: "center", gap: 10, paddingBottom: 30 }}>
              <Text style={{ fontSize: 44 }}>{skor >= (rekor || 0) && skor > 0 ? "🏆" : "🏐"}</Text>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>{skor} {t("smaç")}</Text>
              {rekor != null && <Text style={{ color: C.star, fontWeight: "900" }}>⭐ {t("Rekor")}: {rekor}</Text>}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity onPress={basla} style={st.buyukBtn}><Text style={st.buyukBtnText}>{t("Tekrar")} 🔁</Text></TouchableOpacity>
                <TouchableOpacity onPress={onBack} style={[st.buyukBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                  <Text style={st.buyukBtnText}>{t("Merkez")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  sahne: { flex: 1, width: "100%", alignItems: "center", justifyContent: "flex-end" },
  file: { position: "absolute", top: 70, width: 280, height: 5, backgroundColor: "rgba(255,255,255,0.75)", borderRadius: 3 },
  top: { position: "absolute", bottom: 16, fontSize: 36 },
  bant: { position: "absolute", top: 120, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  yonBtn: { backgroundColor: "#7DD3FC", borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14 },
  buyukBtn: { backgroundColor: "#0EA5E9", borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  buyukBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
