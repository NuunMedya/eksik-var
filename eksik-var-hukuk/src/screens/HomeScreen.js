import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { CATEGORIES, GUNLER_UZUN, districtCounts, sortDistricts } from "../data";
import { ILLER, ilceleri } from "../trIlIlce";
import { Avatar, Stars, SquadDots, EksikBadge, Chip, PickerSheet } from "../components";

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
          <Text style={st.metaText}>{ev.capacity} kadro</Text>
        </View>
        {ev.recurrence === "haftalik" && (
          <View style={st.meta}>
            <Ionicons name="repeat" size={13} color={C.turf} />
            <Text style={[st.metaText, { color: C.turf }]}>Her {GUNLER_UZUN[ev.weekday]}</Text>
          </View>
        )}
      </View>

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
              <Text style={{ fontSize: 11, fontWeight: "700", color: C.pitch }}>%{ev.org.rel}</Text>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen({ user, events, onOpen, onAttendance, onChangeCity, onNotifications, unreadCount = 0 }) {
  const [district, setDistrict] = useState("Tümü");
  const [cat, setCat] = useState(0);
  const [cityPicker, setCityPicker] = useState(false);
  const counts = districtCounts(events, user.city);
  const districts = sortDistricts(ilceleri(user.city), counts);
  const list = events.filter(
    (e) => !e.ended && e.city === user.city && (district === "Tümü" || e.district === district) && (cat === 0 || e.cat === cat)
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

      <View style={{ paddingTop: 10 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18 }}>
          <Chip label="Tüm ilçeler" active={district === "Tümü"} onPress={() => setDistrict("Tümü")} />
          {districts.map((d) => (
            <Chip
              key={d}
              label={counts[d] ? `${d} · ${counts[d]}` : d}
              active={district === d}
              onPress={() => setDistrict(d)}
            />
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <Chip label="Hepsi" active={cat === 0} onPress={() => setCat(0)} />
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={`${c.icon} ${c.name}`} active={cat === c.id} onPress={() => setCat(c.id)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <EventCard ev={item} onOpen={onOpen} />}
        contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
        ListHeaderComponent={
          pendingAttendance.length > 0 ? (
            <View>
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
        ListEmptyComponent={
          <View style={st.empty}>
            <Text style={{ fontWeight: "800", color: C.ink }}>
              {district === "Tümü" ? `${user.city}'da henüz açık talep yok` : `${district}'da açık talep yok`}
            </Text>
            <Text style={{ color: C.faint, fontSize: 13, marginTop: 4, textAlign: "center" }}>
              İlk talebi sen aç — alttaki + ile 30 saniyede yayında.
            </Text>
          </View>
        }
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
  empty: {
    borderWidth: 1.5, borderStyle: "dashed", borderColor: C.line,
    borderRadius: 18, padding: 28, alignItems: "center", marginTop: 8,
  },
});
