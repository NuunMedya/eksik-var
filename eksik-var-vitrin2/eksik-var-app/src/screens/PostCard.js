import React from "react";
import { View, Text, TouchableOpacity, Image, Share, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar } from "../components";
import { posLabel, posIcon, timeAgo, APP_LINK, CATEGORIES } from "../data";
import { VideoView, useVideoPlayer } from "expo-video";

function VideoBlok({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; });
  return <VideoView player={player} style={st.medya} contentFit="cover" nativeControls />;
}

/* Keşfet kartı — tek gövde, marka dili:
   kimlik satırı · 🎯 ilan etiketi + çipler · açıklama (💰 rozetli) · medya · ince eylem barı */
export default function PostCard({ p, onLike, onOpenUser, onDelete, onOffer = null, onMessage = null, onComments = null, onEdit = null, onArchive = null }) {
  const benimki = p.userId === "me";
  const begendim = (p.likes || []).includes("me");
  const kat = p.listing ? CATEGORIES.find((k) => k.id === p.listing.cat) : null;
  const paylas = () =>
    Share.share({ message: `${p.name} · Eksik Var'da 👇\n${p.caption || ""}\n🔗 ${APP_LINK}` }).catch(() => {});

  const satirlar = (p.caption || "").split("\n").filter((x) => x.trim());

  return (
    <View style={st.kart}>
      {/* kimlik satırı */}
      <View style={st.ust}>
        <TouchableOpacity onPress={() => !benimki && onOpenUser(p)} activeOpacity={benimki ? 1 : 0.7}
          style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
          <Avatar name={p.name} uri={p.avatar} size={42} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14.5, fontWeight: "900", color: C.ink }} numberOfLines={1}>{p.name}</Text>
            <Text style={{ fontSize: 11.5, color: C.faint }} numberOfLines={1}>
              {p.listing && (p.listing.district || p.listing.city) ? "\u{1F4CD} " + [p.listing.district, p.listing.city].filter(Boolean).join(", ") + "  \u00B7  " : ""}{timeAgo(p.createdAt)}
            </Text>
          </View>
        </TouchableOpacity>
        {kat && <Text style={{ fontSize: 20, marginRight: 4 }}>{kat.icon}</Text>}
        {benimki && (
          <TouchableOpacity onPress={() => {
            const sec = [];
            if (onEdit) sec.push({ text: "✏️ " + t("Düzenle"), onPress: () => onEdit(p) });
            if (onArchive) sec.push({ text: "🗄 " + t("Arşivle"), onPress: () => onArchive(p) });
            if (onDelete) sec.push({ text: "🗑 " + t("Sil"), style: "destructive", onPress: () => onDelete(p) });
            sec.push({ text: t("Vazgeç"), style: "cancel" });
            Alert.alert(t("Gönderi"), "", sec);
          }} style={{ padding: 6 }}>
            <Ionicons name="ellipsis-horizontal" size={18} color={C.faint} />
          </TouchableOpacity>
        )}
      </View>

      {/* ilan bölümü */}
      {p.listing && (
        <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={st.ilanEtiket}>
              <Text style={{ fontSize: 10.5, fontWeight: "900", color: C.kit, letterSpacing: 0.6 }}>{"\u{1F3AF} "}{t("OYUNCU İLANI")}</Text>
            </View>
            {!!p.listing.level && p.listing.level !== "Farketmez" && (
              <Text style={{ fontSize: 11.5, fontWeight: "800", color: C.faint }}>{"\u{1F3C5} "}{t(p.listing.level)}</Text>
            )}
            <View style={{ flex: 1 }} />
            <Text style={{ fontSize: 11.5, fontWeight: "800", color: C.faint }}>{"\u2B50 "}{p.listing.rating || 0} {"\u00B7"} %{p.listing.rel}</Text>
          </View>
          {(p.listing.positions || []).length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
              {(p.listing.positions || []).map((x) => (
                <View key={x} style={st.mevkiCip}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: C.turfText }}>{posIcon(x)} {posLabel(x)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* açıklama — 💰 satırı rozet olur */}
      {satirlar.length > 0 && (
        <View style={{ paddingHorizontal: 14, paddingTop: 10, gap: 5 }}>
          {satirlar.map((sat, i) => sat.trim().startsWith("\u{1F4B0}") ? (
            <View key={i} style={st.ucretRozet}>
              <Text style={{ fontSize: 12.5, fontWeight: "900", color: C.kit }}>{sat.trim()}</Text>
            </View>
          ) : (
            <Text key={i} style={{ fontSize: 14, color: C.ink, lineHeight: 20 }}>{sat}</Text>
          ))}
        </View>
      )}

      {/* medya — kart içinde yumuşak köşeli */}
      {!!p.video && <View style={st.medyaKutu}><VideoBlok uri={p.video} /></View>}
      {!p.video && !!p.image && <View style={st.medyaKutu}><Image source={{ uri: p.image }} style={st.medya} resizeMode="cover" /></View>}

      {/* eylem barı */}
      <View style={st.bar}>
        <TouchableOpacity onPress={() => onLike(p)} style={st.eylem}>
          <Ionicons name={begendim ? "heart" : "heart-outline"} size={22} color={begendim ? "#E0245E" : C.faint} />
          {(p.likes || []).length > 0 && <Text style={st.eylemSayi}>{(p.likes || []).length}</Text>}
        </TouchableOpacity>
        {onComments && (
          <TouchableOpacity onPress={() => onComments(p)} style={st.eylem}>
            <Ionicons name="chatbubble-outline" size={20} color={C.faint} />
            {(p.yorumSayi || 0) > 0 && <Text style={st.eylemSayi}>{p.yorumSayi}</Text>}
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={paylas} style={st.eylem}>
          <Ionicons name="share-social-outline" size={20} color={C.faint} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {!benimki && p.listing && onOffer && (
          <TouchableOpacity onPress={() => onOffer(p)} style={[st.cta, { backgroundColor: C.kit }]}>
            <Text style={{ fontSize: 13 }}>{"\u{1F48C}"}</Text>
            <Text style={st.ctaYazi}>{t("Teklif gönder")}</Text>
          </TouchableOpacity>
        )}
        {!benimki && !p.listing && onMessage && (
          <TouchableOpacity onPress={() => onMessage(p)} style={[st.cta, { backgroundColor: C.turf }]}>
            <Text style={{ fontSize: 13 }}>{"\u{1F4AC}"}</Text>
            <Text style={st.ctaYazi}>{t("Mesaj")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  kart: { backgroundColor: C.surface, marginHorizontal: 12, marginBottom: 12, borderRadius: 20, paddingBottom: 4, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  ust: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 13 },
  ilanEtiket: { backgroundColor: C.kitSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  mevkiCip: { backgroundColor: C.pitchSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  ucretRozet: { alignSelf: "flex-start", backgroundColor: C.kitSoft, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 5 },
  medyaKutu: { marginHorizontal: 14, marginTop: 11, borderRadius: 14, overflow: "hidden" },
  medya: { width: "100%", height: 300, backgroundColor: "#000" },
  bar: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 10, marginHorizontal: 14, paddingTop: 9, paddingBottom: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: C.line },
  eylem: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 3, paddingHorizontal: 7 },
  eylemSayi: { fontSize: 12.5, fontWeight: "800", color: C.faint },
  cta: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
  ctaYazi: { fontSize: 12.5, fontWeight: "900", color: "#fff" },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
