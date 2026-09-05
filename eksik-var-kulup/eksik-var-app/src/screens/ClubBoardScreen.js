import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";

/* Kulüp İlanları: takımların "oyuncu arıyoruz" panosu.
   props: rows[{teamId,name,emblem,bio,ownerId}], meId, myTeam, myBio,
          onApply(row), onPublish(bio), onClose(), onCreateTeam(), onBack */
export default function ClubBoardScreen({ rows = [], meId, myTeam = null, myBio = "", onApply, onPublish, onCloseListing, onCreateTeam, onBack }) {
  const [form, setForm] = useState(false);
  const [bio, setBio] = useState(myBio);
  const benimIlan = myTeam && rows.find((r) => r.teamId === myTeam.id);

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>🏘 {t("Kulüp İlanları")}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>{t("Oyuncu arayan takımlar — aralarına katıl")}</Text>
        </View>
      </View>

      <FlatList data={rows} keyExtractor={(r) => r.teamId}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            {myTeam ? (
              form ? (
                <View style={st.form}>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: C.turfText }}>{myTeam.emblem} {myTeam.name} — {t("ilan metni")}</Text>
                  <TextInput value={bio} onChangeText={setBio} multiline maxLength={200}
                    placeholder={t("Ör: Çarşamba maçlarına düzenli stoper arıyoruz")} placeholderTextColor={C.placeholder} style={st.giris} />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity onPress={() => { onPublish(bio); setForm(false); }} style={[st.btn, { backgroundColor: C.kit, flex: 1 }]}>
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
                <TouchableOpacity onPress={() => setForm(true)} style={st.ilanVer}>
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
        renderItem={({ item }) => (
          <View style={st.kart}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ fontSize: 26 }}>{item.emblem}</Text>
              <Text style={{ fontSize: 15, fontWeight: "900", color: C.ink, flex: 1 }} numberOfLines={1}>{item.name}</Text>
              {item.ownerId === meId && <Text style={{ fontSize: 10, fontWeight: "900", color: C.kit }}>{t("SENİN TAKIMIN")}</Text>}
            </View>
            {!!item.bio && <Text style={{ fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 18 }}>{item.bio}</Text>}
            {item.ownerId !== meId && (
              <TouchableOpacity onPress={() => onApply(item)} style={[st.btn, { backgroundColor: C.pitch, marginTop: 10 }]}>
                <Text style={st.btnText}>🙋 {t("Başvur")}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
  ilanVer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.kit, paddingVertical: 13, backgroundColor: C.kitSoft },
  form: { backgroundColor: C.surface, borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: C.line },
  giris: { backgroundColor: C.chalk, borderRadius: 12, borderWidth: 1, borderColor: C.line, padding: 11, minHeight: 70, fontSize: 13, color: C.ink, textAlignVertical: "top" },
  kart: { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  btn: { alignItems: "center", paddingVertical: 10, borderRadius: 12, paddingHorizontal: 14 },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
