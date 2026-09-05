import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, ActivityIndicator, StyleSheet, ScrollView, Linking, Alert, Platform, Keyboard } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { CATEGORIES } from "../data";

/* Sahalar 2.0 — tam ekran harita: branş çipleri, arama, 📍 konum, alt saha kartı,
   uzun-basışla saha ekleme. props sözleşmesi korunur:
   cat, onCat, visible, onClose, cityName, categoryName, onList(q), onAdd(name,lat,lng), onPick({name,lat,lng,venueId}) */
const ANKARA = { latitude: 39.93, longitude: 32.85, latitudeDelta: 0.25, longitudeDelta: 0.25 };
const km = (a, b) => {
  const R = 6371, d2r = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * d2r, dLng = (b.longitude - a.longitude) * d2r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * d2r) * Math.cos(b.latitude * d2r) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

export default function VenueSheet({ cat = null, onCat = null, visible, onClose, cityName, categoryName, onList, onAdd, onPick, favoriler = [], onFav = null }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState([]);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [secili, setSecili] = useState(null);
  const [listeAcik, setListeAcik] = useState(false);
  const [benim, setBenim] = useState(null);
  const mapRef = useRef(null);
  const gorunen = q.trim()
    ? rows.filter((v) => (v.name || "").toLocaleLowerCase("tr").includes(q.trim().toLocaleLowerCase("tr")))
    : rows;
  useEffect(() => {
    if (q.trim() && gorunen.length >= 1 && mapRef.current) {
      const v = gorunen.find((x) => x.lat > 35 && x.lat < 43);
      if (!v) return;
      mapRef.current.animateToRegion({ latitude: v.lat, longitude: v.lng, latitudeDelta: 0.05, longitudeDelta: 0.05 }, 500);
    }
  }, [q]);
  const pinli = gorunen.filter((v) => v.lat > 35 && v.lat < 43 && v.lng > 25 && v.lng < 46);
  const katIkon = (CATEGORIES.find((c) => c.id === cat) || {}).icon || "📍";

  useEffect(() => {
    if (!visible) return;
    let iptal = false;
    setYukleniyor(true);
    Promise.resolve(onList ? onList(q) : [])
      .then((r) => { if (!iptal) {
        const temiz = (r || []).map((v) => ({ ...v, lat: Number(v.lat), lng: Number(v.lng) }))
          ;
        const gorulen = new Set();
        const tekil = temiz.filter((v) => { const k = String(v.id); if (gorulen.has(k)) return false; gorulen.add(k); return true; });
        setRows(tekil); setSecili(null);
      } })
      .catch(() => {})
      .finally(() => { if (!iptal) setYukleniyor(false); });
    return () => { iptal = true; };
  }, [visible, cat]);

  const konumaGit = async () => {
    try {
      const izin = await Location.requestForegroundPermissionsAsync();
      if (!izin.granted) { Alert.alert("📍 " + t("Konum izni"), t("Yakınındaki sahaları görmek için Ayarlar'dan konum izni ver.")); return; }
      const p = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const nokta = { latitude: p.coords.latitude, longitude: p.coords.longitude };
      setBenim(nokta);
      mapRef.current && mapRef.current.animateToRegion({ ...nokta, latitudeDelta: 0.06, longitudeDelta: 0.06 }, 600);
    } catch { /* sessiz */ }
  };

  const yolTarifi = (v) => {
    const url = Platform.OS === "ios"
      ? `http://maps.apple.com/?daddr=${v.lat},${v.lng}&dirflg=d`
      : `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`;
    Linking.openURL(url).catch(() => {});
  };

  const sahaEkle = (e) => {
    if (!onAdd) return;
    const { latitude, longitude } = e.nativeEvent.coordinate;
    Alert.prompt && Alert.prompt("📍 " + t("Yeni saha"), t("Bu noktadaki sahanın adını yaz — ortak havuza eklenir."), [
      { text: t("Vazgeç"), style: "cancel" },
      { text: t("Ekle"), onPress: async (ad) => {
        const isim = (ad || "").trim(); if (isim.length < 3) return;
        try {
          const v = await onAdd(isim, latitude, longitude);
          if (v && isFinite(Number(v.lat))) {
            const yeni = { ...v, lat: Number(v.lat), lng: Number(v.lng) };
            setRows((l) => l.some((x) => String(x.id) === String(yeni.id))
              ? l.map((x) => String(x.id) === String(yeni.id) ? yeni : x)
              : [...l, yeni]);
            setSecili(yeni);
          }
        } catch (e) {
          Alert.alert("📍 " + t("Saha eklenemedi"), (e && e.message) || t("Bilinmeyen hata — tekrar dener misin?"));
        }
      } },
    ], "plain-text");
  };


  if (!visible) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: C.chalk }}>
        {/* üst bar */}
        <View style={st.header}>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>🗺 {t("Sahalar")}{cityName ? " · " + cityName : ""}</Text>
            <Text style={{ color: C.mist, fontSize: 11 }}>{gorunen.length} {t("saha")} · {t("uzun bas, yeni saha ekle")}</Text>
          </View>
          {yukleniyor && <ActivityIndicator color="#fff" />}
        </View>

        {/* branş çipleri + arama */}
        {onCat && (
          <View style={{ backgroundColor: C.pitchDark, paddingBottom: 10 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
              {CATEGORIES.map((k) => (
                <TouchableOpacity key={k.id} onPress={() => onCat(k.id)}
                  style={[st.cip, cat === k.id && { backgroundColor: "#fff" }]}>
                  <Text style={{ fontSize: 13, fontWeight: "800", color: cat === k.id ? C.pitchDark : "#fff" }}>{k.icon} {t(k.name)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={st.aramaKutu}>
          <Ionicons name="search" size={16} color={C.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder={t("Saha adı ara…")}
            placeholderTextColor={C.placeholder} style={{ flex: 1, fontSize: 14, color: C.ink, paddingVertical: 8 }} returnKeyType="search" onSubmitEditing={Keyboard.dismiss} />
          {q.length > 0 && (
            <TouchableOpacity onPress={() => setQ("")}><Ionicons name="close-circle" size={16} color={C.faint} /></TouchableOpacity>
          )}
        </View>

        {favoriler.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ maxHeight: 44 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 8, paddingTop: 8 }}>
            {favoriler.map((f) => (
              <TouchableOpacity key={"f" + f.name} onPress={() => {
                Keyboard.dismiss();
                if (f.category_id && onCat && f.category_id !== cat) onCat(f.category_id);
                if (f.lat > 35 && f.lat < 43 && mapRef.current) {
                  setSecili({ id: f.venue_id || "fav-" + f.name, name: f.name, lat: f.lat, lng: f.lng });
                  mapRef.current.animateToRegion({ latitude: f.lat, longitude: f.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 500);
                }
              }} style={st.favCip}>
                <Text style={{ fontSize: 12.5, fontWeight: "900", color: "#7A5800" }}>⭐ {f.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* arama sonuç listesi */}
        {(q.trim().length > 0 || listeAcik) && (
          <View style={st.sonucKutu}>
            {gorunen.slice(0, 8).map((v) => {
              const konumlu = v.lat > 35 && v.lat < 43;
              return (
                <TouchableOpacity key={"s" + v.id} style={st.sonucSatir}
                  onPress={() => {
                    Keyboard.dismiss();
                    if (konumlu) {
                      setSecili(v);
                      mapRef.current && mapRef.current.animateToRegion({ latitude: v.lat, longitude: v.lng, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 500);
                    } else {
                      Alert.alert("📍 " + v.name, t("Bu saha havuzda ama haritada yeri yok. Sahanın olduğu noktaya uzun basıp AYNI ADLA ekle — kayıt çiftlenmez, yerine oturur."));
                    }
                  }}>
                  <Text style={{ fontSize: 15 }}>{konumlu ? katIkon : "❓"}</Text>
                  <Text style={{ flex: 1, fontSize: 13.5, fontWeight: "800", color: C.ink }} numberOfLines={1}>{v.name}</Text>
                  {!konumlu && <Text style={{ fontSize: 10.5, fontWeight: "800", color: C.kit }}>{t("konumu yok")}</Text>}
                  {konumlu && <Ionicons name="navigate" size={14} color={C.pitch} />}
                </TouchableOpacity>
              );
            })}
            {gorunen.length === 0 && (
              <Text style={{ fontSize: 12.5, color: C.faint, padding: 10 }}>{t("Eşleşen saha yok — haritada uzun basıp havuza ekleyebilirsin.")}</Text>
            )}
          </View>
        )}

        {pinli.length === 0 && gorunen.length > 0 && !q.trim() && !listeAcik && (
          <TouchableOpacity onPress={() => setListeAcik(true)} style={st.bant}>
            <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#7A5800", flex: 1 }}>
              {gorunen.length} {t("saha havuzda ama haritada yeri işaretsiz")}
            </Text>
            <Text style={{ fontSize: 12.5, fontWeight: "900", color: C.turfText }}>📋 {t("Listeyi aç")}</Text>
          </TouchableOpacity>
        )}
        {listeAcik && !q.trim() && (
          <TouchableOpacity onPress={() => setListeAcik(false)} style={[st.bant, { backgroundColor: C.pitchSoft }]}>
            <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.turfText, flex: 1 }}>{t("Konumsuz sahalar — yerlerine oturtmak için uzun-bas yöntemini kullan")}</Text>
            <Ionicons name="close" size={16} color={C.turfText} />
          </TouchableOpacity>
        )}

        {/* harita */}
        <MapView ref={mapRef} style={{ flex: 1 }} initialRegion={ANKARA}
          showsUserLocation={!!benim} onLongPress={(e) => { Keyboard.dismiss(); sahaEkle(e); }} onPress={(e) => { Keyboard.dismiss(); if (e.nativeEvent.action !== "marker-press") setSecili(null); }}>
          {pinli.map((v) => (
            <Marker key={String(v.id)} coordinate={{ latitude: v.lat, longitude: v.lng }} onPress={() => setSecili(v)}>
              <View pointerEvents="none" style={[st.pin, secili && secili.id === v.id && st.pinSecili]}>
                <Text style={{ fontSize: secili && secili.id === v.id ? 26 : 20 }}>{katIkon}</Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* elle yazma kapısı (yalnız seçici modda) */}
        {onPick && (
          <TouchableOpacity onPress={() => {
            Alert.prompt && Alert.prompt("✍️ " + t("Saha adını yaz"),
              t("Haritada bulamadıysan adıyla kaydet — konumu daha sonra uzun-basışla iğnelenebilir."), [
              { text: t("Vazgeç"), style: "cancel" },
              { text: t("Kaydet ve seç"), onPress: async (ad) => {
                const isim = (ad || "").trim(); if (isim.length < 3) return;
                try {
                  const v = onAdd ? await onAdd(isim, null, null) : { name: isim };
                  onPick({ name: (v && v.name) || isim, lat: v && isFinite(Number(v.lat)) ? Number(v.lat) : null, lng: v && isFinite(Number(v.lng)) ? Number(v.lng) : null, venueId: (v && v.id) || null });
                  onClose();
                } catch (e) { Alert.alert("📍 " + t("Saha eklenemedi"), (e && e.message) || ""); }
              } },
            ], "plain-text");
          }} style={st.elleBar}>
            <Text style={{ fontSize: 12.5, fontWeight: "800", color: C.turfText }}>{t("Sahayı bulamadın mı?")} <Text style={{ fontWeight: "900" }}>✍️ {t("Adını elle yaz")}</Text></Text>
          </TouchableOpacity>
        )}

        {/* konum düğmesi */}
        <TouchableOpacity onPress={konumaGit} style={st.konumBtn}>
          <Ionicons name="locate" size={22} color={C.pitchDark} />
        </TouchableOpacity>

        {/* alt saha kartı */}
        {secili && (
          <View style={st.altKart}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={st.kartIkon}><Text style={{ fontSize: 22 }}>{katIkon}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: "900", color: C.ink }} numberOfLines={1}>{secili.name}</Text>
                <Text style={{ fontSize: 12, color: C.faint }}>
                  {benim ? km(benim, { latitude: secili.lat, longitude: secili.lng }).toFixed(1) + " km · " : ""}{categoryName || t("Saha")}
                </Text>
              </View>
              {onFav && (
                <TouchableOpacity onPress={() => onFav(secili, cat, favoriler.some((f) => f.name === secili.name))} style={{ padding: 4 }}>
                  <Ionicons name={favoriler.some((f) => f.name === secili.name) ? "star" : "star-outline"} size={21} color={C.star || "#E7B416"} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => setSecili(null)} style={{ padding: 4 }}>
                <Ionicons name="close" size={18} color={C.faint} />
              </TouchableOpacity>
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <TouchableOpacity onPress={() => yolTarifi(secili)} style={[st.kartBtn, { backgroundColor: C.chalk }]}>
                <Ionicons name="navigate-outline" size={16} color={C.turfText} />
                <Text style={{ fontSize: 13, fontWeight: "900", color: C.turfText }}>{t("Yol tarifi")}</Text>
              </TouchableOpacity>
              {onPick && (
                <TouchableOpacity onPress={() => { onPick({ name: secili.name, lat: secili.lat, lng: secili.lng, venueId: secili.id }); onClose(); }}
                  style={[st.kartBtn, { backgroundColor: C.turf, flex: 1.2 }]}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={{ fontSize: 13, fontWeight: "900", color: "#fff" }}>{t("Bu sahayı seç")}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.pitchDark, paddingTop: 56, paddingBottom: 10, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", gap: 8 },
  cip: { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.5)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  favCip: { backgroundColor: "#FFF6DC", borderWidth: 1, borderColor: "#F0D98C", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  bant: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.star, marginHorizontal: 12, marginTop: 6, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  sonucKutu: { backgroundColor: C.surface, marginHorizontal: 12, marginTop: 6, borderRadius: 14, borderWidth: 1, borderColor: C.line, overflow: "hidden" },
  sonucSatir: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line },
  aramaKutu: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.surface, marginHorizontal: 12, marginTop: -0.5, borderRadius: 0, borderBottomLeftRadius: 14, borderBottomRightRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderTopWidth: 0, borderColor: C.line },
  pin: { backgroundColor: C.surface, borderRadius: 999, borderWidth: 3, borderColor: C.pitch, padding: 7, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 5 },
  pinSecili: { borderColor: C.kit, backgroundColor: "#FFF3E8" },
  elleBar: { position: "absolute", left: 12, right: 72, bottom: 130, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  konumBtn: { position: "absolute", right: 14, bottom: 130, width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
  altKart: { position: "absolute", left: 12, right: 12, bottom: 24, backgroundColor: C.surface, borderRadius: 20, padding: 14, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  kartIkon: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.pitchSoft, alignItems: "center", justifyContent: "center" },
  kartBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 11 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
