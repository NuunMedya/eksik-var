import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { ILLER, ilceleri } from "../trIlIlce";
import { LEVELS } from "../data";
import { Field, Input, Chip, PickerRow, PickerSheet } from "../components";

export default function EditProfileScreen({ user, onBack, onSave, busy = false, error = null }) {
  const [f, setF] = useState({ name: user.name || "", username: user.username || "", city: user.city || "Ankara", district: user.district || "", level: user.level || "Farketmez", bio: user.bio || "" });
  const [picker, setPicker] = useState(null);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const uname = f.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const valid = f.name.trim().length >= 2 && uname.length >= 3;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.chalk }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>Profili düzenle</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <Field label="Ad Soyad"><Input value={f.name} onChangeText={set("name")} placeholder="Ad Soyad" /></Field>
        <Field label="Kullanıcı adı">
          <Input value={f.username} onChangeText={set("username")} autoCapitalize="none" placeholder="kullanici_adi" />
          <Text style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>Küçük harf, rakam ve alt çizgi; en az 3 karakter. Görünecek: @{uname || "…"}</Text>
        </Field>
        <Field label="Nerede oynuyorsun?">
          <View style={{ gap: 8 }}>
            <PickerRow label="İl" value={f.city} onPress={() => setPicker("il")} />
            <PickerRow label="İlçe" value={f.district} placeholder="İlçe seç" onPress={() => setPicker("ilce")} />
          </View>
        </Field>
        <Field label="Seviyen">
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {LEVELS.map((l) => <Chip key={l} label={l} active={f.level === l} onPress={() => set("level")(l)} />)}
          </View>
        </Field>
        <Field label="Kısa tanıtım (isteğe bağlı)">
          <Input value={f.bio} onChangeText={set("bio")} placeholder="Örn: 10 yıldır halı saha, kaleye de geçerim" multiline maxLength={140} style={{ minHeight: 70, textAlignVertical: "top" }} />
        </Field>
        {error ? <Text style={{ color: C.kit, fontWeight: "700", fontSize: 12, textAlign: "center" }}>{error}</Text> : null}
      </ScrollView>
      <View style={st.bottomBar}>
        <TouchableOpacity disabled={!valid || busy} onPress={() => onSave({ ...f, name: f.name.trim(), username: uname, bio: f.bio.trim() })} style={[st.cta, (!valid || busy) && { opacity: 0.45 }]}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{busy ? "Kaydediliyor…" : "Kaydet"}</Text>
        </TouchableOpacity>
      </View>
      <PickerSheet visible={picker === "il"} title="İl seç" items={ILLER} value={f.city} onSelect={(c) => { setF((s) => ({ ...s, city: c, district: "" })); setPicker(null); }} onClose={() => setPicker(null)} placeholder="İl ara…" />
      <PickerSheet visible={picker === "ilce"} title={`${f.city} ilçeleri`} items={ilceleri(f.city)} value={f.district} onSelect={(d) => { set("district")(d); setPicker(null); }} onClose={() => setPicker(null)} placeholder="İlçe ara…" />
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.line, padding: 14 },
  cta: { backgroundColor: C.pitch, borderRadius: 14, alignItems: "center", paddingVertical: 14 },
});
