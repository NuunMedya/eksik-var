import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Share, ActivityIndicator, StyleSheet, Image, Animated, PanResponder, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { BACK_ICON, Avatar } from "../components";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { APP_LINK } from "../data";

/* Kadro Dene 4.1 — format → isimler → imzalı saha (sürükle, PNG paylaş). */
const FORMATLAR = [5, 6, 7, 8, 9, 10, 11];
const FORMASYON = {
  5: ["1-2-1", "2-1-1", "1-1-2"],
  6: ["1-2-2", "1-3-1", "2-2-1", "2-1-2"],
  7: ["2-3-1", "3-2-1", "2-2-2", "1-3-2"],
  8: ["3-3-1", "2-3-2", "3-2-2", "2-4-1"],
  9: ["3-3-2", "3-2-3", "2-4-2", "4-3-1"],
  10: ["3-3-3", "4-3-2", "3-4-2", "4-4-1"],
  11: ["4-4-2", "4-3-3", "3-5-2", "5-3-2"],
};
const RENKLER = [
  ["#F5F1E6", "#123B26"], ["#141414", "#FFFFFF"], ["#E11D48", "#FFFFFF"],
  ["#2563EB", "#FFFFFF"], ["#1B5E3B", "#FFFFFF"], ["#FF7A2E", "#FFFFFF"],
];
const parcala = (f) => f.split("-").map((x) => parseInt(x, 10));

/* Sürüklenebilir jeton — parmağınla istediğin yere taşı */
function Tas({ x, y, bg, fg, ad }) {
  const pan = useRef(new Animated.ValueXY()).current;
  const pr = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: () => pan.extractOffset(),
  })).current;
  return (
    <Animated.View {...pr.panHandlers}
      style={{ position: "absolute", left: x + "%", top: y + "%", marginLeft: -23, marginTop: -23, alignItems: "center", width: 46, transform: pan.getTranslateTransform(), zIndex: 5 }}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: bg, borderWidth: 2.5, borderColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } }}>
        <Text style={{ color: fg, fontWeight: "900", fontSize: 15 }}>{ad.trim().charAt(0).toUpperCase()}</Text>
      </View>
      <Text numberOfLines={1} style={{ color: "#fff", fontSize: 9.5, fontWeight: "800", marginTop: 2, maxWidth: 64, textShadowColor: "rgba(0,0,0,0.7)", textShadowRadius: 3 }}>{ad.split(" ")[0]}</Text>
    </Animated.View>
  );
}

