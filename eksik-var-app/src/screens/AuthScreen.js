import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Image, Linking,
  KeyboardAvoidingView, Platform, StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";
import { ILLER, ilceleri } from "../trIlIlce";
import { normalizePhone, CATEGORIES, POSITIONS } from "../data";
import { PickerRow, PickerSheet, AvatarPicker } from "../components";
import { chooseAvatar } from "../avatar";

/* ───────────────────────────────────────────────────────────────
   Akış (SMS'siz):
     login        → telefon + şifre                → onLogin({ phone, password })
     register     → oyuncu kaydı (tam profil)      → onRegister(payload)
     role:<id>    → işletme / organizatör / hakem / medya kaydı (kısa form) → onRegister(payload)
   İkisi de Promise döndürür; hata olursa error prop'u dolar.
   ─────────────────────────────────────────────────────────────── */

const SITE = "https://eksikvarapp.com";
const ROLLER = {
  isletme: {
    baslik: "İşletme sahibi olarak kaydol", soru: "İşletme sahibi misiniz?", icon: "business",
    renk: "#4F6BF5", zemin: "#EEF2FF", cizgi: "#C7D2FE",
    alt: "Kaydından sonra tesis bilgilerini ekleyeceğiz; onay sonrası sahan haritada görünür ve rezervasyon alırsın.",
    bilgi: "Halı saha, spor salonu ya da kort işletiyorsan bu hesap türü sana göre. Sahalarını listeler, boş saatlerini duyurur, oyunculardan rezervasyon alırsın.",
  },
  organizator: {
    baslik: "Organizatör olarak kaydol", soru: "Organizatör müsünüz?", icon: "trophy",
    renk: "#F0A32B", zemin: "#FFF7E6", cizgi: "#FDE3B0",
    alt: "Kaydından sonra kısa bir kurulum var; onay sonrası etkinliklerin öne çıkar ve kadro toplaman kolaylaşır.",
    bilgi: "Düzenli maç, lig ya da turnuva düzenliyorsan bu hesap türü sana göre. Etkinlik açar, kadro toplar, hakem ve medya ekibi görevlendirirsin.",
  },
  hakem: {
    baslik: "Hakem olarak kaydol", soru: "Hakemim", icon: "megaphone",
    renk: "#7C5CF2", zemin: "#F1EEFF", cizgi: "#D9D2FA",
    alt: "Kaydından sonra kısa bir kurulum var; onay sonrası organizatörler seni bulup görevlendirebilir.",
    bilgi: "Maçlarda hakemlik yapıyorsan bu hesap türü sana göre. Müsait olduğun günleri belirtirsin, organizatörler seni bulup maçlarına davet eder.",
  },
  medya: {
    baslik: "Medya ekibi olarak kaydol", soru: "Medya ekibindenim", icon: "videocam",
    renk: "#E05A8A", zemin: "#FDEEF4", cizgi: "#F7C5D9",
    alt: "Kaydından sonra kısa bir kurulum var; onay sonrası organizatörler seni çekim için görevlendirebilir.",
    bilgi: "Maç çekimi, fotoğraf ya da içerik üretiyorsan bu hesap türü sana göre. Organizatörler seni etkinliklerine kameraman veya fotoğrafçı olarak atar.",
  },
};
const ROL_SIRASI = ["isletme", "organizator", "hakem", "medya"];

/* Ad soyaddan kullanıcı adı üret (rol kayıtlarında sorulmaz; çakışırsa sunucu tetikleyicisi ek düzeltir) */
const kullaniciAdiUret = (ad, e164) => {
  const tr = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
  const slug = String(ad || "").toLowerCase().replace(/[çğıöşüİ]/g, (ch) => tr[ch] || ch).replace(/[^a-z0-9]/g, "").slice(0, 12);
  return `${slug || "uye"}_${String(e164 || "").slice(-4)}`;
};

