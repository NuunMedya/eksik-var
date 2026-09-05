import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, TextInput, Modal,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "./../theme";
import { openPositions, positionSlots } from "../data";

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
        <Text style={st.title}>{yedek ? "Yedek listesine gir" : rakip ? "Rakip teklifi gönder" : "Başvuru gönder"}</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={20} color={C.faint} />
        </TouchableOpacity>
      </View>
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
        multiline
        placeholder={rakip ? "Örn: 7 kişiyiz, saha sizde olur, ücrete varız" : "Örn: Kaleci lazımsa ben varım, 21:00'e yetişirim"}
        placeholderTextColor="#9AA79F"
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
        <Text style={st.title}>Zeynep Arslan'ı puanla</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={20} color={C.faint} />
        </TouchableOpacity>
      </View>
      <Text style={st.sub}>Cuma Halı Saha · organizatör</Text>
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
        multiline
        placeholder="İsteğe bağlı yorum: organizasyon, saha, dakiklik…"
        placeholderTextColor="#9AA79F"
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
        <Text style={st.ctaText}>Puanı gönder</Text>
      </TouchableOpacity>
    </SheetShell>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(11,26,20,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 34,
  },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6, color: C.turf, marginBottom: 8 },
  posChip: { borderWidth: 1, borderColor: C.line, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
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
});
