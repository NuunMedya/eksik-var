import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { Field, Input, Chip, PickerRow, PickerSheet, BACK_ICON } from "../components";
import { CATEGORIES, nextDates } from "../data";
import { ilceleri } from "../trIlIlce";

/* İşletme (saha sahibi) ekranı: boş saat ilanı ver + ilanlarını yönet.
   Boş saat şehir akışında "🏟️ Boş saat" şeridinde görünür; organizatör "Bu saati al" deyince
   saat/saha/ücret dolu bir maç ilanı açar, saat "alındı" olur, işletmeye bildirim gider. */
const SAATLER = ["17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00", "10:00", "12:00", "14:00", "16:00"];
const SURELER = [[60, "1 saat"], [90, "1,5 saat"], [120, "2 saat"]];

export default function BosSaatScreen({ user, onBack, onList, onCreate, onCancel }) {
  const days = nextDates(14);
  const [liste, setListe] = useState(null);
  const [acik, setAcik] = useState(false);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [ilcePick, setIlcePick] = useState(false);
  const [f, setF] = useState({ venue: user.venueName || "", cat: 1, city: user.city || "Ankara", district: user.district || "", dateISO: days[0].iso, time: "21:00", sure: 60, toplam: "", not: "" });
  const yenile = () => onList().then(setListe).catch(() => setListe([]));
  useEffect(() => { yenile(); }, []);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const gecerli = f.venue.trim().length >= 2 && f.dateISO && f.time;
  const kaydet = async () => {
    if (!gecerli || kaydediliyor) return;
    setKaydediliyor(true);
    try { await onCreate(f); setAcik(false); setF((s) => ({ ...s, toplam: "", not: "" })); await yenile(); } finally { setKaydediliyor(false); }
  };
  const onayli = user.roleStatus === "onayli";

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.ust}>
        <TouchableOpacity onPress={onBack} style={st.geri}><Ionicons name={BACK_ICON} size={22} color={C.ink} /></TouchableOpacity>
        <Text style={st.baslik}>{t("Boş saatlerim")}</Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        {!onayli ? (
          <View style={st.uyari}>
            <Ionicons name="time-outline" size={18} color={C.kit} />
            <Text style={{ flex: 1, fontSize: 13, color: C.ink, lineHeight: 18 }}>{t("İşletme hesabın onay bekliyor. Onaylanınca boş saat ilanı verebilirsin; genellikle 1 gün içinde bakıyoruz.")}</Text>
          </View>
        ) : !acik ? (
          <TouchableOpacity onPress={() => setAcik(true)} activeOpacity={0.9} style={st.yeni}>
            <Ionicons name="add-circle" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>{t("Boş saat ilanı ver")}</Text>
              <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 }}>{t("Dolmayan saatini şehirdeki organizatörlere göster; ilk alan maçını açar.")}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={st.form}>
            <Field label={t("Saha adı")}><Input placeholder={t("ör. Yıldız Halı Saha · Saha 2")} value={f.venue} onChangeText={set("venue")} maxLength={80} /></Field>
            <Field label={t("Spor")}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                {CATEGORIES.map((c) => <Chip key={c.id} label={`${c.icon} ${t(c.name)}`} active={f.cat === c.id} onPress={() => set("cat")(c.id)} />)}
              </View>
            </Field>
            <Field label={t("İlçe")}><PickerRow label={t("İlçe")} value={f.district} onPress={() => setIlcePick(true)} /></Field>
            <Field label={t("Gün")}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={{ flexDirection: "row" }}>
                {days.map((d) => <Chip key={d.iso} label={d.label} active={f.dateISO === d.iso} onPress={() => set("dateISO")(d.iso)} />)}
              </View></ScrollView>
            </Field>
            <Field label={t("Saat")}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                {SAATLER.map((s) => <Chip key={s} label={s} active={f.time === s} onPress={() => set("time")(s)} />)}
              </View>
              <Input placeholder={t("başka saat: 19:30")} value={SAATLER.includes(f.time) ? "" : f.time} onChangeText={(v) => /^\d{2}:\d{2}$/.test(v) && set("time")(v)} style={{ marginTop: 8 }} />
            </Field>
            <Field label={t("Süre")}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                {SURELER.map(([dk, l]) => <Chip key={dk} label={l} active={f.sure === dk} onPress={() => set("sure")(dk)} />)}
              </View>
            </Field>
            <Field label={t("Saha ücreti (toplam, ₺)")}>
              <Input keyboardType="number-pad" placeholder={t("ör. 1800")} value={f.toplam} onChangeText={set("toplam")} />
              <Text style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>{t("Boş kalacağına indirimli yaz — ilan kartında 'kişi başı' olarak da gösterilir.")}</Text>
            </Field>
            <Field label={t("Not (isteğe bağlı)")}><Input placeholder={t("ör. Duş var, otopark ücretsiz, kapora yok")} value={f.not} onChangeText={set("not")} maxLength={200} /></Field>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              <TouchableOpacity onPress={() => setAcik(false)} style={[st.buton, { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line }]}><Text style={{ fontWeight: "800", color: C.faint }}>{t("Vazgeç")}</Text></TouchableOpacity>
              <TouchableOpacity onPress={kaydet} disabled={!gecerli || kaydediliyor} style={[st.buton, { backgroundColor: C.pitch, flex: 2, opacity: gecerli && !kaydediliyor ? 1 : 0.5 }]}>
                <Text style={{ fontWeight: "900", color: "#fff" }}>{kaydediliyor ? t("Kaydediliyor…") : t("Yayınla")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={st.bolum}>{t("İLANLARIM")}</Text>
        {liste === null ? <ActivityIndicator color={C.pitch} style={{ marginTop: 20 }} /> : liste.length === 0 ? (
          <Text style={{ color: C.faint, fontSize: 13, textAlign: "center", marginTop: 16 }}>{t("Henüz boş saat ilanın yok.")}</Text>
        ) : liste.map((s) => (
          <View key={s.id} style={st.satir}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "900", color: C.ink, fontSize: 14 }}>{s.date} · {s.venue}</Text>
              <Text style={{ color: C.faint, fontSize: 12, marginTop: 2 }}>{s.sure} dk{s.toplam ? ` · ${s.toplam}₺` : ""}{s.district ? ` · ${s.district}` : ""}</Text>
            </View>
            {s.durum === "acik" ? (
              <TouchableOpacity onPress={() => onCancel(s.id).then(yenile)} style={st.kucuk}><Text style={{ fontSize: 12, fontWeight: "800", color: C.faint }}>{t("Kaldır")}</Text></TouchableOpacity>
            ) : (
              <View style={[st.kucuk, { backgroundColor: s.durum === "alindi" ? C.pitchSoft : C.chalk, borderColor: "transparent" }]}>
                <Text style={{ fontSize: 12, fontWeight: "900", color: s.durum === "alindi" ? C.pitch : C.faint }}>{s.durum === "alindi" ? t("Alındı ✓") : t("Kaldırıldı")}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <PickerSheet visible={ilcePick} title={t("İlçe")} items={ilceleri(f.city)} value={f.district} onSelect={(v) => { set("district")(v); setIlcePick(false); }} onClose={() => setIlcePick(false)} />
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  ust: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.line },
  geri: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  baslik: { fontSize: 17, fontWeight: "900", color: C.ink },
  uyari: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.kitSoft, borderRadius: 14, padding: 12 },
  yeni: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: C.turf, borderRadius: 16, padding: 14 },
  form: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.line },
  buton: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  bolum: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.faint, marginTop: 22, marginBottom: 8 },
  satir: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.surface, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  kucuk: { borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
