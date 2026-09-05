import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, Alert, StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import SponsorCard from "./SponsorCard";
import { injectSponsors } from "../sponsors";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { CATEGORIES, GUNLER_UZUN, districtCounts, sortDistricts, needsSummary, matchesMyPositions, venueModeLabel, costModeLabel, formatLabel, relInfo, relColor, eventPhase } from "../data";
import { ILLER, ilceleri } from "../trIlIlce";
import { Avatar, Stars, SquadDots, EksikBadge, Chip, PickerSheet } from "../components";
import MarketCard from "./MarketCard";
import { marketFilter, posLabel } from "../data";

function RakipCard({ ev, onOpen }) {
  const cat = CATEGORIES.find((c) => c.id === ev.cat);
  return (
    <TouchableOpacity onPress={() => onOpen(ev.id)} style={[st.card, { borderLeftWidth: 4, borderLeftColor: C.kit }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={st.teamBox}><Text style={{ fontSize: 20 }}>{cat ? cat.icon : "⚽"}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.title} numberOfLines={1}>{ev.teamName}</Text>
          <Text style={st.sub}>{formatLabel(ev.cat, ev.format)} · {ev.level} · {ev.date}</Text>
        </View>
        <EksikBadge ev={ev} />
      </View>
      <View style={[st.metaRow, { marginTop: 10 }]}>
        <View style={st.meta}><Ionicons name="location-outline" size={13} color={C.faint} /><Text style={st.metaText}>{ev.venue ? ev.venue.split(",")[0] + " · " : ""}{venueModeLabel(ev.venueMode)}</Text></View>
        <View style={st.meta}><Ionicons name="cash-outline" size={13} color={C.faint} /><Text style={st.metaText}>{costModeLabel(ev.costMode)}</Text></View>
        {ev.org && (<View style={st.meta}><Ionicons name="shield-checkmark" size={13} color={relColor(ev.org)} /><Text style={st.metaText}>{relInfo(ev.org).text}</Text></View>)}
      </View>
    </TouchableOpacity>
  );
}

function EventCard({ ev, onOpen }) {
  const cat = CATEGORIES.find((c) => c.id === ev.cat);
  const done = ev.status === "doldu";
  return (
    <TouchableOpacity
      onPress={() => onOpen(ev.id)}
      activeOpacity={0.85}
      style={[st.card, done && !ev.joined && { opacity: 0.65 }]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flexDirection: "row", gap: 10, flex: 1, paddingRight: 8 }}>
          <View style={st.catBox}>
            <Text style={{ fontSize: 20 }}>{cat?.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={st.title}>{ev.title}</Text>
              {ev.mine && (
                <View style={st.mineTag}>
                  <Text style={{ fontSize: 9, fontWeight: "800", color: C.kit }}>{t("SENİN")}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
              <Ionicons name="location-outline" size={12} color={C.faint} />
              <Text style={st.sub}>{ev.venue.split(",")[0]} · {ev.district || ev.city}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 6 }}>
                <View style={[st.pill, { backgroundColor: ev.price === 0 ? C.pitchSoft : C.chalk }]}><Text style={[st.pillText, ev.price === 0 && { color: C.pitch }]}>{ev.price === 0 ? "Ücretsiz" : `${ev.price}₺/kişi`}</Text></View>
                {ev.level && ev.level !== "Farketmez" && <View style={[st.pill, { backgroundColor: C.chalk }]}><Text style={st.pillText}>{ev.level}</Text></View>}
              </View>
            </View>
          </View>
        </View>
        <EksikBadge ev={ev} />
      </View>

      <View style={{ flexDirection: "row", gap: 14, marginTop: 10 }}>
        <View style={st.meta}>
          <Ionicons name="calendar-outline" size={13} color={C.faint} />
          <Text style={st.metaText}>{ev.date}</Text>
        </View>
        <View style={st.meta}>
          <Ionicons name="cash-outline" size={13} color={C.faint} />
          <Text style={st.metaText}>{ev.price === 0 ? "Ücretsiz" : `${ev.price}₺/kişi`}</Text>
        </View>
        <View style={st.meta}>
          <Ionicons name="people-outline" size={13} color={C.faint} />
          <Text style={st.metaText}>{ev.format ? `${formatLabel(ev.cat, ev.format)} · ` : ""}{ev.capacity} kişi</Text>
        </View>
        {ev.recurrence === "haftalik" && (
          <View style={st.meta}>
            <Ionicons name="repeat" size={13} color={C.turfText} />
            <Text style={[st.metaText, { color: C.turfText }]}>Her {GUNLER_UZUN[ev.weekday]}</Text>
          </View>
        )}
      </View>

      {needsSummary(ev) && (
        <Text style={{ fontSize: 12, fontWeight: "800", color: C.kit, marginTop: 8 }}>{needsSummary(ev)}</Text>
      )}
      {ev.status === "doldu" && !ev.joined && (
        <Text style={{ fontSize: 12, fontWeight: "700", color: C.faint, marginTop: 8 }}>
          ⏳ {ev.myWaitlist ? "Yedek listesindesin" : ev.waitlistCount ? `${ev.waitlistCount} yedek bekliyor · yedek olabilirsin` : "Yedek olabilirsin"}
        </Text>
      )}
      <View style={{ marginTop: 10 }}>
        <SquadDots capacity={ev.capacity} needed={ev.needed} filled={ev.filled} />
      </View>

      <View style={st.footer}>
        {ev.mine ? (
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.turfText }}>{t("Organizatör: Sen")}</Text>
        ) : (
          <>
            <Avatar name={ev.org.name} size={22} />
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.ink }}>{ev.org.name}</Text>
            <Stars value={ev.org.rating} size={10} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
              <Ionicons name="shield-checkmark" size={11} color={C.pitch} />
              <Text style={{ fontSize: 11, fontWeight: "700", color: C.pitch }}>{relInfo(ev.org).text}</Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

function Skeleton() {
  return (
    <View>
      {[0, 1, 2].map((k) => (
        <View key={k} style={[st.card, { opacity: 0.6 }]}>
          <View style={{ height: 14, width: "55%", backgroundColor: C.line, borderRadius: 6 }} />
          <View style={{ height: 10, width: "40%", backgroundColor: C.line, borderRadius: 6, marginTop: 8 }} />
          <View style={{ height: 10, width: "70%", backgroundColor: C.line, borderRadius: 6, marginTop: 14 }} />
        </View>
      ))}
    </View>
  );
}

export default function HomeScreen({ user, events, onOpen, onAttendance, onChangeCity, onNotifications, unreadCount = 0, blockedIds = [], onCreate = () => {}, onBringTeam = () => {}, loading = false, offline = false, sponsors = [], onSponsor = () => {}, market = [], onOpenPlayer = () => {}, onEditListing = () => {}, onOfferPlayer = null, initialKind = "oyuncu" , onCreateRakip = () => {} }) {
  const [district, setDistrict] = useState("Tümü");
  const [cat, setCat] = useState(0);
  const secCats = (user.favCats && user.favCats.length ? user.favCats : [1, 2, 3, 4]);
  const [mineOnly, setMineOnly] = useState(false);
  const [kind, setKind] = useState(initialKind);
  const [cityPicker, setCityPicker] = useState(false);
  const myPos = user.positions || [];
  const counts = districtCounts(events, user.city);
  const allDistricts = sortDistricts(ilceleri(user.city), counts);
  const [districtPicker, setDistrictPicker] = useState(false);
  const mineFirst = user.district ? [user.district, ...allDistricts.filter((d) => d !== user.district)] : allDistricts;
  const districts = mineFirst.slice(0, 6);
  const [pazarQ, setPazarQ] = useState("");
  const kucult = (x) => (x || "").toLocaleLowerCase("tr");
  const pazarAra = (rows) => {
    const q = kucult(pazarQ.trim());
    if (q.length < 2) return rows;
    return rows.filter((p) => [p.name, p.bio, p.district, (p.positions || []).map(posLabel).join(" ")]
      .some((alan) => kucult(alan).includes(q)));
  };
  const upcomingMine = events.filter((e) => (e.joined || e.mine) && !e.ended && e.status !== "iptal" && e.status !== "tamamlandi").slice(0, 3);
  const list = events.filter(
    (e) => !e.ended && e.status !== "iptal" && (e.kind || "oyuncu") === kind && e.city === user.city && !(e.org && blockedIds.includes(e.org.id)) &&
      (district === "Tümü" || e.district === district) && (cat === 0 ? secCats.includes(e.cat) : e.cat === cat) &&
      (!mineOnly || matchesMyPositions(e, myPos))
  );

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={st.brand}>
            {t("EKSİK")} <Text style={{ color: C.kit }}>VAR</Text>
          </Text>
          <TouchableOpacity onPress={onNotifications} style={{ padding: 4 }}>
            <Ionicons name={unreadCount > 0 ? "notifications" : "notifications-outline"} size={22} color={unreadCount > 0 ? "#fff" : C.mist} />
            {unreadCount > 0 && (
              <View style={st.bellBadge}>
                <Text style={{ color: "#fff", fontSize: 9, fontWeight: "900" }}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: 8 }}>
          <View>
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Selam {user.name.split(" ")[0]} 👋</Text>
            <Text style={{ color: C.mist, fontSize: 12 }}>{t("Bugün hangi kadroyu tamamlıyoruz?")}</Text>
          </View>
          <TouchableOpacity onPress={() => setCityPicker(true)} style={st.cityBtn}>
            <Ionicons name="location" size={13} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{user.city}</Text>
            <Ionicons name="chevron-down" size={13} color={C.mist} />
          </TouchableOpacity>
        </View>
      </View>

      {kind !== "oyuncu" && (
        <View style={st.kindRow}>
          <TouchableOpacity onPress={() => setKind("oyuncu")} style={st.kindBtn}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: C.faint }}>◀ {t("İlanlar")}</Text>
          </TouchableOpacity>
          <View style={[st.kindBtn, st.kindOn]}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: C.turfText }}>{kind === "rakip" ? t("home.opponents") : t("home.market")}</Text>
          </View>
        </View>
      )}
      <View style={{ paddingTop: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18 }}>
          <Chip label={t("home.allDistricts")} active={district === "Tümü"} onPress={() => setDistrict("Tümü")} />
          {districts.map((d) => (
            <Chip
              key={d}
              label={`${d === user.district ? "📍 " : ""}${d}${counts[d] ? ` · ${counts[d]}` : ""}`}
              active={district === d}
              onPress={() => setDistrict(d)}
            />
          ))}
          {allDistricts.length > districts.length && (
            <Chip label={district !== "Tümü" && !districts.includes(district) ? `${district} ▾` : t("home.otherDistricts")} active={district !== "Tümü" && !districts.includes(district)} onPress={() => setDistrictPicker(true)} />
          )}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8 }}>
          {myPos.length > 0 && kind === "oyuncu" && (
            <TouchableOpacity onLongPress={() => Alert.alert(t("Bana uygun"), t("Yalnızca mevkilerinden birine açık yer olan ya da serbest kontenjanı olan ilanları gösterir. Mevkilerini Profil'den değiştirebilirsin."))} onPress={() => setMineOnly((m) => !m)}>
              <Chip label={t("home.forMe")} active={mineOnly} onPress={() => setMineOnly((m) => !m)} />
            </TouchableOpacity>
          )}
          <Chip label={t("home.all")} active={cat === 0} onPress={() => setCat(0)} />
          {CATEGORIES.filter((c) => secCats.includes(c.id)).map((c) => (
            <Chip key={c.id} label={`${c.icon} ${t(c.name)}`} active={cat === c.id} onPress={() => setCat(c.id)} />
          ))}
        </ScrollView>
      </View>

      {offline && (
        <View style={st.offline}><Ionicons name="cloud-offline-outline" size={14} color="#fff" /><Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>{t("home.offline")}</Text></View>
      )}
      {loading && list.length === 0 ? <View style={{ padding: 18 }}><Skeleton /></View> : null}
      <FlatList
        data={kind === "pazar" ? injectSponsors(pazarAra(marketFilter(market, { cat, district })), sponsors) : loading && list.length === 0 ? [] : injectSponsors(list, sponsors)}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => item.sponsorItem
          ? <SponsorCard s={item.s} onPress={() => onSponsor(item.s)} />
          : kind === "pazar" ? <MarketCard p={item} onOpen={() => onOpenPlayer(item)} onOffer={onOfferPlayer} />
          : item.kind === "rakip" ? <RakipCard ev={item} onOpen={onOpen} /> : <EventCard ev={item} onOpen={onOpen} />}
        contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
        ListHeaderComponent={
          <View>
            {kind === "pazar" && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface, borderRadius: 14, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, marginBottom: 12 }}>
                <Ionicons name="search" size={16} color={C.faint} />
                <TextInput value={pazarQ} onChangeText={setPazarQ} placeholder={t("İsim, mevki ya da kelime ara…")}
                  placeholderTextColor={C.placeholder} style={{ flex: 1, paddingVertical: 10, fontSize: 13, color: C.ink }} />
                {pazarQ.length > 0 && (
                  <TouchableOpacity onPress={() => setPazarQ("")}><Ionicons name="close-circle" size={16} color={C.faint} /></TouchableOpacity>
                )}
              </View>
            )}
            {
          kind === "oyuncu" && upcomingMine.length > 0 ? (
            <View>
              {upcomingMine.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={st.sectionMini}>{t("home.upcoming")}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {upcomingMine.map((e) => (
                      <TouchableOpacity key={"up-" + e.id} onPress={() => onOpen(e.id)} style={[st.upCard, eventPhase(e) === "bugun" && { borderColor: C.kit }]}>
                        <Text style={{ fontSize: 11, fontWeight: "900", color: eventPhase(e) === "bugun" ? C.kit : C.pitch }}>{eventPhase(e) === "bugun" ? t("home.today") : e.date}</Text>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: C.ink, marginTop: 2 }} numberOfLines={1}>{e.title}</Text>
                        <Text style={{ fontSize: 11, color: C.faint }} numberOfLines={1}>{e.venue ? e.venue.split(",")[0] : e.district}{e.mine ? " · organizatörsün" : ""}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          ) : null
        }
            {kind === "oyuncu" && (
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
                <TouchableOpacity onPress={onCreate} activeOpacity={0.85}
                  style={{ flex: 1, backgroundColor: C.pitchSoft, borderWidth: 1.5, borderColor: C.pitch, borderRadius: 16, padding: 13, gap: 3 }}>
                  <Text style={{ fontSize: 22 }}>🧤</Text>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: C.pitch }}>{t("Oyuncu arıyorum")}</Text>
                  <Text style={{ fontSize: 11, color: C.faint }}>{t("Kadronu tamamla")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onCreateRakip} activeOpacity={0.85}
                  style={{ flex: 1, backgroundColor: C.kitSoft, borderWidth: 1.5, borderColor: C.kit, borderRadius: 16, padding: 13, gap: 3 }}>
                  <Text style={{ fontSize: 22 }}>🆚</Text>
                  <Text style={{ fontSize: 14, fontWeight: "900", color: C.kit }}>{t("Rakip arıyorum")}</Text>
                  <Text style={{ fontSize: 11, color: C.faint }}>{t("Takımına rakip bul")}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={loading ? null :
          <View>
          {sponsors.filter((x) => x && x.active !== false).slice(0, 1).map((x) => (
            <SponsorCard key={x.id} s={x} compact onPress={() => onSponsor(x)} />
          ))}
          <View style={st.empty}>
            <Text style={{ fontWeight: "800", color: C.ink }}>
              {kind === "pazar" ? t("Takım arayan oyuncu yok") : kind === "rakip" ? "Rakip arayan takım yok" : district === "Tümü" ? `${user.city}'da henüz açık talep yok` : `${district}'da açık talep yok`}
            </Text>
            <Text style={{ color: C.faint, fontSize: 13, marginTop: 4, textAlign: "center" }}>
              {kind === "pazar" ? t("İlk vitrini sen aç; puanın ve güvenilirliğin kartında hazır.") : kind === "rakip" ? "İlk rakip ilanını sen aç; ilindeki takım kaptanlarına bildirim gider." : "Yakınında ilan açıldığında sana bildirim gelir. Beklemek yerine:"}
            </Text>
            <TouchableOpacity onPress={kind === "pazar" ? onEditListing : onCreate} style={[st.emptyBtn, { backgroundColor: C.kit }]}>
              <Ionicons name={kind === "pazar" ? "storefront-outline" : "add"} size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{kind === "pazar" ? t("Vitrine çık") : kind === "rakip" ? t("home.openOpponent") : t("home.openRequest")}</Text>
            </TouchableOpacity>
          </View>
          </View>
        }
      />

      <PickerSheet
        visible={districtPicker}
        title={`${user.city} ilçeleri`}
        items={allDistricts.map((d) => ({ label: d, sub: counts[d] ? `${counts[d]} etkinlik` : undefined }))}
        value={district}
        onSelect={(d) => { setDistrict(d); setDistrictPicker(false); }}
        onClose={() => setDistrictPicker(false)}
        placeholder={t("İlçe ara…")}
      />
      <PickerSheet
        visible={cityPicker}
        title={t("İl değiştir")}
        items={ILLER}
        value={user.city}
        onSelect={(c) => { onChangeCity(c); setDistrict("Tümü"); setCityPicker(false); }}
        onClose={() => setCityPicker(false)}
        placeholder={t("İl ara…")}
      />
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  brand: { color: "#fff", fontSize: 19, fontWeight: "900", fontStyle: "italic", letterSpacing: -0.5 },
  card: {
    backgroundColor: C.surface, borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: C.line,
  },
  catBox: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: C.pitchSoft,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontWeight: "800", fontSize: 15, color: C.ink },
  mineTag: { backgroundColor: C.kitSoft, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2 },
  sub: { fontSize: 12, color: C.faint },
  meta: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontWeight: "600", color: C.faint },
  footer: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12,
    borderTopWidth: 1, borderTopColor: C.line, paddingTop: 10,
  },
  kindRow: { flexDirection: "row", gap: 6, paddingHorizontal: 18, paddingTop: 10 },
  kindBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  kindOn: { backgroundColor: C.pitchSoft, borderColor: C.pitch },
  teamBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.kitSoft, alignItems: "center", justifyContent: "center" },
  bellBadge: {
    position: "absolute", top: -2, right: -4, backgroundColor: C.kit, borderRadius: 8,
    minWidth: 16, height: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: C.turf,
  },
  cityBtn: {
    flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
  },
  attBanner: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.kit,
    borderRadius: 16, padding: 12, marginBottom: 12,
  },
  attIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontSize: 11, fontWeight: "800", color: C.ink },
  sectionMini: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText, marginBottom: 6 },
  upCard: { width: 170, backgroundColor: C.surface, borderRadius: 14, padding: 10, borderWidth: 1.5, borderColor: C.pitchSoft },
  offline: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.kit, paddingVertical: 6 },
  emptyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.turf, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22, marginTop: 12, alignSelf: "stretch" },
  empty: {
    borderWidth: 1.5, borderStyle: "dashed", borderColor: C.line,
    borderRadius: 18, padding: 28, alignItems: "center", marginTop: 8,
  },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