export default function KadroDeneScreen({ onBack, onSearch = null, meName = null }) {
  const [adim, setAdim] = useState(1);
  const [boy, setBoy] = useState(6);
  const [adA, setAdA] = useState("");
  const [adB, setAdB] = useState("");
  const [listA, setListA] = useState([]);
  const [listB, setListB] = useState([]);
  const [formA, setFormA] = useState("1-2-2");
  const [formB, setFormB] = useState("1-3-1");
  const [renkA, setRenkA] = useState(0);
  const [renkB, setRenkB] = useState(2);
  const [aramaHedef, setAramaHedef] = useState(null);
  const [q, setQ] = useState("");
  const [sonuc, setSonuc] = useState([]);
  const [ariyor, setAriyor] = useState(false);
  const sahaRef = useRef(null);

  const takimA = adA.trim() || t("Takım A");
  const takimB = adB.trim() || t("Takım B");
  const boyut = (l) => Array.from({ length: boy }, (_, i) => l[i] || "");
  const yazi = (taraf, i, v) => (taraf === "A" ? setListA : setListB)((l) => { const y = boyut(l); y[i] = v; return y; });
  const varsayilan = (v, i) => (v || "").trim() || t("Oyuncu") + " " + (i + 1);

  const formatSec = (n) => {
    setBoy(n); setFormA(FORMASYON[n][0]); setFormB(FORMASYON[n][1] || FORMASYON[n][0]);
    setListA((l) => l.slice(0, n)); setListB((l) => l.slice(0, n));
    if (meName) setListA((l) => { const y = Array.from({ length: n }, (_, i) => l[i] || ""); if (!y.some((x) => x === meName)) y[0] = y[0] || meName; return y; });
    setAdim(2);
  };

  const ara = async (metin) => {
    setQ(metin);
    if (!onSearch || metin.trim().length < 2) { setSonuc([]); return; }
    setAriyor(true);
    try { setSonuc((await onSearch(metin.trim())) || []); } catch { setSonuc([]); } finally { setAriyor(false); }
  };
  const sonuctan = (u) => {
    const set = aramaHedef === "A" ? setListA : setListB;
    set((l) => { const y = boyut(l); const bos = y.findIndex((x) => !x.trim()); if (bos >= 0) y[bos] = u.name; return y; });
    setAramaHedef(null); setQ(""); setSonuc([]);
  };

  const paylas = async () => {
    try {
      const uri = await captureRef(sahaRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Eksik Var" }); return; }
      throw new Error("yok");
    } catch {
      const satir = (ad, form, list) => `${ad} (${form})\n` + boyut(list).map((v, i) => `${i + 1}. ${varsayilan(v, i)}`).join("\n");
      Share.share({ message: `\u26BD ${takimA} vs ${takimB} \u00B7 ${boy}v${boy}\n\n${satir(takimA, formA, listA)}\n\n${satir(takimB, formB, listB)}\n\n\u{1F517} ${APP_LINK}` }).catch(() => {});
    }
  };

  const Yarim = ({ ust, form, list, renk }) => {
    const [bg, fg] = RENKLER[renk];
    const satirlar = [[1], ...parcala(form).map((n2) => Array.from({ length: n2 }))].map((r, ri) => ({ ri, n: r.length }));
    const toplam = satirlar.length;
    return (
      <View style={{ position: "absolute", left: 0, right: 0, top: ust ? 0 : "50%", height: "50%" }}>
        {satirlar.map(({ ri, n }) => {
          const oran = (ri + 0.7) / (toplam + 0.6);
          const y = ust ? oran * 100 : (1 - oran) * 100;
          return Array.from({ length: n }).map((_, j) => {
            const slot = ri === 0 ? 0 : 1 + parcala(form).slice(0, ri - 1).reduce((a2, b2) => a2 + b2, 0) + j;
            const ad = varsayilan(boyut(list)[slot], slot);
            return <Tas key={form + renk + ri + "-" + j} x={((j + 1) / (n + 1)) * 100} y={y} bg={bg} fg={fg} ad={ad} />;
          });
        })}
      </View>
    );
  };

  const Baslik = ({ metin }) => (
    <View style={st.header}>
      <TouchableOpacity onPress={() => (adim === 1 ? onBack() : setAdim(adim - 1))} style={{ padding: 6 }}>
        <Ionicons name={BACK_ICON} size={22} color="#fff" />
      </TouchableOpacity>
      <Text style={st.headerTitle}>{metin}</Text>
      {adim === 3 ? (
        <TouchableOpacity onPress={paylas} style={{ padding: 6 }}><Ionicons name="share-outline" size={21} color="#fff" /></TouchableOpacity>
      ) : <View style={{ width: 34 }} />}
    </View>
  );

  /* ============ 1 · FORMAT ============ */
  if (adim === 1) return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <Baslik metin={t("Kadro Dene")} />
      <ScrollView contentContainerStyle={{ padding: 20, alignItems: "center" }}>
        <View style={{ width: 74, height: 74, borderRadius: 37, backgroundColor: C.pitchSoft, alignItems: "center", justifyContent: "center", marginTop: 18 }}>
          <Text style={{ fontSize: 34 }}>{"\u26BD"}</Text>
        </View>
        <Text style={{ fontSize: 21, fontWeight: "900", color: C.ink, marginTop: 14 }}>{t("Format seç")}</Text>
        <Text style={{ fontSize: 13, color: C.faint, marginTop: 4, marginBottom: 18 }}>{t("Kaç kişilik maç için diziliş kuruyorsun?")}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {FORMATLAR.map((n) => (
            <TouchableOpacity key={n} onPress={() => formatSec(n)}
              style={{ width: "30%", backgroundColor: C.surface, borderRadius: 18, borderWidth: 1.5, borderColor: n === boy ? C.turf : C.line, paddingVertical: 18, alignItems: "center" }}>
              <Text style={{ fontSize: 19, fontWeight: "900", color: n === boy ? C.turfText : C.ink }}>{n}v{n}</Text>
              <Text style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>{n} + {n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  /* ============ 2 · İSİMLER ============ */
  if (adim === 2) return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <Baslik metin={`${boy}v${boy} \u00B7 ` + t("Oyuncu isimleri")} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: "row", gap: 10 }}>
          {[["A", adA, setAdA, listA], ["B", adB, setAdB, listB]].map(([taraf, ad, setAd, list]) => (
            <View key={taraf} style={{ flex: 1 }}>
              <View style={{ backgroundColor: taraf === "A" ? C.turf : C.kit, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 9 }}>
                <TextInput value={ad} onChangeText={setAd} maxLength={16} placeholder={t("Takım adı yaz")} placeholderTextColor="rgba(255,255,255,0.7)"
                  style={{ color: "#fff", fontWeight: "900", fontSize: 13.5, padding: 0 }} />
              </View>
              {boyut(list).map((v, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 10, marginTop: 7 }}>
                  <Text style={{ width: 18, fontSize: 12, fontWeight: "900", color: C.faint }}>{i + 1}</Text>
                  <TextInput value={v} onChangeText={(x) => yazi(taraf, i, x)} placeholder={t("Oyuncu") + " " + (i + 1)}
                    placeholderTextColor={C.placeholder} style={{ flex: 1, paddingVertical: 10, fontSize: 13.5, color: C.ink }} />
                </View>
              ))}
              {onSearch && (
                <TouchableOpacity onPress={() => { setAramaHedef(taraf); setQ(""); setSonuc([]); }}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, borderWidth: 1.5, borderColor: C.line, borderStyle: "dashed", borderRadius: 12, paddingVertical: 10, backgroundColor: C.surface }}>
                  <Ionicons name="people-outline" size={15} color={C.turfText} />
                  <Text style={{ fontSize: 12, fontWeight: "900", color: C.turfText }}>{t("Uygulamadan ekle")}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 11.5, color: C.faint, textAlign: "center", marginTop: 12 }}>{t("Boş kalan alanlar dizilişte varsayılan isimlerle dolar.")}</Text>
        {aramaHedef && (
          <View style={{ marginTop: 14, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: "900", color: C.faint, marginBottom: 8 }}>{"\u{1F465} "}{t("Uygulamadan ekle")} {"\u2192"} {aramaHedef === "A" ? takimA : takimB}</Text>
            <TextInput value={q} onChangeText={ara} placeholder={t("İsim ara…")} placeholderTextColor={C.placeholder} autoFocus
              style={{ backgroundColor: C.chalk, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: C.ink }} />
            {ariyor && <ActivityIndicator style={{ marginTop: 10 }} color={C.turfText} />}
            {sonuc.slice(0, 5).map((u) => (
              <TouchableOpacity key={u.id} onPress={() => sonuctan(u)} style={{ flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 8 }}>
                <Avatar name={u.name} uri={u.avatar} size={30} />
                <Text style={{ flex: 1, fontSize: 13.5, fontWeight: "800", color: C.ink }}>{u.name}</Text>
                <Ionicons name="add-circle" size={20} color={C.turfText} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setAramaHedef(null)} style={{ alignSelf: "center", marginTop: 6 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.faint }}>{t("Kapat")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      <View style={st.altBar}>
        <TouchableOpacity onPress={() => setAdim(3)} style={st.cta}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14.5 }}>{t("Dizilişe geç")} {"\u2192"}</Text>
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </View>
  );

  /* ============ 3 · İMZALI SAHA ============ */
  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <Baslik metin={t("Kadro dizilişi")} />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 30 }}>
        {[[takimA, formA, setFormA, renkA, setRenkA], [takimB, formB, setFormB, renkB, setRenkB]].map(([ad, form, setForm, renk, setRenk], k) => (
          <View key={k} style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "900", color: C.ink }}>{ad} {"\u00B7"} {t("Formasyon")}</Text>
              <View style={{ flexDirection: "row", gap: 7 }}>
                {RENKLER.map(([bg], ri) => (
                  <TouchableOpacity key={ri} onPress={() => setRenk(ri)}
                    style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: bg, borderWidth: 2.5, borderColor: renk === ri ? C.turfText : C.line }} />
                ))}
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {FORMASYON[boy].map((f) => (
                <TouchableOpacity key={f} onPress={() => setForm(f)}
                  style={{ borderRadius: 999, borderWidth: 1.5, borderColor: form === f ? C.turf : C.line, backgroundColor: form === f ? C.turf : C.surface, paddingHorizontal: 15, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: form === f ? "#fff" : C.ink }}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ))}
        <Text style={{ fontSize: 11.5, color: C.faint, textAlign: "center", marginBottom: 8 }}>{"\u{1F91A} "}{t("Jetonları parmağınla sürükleyip istediğin yere taşı")}</Text>

        <View ref={sahaRef} collapsable={false} style={{ borderRadius: 20, overflow: "hidden", backgroundColor: "#1B5E3B" }}>
          <View style={{ backgroundColor: "#123B26", paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ fontWeight: "900", fontSize: 16 }}>
              <Text style={{ color: "#fff" }}>EKS{"\u0130"}K </Text><Text style={{ color: "#FF7A2E" }}>VAR</Text>
            </Text>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "800", marginTop: 2 }}>{takimA} {"\u2694\uFE0F"} {takimB}</Text>
            <Text style={{ color: C.mist, fontSize: 10.5, fontWeight: "700" }}>{boy}v{boy} {"\u00B7"} {formA} {t("vs")} {formB}</Text>
          </View>
          <View style={{ height: 560 }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <View key={i} style={{ position: "absolute", left: 0, right: 0, top: (i * 12.5) + "%", height: "12.5%", backgroundColor: i % 2 ? "rgba(255,255,255,0.045)" : "transparent" }} />
            ))}
            <Image source={require("../../assets/logo.png")} style={{ position: "absolute", alignSelf: "center", top: "50%", marginTop: -110, width: 220, height: 220, opacity: 0.07 }} resizeMode="contain" />
            <View style={{ position: "absolute", left: 10, right: 10, top: "50%", height: 1.5, backgroundColor: "rgba(255,255,255,0.5)" }} />
            <View style={{ position: "absolute", alignSelf: "center", top: "50%", marginTop: -34, width: 68, height: 68, borderRadius: 34, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)" }} />
            <Yarim ust form={formA} list={listA} renk={renkA} />
            <Yarim ust={false} form={formB} list={listB} renk={renkB} />
            <View style={{ position: "absolute", right: 10, bottom: 8, backgroundColor: "rgba(18,59,38,0.85)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 10 }}>{"\u26BD"}</Text>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "900" }}>eksikvar</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity onPress={paylas} style={[st.cta, { marginTop: 14, flexDirection: "row", justifyContent: "center", gap: 8 }]}>
          <Ionicons name="share-outline" size={17} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14.5 }}>{t("PNG olarak paylaş (Story'ye uygun)")}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, paddingTop: 56, paddingBottom: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: "#fff", fontSize: 16.5, fontWeight: "900" },
  altBar: { padding: 14, paddingBottom: 30, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line },
  cta: { backgroundColor: C.kit, borderRadius: 16, paddingVertical: 14, alignItems: "center" },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
