import React from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { Avatar } from "../components";

export default function ChatsScreen({ chats, onOpen }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={st.header}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 19 }}>Sohbetler</Text>
        <Text style={{ color: C.mist, fontSize: 12 }}>
          Her etkinliğin kendi grubu var — tıpkı alıştığın gibi
        </Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ paddingBottom: 110 }}
        renderItem={({ item: c }) => {
          const last = c.msgs[c.msgs.length - 1];
          const preview =
            last?.from === "sys"
              ? last.text
              : last?.from === "approval"
              ? "Onay kartı gönderildi"
              : last?.name
              ? `${last.name.split(" ")[0]}: ${last.text}`
              : last?.text || "";
          return (
            <TouchableOpacity onPress={() => onOpen(c.id)} style={st.row}>
              {c.type === "grup" ? (
                <View style={st.groupIcon}>
                  <Ionicons name="people" size={20} color="#fff" />
                </View>
              ) : (
                <Avatar name={c.title} size={44} />
              )}
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text numberOfLines={1} style={{ fontWeight: "800", fontSize: 14, color: C.ink, flex: 1 }}>
                    {c.title}
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

const st = StyleSheet.create({
  header: { backgroundColor: C.turf, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: "#fff",
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
