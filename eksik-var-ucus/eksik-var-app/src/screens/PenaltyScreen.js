import React, { useState, useRef, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, Animated, Easing, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { BOLGELER, vurus, botKaleci, botAtis } from "../penalti";

/* Penaltı 2.0 — iki mod:
   🤖 Bota Karşı: 5 atış forvet + 5 atış KALECİ sensin (toplam skor, rekor kalıcı)
   👥 Arkadaşınla: telefon elden ele; kaleci gizli köşe seçer, atıcı vurur; 5+5 */
const YARIM = 5;
const X = { sol: -74, orta: 0, sag: 74 };
const Y = { ust: -26, alt: 18 };

export default function PenaltyScreen({ onBack }) {
  const [mod, setMod] = useState(null);            // null | bot | dost
  const [faz, setFaz] = useState("menu");          // hedef | guc | anim | devir_kaleci | kaleci_sec | devir_atici | son
  const [rol, setRol] = useState("forvet");        // forvet | kaleci (benim/P1'in rolü)
  const [atisNo, setAtisNo] = useState(0);         // 0..9
  const [skor, setSkor] = useState({ ben: 0, rakip: 0 });
  const [gecmis, setGecmis] = useState([]);        // simgeler
  const [hedef, setHedef] = useState(null);
  const [gizliKaleci, setGizliKaleci] = useState(null);   // dost modunda kalecinin gizli seçimi
  const [mesaj, setMesaj] = useState("");
  const [rekor, setRekor] = useState(null);
  const [sahaH, setSahaH] = useState(0);

  const guc = useRef(new Animated.Value(0)).current;
  const gucDeger = useRef(0);
  const gucLoop = useRef(null);
  const kaleciX = useRef(new Animated.Value(0)).current;
  const kaleciY = useRef(new Animated.Value(0)).current;
  const topX = useRef(new Animated.Value(0)).current;
  const topY = useRef(new Animated.Value(0)).current;
  const bant = useRef(new Animated.Value(0)).current;

  useEffect(() => { AsyncStorage.getItem("ev_penalti_rekor").then((r) => r && setRekor(Number(r))).catch(() => {}); }, []);
  useEffect(() => { const id = guc.addListener(({ value }) => { gucDeger.current = value; }); return () => guc.removeListener(id); }, [guc]);

  const sifirlaSahne = useCallback(() => {
    kaleciX.setValue(0); kaleciY.setValue(0); topX.setValue(0); topY.setValue(0); bant.setValue(0);
  }, [kaleciX, kaleciY, topX, topY, bant]);

  const basla = (m) => { setMod(m); setRol("forvet"); setAtisNo(0); setSkor({ ben: 0, rakip: 0 }); setGecmis([]); setMesaj(""); sifirlaSahne(); setFaz(m === "dost" ? "devir_kaleci" : "hedef"); };

  const gucBaslat = () => {
    guc.setValue(0);
    gucLoop.current = Animated.loop(Animated.sequence([
      Animated.timing(guc, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: false }),
      Animated.timing(guc, { toValue: 0, duration: 700, easing: Easing.linear, useNativeDriver: false }),
    ]));
    gucLoop.current.start();
  };
  const gucBirakVeVur = () => {
    if (gucLoop.current) gucLoop.current.stop();
    const g = gucDeger.current;
    const kaleci = mod === "dost" ? gizliKaleci : botKaleci();
    oynat(hedef, g, kaleci, rol === "forvet");
  };

  // ortak sahne: top hedefe uçar, kaleci köşeye dalar
  const oynat = (hd, g, kaleci, benAtiyorum) => {
    setFaz("anim");
    const s = vurus(hd, g, kaleci);
    const kaleKat = hd.kat === "ust" ? 40 : 92;                       // kale içinde hedef yüksekliği
    const ucus = -(Math.max(sahaH, 260) - 54 - kaleKat);               // dipten kaleye gerçek mesafe
    const topHedefX = s.sonuc === "dis" ? X[hd.sutun] * 1.7 : X[hd.sutun];
    const topHedefY = s.sonuc === "dis" ? ucus - 44 : s.sonuc === "direk" ? ucus - 6 : ucus;
    Animated.parallel([
      Animated.timing(topX, { toValue: topHedefX, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(topY, { toValue: topHedefY, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(kaleciX, { toValue: X[kaleci.sutun], duration: 480, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(kaleciY, { toValue: Y[kaleci.kat], duration: 480, useNativeDriver: true }),
    ]).start(() => {
      Animated.spring(bant, { toValue: 1, useNativeDriver: true }).start();
      const golOldu = s.sonuc === "gol";
      const benimSayim = benAtiyorum ? golOldu : !golOldu && s.sonuc === "kurtaris" ? true : false;
      const rakipSayi = benAtiyorum ? false : golOldu;
      setSkor((k) => ({ ben: k.ben + (benimSayim ? 1 : 0), rakip: k.rakip + (rakipSayi ? 1 : 0) }));
      setGecmis((gm) => [...gm, s.sonuc === "gol" ? (benAtiyorum ? "⚽" : "🥅") : s.sonuc === "kurtaris" ? "🧤" : s.sonuc === "direk" ? "🧱" : "🌪"]);
      setMesaj(
        s.sonuc === "gol" ? (benAtiyorum ? t("GOOOL! 🎉") : t("Gol yedin 😬")) :
        s.sonuc === "kurtaris" ? (benAtiyorum ? t("Kaleci okudu! 🧤") : t("KURTARDIN! 🧤🔥")) :
        s.sonuc === "direk" ? t("DİREK! İnanılmaz 🧱") : t("Auuut… dışarı 🌪"));
      setTimeout(() => sonraki(), 1100);
    });
  };

  const sonraki = () => {
    sifirlaSahne(); setHedef(null); setGizliKaleci(null); setMesaj("");
    const n = atisNo + 1;
    setAtisNo(n);
    if (n >= YARIM * 2) { bitir(); return; }
    if (n === YARIM) {
      setRol("kaleci");
      setFaz(mod === "dost" ? "devir_kaleci" : "kaleci_sec");
      return;
    }
    setFaz(mod === "dost" ? "devir_kaleci" : rol === "forvet" ? "hedef" : "kaleci_sec");
  };

  const bitir = async () => {
    setFaz("son");
    if (mod === "bot") {
      const puan = skor.ben;
      if (rekor == null || puan > rekor) { setRekor(puan); AsyncStorage.setItem("ev_penalti_rekor", String(puan)).catch(() => {}); }
    }
  };

  // kaleci modunda (bota karşı): sen köşe seç → bot şutu oynasın
  const kaleciSecTamam = (secim) => {
    const atis = botAtis();
    oynat(atis.hedef, atis.guc, secim, false);
  };
  // dost modunda: kaleci gizli seçer → atıcıya devir
  const dostKaleciSecti = (secim) => { setGizliKaleci(secim); setFaz("devir_atici"); };

  const KaleSahnesi = ({ secilebilir, onSec, secim }) => (
    <View style={st.saha} onLayout={(e) => setSahaH(e.nativeEvent.layout.height)}>
      <View style={st.kale}>
        {BOLGELER.map((b) => (
          <Pressable key={b.id} disabled={!secilebilir} onPress={() => onSec(b)}
            style={[st.bolge, { left: b.sutun === "sol" ? 4 : b.sutun === "orta" ? "33.8%" : undefined, right: b.sutun === "sag" ? 4 : undefined, top: b.kat === "ust" ? 4 : "50%" },
              secim && secim.id === b.id && st.bolgeSecili]}>
            {secilebilir && <View style={st.hedefNokta} />}
          </Pressable>
        ))}
        <Animated.Text style={[st.kaleci, { transform: [{ translateX: kaleciX }, { translateY: kaleciY }] }]}>🧤</Animated.Text>
      </View>
      <Animated.Text style={[st.top, { transform: [{ translateX: topX }, { translateY: topY }] }]}>⚽</Animated.Text>
      {!!mesaj && (
        <Animated.View style={[st.bant, { transform: [{ scale: bant }] }]}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>{mesaj}</Text>
        </Animated.View>
      )}
    </View>
  );

  const Skorluk = () => (
    <View style={st.skorluk}>
      <Text style={st.skorText}>{t("SEN")} {skor.ben} — {skor.rakip} {mod === "dost" ? t("RAKİP") : "🤖"}</Text>
      <Text style={{ fontSize: 15, letterSpacing: 2 }}>{gecmis.join(" ")}</Text>
      <Text style={{ fontSize: 11, color: C.mist }}>
        {t("Atış")} {Math.min(atisNo + 1, 10)}/10 · {rol === "forvet" ? "⚽ " + t("Forvetsin") : "🧤 " + t("Kalecisin")}
        {mod === "bot" && rekor != null ? ` · ${t("Rekor")}: ${rekor}` : ""}
      </Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0E3B2E" }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17, flex: 1 }}>🥅 {t("Penaltı Düellosu")}</Text>
        {mod && <TouchableOpacity onPress={() => { setMod(null); setFaz("menu"); }}><Text style={{ color: C.mist, fontSize: 12, fontWeight: "800" }}>{t("Modu değiştir")}</Text></TouchableOpacity>}
      </View>

      {faz === "menu" && (
        <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 14 }}>
          <TouchableOpacity onPress={() => basla("bot")} style={st.modKart}>
            <Text style={{ fontSize: 34 }}>🤖</Text>
            <Text style={st.modBaslik}>{t("Bota Karşı Maç")}</Text>
            <Text style={st.modAlt}>{t("5 atış forvet + 5 atış kaleci sensin. Rekoru kovala!")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => basla("dost")} style={st.modKart}>
            <Text style={{ fontSize: 34 }}>👥</Text>
            <Text style={st.modBaslik}>{t("Arkadaşınla Düello")}</Text>
            <Text style={st.modAlt}>{t("Telefon elden ele: kaleci gizlice köşe seçer, atıcı vurur. 5'er atış!")}</Text>
          </TouchableOpacity>
          <Text style={{ color: C.mist, fontSize: 12, textAlign: "center", lineHeight: 17 }}>
            {t("İpucu: üst köşeler ödüllü ama riskli; güç çubuğunu yeşil bölgede bırak — zayıf vuruş kurtarılır, aşırısı direğe gider.")}
          </Text>
        </View>
      )}

      {mod && faz !== "menu" && faz !== "son" && (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <Skorluk />

          {faz === "devir_kaleci" && (
            <View style={st.perde}>
              <Text style={{ fontSize: 40 }}>📵</Text>
              <Text style={st.perdeText}>{mod === "dost" ? t("Telefonu KALECİYE ver — atıcı bakmasın!") : ""}</Text>
              <TouchableOpacity onPress={() => setFaz("kaleci_sec")} style={st.buyukBtn}>
                <Text style={st.buyukBtnText}>{t("Kaleci hazır")} 🧤</Text>
              </TouchableOpacity>
            </View>
          )}

          {faz === "kaleci_sec" && (
            <View style={{ flex: 1 }}>
              <Text style={st.yonerge}>🧤 {mod === "dost" && rolDost(atisNo) === "p2" ? t("Kaleci: dalacağın köşeyi GİZLİCE seç") : t("Dalacağın köşeyi seç — bot şutunu çekiyor!")}</Text>
              <KaleSahnesi secilebilir onSec={(b) => (mod === "dost" ? dostKaleciSecti(b) : kaleciSecTamam(b))} secim={null} />
            </View>
          )}

          {faz === "devir_atici" && (
            <View style={st.perde}>
              <Text style={{ fontSize: 40 }}>🤫</Text>
              <Text style={st.perdeText}>{t("Köşe seçildi. Telefonu ATICIYA ver!")}</Text>
              <TouchableOpacity onPress={() => setFaz("hedef")} style={st.buyukBtn}>
                <Text style={st.buyukBtnText}>{t("Atıcı hazır")} ⚽</Text>
              </TouchableOpacity>
            </View>
          )}

          {(faz === "hedef" || faz === "guc" || faz === "anim") && (
            <View style={{ flex: 1 }}>
              <Text style={st.yonerge}>
                {faz === "hedef" ? "🎯 " + t("Kalede hedefini seç") : faz === "guc" ? "💪 " + t("Basılı tut, yeşilde bırak!") : "…"}
              </Text>
              <KaleSahnesi secilebilir={faz === "hedef"} onSec={(b) => { setHedef(b); setFaz("guc"); }} secim={hedef} />
              {faz === "guc" && (
                <View style={{ marginTop: 14 }}>
                  <View style={st.gucArka}>
                    <View style={[st.gucBolge, { left: "35%", width: "57%", backgroundColor: "rgba(74,222,128,0.35)" }]} />
                    <View style={[st.gucBolge, { left: "92%", width: "8%", backgroundColor: "rgba(248,113,113,0.5)" }]} />
                    <Animated.View style={[st.gucDolgu, { width: guc.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
                  </View>
                  <Pressable onPressIn={gucBaslat} onPressOut={gucBirakVeVur} style={st.vurBtn}>
                    <Text style={{ color: "#0E3B2E", fontWeight: "900", fontSize: 16 }}>{t("BASILI TUT → BIRAK = ŞUT!")}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}
        </View>
      )}

      {faz === "son" && (
        <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 52 }}>{skor.ben > skor.rakip ? "🏆" : skor.ben === skor.rakip ? "🤝" : "😅"}</Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 26 }}>{skor.ben} — {skor.rakip}</Text>
          <Text style={{ color: C.mist, fontSize: 14, textAlign: "center" }}>
            {skor.ben > skor.rakip ? t("Maç senin! Saha seni bekliyor.") : skor.ben === skor.rakip ? t("Berabere — dostluk kazandı.") : t("Bu sefer rakip aldı… rövanş?")}
          </Text>
          <Text style={{ fontSize: 16, letterSpacing: 2 }}>{gecmis.join(" ")}</Text>
          {mod === "bot" && rekor != null && <Text style={{ color: C.star, fontWeight: "900" }}>⭐ {t("Rekor")}: {rekor}/10</Text>}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
            <TouchableOpacity onPress={() => basla(mod)} style={st.buyukBtn}><Text style={st.buyukBtnText}>{t("Rövanş")} 🔁</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => { setMod(null); setFaz("menu"); }} style={[st.buyukBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Text style={st.buyukBtnText}>{t("Mod seç")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
// dost modunda kimin kaleci olduğu (ilk yarı P2 kaleci, ikinci yarı P1)
const rolDost = (atisNo) => (atisNo < YARIM ? "p2" : "p1");

const mkSt = () => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  skorluk: { alignItems: "center", gap: 4, paddingVertical: 8 },
  skorText: { color: "#fff", fontWeight: "900", fontSize: 20 },
  yonerge: { color: "#fff", fontWeight: "800", fontSize: 14, textAlign: "center", marginVertical: 10 },
  saha: { flex: 1, alignItems: "center", justifyContent: "flex-start", paddingTop: 8 },
  kale: { width: 250, height: 120, borderColor: "#fff", borderTopWidth: 6, borderLeftWidth: 6, borderRightWidth: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)" },
  bolge: { position: "absolute", width: "31%", height: "46%", borderRadius: 8 },
  bolgeSecili: { borderWidth: 2, borderColor: C.star, backgroundColor: "rgba(245,179,1,0.15)" },
  hedefNokta: { position: "absolute", top: "40%", left: "44%", width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.5)" },
  kaleci: { position: "absolute", bottom: -6, left: 103, fontSize: 40 },
  top: { position: "absolute", bottom: 14, fontSize: 32 },
  bant: { position: "absolute", top: 44, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 },
  gucArka: { height: 22, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 11, overflow: "hidden" },
  gucBolge: { position: "absolute", top: 0, bottom: 0 },
  gucDolgu: { height: "100%", backgroundColor: "#fff", borderRadius: 11 },
  vurBtn: { backgroundColor: C.star, borderRadius: 16, alignItems: "center", paddingVertical: 16, marginTop: 12 },
  modKart: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", padding: 18, alignItems: "center", gap: 6 },
  modBaslik: { color: "#fff", fontWeight: "900", fontSize: 18 },
  modAlt: { color: C.mist, fontSize: 12, textAlign: "center", lineHeight: 17 },
  perde: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  perdeText: { color: "#fff", fontWeight: "800", fontSize: 15, textAlign: "center", lineHeight: 21 },
  buyukBtn: { backgroundColor: C.kit, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 14 },
  buyukBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
