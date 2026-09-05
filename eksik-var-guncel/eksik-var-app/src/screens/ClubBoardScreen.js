import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { CATEGORIES } from "../data";

/* Kulüp İlanları v2: branş filtresi, zengin kartlar (üye sayısı + mevki çipleri),
   mevkili ilan formu, başvuru-durumu kilidi. */
export default function ClubBoardScreen({ rows = [], meId, myTeam = null, myBio = "", appliedIds = [], onApply, onPublish, onCloseListing, onCreateTeam, onBack }) {
  const [form, setForm] = useState(false);
  const [bio, setBio] = useState(myBio);
  const [mevki, setMevki] = useState("");
  const [filtre, setFiltre] = useState(0);           // 0 = hepsi
  const benimIlan = myTeam && rows.find((r) => r.teamId === myTeam.id);
  const liste = rows.filter((r) => !filtre || r.cat === filtre);
  const mevkiler = mevki.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 5);
  const katIkon = (c) => (CATEGORIES.find((x) => x.id === c) || {}).icon || "⚽";

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>🏘 {t("Kulüp İlanları")}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>{t("Oyuncu arayan takımlar — aralarına katıl")}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 14, paddingTop: 10 }}>
        {[{ id: 0, icon: "✨" }, ...CATEGORIES].map((c) => (
          <TouchableOpacity key={c.id} onPress={() => setFiltre(c.id)}
            style={[st.filtre, filtre === c.id && { backgroundColor: C.turf, borderColor: C.turf }]}>
            <Text style={{ fontSize: 13 }}>{c.icon}</Text>
            {c.id === 0 && <Text style={{ fontSize: 12, fontWeight: "900", color: filtre === 0 ? "#fff" : C.faint }}>{t("Hepsi")}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList data={liste} keyExtractor={(r) => r.teamId}
        contentContainerStyle={{ padding: 14, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            {myTeam ? (
              form ? (
                <View style={st.form}>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: C.turfText }}>{myTeam.emblem} {myTeam.name} — {t("ilan metni")}</Text>
                  <TextInput value={bio} onChangeText={setBio} multiline maxLength={200}
                    placeholder={t("Ör: Çarşamba maçlarına düzenli stoper arıyoruz")} placeholderTextColor={C.placeholder} style={st.giris} />
                  <TextInput value={mevki} onChangeText={setMevki} maxLength={60}
                    placeholder={t("Aranan mevkiler (virgülle: stoper, kaleci)")} placeholderTextColor={C.placeholder}
                    style={[st.giris, { minHeight: 0, paddingVertical: 10 }]} />
                  {mevkiler.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5 }}>
                      {mevkiler.map((m, i) => <View key={i} style={st.cip}><Text style={st.cipText}>{m}</Text></View>)}
                    </View>
                  )}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity onPress={() => { onPublish({ bio, positions: mevkiler }); setForm(false); }} style={[st.btn, { backgroundColor: C.kit, flex: 1 }]}>
                      <Text style={st.btnText}>{benimIlan ? t("Güncelle") : t("Yayınla")} 📣</Text>
                    </TouchableOpacity>
                    {benimIlan && (
                      <TouchableOpacity onPress={() => { onCloseListing(); setForm(false); }} style={[st.btn, { backgroundColor: C.chalk }]}>
                        <Text style={[st.btnText, { color: C.faint }]}>{t("Kaldır")}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ) : (
                <TouchableOpacity onPress={() => { setBio(benimIlan ? benimIlan.bio : ""); setMevki(benimIlan ? (benimIlan.positions || []).join(", ") : ""); setForm(true); }} style={st.ilanVer}>
                  <Text style={{ fontSize: 15 }}>📣</Text>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: C.kit }}>
                    {benimIlan ? t("İlanını düzenle") : t("Takımın için ilan ver")}
                  </Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity onPress={onCreateTeam} style={st.ilanVer}>
                <Text style={{ fontSize: 15 }}>🛡</Text>
                <Text style={{ fontSize: 13, fontWeight: "900", color: C.kit }}>{t("Önce takımını kur — 10 saniye")}</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const basvurdum = appliedIds.includes(item.ownerId);
          return (
            <View style={st.kart}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={st.amblemKutu}><Text style={{ fontSize: 24 }}>{item.emblem}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: C.ink }} numberOfLines={1}>{item.name}</Text>
                  <Text style={{ fontSize: 11, color: C.faint }}>{katIkon(item.cat)} · 👥 {item.uye} {t("kişi")}</Text>
                </View>
                {item.ownerId === meId && <Text style={{ fontSize: 10, fontWeight: "900", color: C.kit }}>{t("SENİN TAKIMIN")}</Text>}
              </View>
              {(item.positions || []).length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                  {item.positions.map((m, i) => <View key={i} style={st.cip}><Text style={st.cipText}>{m}</Text></View>)}
                </View>
              )}
              {!!item.bio && <Text style={{ fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 18 }}>{item.bio}</Text>}
              {item.ownerId !== meId && (
                <TouchableOpacity disabled={basvurdum} onPress={() => onApply(item)}
                  style={[st.btn, { backgroundColor: basvurdum ? C.chalk : C.pitch, marginTop: 10 }]}>
                  <Text style={[st.btnText, basvurdum && { color: C.faint }]}>{basvurdum ? "⏳ " + t("Başvuruldu") : "🙋 " + t("Başvur")}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 50, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>🏘</Text>
            <Text style={{ color: C.faint, fontSize: 13, textAlign: "center" }}>{t("İlinizde henüz kulüp ilanı yok — ilkini senin takımın versin!")}</Text>
          </View>
        } />
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  filtre: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: 11, paddingVertical: 6 },
  ilanVer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.kit, paddingVertical: 13, backgroundColor: C.kitSoft },
  form: { backgroundColor: C.surface, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: C.line },
  giris: { backgroundColor: C.chalk, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 11, minHeight: 70, fontSize: 13, color: C.ink, textAlignVertical: "top" },
  kart: { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  amblemKutu: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.chalk, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: C.line },
  cip: { backgroundColor: C.pitchSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  cipText: { fontSize: 11, fontWeight: "800", color: C.pitch },
  btn: { alignItems: "center", paddingVertical: 10, borderRadius: 12, paddingHorizontal: 14 },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
