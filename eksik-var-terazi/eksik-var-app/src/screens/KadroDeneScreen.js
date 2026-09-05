import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Share, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BACK_ICON } from "../components";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar } from "../components";
import { makeTeams, TEAM_NAMES } from "../lineup";

/* Kadro Dene 3.0 — üç basit adım: yaz-ekle → listeyi ayarla (görünür düğmelerle) → kurayı çek. */
export default function KadroDeneScreen({ onBack, onSearch = null, meName = null }) {
  const [havuz, setHavuz] = useState([]);
  const [hizli, setHizli] = useState("");
  const [aramaAcik, setAramaAcik] = useState(false);
  const [q, setQ] = useState("");
  const [sonuc, setSonuc] = useState([]);
  const [ariyor, setAriyor] = useState(false);
  const [takimlar, setTakimlar] = useState(null);

  const ekle = (p) => setHavuz((l) => l.some((x) => x.name === p.name) ? l : [...l, { gk: false, yildiz: 2, ...p }]);
  const guncelle = (name, patch) => setHavuz((l) => l.map((x) => x.name === name ? { ...x, ...patch } : x));
  const cikar = (name) => setHavuz((l) => l.filter((x) => x.name !== name));
  const ara = async () => {
    const term = q.trim(); if (term.length < 2 || !onSearch) return;
    setAriyor(true);
    try { setSonuc(await onSearch(term)); } catch { setSonuc([]); }
    setAriyor(false);
  };
  const kura = () => setTakimlar(makeTeams(havuz.map((p) => ({
    name: p.name, gk: p.gk,
    positions: p.gk ? [...new Set([...(p.positions || []), "kaleci"])] : (p.positions || []).filter((x) => x !== "kaleci"),
    rating: p.id && p.rating > 0 ? p.rating : { 1: 2.5, 2: 3.5, 3: 4.5 }[p.yildiz || 2],
  })), "dengeli"));
  const paylas = () => {
    if (!takimlar) return;
    const satir = (tk, i) => `${TEAM_NAMES[i].emoji} ${TEAM_NAMES[i].name}\n` + tk.map((p) => `• ${p.name}${p.gk ? " 🧤" : ""}`).join("\n");
    Share.share({ message: `⚖️ Kura sonucu\n\n${satir(takimlar.A, 0)}\n\n${satir(takimlar.B, 1)}` }).catch(() => {});
  };
  const Adim = ({ no, baslik }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18, marginBottom: 8 }}>
      <View style={st.adimNo}><Text style={{ color: "#fff", fontWeight: "900", fontSize: 12 }}>{no}</Text></View>
      <Text style={{ fontSize: 13, fontWeight: "900", color: C.ink }}>{baslik}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <Ionicons name={BACK_ICON} size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>⚖️ {t("Kura Çek")}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>{t("İsimleri yaz, kurayı çek — gerisi bizde")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Adim no="1" baslik={t("Oyuncuları ekle")} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TextInput value={hizli} onChangeText={setHizli} placeholder={t("Oyuncu adı yaz…")}
            placeholderTextColor={C.placeholder} style={[st.giris, { flex: 1 }]}
            onSubmitEditing={() => { if (hizli.trim()) { ekle({ name: hizli.trim() }); setHizli(""); } }} returnKeyType="done" />
          <TouchableOpacity onPress={() => { if (hizli.trim()) { ekle({ name: hizli.trim() }); setHizli(""); } }} style={st.ekleBtn}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{t("EKLE")}</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", gap: 14, marginTop: 8 }}>
          {meName && !havuz.some((x) => x.name === meName) && (
            <TouchableOpacity onPress={() => ekle({ name: meName })}>
              <Text style={st.mavilink}>+ {t("Beni ekle")}</Text>
            </TouchableOpacity>
          )}
          {onSearch && (
            <TouchableOpacity onPress={() => setAramaAcik((x) => !x)}>
              <Text style={st.mavilink}>🔎 {t("Uygulamadan ara")}</Text>
            </TouchableOpacity>
          )}
        </View>
        {aramaAcik && (
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput value={q} onChangeText={setQ} placeholder={t("Ad veya @kullanıcı adı")}
                placeholderTextColor={C.placeholder} style={[st.giris, { flex: 1 }]}
                onSubmitEditing={ara} returnKeyType="search" autoCapitalize="none" />
              <TouchableOpacity onPress={ara} style={[st.ekleBtn, { backgroundColor: C.pitch }]}>
                <Ionicons name="search" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
            {ariyor && <ActivityIndicator style={{ marginTop: 8 }} color={C.pitch} />}
            {sonuc.map((u) => (
              <TouchableOpacity key={String(u.id)} style={st.sonucSatir}
                onPress={() => { ekle({ id: u.id, name: u.name, avatar: u.avatar, rating: u.rating || 0, positions: u.positions || [] }); setSonuc([]); setQ(""); setAramaAcik(false); }}>
                <Avatar name={u.name} uri={u.avatar} size={30} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: C.ink }}>{u.name}</Text>
                <Text style={{ color: C.pitch, fontWeight: "900" }}>+ {t("EKLE")}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {havuz.length > 0 && (
          <>
            <Adim no="2" baslik={`${t("Listeyi ayarla")} · ${havuz.length} ${t("oyuncu")}`} />
            <Text style={st.ipucu}>🧤 = {t("kaleci")} · ⭐ = {t("güç (dokun, değişsin)")}</Text>
            {havuz.map((p) => (
              <View key={p.name} style={st.oyuncuKart}>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "800", color: C.ink }} numberOfLines={1}>{p.name}</Text>
                <TouchableOpacity onPress={() => guncelle(p.name, { gk: !p.gk })}
                  style={[st.miniBtn, p.gk && { backgroundColor: C.pitchSoft, borderColor: C.pitch }]}>
                  <Text style={{ fontSize: 14 }}>🧤</Text>
                </TouchableOpacity>
                {p.id
                  ? (p.rating > 0
                    ? <View style={[st.miniBtn, { borderColor: "#E7C86A", backgroundColor: "#FFF7E0" }]}><Text style={{ fontSize: 11, fontWeight: "900", color: "#B8860B" }}>★{p.rating}</Text></View>
                    : <TouchableOpacity onPress={() => guncelle(p.name, { yildiz: ((p.yildiz || 2) % 3) + 1 })}
                        style={[st.miniBtn, { borderColor: "#E7C86A", backgroundColor: "#FFF7E0" }]}>
                        <Text style={{ fontSize: 11 }}>{"⭐".repeat(p.yildiz || 2)}</Text>
                      </TouchableOpacity>)
                  : <TouchableOpacity onPress={() => guncelle(p.name, { yildiz: (p.yildiz % 3) + 1 })}
                      style={[st.miniBtn, { borderColor: "#E7C86A", backgroundColor: "#FFF7E0", minWidth: 52 }]}>
                      <Text style={{ fontSize: 11 }}>{"⭐".repeat(p.yildiz || 2)}</Text>
                    </TouchableOpacity>}
                <TouchableOpacity onPress={() => cikar(p.name)} style={st.miniBtn}>
                  <Ionicons name="trash-outline" size={15} color="#DC2626" />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}

        {havuz.length >= 2 && (
          <>
            <Adim no="3" baslik={t("Kurayı çek")} />
            <TouchableOpacity onPress={kura} style={st.kuraBtn}>
              <Text style={{ fontSize: 18 }}>⚖️</Text>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>{takimlar ? t("YENİDEN ÇEK") : t("KURAYI ÇEK")}</Text>
            </TouchableOpacity>
          </>
        )}

        {takimlar && (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[["A", C.pitch, C.pitchSoft], ["B", C.kit, C.kitSoft]].map(([id, renk, soft], i) => (
                <View key={id} style={[st.takimKart, { borderColor: renk, backgroundColor: soft }]}>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: renk, marginBottom: 8 }}>
                    {TEAM_NAMES[i].emoji} {t(TEAM_NAMES[i].name)} · {takimlar[id].length}
                  </Text>
                  {takimlar[id].map((p, ix) => (
                    <View key={p.name} style={st.oyuncuSatir}>
                      <View style={[st.forma, { backgroundColor: renk }]}>
                        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 11 }}>{p.gk ? "🧤" : ix + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 12.5, fontWeight: "700", color: C.ink, flex: 1 }} numberOfLines={1}>{p.name}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
            <View style={st.vs}><Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>VS</Text></View>
            <TouchableOpacity onPress={paylas} style={st.paylasBtn}>
              <Ionicons name="share-social-outline" size={16} color={C.turfText} />
              <Text style={{ fontSize: 13, fontWeight: "900", color: C.turfText }}>{t("Takımları paylaş")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.pitchDark, paddingTop: 58, paddingBottom: 14, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  adimNo: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.kit, alignItems: "center", justifyContent: "center" },
  giris: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.ink },
  ekleBtn: { borderRadius: 12, backgroundColor: C.kit, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  mavilink: { fontSize: 12.5, fontWeight: "800", color: C.pitch },
  sonucSatir: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 9, marginTop: 8 },
  ipucu: { fontSize: 11.5, color: C.faint, marginBottom: 8 },
  oyuncuKart: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 11, paddingVertical: 8, marginBottom: 7 },
  miniBtn: { borderWidth: 1.5, borderColor: C.line, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5, alignItems: "center", justifyContent: "center", backgroundColor: C.chalk },
  kuraBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.kit, borderRadius: 16, paddingVertical: 15 },
  takimKart: { flex: 1, borderWidth: 1.5, borderRadius: 16, padding: 10 },
  oyuncuSatir: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  forma: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  vs: { position: "absolute", top: 6, alignSelf: "center", backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  paylasBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 10 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
