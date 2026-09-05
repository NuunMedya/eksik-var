import React from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar, Stars } from "../components";
import { posLabel, posIcon, relInfo, relColor } from "../data";
import { earnedBadges } from "../badges";

export default function UserProfileScreen({ user, comments = [], rules, blocked = false, loading = false,
  onBack, onMessage, onCall, onBlock, onReport, onInvite }) {
  if (!user) return null;
  const ri = relInfo(user);
  const confirmBlock = () =>
    blocked ? onBlock(user)
      : Alert.alert(t("Engelle"), `${user.name} artık sana yazamaz, arayamaz; etkinliklerini görmezsin.`,
          [{ text: t("Vazgeç"), style: "cancel" }, { text: t("Engelle"), style: "destructive", onPress: () => onBlock(user) }]);

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.back}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Avatar name={user.name} uri={user.avatar} size={88} />
        <Text style={st.name}>{user.name}</Text>
        <Text style={{ color: C.mist, fontSize: 13 }}>
          @{user.username}{user.city ? ` · ${user.district ? user.district + ", " : ""}${user.city}` : ""}{user.level && user.level !== "Farketmez" ? ` · ${user.level}` : ""}
        </Text>
        {user.bio ? <Text style={{ color: "#fff", fontSize: 12, marginTop: 4, textAlign: "center", paddingHorizontal: 24 }}>{user.bio}</Text> : null}
        <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
          {user.verified && (
            <View style={st.tag}><Ionicons name="shield-checkmark" size={12} color={C.star} /><Text style={st.tagText}>{t("Doğrulanmış")}</Text></View>
          )}
          {user.role === "organizator" && (<View style={st.tag}><Text style={st.tagText}>{t("Organizatör")}</Text></View>)}
          {user.mvpCount > 0 && (<View style={[st.tag, { backgroundColor: "rgba(245,179,1,0.25)" }]}><Text style={st.tagText}>🏆 MVP ×{user.mvpCount}</Text></View>)}
          {user.paymentStats && user.paymentStats.pct != null && (<View style={st.tag}><Text style={st.tagText}>💳 Ödeme %{user.paymentStats.pct}</Text></View>)}
          {user.totals && (user.totals.goals > 0 || user.totals.assists > 0) && (<View style={st.tag}><Text style={st.tagText}>⚽ {user.totals.goals} gol · 🎯 {user.totals.assists} asist</Text></View>)}
          {user.teamName && (<View style={[st.tag, { backgroundColor: "rgba(244,96,12,0.25)" }]}><Text style={st.tagText}>🆚 {user.teamName}{user.teamMatches ? ` · ${user.teamMatches} maç` : ""}</Text></View>)}
          {blocked && (<View style={[st.tag, { backgroundColor: C.kit }]}><Text style={st.tagText}>{t("Engelledin")}</Text></View>)}
        </View>
        {user.positions && user.positions.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 8, paddingHorizontal: 20 }}>
            {user.positions.map((p) => (<View key={p} style={st.tag}><Text style={st.tagText}>{posIcon(p)} {posLabel(p)}</Text></View>))}
          </View>
        )}
        {(() => { const eb = earnedBadges(user); return eb.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 6, marginTop: 8, paddingHorizontal: 20 }}>
            {eb.map((b) => (<View key={b.id} style={st.tag}><Text style={st.tagText}>{b.icon} {t(b.title)}</Text></View>))}
          </View>
        ); })()}
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={st.statsRow}>
          <View style={st.statBox}>
            <Stars value={user.rating || 0} size={13} />
            <Text style={st.statBig}>{user.rating ? user.rating : "–"}</Text>
            <Text style={st.statSub}>{user.count || 0} değerlendirme</Text>
          </View>
          <View style={st.statBox}>
            <Ionicons name="shield-checkmark" size={16} color={relColor(user)} />
            <Text style={[st.statBig, { color: relColor(user), fontSize: ri.isNew ? 13 : 17 }]}>{ri.text}</Text>
            <Text style={st.statSub}>{ri.isNew ? "güvenilirlik (henüz yok)" : "güvenilirlik"}</Text>
          </View>
          <View style={st.statBox}>
            <Ionicons name="football-outline" size={16} color={C.turfText} />
            <Text style={st.statBig}>{user.joined != null ? user.joined : "–"}</Text>
            <Text style={st.statSub}>{user.organized != null ? `${user.organized} organizasyon` : "katılım"}</Text>
          </View>
        </View>

        {rules && !user.isMe && (
          <View style={{ flexDirection: "row", gap: 10, marginHorizontal: 18, marginTop: 14 }}>
            <TouchableOpacity disabled={!rules.canMessage} onPress={() => onMessage(user)}
              style={[st.btn, { backgroundColor: C.pitchSoft }, !rules.canMessage && { opacity: 0.4 }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.turfText} />
              <Text style={[st.btnText, { color: C.turfText }]}>{t("Mesaj")}</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={!rules.canCall} onPress={() => onCall(user)}
              style={[st.btn, { backgroundColor: C.pitch }, !rules.canCall && { opacity: 0.4 }]}>
              <Ionicons name="call" size={16} color="#fff" />
              <Text style={[st.btnText, { color: "#fff" }]}>{t("Ara · yakında")}</Text>
            </TouchableOpacity>
          </View>
        )}
        {rules && (!rules.canMessage || !rules.canCall) && (
          <Text style={st.reason}>{rules.messageReason || rules.callReason}</Text>
        )}
        {onInvite && !user.isMe && !blocked && (
          <TouchableOpacity onPress={() => onInvite(user)} style={[st.btn, { backgroundColor: C.kitSoft, marginHorizontal: 18, marginTop: 10 }]}>
            <Ionicons name="person-add-outline" size={16} color={C.kit} />
            <Text style={[st.btnText, { color: C.kit }]}>{t("Kadroya davet et")}</Text>
          </TouchableOpacity>
        )}

        <View style={st.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={st.cardTitle}>{t("HAKKINDA SÖYLENENLER")}</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint }}>{comments.length} yorum</Text>
          </View>
          {loading && <ActivityIndicator color={C.pitch} style={{ marginTop: 12 }} />}
          {!loading && comments.length === 0 && (
            <Text style={{ color: C.faint, fontSize: 13, marginTop: 8 }}>{t("Henüz yorum yok. Birlikte oynadıktan sonra ilk yorumu sen yazabilirsin.")}</Text>
          )}
          {comments.map((c, i) => (
            <View key={i} style={[st.comment, i === comments.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Avatar name={c.from} uri={c.avatar} size={28} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", fontSize: 13, color: C.ink }}>{c.from}</Text>
                  {c.event ? <Text style={{ fontSize: 11, color: C.faint }}>{c.event}{c.time ? ` · ${c.time}` : ""}</Text> : null}
                </View>
                <Stars value={c.stars} size={11} />
              </View>
              {c.text ? <Text style={{ fontSize: 13, color: C.ink, marginTop: 6, lineHeight: 18 }}>"{c.text}"</Text> : null}
            </View>
          ))}
        </View>

        {!user.isMe && onBlock && (
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 22, marginTop: 16 }}>
            <TouchableOpacity onPress={confirmBlock} style={st.minor}>
              <Ionicons name={blocked ? "lock-open-outline" : "ban-outline"} size={14} color={C.faint} />
              <Text style={st.minorText}>{blocked ? "Engeli kaldır" : "Engelle"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onReport(user)} style={st.minor}>
              <Ionicons name="flag-outline" size={14} color={C.faint} />
              <Text style={st.minorText}>{t("Şikayet et")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, alignItems: "center", paddingTop: 6, paddingBottom: 26 },
  back: { alignSelf: "flex-start", paddingHorizontal: 10, paddingBottom: 6 },
  name: { color: "#fff", fontWeight: "900", fontSize: 20, marginTop: 10 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 18, marginTop: -14 },
  statBox: { flex: 1, backgroundColor: C.surface, borderRadius: 16, paddingVertical: 12, alignItems: "center", gap: 3, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  statBig: { fontSize: 17, fontWeight: "900", color: C.turfText },
  statSub: { fontSize: 11, color: C.faint, textAlign: "center" },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 12 },
  btnText: { fontWeight: "900", fontSize: 14 },
  reason: { textAlign: "center", fontSize: 12, color: C.faint, marginTop: 8, marginHorizontal: 18 },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginHorizontal: 18, marginTop: 14 },
  cardTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText },
  comment: { borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 10 },
  minor: { flexDirection: "row", alignItems: "center", gap: 4 },
  minorText: { fontSize: 12, fontWeight: "700", color: C.faint },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
