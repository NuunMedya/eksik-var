import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { MY_COMMENTS, MY_ATTENDANCE, MODE_LABEL, DEFAULT_SETTINGS } from "../data";
import { Stars, AvatarPicker, EksikBadge } from "../components";
import { chooseAvatar } from "../avatar";

export default function ProfileScreen({ user, pendingRate, onRate, onLogout, onSettings, onInvite, onAvatar, settings = DEFAULT_SETTINGS, events = [], onOpenEvent = () => {} }) {
  const upcoming = events.filter((e) => (e.joined || e.mine) && !e.ended && e.status !== "iptal").slice(0, 5);
  const past = events.filter((e) => (e.joined || e.mine) && e.ended).slice(0, 5);
  const EventRow = ({ e }) => (
    <TouchableOpacity onPress={() => onOpenEvent(e.id)} style={st.evRow}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "800", fontSize: 13, color: C.ink }} numberOfLines={1}>{e.title}</Text>
        <Text style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{e.date} · {e.venue.split(",")[0]}{e.mine ? " · organizatörsün" : ""}</Text>
      </View>
      <EksikBadge ev={e} />
    </TouchableOpacity>
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.chalk }} contentContainerStyle={{ paddingBottom: 120 }}>
      <View style={st.header}>
        <View style={{ marginBottom: 8 }}>
          <AvatarPicker name={user.name} uri={user.avatar} size={84} light onPress={() => chooseAvatar(user.avatar, onAvatar)} />
        </View>
        {!user.avatar && (
          <Text style={{ color: C.mist, fontSize: 11, marginBottom: 4 }}>Fotoğraf eklemek için dokun</Text>
        )}
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 19 }}>{user.name}</Text>
        <Text style={{ color: C.mist, fontSize: 13 }}>
          @{user.username} · {user.district ? `${user.district}, ` : ""}{user.city}
        </Text>
      </View>

      <View style={st.statsRow}>
        {[
          { top: `★ ${user.rating}`, label: "Puan", sub: `${user.count} değerlendirme` },
          { top: `%${user.rel}`, label: "Güvenilirlik", sub: "katılım oranı" },
          { top: String(user.joined), label: "Katılım", sub: `${user.organized} organizasyon` },
        ].map((s, i) => (
          <View key={i} style={st.statBox}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: C.turf }}>{s.top}</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.ink }}>{s.label}</Text>
            <Text style={{ fontSize: 10, color: C.faint, textAlign: "center" }}>{s.sub}</Text>
          </View>
        ))}
      </View>

      <View style={st.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={st.cardTitle}>GÜVENİLİRLİK</Text>
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint }}>
            {user.joined} katıldı · {user.noShow || 0} gelmedi
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 6 }}>
          <Text style={{ fontSize: 30, fontWeight: "900", color: user.rel < 85 ? C.kit : C.pitch }}>%{user.rel}</Text>
          <Text style={{ fontSize: 12, color: C.faint, marginBottom: 6, flex: 1 }}>
            Organizatörler başvurunda bu puanı görür. "Geldim" deyip gelmemek düşürür.
          </Text>
        </View>
        <View style={{ height: 8, backgroundColor: C.line, borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
          <View style={{ width: `${user.rel}%`, height: 8, backgroundColor: user.rel < 85 ? C.kit : C.pitch }} />
        </View>
        <View style={{ marginTop: 10 }}>
          {MY_ATTENDANCE.map((a, i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 5 }}>
              <Ionicons
                name={a.status === "katildi" ? "checkmark-circle" : "close-circle"}
                size={16}
                color={a.status === "katildi" ? C.pitch : C.kit}
              />
              <Text style={{ flex: 1, fontSize: 13, color: C.ink }}>{a.title}</Text>
              <Text style={{ fontSize: 11, color: C.faint }}>{a.date}</Text>
            </View>
          ))}
        </View>
      </View>

      {pendingRate && (
        <View style={st.pending}>
          <Text style={{ fontWeight: "900", fontSize: 13, color: C.ink }}>⭐ Bekleyen puanlama</Text>
          <Text style={{ fontSize: 13, color: C.faint, marginTop: 4, lineHeight: 19 }}>
            "{pendingRate.title}" tamamlandı — takım arkadaşlarını puanla, topluluk puanları herkes için işlesin.
          </Text>
          <TouchableOpacity onPress={() => onRate(pendingRate.id)} style={st.rateBtn}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>Şimdi puanla</Text>
          </TouchableOpacity>
        </View>
      )}

      {(upcoming.length > 0 || past.length > 0) && (
        <View style={st.card}>
          <Text style={st.cardTitle}>MAÇLARIM</Text>
          {upcoming.length > 0 && <Text style={st.subTitle}>Yaklaşan</Text>}
          {upcoming.map((e) => <EventRow key={e.id} e={e} />)}
          {past.length > 0 && <Text style={[st.subTitle, { marginTop: 10 }]}>Geçmiş</Text>}
          {past.map((e) => <EventRow key={e.id} e={e} />)}
        </View>
      )}

      <TouchableOpacity onPress={onSettings} style={st.settingsRow}>
        <View style={st.settingsIcon}>
          <Ionicons name="settings-outline" size={18} color={C.turf} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }}>Ayarlar</Text>
          <Text style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>
            {MODE_LABEL[settings.contact.mode]} · {settings.contact.scope === "herkes" ? "herkes ulaşabilir" : "sadece kadrom"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.gray} />
      </TouchableOpacity>

      <View style={st.card}>
        <Text style={st.cardTitle}>HAKKINDA SÖYLENENLER</Text>
        {MY_COMMENTS.map((c, i) => (
          <View
            key={i}
            style={[st.comment, i === MY_COMMENTS.length - 1 && { borderBottomWidth: 0, paddingBottom: 0 }]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontWeight: "800", fontSize: 13, color: C.ink }}>{c.from}</Text>
              <Stars value={c.stars} size={11} />
            </View>
            <Text style={{ fontSize: 13, color: C.faint, marginTop: 3 }}>"{c.text}"</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity onPress={onInvite} style={st.inviteRow}>
        <View style={[st.settingsIcon, { backgroundColor: C.kitSoft }]}>
          <Ionicons name="gift-outline" size={18} color={C.kit} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }}>Arkadaşını davet et</Text>
          <Text style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>Ekibini uygulamaya taşı, kadro hiç eksik kalmasın</Text>
        </View>
        <Ionicons name="share-social-outline" size={18} color={C.kit} />
      </TouchableOpacity>

      <TouchableOpacity onPress={onLogout} style={st.logout}>
        <Ionicons name="log-out-outline" size={16} color={C.danger} />
        <Text style={{ color: C.danger, fontWeight: "800", fontSize: 13 }}>Çıkış yap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: C.turf, alignItems: "center", paddingTop: 22, paddingBottom: 30 },
  avatar: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 18, marginTop: -16 },
  statBox: {
    flex: 1, backgroundColor: "#fff", borderRadius: 16, paddingVertical: 12,
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
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginHorizontal: 18, marginTop: 14 },
  settingsRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff",
    borderRadius: 16, padding: 14, marginHorizontal: 18, marginTop: 14,
  },
  settingsIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: C.pitchSoft,
    alignItems: "center", justifyContent: "center",
  },
  cardTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turf, marginBottom: 4 },
  comment: { borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 10 },
  subTitle: { fontSize: 11, fontWeight: "800", color: C.faint, marginTop: 6, marginBottom: 2 },
  evRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.line },
  inviteRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff",
    borderRadius: 16, padding: 14, marginHorizontal: 18, marginTop: 14,
    borderWidth: 1.5, borderColor: C.kitSoft,
  },
  logout: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: "#fff", borderWidth: 1, borderColor: C.line, borderRadius: 16,
    paddingVertical: 12, marginHorizontal: 18, marginTop: 14,
  },
});
