import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, Image, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { t } from "../i18n";
import { C, onThemeChange } from "../theme";

/* "Payını öde" alt sayfası:
   - açılır açılmaz IBAN panoya kopyalanır (tek dokunuş: bankaya geç, yapıştır)
   - tutar ve açıklama hazır; her biri ayrıca kopyalanabilir
   - "Ödedim" → isteğe bağlı dekont fotoğrafı → organizatöre bildirim
   Para uygulamadan geçmez; bu ekran sadece havaleyi 10 saniyeye indirir. */

const ibanBicim = (iban) => (iban || "").replace(/\s/g, "").replace(/(.{4})/g, "$1 ").trim();
const maskele = (iban) => { const d = (iban || "").replace(/\s/g, ""); return d.length > 8 ? `${d.slice(0, 4)} •••• •••• ${d.slice(-4)}` : d; };

export default function OdemeSheet({ visible, onClose, ev, amount, loadIban, onCopy, onPickProof, onClaim }) {
  const [bilgi, setBilgi] = useState(null);   // { iban, holder, organizerName }
  const [yukleniyor, setYukleniyor] = useState(false);
  const [dekont, setDekont] = useState(null);
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [kopyalandi, setKopyalandi] = useState(null);
  const aciklama = ev ? `${ev.title || "Maç"} · ${ev.date || ""}`.trim() : "";

  useEffect(() => {
    if (!visible || !ev) return;
    setBilgi(null); setDekont(null); setKopyalandi(null); setYukleniyor(true);
    loadIban(ev.id).then((b) => {
      setBilgi(b);
      if (b && b.iban) { onCopy(b.iban); setKopyalandi("iban"); }
    }).catch(() => setBilgi(null)).finally(() => setYukleniyor(false));
  }, [visible, ev && ev.id]);

  const kopyala = (ne, deger) => { onCopy(deger); setKopyalandi(ne); setTimeout(() => setKopyalandi((k) => (k === ne ? null : k)), 1800); };
  const dekontSec = async () => { const uri = await onPickProof(); if (uri) setDekont(uri); };
  const odedim = async () => {
    setGonderiliyor(true);
    try { await onClaim(ev.id, dekont); onClose(); } finally { setGonderiliyor(false); }
  };

  const Satir = ({ etiket, deger, anahtar, buyuk }) => (
    <TouchableOpacity onPress={() => kopyala(anahtar, deger)} activeOpacity={0.8} style={st.satir}>
      <View style={{ flex: 1 }}>
        <Text style={st.etiket}>{etiket}</Text>
        <Text style={[st.deger, buyuk && { fontSize: 17, letterSpacing: 0.5 }]} numberOfLines={2}>{deger}</Text>
      </View>
      <View style={[st.kopyaRozet, kopyalandi === anahtar && { backgroundColor: C.pitch }]}>
        <Ionicons name={kopyalandi === anahtar ? "checkmark" : "copy-outline"} size={14} color={kopyalandi === anahtar ? "#fff" : C.turfText} />
        <Text style={{ fontSize: 11, fontWeight: "800", color: kopyalandi === anahtar ? "#fff" : C.turfText }}>{kopyalandi === anahtar ? t("Kopyalandı") : t("Kopyala")}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.perde} activeOpacity={1} onPress={onClose} />
      <View style={st.sayfa}>
        <View style={st.tutamac} />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={st.baslik}>{t("Payını öde")}</Text>
          <View style={st.tutarRozet}><Text style={st.tutarYazi}>{amount}₺</Text></View>
        </View>
        <Text style={st.alt}>{t("IBAN panoya kopyalandı. Banka uygulamanı aç, FAST ile gönder, sonra \"Ödedim\" de.")}</Text>

        {yukleniyor ? (
          <View style={{ paddingVertical: 24, alignItems: "center" }}><ActivityIndicator color={C.pitch} /></View>
        ) : bilgi && bilgi.iban ? (
          <View style={{ marginTop: 12 }}>
            <Satir etiket={bilgi.holder ? `${t("Alıcı")} · ${bilgi.holder}` : `${t("Alıcı")} · ${bilgi.organizerName || t("Organizatör")}`} deger={ibanBicim(bilgi.iban)} anahtar="iban" buyuk />
            <Satir etiket={t("Tutar")} deger={`${amount}`} anahtar="tutar" />
            <Satir etiket={t("Açıklama")} deger={aciklama} anahtar="aciklama" />
          </View>
        ) : (
          <View style={st.uyari}>
            <Ionicons name="alert-circle-outline" size={18} color={C.kit} />
            <Text style={{ flex: 1, fontSize: 13, color: C.ink, lineHeight: 18 }}>
              {t("Organizatör henüz IBAN eklememiş. Ekip grubundan isteyebilir ya da elden ödeyip \"Ödedim\" diyebilirsin.")}
            </Text>
          </View>
        )}

        {!yukleniyor && (
          <>
            <TouchableOpacity onPress={dekontSec} activeOpacity={0.85} style={st.dekont}>
              {dekont ? <Image source={{ uri: dekont }} style={{ width: 44, height: 44, borderRadius: 8 }} /> : <Ionicons name="receipt-outline" size={22} color={C.turfText} />}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "800", color: C.ink }}>{dekont ? t("Dekont eklendi") : t("Dekont ekle (isteğe bağlı)")}</Text>
                <Text style={{ fontSize: 11, color: C.faint, marginTop: 1 }}>{t("Organizatör tek bakışta onaylar, tartışma çıkmaz")}</Text>
              </View>
              <Ionicons name={dekont ? "swap-horizontal" : "chevron-forward"} size={16} color={C.faint} />
            </TouchableOpacity>
            <TouchableOpacity onPress={odedim} disabled={gonderiliyor} activeOpacity={0.9} style={[st.odedim, gonderiliyor && { opacity: 0.6 }]}>
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "900", fontSize: 15 }}>{gonderiliyor ? t("Gönderiliyor…") : t("Ödedim")}</Text>
            </TouchableOpacity>
            <Text style={[st.alt, { textAlign: "center", marginTop: 10 }]}>{t("Para uygulamadan geçmez; ödemeni doğrudan organizatöre yaparsın.")}</Text>
          </>
        )}
      </View>
    </Modal>
  );
}

const mkSt = () => StyleSheet.create({
  perde: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sayfa: { backgroundColor: C.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 20, paddingTop: 10, paddingBottom: Platform.OS === "ios" ? 34 : 22 },
  tutamac: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 14 },
  baslik: { fontSize: 20, fontWeight: "900", color: C.ink },
  alt: { fontSize: 12.5, color: C.faint, lineHeight: 18, marginTop: 6 },
  tutarRozet: { backgroundColor: C.pitchSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  tutarYazi: { fontSize: 16, fontWeight: "900", color: C.pitch },
  satir: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.chalk, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  etiket: { fontSize: 11, fontWeight: "700", color: C.faint, textTransform: "uppercase", letterSpacing: 0.4 },
  deger: { fontSize: 14.5, fontWeight: "800", color: C.ink, marginTop: 2 },
  kopyaRozet: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  uyari: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.kitSoft, borderRadius: 14, padding: 12, marginTop: 12 },
  dekont: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginTop: 12 },
  odedim: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.pitch, borderRadius: 14, paddingVertical: 15, marginTop: 12 },
});
let st = mkSt();
onThemeChange(() => { st = mkSt(); });