/* ───────── küçük parçalar ───────── */
function Etiket({ children, zorunlu }) {
  return (
    <Text style={st.etiket}>
      {children}{zorunlu ? <Text style={{ color: C.danger }}> *</Text> : null}
    </Text>
  );
}
function Alan({ label, zorunlu, ipucu, children }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Etiket zorunlu={zorunlu}>{label}</Etiket>
      {children}
      {ipucu ? <Text style={st.ipucu}>{ipucu}</Text> : null}
    </View>
  );
}
function Kutu(props) {
  return <TextInput placeholderTextColor={C.placeholder} {...props} style={[st.kutu, props.style]} />;
}
function TelefonKutu({ value, onChangeText }) {
  return (
    <View style={[st.kutu, st.telSatir]}>
      <Text style={st.telOnek}>+90</Text>
      <TextInput
        placeholder="5XX XXX XX XX"
        placeholderTextColor={C.placeholder}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        value={value}
        onChangeText={onChangeText}
        style={st.telGiris}
      />
    </View>
  );
}
function SifreKutu({ value, onChangeText, yeni }) {
  const [gizli, setGizli] = useState(true);
  return (
    <View style={[st.kutu, st.telSatir, { paddingRight: 8 }]}>
      <TextInput
        placeholder={yeni ? "En az 6 karakter" : "Şifren"}
        placeholderTextColor={C.placeholder}
        secureTextEntry={gizli}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType={yeni ? "newPassword" : "password"}
        value={value}
        onChangeText={onChangeText}
        style={st.telGiris}
      />
      <TouchableOpacity onPress={() => setGizli((g) => !g)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 4 }}>
        <Ionicons name={gizli ? "eye-off-outline" : "eye-outline"} size={19} color={C.faint} />
      </TouchableOpacity>
    </View>
  );
}
function Onay({ value, onToggle, renk }) {
  const open = (url) => Linking.openURL(url).catch(() => {});
  return (
    <TouchableOpacity onPress={onToggle} style={st.onaySatir} activeOpacity={0.8}>
      <View style={[st.onayKutu, value && { backgroundColor: renk, borderColor: renk }]}>
        {value ? <Ionicons name="checkmark" size={13} color="#fff" /> : null}
      </View>
      <Text style={st.onayYazi}>
        <Text style={[st.link, { color: renk }]} onPress={() => open(`${SITE}/gizlilik.html`)}>KVKK Aydınlatma Metni</Text>
        {", "}
        <Text style={[st.link, { color: renk }]} onPress={() => open(`${SITE}/gizlilik.html`)}>Kullanım Koşulları</Text>
        {" ve "}
        <Text style={[st.link, { color: renk }]} onPress={() => open(`${SITE}/gizlilik.html`)}>Gizlilik Politikası</Text>
        {"'nı okudum ve kabul ediyorum."}
      </Text>
    </TouchableOpacity>
  );
}
function Buton({ label, onPress, renk, busy, icon }) {
  return (
    <TouchableOpacity style={[st.buton, { backgroundColor: renk }, busy && { opacity: 0.6 }]} disabled={busy} onPress={onPress} activeOpacity={0.9}>
      {icon ? <Ionicons name={icon} size={18} color="#fff" /> : null}
      <Text style={st.butonYazi}>{busy ? "Lütfen bekle…" : label}</Text>
    </TouchableOpacity>
  );
}
function Cip({ aktif, onPress, children }) {
  return (
    <TouchableOpacity onPress={onPress} style={[st.cip, aktif && st.cipOn]} activeOpacity={0.85}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: aktif ? "#fff" : C.turfText }}>{children}</Text>
    </TouchableOpacity>
  );
}

