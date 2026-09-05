import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "./../theme";
import { openPositions, positionSlots, POLL_TEMPLATES } from "../data";

function SheetShell({ visible, onClose, children }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={st.backdrop}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>{children}</View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------- Başvuru ---------- */
export function ApplySheet({ visible, ev, onClose, onSend, myPositions = [], mode = "basvuru" }) {
  const [note, setNote] = useState("");
  const [position, setPosition] = useState(null);
  if (!ev) return null;
  const yedek = mode === "yedek";
  const rakip = ev.kind === "rakip";
  const slots = yedek ? positionSlots(ev) : openPositions(ev);
  const hasChoice = !rakip && slots.length > 0 && !(slots.length === 1 && slots[0].id === "farketmez");
  const chosen = position || (slots.find((s) => myPositions.includes(s.id)) || slots[0] || {}).id || null;
  return (
    <SheetShell visible={visible} onClose={onClose}>
      <View style={st.headRow}>
        <View style={{ flex: 1 }}>
          <Text style={st.title}>{yedek ? "Yedek listesine gir" : rakip ? "Rakip teklifi gönder" : "Başvuru gönder"}</Text>
          {!yedek && !rakip && <Text style={{ fontSize: 11, color: C.faint, marginTop: 2 }}>Organizatör onaylar, son sözü sen söylersin; iki onayla yerin kesinleşir.</Text>}
        </View>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={20} color={C.faint} />
        </TouchableOpacity>
      </View>
      {!yedek && !rakip && (
        <View style={{ marginTop: 10 }}>
          <Text style={st.label}>{t("HAZIR CÜMLE")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {[chosen === "kaleci" ? "Kaleye geçerim, eldiven bende 🧤" : "Ben varım, saatinde oradayım 👍", "İlk kez geliyorum, tempoya ayak uydururum", "Arabam var, yol üstünden alabilirim"].map((tx) => (
              <TouchableOpacity key={tx} onPress={() => setNote(tx)} style={st.posChip}><Text style={{ fontSize: 12, fontWeight: "700", color: C.ink }}>{tx}</Text></TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      {hasChoice && (
        <View style={{ marginTop: 10 }}>
          <Text style={st.label}>{yedek ? "HANGİ MEVKİ İÇİN BEKLEYECEKSİN?" : "HANGİ MEVKİYE GELİYORSUN?"}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {slots.map((sl) => (
              <TouchableOpacity key={sl.id} onPress={() => setPosition(sl.id)}
                style={[st.posChip, chosen === sl.id && { backgroundColor: C.turf, borderColor: C.turf }]}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: chosen === sl.id ? "#fff" : C.ink }}>
                  {sl.icon} {sl.label} · {yedek ? `${sl.filled}/${sl.quota}` : `${sl.quota - sl.filled} yer`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      <Text style={st.sub}>
        {yedek ? "Yer açılınca sıradaki yedeğe 2 saatlik onay teklifi gider; onaylarsan yerin kesinleşir."
               : `${ev.org?.name} başvurunu görecek ve seninle birebir sohbet açılacak.`}
      </Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        maxLength={200}
        multiline
        placeholder={rakip ? "Örn: 7 kişiyiz, saha sizde olur, ücrete varız" : "Örn: Kaleci lazımsa ben varım, 21:00'e yetişirim"}
        placeholderTextColor={C.placeholder}
        style={st.textarea}
      />
      <TouchableOpacity
        style={st.cta}
        onPress={() => {
          onSend(note.trim() || (rakip ? "Rakip olmak isteriz, detayları konuşalım." : "Merhaba, ben varım! Detayları konuşabilir miyiz?"), hasChoice ? chosen : null);
          setNote(""); setPosition(null);
        }}
      >
        <Ionicons name={yedek ? "hourglass-outline" : "send"} size={14} color="#fff" />
        <Text style={st.ctaText}>{yedek ? "Yedek ol" : rakip ? "Teklif gönder" : "Başvuruyu gönder"}</Text>
      </TouchableOpacity>
    </SheetShell>
  );
}

/* ---------- Puanlama ---------- */
export function RateSheet({ visible, onClose, onSubmit }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  return (
    <SheetShell visible={visible} onClose={onClose}>
      <View style={st.headRow}>
        <Text style={st.title}>{t("Zeynep Arslan'ı puanla")}</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={20} color={C.faint} />
        </TouchableOpacity>
      </View>
      <Text style={st.sub}>{t("Cuma Halı Saha · organizatör")}</Text>
      <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginVertical: 16 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <TouchableOpacity key={i} onPress={() => setStars(i)}>
            <Ionicons
              name={i <= stars ? "star" : "star-outline"}
              size={34}
              color={i <= stars ? C.star : "#C9C4B8"}
            />
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        value={comment}
        onChangeText={setComment}
        maxLength={200}
        multiline
        placeholder={t("İsteğe bağlı yorum: organizasyon, saha, dakiklik…")}
        placeholderTextColor={C.placeholder}
        style={[st.textarea, { minHeight: 60 }]}
      />
      <TouchableOpacity
        disabled={stars === 0}
        style={[st.cta, { opacity: stars > 0 ? 1 : 0.45 }]}
        onPress={() => {
          onSubmit(stars, comment);
          setStars(0);
          setComment("");
        }}
      >
        <Text style={st.ctaText}>{t("Puanı gönder")}</Text>
      </TouchableOpacity>
    </SheetShell>
  );
}

const mkSt = () => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(11,26,20,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 34,
  },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6, color: C.turfText, marginBottom: 8 },
  posChip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
  title: { fontSize: 17, fontWeight: "900", color: C.ink },
  sub: { fontSize: 13, color: C.faint, marginTop: 3 },
  textarea: {
    borderWidth: 1, borderColor: C.line, borderRadius: 12, padding: 12,
    fontSize: 14, color: C.ink, minHeight: 80, textAlignVertical: "top", marginTop: 12,
  },
  cta: {
    backgroundColor: C.pitch, borderRadius: 12, marginTop: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 13,
  },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.ink, marginTop: 4 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });

/* ---------- Anket oluştur ---------- */
export function OfferSheet({ visible, kisi, onClose, onSend }) {
  const [metin, setMetin] = React.useState("");
  React.useEffect(() => { if (visible) setMetin(""); }, [visible]);
  if (!visible) return null;
  const ad = ((kisi && kisi.name) || "").split(" ")[0];
  const sablon = t("Merhaba {p0}! Kadromuzda eksik var, seni maçımızda görmek isteriz — detayları konuşalım mı?", { p0: ad });
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <TouchableOpacity style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={{ backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 34 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 22 }}>{"\u{1F48C}"}</Text>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: "900", color: C.ink }}>{t("{p0} için davet", { p0: ad })}</Text>
          </View>
          <Text style={{ fontSize: 12.5, color: C.faint, marginBottom: 10 }}>{t("Maç, yer, ücret gibi detayları kendi cümlelerinle yaz — boş bırakırsan nazik bir davet bizden gider.")}</Text>
          <TextInput value={metin} onChangeText={setMetin} multiline placeholder={sablon}
            placeholderTextColor={C.placeholder} maxLength={300}
            style={{ minHeight: 120, textAlignVertical: "top", backgroundColor: C.chalk, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, fontSize: 14.5, color: C.ink, lineHeight: 21 }} />
          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <TouchableOpacity onPress={onClose} style={{ flex: 1, backgroundColor: C.chalk, borderRadius: 14, paddingVertical: 13, alignItems: "center" }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: C.faint }}>{t("Vazgeç")}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSend((metin || "").trim() || sablon)} style={{ flex: 1.4, backgroundColor: C.kit, borderRadius: 14, paddingVertical: 13, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6 }}>
              <Text style={{ fontSize: 14 }}>{"\u{1F48C}"}</Text>
              <Text style={{ fontSize: 14, fontWeight: "900", color: "#fff" }}>{t("Daveti gönder")}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function PollSheet({ visible, onClose, onSend }) {
  const [q, setQ] = useState("");
  const [opts, setOpts] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const apply = (tp) => { setQ(t(tp.q)); setOpts(tp.options.map((o) => t(o))); setMultiple(!!tp.multiple); };
  const setOpt = (i, v) => setOpts((o) => o.map((x, k) => (k === i ? v : x)));
  const clean = opts.map((o) => o.trim()).filter(Boolean);
  const valid = q.trim().length > 0 && clean.length >= 2;
  const reset = () => { setQ(""); setOpts(["", ""]); setMultiple(false); };
  return (
    <SheetShell visible={visible} onClose={() => { reset(); onClose(); }}>
      <View style={st.headRow}>
        <Text style={st.title}>{t("Anket oluştur")}</Text>
        <TouchableOpacity onPress={() => { reset(); onClose(); }}><Ionicons name="close" size={20} color={C.faint} /></TouchableOpacity>
      </View>
      <Text style={[st.label, { marginTop: 10 }]}>{t("HAZIR ŞABLON")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {POLL_TEMPLATES.map((tp) => (
          <TouchableOpacity key={tp.label} onPress={() => apply(tp)} style={st.posChip}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.ink }}>{t(tp.label)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[st.label, { marginTop: 14 }]}>{t("SORU")}</Text>
      <TextInput value={q} onChangeText={setQ} maxLength={200} placeholder={t("Örn: Bu hafta hangi gün?")} placeholderTextColor={C.placeholder} style={st.input} />
      <Text style={[st.label, { marginTop: 12 }]}>{t("SEÇENEKLER")}</Text>
      {opts.map((o, i) => (
        <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <TextInput value={o} onChangeText={(v) => setOpt(i, v)} maxLength={40} placeholder={`Seçenek ${i + 1}`} placeholderTextColor={C.placeholder} style={[st.input, { flex: 1, marginTop: 0 }]} />
          {opts.length > 2 && (
            <TouchableOpacity onPress={() => setOpts((x) => x.filter((_, k) => k !== i))}><Ionicons name="remove-circle-outline" size={22} color={C.faint} /></TouchableOpacity>
          )}
        </View>
      ))}
      {opts.length < 5 && (
        <TouchableOpacity onPress={() => setOpts((x) => [...x, ""])} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Ionicons name="add-circle-outline" size={18} color={C.pitch} />
          <Text style={{ fontSize: 13, fontWeight: "800", color: C.pitch }}>{t("Seçenek ekle")}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => setMultiple((m) => !m)} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
        <Ionicons name={multiple ? "checkbox" : "square-outline"} size={22} color={multiple ? C.pitch : C.faint} />
        <Text style={{ fontSize: 13, color: C.ink }}>{t("Birden fazla seçenek işaretlenebilsin")}</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={!valid} onPress={() => { onSend(q.trim(), clean, multiple); reset(); }} style={[st.cta, !valid && { opacity: 0.45 }]}>
        <Text style={st.ctaText}>{t("Anketi gönder")}</Text>
      </TouchableOpacity>
    </SheetShell>
  );
}
