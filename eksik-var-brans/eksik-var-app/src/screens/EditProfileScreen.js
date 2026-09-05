import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { ILLER, ilceleri } from "../trIlIlce";
import { LEVELS, CATEGORIES, POSITIONS, GUNLER } from "../data";
import { Field, Input, Chip, PickerRow, PickerSheet, Avatar } from "../components";

/* Profili düzenle — bölümlü kart düzeni + gömülü Transfer Pazarı vitrini.
   Vitrin anahtarı açıkken Kaydet, hem profili hem vitrini kaydeder. */
export default function EditProfileScreen({
  user, onBack, onSave, busy = false, error = null,
  marketMine = null, onSaveListing = () => {}, onDropListing = () => {}, onAvatar = null,
  onSaveIdentity = null,
}) {
  const [f, setF] = useState({ name: user.name || "", username: user.username || "", city: user.city || "Ankara", district: user.district || "", level: user.level || "Farketmez", bio: user.bio || "" });
  const [v, setV] = useState(() => marketMine && marketMine.active
    ? { on: true, cat: marketMine.cat, positions: marketMine.positions || [], days: marketMine.days || [], bio: marketMine.bio || "" }
    : { on: false, cat: 1, positions: [], days: [], bio: "" });
  const [picker, setPicker] = useState(null);
  const set = (k) => (x) => setF((s) => ({ ...s, [k]: x }));
  const uname = f.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const valid = f.name.trim().length >= 2 && uname.length >= 3;

  const posList = POSITIONS[v.cat] || [];
  const togglePos = (id) => setV((x) => ({ ...x, positions: x.positions.includes(id) ? x.positions.filter((p) => p !== id) : [...x.positions, id] }));
  const toggleDay = (d) => setV((x) => ({ ...x, days: x.days.includes(d) ? x.days.filter((p) => p !== d) : [...x.days, d].sort() }));

  const kaydet = () => {
    if (v.on) onSaveListing({ cat: v.cat, positions: v.positions, days: v.days, bio: v.bio.trim() });
    else if (marketMine && marketMine.active) onDropListing();
    onSave({ ...f, name: f.name.trim(), username: uname, bio: f.bio.trim() });
  };

  const Sec = ({ icon, title, children, style }) => (
    <View style={[st.sec, style]}>
      <View style={st.secHead}>
        <Text style={{ fontSize: 13 }}>{icon}</Text>
        <Text style={st.secTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.chalk }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}><Ionicons name="chevron-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>{t("Profili düzenle")}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 130 }} keyboardShouldPersistTaps="handled">

        <View style={st.hero}>
          <Avatar name={f.name || user.name} uri={user.avatar} size={62} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: "900", color: C.ink }} numberOfLines={1}>{f.name.trim() || t("Ad Soyad")}</Text>
            <Text style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>@{uname || "…"} · {f.district ? f.district + ", " : ""}{f.city}</Text>
          </View>
          {onAvatar && (
            <TouchableOpacity onPress={onAvatar} style={st.fotoBtn}>
              <Ionicons name="camera-outline" size={14} color={C.turfText} />
              <Text style={{ fontSize: 11, fontWeight: "900", color: C.turfText }}>{t("Değiştir")}</Text>
            </TouchableOpacity>
          )}
        </View>

        <Sec icon="🪪" title={t("KİMLİK")}>
          <Field label={t("Ad Soyad")}><Input value={f.name} onChangeText={set("name")} placeholder={t("Ad Soyad")} /></Field>
          <Field label={t("Kullanıcı adı")}>
            <Input value={f.username} onChangeText={set("username")} autoCapitalize="none" placeholder={t("kullanici_adi")} />
            <Text style={st.hint}>{t("Küçük harf, rakam ve alt çizgi; en az 3 karakter.")}</Text>
          </Field>
        </Sec>

        <Sec icon="📍" title={t("KONUM")}>
          <View style={{ gap: 8 }}>
            <PickerRow label={t("İl")} value={f.city} onPress={() => setPicker("il")} />
            <PickerRow label={t("İlçe")} value={f.district} placeholder={t("İlçe seç")} onPress={() => setPicker("ilce")} />
          </View>
        </Sec>

        <Sec icon="⚽" title={t("OYUN")}>
          <Field label={t("Seviyen")}>
        {onSaveIdentity && (
          <View style={{ marginBottom: 18 }}>
            <Text style={{ fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText, marginBottom: 8 }}>{t("BRANŞIN & MEVKİLERİN")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c.id} onPress={() => onSaveIdentity({ favCat: c.id, positions: [] })}
                  style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7, borderColor: user.favCat === c.id ? C.turf : C.line, backgroundColor: user.favCat === c.id ? C.turf : C.chalk }}>
                  <Text style={{ fontSize: 12, fontWeight: "900", color: user.favCat === c.id ? "#fff" : C.turfText }}>{c.icon} {t(c.name)}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {(POSITIONS[user.favCat] || []).length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {POSITIONS[user.favCat].map((p) => (
                  <TouchableOpacity key={p.id} onPress={() => onSaveIdentity({ favCat: user.favCat, positions: (user.positions || []).includes(p.id) ? user.positions.filter((q) => q !== p.id) : [...(user.positions || []), p.id] })}
                    style={{ borderRadius: 999, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 7, borderColor: (user.positions || []).includes(p.id) ? C.turf : C.line, backgroundColor: (user.positions || []).includes(p.id) ? C.turf : C.chalk }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: (user.positions || []).includes(p.id) ? "#fff" : C.turfText }}>{p.icon} {t(p.label)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
            <View style={st.wrapRow}>
              {LEVELS.map((l) => <Chip key={l} label={t(l)} active={f.level === l} onPress={() => set("level")(l)} />)}
            </View>
          </Field>
          <Field label={t("Kısa tanıtım (isteğe bağlı)")}>
            <Input value={f.bio} onChangeText={set("bio")} placeholder={t("Örn: 10 yıldır halı saha, kaleye de geçerim")} multiline maxLength={140} style={{ minHeight: 64, textAlignVertical: "top" }} />
            <Text style={[st.hint, { textAlign: "right" }]}>{f.bio.length}/140</Text>
          </Field>
        </Sec>

        <Sec icon="🏪" title={t("TRANSFER PAZARI")} style={st.vitrin}>
          <View style={st.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "900", color: C.ink }}>{t("Vitrinde görün")}</Text>
              <Text style={st.hint}>{t("Takım arayanlar akışında kartın çıkar; puanın ve güvenilirliğin otomatik gelir.")}</Text>
            </View>
            <Switch value={v.on} onValueChange={(x) => setV((s) => ({ ...s, on: x }))}
              trackColor={{ true: C.kit, false: C.line }} thumbColor="#fff" />
          </View>
          {v.on && (
            <View>
              <Field label={t("Branş")}>
                <View style={st.wrapRow}>
                  {CATEGORIES.map((c) => (
                    <Chip key={c.id} label={`${c.icon} ${c.name}`} active={v.cat === c.id}
                      onPress={() => setV((x) => ({ ...x, cat: c.id, positions: [] }))} />
                  ))}
                </View>
              </Field>
              {posList.length > 0 && (
                <Field label={t("Mevkilerin")}>
                  <View style={st.wrapRow}>
                    {posList.map((p) => <Chip key={p.id} label={`${p.icon} ${p.label}`} active={v.positions.includes(p.id)} onPress={() => togglePos(p.id)} />)}
                  </View>
                </Field>
              )}
              <Field label={t("Müsait günlerin")}>
                <View style={st.wrapRow}>
                  {GUNLER.map((g, i) => <Chip key={g} label={g} active={v.days.includes(i)} onPress={() => toggleDay(i)} />)}
                </View>
              </Field>
              <Field label={t("Vitrin tanıtımı")}>
                <Input value={v.bio} onChangeText={(x) => setV((s) => ({ ...s, bio: x }))} multiline maxLength={200}
                  placeholder={t("Örn: Hızlıyım, bitiriciyim. Hafta içi akşamları müsaidim.")} style={{ minHeight: 64, textAlignVertical: "top" }} />
                <Text style={[st.hint, { textAlign: "right" }]}>{v.bio.length}/200</Text>
              </Field>
            </View>
          )}
        </Sec>

        {error ? <Text style={{ color: C.kit, fontWeight: "700", fontSize: 12, textAlign: "center" }}>{error}</Text> : null}
      </ScrollView>

      <View style={st.bottomBar}>
        <TouchableOpacity disabled={!valid || busy} onPress={kaydet} style={[st.cta, (!valid || busy) && { opacity: 0.45 }]}>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
            {busy ? t("Kaydediliyor…") : v.on ? t("Kaydet ve vitrine çık") : t("Kaydet")}
          </Text>
        </TouchableOpacity>
      </View>

      <PickerSheet visible={picker === "il"} title={t("İl seç")} items={ILLER} value={f.city} onSelect={(c) => { setF((s) => ({ ...s, city: c, district: "" })); setPicker(null); }} onClose={() => setPicker(null)} placeholder={t("İl ara…")} />
      <PickerSheet visible={picker === "ilce"} title={`${f.city} ilçeleri`} items={ilceleri(f.city)} value={f.district} onSelect={(d) => { set("district")(d); setPicker(null); }} onClose={() => setPicker(null)} placeholder={t("İlçe ara…")} />
    </KeyboardAvoidingView>
  );
}

const mkSt = () => StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  hero: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 },
  fotoBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.pitchSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  sec: { backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 14, marginBottom: 12 },
  secHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  secTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText },
  vitrin: { borderColor: C.kit, borderWidth: 1.5, borderStyle: "dashed" },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", rowGap: 8, columnGap: 8 },
  hint: { fontSize: 11, color: C.faint, marginTop: 4 },
  bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, padding: 14 },
  cta: { backgroundColor: C.pitch, borderRadius: 14, alignItems: "center", paddingVertical: 14 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
