import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Keyboard, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { ilceleri } from "../trIlIlce";
import { C, onThemeChange } from "../theme";
import { relInfo, relColor, sortDistricts } from "../data";
import { Avatar, Stars, EksikBadge, trLower, Chip } from "../components";
import PostCard from "./PostCard";

export default function SearchScreen({ onSearchUsers, onSearchEvents, suggestions = [], recent = [], onAddRecent, onOpenUser, onOpenEvent, posts = [], onLikePost = () => {}, onDeletePost = null, onCompose = () => {}, onOfferPost = null, onCommentsPost = null, onEditPost = null, onArchivePost = null, cityName = "" }) {
  const [q, setQ] = useState("");
  const [segment, setSegment] = useState("kisiler");
  const [results, setResults] = useState([]);
  const [postFiltre, setPostFiltre] = useState("hepsi");
  const [postIlce, setPostIlce] = useState("Tümü");
  const [fCat, setFCat] = useState(0); const [fFree, setFFree] = useState(false); const [fLevel, setFLevel] = useState(null);
  const applyFilters = (list) => list.filter((e) => (fCat === 0 || e.cat === fCat) && (!fFree || e.price === 0) && (!fLevel || e.level === fLevel));
  const [loading, setLoading] = useState(false);
  const [hata, setHata] = useState(null);
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
        setHata(null);
        const r = segment === "kisiler" ? await onSearchUsers(term) : await onSearchEvents(term);
        if (my === seq.current) setResults(r || []);
      } catch (e) { if (my === seq.current) { setResults([]); setHata((e && e.message) || String(e)); } }
      finally { if (my === seq.current) setLoading(false); }
    }, 300);
    return () => timer.current && clearTimeout(timer.current);
  }, [q, segment]);  

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
            placeholderTextColor={C.placeholder} style={st.input}
          />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ("")}><Ionicons name="close-circle" size={18} color={C.faint} /></TouchableOpacity>
          )}
        </View>
        <View style={st.segments}>
          {[["kisiler", "Kişiler"], ["etkinlikler", "Etkinlikler"]].map(([id, label]) => (
            <TouchableOpacity key={id} onPress={() => { setSegment(id); setResults([]); }} style={[st.segBtn, segment === id && st.segOn]}>
              <Text style={{ fontWeight: "800", fontSize: 13, color: segment === id ? C.turfText : C.mist }}>{label}</Text>
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
                  <Text style={st.section}>{t("SON ARAMALAR")}</Text>
                  {recent.map((u) => <UserRow key={"r-" + u.id} u={u} />)}
                </>
              )}
              {segment === "etkinlikler" && (
                <View style={st.hint}>
                  <Ionicons name="search-outline" size={30} color={C.gray} />
                  <Text style={{ color: C.faint, fontSize: 13, textAlign: "center", marginTop: 8 }}>
                    {t("Etkinlik adı, saha adı ya da ilçe yaz — Türkiye'nin her yerinden açık talepler.")}
                  </Text>
                </View>
              )}
              {segment === "kisiler" && (
                <View style={{ marginTop: recent.length || suggestions.length ? 18 : 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <Text style={st.section}>{t("KEŞFET")}</Text>
                    <TouchableOpacity onPress={onCompose} style={st.composeBtn}>
                      <Ionicons name="add" size={15} color="#fff" />
                      <Text style={{ color: "#fff", fontSize: 12, fontWeight: "900" }}>{t("Paylaş")}</Text>
                    </TouchableOpacity>
                  </View>
                  {(() => {
                    const sayilar = {};
                    posts.forEach((p) => { if (p.district) sayilar[p.district] = (sayilar[p.district] || 0) + 1; });
                    const sirali = sortDistricts(ilceleri(cityName), sayilar).filter((d) => sayilar[d]);
                    return sirali.length > 0 ? (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                        <Chip label={t("Tüm ilçeler")} active={postIlce === "Tümü"} onPress={() => setPostIlce("Tümü")} />
                        {sirali.map((d) => (
                          <Chip key={d} label={`${d} · ${sayilar[d]}`} active={postIlce === d} onPress={() => setPostIlce(d)} />
                        ))}
                      </ScrollView>
                    ) : null;
                  })()}
                  <View style={{ flexDirection: "row", marginBottom: 10 }}>
                    <Chip label={t("Hepsi")} active={postFiltre === "hepsi"} onPress={() => setPostFiltre("hepsi")} />
                    <Chip label={"\u{1F3AF} " + t("Oyuncu vitrini")} active={postFiltre === "vitrin"} onPress={() => setPostFiltre("vitrin")} />
                    <Chip label={"\u{1F4F8} " + t("Paylaşım")} active={postFiltre === "paylasim"} onPress={() => setPostFiltre("paylasim")} />
                  </View>
                  {(() => { const gp = posts.filter((p) => (postFiltre === "hepsi" ? true : postFiltre === "vitrin" ? !!p.listing : !p.listing) && (postIlce === "Tümü" || p.district === postIlce)); return gp.length === 0 ? (
                    <View style={st.hint}>
                      <Ionicons name="megaphone-outline" size={30} color={C.gray} />
                      <Text style={{ color: C.faint, fontSize: 13, textAlign: "center", marginTop: 8 }}>
                        {t("Henüz paylaşım yok — ilk gönderiyi sen at, kendini tanıt!")}
                      </Text>
                    </View>
                  ) : gp.map((p) => (
                    <PostCard key={p.id} p={p} onLike={onLikePost} onDelete={onDeletePost} onOffer={onOfferPost}
                      onComments={onCommentsPost} onEdit={onEditPost} onArchive={onArchivePost}
                      onOpenUser={(x) => onOpenUser({ id: x.userId, name: x.name })} />
                  )); })()}
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
                  <TouchableOpacity onPress={() => setFFree((v) => !v)} style={[st.fChip, fFree && st.fOn]}><Text style={{ fontSize: 12, fontWeight: "800", color: fFree ? "#fff" : C.ink }}>{t("Ücretsiz")}</Text></TouchableOpacity>
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
              {!!hata && <Text style={{ color: "#E24B4A", fontSize: 12, fontWeight: "800", textAlign: "center", marginBottom: 8 }}>⚠ {hata}</Text>}
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

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, paddingHorizontal: 18, paddingTop: 12, paddingBottom: 12 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  input: { flex: 1, fontSize: 15, color: C.ink, padding: 0 },
  segments: { flexDirection: "row", gap: 6, marginTop: 10 },
  segBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.12)" },
  segOn: { backgroundColor: C.surface },
  section: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText, marginBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  catBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.pitchSoft, alignItems: "center", justifyContent: "center" },
  hint: { alignItems: "center", padding: 30 },
  fChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  fOn: { backgroundColor: C.turf, borderColor: C.turf },
  composeBtn: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: C.kit, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 6 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });

export const matchesQuery = (text, term) => trLower(text).includes(trLower(term));
