import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { relInfo, relColor } from "../data";
import { Avatar } from "../components";

export default function AttendanceScreen({ event, roster, onBack, onSave }) {
  // Varsayılan: herkes katıldı. Organizatör yalnızca gelmeyenleri çevirir.
  const [marks, setMarks] = useState(() =>
    Object.fromEntries(roster.map((m) => [m.id, "katildi"]))
  );
  const set = (id, v) => setMarks((s) => ({ ...s, [id]: v }));
  const katildi = roster.filter((m) => marks[m.id] === "katildi").length;
  const gelmedi = roster.length - katildi;

  const save = () => {
    const noShows = roster.filter((m) => marks[m.id] === "gelmedi").map((m) => m.name.split(" ")[0]);
    if (gelmedi === 0) return onSave(marks);
    Alert.alert(
      "Yoklamayı kaydet",
      `${noShows.join(", ")} "gelmedi" olarak işaretlenecek ve güvenilirlik puanları düşecek. Emin misin?`,
      [{ text: "Vazgeç", style: "cancel" }, { text: "Kaydet", style: "destructive", onPress: () => onSave(marks) }]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>Yoklama</Text>
          <Text style={{ color: C.mist, fontSize: 11 }} numberOfLines={1}>
            {event.title} · {event.date}
          </Text>
        </View>
      </View>

      <View style={st.summary}>
        <View style={st.sumItem}>
          <Text style={[st.sumBig, { color: C.pitch }]}>{katildi}</Text>
          <Text style={st.sumSub}>katıldı</Text>
        </View>
        <View style={st.sumItem}>
          <Text style={[st.sumBig, { color: gelmedi ? C.kit : C.faint }]}>{gelmedi}</Text>
          <Text style={st.sumSub}>gelmedi</Text>
        </View>
        <View style={[st.sumItem, { flex: 2 }]}>
          <Text style={{ fontSize: 11, color: C.faint, lineHeight: 15 }}>
            Gelmeyenlere dokun. Kaydedince maç tamamlanır, kadro puanlama yapabilir.
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        <View style={st.list}>
          {roster.map((m, i) => {
            const v = marks[m.id];
            return (
              <View key={m.id} style={[st.row, i === roster.length - 1 && { borderBottomWidth: 0 }]}>
                <Avatar name={m.name} size={40} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }}>{m.name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 }}>
                    <Ionicons name={m.guest ? "person-outline" : "shield-checkmark"} size={11} color={m.guest ? C.faint : relColor(m)} />
                    <Text style={{ fontSize: 11, color: C.faint }}>
                      {m.guest ? "uygulamada değil · yoklama kaydı tutulur" : `${relInfo(m).text} · ${m.via === "uygulama" ? "uygulamadan" : "ekipten"}`}
                    </Text>
                  </View>
                </View>
                <View style={st.toggle}>
                  <TouchableOpacity
                    onPress={() => set(m.id, "katildi")}
                    style={[st.pill, v === "katildi" && { backgroundColor: C.pitch }]}
                  >
                    <Ionicons name="checkmark" size={14} color={v === "katildi" ? "#fff" : C.faint} />
                    <Text style={[st.pillText, v === "katildi" && { color: "#fff" }]}>Geldi</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => set(m.id, "gelmedi")}
                    style={[st.pill, v === "gelmedi" && { backgroundColor: C.kit }]}
                  >
                    <Ionicons name="close" size={14} color={v === "gelmedi" ? "#fff" : C.faint} />
                    <Text style={[st.pillText, v === "gelmedi" && { color: "#fff" }]}>Gelmedi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
        <Text style={st.note}>
          48 saat içinde yoklama alınmazsa sistem herkesi "katıldı" sayar ve maçı kendisi tamamlar.
          "Gelmedi" işaretlenen kişi itiraz edebilir.
        </Text>
      </ScrollView>

      <View style={st.bottomBar}>
        <TouchableOpacity onPress={save} style={st.cta}>
          <Ionicons name="checkmark-done" size={18} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
            Yoklamayı kaydet ve maçı tamamla
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  summary: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#fff",
    paddingHorizontal: 18, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line,
  },
  sumItem: { flex: 1, alignItems: "center" },
  sumBig: { fontSize: 22, fontWeight: "900" },
  sumSub: { fontSize: 10, color: C.faint },
  list: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line },
  toggle: { flexDirection: "row", backgroundColor: C.chalk, borderRadius: 999, padding: 3, gap: 2 },
  pill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: "800", color: C.faint },
  note: { fontSize: 11, color: C.faint, textAlign: "center", marginTop: 14, lineHeight: 16, paddingHorizontal: 8 },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff",
    borderTopWidth: 1, borderTopColor: C.line, padding: 14,
  },
  cta: {
    backgroundColor: C.turf, borderRadius: 14, flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14,
  },
});
