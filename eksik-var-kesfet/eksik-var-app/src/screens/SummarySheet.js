import React from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { EksikBadge } from "../components";

// Pazartesi özeti: geçen hafta + rozet ilerlemesi + bu haftanın programı.
// digest: buildWeeklyDigest çıktısı (badges.js)
export default function SummarySheet({ digest, onClose, onOpenEvent = () => {}, onShare = () => {} }) {
  const d = digest || { matches: 0, goals: 0, assists: 0, mvp: false, upcoming: [], next: null, earned: 0, total: 0 };
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: C.ink }}>📬 {t("Haftalık özet")}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={22} color={C.faint} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
            {/* geçen hafta */}
            <Text style={st.section}>{t("GEÇEN HAFTA")}</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { top: String(d.matches), label: t("maç") },
                { top: String(d.goals), label: t("gol") },
                { top: String(d.assists), label: t("asist") },
              ].map((s, i) => (
                <View key={i} style={st.statBox}>
                  <Text style={{ fontSize: 19, fontWeight: "900", color: C.turfText }}>{s.top}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: C.faint }}>{s.label}</Text>
                </View>
              ))}
            </View>
            {d.mvp && (
              <View style={st.mvpRow}>
                <Text style={{ fontSize: 14 }}>🏆</Text>
                <Text style={{ fontSize: 13, fontWeight: "800", color: C.ink, flex: 1 }}>{t("Bu hafta MVP seçildin — tebrikler!")}</Text>
              </View>
            )}

            {/* rozet ilerlemesi */}
            <Text style={st.section}>{t("Rozet ilerlemen")}</Text>
            <View style={st.badgeCard}>
              <Text style={{ fontSize: 13, fontWeight: "800", color: C.ink }}>
                🎖 {t("{p0}/{p1} rozet", { p0: d.earned, p1: d.total })}
              </Text>
              {d.next && (
                <>
                  <Text style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>
                    {t("Sıradaki")}: {d.next.icon} {t(d.next.title)} · {d.next.value}/{d.next.goal}
                  </Text>
                  <View style={{ height: 6, backgroundColor: C.line, borderRadius: 3, marginTop: 6, overflow: "hidden" }}>
                    <View style={{ width: `${Math.round(d.next.progress * 100)}%`, height: 6, backgroundColor: C.pitch }} />
                  </View>
                </>
              )}
            </View>

            {/* bu hafta */}
            <Text style={st.section}>{t("BU HAFTA")}</Text>
            {d.upcoming.length === 0 && (
              <Text style={{ fontSize: 13, color: C.faint, lineHeight: 19 }}>
                {t("Bu hafta programında maç yok — Saha'dan yenisini bul.")}
              </Text>
            )}
            {d.upcoming.map((e) => (
              <TouchableOpacity key={e.id} onPress={() => onOpenEvent(e.id)} style={st.evRow}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", fontSize: 13, color: C.ink }} numberOfLines={1}>{e.title}</Text>
                  <Text style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{e.date} · {(e.venue || "").split(",")[0]}</Text>
                </View>
                <EksikBadge ev={e} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity onPress={onShare} style={st.shareBtn}>
            <Ionicons name="share-social-outline" size={16} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{t("Özeti paylaş")}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const mkSt = () => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 28 },
  section: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText, marginTop: 14, marginBottom: 8 },
  statBox: { flex: 1, backgroundColor: C.chalk, borderRadius: 14, paddingVertical: 10, alignItems: "center" },
  mvpRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8,
    backgroundColor: C.kitSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9,
  },
  badgeCard: { backgroundColor: C.chalk, borderRadius: 14, padding: 12 },
  evRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  shareBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: C.turf, borderRadius: 14, paddingVertical: 13, marginTop: 14,
  },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
