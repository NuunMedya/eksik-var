import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar } from "../components";

/* Takım sayfası — v1: amblem+ad (kaptan düzenler), kadro, çıkarma/ayrılma, kestirmeler.
   props: team {id,name,emblem}, members[], meId, onSave({name,emblem}), onRemove(userId),
          onLeave(), onCreateTeam(), onGoMarket(), onGoClub(), onOpenUser(id,name), onBack */
const AMBLEMLER = ["🛡", "⚽", "⚡", "🔥", "🦁", "🦅", "🐺", "⭐"];

export default function TakimScreen({ team = null, members = [], meId, onSave, onRemove, onLeave, onCreateTeam, onGoMarket, onGoClub, onOpenUser, onBack }) {
  const kaptanim = team && members.some((m) => m.id === meId && m.role === "kaptan");
  const [duzen, setDuzen] = useState(false);
  const [ad, setAd] = useState(team ? team.name : "");
  const [amblem, setAmblem] = useState(team ? team.emblem : "🛡");

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17, flex: 1 }}>🛡 {t("Takımım")}</Text>
        {kaptanim && !duzen && (
          <TouchableOpacity onPress={() => { setAd(team.name); setAmblem(team.emblem); setDuzen(true); }}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {!team ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 28 }}>
          <Text style={{ fontSize: 52 }}>🛡</Text>
          <Text style={{ fontSize: 16, fontWeight: "900", color: C.ink, textAlign: "center" }}>{t("Henüz bir takımın yok")}</Text>
          <Text style={{ fontSize: 13, color: C.faint, textAlign: "center", lineHeight: 19 }}>
            {t("Takımını kur; davet ettiğin oyuncular kabul edince kadron burada büyüsün.")}
          </Text>
          <TouchableOpacity onPress={onCreateTeam} style={st.cta}>
            <Text style={st.ctaText}>{t("Takımını kur")} 🛡</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList data={members} keyExtractor={(m) => m.id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListHeaderComponent={
            <View>
              <View style={st.hero}>
                {duzen ? (
                  <View style={{ alignItems: "center", gap: 10, width: "100%" }}>
                    <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                      {AMBLEMLER.map((e) => (
                        <TouchableOpacity key={e} onPress={() => setAmblem(e)}
                          style={[st.amblemSec, amblem === e && { borderColor: C.kit, backgroundColor: C.kitSoft }]}>
                          <Text style={{ fontSize: 24 }}>{e}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <TextInput value={ad} onChangeText={setAd} maxLength={40} style={st.adGiris} />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity onPress={() => setDuzen(false)} style={[st.mini, { backgroundColor: C.chalk }]}>
                        <Text style={{ fontWeight: "900", color: C.faint, fontSize: 13 }}>{t("Vazgeç")}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity disabled={ad.trim().length < 2}
                        onPress={() => { onSave({ name: ad.trim(), emblem: amblem }); setDuzen(false); }}
                        style={[st.mini, { backgroundColor: C.turf }, ad.trim().length < 2 && { opacity: 0.4 }]}>
                        <Text style={{ fontWeight: "900", color: "#fff", fontSize: 13 }}>{t("Kaydet")}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <Text style={{ fontSize: 56 }}>{team.emblem}</Text>
                    <Text style={{ color: "#fff", fontWeight: "900", fontSize: 22 }}>{team.name}</Text>
                    <Text style={{ color: C.mist, fontSize: 12 }}>{members.length} {t("kişi")} · {kaptanim ? t("kaptansın") : t("oyuncusun")}</Text>
                  </>
                )}
              </View>

              <View style={{ flexDirection: "row", gap: 10, paddingHorizontal: 16, marginTop: 14 }}>
                <TouchableOpacity onPress={onGoMarket} style={st.kisa}>
                  <Text style={{ fontSize: 18 }}>🧍</Text>
                  <Text style={st.kisaText}>{t("Oyuncu bul, davet et")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onGoClub} style={st.kisa}>
                  <Text style={{ fontSize: 18 }}>🏘</Text>
                  <Text style={st.kisaText}>{t("Kulüp ilanı ver")}</Text>
                </TouchableOpacity>
              </View>

              <Text style={st.bolum}>{t("KADRO")}</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => item.id !== meId && onOpenUser(item.id, item.name)} style={st.uye}>
              <Avatar name={item.name} uri={item.avatar} size={40} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "900", color: C.ink }} numberOfLines={1}>
                  {item.name}{item.id === meId ? ` (${t("sen")})` : ""}
                </Text>
                <Text style={{ fontSize: 11, color: C.faint }}>
                  {item.role === "kaptan" ? "©️ " + t("Kaptan") : t("Oyuncu")}{item.rating ? ` · ⭐ ${item.rating}` : ""}
                </Text>
              </View>
              {kaptanim && item.id !== meId && (
                <TouchableOpacity onPress={() => Alert.alert(t("Kadrodan çıkar?"), item.name, [
                  { text: t("Vazgeç"), style: "cancel" },
                  { text: t("Çıkar"), style: "destructive", onPress: () => onRemove(item.id) },
                ])} style={{ padding: 6 }}>
                  <Ionicons name="person-remove-outline" size={17} color={C.faint} />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          )}
          ListFooterComponent={!kaptanim && team ? (
            <TouchableOpacity onPress={() => Alert.alert(t("Takımdan ayrıl?"), team.name, [
              { text: t("Vazgeç"), style: "cancel" },
              { text: t("Ayrıl"), style: "destructive", onPress: onLeave },
            ])} style={{ alignSelf: "center", marginTop: 18, padding: 8 }}>
              <Text style={{ color: "#DC2626", fontWeight: "800", fontSize: 13 }}>{t("Takımdan ayrıl")}</Text>
            </TouchableOpacity>
          ) : null} />
      )}
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  hero: { backgroundColor: C.turf, alignItems: "center", gap: 6, paddingBottom: 24, paddingTop: 4, paddingHorizontal: 16 },
  amblemSec: { width: 46, height: 46, borderRadius: 23, borderWidth: 2, borderColor: "rgba(255,255,255,0.3)", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.1)" },
  adGiris: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", color: "#fff", fontWeight: "900", fontSize: 17, textAlign: "center", paddingVertical: 10, width: "80%" },
  mini: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  kisa: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12 },
  kisaText: { fontSize: 12, fontWeight: "900", color: C.turfText, flex: 1 },
  bolum: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText, marginTop: 18, marginBottom: 6, marginHorizontal: 18 },
  uye: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 10 },
  cta: { backgroundColor: C.turf, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 13 },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 15 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
