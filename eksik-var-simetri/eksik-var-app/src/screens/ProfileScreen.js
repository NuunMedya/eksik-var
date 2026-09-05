import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { MODE_LABEL, DEFAULT_SETTINGS, CATEGORIES, posLabel } from "../data";
import { badgesFor } from "../badges";
import { teamRecord } from "../team";
import { AvatarPicker } from "../components";
import { chooseAvatar } from "../avatar";

export default function ProfileScreen({ user, pendingRate, onRate, onLogout, onSettings, onInvite, onAvatar, settings = DEFAULT_SETTINGS, events = [], team = null, onTeam = () => {}, marketMine = null, onMarket = () => {}, onOpenEvent = () => {}, onPositionsChange = () => {}, onEdit = () => {}, onBringTeam = () => {} }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.chalk }} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={st.header}>
        <View style={{ marginBottom: 8, padding: 4, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.16)" }}>
          <AvatarPicker name={user.name} uri={user.avatar} size={84} light onPress={() => chooseAvatar(user.avatar, onAvatar)} />
        </View>
        {!user.avatar && (
          <Text style={{ color: C.mist, fontSize: 11, marginBottom: 4 }}>{t("Fotoğraf eklemek için dokun")}</Text>
        )}
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 19 }}>{user.name}</Text>
        <Text style={{ color: C.mist, fontSize: 13 }}>
          @{user.username} · {user.district ? `${user.district}, ` : ""}{user.city}{user.level && user.level !== "Farketmez" ? ` · ${user.level}` : ""}
        </Text>
        {user.bio ? <Text style={{ color: "#fff", fontSize: 12, marginTop: 4, textAlign: "center", paddingHorizontal: 24 }}>{user.bio}</Text> : null}
        {user.totals && (user.totals.goals > 0 || user.totals.assists > 0) && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>⚽ {user.totals.goals} gol · 🎯 {user.totals.assists} asist</Text>
          </View>
        )}
        {user.mvpCount > 0 && (
          <TouchableOpacity onPress={() => Alert.alert(t("MVP"), t("Tamamlanan maçlarda takım arkadaşların 'maçın oyuncusu' oyu verir; oylar 48 saat sonra sayılır, en çok oyu alan MVP olur."))} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: "rgba(245,179,1,0.18)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12 }}>🏆</Text>
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>MVP ×{user.mvpCount}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={st.statsRow}>
        {[
          { top: `★ ${user.rating}`, label: "Puan", sub: `${user.count} değerlendirme`, renk: C.star },
          { top: `%${user.rel}`, label: "Güvenilirlik", sub: "katılım oranı", renk: C.pitch },
          { top: String(user.joined), label: "Katılım", sub: `${user.organized} organizasyon`, renk: C.kit },
        ].map((s, i) => (
          <View key={i} style={[st.statBox, { borderTopWidth: 3, borderTopColor: s.renk }]}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: s.renk }}>{s.top}</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.ink }}>{s.label}</Text>
            <Text style={{ fontSize: 11, color: C.faint, textAlign: "center" }}>{s.sub}</Text>
          </View>
        ))}
      </View>

      {((user.favCats || []).length > 0 || (user.positions || []).length > 0) && (
        <Text style={{ textAlign: "center", fontSize: 12.5, color: C.faint, marginTop: 12, paddingHorizontal: 24 }}>
          {(user.favCats || []).map((cid) => (CATEGORIES.find((c) => c.id === cid) || {}).icon).join(" ")}
          {(user.positions || []).length > 0 ? "  ·  " + user.positions.slice(0, 4).map((p) => posLabel(p)).join(", ") : ""}
        </Text>
      )}

      <TouchableOpacity onPress={onEdit} activeOpacity={0.85}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.kit, borderRadius: 14, marginHorizontal: 18, marginTop: 12, paddingVertical: 13 }}>
        <Text style={{ fontSize: 15 }}>✏️</Text>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{t("Profili düzenle")}</Text>
      </TouchableOpacity>

      {team && (() => { const rec = teamRecord(team.history); return (
        <TouchableOpacity onPress={onTeam} style={st.teamRow}>
          <View style={[st.emblem, { backgroundColor: team.emblem.color }]}>
            <Text style={{ fontSize: 20 }}>{team.emblem.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText }}>{t("TAKIMIM")}</Text>
            <Text style={{ fontWeight: "900", fontSize: 15, color: C.ink, marginTop: 1 }}>{team.name}</Text>
            <Text style={{ fontSize: 12, color: C.faint, marginTop: 1 }}>
              {rec.g}{t("G")} {rec.b}{t("B")} {rec.m}{t("M")} · %{rec.winPct} {t("galibiyet")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.turfText} />
        </TouchableOpacity>
      ); })()}

      {(() => { const list = badgesFor(user); const earned = list.filter((b) => b.earned).length; return (
        <View style={st.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={st.cardTitle}>{t("ROZETLER")}</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint }}>{earned}/{list.length}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 4 }}>
            {[...list].sort((x, y) => (y.earned ? 1 : 0) - (x.earned ? 1 : 0)).map((b) => (
              <TouchableOpacity
                key={b.id}
                onPress={() => Alert.alert(`${b.icon} ${t(b.title)}`, `${t(b.desc)}\n\n${b.earned ? t("Kazanıldı ✓") : t("İlerleme: {p0}/{p1}", { p0: b.value, p1: b.goal })}`)}
                style={{ width: 74, alignItems: "center", opacity: b.earned ? 1 : 0.45 }}
              >
                <View style={[st.badgeCell, b.earned && { backgroundColor: C.pitchSoft, borderColor: C.pitch }]}>
                  <Text style={{ fontSize: 22 }}>{b.icon}</Text>
                </View>
                <Text style={{ fontSize: 10, fontWeight: "800", color: C.ink, marginTop: 3, textAlign: "center" }} numberOfLines={1}>{t(b.title)}</Text>
                {!b.earned && <Text style={{ fontSize: 9, color: C.faint }}>{b.value}/{b.goal}</Text>}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ); })()}

      {pendingRate && (
        <View style={st.pending}>
          <Text style={{ fontWeight: "900", fontSize: 13, color: C.ink }}>{t("⭐ Bekleyen puanlama")}</Text>
          <Text style={{ fontSize: 13, color: C.faint, marginTop: 4, lineHeight: 19 }}>
            "{pendingRate.title}" tamamlandı — takım arkadaşlarını puanla, topluluk puanları herkes için işlesin.
          </Text>
          <TouchableOpacity onPress={() => onRate(pendingRate.id)} style={st.rateBtn}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{t("Şimdi puanla")}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={onSettings} style={st.settingsRow}>
        <View style={st.settingsIcon}>
          <Ionicons name="settings-outline" size={18} color={C.turfText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }}>{t("Ayarlar")}</Text>
          <Text style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>
            {MODE_LABEL[settings.contact.mode]} · {settings.contact.scope === "herkes" ? "herkes ulaşabilir" : "sadece kadrom"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.gray} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onInvite} style={st.inviteRow}>
        <View style={[st.settingsIcon, { backgroundColor: C.kitSoft }]}>
          <Ionicons name="gift-outline" size={18} color={C.kit} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }}>{t("Arkadaşını davet et")}</Text>
          <Text style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{t("Ekibini uygulamaya taşı, kadro hiç eksik kalmasın")}</Text>
        </View>
        <Ionicons name="share-social-outline" size={18} color={C.kit} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onLogout} style={st.logout}>
        <Ionicons name="log-out-outline" size={16} color={C.danger} />
        <Text style={{ color: C.danger, fontWeight: "800", fontSize: 13 }}>{t("Çıkış yap")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, alignItems: "center", paddingTop: 22, paddingBottom: 30 },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: -16 },
  statBox: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 12,
    alignItems: "center", elevation: 2,
    shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  pending: {
    marginHorizontal: 18, marginTop: 14, borderRadius: 16, padding: 14,
    borderWidth: 2, borderColor: C.star, backgroundColor: "#FFFBEF",
  },
  rateBtn: {
    backgroundColor: C.turf, borderRadius: 12, alignItems: "center",
    paddingVertical: 10, marginTop: 10,
  },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginHorizontal: 18, marginTop: 14 },
  teamRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface,
    borderRadius: 16, padding: 14, marginHorizontal: 18, marginTop: 14,
    borderWidth: 1.5, borderColor: C.pitchSoft,
  },
  emblem: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  badgeCell: {
    width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: C.line,
    backgroundColor: C.chalk, alignItems: "center", justifyContent: "center",
  },
  settingsRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface,
    borderRadius: 16, padding: 14, marginHorizontal: 18, marginTop: 14,
  },
  settingsIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.pitchSoft,
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText, marginBottom: 4 },
  comment: { borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 10 },
  subTitle: { fontSize: 11, fontWeight: "800", color: C.faint, marginTop: 6, marginBottom: 2 },
  evRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  inviteRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface,
    borderRadius: 16, padding: 14, marginHorizontal: 18, marginTop: 14,
    borderWidth: 1.5, borderColor: C.kitSoft,
  },
  logout: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 16,
    paddingVertical: 12, marginHorizontal: 18, marginTop: 14,
  },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
