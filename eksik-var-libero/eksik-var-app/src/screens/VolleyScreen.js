import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, PanResponder, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { spawnAyar, kurtardiMi, inisSuresi, servisUret } from "../voleybol";

/* Libero: servisler üstten yağar, parmağınla liberoyu kaydır, hepsini kurtar.
   Skor arttıkça hızlanır ve sıklaşır; aynı anda birden çok top olabilir. 3 can. */
const SERIT = 96;
const LIBERO_YARIM = 40;
const TOP = 30;

export default function VolleyScreen({ onBack }) {
  const [faz, setFaz] = useState("menu");
  const [skor, setSkor] = useState(0);
  const [can, setCan] = useState(3);
  const [seri, setSeri] = useState(0);
  const [rekor, setRekor] = useState(null);
  const [toplar, setToplar] = useState([]);          // [{id, xy: ValueXY}]

  const liberoX = useRef(new Animated.Value(0)).current;
  const liberoRef = useRef(0);
  const alanRef = useRef({ w: 0, h: 0 });
  const skorRef = useRef(0);
  const canliRef = useRef(false);
  const zamanlayici = useRef(null);
  const sayac = useRef(0);

  useEffect(() => { AsyncStorage.getItem("ev_voleybol_rekor").then((r) => r && setRekor(Number(r))).catch(() => {}); }, []);
  useEffect(() => { const id = liberoX.addListener(({ value }) => { liberoRef.current = value; }); return () => liberoX.removeListener(id); }, [liberoX]);
  useEffect(() => () => { canliRef.current = false; if (zamanlayici.current) clearTimeout(zamanlayici.current); }, []);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (e) => {
      const w = alanRef.current.w || 300;
      const x = Math.min(Math.max(e.nativeEvent.locationX ?? e.nativeEvent.pageX, LIBERO_YARIM), w - LIBERO_YARIM);
      liberoX.setValue(x);
    },
  })).current;

  const topDus = useCallback(() => {
    if (!canliRef.current) return;
    const { w, h } = alanRef.current;
    const ayar = spawnAyar(skorRef.current);
    const s = servisUret(w, ayar);
    const id = ++sayac.current;
    const xy = new Animated.ValueXY({ x: s.x0, y: -TOP });
    setToplar((ts) => [...ts, { id, xy }]);
    const hedefY = h - SERIT - 26 - TOP;               // libero hizası
    Animated.timing(xy, {
      toValue: { x: s.hedefX, y: hedefY },
      duration: inisSuresi(hedefY + TOP, s.hiz),
      easing: Easing.in(Easing.quad),
      useNativeDriver: false,
    }).start(({ finished }) => {
      setToplar((ts) => ts.filter((x) => x.id !== id));
      if (!finished || !canliRef.current) return;
      if (kurtardiMi(s.hedefX + TOP / 2, liberoRef.current, LIBERO_YARIM + 8)) {
        setSeri((x) => x + 1);
        setSkor((x) => { skorRef.current = x + 1; return x + 1; });
      } else {
        setSeri(0);
        setCan((c) => {
          const n = c - 1;
          if (n <= 0) { canliRef.current = false; setTimeout(bitir, 250); }
          return n;
        });
      }
    });
    zamanlayici.current = setTimeout(topDus, spawnAyar(skorRef.current).aralik);
  }, []);

  const basla = () => {
    setSkor(0); skorRef.current = 0; setCan(3); setSeri(0); setToplar([]); setFaz("oyun");
    canliRef.current = true;
    setTimeout(topDus, 500);
  };

  const bitir = () => {
    canliRef.current = false;
    if (zamanlayici.current) clearTimeout(zamanlayici.current);
    setToplar([]);
    setFaz("son");
    setSkor((s) => {
      if (rekor == null || s > rekor) { setRekor(s); AsyncStorage.setItem("ev_voleybol_rekor", String(s)).catch(() => {}); }
      return s;
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#12324A" }}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => { canliRef.current = false; onBack(); }} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17, flex: 1 }}>🏐 {t("Libero")}</Text>
        {faz === "oyun" && <Text style={{ fontSize: 15 }}>{"❤️".repeat(can)}{"🖤".repeat(3 - can)}</Text>}
      </View>

      {faz === "menu" && (
        <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 56 }}>🙌</Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>{t("Hiçbir top yere düşmesin!")}</Text>
          <Text style={{ color: "#BFDBEF", fontSize: 13, textAlign: "center", lineHeight: 19 }}>
            {t("Servisler yağar — liberoyu parmağınla kaydır, her topu karşıla. Hızlanır, sıklaşır, bazıları çapraz gelir. 3 canın var!")}
          </Text>
          {rekor != null && <Text style={{ color: C.star, fontWeight: "900", fontSize: 15 }}>⭐ {t("Rekor")}: {rekor}</Text>}
          <TouchableOpacity onPress={basla} style={st.buyukBtn}><Text style={st.buyukBtnText}>{t("Başla")} 🏐</Text></TouchableOpacity>
        </View>
      )}

      {(faz === "oyun" || faz === "son") && (
        <View style={{ flex: 1 }}>
          <View style={{ alignItems: "center", marginTop: 2 }}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 26 }}>{skor}</Text>
            {seri >= 5 && <Text style={{ color: "#7DD3FC", fontSize: 12, fontWeight: "800" }}>🔥 {t("seri")} {seri}</Text>}
          </View>
          <View style={st.alan} {...pan.panHandlers}
            onLayout={(e) => { const { width, height } = e.nativeEvent.layout; alanRef.current = { w: width, h: height }; liberoX.setValue(width / 2); }}>
            {toplar.map((tp) => (
              <Animated.Text key={tp.id} style={[st.top, { transform: [{ translateX: tp.xy.x }, { translateY: tp.xy.y }] }]}>🏐</Animated.Text>
            ))}
            <View style={st.serit}>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "800" }}>👆 {t("Parmağını buradan sürükle")}</Text>
            </View>
            <Animated.Text style={[st.libero, { transform: [{ translateX: Animated.subtract(liberoX, LIBERO_YARIM) }] }]}>🙌</Animated.Text>
            {faz === "son" && (
              <View style={st.sonPerde}>
                <Text style={{ fontSize: 44 }}>{skor >= (rekor || 0) && skor > 0 ? "🏆" : "🏐"}</Text>
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>{skor} {t("kurtarış")}</Text>
                {rekor != null && <Text style={{ color: C.star, fontWeight: "900" }}>⭐ {t("Rekor")}: {rekor}</Text>}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                  <TouchableOpacity onPress={basla} style={st.buyukBtn}><Text style={st.buyukBtnText}>{t("Tekrar")} 🔁</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => { canliRef.current = false; onBack(); }} style={[st.buyukBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                    <Text style={st.buyukBtnText}>{t("Merkez")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  alan: { flex: 1, margin: 12, marginTop: 6, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", overflow: "hidden" },
  top: { position: "absolute", left: 0, top: 0, fontSize: TOP },
  serit: { position: "absolute", left: 0, right: 0, bottom: 0, height: SERIT, backgroundColor: "rgba(255,255,255,0.07)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  libero: { position: "absolute", bottom: SERIT + 6, left: 0, fontSize: 40 },
  sonPerde: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.35)" },
  buyukBtn: { backgroundColor: "#0EA5E9", borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14 },
  buyukBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
