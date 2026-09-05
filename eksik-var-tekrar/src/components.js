import React from "react";
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "./theme";
import { initials, avatarBg } from "./data";

/* ---------- Avatar ---------- */
export function Avatar({ name, size = 40 }) {
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: avatarBg(name),
        alignItems: "center", justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "800", fontSize: size * 0.36 }}>
        {initials(name)}
      </Text>
    </View>
  );
}

/* ---------- Yıldızlar ---------- */
export function Stars({ value, size = 13 }) {
  return (
    <View style={{ flexDirection: "row", gap: 1 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= Math.round(value) ? "star" : "star-outline"}
          size={size}
          color={i <= Math.round(value) ? C.star : "#C9C4B8"}
        />
      ))}
    </View>
  );
}

/* ---------- İmza öğe: kadro dizilimi ----------
   koyu: mevcut ekip · yeşil: uygulamadan katılan · kesikli: eksik */
export function SquadDots({ capacity, needed, filled, size = 9 }) {
  const base = capacity - needed;
  const dots = [];
  for (let i = 0; i < capacity; i++) {
    let s;
    if (i < base) s = { backgroundColor: C.turf };
    else if (i < base + filled) s = { backgroundColor: C.pitch };
    else s = { borderWidth: 1.5, borderStyle: "dashed", borderColor: C.kit };
    dots.push(
      <View key={i} style={[{ width: size, height: size, borderRadius: size / 2 }, s]} />
    );
  }
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>{dots}</View>;
}

/* ---------- Eksik rozeti ---------- */
export function EksikBadge({ ev }) {
  const remaining = ev.needed - ev.filled;
  if (ev.status === "tamamlandi")
    return (
      <View style={[st.badge, { backgroundColor: C.turf }]}>
        <Text style={st.badgeText}>Tamamlandı ✓</Text>
      </View>
    );
  if (ev.ended)
    return (
      <View style={[st.badge, { backgroundColor: C.kit }]}>
        <Text style={st.badgeText}>Yoklama bekliyor</Text>
      </View>
    );
  if (ev.joined)
    return (
      <View style={[st.badge, { backgroundColor: C.pitch }]}>
        <Text style={st.badgeText}>Kadrodasın ✓</Text>
      </View>
    );
  if (ev.status === "doldu" || remaining <= 0)
    return (
      <View style={[st.badge, { backgroundColor: C.turf }]}>
        <Text style={st.badgeText}>Kadro tamam</Text>
      </View>
    );
  return (
    <View style={[st.badge, { backgroundColor: C.kit, flexDirection: "row", alignItems: "center", gap: 4 }]}>
      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>{remaining}</Text>
      <Text style={st.badgeText}>eksik</Text>
    </View>
  );
}

/* ---------- Filtre çipi ---------- */
export function Chip({ active, label, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
        borderWidth: 1, marginRight: 8,
        backgroundColor: active ? C.turf : "#fff",
        borderColor: active ? C.turf : C.line,
      }}
    >
      <Text style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : C.ink }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ---------- Form alanı ---------- */
export function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={st.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

export function Input(props) {
  return (
    <TextInput
      placeholderTextColor="#9AA79F"
      {...props}
      style={[st.input, props.style]}
    />
  );
}

/* ---------- Bildirim (toast) ---------- */
export function Toast({ text }) {
  if (!text) return null;
  return (
    <View style={st.toastWrap} pointerEvents="none">
      <View style={st.toast}>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{text}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  fieldLabel: {
    fontSize: 11, fontWeight: "800", letterSpacing: 0.6,
    textTransform: "uppercase", color: C.faint, marginBottom: 5,
  },
  input: {
    backgroundColor: "#fff", borderWidth: 1, borderColor: C.line,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.ink,
  },
  toastWrap: {
    position: "absolute", bottom: 96, left: 0, right: 0,
    alignItems: "center", zIndex: 50,
  },
  toast: {
    backgroundColor: C.ink, borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 9,
    shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
});
