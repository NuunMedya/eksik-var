import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { ileriSar, isabet, seriCarpan, turAyari } from "../basket";

/* Basket Yağmuru: çember kayar, ortadan geçerken dokun → şut.
   45 sn, seri çarpanı, hızlanan çember, kalıcı rekor. */
const SURE = 45;
const GENLIK = 110;
const UCUS = 460;

export default function BasketScreen({ onBack }) {
  const [faz, setFaz] = useState("menu");          // menu | oyun | son
  const [skor, setSkor] = useState(0);
  const [basketSay, setBasketSay] = useState(0);
  const [seri, setSeri] = useState(0);
  const [kalan, setKalan] = useState(SURE);
  const [rekor, setRekor] = useState(null);
  const [bant, setBant] = useState("");
  const [sahaH, setSahaH] = useState(0);          // sahne boyu: uçuş buna göre

  const cember = useRef(new Animated.Value(0)).current;
  const cemberRef = useRef({ x: 0, yon: 1, hiz: 0.09 });
  const topY = useRef(new Animated.Value(0)).current;
  const topX = useRef(new Animated.Value(0)).current;
  const ucuyor = useRef(false);
  const donguRef = useRef(null);
  const sayacRef = useRef(null);

  useEffect(() => { AsyncStorage.getItem("ev_basket_rekor").then((r) => r && setRekor(Number(r))).catch(() => {}); }, []);
  useEffect(() => {
    const id = cember.addListener(({ value }) => { cemberRef.current.x = value; });
    return () => cember.removeListener(id);
  }, [cember]);
  useEffect(() => () => { if (sayacRef.current) clearInterval(sayacRef.current); if (donguRef.current) donguRef.current.stop(); }, []);

  const cemberSur = useCallback((hiz) => {
    if (donguRef.current) donguRef.current.stop();
    cemberRef.current.hiz = hiz;
    // mevcut konumdan sürekli gidiş-dönüş
    const koş = () => {
      const hedef = cemberRef.current.yon > 0 ? GENLIK : -GENLIK;
      const mesafe = Math.abs(hedef - cemberRef.current.x);
      Animated.timing(cember, { toValue: hedef, duration: mesafe / hiz, easing: Easing.linear, useNativeDriver: false })
        .start(({ finished }) => { if (finished) { cemberRef.current.yon *= -1; koş(); } });
    };
    koş();
  }, [cember]);

  const basla = () => {
    setSkor(0); setBasketSay(0); setSeri(0); setKalan(SURE); setBant(""); setFaz("oyun");
    cember.setValue(0); cemberRef.current = { x: 0, yon: 1, hiz: turAyari(0).hiz };
    topY.setValue(0); topX.setValue(0); ucuyor.current = false;
    cemberSur(turAyari(0).hiz);
    sayacRef.current = setInterval(() => {
      setKalan((k) => {
        if (k <= 1) { clearInterval(sayacRef.current); bitir(); return 0; }
        return k - 1;
      });
    }, 1000);
  };

  const bitir = () => {
    if (donguRef.current) donguRef.current.stop();
    setFaz("son");
    setSkor((s) => {
      if (rekor == null || s > rekor) { setRekor(s); AsyncStorage.setItem("ev_basket_rekor", String(s)).catch(() => {}); }
      return s;
    });
  };

  const sut = () => {
    if (faz !== "oyun" || ucuyor.current) return;
    ucuyor.current = true;
    const { x, yon, hiz } = cemberRef.current;
    const varis = ileriSar(x, yon, hiz, UCUS, GENLIK);
    const { tolerans } = turAyari(basketSay);
    const girdi = isabet(varis.x, tolerans);
    const ucus = -(Math.max(sahaH, 300) - 132);     // top dibinden çember hizasına
    Animated.timing(topY, { toValue: ucus, duration: UCUS, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      if (girdi) {
        const yeniSeri = seri + 1;
        const puan = seriCarpan(yeniSeri);
        setSeri(yeniSeri); setSkor((s) => s + puan);
        setBasketSay((b) => { const n = b + 1; cemberSur(turAyari(n).hiz); return n; });
        setBant(puan > 1 ? `🔥 +${puan} ${t("SERİ!")}` : "🏀 +1");
        Animated.sequence([
          Animated.timing(topY, { toValue: ucus + 40, duration: 120, useNativeDriver: true }),
          Animated.timing(topY, { toValue: 40, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(() => { topY.setValue(0); topX.setValue(0); ucuyor.current = false; });
      } else {
        setSeri(0); setBant(t("Çarptı! 😵"));
        Animated.parallel([
          Animated.timing(topX, { toValue: varis.x > 0 ? 90 : -90, duration: 300, useNativeDriver: true }),
          Animated.timing(topY, { toValue: 60, duration: 300, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(() => { topX.setValue(0); topY.setValue(0); ucuyor.current = false; });
      }
      setTimeout(() => setBant(""), 700);
    });
  };

  return (
    <Pressable style={{ flex: 1, backgroundColor: "#3B2410" }} onPress={faz === "oyun" ? sut : undefined}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17, flex: 1 }}>🏀 {t("Basket Yağmuru")}</Text>
        {faz === "oyun" && <Text style={{ color: "#FDBA74", fontWeight: "900", fontSize: 16 }}>⏱ {kalan}</Text>}
      </View>

      {faz === "menu" && (
        <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 56 }}>🏀</Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22, textAlign: "center" }}>{t("45 saniye · kaç basket?")}</Text>
          <Text style={{ color: "#FBD8B0", fontSize: 13, textAlign: "center", lineHeight: 19 }}>
            {t("Çember kayarken TAM ORTADAN geçtiği an ekrana dokun. Her basketle hızlanır; 3+ seri 🔥 ×2, 6+ seri ×3 puan!")}
          </Text>
          {rekor != null && <Text style={{ color: C.star, fontWeight: "900", fontSize: 15 }}>⭐ {t("Rekor")}: {rekor}</Text>}
          <TouchableOpacity onPress={basla} style={st.buyukBtn}><Text style={st.buyukBtnText}>{t("Başla")} 🏀</Text></TouchableOpacity>
        </View>
      )}

      {(faz === "oyun" || faz === "son") && (
        <View style={{ flex: 1, alignItems: "center" }}>
          <View style={st.skorluk}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 26 }}>{skor}</Text>
            <Text style={{ color: "#FBD8B0", fontSize: 12 }}>
              {seri >= 3 ? `🔥 ${t("seri")} ${seri} · ×${seriCarpan(seri)}` : `${t("seri")} ${seri}`}
            </Text>
          </View>

          <View style={st.sahne} onLayout={(e) => setSahaH(e.nativeEvent.layout.height)}>
            <Animated.View style={[st.cemberKutu, { transform: [{ translateX: cember }] }]}>
              <View style={st.pano} />
              <View style={st.cember} />
              <Text style={{ fontSize: 10, letterSpacing: 3, color: "rgba(255,255,255,0.6)" }}>▽▽▽</Text>
            </Animated.View>
            <Animated.Text style={[st.top, { transform: [{ translateX: topX }, { translateY: topY }] }]}>🏀</Animated.Text>
            {!!bant && <View style={st.bant}><Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>{bant}</Text></View>}
          </View>

          {faz === "oyun" && <Text style={{ color: "#FBD8B0", fontSize: 13, marginBottom: 26 }}>👆 {t("Ekrana dokun = şut")}</Text>}

          {faz === "son" && (
            <View style={{ alignItems: "center", gap: 10, paddingBottom: 30 }}>
              <Text style={{ fontSize: 44 }}>{skor >= (rekor || 0) && skor > 0 ? "🏆" : "⏱"}</Text>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>{skor} {t("sayı")}</Text>
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
    </Pressable>
  );
}

const mkSt = () => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  skorluk: { alignItems: "center", marginTop: 4 },
  sahne: { flex: 1, width: "100%", alignItems: "center", justifyContent: "flex-end", paddingBottom: 30 },
  cemberKutu: { position: "absolute", top: 30, alignItems: "center" },
  pano: { width: 74, height: 46, borderWidth: 3, borderColor: "rgba(255,255,255,0.85)", borderRadius: 6, backgroundColor: "rgba(255,255,255,0.08)" },
  cember: { width: 58, height: 16, borderWidth: 4, borderColor: "#F97316", borderRadius: 10, marginTop: -6, backgroundColor: "transparent" },
  top: { fontSize: 44, marginBottom: 10 },
  bant: { position: "absolute", top: 110, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7 },
  buyukBtn: { backgroundColor: "#F97316", borderRadius: 16, paddingHorizontal: 24, paddingVertical: 14, marginTop: 8 },
  buyukBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
