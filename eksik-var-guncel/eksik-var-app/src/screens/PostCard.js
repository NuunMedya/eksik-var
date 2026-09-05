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
  return <VideoView player={player} style={st.video} contentFit="cover" nativeControls />;
}

/* Keşfet gönderisi: foto + yazı; vitrin ekliyse kanıtlı özet bloğu.
   props: p, meLiked, onLike, onOpenUser, onDelete (yalnız kendi gönderisi) */
export default function PostCard({ p, onLike, onOpenUser, onDelete, onOffer = null }) {
  const benimki = p.userId === "me";
  const begendim = (p.likes || []).includes("me");
  const kat = p.listing ? CATEGORIES.find((c) => c.id === p.listing.cat) : null;
  return (
    <View style={st.card}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <TouchableOpacity onPress={() => !benimki && onOpenUser(p)} activeOpacity={benimki ? 1 : 0.7}>
          <Avatar name={p.name} uri={p.avatar} size={38} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "900", color: C.ink }} numberOfLines={1}>
            {p.name}{benimki ? "" : ""}
          </Text>
          <Text style={{ fontSize: 11, color: C.faint }}>{timeAgo(p.createdAt)}</Text>
        </View>
        {benimki && onDelete && (
          <TouchableOpacity onPress={() => onDelete(p)} style={{ padding: 6 }}>
            <Ionicons name="trash-outline" size={17} color={C.faint} />
          </TouchableOpacity>
        )}
      </View>

      {!!p.caption && <Text style={{ fontSize: 14, color: C.ink, lineHeight: 20, marginTop: 8 }}>{p.caption}</Text>}
      {!!p.image && <Image source={{ uri: p.image }} style={st.foto} resizeMode="cover" />}
      {!!p.video && <VideoBlok uri={p.video} />}

      {p.listing && (
        <TouchableOpacity onPress={() => !benimki && onOpenUser(p)} activeOpacity={0.85} style={st.vitrin}>
          <Text style={{ fontSize: 16 }}>{kat ? kat.icon : "🏪"}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "900", color: C.turfText }}>
              {t("VİTRİNDE")} · ⭐ {p.listing.rating} · %{p.listing.rel} {t("güvenilir")}
            </Text>
            {(p.listing.positions || []).length > 0 && (
              <Text style={{ fontSize: 12, color: C.faint, marginTop: 1 }} numberOfLines={1}>
                {p.listing.positions.map((x) => posLabel(x)).join(" · ")}
              </Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={15} color={C.kit} />
        </TouchableOpacity>
      )}

      <View style={st.aksiyonlar}>
        <TouchableOpacity onPress={() => onLike(p)} style={[st.aksiyonBtn, begendim && { backgroundColor: "rgba(233,78,55,0.1)" }]}>
          <Ionicons name={begendim ? "heart" : "heart-outline"} size={18} color={begendim ? "#E94E37" : C.faint} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: begendim ? "#E94E37" : C.faint }}>
            {(p.likes || []).length > 0 ? p.likes.length : t("Beğen")}
          </Text>
        </TouchableOpacity>
        {!benimki && onOffer && (
          <TouchableOpacity onPress={() => onOffer(p)} style={[st.aksiyonBtn, { backgroundColor: C.kitSoft }]}>
            <Text style={{ fontSize: 14 }}>💌</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.kit }}>{t("Transfer")}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => Share.share({ message: `${p.name}${p.caption ? `: "${p.caption}"` : ""} — Eksik Var'da. ${APP_LINK}` }).catch(() => {})} style={st.aksiyonBtn}>
          <Ionicons name="share-social-outline" size={17} color={C.faint} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint }}>{t("Paylaş")}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.line },
  foto: { width: "100%", height: 220, borderRadius: 12, marginTop: 10, backgroundColor: C.chalk },
  video: { width: "100%", height: 260, borderRadius: 12, marginTop: 10, backgroundColor: "#000", overflow: "hidden" },
  vitrin: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, backgroundColor: C.kitSoft, borderRadius: 12, borderWidth: 1.5, borderStyle: "dashed", borderColor: C.kit, paddingHorizontal: 10, paddingVertical: 8 },
  aksiyonlar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 12, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10 },
  aksiyonBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 10, paddingVertical: 8, backgroundColor: C.chalk },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
