import React from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar } from "../components";

export default function ChatsScreen({ chats, onOpen, onNew = null, onMute = null, onArchive = null, onHide = null }) {
  const [arsivAc, setArsivAc] = React.useState(false);
  const gorunur = chats.filter((c) => !c.hiddenAt || (c.lastRaw && c.lastRaw > c.hiddenAt));
  const arsivli = gorunur.filter((c) => c.archived);
  const liste = arsivAc ? arsivli : gorunur.filter((c) => !c.archived);
  const uzunBas = (c) => {
    if (!onMute && !onArchive && !onHide) return;
    const sec = [];
    if (onMute) sec.push({ text: c.muted ? "🔔 " + t("Sesi aç") : "🔕 " + t("Sessize al"), onPress: () => onMute(c) });
    if (onArchive) sec.push({ text: c.archived ? "📤 " + t("Arşivden çıkar") : "🗄 " + t("Arşivle"), onPress: () => onArchive(c) });
    if (onHide) sec.push({ text: "🗑 " + t("Benden kaldır"), style: "destructive", onPress: () =>
      Alert.alert(t("Benden kaldır"), t("Sohbet senin listenden silinir; karşı taraf etkilenmez. Yeni mesaj gelirse geri görünür."),
        [{ text: t("Vazgeç"), style: "cancel" }, { text: t("Kaldır"), style: "destructive", onPress: () => onHide(c) }]) });
    sec.push({ text: t("Vazgeç"), style: "cancel" });
    Alert.alert(c.title, "", sec);
  };
  return (
    <View style={{ flex: 1, backgroundColor: C.surface }}>
      <View style={st.header}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 19 }}>{t("Sohbetler")}</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={{ color: C.mist, fontSize: 12, flex: 1 }}>
            {t("Her etkinliğin kendi grubu var — tıpkı alıştığın gibi")}
          </Text>
          {onNew && (
            <TouchableOpacity onPress={onNew} style={{ backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 999, padding: 8 }}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {arsivli.length > 0 && (
        <TouchableOpacity onPress={() => setArsivAc((x) => !x)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line }}>
          <Ionicons name="archive-outline" size={17} color={C.turfText} />
          <Text style={{ fontSize: 13, fontWeight: "900", color: C.turfText, flex: 1 }}>
            {arsivAc ? t("Sohbetlere dön") : `${t("Arşiv")} (${arsivli.length})`}
          </Text>
        </TouchableOpacity>
      )}
      <FlatList
        data={liste}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: 110 }}
        renderItem={({ item: c }) => {
          const last = c.msgs[c.msgs.length - 1];
          const okunur = (m0) => (m0 && m0.indexOf("VOICE|") > -1 && m0.indexOf("VOICE|") < 7) ? "\u{1F399} " + t("Sesli mesaj") : m0;
          const preview =
            last?.from === "sys"
              ? last.text
              : last?.from === "approval"
              ? "Onay kartı gönderildi"
              : last?.name
              ? `${last.name.split(" ")[0]}: ${okunur(last.text)}`
              : okunur(last?.text) || "";
          return (
            <TouchableOpacity onPress={() => onOpen(c.id)} onLongPress={() => uzunBas(c)} delayLongPress={280} style={st.row}>
              {c.type === "grup" ? (
                <View style={st.groupIcon}>
                  {c.teamId ? <Text style={{ fontSize: 18 }}>🛡</Text> : <Ionicons name="people" size={20} color="#fff" />}
                </View>
              ) : (
                <Avatar name={c.title} size={44} />
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text numberOfLines={1} style={{ fontWeight: "800", fontSize: 14, color: C.ink, flex: 1 }}>
                    {c.title}{c.muted ? "  🔕" : ""}
                  </Text>
                  <Text style={{ fontSize: 11, color: c.unread ? C.pitch : C.faint, marginLeft: 8 }}>
                    {c.lastTime}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                  {last?.from === "me" && (
                    <Ionicons name="checkmark-done" size={14} color="#4FB6E0" style={{ marginRight: 3 }} />
                  )}
                  <Text numberOfLines={1} style={{ fontSize: 13, color: C.faint, flex: 1 }}>
                    {preview}
                  </Text>
                  {c.unread > 0 && (
                    <View style={st.unread}>
                      <Text style={{ color: "#fff", fontSize: 11, fontWeight: "900" }}>{c.unread}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.surface,
  },
  groupIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.turf,
    alignItems: "center", justifyContent: "center",
  },
  unread: {
    backgroundColor: C.pitch, borderRadius: 10, minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5, marginLeft: 6,
  },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
