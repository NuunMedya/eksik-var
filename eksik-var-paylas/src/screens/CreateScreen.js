import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { CITIES, CATEGORIES, nextDates, TIMES, GUNLER_UZUN, fmtEventDate } from "../data";
import { Field, Input, Chip } from "../components";

export default function CreateScreen({ user, onBack, onCreate }) {
  const days = nextDates(14);
  const [f, setF] = useState({
    title: "", cat: 1, city: user.city || "Ankara", venue: "",
    dateISO: days[0].iso, weekday: days[0].weekday, time: "21:00",
    recurrence: "yok", weeks: 8,
    capacity: "14", needed: "2", price: "150", level: "Farketmez", desc: "",
  });
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const tooMany = Number(f.needed) > Number(f.capacity);
  const valid =
    f.title.trim() && f.venue.trim() && f.dateISO && f.time && Number(f.needed) > 0 && !tooMany;

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

        <Field label="Gün">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {days.map((d) => (
              <Chip
                key={d.iso}
                label={d.label}
                active={f.dateISO === d.iso}
                onPress={() => setF((s) => ({ ...s, dateISO: d.iso, weekday: d.weekday }))}
              />
            ))}
          </ScrollView>
        </Field>

        <Field label="Saat">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TIMES.map((t) => (
              <Chip key={t} label={t} active={f.time === t} onPress={() => set("time")(t)} />
            ))}
          </ScrollView>
        </Field>

        <Field label="Tekrar">
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            <Chip label="Tek seferlik" active={f.recurrence === "yok"} onPress={() => set("recurrence")("yok")} />
            <Chip label={`Her ${GUNLER_UZUN[f.weekday]}`} active={f.recurrence === "haftalik"} onPress={() => set("recurrence")("haftalik")} />
          </View>
          {f.recurrence === "haftalik" && (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                {[[4, "4 hafta"], [8, "8 hafta"], [12, "12 hafta"], [0, "Süresiz"]].map(([w, l]) => (
                  <Chip key={w} label={l} active={f.weeks === w} onPress={() => set("weeks")(w)} />
                ))}
              </View>
              <Text style={{ fontSize: 12, color: C.faint, marginTop: 8, lineHeight: 17 }}>
                Her {GUNLER_UZUN[f.weekday]} {f.time}{f.weeks ? ` · ${f.weeks} hafta` : " · süresiz"}. Her maç bitince
                bir sonraki hafta otomatik açılır; ekip grubu aynı kalır, yalnızca o haftanın eksikleri için başvuru alınır.
              </Text>
            </View>
          )}
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
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
            Talebi yayınla · {fmtEventDate(f.dateISO, f.time)}
          </Text>
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
