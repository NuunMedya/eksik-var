import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { CATEGORIES, nextDates, TIMES, GUNLER_UZUN, fmtEventDate } from "../data";
import { ILLER, ilceleri } from "../trIlIlce";
import { Field, Input, Chip, PickerRow, PickerSheet } from "../components";

export default function CreateScreen({ user, onBack, onCreate, initial = null }) {
  const days = nextDates(14);
  const editing = !!initial;
  const [f, setF] = useState(() => initial ? {
    title: initial.title, cat: initial.cat, city: initial.city, district: initial.district || "", venue: initial.venue,
    dateISO: initial.dateISO || days[0].iso, weekday: initial.weekday != null ? initial.weekday : days[0].weekday, time: initial.time || "21:00",
    recurrence: initial.recurrence || "yok", weeks: 8,
    capacity: String(initial.capacity), needed: String(initial.needed), price: String(initial.price), level: initial.level, desc: initial.desc || "",
  } : {
    title: "", cat: 1, city: user.city || "Ankara", district: user.district || "", venue: "",
    dateISO: days[0].iso, weekday: days[0].weekday, time: "21:00",
    recurrence: "yok", weeks: 8,
    capacity: "14", needed: "2", price: "150", level: "Farketmez", desc: "",
  });
  const [picker, setPicker] = useState(null);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const tooMany = Number(f.needed) > Number(f.capacity);
  const valid =
    f.title.trim() && f.venue.trim() && f.district && f.dateISO && f.time && Number(f.needed) > 0 && !tooMany;

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
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>{editing ? "Etkinliği düzenle" : "Eksik talebi aç"}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>
            {editing ? "Değişiklikler kadroya duyurulur" : "30 saniyede yayında, grup sohbeti otomatik kurulur"}
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

        <Field label="Nerede?">
          <View style={{ gap: 8 }}>
            <PickerRow label="İl" value={f.city} onPress={() => setPicker("il")} />
            <PickerRow label="İlçe" value={f.district} placeholder="İlçe seç" onPress={() => setPicker("ilce")} />
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

      <PickerSheet
        visible={picker === "il"}
        title="İl seç"
        items={ILLER}
        value={f.city}
        onSelect={(c) => { setF((s) => ({ ...s, city: c, district: "" })); setPicker(null); }}
        onClose={() => setPicker(null)}
        placeholder="İl ara…"
      />
      <PickerSheet
        visible={picker === "ilce"}
        title={`${f.city} ilçeleri`}
        items={ilceleri(f.city)}
        value={f.district}
        onSelect={(d) => { set("district")(d); setPicker(null); }}
        onClose={() => setPicker(null)}
        placeholder="İlçe ara…"
      />

      <View style={st.bottomBar}>
        <TouchableOpacity
          disabled={!valid}
          onPress={() => onCreate(f)}
          style={[st.cta, { opacity: valid ? 1 : 0.45 }]}
        >
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
            {editing ? "Değişiklikleri kaydet" : "Talebi yayınla"} · {fmtEventDate(f.dateISO, f.time)}
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
