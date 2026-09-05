import React from "react";
import { View, Text, TouchableOpacity, Image, Share, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Avatar } from "../components";
import { CATEGORIES, posLabel, timeAgo, APP_LINK } from "../data";
import { VideoView, useVideoPlayer } from "expo-video";

function VideoBlok({ uri }) {
  const player = useVideoPlayer(uri, (p) => { p.loop = true; p.muted = true; });
  return <VideoView player={player} style={st.medya} contentFit="cover" nativeControls />;
}

/* Keşfet gönderisi — Instagram dili:
   üstte kişi satırı · kenardan kenara medya · altta ikon sırası · beğeni · kalın isimli açıklama.
   props: p, onLike, onOpenUser, onDelete, onOffer */
export default function PostCard({ p, onLike, onOpenUser, onDelete, onOffer = null, onComments = null }) {
  const benimki = p.userId === "me";
  const begendim = (p.likes || []).includes("me");
  const kat = p.listing ? CATEGORIES.find((c) => c.id === p.listing.cat) : null;
  const paylas = () =>
    Share.share({ message: `${p.name} · Eksik Var'da 👇\n${p.caption || ""}\n🔗 ${APP_LINK}` }).catch(() => {});

  return (
    <View style={st.kart}>
      {/* kişi satırı */}
      <View style={st.ust}>
        <TouchableOpacity onPress={() => !benimki && onOpenUser(p)} activeOpacity={benimki ? 1 : 0.7}
          style={{ flexDirection: "row", alignItems: "center", gap: 9, flex: 1 }}>
          <Avatar name={p.name} uri={p.avatar} size={34} />
          <Text style={{ fontSize: 13.5, fontWeight: "900", color: C.ink }} numberOfLines={1}>{p.name}</Text>
          <Text style={{ fontSize: 11.5, color: C.faint }}>· {timeAgo(p.createdAt)}</Text>
        </TouchableOpacity>
        {benimki && onDelete && (
          <TouchableOpacity onPress={() => onDelete(p)} style={{ padding: 6 }}>
            <Ionicons name="ellipsis-horizontal" size={18} color={C.faint} />
          </TouchableOpacity>
        )}
      </View>

      {/* kenardan kenara medya */}
      {!!p.video && <VideoBlok uri={p.video} />}
      {!p.video && !!p.image && <Image source={{ uri: p.image }} style={st.medya} resizeMode="cover" />}

      {/* ikon sırası */}
      <View style={st.ikonlar}>
        <TouchableOpacity onPress={() => onLike(p)} style={st.ikon}>
          <Ionicons name={begendim ? "heart" : "heart-outline"} size={26} color={begendim ? "#E0245E" : C.ink} />
        </TouchableOpacity>
        {onComments && (
          <TouchableOpacity onPress={() => onComments(p)} style={st.ikon}>
            <Ionicons name="chatbubble-outline" size={24} color={C.ink} />
          </TouchableOpacity>
        )}
        {!benimki && onOffer && (
          <TouchableOpacity onPress={() => onOffer(p)} style={st.ikon}>
            <Ionicons name="paper-plane-outline" size={24} color={C.ink} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={paylas} style={st.ikon}>
          <Ionicons name="share-social-outline" size={24} color={C.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {p.listing && (
          <TouchableOpacity onPress={() => !benimki && onOpenUser(p)} style={st.vitrinMini}>
            <Text style={{ fontSize: 11, fontWeight: "900", color: C.kit }}>
              {kat ? kat.icon : "🏪"} {t("VİTRİNDE")}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* beğeni + açıklama */}
      {(p.likes || []).length > 0 && (
        <Text style={st.begeni}>{(p.likes || []).length} {t("beğenme")}</Text>
      )}
      {onComments && (p.yorumSayi || 0) > 0 && (
        <TouchableOpacity onPress={() => onComments(p)}>
          <Text style={[st.vitrinAlt, { marginTop: 4 }]}>{p.yorumSayi} {t("yorumun tümünü gör")}</Text>
        </TouchableOpacity>
      )}
      {!!p.caption && (
        <Text style={st.aciklama} numberOfLines={4}>
          <Text style={{ fontWeight: "900" }}>{p.name} </Text>{p.caption}
        </Text>
      )}
      {p.listing && (p.listing.positions || []).length > 0 && (
        <Text style={st.vitrinAlt}>
          {(p.listing.positions || []).map((x) => posLabel(x)).join(" · ")} · ⭐ {p.rating || 0} · %{p.rel || 100} {t("güvenilir")}
        </Text>
      )}
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  kart: { backgroundColor: C.surface, marginHorizontal: -16, marginBottom: 10, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  ust: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9 },
  medya: { width: "100%", height: 380, backgroundColor: "#000" },
  ikonlar: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingTop: 8 },
  ikon: { padding: 5 },
  vitrinMini: { backgroundColor: C.kitSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  begeni: { fontSize: 13, fontWeight: "900", color: C.ink, paddingHorizontal: 15, marginTop: 4 },
  aciklama: { fontSize: 13.5, color: C.ink, lineHeight: 19, paddingHorizontal: 15, marginTop: 3 },
  vitrinAlt: { fontSize: 12, color: C.faint, paddingHorizontal: 15, marginTop: 3 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