/* ───────── ana ekran ───────── */
export default function AuthScreen({ onLogin, onRegister, busy = false, error = null, demoHint = null }) {
  const [mode, setMode] = useState("login"); // login | register | role
  const [rol, setRol] = useState(null);       // role modunda: isletme | organizator | hakem | medya
  const [bilgiAcik, setBilgiAcik] = useState(false);
  const [f, setF] = useState({
    name: "", username: "", phone: "", password: "", email: "",
    city: "Ankara", district: "", avatar: null, favCats: [1], positions: [],
  });
  const [picker, setPicker] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [localError, setLocalError] = useState(null);
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const e164 = normalizePhone(f.phone);
  const shownError = localError || error;

  const git = (m, r = null) => { setMode(m); setRol(r); setLocalError(null); setAgreed(false); setBilgiAcik(false); };

  const girisYap = async () => {
    setLocalError(null);
    if (!e164) { setLocalError("Geçerli bir cep numarası gir (5XX XXX XX XX)"); return; }
    if (!f.password) { setLocalError("Şifreni gir"); return; }
    await onLogin({ phone: e164, password: f.password });
  };

  const kayitOl = async () => {
    setLocalError(null);
    const rolMu = mode === "role";
    if (!f.name.trim()) { setLocalError("Ad soyad gerekli"); return; }
    if (!rolMu && !f.username.trim()) { setLocalError("Kullanıcı adı gerekli"); return; }
    if (!e164) { setLocalError("Geçerli bir cep numarası gir (5XX XXX XX XX)"); return; }
    if (f.password.length < 6) { setLocalError("Şifre en az 6 karakter olmalı"); return; }
    if (!agreed) { setLocalError("Devam etmek için şartları kabul etmelisin"); return; }
    await onRegister({
      phone: e164, password: f.password,
      name: f.name.trim(),
      username: rolMu ? kullaniciAdiUret(f.name, e164) : f.username.trim(),
      city: f.city, district: rolMu ? null : (f.district || null),
      avatar: rolMu ? null : f.avatar,
      favCats: rolMu ? [] : f.favCats, positions: rolMu ? [] : f.positions,
      accountType: rolMu ? rol : "oyuncu",
      email: f.email.trim() || null,
    });
  };

  /* ── ROL KAYDI (kısa form) ── */
  if (mode === "role" && rol) {
    const R = ROLLER[rol];
    return (
      <KeyboardAvoidingView style={st.ekran} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={st.sayfa} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => git("register")} style={st.geri} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={C.ink} />
          </TouchableOpacity>

          <View style={{ alignItems: "center", marginTop: 4, marginBottom: 20 }}>
            <View style={[st.rolDaire, { backgroundColor: R.zemin }]}>
              <Ionicons name={R.icon} size={34} color={R.renk} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 }}>
              <Text style={st.baslikBuyuk}>{R.baslik}</Text>
              <TouchableOpacity onPress={() => setBilgiAcik((b) => !b)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="information-circle-outline" size={20} color={R.renk} />
              </TouchableOpacity>
            </View>
            <Text style={st.altYazi}>{R.alt}</Text>
            {bilgiAcik ? (
              <View style={[st.bilgiKart, { backgroundColor: R.zemin, borderColor: R.cizgi }]}>
                <Text style={{ fontSize: 12, lineHeight: 17, color: C.ink }}>{R.bilgi}</Text>
              </View>
            ) : null}
          </View>

          <Alan label="Ad Soyad"><Kutu value={f.name} onChangeText={set("name")} autoCapitalize="words" /></Alan>
          <Alan label="Telefon Numarası"><TelefonKutu value={f.phone} onChangeText={set("phone")} /></Alan>
          <Alan label="Şifre"><SifreKutu value={f.password} onChangeText={set("password")} yeni /></Alan>
          <Alan label="E-posta (Opsiyonel)">
            <Kutu value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
          </Alan>

          <Onay value={agreed} onToggle={() => setAgreed((a) => !a)} renk={R.renk} />
          {shownError ? <Text style={st.hata}>{shownError}</Text> : null}
          <Buton label="Kayıt Ol" onPress={kayitOl} renk={R.renk} busy={busy} />

          <TouchableOpacity onPress={() => git("login")} style={{ alignItems: "center", marginTop: 16 }}>
            <Text style={st.altLink}>Zaten hesabın var mı? <Text style={{ color: R.renk, fontWeight: "800" }}>Giriş yap</Text></Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  /* ── GİRİŞ / OYUNCU KAYDI ── */
  const kayitModu = mode === "register";
  return (
    <KeyboardAvoidingView style={st.ekran} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={st.sayfa} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginTop: 2, marginBottom: 12 }}>
          <Image source={require("../../assets/logo-mark.png")} style={{ width: 60, height: 60 }} resizeMode="contain" />
        </View>

        <View style={st.sekmeler}>
          {[["login", "Giriş Yap"], ["register", "Hesap Oluştur"]].map(([m, label]) => (
            <TouchableOpacity key={m} onPress={() => git(m)} style={[st.sekme, mode === m && st.sekmeOn]} activeOpacity={0.9}>
              <Text style={{ fontWeight: "700", fontSize: 13, color: mode === m ? "#fff" : C.faint }}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {kayitModu ? (
          <>
            <Text style={st.baslikBuyuk}>Hesap Oluştur</Text>
            <Text style={[st.altYazi, { textAlign: "left", marginTop: 8, marginBottom: 10, paddingHorizontal: 0 }]}>Oyuncu değil misin? Hesap türünü seç:</Text>
            <View style={{ gap: 8, marginBottom: 20 }}>
              {ROL_SIRASI.map((id) => {
                const R = ROLLER[id];
                return (
                  <TouchableOpacity key={id} onPress={() => git("role", id)} activeOpacity={0.85}
                    style={[st.rolKart, { backgroundColor: R.zemin, borderColor: R.cizgi }]}>
                    <Ionicons name={R.icon} size={18} color={R.renk} />
                    <Text style={[st.rolKartYazi, { color: R.renk }]}>{R.soru}</Text>
                    <Ionicons name="chevron-forward" size={16} color={R.renk} />
                    <Ionicons name="information-circle-outline" size={18} color={R.renk} style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ alignItems: "center", marginBottom: 16 }}>
              <AvatarPicker name={f.name || "?"} uri={f.avatar} size={64} onPress={() => chooseAvatar(f.avatar, (u) => set("avatar")(u))} />
              <Text style={[st.ipucu, { marginTop: 8 }]}>{f.avatar ? "Fotoğrafını değiştirmek için dokun" : "Fotoğraf ekle (isteğe bağlı)"}</Text>
            </View>

            <Alan label="Ad Soyad" zorunlu><Kutu placeholder="Ahmet Yılmaz" value={f.name} onChangeText={set("name")} autoCapitalize="words" /></Alan>
            <Alan label="Kullanıcı Adı" zorunlu ipucu="Küçük harf, rakam ve alt çizgi">
              <Kutu placeholder="ahmet_y" value={f.username} onChangeText={(v) => set("username")(v.toLowerCase())} autoCapitalize="none" autoCorrect={false} />
            </Alan>
            <Alan label="Telefon Numarası" zorunlu ipucu="SMS gelmez; numaran hesabının anahtarıdır, kimseye gösterilmez."><TelefonKutu value={f.phone} onChangeText={set("phone")} /></Alan>
            <Alan label="Şifre" zorunlu><SifreKutu value={f.password} onChangeText={set("password")} yeni /></Alan>
            <Alan label="E-posta (Opsiyonel)" ipucu="Şifre sıfırlama ve bildirimler için önerilir">
              <Kutu placeholder="ornek@mail.com" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" />
            </Alan>

            <Alan label="Nerede oynuyorsun?">
              <View style={{ gap: 8 }}>
                <PickerRow label="İl" value={f.city} onPress={() => setPicker("il")} />
                <PickerRow label="İlçe" value={f.district} placeholder="İlçeni seç (isteğe bağlı)" onPress={() => setPicker("ilce")} />
              </View>
            </Alan>

            <Alan label="Ne oynuyorsun?">
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {CATEGORIES.map((c) => (
                  <Cip key={c.id} aktif={f.favCats.includes(c.id)}
                    onPress={() => setF((x) => { const ic = x.favCats.includes(c.id); const cats = ic ? x.favCats.filter((q) => q !== c.id) : [...x.favCats, c.id]; const izinli = cats.flatMap((k) => (POSITIONS[k] || []).map((p) => p.id)); return { ...x, favCats: cats, positions: x.positions.filter((p) => izinli.includes(p)) }; })}>
                    {c.icon} {t(c.name)}
                  </Cip>
                ))}
              </View>
            </Alan>

            {f.favCats.some((k) => (POSITIONS[k] || []).length) ? (
              <Alan label="Mevkin" ipucu="Her branş için ayrı seçebilirsin (isteğe bağlı)">
                <View style={{ gap: 12 }}>
                  {CATEGORIES.filter((c) => f.favCats.includes(c.id) && (POSITIONS[c.id] || []).length).map((c) => (
                    <View key={c.id}>
                      <Text style={st.altEtiket}>{c.icon} {t(c.name)}</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                        {(POSITIONS[c.id] || []).map((p) => (
                          <Cip key={p.id} aktif={f.positions.includes(p.id)}
                            onPress={() => setF((x) => ({ ...x, positions: x.positions.includes(p.id) ? x.positions.filter((q) => q !== p.id) : [...x.positions, p.id] }))}>
                            {p.icon} {t(p.label)}
                          </Cip>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </Alan>
            ) : null}

            <Onay value={agreed} onToggle={() => setAgreed((a) => !a)} renk={C.pitch} />
            {shownError ? <Text style={st.hata}>{shownError}</Text> : null}
            <Buton label="Hesap Oluştur" onPress={kayitOl} renk={C.pitch} busy={busy} />
          </>
        ) : (
          <>
            <Text style={st.baslikBuyuk}>Tekrar hoş geldin</Text>
            <Text style={[st.altYazi, { textAlign: "left", marginTop: 4, marginBottom: 18, paddingHorizontal: 0 }]}>Telefon numaran ve şifrenle giriş yap.</Text>

            <Alan label="Telefon Numarası"><TelefonKutu value={f.phone} onChangeText={set("phone")} /></Alan>
            <Alan label="Şifre"><SifreKutu value={f.password} onChangeText={set("password")} /></Alan>

            {shownError ? <Text style={st.hata}>{shownError}</Text> : null}
            <Buton label="Giriş Yap" onPress={girisYap} renk={C.pitch} busy={busy} />

            <TouchableOpacity onPress={() => Linking.openURL("mailto:destek@eksikvarapp.com?subject=Şifre%20sıfırlama").catch(() => {})} style={{ alignItems: "center", marginTop: 14 }}>
              <Text style={st.altLink}>Şifreni mi unuttun? <Text style={{ color: C.pitch, fontWeight: "800" }}>Bize yaz</Text></Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => git("register")} style={{ alignItems: "center", marginTop: 8 }}>
              <Text style={st.altLink}>Hesabın yok mu? <Text style={{ color: C.pitch, fontWeight: "800" }}>Hesap oluştur</Text></Text>
            </TouchableOpacity>
          </>
        )}

        {demoHint ? <Text style={[st.ipucu, { textAlign: "center", marginTop: 16, color: C.kit }]}>{demoHint}</Text> : null}
      </ScrollView>

      <PickerSheet visible={picker === "il"} title="İl seç" items={ILLER} value={f.city}
        onSelect={(c) => { setF((s) => ({ ...s, city: c, district: "" })); setPicker(null); }} onClose={() => setPicker(null)} placeholder="İl ara…" />
      <PickerSheet visible={picker === "ilce"} title={`${f.city} ilçeleri`} items={ilceleri(f.city)} value={f.district}
        onSelect={(d) => { set("district")(d); setPicker(null); }} onClose={() => setPicker(null)} placeholder="İlçe ara…" />
    </KeyboardAvoidingView>
  );
}

/* ───────── stiller ───────── */
const mkSt = () => StyleSheet.create({
  ekran: { flex: 1, backgroundColor: C.chalk },
  sayfa: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 32 },
  geri: { width: 36, height: 36, justifyContent: "center", marginLeft: -6 },

  sekmeler: { flexDirection: "row", backgroundColor: C.isDark ? C.surface : "#ECEBE6", borderRadius: 11, padding: 3, marginBottom: 20 },
  sekme: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 9 },
  sekmeOn: { backgroundColor: C.turf },

  baslikBuyuk: { fontSize: 22, fontWeight: "800", color: C.ink, letterSpacing: -0.3 },
  altYazi: { fontSize: 13, lineHeight: 19, color: C.faint, textAlign: "center", marginTop: 6, paddingHorizontal: 8 },
  rolDaire: { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" },
  bilgiKart: { marginTop: 10, borderWidth: 1, borderRadius: 12, padding: 12 },

  rolKart: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12 },
  rolKartYazi: { flex: 1, fontSize: 14, fontWeight: "700" },

  etiket: { fontSize: 12, fontWeight: "700", color: C.ink, marginBottom: 6 },
  ipucu: { fontSize: 11, color: C.faint, marginTop: 5, lineHeight: 15 },
  altEtiket: { fontSize: 11, fontWeight: "700", color: C.faint, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.4 },
  kutu: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 11, paddingHorizontal: 13, paddingVertical: 11, fontSize: 15, color: C.ink },
  telSatir: { flexDirection: "row", alignItems: "center", paddingVertical: 0 },
  telOnek: { fontSize: 15, fontWeight: "600", color: C.faint, marginRight: 8 },
  telGiris: { flex: 1, fontSize: 15, color: C.ink, paddingVertical: 11 },

  onaySatir: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: 2, marginBottom: 16 },
  onayKutu: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: C.gray, alignItems: "center", justifyContent: "center", marginTop: 1 },
  onayYazi: { flex: 1, fontSize: 12, lineHeight: 17, color: C.faint },
  link: { fontWeight: "700", textDecorationLine: "underline" },

  buton: { borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 13 },
  butonYazi: { color: "#fff", fontWeight: "800", fontSize: 15 },
  altLink: { fontSize: 13, color: C.faint, fontWeight: "500" },

  cip: { borderRadius: 999, borderWidth: 1, borderColor: C.line, backgroundColor: C.surface, paddingHorizontal: 11, paddingVertical: 7 },
  cipOn: { backgroundColor: C.turf, borderColor: C.turf },
  hata: { textAlign: "center", color: C.danger, fontSize: 12, fontWeight: "700", marginBottom: 10 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
