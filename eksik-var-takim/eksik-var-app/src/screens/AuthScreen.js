import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Image, Linking,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { ILLER, ilceleri } from "../trIlIlce";
import { normalizePhone, formatPhone } from "../data";
import { Field, Input, PickerRow, PickerSheet, AvatarPicker } from "../components";
import { chooseAvatar } from "../avatar";

/* Akış: (kayıt: profil bilgileri +) telefon → "Kod gönder" → 6 haneli kod → "Doğrula"
   onSendCode(payload) ve onVerify(code, payload) Promise döndürür; hata olursa error prop'u dolar. */
export default function AuthScreen({ onSendCode, onVerify, busy = false, error = null, demoHint = null }) {
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState("form"); // form | code
  const [f, setF] = useState({ name: "", username: "", phone: "", city: "Ankara", district: "", avatar: null });
  const [code, setCode] = useState("");
  const [picker, setPicker] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [localError, setLocalError] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const timer = useRef(null);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const open = (url) => Linking.openURL(url).catch(() => {});
  const e164 = normalizePhone(f.phone);
  const payload = () => ({ mode, phone: e164, name: f.name.trim(), username: f.username.trim(), city: f.city, district: f.district || null, avatar: f.avatar });

  useEffect(() => () => timer.current && clearInterval(timer.current), []);
  const startCooldown = () => {
    setCooldown(60);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => setCooldown((c) => { if (c <= 1) { clearInterval(timer.current); return 0; } return c - 1; }), 1000);
  };

  const sendCode = async () => {
    setLocalError(null);
    if (!e164) { setLocalError("Geçerli bir Türkiye cep numarası gir (05xx xxx xx xx)"); return; }
    if (mode === "register") {
      if (!f.name.trim() || !f.username.trim()) { setLocalError("Ad soyad ve kullanıcı adı gerekli"); return; }
      if (!agreed) { setLocalError("Devam etmek için şartları kabul etmelisin"); return; }
    }
    const ok = await onSendCode(payload());
    if (ok) { setStep("code"); setCode(""); startCooldown(); }
  };
  const verify = async () => {
    setLocalError(null);
    if (code.length < 6) { setLocalError("6 haneli kodu gir"); return; }
    await onVerify(code, payload());
  };
  const shownError = localError || error;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.turf }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={st.wrap} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginBottom: 20 }}>
          <Image source={require("../../assets/logo-mark.png")} style={{ width: 150, height: 150 }} resizeMode="contain" />
          <Text style={{ color: C.mist, marginTop: 2, fontSize: 14, fontWeight: "600" }}>{t("auth.tagline")}</Text>
        </View>

        <View style={st.card}>
          {step === "form" ? (
            <>
              <View style={st.tabs}>
                {[["login", t("auth.login")], ["register", t("auth.register")]].map(([m, label]) => (
                  <TouchableOpacity key={m} onPress={() => { setMode(m); setLocalError(null); }} style={[st.tabBtn, mode === m && { backgroundColor: C.turf }]}>
                    <Text style={{ fontWeight: "800", fontSize: 13, color: mode === m ? "#fff" : C.faint }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {mode === "register" && (
                <>
                  <View style={{ alignItems: "center", marginBottom: 14 }}>
                    <AvatarPicker name={f.name || "?"} uri={f.avatar} size={72} onPress={() => chooseAvatar(f.avatar, (u) => set("avatar")(u))} />
                    <Text style={{ fontSize: 11, color: C.faint, marginTop: 6 }}>{f.avatar ? "Fotoğrafını değiştirmek için dokun" : "Fotoğraf ekle (isteğe bağlı)"}</Text>
                  </View>
                  <Field label={t("auth.name")}><Input placeholder={t("Emre Kaya")} value={f.name} onChangeText={set("name")} /></Field>
                  <Field label={t("auth.username")}><Input placeholder={t("emre_k")} autoCapitalize="none" value={f.username} onChangeText={set("username")} /></Field>
                  <Field label={t("auth.where")}>
                    <View style={{ gap: 8 }}>
                      <PickerRow label={t("İl")} value={f.city} onPress={() => setPicker("il")} />
                      <PickerRow label={t("İlçe")} value={f.district} placeholder={t("İlçeni seç (isteğe bağlı)")} onPress={() => setPicker("ilce")} />
                    </View>
                  </Field>
                </>
              )}

              <Field label={t("auth.phone")}>
                <Input placeholder={t("05xx xxx xx xx")} keyboardType="phone-pad" textContentType="telephoneNumber" value={f.phone} onChangeText={set("phone")} />
                <Text style={{ fontSize: 11, color: C.faint, marginTop: 5 }}>
                  {t("auth.phoneHint")}
                </Text>
              </Field>

              {mode === "register" && (
                <TouchableOpacity onPress={() => setAgreed((a) => !a)} style={st.agreeRow} activeOpacity={0.8}>
                  <Ionicons name={agreed ? "checkbox" : "square-outline"} size={22} color={agreed ? C.pitch : C.faint} />
                  <Text style={st.agreeText}>
                    <Text style={st.link} onPress={() => open("https://eksikvar.app/kullanim-sartlari")}>Kullanım Şartları</Text>
                    {"'nı ve "}
                    <Text style={st.link} onPress={() => open("https://eksikvar.app/gizlilik")}>Gizlilik Politikası</Text>
                    {"'nı okudum, kabul ediyorum."}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={[st.cta, busy && { opacity: 0.5 }]} disabled={busy} onPress={sendCode}>
                <Ionicons name="chatbox-ellipses-outline" size={16} color="#fff" />
                <Text style={st.ctaText}>{busy ? t("auth.sending") : t("auth.sendCode")}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 17, fontWeight: "900", color: C.ink }}>{t("auth.enterCode")}</Text>
              <Text style={{ fontSize: 13, color: C.faint, marginTop: 4, lineHeight: 18 }}>
                {formatPhone(e164)} {t("auth.codeSent")}
              </Text>
              <Input
                placeholder="• • • • • •"
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
                style={{ marginTop: 14, fontSize: 26, letterSpacing: 10, textAlign: "center", fontWeight: "800" }}
                autoFocus
              />
              {demoHint ? <Text style={{ textAlign: "center", fontSize: 12, color: C.kit, fontWeight: "700", marginTop: 8 }}>{demoHint}</Text> : null}
              <TouchableOpacity style={[st.cta, (busy || code.length < 6) && { opacity: 0.5 }]} disabled={busy || code.length < 6} onPress={verify}>
                <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
                <Text style={st.ctaText}>{busy ? t("auth.verifying") : mode === "register" ? t("auth.verifyRegister") : t("auth.verifyLogin")}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
                <TouchableOpacity onPress={() => { setStep("form"); setLocalError(null); }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.faint }}>{t("auth.changeNumber")}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={cooldown > 0 || busy} onPress={sendCode}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: cooldown > 0 ? C.faint : C.pitch }}>
                    {cooldown > 0 ? `${t("auth.resendIn")} (${cooldown})` : t("auth.resend")}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {shownError ? <Text style={st.error}>{shownError}</Text> : null}
        </View>
      </ScrollView>

      <PickerSheet visible={picker === "il"} title={t("İl seç")} items={ILLER} value={f.city}
        onSelect={(c) => { setF((s) => ({ ...s, city: c, district: "" })); setPicker(null); }} onClose={() => setPicker(null)} placeholder={t("İl ara…")} />
      <PickerSheet visible={picker === "ilce"} title={`${f.city} ilçeleri`} items={ilceleri(f.city)} value={f.district}
        onSelect={(d) => { set("district")(d); setPicker(null); }} onClose={() => setPicker(null)} placeholder={t("İlçe ara…")} />
    </KeyboardAvoidingView>
  );
}

const mkSt = () => StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: "center", padding: 24 },
  card: { backgroundColor: C.surface, borderRadius: 24, padding: 20 },
  tabs: { flexDirection: "row", backgroundColor: C.chalk, borderRadius: 12, padding: 4, marginBottom: 16 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9 },
  cta: { backgroundColor: C.pitch, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13, marginTop: 6 },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  agreeRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10, marginTop: 2 },
  agreeText: { flex: 1, fontSize: 12, color: C.ink, lineHeight: 17 },
  link: { color: C.pitch, fontWeight: "800", textDecorationLine: "underline" },
  error: { textAlign: "center", color: C.kit, fontSize: 12, fontWeight: "700", marginTop: 10 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
