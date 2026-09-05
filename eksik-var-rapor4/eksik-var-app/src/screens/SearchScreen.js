import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Keyboard, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { relInfo, relColor } from "../data";
import { Avatar, Stars, EksikBadge, trLower } from "../components";

export default function SearchScreen({ onSearchUsers, onSearchEvents, suggestions = [], recent = [], onAddRecent, onOpenUser, onOpenEvent }) {
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("kisiler");
  const [results, setResults] = useState([]);
  const [fCat, setFCat] = useState(0); const [fFree, setFFree] = useState(false); const [fLevel, setFLevel] = useState(null);
  const applyFilters = (list) => list.filter((e) => (fCat === 0 || e.cat === fCat) && (!fFree || e.price === 0) && (!fLevel || e.level === fLevel));
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.replace(/^@/, "").trim();
    if (timer.current) clearTimeout(timer.current);
    if (term.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const my = ++seq.current;
    timer.current = setTimeout(async () => {
      try {
        const r = segment === "kisiler" ? await onSearchUsers(term) : await onSearchEvents(term);
        if (my === seq.current) setResults(r || []);
      } catch (e) { if (my === seq.current) setResults([]); }
      finally { if (my === seq.current) setLoading(false); }
    }, 300);
    return () => timer.current && clearTimeout(timer.current);
  }, [q, segment]); // eslint-disable-line

  const openUser = (u) => { Keyboard.dismiss(); onAddRecent && onAddRecent(u); onOpenUser(u); };
  const term = q.replace(/^@/, "").trim();

  const UserRow = ({ u }) => (
    <TouchableOpacity onPress={() => openUser(u)} style={st.row}>
      <Avatar name={u.name} uri={u.avatar} size={44} />
      <View style={{ flex: 1, marginLeft: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }} numberOfLines={1}>{u.name}</Text>
          {u.verified && <Ionicons name="shield-checkmark" size={13} color={C.pitch} />}
        </View>
        <Text style={{ fontSize: 12, color: C.faint }} numberOfLines={1}>
          @{u.username}{u.city ? ` · ${u.district ? u.district + ", " : ""}${u.city}` : ""}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Stars value={u.rating || 0} size={10} />
          <Text style={{ fontSize: 12, fontWeight: "900", color: C.ink }}>{u.rating || "–"}</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: "700", color: relColor(u) }}>{relInfo(u).text}</Text>
      </View>
    </TouchableOpacity>
  );

  const EventRow = ({ e }) => (
    <TouchableOpacity onPress={() => { Keyboard.dismiss(); onOpenEvent(e); }} style={st.row}>
      <View style={st.catBox}><Text style={{ fontSize: 18 }}>{e.cat === 2 ? "🏀" : e.cat === 3 ? "🏐" : e.cat === 4 ? "🎾" : "⚽"}</Text></View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }} numberOfLines={1}>{e.title}</Text>
        <Text style={{ fontSize: 12, color: C.faint }} numberOfLines={1}>{e.venue.split(",")[0]} · {e.district || ""}{e.district ? ", " : ""}{e.city} · {e.date}</Text>
      </View>
      <EksikBadge ev={e} />
    </TouchableOpacity>
  );

  const showEmpty = term.length < 2;

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <View style={st.searchBox}>
          <Ionicons name="search" size={18} color={C.faint} />
          <TextInput
            value={q} onChangeText={setQ} autoCapitalize="none" autoCorrect={false} returnKeyType="search"
            placeholder={segment === "kisiler" ? "Ad veya @kullanıcı adı ara" : "Etkinlik, saha ya da ilçe ara"}
            placeholderTextColor="#9AA79F" style={st.input}
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ("")}><Ionicons name="close-circle" size={18} color={C.faint} /></TouchableOpacity>
          )}
        </View>
        <View style={st.segments}>
          {[["kisiler", "Kişiler"], ["etkinlikler", "Etkinlikler"]].map(([id, label]) => (
            <TouchableOpacity key={id} onPress={() => { setSegment(id); setResults([]); }} style={[st.segBtn, segment === id && st.segOn]}>
              <Text style={{ fontWeight: "800", fontSize: 13, color: segment === id ? C.turf : C.mist }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showEmpty ? (
        <FlatList
          data={[]}
          renderItem={null}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
          ListHeaderComponent={
            <View>
              {segment === "kisiler" && recent.length > 0 && (
                <>
                  <Text style={st.section}>SON ARAMALAR</Text>
                  {recent.map((u) => <UserRow key={"r-" + u.id} u={u} />)}
                </>
              )}
              {segment === "kisiler" && suggestions.length > 0 && (
                <>
                  <Text style={[st.section, { marginTop: recent.length ? 16 : 0 }]}>KADRONDAN KİŞİLER</Text>
                  {suggestions.map((u) => <UserRow key={"s-" + u.id} u={u} />)}
                </>
              )}
              {segment === "etkinlikler" && (
                <View style={st.hint}>
                  <Ionicons name="search-outline" size={30} color={C.gray} />
                  <Text style={{ color: C.faint, fontSize: 13, textAlign: "center", marginTop: 8 }}>
                    Etkinlik adı, saha adı ya da ilçe yaz — Türkiye'nin her yerinden açık talepler.
                  </Text>
                </View>
              )}
              {segment === "kisiler" && recent.length === 0 && suggestions.length === 0 && (
                <View style={st.hint}>
                  <Ionicons name="people-outline" size={30} color={C.gray} />
                  <Text style={{ color: C.faint, fontSize: 13, textAlign: "center", marginTop: 8 }}>Ad ya da @kullanıcı adı yazarak oyuncu bul.</Text>
                </View>
              )}
            </View>
          }
        />
      ) : (
        <FlatList
          data={segment === "etkinlikler" ? applyFilters(results) : results}
          keyExtractor={(x) => x.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 18, paddingBottom: 120 }}
          renderItem={({ item }) => segment === "kisiler" ? <UserRow u={item} /> : <EventRow e={item} />}
          ListHeaderComponent={
            <View>
              {segment === "etkinlikler" && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {[[0, "Tümü"], [1, "⚽"], [2, "🏀"], [3, "🏐"], [4, "🎾"]].map(([id, l]) => (
                    <TouchableOpacity key={id} onPress={() => setFCat(id)} style={[st.fChip, fCat === id && st.fOn]}><Text style={{ fontSize: 12, fontWeight: "800", color: fCat === id ? "#fff" : C.ink }}>{l}</Text></TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => setFFree((v) => !v)} style={[st.fChip, fFree && st.fOn]}><Text style={{ fontSize: 12, fontWeight: "800", color: fFree ? "#fff" : C.ink }}>Ücretsiz</Text></TouchableOpacity>
                  {["Başlangıç", "Orta", "İleri"].map((l) => (
                    <TouchableOpacity key={l} onPress={() => setFLevel((v) => (v === l ? null : l))} style={[st.fChip, fLevel === l && st.fOn]}><Text style={{ fontSize: 12, fontWeight: "800", color: fLevel === l ? "#fff" : C.ink }}>{l}</Text></TouchableOpacity>
                  ))}
                </View>
              )}
              {loading ? <ActivityIndicator color={C.pitch} style={{ marginBottom: 10 }} /> : null}
            </View>
          }
          ListEmptyComponent={!loading ? (
            <View style={st.hint}>
              <Text style={{ fontWeight: "800", color: C.ink }}>"{term}" için sonuç yok</Text>
              <Text style={{ color: C.faint, fontSize: 13, marginTop: 4, textAlign: "center" }}>
                {segment === "kisiler" ? "Kullanıcı adını tam yazmayı dene." : "Başka bir saha ya da ilçe dene."}
              </Text>
            </View>
          ) : null}
        />
      )}
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: C.turf, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  input: { flex: 1, fontSize: 15, color: C.ink, padding: 0 },
  segments: { flexDirection: "row", gap: 6, marginTop: 10 },
  segBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  segOn: { backgroundColor: "#fff" },
  section: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turf, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  catBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.pitchSoft, alignItems: "center", justifyContent: "center" },
  hint: { alignItems: "center", padding: 30 },
  fChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#fff", borderWidth: 1, borderColor: C.line },
  fOn: { backgroundColor: C.turf, borderColor: C.turf },
});

export const matchesQuery = (text, term) => trLower(text).includes(trLower(term));
