import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { CATEGORIES, nextDates, TIMES, GUNLER_UZUN, fmtEventDate, POSITIONS, VENUE_MODES, COST_MODES, sportFormats, formatPlayers, inferFormat, DEFAULT_FORMAT } from "../data";
import { ILLER, ilceleri } from "../trIlIlce";
import { Field, Input, Chip, PickerRow, PickerSheet } from "../components";
import VenueSheet from "./VenueSheet";

export default function CreateScreen({ user, onBack, onCreate, initial = null, preset = null, repeat = false, onListVenues = null, onAddVenue = null }) {
  const days = nextDates(14);
  const editing = !!initial && !repeat;
  const [f, setF] = useState(() => initial ? {
    title: initial.title, cat: initial.cat, city: initial.city, district: initial.district || "", venue: initial.venue,
    dateISO: initial.dateISO || days[0].iso, weekday: initial.weekday != null ? initial.weekday : days[0].weekday, time: initial.time || "21:00",
    recurrence: initial.recurrence || "yok", weeks: 8, needs: initial.needs || {},
    capacity: String(initial.capacity), needed: String(initial.needed), price: String(initial.price), level: initial.level, desc: initial.desc || "",
    kind: initial.kind || "oyuncu", teamName: initial.teamName || user.teamName || "", format: initial.format || inferFormat(initial.cat, initial.capacity), offlineRegulars: String(initial.offlineRegulars || 0),
    venueMode: initial.venueMode || "bizde", costMode: initial.costMode || "yari_yariya",
    venueLat: initial.venueLat ?? null, venueLng: initial.venueLng ?? null, venueId: initial.venueId || null,
  } : {
    title: "", cat: user.favCat || 1, city: user.city || "Ankara", district: user.district || "", venue: "",
    dateISO: days[0].iso, weekday: days[0].weekday, time: "21:00",
    recurrence: "yok", weeks: 8, needs: {},
    capacity: "14", needed: "2", price: "150", level: "Farketmez", desc: "",
    kind: "oyuncu", teamName: user.teamName || "", format: DEFAULT_FORMAT[1], venueMode: "bizde", costMode: "yari_yariya", offlineRegulars: "0",
    ...(preset === "ekip" ? { title: "", recurrence: "haftalik", weeks: 0, needed: "2", offlineRegulars: "10" } : {}),
    ...(preset === "rakip" ? { kind: "rakip", capacity: "7", needed: "1" } : {}),
  });
  const ekip = preset === "ekip";
  const formats = sportFormats(f.cat);
  const pickFormat = (id) => setF((s) => {
    const players = formatPlayers(s.cat, id) || Number(s.capacity);
    const cap = s.kind === "rakip" ? Math.max(1, Math.round(players / 2)) : players;
    const needed = Math.min(Number(s.needed) || 1, Math.max(1, cap - 1));
    return { ...s, format: id, capacity: String(cap), needed: String(needed), needs: {} };
  });
  const rakip = f.kind === "rakip";
  const [step, setStep] = useState(1);
  const step1Ok = rakip ? (f.teamName.trim() && f.district && (f.venueMode === "sizde" || f.venue.trim())) : (f.title.trim() && f.venue.trim() && f.district);
  const STEPS = ["Ne · nerede · ne zaman", "Kadro ve detaylar", "Özet ve yayın"];
  const posList = POSITIONS[Number(f.cat)] || [];
  const specified = Object.values(f.needs).reduce((a, b) => a + b, 0);
  const freeSlots = Math.max(0, Number(f.needed) - specified);
  const bump = (id, d) => setF((s) => {
    const cur = s.needs[id] || 0; const next = Math.max(0, cur + d);
    const total = Object.entries(s.needs).reduce((a, [k, v]) => a + (k === id ? 0 : v), 0) + next;
    if (total > Number(s.needed)) return s;
    const needs = { ...s.needs }; if (next === 0) delete needs[id]; else needs[id] = next;
    return { ...s, needs };
  });
  const [picker, setPicker] = useState(null);
  const [venueSheet, setVenueSheet] = useState(false);
  const pickVenue = (v) => setF((x) => ({ ...x, venue: v.name, venueLat: v.lat ?? null, venueLng: v.lng ?? null, venueId: v.venueId || null }));
  const VenueRow = () => (
    <TouchableOpacity onPress={() => (onListVenues ? setVenueSheet(true) : null)} activeOpacity={0.8}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.chalk, borderRadius: 12, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12, paddingVertical: 12 }}>
      <Ionicons name="location" size={16} color={f.venue ? C.pitch : C.faint} />
      <Text style={{ flex: 1, fontSize: 14, fontWeight: f.venue ? "800" : "400", color: f.venue ? C.ink : C.placeholder }} numberOfLines={1}>
        {f.venue || t("Sahayı seç")}
      </Text>
      {f.venueLat != null && <Ionicons name="pin" size={14} color={C.kit} />}
      <Ionicons name="chevron-down" size={15} color={C.faint} />
    </TouchableOpacity>
  );
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const tooMany = Number(f.needed) > Number(f.capacity);
  const valid = rakip
    ? f.teamName.trim() && f.district && f.dateISO && f.time && (f.venueMode === "sizde" || f.venue.trim())
    : f.title.trim() && f.venue.trim() && f.district && f.dateISO && f.time && Number(f.needed) > 0 && !tooMany;
  const submit = () => onCreate(Object.assign(rakip
    ? { ...f, title: f.title.trim() || `${f.format} rakip · ${GUNLER_UZUN[f.weekday]} ${f.time}`, needed: "1", capacity: String(Math.max(1, Math.round((formatPlayers(f.cat, f.format) || 14) / 2))), needs: {}, recurrence: "yok" }
    : f, { preset }));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.chalk }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>{editing ? "Etkinliği düzenle" : ekip ? "Ekibini getir" : rakip ? "Rakip ilanı aç" : "Eksik talebi aç"}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>
            {editing ? "Değişiklikler kadroya duyurulur" : "30 saniyede yayında, grup sohbeti otomatik kurulur"}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        <View style={st.steps}>
          {STEPS.map((label, i) => (
            <TouchableOpacity key={label} disabled={i + 1 > step && !(i === 1 && step1Ok)} onPress={() => setStep(i + 1)} style={{ flex: 1, alignItems: "center" }}>
              <View style={[st.stepDot, step === i + 1 && st.stepOn, step > i + 1 && { backgroundColor: C.pitch }]}>
                <Text style={{ color: step >= i + 1 ? "#fff" : C.faint, fontWeight: "900", fontSize: 12 }}>{step > i + 1 ? "✓" : i + 1}</Text>
              </View>
              <Text style={{ fontSize: 10, color: step === i + 1 ? C.turfText : C.faint, fontWeight: "800", marginTop: 4, textAlign: "center" }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {step === 1 && (<View>
        {ekip && (
          <View style={st.ekipBox}>
            <Text style={{ fontWeight: "900", fontSize: 14, color: C.turfText }}>{t("Üç adımda ekip uygulamada")}</Text>
            <Text style={{ fontSize: 12, color: C.ink, marginTop: 4, lineHeight: 17 }}>
              1) Haftalık maçını aşağıda tanımla (gün, saat, saha). 2) Yayınlayınca WhatsApp grubuna atacağın davet mesajı hazır gelir.
              3) Gelenler seri grubuna katılır; "Var mısın?" ve eksik sayımı artık uygulamada. Henüz gelmeyenleri "uygulamada olmayan sabit oyuncu" olarak say.
            </Text>
          </View>
        )}
        {!editing && !ekip && (
          <View style={st.kindRow}>
            {[["oyuncu", "👤 " + t("Oyuncu arıyorum")], ["rakip", "🆚 " + t("Rakip arıyorum")]].map(([id, label]) => (
              <TouchableOpacity key={id} onPress={() => set("kind")(id)} style={[st.kindBtn, f.kind === id && st.kindOn]}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: f.kind === id ? "#fff" : C.ink }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Field label={t("Kategori")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {CATEGORIES.map((c) => (
              <Chip
                key={c.id}
                label={`${c.icon} ${t(c.name)}`}
                active={Number(f.cat) === c.id}
                onPress={() => setF((s) => { const fid = DEFAULT_FORMAT[c.id] || null; const players = formatPlayers(c.id, fid) || Number(s.capacity); const cap = s.kind === "rakip" ? Math.max(1, Math.round(players / 2)) : players; return { ...s, cat: c.id, needs: {}, format: fid, capacity: String(cap), needed: String(Math.min(Number(s.needed) || 1, Math.max(1, cap - 1))) }; })}
              />
            ))}
          </View>
        </Field>

        {rakip ? (
          <>
            <Field label={t("Takımınızın adı")}>
              <Input placeholder={t("Örn: Keçiören Kartalları")} value={f.teamName} onChangeText={set("teamName")} maxLength={28} />
            </Field>
            <Field label={t("Format")}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                {formats.map((fm) => <Chip key={fm.id} label={t(fm.label)} active={f.format === fm.id} onPress={() => pickFormat(fm.id)} />)}
              </View>
            </Field>
            <Field label={t("Saha")}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                {VENUE_MODES.map(([id, label]) => <Chip key={id} label={t(label)} active={f.venueMode === id} onPress={() => set("venueMode")(id)} />)}
              </View>
              {f.venueMode !== "sizde" && (
                <View style={{ marginTop: 8 }}>
                  <VenueRow />
                </View>
              )}
            </Field>
            <Field label={t("Ücret")}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                {COST_MODES.map(([id, label]) => <Chip key={id} label={t(label)} active={f.costMode === id} onPress={() => set("costMode")(id)} />)}
              </View>
            </Field>
          </>
        ) : (
          <Field label={t("Etkinlik başlığı")}>
            <Input placeholder={t("Örn: Perşembe Halı Saha")} value={f.title} onChangeText={set("title")} maxLength={60} />
          </Field>
        )}

        {!rakip && (
          <Field label={t("Format")}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
              {formats.map((fm) => <Chip key={fm.id} label={`${t(fm.label)} · ${fm.players}`} active={f.format === fm.id} onPress={() => pickFormat(fm.id)} />)}
            </View>
          </Field>
        )}

        <Field label={t("Nerede?")}>
          <View style={{ gap: 8 }}>
            <PickerRow label={t("İl")} value={f.city} onPress={() => setPicker("il")} />
            <PickerRow label={t("İlçe")} value={f.district} placeholder={t("İlçe seç")} onPress={() => setPicker("ilce")} />
          </View>
        </Field>

        {!rakip && (
        <Field label={t("Saha / mekan")}>
          {(user.savedVenues || []).length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8, marginBottom: 8 }}>
              {(user.savedVenues || []).slice(0, 5).map((v) => (
                <Chip key={v.name} label={`📍 ${v.name}${v.used > 1 ? ` · ${v.used}×` : ""}`} active={f.venue === v.name}
                  onPress={() => setF((s) => ({ ...s, venue: v.name, district: v.district || s.district, price: v.price != null ? String(v.price) : s.price }))} />
              ))}
            </View>
          )}
          <VenueRow />
        </Field>
        )}

        <Field label={t("Gün")}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {days.map((d) => (
              <Chip
                key={d.iso}
                label={d.label}
                active={f.dateISO === d.iso}
                onPress={() => setF((s) => ({ ...s, dateISO: d.iso, weekday: d.weekday }))}
              />
            ))}
          </ScrollView>
        </Field>

        <Field label={t("Saat")}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TIMES.map((tm) => (
              <Chip key={tm} label={tm} active={f.time === tm} onPress={() => set("time")(tm)} />
            ))}
          </ScrollView>
        </Field>

        </View>)}
        {step === 2 && (<View>{!rakip && (
        <Field label={t("Tekrar")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            <Chip label={t("Tek seferlik")} active={f.recurrence === "yok"} onPress={() => set("recurrence")("yok")} />
            <Chip label={`Her ${GUNLER_UZUN[f.weekday]}`} active={f.recurrence === "haftalik"} onPress={() => set("recurrence")("haftalik")} />
          </View>
          {f.recurrence === "haftalik" && (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                {[[4, "4 hafta"], [8, "8 hafta"], [12, "12 hafta"], [0, "Süresiz"]].map(([w, l]) => (
                  <Chip key={w} label={l} active={f.weeks === w} onPress={() => set("weeks")(w)} />
                ))}
              </View>
              <Text style={{ fontSize: 12, color: C.faint, marginTop: 8, lineHeight: 17 }}>
                Her {GUNLER_UZUN[f.weekday]} {f.time}{f.weeks ? ` · ${f.weeks} hafta` : " · süresiz"}. Her maç bitince
                bir sonraki hafta otomatik açılır; ekip grubu aynı kalır, yalnızca o haftanın eksikleri için başvuru alınır.
                Maça 72 saat kala gruba "Var mısın?" sorulur, cevaplara göre eksik sayısı önerilir.
              </Text>
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint, marginBottom: 4 }}>{t("Uygulamada olmayan sabit oyuncu sayısı")}</Text>
                <Input keyboardType="number-pad" value={f.offlineRegulars} onChangeText={set("offlineRegulars")} placeholder="0" />
                <Text style={{ fontSize: 11, color: C.faint, marginTop: 4 }}>Henüz uygulamaya girmemiş ekip arkadaşların; eksik hesabında her hafta "var" sayılırlar.</Text>
              </View>
            </View>
          )}
        </Field>
        )}

        {!rakip && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label={t("Toplam kadro")}>
              <View style={st.readonly}><Text style={{ fontSize: 15, fontWeight: "800", color: C.ink }}>{f.capacity} kişi</Text><Text style={{ fontSize: 11, color: C.faint }}>{t("formattan")}</Text></View>
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t("Eksik sayısı")}>
              <Input keyboardType="number-pad" value={f.needed} onChangeText={set("needed")} />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label={t("Ücret (₺)")}>
              <Input keyboardType="number-pad" value={f.price} onChangeText={set("price")} />
            </Field>
          </View>
        </View>
        )}

        {!rakip && posList.length > 0 && Number(f.needed) > 0 && (
          <Field label={t("Hangi mevkiler? (isteğe bağlı)")}>
            <View style={{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12 }}>
              {posList.map((pos) => {
                const n = f.needs[pos.id] || 0;
                return (
                  <View key={pos.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.line }}>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: C.ink }}>{pos.icon} {t(pos.label)}</Text>
                    <TouchableOpacity onPress={() => bump(pos.id, -1)} style={[st.stepBtn, n === 0 && { opacity: 0.3 }]}><Ionicons name="remove" size={18} color={C.turfText} /></TouchableOpacity>
                    <Text style={{ width: 28, textAlign: "center", fontWeight: "900", fontSize: 15, color: n ? C.turfText : C.faint }}>{n}</Text>
                    <TouchableOpacity onPress={() => bump(pos.id, 1)} style={[st.stepBtn, freeSlots === 0 && { opacity: 0.3 }]}><Ionicons name="add" size={18} color={C.turfText} /></TouchableOpacity>
                  </View>
                );
              })}
              <Text style={{ fontSize: 12, color: C.faint, paddingVertical: 8 }}>
                {freeSlots > 0 ? `Kalan ${freeSlots} kişi: mevki farketmez` : "Tüm eksikler mevkiye bağlandı"}
              </Text>
            </View>
          </Field>
        )}

        <Field label={t("Seviye")}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {["Farketmez", "Başlangıç", "Orta", "İleri"].map((l) => (
              <Chip key={l} label={l} active={f.level === l} onPress={() => set("level")(l)} />
            ))}
          </View>
        </Field>

        <Field label={t("Açıklama (isteğe bağlı)")}>
          <Input
            placeholder={t("Mevki, ödeme şekli, kurallar…")}
            value={f.desc}
            onChangeText={set("desc")}
            maxLength={500}
            multiline
            style={{ minHeight: 70, textAlignVertical: "top" }}
          />
        </Field>

        {tooMany && (
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.kit }}>
            {t("Eksik sayısı toplam kadrodan büyük olamaz.")}
          </Text>
        )}</View>)}
        {step === 3 && (
          <View style={st.summaryCard}>
            <Text style={{ fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText }}>{t("ÖZET")}</Text>
            {[
              [rakip ? "Takım" : "Başlık", rakip ? f.teamName : f.title],
              ["Spor", `${(CATEGORIES.find((c) => c.id === Number(f.cat)) || {}).name || ""} · ${f.format || ""}`],
              ["Yer", `${f.venue || (rakip ? (VENUE_MODES.find(([id]) => id === f.venueMode) || [null, ""])[1] : "")} · ${f.district}, ${f.city}`],
              ["Zaman", `${fmtEventDate(f.dateISO, f.time)}${!rakip && f.recurrence === "haftalik" ? ` · her ${GUNLER_UZUN[f.weekday]}` : ""}`],
              rakip ? ["Ücret", (COST_MODES.find(([id]) => id === f.costMode) || [null, ""])[1]] : ["Kadro", `${f.capacity} kişi · ${f.needed} eksik${Object.keys(f.needs || {}).length ? ` · ${Object.entries(f.needs).map(([k, v]) => `${v} ${k}`).join(", ")}` : ""}`],
              !rakip ? ["Ücret", Number(f.price) > 0 ? `${f.price}₺/kişi` : "Ücretsiz"] : null,
              ["Seviye", f.level],
            ].filter(Boolean).map(([k, v]) => (
              <View key={k} style={{ flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.line }}>
                <Text style={{ width: 70, fontSize: 12, fontWeight: "800", color: C.faint }}>{k}</Text>
                <Text style={{ flex: 1, fontSize: 13, color: C.ink }}>{v}</Text>
              </View>
            ))}
            {f.desc ? <Text style={{ fontSize: 12, color: C.faint, marginTop: 8 }}>{f.desc}</Text> : null}
            <Text style={{ fontSize: 12, color: C.faint, marginTop: 10, lineHeight: 17 }}>
              {rakip ? "Yayınlanınca şehrindeki takım kaptanlarına bildirim gider." : "Yayınlanınca ilçendeki uygun oyunculara bildirim gider; grup sohbeti kurulur."}
            </Text>
          </View>
        )}

      </ScrollView>

      <VenueSheet
        visible={venueSheet}
        onClose={() => setVenueSheet(false)}
        cityName={f.city}
        categoryName={(CATEGORIES.find((c) => c.id === Number(f.cat)) || {}).name || ""}
        onList={(q) => (onListVenues ? onListVenues(f.city, Number(f.cat), q) : Promise.resolve([]))}
        onAdd={(name, lat, lng) => (onAddVenue ? onAddVenue(f.city, Number(f.cat), name, lat, lng) : Promise.resolve({ name, lat, lng }))}
        onPick={pickVenue}
      />
      <PickerSheet
        visible={picker === "il"}
        title={t("İl seç")}
        items={ILLER}
        value={f.city}
        onSelect={(c) => { setF((s) => ({ ...s, city: c, district: "" })); setPicker(null); }}
        onClose={() => setPicker(null)}
        placeholder={t("İl ara…")}
      />
      <PickerSheet
        visible={picker === "ilce"}
        title={`${f.city} ilçeleri`}
        items={ilceleri(f.city)}
        value={f.district}
        onSelect={(d) => { set("district")(d); setPicker(null); }}
        onClose={() => setPicker(null)}
        placeholder={t("İlçe ara…")}
      />

      <View style={[st.bottomBar, { flexDirection: "row", gap: 8 }]}>
        {step > 1 && (
          <TouchableOpacity onPress={() => setStep(step - 1)} style={[st.cta, { backgroundColor: C.chalk, flex: 1 }]}>
            <Text style={{ color: C.turfText, fontWeight: "900", fontSize: 14 }}>{t("Geri")}</Text>
          </TouchableOpacity>
        )}
        {step < 3 ? (
          <TouchableOpacity disabled={step === 1 ? !step1Ok : !valid} onPress={() => setStep(step + 1)} style={[st.cta, { flex: 2, opacity: (step === 1 ? step1Ok : valid) ? 1 : 0.45 }]}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>{step === 1 ? "Devam · kadro ve detaylar" : "Devam · özet"}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity disabled={!valid} onPress={submit} style={[st.cta, { flex: 2, opacity: valid ? 1 : 0.45 }]}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14 }}>
              {editing ? "Değişiklikleri kaydet" : ekip ? "Seriyi aç ve daveti paylaş" : rakip ? "Rakip ilanını yayınla" : "Talebi yayınla"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const mkSt = () => StyleSheet.create({
  header: {
    backgroundColor: C.turf, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line, padding: 14,
  },
  cta: { backgroundColor: C.pitch, borderRadius: 14, alignItems: "center", paddingVertical: 14 },
  ekipBox: { backgroundColor: C.pitchSoft, borderRadius: 14, padding: 12, marginBottom: 14 },
  steps: { flexDirection: "row", marginBottom: 16, backgroundColor: C.surface, borderRadius: 14, padding: 10, borderWidth: 1, borderColor: C.line },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.line, alignItems: "center", justifyContent: "center" },
  stepOn: { backgroundColor: C.turf },
  summaryCard: { backgroundColor: C.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: C.line },
  readonly: { backgroundColor: C.chalk, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kindRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  kindBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  kindOn: { backgroundColor: C.turf, borderColor: C.turf },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.pitchSoft, alignItems: "center", justifyContent: "center" },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
