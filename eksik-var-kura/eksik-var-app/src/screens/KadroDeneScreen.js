import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Share, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BACK_ICON } from "../components";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar } from "../components";
import { makeTeams, TEAM_NAMES } from "../lineup";

/* Kadro Dene 2.0 — kura gecesi:
   oyuncu havuzu (uygulamadan ara-ekle + elle yaz-ekle), 🧤 işaretleri, ⚖️ dengeli kura, VS sahnesi. */
export default function KadroDeneScreen({ onBack, onSearch = null, meName = null }) {
  const [havuz, setHavuz] = useState([]);            // { id?, name, avatar?, gk }
  const [hizli, setHizli] = useState("");
  const [q, setQ] = useState("");
  const [sonuc, setSonuc] = useState([]);
  const [ariyor, setAriyor] = useState(false);
  const [takimlar, setTakimlar] = useState(null);

  const ekle = (p) => setHavuz((l) => l.some((x) => x.name === p.name) ? l : [...l, { ...p, gk: false }]);
  const cikar = (name) => setHavuz((l) => l.filter((x) => x.name !== name));
  const gkToggle = (name) => setHavuz((l) => l.map((x) => x.name === name ? { ...x, gk: !x.gk } : x));
  const ara = async () => {
    const term = q.trim(); if (term.length < 2 || !onSearch) return;
    setAriyor(true);
    try { setSonuc(await onSearch(term)); } catch { setSonuc([]); }
    setAriyor(false);
  };
  const kura = () => setTakimlar(makeTeams(havuz.map((p) => ({ name: p.name, gk: p.gk })), "dengeli"));
  const paylas = () => {
    if (!takimlar) return;
    const satir = (tk, i) => `${TEAM_NAMES[i].emoji} ${TEAM_NAMES[i].name}\n` + tk.map((p) => `• ${p.name}${p.gk ? " 🧤" : ""}`).join("\n");
    Share.share({ message: `⚖️ Kura sonucu\n\n${satir(takimlar.A, 0)}\n\n${satir(takimlar.B, 1)}` }).catch(() => {});
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ padding: 4 }}>
          <Ionicons name={BACK_ICON} size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>📋 {t("Kadro Dene")}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>{t("Havuzu doldur, kurayı çek — takımlar dengeli kurulur")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {/* oyuncu ekleme */}
        <Text style={st.bolum}>{t("OYUNCU EKLE")}</Text>
        {onSearch && (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={q} onChangeText={setQ} placeholder={t("Uygulamadan ara (ad / @kullanıcı)")}
              placeholderTextColor={C.placeholder} style={[st.giris, { flex: 1 }]}
              onSubmitEditing={ara} returnKeyType="search" autoCapitalize="none" />
            <TouchableOpacity onPress={ara} style={st.araBtn}><Ionicons name="search" size={18} color="#fff" /></TouchableOpacity>
          </View>
        )}
        {ariyor && <ActivityIndicator style={{ marginTop: 10 }} color={C.pitch} />}
        {sonuc.map((u) => (
          <TouchableOpacity key={String(u.id)} onPress={() => { ekle({ id: u.id, name: u.name, avatar: u.avatar }); setSonuc([]); setQ(""); }} style={st.sonucSatir}>
            <Avatar name={u.name} uri={u.avatar} size={30} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: C.ink }}>{u.name} <Text style={{ color: C.faint, fontWeight: "400" }}>@{u.username}</Text></Text>
            <Text style={{ color: C.pitch, fontWeight: "900" }}>+ {t("Ekle")}</Text>
          </TouchableOpacity>
        ))}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <TextInput value={hizli} onChangeText={setHizli} placeholder={t("İsim yaz (uygulamasız arkadaş)")}
            placeholderTextColor={C.placeholder} style={[st.giris, { flex: 1 }]}
            onSubmitEditing={() => { if (hizli.trim()) { ekle({ name: hizli.trim() }); setHizli(""); } }} returnKeyType="done" />
          <TouchableOpacity onPress={() => { if (hizli.trim()) { ekle({ name: hizli.trim() }); setHizli(""); } }} style={[st.araBtn, { backgroundColor: C.kit }]}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {meName && !havuz.some((x) => x.name === meName) && (
          <TouchableOpacity onPress={() => ekle({ name: meName })} style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.pitch }}>+ {t("Beni de ekle")} ({meName.split(" ")[0]})</Text>
          </TouchableOpacity>
        )}

        {/* havuz */}
        {havuz.length > 0 && (
          <>
            <Text style={st.bolum}>{t("HAVUZ")} · {havuz.length} <Text style={{ fontWeight: "400", color: C.faint }}>{t("(🧤 için oyuncuya dokun)")}</Text></Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {havuz.map((p) => (
                <TouchableOpacity key={p.name} onPress={() => gkToggle(p.name)} onLongPress={() => cikar(p.name)}
                  style={[st.cip, p.gk && { backgroundColor: C.pitchSoft, borderColor: C.pitch }]}>
                  <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.ink }}>{p.gk ? "🧤 " : ""}{p.name}</Text>
                  <TouchableOpacity onPress={() => cikar(p.name)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                    <Text style={{ color: C.faint, fontSize: 12 }}> ✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* kura düğmesi */}
        <TouchableOpacity disabled={havuz.length < 2} onPress={kura}
          style={[st.kuraBtn, havuz.length < 2 && { opacity: 0.4 }]}>
          <Text style={{ fontSize: 16 }}>⚖️</Text>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>{takimlar ? t("Yeniden çek") : t("Kurayı çek")}</Text>
        </TouchableOpacity>

        {/* VS sahnesi */}
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
  bolum: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText, marginTop: 16, marginBottom: 8 },
  giris: { backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.ink },
  araBtn: { width: 42, borderRadius: 12, backgroundColor: C.pitch, alignItems: "center", justifyContent: "center" },
  sonucSatir: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 9, marginTop: 8 },
  cip: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 999, borderWidth: 1.5, borderColor: C.line, paddingHorizontal: 11, paddingVertical: 7 },
  kuraBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.kit, borderRadius: 16, paddingVertical: 14, marginTop: 18 },
  takimKart: { flex: 1, borderWidth: 1.5, borderRadius: 16, padding: 10 },
  oyuncuSatir: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  forma: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  vs: { position: "absolute", top: 6, alignSelf: "center", backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  paylasBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 10 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
