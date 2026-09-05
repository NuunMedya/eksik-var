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

/* Keşfet gönderisi — Instagram dili:
   üstte kişi satırı · kenardan kenara medya · altta ikon sırası · beğeni · kalın isimli açıklama.
   props: p, onLike, onOpenUser, onDelete, onOffer */
export default function PostCard({ p, onLike, onOpenUser, onDelete, onOffer = null, onMessage = null, onComments = null, onEdit = null, onArchive = null }) {
  const benimki = p.userId === "me";
  const begendim = (p.likes || []).includes("me");
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

      {/* transfer vitrini kartı */}
      {p.listing && (
        <View style={st.vitrin}>
          <View style={st.vitrinSerit}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 11, letterSpacing: 0.8 }}>
              {"\u{1F3AF} "}{t("TRANSFER VİTRİNİ")} · {(CATEGORIES.find((k) => k.id === p.listing.cat) || {}).icon || ""} {t((CATEGORIES.find((k) => k.id === p.listing.cat) || {}).name || "")}
            </Text>
          </View>
          <View style={{ padding: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Avatar name={p.name} uri={p.avatar} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "900", fontSize: 15.5, color: C.ink }}>{p.name}</Text>
                <Text style={{ fontSize: 12, color: C.faint }}>
                  {"\u{1F4CD} "}{[p.listing.district, p.listing.city].filter(Boolean).join(", ") || t("Konum gizli")}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 12.5, fontWeight: "900", color: C.star }}>{"\u2B50 "}{p.listing.rating || 0}</Text>
                <Text style={{ fontSize: 11, fontWeight: "800", color: C.turfText }}>%{p.listing.rel} {t("güvenilir")}</Text>
              </View>
            </View>
            {!!p.listing.level && p.listing.level !== "Farketmez" && (
              <View style={{ alignSelf: "flex-start", backgroundColor: C.kitSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 }}>
                <Text style={{ fontSize: 11.5, fontWeight: "900", color: C.kit }}>{"\u{1F3C5} "}{t(p.listing.level)}</Text>
              </View>
            )}
            {(p.listing.positions || []).length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {(p.listing.positions || []).map((x) => (
                  <View key={x} style={{ backgroundColor: C.pitchSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: C.turfText }}>{posIcon(x)} {posLabel(x)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      )}

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

        <TouchableOpacity onPress={paylas} style={st.ikon}>
          <Ionicons name="share-social-outline" size={24} color={C.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {!benimki && p.listing && onOffer && (
          <TouchableOpacity onPress={() => onOffer(p)} style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.kit, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Text style={{ fontSize: 13 }}>{"\u{1F48C}"}</Text>
            <Text style={{ fontSize: 12.5, fontWeight: "900", color: "#fff" }}>{t("Teklif gönder")}</Text>
          </TouchableOpacity>
        )}
        {!benimki && !p.listing && onMessage && (
          <TouchableOpacity onPress={() => onMessage(p)} style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: C.turf, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 }}>
            <Text style={{ fontSize: 13 }}>{"\u{1F4AC}"}</Text>
            <Text style={{ fontSize: 12.5, fontWeight: "900", color: "#fff" }}>{t("Mesaj")}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* beğeni + açıklama */}
      {((p.likes || []).length > 0 || (p.yorumSayi || 0) > 0) && (
        <Text style={st.begeni}>
          {(p.likes || []).length > 0 ? `${(p.likes || []).length} ${t("beğenme")}` : ""}
          {(p.likes || []).length > 0 && (p.yorumSayi || 0) > 0 ? "  ·  " : ""}
          {(p.yorumSayi || 0) > 0 ? `${p.yorumSayi} ${t("yorum")}` : ""}
        </Text>
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
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  vitrin: { marginHorizontal: 12, marginBottom: 8, borderRadius: 16, borderWidth: 1.5, borderColor: C.kit, overflow: "hidden", backgroundColor: C.surface },
  vitrinSerit: { backgroundColor: C.kit, paddingVertical: 7, alignItems: "center" },
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
