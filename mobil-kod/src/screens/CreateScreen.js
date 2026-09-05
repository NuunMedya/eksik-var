import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { CITIES, CATEGORIES } from "../data";
import { Field, Input, Chip } from "../components";

export default function CreateScreen({ user, onBack, onCreate }) {
  const [f, setF] = useState({
    title: "", cat: 1, city: user.city || "Ankara", venue: "",
    date: "", capacity: "14", needed: "2", price: "150", level: "Farketmez", desc: "",
  });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const tooMany = Number(f.needed) > Number(f.capacity);
  const valid =
    f.title.trim() && f.venue.trim() && f.date.trim() && Number(f.needed) > 0 && !tooMany;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.chalk }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>Eksik talebi aç</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>
            30 saniyede yayında, grup sohbeti otomatik kurulur
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Field label="Etkinlik başlığı">
          <Input placeholder="Örn: Perşembe Halı Saha" value={f.title} onChangeText={set("title")} />
        </Field>

        <Field label="Kategori">
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={`${c.icon} ${c.name}`}
                active={Number(f.cat) === c.id}
                onPress={() => setF((s) => ({ ...s, cat: c.id }))}
              />
            ))}
          </View>
        </Field>

        <Field label="İl">
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {CITIES.map((c) => (
              <Chip key={c} label={c} active={f.city === c} onPress={() => set("city")(c)} />
            ))}
          </View>
        </Field>

        <Field label="Saha / mekan">
          <Input placeholder="Örn: Yıldız Halı Saha, Çankaya" value={f.venue} onChangeText={set("venue")} />
        </Field>

        <Field label="Tarih & saat">
          <Input placeholder="Per · 21:00" value={f.date} onChangeText={set("date")} />
        </Field>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Toplam kadro">
              <Input keyboardType="number-pad" value={f.capacity} onChangeText={set("capacity")} />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Eksik sayısı">
              <Input keyboardType="number-pad" value={f.needed} onChangeText={set("needed")} />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Ücret (₺)">
              <Input keyboardType="number-pad" value={f.price} onChangeText={set("price")} />
            </Field>
          </View>
        </View>

        <Field label="Seviye">
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {["Farketmez", "Başlangıç", "Orta", "İleri"].map((l) => (
              <Chip key={l} label={l} active={f.level === l} onPress={() => set("level")(l)} />
            ))}
          </View>
        </Field>

        <Field label="Açıklama (isteğe bağlı)">
          <Input
            placeholder="Mevki, ödeme şekli, kurallar…"
            value={f.desc}
            onChangeText={set("desc")}
            multiline
            style={{ minHeight: 70, textAlignVertical: "top" }}
          />
        </Field>

        {tooMany && (
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.kit }}>
            Eksik sayısı toplam kadrodan büyük olamaz.
          </Text>
        )}
      </ScrollView>

      <View style={st.bottomBar}>
        <TouchableOpacity
          disabled={!valid}
          onPress={() => onCreate(f)}
          style={[st.cta, { opacity: valid ? 1 : 0.45 }]}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>Talebi yayınla</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header: {
    backgroundColor: C.turf, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.line, padding: 14,
  },
  cta: { backgroundColor: C.pitch, borderRadius: 14, alignItems: "center", paddingVertical: 14 },
});
