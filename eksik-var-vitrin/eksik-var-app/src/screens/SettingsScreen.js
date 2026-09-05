import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Switch, Alert, Linking, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C, onThemeChange } from "../theme";
import { Chip } from "../components";
import { isValidIban, formatIban } from "../data";
import { t, LANGS, getLang } from "../i18n";
import { getThemeMode } from "../theme";

const MODES = [
  { id: "ikisi", title: "Mesaj ve arama", desc: "Sana hem yazılabilir hem de uygulama içinden aranabilirsin.", icons: ["chatbubble-outline", "call-outline"] },
  { id: "mesaj", title: "Yalnızca mesaj", desc: "Sadece yazılı mesaj alırsın; kimse seni arayamaz.", icons: ["chatbubble-outline"] },
  { id: "arama", title: "Yalnızca arama", desc: "Birebir mesaj almazsın; işi kısa tutmak isteyenler için.", icons: ["call-outline"] },
];

const SCOPES = [
  { id: "herkes", title: "Herkes", desc: "Uygulamadaki herkes sana ulaşabilir." },
  { id: "kadro", title: "Sadece kadromdakiler", desc: "Yalnızca aynı etkinlikte onaylandığın kişiler. Başvuru sohbetleri her zaman açık kalır." },
];

const STARTS = ["21:00", "22:00", "23:00", "00:00"];
const ENDS = ["07:00", "08:00", "09:00", "10:00"];

function Option({ selected, title, desc, icons, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.option, selected && st.optionOn]}>
      <View style={{ flexDirection: "row", gap: 4, width: 44 }}>
        {(icons || []).map((n) => (
          <Ionicons key={n} name={n} size={18} color={selected ? C.pitch : C.faint} />
        ))}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }}>{title}</Text>
        <Text style={{ fontSize: 12, color: C.faint, marginTop: 2, lineHeight: 17 }}>{desc}</Text>
      </View>
      <Ionicons
        name={selected ? "checkmark-circle" : "ellipse-outline"}
        size={22}
        color={selected ? C.pitch : C.line}
      />
    </TouchableOpacity>
  );
}

