import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, Pressable } from "react-native";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { maskIban, ibanError } from "../data";

/* Alert.prompt yalnız iOS'ta var; bu modal her iki platformda aynı metin girişini sağlar.
   fields: [{ key, label?, placeholder?, initial?, kind?: "text" | "iban", multiline?, required?, minLength?, maxLength? }]
   onSubmit(values) → Promise ya da değer. `false` dönerse ya da hata fırlatırsa modal açık kalır, alanlar korunur.
   Not: IBAN kişisel veridir; bu bileşen hiçbir alanı loglamaz. */

const fieldError = (f, v) => {
  const s = String(v || "").trim();
  const bos = !s || (f.kind === "iban" && s.replace(/\s/g, "").toUpperCase() === "TR");
  if (bos) return f.required ? t("{p0} boş bırakılamaz", { p0: f.label || t("Bu alan") }) : null;
  if (f.kind === "iban") { const e = ibanError(s); return e ? t(e) : null; }
  if (f.minLength && s.length < f.minLength) return t("{p0} en az {p1} karakter olmalı", { p0: f.label || t("Metin"), p1: f.minLength });
  return null;
};

const ilkDeger = (f) => (f.kind === "iban" ? maskIban(f.initial || "") : String(f.initial ?? ""));

export default function TextPromptModal({ visible, title, message = "", fields = [], confirmText, cancelText, onSubmit, onClose }) {
  const [vals, setVals] = useState({});
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const busyRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    const v = {}; fields.forEach((f) => { v[f.key] = ilkDeger(f); });
    setVals(v); setTouched({}); setErr(null); setBusy(false); busyRef.current = false;
  }, [visible]); // fields açılışta okunur; açıkken yeniden kurulmaz

  const errors = {}; fields.forEach((f) => { errors[f.key] = fieldError(f, vals[f.key]); });
  const ilkHata = fields.map((f) => errors[f.key]).find(Boolean) || null;
  const pasif = busy || !!ilkHata;

  const kapat = () => { if (!busyRef.current && onClose) onClose(); };
  const kaydet = async () => {
    if (busyRef.current || ilkHata) return;           // çift dokunma kilidi
    busyRef.current = true; setBusy(true); setErr(null);
    const out = {};
    fields.forEach((f) => { const s = String(vals[f.key] || "").trim(); out[f.key] = f.kind === "iban" ? s.replace(/\s/g, "").toUpperCase() : s; });
    let ok = true;
    try { const r = await onSubmit(out); if (r === false) ok = false; }
    catch (e) { ok = false; setErr((e && e.message) || t("Kaydedilemedi — tekrar dener misin?")); }
    busyRef.current = false; setBusy(false);
    if (ok && onClose) onClose();
    else setErr((x) => x || t("Kaydedilemedi — tekrar dener misin?"));
  };

  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={kapat} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={st.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={kapat} accessibilityLabel={t("Kapat")} />
        <View style={st.card} accessibilityViewIsModal>
          <Text style={st.title} accessibilityRole="header">{title}</Text>
          {message ? <Text style={st.message}>{message}</Text> : null}
          {fields.map((f, i) => {
            const goster = touched[f.key] && errors[f.key];
            return (
              <View key={f.key} style={{ marginTop: i === 0 ? 14 : 10 }}>
                {f.label ? <Text style={st.label}>{f.label}</Text> : null}
                <TextInput
                  value={vals[f.key] ?? ""}
                  onChangeText={(v) => { setErr(null); setVals((o) => ({ ...o, [f.key]: f.kind === "iban" ? maskIban(v) : v })); }}
                  onBlur={() => setTouched((o) => ({ ...o, [f.key]: true }))}
                  placeholder={f.placeholder || (f.kind === "iban" ? "TR00 0000 0000 0000 0000 0000 00" : "")}
                  placeholderTextColor={C.placeholder}
                  autoFocus={i === 0}
                  editable={!busy}
                  multiline={!!f.multiline}
                  maxLength={f.kind === "iban" ? 32 : f.maxLength}
                  keyboardType={f.kind === "iban" ? (Platform.OS === "ios" ? "number-pad" : "numeric") : "default"}
                  autoCapitalize={f.kind === "iban" ? "characters" : f.autoCapitalize || "sentences"}
                  autoCorrect={f.kind !== "iban"}
                  returnKeyType={i === fields.length - 1 && !f.multiline ? "done" : "next"}
                  onSubmitEditing={i === fields.length - 1 && !f.multiline ? kaydet : undefined}
                  style={[st.input, f.multiline && { minHeight: 96, textAlignVertical: "top" }, goster && { borderColor: C.danger }]}
                />
                {goster ? <Text style={st.fieldErr}>{errors[f.key]}</Text> : null}
              </View>
            );
          })}
          {err ? <Text style={[st.fieldErr, { marginTop: 10 }]} accessibilityLiveRegion="polite">{err}</Text> : null}
          <View style={st.row}>
            <TouchableOpacity onPress={kapat} disabled={busy} style={[st.btn, st.btnGhost]} accessibilityRole="button">
              <Text style={[st.btnText, { color: C.faint }]}>{cancelText || t("Vazgeç")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={kaydet} disabled={pasif} style={[st.btn, { backgroundColor: pasif && !busy ? C.line : C.pitch }]}
              accessibilityRole="button" accessibilityState={{ disabled: pasif, busy }}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={[st.btnText, { color: pasif ? C.faint : "#fff" }]}>{confirmText || t("Kaydet")}</Text>}
            </TouchableOpacity>
          </View>
          {!busy && ilkHata && !fields.some((f) => touched[f.key] && errors[f.key]) ? <Text style={st.hint}>{ilkHata}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* Kullanım: const [promptEl, openPrompt] = usePrompt();  …  openPrompt({ title, fields, onSubmit });  JSX'te {promptEl}
   Öğe, çağıran ekranın ağacında çizilir (iç içe Modal'larda — ör. VenueSheet — doğru katmanda açılır). */
export function usePrompt() {
  const [cfg, setCfg] = useState(null);
  const open = useCallback((c) => setCfg(c), []);
  const el = <TextPromptModal visible={!!cfg} {...(cfg || {})} onClose={() => setCfg(null)} onSubmit={(v) => (cfg && cfg.onSubmit ? cfg.onSubmit(v) : undefined)} />;
  return [el, open];
}

const mkSt = () => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(11,26,20,0.55)", justifyContent: "center", padding: 20 },
  card: { backgroundColor: C.surface, borderRadius: 22, padding: 18, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  title: { fontSize: 17, fontWeight: "900", color: C.ink },
  message: { fontSize: 13.5, color: C.faint, marginTop: 6, lineHeight: 19 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase", color: C.faint, marginBottom: 5 },
  input: { backgroundColor: C.chalk, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: C.ink },
  fieldErr: { fontSize: 12, fontWeight: "700", color: C.danger, marginTop: 5 },
  hint: { fontSize: 12, color: C.faint, marginTop: 8, textAlign: "center" },
  row: { flexDirection: "row", gap: 10, marginTop: 16 },
  btn: { flex: 1, minHeight: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnGhost: { backgroundColor: C.chalk },
  btnText: { fontSize: 14.5, fontWeight: "900" },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
