import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, FlatList, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, onThemeChange } from "./theme";
import { initials, avatarBg } from "./data";

/* ---------- Avatar ---------- */
export function Avatar({ name, uri, size = 40 }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.line }}
      />
    );
  }
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

/* ---------- Düzenlenebilir avatar (profil / kayıt) ---------- */
export function AvatarPicker({ name, uri, size = 76, onPress, light = false }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ alignSelf: "center" }}>
      <Avatar name={name} uri={uri} size={size} />
      <View style={[st.camBadge, light && { backgroundColor: C.surface, borderColor: C.turf }]}>
        <Ionicons name="camera" size={13} color={light ? C.turf : "#fff"} />
      </View>
    </TouchableOpacity>
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
  if (ev.kind === "rakip" && ev.status !== "iptal" && ev.status !== "tamamlandi")
    return (
      <View style={[st.badge, { backgroundColor: remaining > 0 ? C.kit : C.pitch }]}>
        <Text style={st.badgeText}>{remaining > 0 ? "🆚 Rakip arıyor" : ev.joined || ev.mine ? "Maç ayarlandı ✓" : "Rakip bulundu"}</Text>
      </View>
    );
  if (ev.status === "iptal")
    return (
      <View style={[st.badge, { backgroundColor: C.gray }]}>
        <Text style={st.badgeText}>İptal edildi</Text>
      </View>
    );
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
      placeholderTextColor={C.placeholder}
      {...props}
      style={[st.input, props.style]}
    />
  );
}

/* ---------- Türkçe küçük harf (İ→i, I→ı) ---------- */
export const trLower = (str) => String(str || "").replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();

/* ---------- Seçim satırı ("İl: Ankara ▾") ---------- */
export function PickerRow({ label, value, placeholder = "Seç", onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={st.pickerRow}>
      <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint, width: 44 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: value ? C.ink : "#9AA79F" }}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={16} color={C.faint} />
    </TouchableOpacity>
  );
}

/* ---------- Arama kutulu seçici (il / ilçe) ----------
   items: string[] ya da { label, sub }[] */
export function PickerSheet({ visible, title, items, value, onSelect, onClose, placeholder = "Ara…" }) {
  const [q, setQ] = useState("");
  const norm = (it) => (typeof it === "string" ? it : it.label);
  const list = items.filter((it) => trLower(norm(it)).includes(trLower(q)));
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: C.ink }}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={C.faint} /></TouchableOpacity>
          </View>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder={placeholder}
            placeholderTextColor={C.placeholder}
            autoCorrect={false}
            style={[st.input, { marginBottom: 8 }]}
          />
          <FlatList
            data={list}
            keyExtractor={(it) => norm(it)}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 380 }}
            renderItem={({ item }) => {
              const label = norm(item);
              const active = label === value;
              return (
                <TouchableOpacity
                  onPress={() => { onSelect(label); setQ(""); }}
                  style={[st.pickerItem, active && { backgroundColor: C.pitchSoft }]}
                >
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: active ? "800" : "600", color: active ? C.turf : C.ink }}>
                    {label}
                  </Text>
                  {typeof item !== "string" && item.sub ? (
                    <Text style={{ fontSize: 12, fontWeight: "700", color: C.pitch }}>{item.sub}</Text>
                  ) : null}
                  {active && <Ionicons name="checkmark" size={18} color={C.pitch} style={{ marginLeft: 8 }} />}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={<Text style={{ textAlign: "center", color: C.faint, padding: 20 }}>Sonuç yok</Text>}
          />
        </View>
      </View>
    </Modal>
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

const mkSt = () => StyleSheet.create({
  badge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 5 },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  fieldLabel: {
    fontSize: 11, fontWeight: "800", letterSpacing: 0.6,
    textTransform: "uppercase", color: C.faint, marginBottom: 5,
  },
  input: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.ink,
  },
  camBadge: {
    position: "absolute", right: -2, bottom: -2, width: 26, height: 26, borderRadius: 13,
    backgroundColor: C.kit, borderWidth: 2, borderColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  pickerRow: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(11,26,20,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 18, paddingBottom: 30, maxHeight: "80%",
  },
  pickerItem: {
    flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 10,
    borderRadius: 10, borderBottomWidth: 1, borderBottomColor: C.line,
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
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
