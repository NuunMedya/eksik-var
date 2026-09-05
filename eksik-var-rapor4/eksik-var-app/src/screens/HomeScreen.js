import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, Alert, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { CATEGORIES, GUNLER_UZUN, districtCounts, sortDistricts, needsSummary, matchesMyPositions, venueModeLabel, costModeLabel, formatLabel, relInfo, relColor, eventPhase } from "../data";
import { ILLER, ilceleri } from "../trIlIlce";
import { Avatar, Stars, SquadDots, EksikBadge, Chip, PickerSheet } from "../components";

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
                  <Text style={{ fontSize: 9, fontWeight: "800", color: C.kit }}>SENİN</Text>
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
            <Ionicons name="repeat" size={13} color={C.turf} />
            <Text style={[st.metaText, { color: C.turf }]}>Her {GUNLER_UZUN[ev.weekday]}</Text>
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
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.turf }}>Organizatör: Sen</Text>
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

export default function HomeScreen({ user, events, onOpen, onAttendance, onChangeCity, onNotifications, unreadCount = 0, blockedIds = [], onCreate = () => {}, onBringTeam = () => {}, loading = false, offline = false }) {
  const [district, setDistrict] = useState("Tümü");
  const [cat, setCat] = useState(0);
  const [mineOnly, setMineOnly] = useState(false);
  const [kind, setKind] = useState("oyuncu");
  const [cityPicker, setCityPicker] = useState(false);
  const myPos = user.positions || [];
  const counts = districtCounts(events, user.city);
  const allDistricts = sortDistricts(ilceleri(user.city), counts);
  const [districtPicker, setDistrictPicker] = useState(false);
  const mineFirst = user.district ? [user.district, ...allDistricts.filter((d) => d !== user.district)] : allDistricts;
  const districts = mineFirst.slice(0, 6);
  const upcomingMine = events.filter((e) => (e.joined || e.mine) && !e.ended && e.status !== "iptal" && e.status !== "tamamlandi").slice(0, 3);
  const list = events.filter(
    (e) => !e.ended && e.status !== "iptal" && (e.kind || "oyuncu") === kind && e.city === user.city && !(e.org && blockedIds.includes(e.org.id)) &&
      (district === "Tümü" || e.district === district) && (cat === 0 || e.cat === cat) &&
      (!mineOnly || matchesMyPositions(e, myPos))
  );
  const pendingAttendance = events.filter((e) => e.mine && e.ended && e.status !== "tamamlandi");

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={st.brand}>
            EKSİK <Text style={{ color: C.kit }}>VAR</Text>
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
            <Text style={{ color: C.mist, fontSize: 12 }}>Bugün hangi kadroyu tamamlıyoruz?</Text>
          </View>
          <TouchableOpacity onPress={() => setCityPicker(true)} style={st.cityBtn}>
            <Ionicons name="location" size={13} color="#fff" />
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 13 }}>{user.city}</Text>
            <Ionicons name="chevron-down" size={13} color={C.mist} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={st.kindRow}>
        {[["oyuncu", "👤 Eksik oyuncu"], ["rakip", "🆚 Rakip arayanlar"]].map(([id, label]) => (
          <TouchableOpacity key={id} onPress={() => setKind(id)} style={[st.kindBtn, kind === id && st.kindOn]}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: kind === id ? C.turf : C.faint }}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ paddingTop: 6 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18 }}>
          <Chip label="Tüm ilçeler" active={district === "Tümü"} onPress={() => setDistrict("Tümü")} />
          {districts.map((d) => (
            <Chip
              key={d}
              label={`${d === user.district ? "📍 " : ""}${d}${counts[d] ? ` · ${counts[d]}` : ""}`}
              active={district === d}
              onPress={() => setDistrict(d)}
            />
          ))}
          {allDistricts.length > districts.length && (
            <Chip label={district !== "Tümü" && !districts.includes(district) ? `${district} ▾` : "Diğer ilçeler ▾"} active={district !== "Tümü" && !districts.includes(district)} onPress={() => setDistrictPicker(true)} />
          )}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8 }}>
          {myPos.length > 0 && kind === "oyuncu" && (
            <TouchableOpacity onLongPress={() => Alert.alert("Bana uygun", "Yalnızca mevkilerinden birine açık yer olan ya da serbest kontenjanı olan ilanları gösterir. Mevkilerini Profil'den değiştirebilirsin.")} onPress={() => setMineOnly((m) => !m)}>
              <Chip label={`🧤 Bana uygun`} active={mineOnly} onPress={() => setMineOnly((m) => !m)} />
            </TouchableOpacity>
          )}
          <Chip label="Hepsi" active={cat === 0} onPress={() => setCat(0)} />
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={`${c.icon} ${c.name}`} active={cat === c.id} onPress={() => setCat(c.id)} />
          ))}
        </ScrollView>
      </View>

      {offline && (
        <View style={st.offline}><Ionicons name="cloud-offline-outline" size={14} color="#fff" /><Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Bağlantı yok — son veriler gösteriliyor</Text></View>
      )}
      {loading && list.length === 0 ? <View style={{ padding: 18 }}><Skeleton /></View> : null}
      <FlatList
        data={loading && list.length === 0 ? [] : list}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => (item.kind === "rakip" ? <RakipCard ev={item} onOpen={onOpen} /> : <EventCard ev={item} onOpen={onOpen} />)}
        contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
        ListHeaderComponent={
          (pendingAttendance.length > 0 || upcomingMine.length > 0) ? (
            <View>
              {upcomingMine.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={st.sectionMini}>YAKLAŞAN MAÇLARIN</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                    {upcomingMine.map((e) => (
                      <TouchableOpacity key={"up-" + e.id} onPress={() => onOpen(e.id)} style={[st.upCard, eventPhase(e) === "bugun" && { borderColor: C.kit }]}>
                        <Text style={{ fontSize: 11, fontWeight: "900", color: eventPhase(e) === "bugun" ? C.kit : C.pitch }}>{eventPhase(e) === "bugun" ? "BUGÜN" : e.date}</Text>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: C.ink, marginTop: 2 }} numberOfLines={1}>{e.title}</Text>
                        <Text style={{ fontSize: 11, color: C.faint }} numberOfLines={1}>{e.venue ? e.venue.split(",")[0] : e.district}{e.mine ? " · organizatörsün" : ""}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {pendingAttendance.map((e) => (
                <TouchableOpacity key={e.id} onPress={() => onAttendance(e.id)} style={st.attBanner}>
                  <View style={st.attIcon}>
                    <Ionicons name="clipboard-outline" size={18} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "900", fontSize: 13, color: "#fff" }}>Yoklama bekliyor</Text>
                    <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)" }} numberOfLines={1}>
                      {e.title} · {e.date} — gelmeyenleri işaretle, maçı tamamla
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#fff" />
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={loading ? null :
          <View style={st.empty}>
            <Text style={{ fontWeight: "800", color: C.ink }}>
              {kind === "rakip" ? "Rakip arayan takım yok" : district === "Tümü" ? `${user.city}'da henüz açık talep yok` : `${district}'da açık talep yok`}
            </Text>
            <Text style={{ color: C.faint, fontSize: 13, marginTop: 4, textAlign: "center" }}>
              {kind === "rakip" ? "İlk rakip ilanını sen aç; ilindeki takım kaptanlarına bildirim gider." : "Yakınında ilan açıldığında sana bildirim gelir. Beklemek yerine:"}
            </Text>
            <TouchableOpacity onPress={onBringTeam} style={st.emptyBtn}>
              <Ionicons name="people" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>Ekibini getir</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onCreate} style={[st.emptyBtn, { backgroundColor: C.kit }]}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{kind === "rakip" ? "Rakip ilanı aç" : "Eksik talebi aç"}</Text>
            </TouchableOpacity>
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
        placeholder="İlçe ara…"
      />
      <PickerSheet
        visible={cityPicker}
        title="İl değiştir"
        items={ILLER}
        value={user.city}
        onSelect={(c) => { onChangeCity(c); setDistrict("Tümü"); setCityPicker(false); }}
        onClose={() => setCityPicker(false)}
        placeholder="İl ara…"
      />
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: C.turf, paddingHorizontal: 18, paddingTop: 14, paddingBottom: 16 },
  brand: { color: "#fff", fontSize: 19, fontWeight: "900", fontStyle: "italic", letterSpacing: -0.5 },
  card: {
    backgroundColor: "#fff", borderRadius: 18, padding: 14, marginBottom: 12,
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
  kindBtn: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, backgroundColor: "#fff", borderWidth: 1, borderColor: C.line },
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
  sectionMini: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turf, marginBottom: 6 },
  upCard: { width: 170, backgroundColor: "#fff", borderRadius: 14, padding: 10, borderWidth: 1.5, borderColor: C.pitchSoft },
  offline: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.kit, paddingVertical: 6 },
  emptyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.turf, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 22, marginTop: 12, alignSelf: "stretch" },
  empty: {
    borderWidth: 1.5, borderStyle: "dashed", borderColor: C.line,
    borderRadius: 18, padding: 28, alignItems: "center", marginTop: 8,
  },
});