function Row({ icon, title, desc, value, onChange }) {
  return (
    <View style={st.row}>
      <Ionicons name={icon} size={18} color={C.turfText} style={{ width: 26 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: "700", fontSize: 14, color: C.ink }}>{title}</Text>
        {desc ? <Text style={{ fontSize: 12, color: C.faint, marginTop: 1 }}>{desc}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.line, true: C.pitch }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function SettingsScreen({ settings, onChange, onBack, onDeleteAccount, blockedCount = 0, onBlocked, paymentDetails = null, onSaveIban = () => {}, onTheme = () => {}, onLang = () => {} }) {
  const themeMode = getThemeMode(); const lang = getLang();
  const [iban, setIban] = React.useState(paymentDetails ? paymentDetails.iban : "");
  const [holder, setHolder] = React.useState(paymentDetails ? paymentDetails.holder : "");
  const ibanOk = isValidIban(iban);
  const { contact, notif } = settings;
  const open = (url) => Linking.openURL(url).catch(() => {});
  const confirmDelete = () =>
    Alert.alert(
      "Hesabımı sil",
      "Hesabın ve profil bilgilerin silinecek; kadro ve puan kayıtların anonim olarak kalacak. Bu işlem geri alınamaz.",
      [{ text: t("Vazgeç"), style: "cancel" }, { text: t("Hesabımı sil"), style: "destructive", onPress: onDeleteAccount }]
    );
  const setContact = (patch) => onChange({ ...settings, contact: { ...contact, ...patch } });
  const setQuiet = (patch) => setContact({ quiet: { ...contact.quiet, ...patch } });
  const setNotif = (patch) => onChange({ ...settings, notif: { ...notif, ...patch } });

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 8 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={{ color: "#fff", fontWeight: "900", fontSize: 17 }}>{t("Ayarlar")}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>{t("Değişiklikler anında uygulanır")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        <Text style={st.section}>{t("SANA NASIL ULAŞILSIN?")}</Text>
        <View style={st.card}>
          {MODES.map((m) => (
            <Option
              key={m.id}
              selected={contact.mode === m.id}
              title={m.title}
              desc={m.desc}
              icons={m.icons}
              onPress={() => setContact({ mode: m.id })}
            />
          ))}
          <Text style={st.note}>
            {t("Grup sohbetleri bu ayardan etkilenmez — kadro koordinasyonu her zaman açık.")}
          </Text>
        </View>

        <Text style={st.section}>{t("KİMLER ULAŞABİLİR?")}</Text>
        <View style={st.card}>
          {SCOPES.map((s) => (
            <Option
              key={s.id}
              selected={contact.scope === s.id}
              title={s.title}
              desc={s.desc}
              icons={[s.id === "herkes" ? "globe-outline" : "people-outline"]}
              onPress={() => setContact({ scope: s.id })}
            />
          ))}
        </View>

        <Text style={st.section}>{t("SESSİZ SAATLER")}</Text>
        <View style={st.card}>
          <Row
            icon="moon-outline"
            title={t("Sessiz saatleri aç")}
            desc={t("Bu aralıkta arama alma; mesajlar sessizce gelir.")}
            value={contact.quiet.enabled}
            onChange={(v) => setQuiet({ enabled: v })}
          />
          {contact.quiet.enabled && (
            <View style={{ paddingTop: 10 }}>
              <Text style={st.label}>{t("Başlangıç")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8, marginBottom: 10 }}>
                {STARTS.map((tm) => (
                  <Chip key={tm} label={tm} active={contact.quiet.start === tm} onPress={() => setQuiet({ start: tm })} />
                ))}
              </View>
              <Text style={st.label}>{t("Bitiş")}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
                {ENDS.map((tm) => (
                  <Chip key={tm} label={tm} active={contact.quiet.end === tm} onPress={() => setQuiet({ end: tm })} />
                ))}
              </View>
            </View>
          )}
        </View>

        <Text style={st.section}>{t("settings.notifications")}</Text>
        <View style={st.card}>
          <Row icon="person-add-outline" title={t("Başvurular")} desc={t("Etkinliğine biri başvurunca")} value={notif.basvuru} onChange={(v) => setNotif({ basvuru: v })} />
          <Row icon="chatbubble-ellipses-outline" title={t("Mesajlar")} desc={t("Birebir ve grup mesajları")} value={notif.mesaj} onChange={(v) => setNotif({ mesaj: v })} />
          <Row icon="alarm-outline" title={t("Maç hatırlatmaları")} desc={t("Etkinlikten 2 saat önce")} value={notif.hatirlatma} onChange={(v) => setNotif({ hatirlatma: v })} />
          <Row icon="location-outline" title={t("Yakınımda maç açılınca")} desc={t("İlçende mevkine uygun ilan açılınca, günde en fazla 2")} value={notif.yakin !== false} onChange={(v) => setNotif({ yakin: v })} />
        </View>

        <Text style={st.section}>{t("GİZLİLİK")}</Text>
        <View style={st.card}>
          <View style={st.row}>
            <Ionicons name="shield-checkmark-outline" size={18} color={C.pitch} style={{ width: 26 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 14, color: C.ink }}>{t("Numaran gizli")}</Text>
              <Text style={{ fontSize: 12, color: C.faint, marginTop: 1, lineHeight: 17 }}>
                Aramalar uygulama içinden yapılır; telefon numaran hiç kimseyle paylaşılmaz.
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onBlocked} style={[st.row, { borderTopWidth: 1, borderTopColor: C.line }]}>
            <Ionicons name="ban-outline" size={18} color={C.turfText} style={{ width: 26 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "700", fontSize: 14, color: C.ink }}>{t("Engellenenler")}</Text>
              <Text style={{ fontSize: 12, color: C.faint, marginTop: 1 }}>{t("Engellediğin kişi ne yazabilir ne arayabilir.")}</Text>
            </View>
            <Text style={{ fontSize: 12, fontWeight: "800", color: blockedCount ? C.kit : C.faint }}>{blockedCount} kişi</Text>
            <Ionicons name="chevron-forward" size={16} color={C.gray} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>

        <Text style={st.section}>{t("settings.appearance")}</Text>
        <View style={[st.card, { padding: 14 }]}>
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint, marginBottom: 6 }}>{t("settings.theme")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {[["system", t("settings.theme.system")], ["light", t("settings.theme.light")], ["dark", t("settings.theme.dark")]].map(([id, label]) => (
              <Chip key={id} label={label} active={themeMode === id} onPress={() => onTheme(id)} />
            ))}
          </View>
          <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint, marginTop: 12, marginBottom: 6 }}>{t("settings.language")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
            {LANGS.map(([id, label]) => <Chip key={id} label={label} active={lang === id} onPress={() => onLang(id)} />)}
          </View>
          <Text style={{ fontSize: 11, color: C.faint, marginTop: 8 }}>{lang === "en" ? "Translation in progress: some texts remain in Turkish for now." : "İngilizce çeviri sürüyor; bazı metinler şimdilik Türkçe kalır."}</Text>
        </View>

        <Text style={st.section}>{t("settings.payment")}</Text>
        <View style={[st.card, { padding: 14 }]}>
          <Text style={{ fontSize: 12, color: C.faint, marginBottom: 8, lineHeight: 17 }}>
            Organizatörsen IBAN'ını bir kez yaz; etkinlikte tek dokunuşla gruba gönderirsin. Yalnızca sen görürsün, paylaştığın gruplar dışında kimseye gösterilmez.
          </Text>
          <TextInput value={iban} onChangeText={(v) => setIban(formatIban(v))} maxLength={32} placeholder={t("TR00 0000 0000 0000 0000 0000 00")} placeholderTextColor={C.placeholder} autoCapitalize="characters" style={st.input} />
          <TextInput value={holder} onChangeText={setHolder} maxLength={60} placeholder={t("Hesap sahibi adı")} placeholderTextColor={C.placeholder} style={[st.input, { marginTop: 8 }]} />
          <TouchableOpacity disabled={!ibanOk} onPress={() => onSaveIban({ iban: iban.replace(/\s/g, ""), holder: holder.trim() })} style={[st.saveBtn, !ibanOk && { opacity: 0.4 }]}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 13 }}>{paymentDetails ? "Güncelle" : "Kaydet"}</Text>
          </TouchableOpacity>
          {iban.length > 0 && !ibanOk && <Text style={{ fontSize: 11, color: C.kit, marginTop: 6 }}>{t("IBAN \"TR\" ile başlayıp 26 karakter olmalı.")}</Text>}
        </View>

        <Text style={st.section}>{t("settings.legal")}</Text>
        <View style={st.card}>
          {[["Gizlilik Politikası", "https://eksikvar.app/gizlilik"], ["KVKK Aydınlatma Metni", "https://eksikvar.app/kvkk"], ["Kullanım Şartları", "https://eksikvar.app/kullanim-sartlari"]].map(([t, u]) => (
            <TouchableOpacity key={t} onPress={() => open(u)} style={st.row}>
              <Ionicons name="document-text-outline" size={18} color={C.turfText} style={{ width: 26 }} />
              <Text style={{ flex: 1, fontWeight: "700", fontSize: 14, color: C.ink }}>{t}</Text>
              <Ionicons name="open-outline" size={16} color={C.faint} />
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={confirmDelete} style={[st.row, { borderTopWidth: 1, borderTopColor: C.line }]}>
            <Ionicons name="trash-outline" size={18} color={C.danger} style={{ width: 26 }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", fontSize: 14, color: C.danger }}>{t("Hesabımı sil")}</Text>
              <Text style={{ fontSize: 12, color: C.faint, marginTop: 1 }}>{t("Profilin silinir, kayıtların anonimleşir. Geri alınamaz.")}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const mkSt = () => StyleSheet.create({
  header: {
    backgroundColor: C.turf, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 12,
  },
  section: {
    fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turfText,
    marginTop: 14, marginBottom: 6, marginLeft: 4,
  },
  card: { backgroundColor: C.surface, borderRadius: 16, padding: 10, borderWidth: 1, borderColor: C.line },
  option: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "transparent", marginBottom: 4,
  },
  optionOn: { backgroundColor: C.pitchSoft, borderColor: C.pitch },
  input: { borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.ink, backgroundColor: C.surface },
  saveBtn: { backgroundColor: C.turf, borderRadius: 10, alignItems: "center", paddingVertical: 10, marginTop: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 4 },
  label: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6, color: C.faint, marginBottom: 6 },
  note: { fontSize: 11, color: C.faint, marginTop: 4, marginHorizontal: 8, marginBottom: 4, lineHeight: 16 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
