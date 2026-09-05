import React from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar, BACK_ICON } from "../components";

export default function BlockedScreen({ blocked, onBack, onUnblock }) {
  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}>
          <Ionicons name={BACK_ICON} size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>{t("Engellenenler")}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>Engellediğin kişi sana ne yazabilir ne arayabilir; etkinliklerini görmezsin</Text>
        </View>
      </View>
      <FlatList
        data={blocked}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 18 }}
        renderItem={({ item: m }) => (
          <View style={st.row}>
            <Avatar name={m.name} uri={m.avatar} size={40} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }}>{m.name}</Text>
              <Text style={{ fontSize: 12, color: C.faint }}>@{m.username}</Text>
            </View>
            <TouchableOpacity onPress={() => onUnblock(m)} style={st.unblock}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: C.turfText }}>{t("Engeli kaldır")}</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={{ alignItems: "center", padding: 30 }}>
            <Ionicons name="shield-checkmark-outline" size={36} color={C.gray} />
            <Text style={{ fontWeight: "800", color: C.ink, marginTop: 10 }}>{t("Engellediğin kimse yok")}</Text>
            <Text style={{ color: C.faint, fontSize: 13, marginTop: 4, textAlign: "center" }}>
              {t("Bir üyenin kartında \"Engelle\" seçeneğiyle engelleyebilirsin.")}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  unblock: { backgroundColor: C.pitchSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
