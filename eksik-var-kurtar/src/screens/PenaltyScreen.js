import React, { useState, useRef } from "react";
import { BACK_ICON } from "../components";
import { View, Text, TouchableOpacity, TextInput, Animated, Easing, Pressable, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { BOLGELER, basitVurus, botKaleci, botHedef, bittiMi } from "../penalti";

/* Penaltı Düellosu — seri penaltı ritüeli:
   Sırayla: A atar (B kaleci gizli seçer) → B atar (A kaleci). 5'er atış; eşitse ölüm-kalım.
   Bota karşı: sen at, botun şutunu sen tut; galibiyet serisi rekoru. */
const X = { sol: -74, orta: 0, sag: 74 };
const Y = { ust: 40, alt: 92 };

export default function PenaltyScreen({ onBack }) {
  const [mod, setMod] = useState(null);              // bot | dost
  const [faz, setFaz] = useState("menu");            // isim | devir | kaleci | atis | anim | son
  const [adlar, setAdlar] = useState(["", ""]);
  const [atici, setAtici] = useState(0);             // 0 = A/ben, 1 = B/bot
  const [durum, setDurum] = useState({ gol: [0, 0], atis: [0, 0], seri: [[], []] });
  const [gizli, setGizli] = useState(null);
  const [mesaj, setMesaj] = useState("");
  const [galSeri, setGalSeri] = useState(null);
  const [sahaH, setSahaH] = useState(0);

  const kaleciX = useRef(new Animated.Value(0)).current;
  const kaleciY = useRef(new Animated.Value(0)).current;
  const topX = useRef(new Animated.Value(0)).current;
  const topY = useRef(new Animated.Value(0)).current;
  const bant = useRef(new Animated.Value(0)).current;

  React.useEffect(() => { AsyncStorage.getItem("ev_penalti_seri").then((r) => r && setGalSeri(Number(r))).catch(() => {}); }, []);

  const adA = mod === "bot" ? t("Sen") : (adlar[0].trim() || t("1. Oyuncu"));
  const adB = mod === "bot" ? "🤖 Bot" : (adlar[1].trim() || t("2. Oyuncu"));
  const ad = (i) => (i === 0 ? adA : adB);

  const sifirla = () => { kaleciX.setValue(0); kaleciY.setValue(0); topX.setValue(0); topY.setValue(0); bant.setValue(0); };
  const basla = (m) => {
    setMod(m); setDurum({ gol: [0, 0], atis: [0, 0], seri: [[], []] }); setAtici(0); setGizli(null); setMesaj(""); sifirla();
    setFaz(m === "dost" ? "isim" : "kaleci_bot_gizli");
    if (m === "bot") botTuruKur(0);
  };
  const botTuruKur = (kimAtiyor) => {
    // ben atıyorsam bot kaleci gizli seçer → doğrudan atış ekranı
    if (kimAtiyor === 0) { setGizli(botKaleci()); setFaz("atis"); }
    else setFaz("kaleci");                           // botun şutunu BEN tutarım
  };

  const oynat = (hedef, kaleci) => {
    setFaz("anim");
    const s = basitVurus(hedef, kaleci);
    const kaleUst = 8;
    const hedefTop = kaleUst + Y[hedef.kat];
    const ucus = -(Math.max(sahaH, 260) - 52 - hedefTop);
    Animated.parallel([
      Animated.timing(topX, { toValue: X[hedef.sutun], duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(topY, { toValue: ucus, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(kaleciX, { toValue: X[kaleci.sutun], duration: 380, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      Animated.timing(kaleciY, { toValue: kaleci.kat === "ust" ? -26 : 16, duration: 380, useNativeDriver: true }),
    ]).start(() => {
      Animated.spring(bant, { toValue: 1, useNativeDriver: true }).start();
      const gol = s.sonuc === "gol";
      setMesaj(gol ? `⚽ ${t("GOOOL!")} — ${ad(atici)}` : `🧤 ${t("KURTARDI!")} — ${ad(1 - atici)}`);
      setDurum((d) => {
        const g = [...d.gol]; const a = [...d.atis]; const sr = [d.seri[0].slice(), d.seri[1].slice()];
        if (gol) g[atici] += 1;
        a[atici] += 1;
        sr[atici].push(gol ? "⚽" : "🧤");
        return { gol: g, atis: a, seri: sr };
      });
      setTimeout(sirayiDevret, 1000);
    });
  };

  const sirayiDevret = () => {
    sifirla(); setGizli(null); setMesaj("");
    setDurum((d) => {
      if (bittiMi(d.gol[0], d.gol[1], d.atis[0], d.atis[1])) { bitir(d); return d; }
      const yeni = 1 - atici;
      setAtici(yeni);
      if (mod === "bot") botTuruKur(yeni);
      else setFaz("devir");
      return d;
    });
  };

  const bitir = (d) => {
    setFaz("son");
    if (mod === "bot") {
      const kazandim = d.gol[0] > d.gol[1];
      const yeni = kazandim ? (galSeri || 0) + 1 : 0;
      setGalSeri(yeni);
      AsyncStorage.setItem("ev_penalti_seri", String(yeni)).catch(() => {});
    }
  };

  // botun atışı: ben kaleci seçtim → bot hedefiyle oynat
  const benTuttum = (secim) => oynat(botHedef(), secim);

  const KaleSahnesi = ({ secilebilir, onSec, vurgu }) => (
    <View style={st.saha} onLayout={(e) => setSahaH(e.nativeEvent.layout.height)}>
      <View style={st.kale}>
        {BOLGELER.map((b) => (
          <Pressable key={b.id} disabled={!secilebilir} onPress={() => onSec(b)}
            style={[st.bolge,
              { left: b.sutun === "sol" ? 4 : b.sutun === "orta" ? "33.8%" : undefined, right: b.sutun === "sag" ? 4 : undefined, top: b.kat === "ust" ? 4 : "50%" },
              vurgu && vurgu.id === b.id && st.bolgeSecili]}>
            {secilebilir && <View style={st.hedefNokta} />}
          </Pressable>
        ))}
        <Animated.Text style={[st.kaleci, { transform: [{ translateX: kaleciX }, { translateY: kaleciY }] }]}>🧤</Animated.Text>
      </View>
      <Animated.Text style={[st.topStil, { transform: [{ translateX: topX }, { translateY: topY }] }]}>⚽</Animated.Text>
      {!!mesaj && (
        <Animated.View style={[st.bant, { transform: [{ scale: bant }] }]}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>{mesaj}</Text>
        </Animated.View>
      )}
    </View>
  );

  const SkorTablo = () => (
    <View style={st.tablo}>
      {[0, 1].map((i) => (
        <View key={i} style={[st.tabloSatir, atici === i && faz !== "son" && st.tabloAktif]}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14, width: 92 }} numberOfLines={1}>{ad(i)}</Text>
          <Text style={{ fontSize: 15, letterSpacing: 1, flex: 1 }}>
            {durum.seri[i].join("")}{("▫️").repeat(Math.max(0, 5 - durum.atis[i]))}
          </Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>{durum.gol[i]}</Text>
        </View>
      ))}
      {durum.atis[0] >= 5 && durum.atis[1] >= 5 && faz !== "son" && (
        <Text style={{ color: C.star, fontWeight: "900", fontSize: 12, textAlign: "center" }}>☠️ {t("ÖLÜM-KALIM! Biri atar, biri kaçırırsa biter")}</Text>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0E3B2E" }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name={BACK_ICON} size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17, flex: 1 }}>🥅 {t("Penaltı Düellosu")}</Text>
        {mod === "bot" && galSeri != null && faz !== "menu" && <Text style={{ color: C.star, fontWeight: "900", fontSize: 12 }}>🔥 {t("seri")} {galSeri}</Text>}
      </View>

      {faz === "menu" && (
        <View style={{ flex: 1, padding: 20, justifyContent: "center", gap: 14 }}>
          <TouchableOpacity onPress={() => basla("dost")} style={st.modKart}>
            <Text style={{ fontSize: 34 }}>👥</Text>
            <Text style={st.modBaslik}>{t("Arkadaşınla Düello")}</Text>
            <Text style={st.modAlt}>{t("İsimleri yazın, sırayla atın: biri şutör, biri kaleci. 5'er atış — eşitse ölüm-kalım!")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => basla("bot")} style={st.modKart}>
            <Text style={{ fontSize: 34 }}>🤖</Text>
            <Text style={st.modBaslik}>{t("Bota Karşı")}</Text>
            <Text style={st.modAlt}>{t("Aynı ritüel botla: sen at, botun şutunu sen tut. Galibiyet serisi yap!")}</Text>
          </TouchableOpacity>
          <Text style={{ color: C.mist, fontSize: 12, textAlign: "center", lineHeight: 17 }}>
            {t("Kural basit: kaleci aynı bölgeyi tutarsa kurtarır; aynı sütunun diğer katında %50 uzanır. Gerisi gol!")}
          </Text>
        </View>
      )}

      {faz === "isim" && (
        <View style={{ flex: 1, padding: 24, justifyContent: "center", gap: 12 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 20, textAlign: "center" }}>{t("Kim kime karşı?")} 🔥</Text>
          <TextInput value={adlar[0]} onChangeText={(x) => setAdlar((a) => [x, a[1]])} maxLength={12}
            placeholder={t("1. Oyuncu")} placeholderTextColor="rgba(255,255,255,0.4)" style={st.isimGiris} />
          <Text style={{ color: C.mist, textAlign: "center", fontWeight: "900" }}>VS</Text>
          <TextInput value={adlar[1]} onChangeText={(x) => setAdlar((a) => [a[0], x])} maxLength={12}
            placeholder={t("2. Oyuncu")} placeholderTextColor="rgba(255,255,255,0.4)" style={st.isimGiris} />
          <TouchableOpacity onPress={() => setFaz("devir")} style={[st.buyukBtn, { alignSelf: "center", marginTop: 8 }]}>
            <Text style={st.buyukBtnText}>{t("Düello başlasın")} ⚔️</Text>
          </TouchableOpacity>
        </View>
      )}

      {mod && !["menu", "isim", "son"].includes(faz) && (
        <View style={{ flex: 1, paddingHorizontal: 16 }}>
          <SkorTablo />

          {faz === "devir" && (
            <View style={st.perde}>
              <Text style={{ fontSize: 40 }}>📵</Text>
              <Text style={st.perdeText}>{t("Telefonu {p0}'a ver (KALECİ) — {p1} bakmasın!", { p0: ad(1 - atici), p1: ad(atici) })}</Text>
              <TouchableOpacity onPress={() => setFaz("kaleci")} style={st.buyukBtn}>
                <Text style={st.buyukBtnText}>{t("Kaleci hazır")} 🧤</Text>
              </TouchableOpacity>
            </View>
          )}

          {faz === "kaleci" && (
            <View style={{ flex: 1 }}>
              <Text style={st.yonerge}>
                🧤 {mod === "bot" ? t("Botun şutu geliyor — dalacağın bölgeyi seç!") : t("{p0}: dalacağın bölgeyi GİZLİCE seç", { p0: ad(1 - atici) })}
              </Text>
              <KaleSahnesi secilebilir onSec={(b) => (mod === "bot" ? benTuttum(b) : (setGizli(b), setFaz("atis")))} vurgu={null} />
            </View>
          )}

          {faz === "atis" && (
            <View style={{ flex: 1 }}>
              <Text style={st.yonerge}>⚽ {t("{p0}: köşeni seç ve vur!", { p0: ad(atici) })}</Text>
              <KaleSahnesi secilebilir onSec={(b) => oynat(b, gizli)} vurgu={null} />
            </View>
          )}

          {faz === "anim" && <KaleSahnesi secilebilir={false} onSec={() => {}} vurgu={null} />}
        </View>
      )}

      {faz === "son" && (
        <View style={{ flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 10 }}>
          <Text style={{ fontSize: 52 }}>🏆</Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 24, textAlign: "center" }}>
            {durum.gol[0] > durum.gol[1] ? adA : adB} {t("kazandı!")}
          </Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 30 }}>{durum.gol[0]} — {durum.gol[1]}</Text>
          <View style={{ gap: 4, alignItems: "center" }}>
            <Text style={{ fontSize: 15 }}>{adA}: {durum.seri[0].join("")}</Text>
            <Text style={{ fontSize: 15 }}>{adB}: {durum.seri[1].join("")}</Text>
          </View>
          {mod === "bot" && galSeri != null && <Text style={{ color: C.star, fontWeight: "900" }}>🔥 {t("Galibiyet serin")}: {galSeri}</Text>}
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <TouchableOpacity onPress={() => basla(mod)} style={st.buyukBtn}><Text style={st.buyukBtnText}>{t("Rövanş")} 🔁</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setFaz("menu")} style={[st.buyukBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
              <Text style={st.buyukBtnText}>{t("Mod seç")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  tablo: { gap: 6, paddingVertical: 8 },
  tabloSatir: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  tabloAktif: { borderWidth: 1.5, borderColor: C.star },
  yonerge: { color: "#fff", fontWeight: "800", fontSize: 14, textAlign: "center", marginVertical: 10 },
  saha: { flex: 1, alignItems: "center", paddingTop: 8 },
  kale: { width: 250, height: 120, borderColor: "#fff", borderTopWidth: 6, borderLeftWidth: 6, borderRightWidth: 6, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.06)" },
  bolge: { position: "absolute", width: "31%", height: "46%", borderRadius: 8 },
  bolgeSecili: { borderWidth: 2, borderColor: C.star },
  hedefNokta: { position: "absolute", top: "40%", left: "44%", width: 10, height: 10, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.5)" },
  kaleci: { position: "absolute", bottom: -6, left: 103, fontSize: 40 },
  topStil: { position: "absolute", bottom: 14, fontSize: 32 },
  bant: { position: "absolute", top: 44, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 8 },
  modKart: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)", padding: 18, alignItems: "center", gap: 6 },
  modBaslik: { color: "#fff", fontWeight: "900", fontSize: 18 },
  modAlt: { color: C.mist, fontSize: 12, textAlign: "center", lineHeight: 17 },
  perde: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  perdeText: { color: "#fff", fontWeight: "800", fontSize: 15, textAlign: "center", lineHeight: 21 },
  isimGiris: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", color: "#fff", fontWeight: "800", fontSize: 16, textAlign: "center", paddingVertical: 12 },
  buyukBtn: { backgroundColor: C.kit, borderRadius: 16, paddingHorizontal: 22, paddingVertical: 14 },
  buyukBtnText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
