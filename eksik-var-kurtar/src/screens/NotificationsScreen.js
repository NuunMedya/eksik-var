import React from "react";
import { BACK_ICON, Stars } from "../components";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { NOTIF_META, MY_COMMENTS } from "../data";

export default function NotificationsScreen({ notifications, onBack, onOpen, onReadAll, onSettings, attendance = [], onAttendance = () => {} }) {
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}>
          <Ionicons name={BACK_ICON} size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>{t("Bildirimler")}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>
            {unread > 0 ? `${unread} okunmamış` : "Hepsi okundu"}
          </Text>
        </View>
        {unread > 0 && (
          <TouchableOpacity onPress={onReadAll} style={st.readAll}>
            <Ionicons name="checkmark-done" size={15} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>{t("Tümünü oku")}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        ListHeaderComponent={<View>
        {attendance.length > 0 ? (
          <View style={{ marginBottom: 14 }}>
            {attendance.map((e) => (
              <TouchableOpacity key={"att-" + e.id} onPress={() => onAttendance(e.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.kit, borderRadius: 14, padding: 12, marginBottom: 8 }}>
                <Ionicons name="clipboard-outline" size={20} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "900", fontSize: 13, color: "#fff" }}>{t("Yoklama bekliyor")}</Text>
                  <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }} numberOfLines={1}>{e.title} · {e.date}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
        {MY_COMMENTS.length > 0 && (
          <View style={{ backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, padding: 12, marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText, marginBottom: 6 }}>💬 {t("HAKKINDA SÖYLENENLER")}</Text>
            {MY_COMMENTS.map((c, i) => (
              <View key={i} style={{ paddingVertical: 6, borderBottomWidth: i === MY_COMMENTS.length - 1 ? 0 : 1, borderBottomColor: C.line }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontWeight: "800", fontSize: 12.5, color: C.ink }}>{c.from}</Text>
                  <Stars value={c.stars} size={11} />
                </View>
                <Text style={{ fontSize: 12.5, color: C.faint, marginTop: 2 }}>"{c.text}"</Text>
              </View>
            ))}
          </View>
        )}
        </View>}
        contentContainerStyle={{ padding: 18, paddingBottom: 40 }}
        renderItem={({ item: n }) => {
          const raw = NOTIF_META[n.type] || NOTIF_META.mesaj; const m = { icon: raw.icon, color: C[raw.color] || raw.color, bg: C[raw.bg] || raw.bg };
          return (
            <TouchableOpacity onPress={() => onOpen(n)} style={[st.row, !n.read && st.rowUnread]}>
              <View style={[st.icon, { backgroundColor: m.bg }]}>
                <Ionicons name={m.icon} size={18} color={m.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontWeight: n.read ? "700" : "900", fontSize: 14, color: C.ink, flex: 1 }} numberOfLines={1}>
                    {n.title}
                  </Text>
                  <Text style={{ fontSize: 11, color: n.read ? C.faint : C.pitch, marginLeft: 8 }}>{n.time}</Text>
                </View>
                <Text style={{ fontSize: 13, color: n.read ? C.faint : C.ink, marginTop: 2, lineHeight: 18 }} numberOfLines={2}>
                  {n.body}
                </Text>
              </View>
              {!n.read && <View style={st.dot} />}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={st.empty}>
            <Ionicons name="notifications-off-outline" size={36} color={C.gray} />
            <Text style={{ fontWeight: "800", color: C.ink, marginTop: 10 }}>{t("Henüz bildirim yok")}</Text>
            <Text style={{ color: C.faint, fontSize: 13, marginTop: 4, textAlign: "center" }}>
              {t("Başvurular, onaylar ve maç hatırlatmaları burada görünecek.")}
            </Text>
          </View>
        }
        ListFooterComponent={
          <TouchableOpacity onPress={onSettings} style={st.footer}>
            <Ionicons name="settings-outline" size={14} color={C.faint} />
            <Text style={{ fontSize: 12, color: C.faint }}>{t("Bildirim tercihlerini Ayarlar'dan yönet")}</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  readAll: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  row: {
    flexDirection: "row", alignItems: "flex-start", gap: 12, backgroundColor: C.surface,
    borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line,
  },
  rowUnread: { borderColor: C.pitchSoft, backgroundColor: "#FBFFFC", borderLeftWidth: 3, borderLeftColor: C.pitch },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.pitch, marginTop: 6 },
  empty: { alignItems: "center", padding: 32, marginTop: 20 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 16 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
