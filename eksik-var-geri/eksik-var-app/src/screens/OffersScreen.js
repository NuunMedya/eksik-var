import React, { useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar, BACK_ICON } from "../components";
import { timeAgo } from "../data";

/* Tekliflerim: 💌 oyuncu teklifi · 🏆 takım daveti · 🏘 kulüp başvurusu
   props: offers[], onDecide(id, "kabul"|"ret"), onCancel(id), onOpenUser(id, name), onBack */
const IKON = { oyuncu: "💌", takim: "🏆", kulup: "🏘" };
const DURUM = { bekliyor: ["⏳", null], kabul: ["✅", "#16A34A"], ret: ["✖", "#DC2626"], iptal: ["—", null] };

export default function OffersScreen({ offers = [], onDecide, onCancel, onOpenUser, onBack }) {
  const [sekme, setSekme] = useState("gelen");
  const liste = offers.filter((o) => o.yon === sekme);

  const Kart = ({ o }) => (
    <View style={st.kart}>
      <TouchableOpacity onPress={() => onOpenUser(o.kisiId, o.kisi)} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Avatar name={o.kisi || "?"} uri={o.avatar} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: C.ink }} numberOfLines={1}>
            {IKON[o.kind]} {o.kisi}
          </Text>
          <Text style={{ fontSize: 11, color: C.faint }}>
            {o.kind === "takim" ? t("Takım daveti") : o.kind === "kulup" ? t("Kulüp başvurusu") : t("Transfer teklifi")}
            {o.takim ? ` · ${o.takim}` : ""} · {timeAgo(o.createdAt)}
          </Text>
        </View>
        {o.status !== "bekliyor" && (
          <Text style={{ fontSize: 12, fontWeight: "900", color: DURUM[o.status][1] || C.faint }}>
            {o.status === "kabul" ? "✅ " + t("Kabul") : o.status === "ret" ? "✖ " + t("Ret") : t("İptal")}
          </Text>
        )}
      </TouchableOpacity>
      {!!o.message && <Text style={{ fontSize: 13, color: C.ink, marginTop: 8, lineHeight: 18 }}>{o.message}</Text>}
      {o.status === "bekliyor" && (
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
          {sekme === "gelen" ? (
            <>
              <TouchableOpacity onPress={() => onDecide(o.id, "kabul")} style={[st.btn, { backgroundColor: C.pitch }]}>
                <Text style={st.btnText}>✅ {t("Kabul et")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => onDecide(o.id, "ret")} style={[st.btn, { backgroundColor: C.chalk }]}>
                <Text style={[st.btnText, { color: C.faint }]}>{t("Reddet")}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity onPress={() => onCancel(o.id)} style={[st.btn, { backgroundColor: C.chalk }]}>
              <Text style={[st.btnText, { color: C.faint }]}>{t("Teklifi geri çek")}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name={BACK_ICON} size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17, flex: 1 }}>💌 {t("Tekliflerim")}</Text>
      </View>
      <View style={st.sekmeler}>
        {["gelen", "giden"].map((x) => (
          <TouchableOpacity key={x} onPress={() => setSekme(x)} style={[st.sekme, sekme === x && st.sekmeOn]}>
            <Text style={{ fontSize: 13, fontWeight: "900", color: sekme === x ? "#fff" : C.faint }}>
              {x === "gelen" ? t("Gelen") : t("Giden")} ({offers.filter((o) => o.yon === x).length})
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList data={liste} keyExtractor={(o) => o.id} renderItem={({ item }) => <Kart o={item} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 60, gap: 8 }}>
            <Text style={{ fontSize: 40 }}>📭</Text>
            <Text style={{ color: C.faint, fontSize: 13, textAlign: "center" }}>
              {sekme === "gelen" ? t("Henüz gelen teklif yok — vitrine çık, görünür ol!") : t("Henüz teklif göndermedin — pazarda oyuncuları keşfet!")}
            </Text>
          </View>
        } />
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  sekmeler: { flexDirection: "row", gap: 8, padding: 14, paddingBottom: 6 },
  sekme: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 999, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  sekmeOn: { backgroundColor: C.turf, borderColor: C.turf },
  kart: { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  btn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12 },
  btnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
