import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { MY_COMMENTS, MY_ATTENDANCE, MODE_LABEL, DEFAULT_SETTINGS, POSITIONS, CATEGORIES, relInfo, relColor } from "../data";
import { Stars, AvatarPicker, EksikBadge, Chip } from "../components";
import { chooseAvatar } from "../avatar";

export default function ProfileScreen({ user, pendingRate, onRate, onLogout, onSettings, onInvite, onAvatar, settings = DEFAULT_SETTINGS, events = [], onOpenEvent = () => {}, onPositionsChange = () => {}, onEdit = () => {}, onBringTeam = () => {} }) {
  const myPos = user.positions || [];
  const togglePos = (id) => onPositionsChange(myPos.includes(id) ? myPos.filter((p) => p !== id) : [...myPos, id]);
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
          <Text style={{ color: C.mist, fontSize: 11, marginBottom: 4 }}>{t("Fotoğraf eklemek için dokun")}</Text>
        )}
        <TouchableOpacity onPress={onEdit} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 }}>
          <Ionicons name="create-outline" size={13} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12, fontWeight: "800" }}>{t("profile.edit")}</Text>
        </TouchableOpacity>
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
        {user.verified && (
          <TouchableOpacity onPress={() => Alert.alert(t("Telefonu doğrulanmış"), t("Bu hesap SMS koduyla doğrulanmış gerçek bir numaraya bağlı; kapatılan hesaplar aynı numarayla geri dönemez."))} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <Ionicons name="shield-checkmark" size={13} color={C.star} />
            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{t("Telefonu doğrulanmış")}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={st.statsRow}>
        {[
          { top: `★ ${user.rating}`, label: "Puan", sub: `${user.count} değerlendirme` },
          { top: `%${user.rel}`, label: "Güvenilirlik", sub: "katılım oranı" },
          { top: String(user.joined), label: "Katılım", sub: `${user.organized} organizasyon` },
        ].map((s, i) => (
          <View key={i} style={st.statBox}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: C.turfText }}>{s.top}</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.ink }}>{s.label}</Text>
            <Text style={{ fontSize: 11, color: C.faint, textAlign: "center" }}>{s.sub}</Text>
          </View>
        ))}
      </View>

      <View style={st.card}>
        <Text style={st.cardTitle}>{t("profile.positions")}</Text>
        <Text style={{ fontSize: 12, color: C.faint, marginTop: 4, marginBottom: 6 }}>
          Organizatörler mevkine göre arar; "Bana uygun" filtresi bunlara bakar.
        </Text>
        {Object.entries(POSITIONS).map(([catId, list]) => (
          <View key={catId} style={{ marginTop: 6 }}>
            <Text style={{ fontSize: 11, fontWeight: "800", color: C.faint, marginBottom: 4 }}>
              {t((CATEGORIES.find((c) => c.id === Number(catId)) || {}).name || "")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
              {list.map((pos) => <Chip key={pos.id} label={`${pos.icon} ${t(pos.label)}`} active={myPos.includes(pos.id)} onPress={() => togglePos(pos.id)} />)}
            </View>
          </View>
        ))}
      </View>

      <View style={st.card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <TouchableOpacity onPress={() => Alert.alert(t("Güvenilirlik"), t("Yoklamada 'katıldı' / 'gelmedi' kayıtlarından hesaplanır. İlk 5 maçta yüzde gösterilmez; sonrasında yumuşatılmış oran kullanılır. Maça 24 saatten az kala ayrılmak ya da iptal etmek de 'gelmedi' gibi işler."))}>
            <Text style={st.cardTitle}>{t("profile.reliability")} <Text style={{ color: C.faint }}>ⓘ</Text></Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint }}>
            {user.joined} katıldı · {user.noShow || 0} gelmedi
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, marginTop: 6 }}>
          <Text style={{ fontSize: relInfo(user).isNew ? 18 : 30, fontWeight: "900", color: relColor(user) }}>{relInfo(user).text}</Text>
          <Text style={{ fontSize: 12, color: C.faint, marginBottom: 6, flex: 1 }}>
            {relInfo(user).isNew ? "İlk 5 maçta yüzde gösterilmez; organizatörler 'Yeni oyuncu' görür." : "Organizatörler başvurunda bu puanı görür. \"Geldim\" deyip gelmemek düşürür; ilk maçlar daha az ağır sayılır."}
          </Text>
        </View>
        {user.paymentStats && user.paymentStats.pct != null && (
          <Text style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>
            {t("💳 Ödeme düzeni:")} <Text style={{ fontWeight: "900", color: user.paymentStats.pct >= 80 ? C.pitch : C.kit }}>%{user.paymentStats.pct}</Text> ({user.paymentStats.paid} zamanında{user.paymentStats.late ? `, ${user.paymentStats.late} geç` : ""}{user.paymentStats.overdue ? `, ${user.paymentStats.overdue} bekliyor` : ""})
          </Text>
        )}
        <View style={{ height: 8, backgroundColor: C.line, borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
          <View style={{ width: `${relInfo(user).pct || 0}%`, height: 8, backgroundColor: relColor(user) }} />
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
          <Text style={{ fontWeight: "900", fontSize: 13, color: C.ink }}>{t("⭐ Bekleyen puanlama")}</Text>
          <Text style={{ fontSize: 13, color: C.faint, marginTop: 4, lineHeight: 19 }}>
            "{pendingRate.title}" tamamlandı — takım arkadaşlarını puanla, topluluk puanları herkes için işlesin.
          </Text>
          <TouchableOpacity onPress={() => onRate(pendingRate.id)} style={st.rateBtn}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{t("Şimdi puanla")}</Text>
          </TouchableOpacity>
        </View>
      )}

      {(upcoming.length > 0 || past.length > 0) && (
        <View style={st.card}>
          <Text style={st.cardTitle}>{t("MAÇLARIM")}</Text>
          {upcoming.length > 0 && <Text style={st.subTitle}>{t("Yaklaşan")}</Text>}
          {upcoming.map((e) => <EventRow key={e.id} e={e} />)}
          {past.length > 0 && <Text style={[st.subTitle, { marginTop: 10 }]}>{t("Geçmiş")}</Text>}
          {past.map((e) => <EventRow key={e.id} e={e} />)}
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

      <View style={st.card}>
        <Text style={st.cardTitle}>{t("HAKKINDA SÖYLENENLER")}</Text>
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

      <TouchableOpacity onPress={onBringTeam} style={[st.inviteRow, { borderColor: C.pitchSoft }]}>
        <View style={[st.settingsIcon, { backgroundColor: C.pitchSoft }]}>
          <Ionicons name="people-outline" size={18} color={C.turfText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }}>{t("profile.bringTeam")}</Text>
          <Text style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>{t("Haftalık maçını aç, WhatsApp grubuna davet linkini at — \"kim var?\" sayımı bitsin")}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.turfText} />
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
  statsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 18, marginTop: -16 },
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
