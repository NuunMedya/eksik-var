import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, TextInput, FlatList, Modal, ActivityIndicator, StyleSheet, Platform, KeyboardAvoidingView } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Dimensions, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";

/* Saha/kort seçici: il+ilçe+spor bağlamında havuzdan arar; yoksa haritadan
   iğne bırakıp adlandırır (ortak havuza yazılır) ya da adı elle girer.
   props:
     visible, onClose, cityName, categoryId, categoryName
     onList(q) => Promise<[{id,name,lat,lng}]>
     onAdd(name, lat, lng) => Promise<{id,name,lat,lng}>
     onPick({ name, lat, lng, venueId }) */
export default function VenueSheet({ visible, onClose, cityName, categoryName, onList, onAdd, onPick }) {
  const [mode, setMode] = useState("liste");            // liste | harita | elle
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState(null);                 // { latitude, longitude }
  const [adi, setAdi] = useState("");
  const [busy, setBusy] = useState(false);
  const mapRef = useRef(null);
  const [adres, setAdres] = useState("");
  const [adresDurum, setAdresDurum] = useState(null);   // null | "ariyor" | "yok"
  const ucur = (lat, lng) => {
    const k = { latitude: lat, longitude: lng };
    setPin(k); setAdresDurum(null);
    if (mapRef.current) mapRef.current.animateToRegion({ ...k, latitudeDelta: 0.008, longitudeDelta: 0.008 }, 600);
  };
  const geocode = async (q) => {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=tr&q=${encodeURIComponent(q)}`, { headers: { "User-Agent": "EksikVar/1.0" } });
    const js = await r.json();
    return js && js[0] ? { lat: Number(js[0].lat), lng: Number(js[0].lon) } : null;
  };
  const adresBul = async () => {
    const q = adres.trim();
    if (q.length < 3) return;
    Keyboard.dismiss();
    setAdresDurum("ariyor");
    try {
      // 1) önce kendi saha havuzumuz: isim eşleşirse iğne + ad otomatik
      const bizim = await Promise.resolve(onList(q)).catch(() => []);
      const v = (bizim || []).find((x) => x.lat != null && x.lng != null);
      if (v) { ucur(v.lat, v.lng); setAdi(v.name); return; }
      // 2) adres çözücü: önce il ekiyle, sonra ham haliyle
      const g = (await geocode(q + ", " + cityName)) || (await geocode(q));
      if (g) ucur(g.lat, g.lng);
      else setAdresDurum("yok");
    } catch { setAdresDurum("yok"); }
  };

  const yukle = useCallback((aranan) => {
    setLoading(true);
    Promise.resolve(onList(aranan)).then((r) => setRows(r || [])).catch(() => setRows([])).finally(() => setLoading(false));
  }, [onList]);

  useEffect(() => { if (visible) { setMode("liste"); setQ(""); setPin(null); setAdi(""); yukle(""); } }, [visible, yukle]);

  const sec = (v) => { onPick({ name: v.name, lat: v.lat ?? null, lng: v.lng ?? null, venueId: v.id || null }); onClose(); };

  const kaydetVeSec = async () => {
    const ad = adi.trim();
    if (!ad || busy) return;
    setBusy(true);
    try {
      const v = await onAdd(ad, pin ? pin.latitude : null, pin ? pin.longitude : null);
      sec(v || { name: ad, lat: pin && pin.latitude, lng: pin && pin.longitude });
    } catch {
      // havuza yazılamasa bile seçim kaybolmasın
      sec({ name: ad, lat: pin && pin.latitude, lng: pin && pin.longitude });
    } finally { setBusy(false); }
  };

  // Harita başlangıcı: listedeki ilk konumlu saha, yoksa Türkiye geneli
  const ilkKonumlu = rows.find((r) => r.lat != null && r.lng != null);
  const region = ilkKonumlu
    ? { latitude: ilkKonumlu.lat, longitude: ilkKonumlu.lng, latitudeDelta: 0.15, longitudeDelta: 0.15 }
    : { latitude: 39.1, longitude: 35.4, latitudeDelta: 12, longitudeDelta: 12 };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={st.headRow}>
            <Text style={st.title}>{mode === "harita" ? t("Haritadan işaretle") : t("Sahayı seç")}</Text>
            <TouchableOpacity onPress={onClose} style={{ padding: 6 }}><Ionicons name="close" size={20} color={C.faint} /></TouchableOpacity>
          </View>
          <Text style={st.sub}>{cityName} · {categoryName}</Text>

          {mode === "liste" && (
            <View style={{ flex: 1 }}>
              <View style={st.searchBox}>
                <Ionicons name="search" size={16} color={C.faint} />
                <TextInput value={q} onChangeText={(x) => { setQ(x); yukle(x); }} placeholder={t("Saha adı ara…")}
                  placeholderTextColor={C.placeholder} style={st.searchInput} autoCorrect={false} />
              </View>
              {loading ? <ActivityIndicator color={C.pitch} style={{ marginTop: 20 }} /> : (
                <FlatList
                  data={rows}
                  keyExtractor={(v, i) => String(v.id || i)}
                  keyboardShouldPersistTaps="handled"
                  style={{ flexGrow: 0 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => sec(item)} style={st.row}>
                      <Ionicons name="location" size={16} color={item.source === "user" ? C.kit : C.pitch} />
                      <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: C.ink }} numberOfLines={1}>{item.name}</Text>
                      <Ionicons name="chevron-forward" size={15} color={C.gray} />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <Text style={{ textAlign: "center", color: C.faint, fontSize: 13, marginTop: 18, paddingHorizontal: 20 }}>
                      {t("Bu bölgede kayıtlı saha yok — haritadan işaretleyin, herkes için eklenmiş olur.")}
                    </Text>
                  }
                />
              )}
              <View style={st.footerRow}>
                <TouchableOpacity onPress={() => setMode("harita")} style={[st.footBtn, { backgroundColor: C.turf }]}>
                  <Ionicons name="map" size={16} color="#fff" />
                  <Text style={st.footBtnText}>{t("Haritadan işaretle")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setMode("elle")} style={[st.footBtn, { backgroundColor: C.chalk, borderWidth: 1, borderColor: C.line }]}>
                  <Ionicons name="create-outline" size={16} color={C.turfText} />
                  <Text style={[st.footBtnText, { color: C.turfText }]}>{t("Adı elle yaz")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mode === "harita" && (
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
                <TextInput value={adres} onChangeText={setAdres} onSubmitEditing={adresBul} returnKeyType="search"
                  placeholder={t("Adres yaz (ör. Kızılay meydanı)")} placeholderTextColor={C.placeholder}
                  style={{ flex: 1, backgroundColor: C.chalk, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: C.ink }} />
                <TouchableOpacity onPress={adresBul} style={{ backgroundColor: C.pitch, borderRadius: 12, paddingHorizontal: 14, justifyContent: "center" }}>
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{adresDurum === "ariyor" ? "…" : t("Bul")}</Text>
                </TouchableOpacity>
              </View>
              {adresDurum === "yok" && <Text style={{ fontSize: 12, color: "#E24B4A", marginBottom: 6 }}>{t("Bulunamadı — işletme adları çıkmayabilir; cadde/mahalle yaz ya da haritaya dokun")}</Text>}
              <MapView ref={mapRef} style={st.map} initialRegion={region}
                onPress={(e) => setPin(e.nativeEvent.coordinate)}>
                {pin && <Marker coordinate={pin} draggable onDragEnd={(e) => setPin(e.nativeEvent.coordinate)} />}
              </MapView>
              <Text style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>
                {pin ? t("İğne bırakıldı — sahanın adını yazın:") : t("Sahanın olduğu noktaya dokunun.")}
              </Text>
              <TextInput value={adi} onChangeText={setAdi} placeholder={t("Örn: Yıldız Halı Saha")}
                placeholderTextColor={C.placeholder} style={st.nameInput} maxLength={80} />
              <View style={st.footerRow}>
                <TouchableOpacity onPress={() => setMode("liste")} style={[st.footBtn, { backgroundColor: C.chalk, borderWidth: 1, borderColor: C.line }]}>
                  <Text style={[st.footBtnText, { color: C.turfText }]}>{t("Geri")}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={!pin || !adi.trim() || busy} onPress={kaydetVeSec}
                  style={[st.footBtn, { backgroundColor: C.kit, opacity: !pin || !adi.trim() || busy ? 0.4 : 1 }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={st.footBtnText}>{busy ? t("Kaydediliyor…") : t("Kaydet ve seç")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {mode === "elle" && (
            <View>
              <TextInput value={adi} onChangeText={setAdi} placeholder={t("Örn: Yıldız Halı Saha, Çankaya")}
                placeholderTextColor={C.placeholder} style={st.nameInput} maxLength={80} autoFocus />
              <View style={st.footerRow}>
                <TouchableOpacity onPress={() => setMode("liste")} style={[st.footBtn, { backgroundColor: C.chalk, borderWidth: 1, borderColor: C.line }]}>
                  <Text style={[st.footBtnText, { color: C.turfText }]}>{t("Geri")}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={!adi.trim() || busy} onPress={kaydetVeSec}
                  style={[st.footBtn, { backgroundColor: C.pitch, opacity: !adi.trim() || busy ? 0.4 : 1 }]}>
                  <Text style={st.footBtnText}>{t("Kullan")}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const mkSt = () => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: { maxHeight: "88%", minHeight: 380, backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: 26 },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 17, fontWeight: "900", color: C.ink },
  sub: { fontSize: 12, color: C.faint, marginTop: 2, marginBottom: 10 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.chalk, borderRadius: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: C.line },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: C.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.line },
  footerRow: { flexDirection: "row", gap: 10, marginTop: 12 },
  footBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 12 },
  footBtnText: { color: "#fff", fontWeight: "900", fontSize: 13 },
  map: { height: Math.round(Dimensions.get("window").height * 0.5), minHeight: 320, borderRadius: 14, marginTop: 4 },
  nameInput: { backgroundColor: C.chalk, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, color: C.ink, marginTop: 10 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
