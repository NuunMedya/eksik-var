import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { relInfo, relColor } from "../data";
import { teamRecord, formDots, opponentTable, EMBLEM_ICONS, EMBLEM_COLORS } from "../team";
import { Avatar, Field, Input } from "../components";

// g/b/m → etiket ve renk (İngilizcede W/D/L; t() çevirir)
const RES = {
  g: { label: "G", color: () => C.pitch },
  b: { label: "B", color: () => C.faint },
  m: { label: "M", color: () => C.danger },
};

function Emblem({ emblem, size = 64 }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: (emblem && emblem.color) || C.turf, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "rgba(255,255,255,0.5)" }}>
      <Text style={{ fontSize: size * 0.5 }}>{(emblem && emblem.icon) || "⚽"}</Text>
    </View>
  );
}

function ResultChip({ r, size = 22 }) {
  const m = RES[r] || RES.b;
  return (
    <View style={{ width: size, height: size, borderRadius: 6, backgroundColor: m.color(), alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#fff", fontWeight: "900", fontSize: size * 0.5 }}>{t(m.label)}</Text>
    </View>
  );
}

/* ---------- düzenleme kaplaması: ad, ev sahası, amblem ---------- */
function EditSheet({ team, onSave, onClose }) {
  const [name, setName] = useState(team.name);
  const [venue, setVenue] = useState(team.homeVenue || "");
  const [icon, setIcon] = useState(team.emblem.icon);
  const [color, setColor] = useState(team.emblem.color);
  const valid = name.trim().length > 1;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <Text style={st.sheetTitle}>{t("Takımı düzenle")}</Text>
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <Emblem emblem={{ icon, color }} size={56} />
          </View>
          <Field label={t("Takım adı")}>
            <Input value={name} onChangeText={setName} maxLength={28} />
          </Field>
          <Field label={t("Ev sahası")}>
            <Input value={venue} onChangeText={setVenue} placeholder={t("örn. Arena Spor Tesisleri")} />
          </Field>
          <Text style={st.fieldLabel}>{t("Amblem")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {EMBLEM_ICONS.map((ic) => (
              <TouchableOpacity key={ic} onPress={() => setIcon(ic)} style={[st.iconCell, ic === icon && { borderColor: C.turfText, backgroundColor: C.pitchSoft }]}>
                <Text style={{ fontSize: 20 }}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={st.fieldLabel}>{t("Renk")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            {EMBLEM_COLORS.map((cl) => (
              <TouchableOpacity key={cl} onPress={() => setColor(cl)} style={[st.colorDot, { backgroundColor: cl }, cl === color && { borderWidth: 3, borderColor: C.star }]} />
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity onPress={onClose} style={[st.sheetBtn, { backgroundColor: C.line }]}>
              <Text style={{ fontWeight: "900", color: C.ink }}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!valid}
              onPress={() => { onSave({ name: name.trim(), homeVenue: venue.trim(), emblem: { icon, color } }); onClose(); }}
              style={[st.sheetBtn, { backgroundColor: C.turf }, !valid && { opacity: 0.4 }]}
            >
              <Text style={{ fontWeight: "900", color: "#fff" }}>{t("common.save")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ---------- ana ekran ---------- */
export default function TeamScreen({ team, user, roster = [], weeklyEvent = null, onBack, onSave, onMember = () => {}, onOpenEvent = () => {}, onFindOpponent = () => {}, onInvite = () => {} }) {
  const [editing, setEditing] = useState(false);
  const rec = teamRecord(team.history);
  const form = formDots(team.history);
  const table = opponentTable(team.history);
  const isCaptain = team.captainId === "me";

  const MemberRow = ({ m }) => {
    const isMe = m.id === "me";
    const name = isMe ? user.name : m.name;
    const info = isMe ? user : m;
    return (
      <TouchableOpacity disabled={isMe} onPress={() => onMember(m)} style={st.memberRow}>
        <Avatar name={name} uri={info.avatar} size={38} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 13, color: C.ink }} numberOfLines={1}>
            {name}{isMe ? ` (${t("sen")})` : ""}
          </Text>
          <Text style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>@{info.username}</Text>
        </View>
        {(isMe ? isCaptain : m.id === team.captainId) && (
          <View style={st.captainTag}><Text style={{ fontSize: 10, fontWeight: "900", color: C.kit }}>{t("KAPTAN")}</Text></View>
        )}
        <Text style={{ fontSize: 12, fontWeight: "800", color: relColor(info) }}>{relInfo(info).text}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.back}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        {isCaptain && (
          <TouchableOpacity onPress={() => setEditing(true)} style={st.edit}>
            <Ionicons name="create-outline" size={20} color="#fff" />
          </TouchableOpacity>
        )}
        <Emblem emblem={team.emblem} />
        <Text style={st.name}>{team.name}</Text>
        <Text style={{ color: C.mist, fontSize: 12, marginTop: 3 }}>
          {t("kuruluş")} {team.founded} · {team.district}, {team.city}
        </Text>
        {!!team.homeVenue && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Ionicons name="home-outline" size={12} color="#fff" />
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{team.homeVenue}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* sezon kaydı */}
        <View style={st.statsRow}>
          {[
            { top: String(rec.g), label: t("Galibiyet"), color: C.pitch },
            { top: String(rec.b), label: t("Beraberlik"), color: C.faint },
            { top: String(rec.m), label: t("Mağlubiyet"), color: C.danger },
          ].map((s, i) => (
            <View key={i} style={st.statBox}>
              <Text style={{ fontSize: 20, fontWeight: "900", color: s.color }}>{s.top}</Text>
              <Text style={{ fontSize: 11, fontWeight: "800", color: C.ink }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* form ve sezon */}
        <View style={st.card}>
          <Text style={st.cardTitle}>{t("FORM VE SEZON")}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: C.faint, marginRight: 4 }}>{t("Son 5 maç")}</Text>
            {form.length ? form.map((r, i) => <ResultChip key={i} r={r} />) : <Text style={{ fontSize: 12, color: C.faint }}>—</Text>}
          </View>
          <Text style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>
            {t("{p0} maç", { p0: rec.played })} · %{rec.winPct} {t("galibiyet")} · ⚽ {rec.gf} {t("atılan")} · {rec.ga} {t("yenilen")} · {rec.diff >= 0 ? "+" : ""}{rec.diff} {t("averaj")}
          </Text>
        </View>

        {/* eylemler: rakip bul + haftalık maç (var mısın oradan sorulur) */}
        <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 18, marginTop: 14 }}>
          <TouchableOpacity onPress={onFindOpponent} style={[st.actionBtn, { backgroundColor: C.kit }]}>
            <Text style={{ fontSize: 15 }}>🆚</Text>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{t("Rakip bul")}</Text>
          </TouchableOpacity>
          {weeklyEvent && (
            <TouchableOpacity onPress={() => onOpenEvent(weeklyEvent.id)} style={[st.actionBtn, { backgroundColor: C.turf }]}>
              <Text style={{ fontSize: 15 }}>🗓</Text>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{t("Haftalık maç")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* sabit kadro */}
        <View style={st.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={st.cardTitle}>{t("SABİT KADRO")}</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint }}>{roster.length} {t("oyuncu")}</Text>
          </View>
          {roster.map((m) => <MemberRow key={m.id} m={m} />)}
          {weeklyEvent && (
            <TouchableOpacity onPress={() => onInvite(weeklyEvent)} style={st.inviteBtn}>
              <Ionicons name="link-outline" size={16} color={C.turfText} />
              <Text style={{ color: C.turfText, fontWeight: "900", fontSize: 13 }}>{t("Kadroya davet linki")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* rakip geçmişi */}
        <View style={st.card}>
          <Text style={st.cardTitle}>{t("RAKİP GEÇMİŞİ")}</Text>
          {team.history.length === 0 && (
            <Text style={{ fontSize: 13, color: C.faint, marginTop: 6, lineHeight: 19 }}>
              {t("Henüz rakip maçı yok — ilk ilanını aç, geçmiş burada birikecek.")}
            </Text>
          )}
          {team.history.map((h, i) => (
            <View key={h.id} style={[st.historyRow, i === team.history.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <ResultChip r={h.home > h.away ? "g" : h.home < h.away ? "m" : "b"} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", fontSize: 13, color: C.ink }} numberOfLines={1}>{h.opponent}</Text>
                <Text style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{h.date} · {h.venue}</Text>
              </View>
              <Text style={{ fontSize: 15, fontWeight: "900", color: C.turfText }}>{h.home} – {h.away}</Text>
            </View>
          ))}
        </View>

        {/* sezon tablosu: rakip bazında */}
        {table.length > 0 && (
          <View style={st.card}>
            <Text style={st.cardTitle}>{t("SEZON TABLOSU")}</Text>
            <View style={[st.tableRow, { borderBottomWidth: 1, borderBottomColor: C.line }]}>
              <Text style={[st.th, { flex: 1, textAlign: "left" }]}>{t("Rakip")}</Text>
              <Text style={st.th}>{t("O")}</Text>
              <Text style={[st.th, { color: C.pitch }]}>{t("G")}</Text>
              <Text style={st.th}>{t("B")}</Text>
              <Text style={[st.th, { color: C.danger }]}>{t("M")}</Text>
            </View>
            {table.map((o) => (
              <View key={o.name} style={st.tableRow}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "800", color: C.ink }} numberOfLines={1}>{o.name}</Text>
                <Text style={st.td}>{o.played}</Text>
                <Text style={[st.td, { color: C.pitch }]}>{o.g}</Text>
                <Text style={st.td}>{o.b}</Text>
                <Text style={[st.td, { color: C.danger }]}>{o.m}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {editing && <EditSheet team={team} onSave={onSave} onClose={() => setEditing(false)} />}
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, alignItems: "center", paddingTop: 14, paddingBottom: 22 },
  back: { position: "absolute", left: 10, top: 10, padding: 6, zIndex: 2 },
  edit: { position: "absolute", right: 12, top: 12, padding: 6, zIndex: 2 },
  name: { color: "#fff", fontWeight: "900", fontSize: 20, marginTop: 8 },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 18, marginTop: -14 },
  statBox: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 12, alignItems: "center", elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginHorizontal: 18, marginTop: 14 },
  cardTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, paddingVertical: 12 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  captainTag: { backgroundColor: C.kitSoft, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  inviteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 10,
    borderWidth: 1.5, borderColor: C.pitchSoft, borderRadius: 12, paddingVertical: 10, backgroundColor: C.pitchSoft,
  },
  historyRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: 7 },
  th: { width: 30, textAlign: "center", fontSize: 11, fontWeight: "900", color: C.faint },
  td: { width: 30, textAlign: "center", fontSize: 13, fontWeight: "800", color: C.ink },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30 },
  sheetTitle: { fontSize: 16, fontWeight: "900", color: C.ink, marginBottom: 12, textAlign: "center" },
  fieldLabel: { fontSize: 11, fontWeight: "900", letterSpacing: 0.6, color: C.faint, marginBottom: 6, marginTop: 2 },
  iconCell: { width: 42, height: 42, borderRadius: 10, borderWidth: 1.5, borderColor: C.line, alignItems: "center", justifyContent: "center", backgroundColor: C.chalk },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  sheetBtn: { flex: 1, alignItems: "center", borderRadius: 12, paddingVertical: 12 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
