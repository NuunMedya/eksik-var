import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { Avatar } from "../components";

export default function RateScreen({ event, people, onBack, onSubmit }) {
  const [ratings, setRatings] = useState({}); // id -> { stars, comment }
  const set = (id, patch) => setRatings((r) => ({ ...r, [id]: { stars: 0, comment: "", ...(r[id] || {}), ...patch } }));
  const rated = Object.values(ratings).filter((r) => r.stars > 0).length;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.chalk }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>Takım arkadaşlarını puanla</Text>
          <Text style={{ color: C.mist, fontSize: 11 }} numberOfLines={1}>{event.title} · {event.date}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Text style={st.note}>
          Puanlar adınla görünür ve kişinin ortalamasına işlenir. Yalnızca birlikte oynadığın kişileri puanlayabilirsin;
          dilediğini boş bırakabilirsin.
        </Text>
        {people.map((p) => {
          const r = ratings[p.id] || { stars: 0, comment: "" };
          return (
            <View key={p.id} style={st.card}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Avatar name={p.name} uri={p.avatar} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }}>{p.name}</Text>
                  <Text style={{ fontSize: 11, color: C.faint }}>
                    {p.role === "organizator" ? "Organizatör" : "Kadro"} · şu an ★ {p.rating} ({p.count})
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "center", gap: 10, marginTop: 10 }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity key={i} onPress={() => set(p.id, { stars: i })} hitSlop={8}>
                    <Ionicons name={i <= r.stars ? "star" : "star-outline"} size={30} color={i <= r.stars ? C.star : "#C9C4B8"} />
                  </TouchableOpacity>
                ))}
              </View>
              {r.stars > 0 && (
                <TextInput
                  value={r.comment}
                  onChangeText={(t) => set(p.id, { comment: t })}
                  placeholder="Yorum (isteğe bağlı): dakiklik, oyun, saygı…"
                  placeholderTextColor="#9AA79F"
                  style={st.input}
                />
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={st.bottomBar}>
        <TouchableOpacity disabled={rated === 0} onPress={() => onSubmit(ratings)} style={[st.cta, rated === 0 && { opacity: 0.45 }]}>
          <Ionicons name="star" size={16} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
            {rated === 0 ? "Puan vermek için yıldızlara dokun" : `${rated} puanı gönder`}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  note: { fontSize: 12, color: C.faint, lineHeight: 17, marginBottom: 12 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.line },
  input: { marginTop: 10, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.ink },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.line, padding: 14 },
  cta: { backgroundColor: C.turf, borderRadius: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14 },
});
