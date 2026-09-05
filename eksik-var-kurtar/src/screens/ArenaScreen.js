import React, { useEffect, useRef, useState, useCallback } from "react";
import { BACK_ICON } from "../components";
import { View, Text, TouchableOpacity, TextInput, Animated, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { soruSec, dogruMu, SURE_SN } from "../arena";

/* 🧠 Arena — futbol bilgi düellosu.
   🤖 Tek başına: 10 soru, 12 sn süre, kalıcı rekor.
   👥 Düello: sırayla 5'er soru, eşitlikte ☠️ ölüm-kalım. */
const TEK_SORU = 10, DUELLO_SORU = 5;

export default function ArenaScreen({ onBack }) {
  const [faz, setFaz] = useState("menu");               // menu | isim | oyun | bitti
  const [mod, setMod] = useState("tek");                // tek | duello
  const [adlar, setAdlar] = useState(["", ""]);
  const [sorular, setSorular] = useState([]);
  const [ix, setIx] = useState(0);                      // soru sırası
  const [secim, setSecim] = useState(null);             // işaretlenen şık
  const [skor, setSkor] = useState([0, 0]);             // tek modda [0] kullanılır
  const [sira, setSira] = useState(0);                  // düelloda oyuncu
  const [olumKalim, setOlumKalim] = useState(false);
  const [rekor, setRekor] = useState(0);
  const sure = useRef(new Animated.Value(1)).current;
  const zaman = useRef(null);

  useEffect(() => { AsyncStorage.getItem("ev_arena_rekor").then((v) => v && setRekor(Number(v))).catch(() => {}); }, []);
  useEffect(() => () => clearTimeout(zaman.current), []);

  const baslat = (m) => {
    setMod(m);
    if (m === "duello") { setFaz("isim"); return; }
    kur(m, TEK_SORU * 1);
  };
  const kur = (m, adet) => {
    setSorular(soruSec(m === "duello" ? adet : TEK_SORU));
    setIx(0); setSecim(null); setSkor([0, 0]); setSira(0); setOlumKalim(false);
    setFaz("oyun");
  };

  const suruklat = useCallback(() => {
    sure.setValue(1);
    Animated.timing(sure, { toValue: 0, duration: SURE_SN * 1000, useNativeDriver: false }).start(({ finished }) => {
      if (finished) cevapla(-1);                        // süre doldu: yanlış say
    });
  }, [ix, faz]);
  useEffect(() => { if (faz === "oyun") suruklat(); }, [faz, ix, suruklat]);

  const cevapla = (i) => {
    if (secim !== null) return;
    sure.stopAnimation();
    setSecim(i);
    const soru = sorular[ix];
    const dogru = i >= 0 && dogruMu(soru, i);
    if (dogru) setSkor((s) => { const y = [...s]; y[mod === "duello" ? sira : 0] += 1; return y; });
    zaman.current = setTimeout(() => ileri(dogru), 1100);
  };

  const ileri = (sonDogru) => {
    const soru = sorular[ix];
    void soru;
    setSecim(null);
    if (mod === "tek") {
      if (ix + 1 >= TEK_SORU) return bitir();
      setIx(ix + 1); return;
    }
    // düello: sıra değişir; herkes eşit soru cevaplayınca tur biter
    const yeniIx = ix + 1;
    const turBitti = yeniIx % 2 === 0;
    const oynananTur = yeniIx / 2;
    if (olumKalim && turBitti) {
      const [a, b] = skorGuncel(sonDogru);
      if (a !== b) return bitir();
    }
    if (!olumKalim && turBitti && oynananTur >= DUELLO_SORU) {
      const [a, b] = skorGuncel(sonDogru);
      if (a === b) { setOlumKalim(true); }
      else return bitir();
    }
    if (yeniIx >= sorular.length) { setSorular((s) => [...s, ...soruSec(8)]); }
    setIx(yeniIx); setSira((s) => 1 - s);
  };
  const skorGuncel = (sonDogru) => {
    const y = [...skor];
    if (sonDogru) y[sira] += 0;                          // skor zaten setSkor ile işlendi
    return y;
  };

  const bitir = async () => {
    setFaz("bitti");
    if (mod === "tek" && skor[0] > rekor) {
      setRekor(skor[0]);
      try { await AsyncStorage.setItem("ev_arena_rekor", String(skor[0])); } catch { /* sessiz */ }
    }
  };

  const soru = sorular[ix];
  const adim = mod === "duello" ? Math.floor(ix / 2) + 1 : ix + 1;
  const kazanan = skor[0] === skor[1] ? null : skor[0] > skor[1] ? 0 : 1;

  return (
    <View style={st.kok}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name={BACK_ICON} size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17, flex: 1 }}>🧠 {t("Arena")}</Text>
        {faz === "oyun" && mod === "tek" && <Text style={{ color: "#C4B5FD", fontWeight: "900" }}>🏆 {rekor}</Text>}
      </View>

      {faz === "menu" && (
        <View style={st.orta}>
          <Text style={{ fontSize: 56 }}>🧠</Text>
          <Text style={st.baslik}>{t("Futbol bilgi düellosu")}</Text>
          <Text style={st.alt}>{t("12 saniyede doğru şıkkı bul. Rekoru kır ya da arkadaşını devir!")}</Text>
          <TouchableOpacity onPress={() => baslat("tek")} style={[st.buyuk, { backgroundColor: "#7C3AED" }]}>
            <Text style={st.buyukText}>🤖 {t("Tek başına")} · {TEK_SORU} {t("soru")}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => baslat("duello")} style={[st.buyuk, { backgroundColor: C.kit }]}>
            <Text style={st.buyukText}>👥 {t("Düello")} · {DUELLO_SORU}+{DUELLO_SORU}</Text>
          </TouchableOpacity>
          {rekor > 0 && <Text style={{ color: "#C4B5FD", fontWeight: "900", marginTop: 6 }}>🏆 {t("Rekorun")}: {rekor}/{TEK_SORU}</Text>}
        </View>
      )}

      {faz === "isim" && (
        <View style={st.orta}>
          <Text style={{ fontSize: 44 }}>👥</Text>
          <Text style={st.baslik}>{t("İsimler gelsin")}</Text>
          {[0, 1].map((i) => (
            <TextInput key={i} value={adlar[i]} onChangeText={(v) => setAdlar((a) => { const y = [...a]; y[i] = v; return y; })}
              placeholder={`${i + 1}. ${t("oyuncu")}`} placeholderTextColor="#A78BFA" maxLength={14} style={st.isim} />
          ))}
          <TouchableOpacity disabled={!adlar[0].trim() || !adlar[1].trim()} onPress={() => kur("duello", DUELLO_SORU * 2 + 8)}
            style={[st.buyuk, { backgroundColor: C.kit, opacity: adlar[0].trim() && adlar[1].trim() ? 1 : 0.4 }]}>
            <Text style={st.buyukText}>{t("Düelloyu başlat")} ⚔️</Text>
          </TouchableOpacity>
        </View>
      )}

      {faz === "oyun" && soru && (
        <View style={{ flex: 1, padding: 16 }}>
          {mod === "duello" && (
            <View style={st.tabela}>
              {[0, 1].map((i) => (
                <View key={i} style={[st.taraf, sira === i && st.tarafOn]}>
                  <Text style={{ color: sira === i ? "#fff" : "#A78BFA", fontWeight: "900", fontSize: 13 }} numberOfLines={1}>
                    {adlar[i].trim() || `${i + 1}.`}
                  </Text>
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 20 }}>{skor[i]}</Text>
                </View>
              ))}
            </View>
          )}
          {olumKalim && <Text style={{ color: "#F87171", fontWeight: "900", textAlign: "center", marginBottom: 6 }}>☠️ {t("Ölüm-kalım turu!")}</Text>}
          <Text style={{ color: "#A78BFA", fontWeight: "900", fontSize: 12, textAlign: "center" }}>
            {mod === "duello" ? `${t("Sıra")}: ${adlar[sira].trim()}` : `${adim} / ${TEK_SORU}`}
          </Text>
          <View style={st.sureKap}>
            <Animated.View style={[st.sureBar, { width: sure.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
          </View>
          <View style={st.soruKart}><Text style={st.soruText}>{soru.q}</Text></View>
          {soru.s.map((sec, i) => {
            const isaretli = secim !== null;
            const renk = !isaretli ? "#2E1065" : i === soru.d ? "#16A34A" : i === secim ? "#DC2626" : "#2E1065";
            return (
              <TouchableOpacity key={i} disabled={isaretli} onPress={() => cevapla(i)} style={[st.sik, { backgroundColor: renk }]}>
                <Text style={st.sikText}>{["A", "B", "C", "D"][i]}) {sec}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {faz === "bitti" && (
        <View style={st.orta}>
          <Text style={{ fontSize: 56 }}>{mod === "tek" ? (skor[0] >= 8 ? "🏆" : skor[0] >= 5 ? "👏" : "📚") : "🏆"}</Text>
          {mod === "tek" ? (
            <>
              <Text style={st.baslik}>{skor[0]} / {TEK_SORU}</Text>
              <Text style={st.alt}>{skor[0] > rekor - 1 && skor[0] === rekor ? t("Yeni rekor!") + " 🎉" : t("Rekor") + `: ${rekor}`}</Text>
            </>
          ) : (
            <>
              <Text style={st.baslik}>{kazanan === null ? t("Berabere!") : `${adlar[kazanan].trim()} ${t("kazandı!")}`}</Text>
              <Text style={st.alt}>{adlar[0].trim()} {skor[0]} — {skor[1]} {adlar[1].trim()}</Text>
            </>
          )}
          <TouchableOpacity onPress={() => (mod === "tek" ? kur("tek", TEK_SORU) : kur("duello", DUELLO_SORU * 2 + 8))} style={[st.buyuk, { backgroundColor: "#7C3AED" }]}>
            <Text style={st.buyukText}>{t("Tekrar")} 🔄</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFaz("menu")} style={[st.buyuk, { backgroundColor: "#2E1065" }]}>
            <Text style={st.buyukText}>{t("Menü")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  kok: { flex: 1, backgroundColor: "#4C1D95" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  orta: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  baslik: { color: "#fff", fontWeight: "900", fontSize: 22, textAlign: "center" },
  alt: { color: "#C4B5FD", fontSize: 13, textAlign: "center", lineHeight: 19 },
  buyuk: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 22, minWidth: 240, alignItems: "center" },
  buyukText: { color: "#fff", fontWeight: "900", fontSize: 15 },
  isim: { backgroundColor: "#2E1065", borderRadius: 12, color: "#fff", fontWeight: "800", fontSize: 15, paddingVertical: 11, paddingHorizontal: 14, minWidth: 240, textAlign: "center" },
  tabela: { flexDirection: "row", gap: 8, marginBottom: 8 },
  taraf: { flex: 1, backgroundColor: "#2E1065", borderRadius: 14, alignItems: "center", paddingVertical: 8 },
  tarafOn: { backgroundColor: "#7C3AED" },
  sureKap: { height: 8, backgroundColor: "#2E1065", borderRadius: 999, marginTop: 8, overflow: "hidden" },
  sureBar: { height: 8, backgroundColor: "#F59E0B", borderRadius: 999 },
  soruKart: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginVertical: 12, minHeight: 92, justifyContent: "center" },
  soruText: { fontSize: 16, fontWeight: "900", color: "#1F1147", lineHeight: 23, textAlign: "center" },
  sik: { borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 8 },
  sikText: { color: "#fff", fontWeight: "800", fontSize: 14 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
