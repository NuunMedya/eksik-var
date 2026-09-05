import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, PanResponder, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { sonrakiSegment, karsiladiMi, sekme, hizKademe } from "../tenis";

/* Duvar Rallisi: raketi parmağınla kaydır, top duvardan seker.
   Her karşılayış +1 ve hızlanma; raketin kenarı açı verir. 3 can, kalıcı rekor. */
const RAKET_YARIM = 44;
const SERIT = 96;                                       // alttaki parmak şeridi
const TOP = 26;

export default function TennisScreen({ onBack }) {
  const [faz, setFaz] = useState("menu");
  const [skor, setSkor] = useState(0);
  const [can, setCan] = useState(3);
  const [rekor, setRekor] = useState(null);

  const topXY = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const raketX = useRef(new Animated.Value(0)).current;
  const raketRef = useRef(0);
  const hiz = useRef({ vx: 0.14, vy: 0.24 });
  const konum = useRef({ x: 40, y: 40 });
  const canliRef = useRef(false);
  const skorRef = useRef(0);
  const alanRef = useRef({ w: 0, h: 0 });

  useEffect(() => { AsyncStorage.getItem("ev_tenis_rekor").then((r) => r && setRekor(Number(r))).catch(() => {}); }, []);
  useEffect(() => { const id = raketX.addListener(({ value }) => { raketRef.current = value; }); return () => raketX.removeListener(id); }, [raketX]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (e) => {
      const w = alanRef.current.w || 300;
      const x = Math.min(Math.max(e.nativeEvent.locationX ?? e.nativeEvent.pageX, RAKET_YARIM), w - RAKET_YARIM);
      raketX.setValue(x);
    },
  })).current;

  const segmentOynat = useCallback(() => {
    if (!canliRef.current) return;
    const { w, h } = alanRef.current;
    const cizgi = h - SERIT - 26;                           // raket çizgisi (şeridin üstü)
    const s = sonrakiSegment(konum.current.x, konum.current.y, hiz.current.vx, hiz.current.vy, w - TOP, cizgi);
    Animated.timing(topXY, { toValue: { x: s.x2, y: s.y2 }, duration: Math.max(s.t, 16), easing: Easing.linear, useNativeDriver: false })
      .start(({ finished }) => {
        if (!finished || !canliRef.current) return;
        konum.current = { x: s.x2, y: s.y2 };
        if (s.tip === "alt") {
          const topMerkez = s.x2 + TOP / 2;
          if (karsiladiMi(topMerkez, raketRef.current, RAKET_YARIM + 6)) {
            setSkor((x) => {
              const n = x + 1; skorRef.current = n;
              hiz.current = sekme(hiz.current.vx, hiz.current.vy, topMerkez, raketRef.current, RAKET_YARIM, hizKademe(n));
              return n;
            });
          } else {
            canliRef.current = false;
            setCan((c) => {
              const n = c - 1;
              if (n <= 0) setTimeout(bitir, 300);
              else setTimeout(servis, 550);
              return n;
            });
            return;
          }
        } else { hiz.current = { vx: s.vx, vy: s.vy }; }
        segmentOynat();
      });
  }, [topXY]);

  const servis = () => {
    const { w } = alanRef.current;
    konum.current = { x: Math.random() * (w - 80) + 30, y: 30 };
    const k = hizKademe(skorRef.current);                       // can yansa da hız kademede kalır
    hiz.current = { vx: (Math.random() < 0.5 ? -1 : 1) * k * 0.5, vy: k * 0.87 };
    topXY.setValue(konum.current);
    canliRef.current = true;
    segmentOynat();
  };

  const basla = () => { setSkor(0); skorRef.current = 0; setCan(3); setFaz("oyun"); setTimeout(servis, 400); };

  const bitir = () => {
    canliRef.current = false;
    setFaz("son");
    setSkor((s) => {
      if (rekor == null || s > rekor) { setRekor(s); AsyncStorage.setItem("ev_tenis_rekor", String(s)).catch(() => {}); }
      return s;
    });
  };

  useEffect(() => () => { canliRef.current = false; }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "#14532D" }}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => { canliRef.current = false; onBack(); }} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17, flex: 1 }}>🎾 {t("Duvar Rallisi")}</Text>
        {faz === "oyun" && <Text style={{ fontSize: 15 }}>{"❤️".repeat(can)}{"🖤".repeat(3 - can)}</Text>}
      </View>

      {faz === "menu" && (
        <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 56 }}>🎾</Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>{t("Ralliyi ne kadar uzatırsın?")}</Text>
          <Text style={{ color: "#BBF7D0", fontSize: 13, textAlign: "center", lineHeight: 19 }}>
            {t("Raketi parmağınla kaydır. Top her vuruşta hızlanır; raketin kenarıyla vurursan açı değişir. 3 canın var!")}
          </Text>
          {rekor != null && <Text style={{ color: C.star, fontWeight: "900", fontSize: 15 }}>⭐ {t("Rekor")}: {rekor}</Text>}
          <TouchableOpacity onPress={basla} style={st.buyukBtn}><Text style={st.buyukBtnText}>{t("Başla")} 🎾</Text></TouchableOpacity>
        </View>
      )}

      {(faz === "oyun" || faz === "son") && (
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 26, textAlign: "center", marginTop: 4 }}>{skor}</Text>
          <View style={st.alan} {...pan.panHandlers}
            onLayout={(e) => { const { width, height } = e.nativeEvent.layout; alanRef.current = { w: width, h: height }; raketX.setValue(width / 2); }}>
            <View style={st.ustDuvar} />
            <Animated.Text style={[st.top, { transform: [{ translateX: topXY.x }, { translateY: topXY.y }] }]}>🎾</Animated.Text>
            <View style={st.serit}>
              <Text style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, fontWeight: "800" }}>👆 {t("Parmağını buradan sürükle")}</Text>
            </View>
            <Animated.View style={[st.raket, { transform: [{ translateX: Animated.subtract(raketX, RAKET_YARIM) }] }]} />
            {faz === "son" && (
              <View style={st.sonPerde}>
                <Text style={{ fontSize: 44 }}>{skor >= (rekor || 0) && skor > 0 ? "🏆" : "🎾"}</Text>
                <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>{skor} {t("vuruş")}</Text>
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
  ustDuvar: { height: 5, backgroundColor: "rgba(255,255,255,0.7)" },
  top: { position: "absolute", fontSize: TOP, left: 0, top: 0 },
  raket: { position: "absolute", bottom: SERIT + 12, left: 0, width: RAKET_YARIM * 2, height: 12, borderRadius: 7, backgroundColor: "#FDE047" },
  serit: { position: "absolute", left: 0, right: 0, bottom: 0, height: SERIT, backgroundColor: "rgba(255,255,255,0.07)", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  ipucu: { position: "absolute", bottom: 60, alignSelf: "center", color: "#BBF7D0", fontSize: 13 },
  sonPerde: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.35)" },
  buyukBtn: { backgroundColor: "#22C55E", borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14 },
  buyukBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
