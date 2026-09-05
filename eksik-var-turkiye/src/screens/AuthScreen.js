import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Image,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { C } from "../theme";
import { ILLER, ilceleri } from "../trIlIlce";
import { Field, Input, PickerRow, PickerSheet } from "../components";

export default function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [f, setF] = useState({ name: "", username: "", phone: "", pass: "", city: "Ankara", district: "" });
  const [picker, setPicker] = useState(null); // "il" | "ilce" | null
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.turf }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 28 }}>
          <Image
            source={require("../../assets/logo-mark.png")}
            style={{ width: 170, height: 170 }}
            resizeMode="contain"
          />
          <Text style={{ color: C.mist, marginTop: 4, fontSize: 14, fontWeight: "600" }}>
            Kadron eksik kalmasın.
          </Text>
        </View>

        <View style={st.card}>
          <View style={st.tabs}>
            {[["login", "Giriş yap"], ["register", "Kayıt ol"]].map(([m, label]) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[st.tabBtn, mode === m && { backgroundColor: C.turf }]}
              >
                <Text style={{ fontWeight: "800", fontSize: 13, color: mode === m ? "#fff" : C.faint }}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {mode === "register" && (
            <>
              <Field label="Ad Soyad">
                <Input placeholder="Emre Kaya" value={f.name} onChangeText={set("name")} />
              </Field>
              <Field label="Kullanıcı adı">
                <Input placeholder="emre_k" autoCapitalize="none" value={f.username} onChangeText={set("username")} />
              </Field>
              <Field label="Nerede oynuyorsun?">
                <View style={{ gap: 8 }}>
                  <PickerRow label="İl" value={f.city} onPress={() => setPicker("il")} />
                  <PickerRow label="İlçe" value={f.district} placeholder="İlçeni seç (isteğe bağlı)" onPress={() => setPicker("ilce")} />
                </View>
              </Field>
            </>
          )}

          <Field label="Telefon">
            <Input placeholder="05xx xxx xx xx" keyboardType="phone-pad" value={f.phone} onChangeText={set("phone")} />
          </Field>
          <Field label="Şifre">
            <Input placeholder="••••••••" secureTextEntry value={f.pass} onChangeText={set("pass")} />
          </Field>

          <TouchableOpacity
            style={st.cta}
            onPress={() =>
              onLogin({
                name: f.name.trim() || "Emre Kaya",
                username: f.username.trim() || "emre_k",
                city: f.city,
                district: f.district || null,
              })
            }
          >
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
              {mode === "login" ? "Giriş yap" : "Kayıt ol ve başla"}
            </Text>
          </TouchableOpacity>
          <Text style={st.hint}>Demo sürümü — bilgiler kaydedilmez, dilediğinle gir.</Text>
        </View>
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
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  logo: { fontSize: 34, fontWeight: "900", fontStyle: "italic", color: "#fff", letterSpacing: -1 },
  card: { backgroundColor: "#fff", borderRadius: 24, padding: 20 },
  tabs: { flexDirection: "row", backgroundColor: C.chalk, borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9 },
  cta: {
    backgroundColor: C.pitch, borderRadius: 12,
    alignItems: "center", paddingVertical: 13, marginTop: 4,
  },
  hint: { textAlign: "center", color: C.faint, fontSize: 11, marginTop: 10 },
});
