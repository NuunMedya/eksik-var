// Eksik Var — hesap türleri (işletme / organizatör / hakem / medya) tek kaynak.
// Saf modül: Node testlerinde ve ekranlarda ortak kullanılır.

export const ROLLER = {
  isletme: {
    id: "isletme", etiket: "İşletme", baslik: "İşletme sahibi olarak kaydol", soru: "İşletme sahibi misiniz?", icon: "business",
    renk: "#4F6BF5", zemin: "#EEF2FF", cizgi: "#C7D2FE",
    alt: "Kaydından sonra tesis bilgilerini ekleyeceğiz; onay sonrası sahan haritada görünür ve rezervasyon alırsın.",
    bilgi: "Halı saha, spor salonu ya da kort işletiyorsan bu hesap türü sana göre. Sahalarını listeler, boş saatlerini duyurur, oyunculardan rezervasyon alırsın.",
  },
  organizator: {
    id: "organizator", etiket: "Organizatör", baslik: "Organizatör olarak kaydol", soru: "Organizatör müsünüz?", icon: "trophy",
    renk: "#F0A32B", zemin: "#FFF7E6", cizgi: "#FDE3B0",
    alt: "Kaydından sonra kısa bir kurulum var; onay sonrası etkinliklerin öne çıkar ve kadro toplaman kolaylaşır.",
    bilgi: "Düzenli maç, lig ya da turnuva düzenliyorsan bu hesap türü sana göre. Etkinlik açar, kadro toplar, hakem ve medya ekibi görevlendirirsin.",
  },
  hakem: {
    id: "hakem", etiket: "Hakem", baslik: "Hakem olarak kaydol", soru: "Hakemim", icon: "megaphone",
    renk: "#7C5CF2", zemin: "#F1EEFF", cizgi: "#D9D2FA",
    alt: "Kaydından sonra kısa bir kurulum var; onay sonrası organizatörler seni bulup görevlendirebilir.",
    bilgi: "Maçlarda hakemlik yapıyorsan bu hesap türü sana göre. Müsait olduğun günleri belirtirsin, organizatörler seni bulup maçlarına davet eder.",
  },
  medya: {
    id: "medya", etiket: "Medya", baslik: "Medya ekibi olarak kaydol", soru: "Medya ekibindenim", icon: "videocam",
    renk: "#E05A8A", zemin: "#FDEEF4", cizgi: "#F7C5D9",
    alt: "Kaydından sonra kısa bir kurulum var; onay sonrası organizatörler seni çekim için görevlendirebilir.",
    bilgi: "Maç çekimi, fotoğraf ya da içerik üretiyorsan bu hesap türü sana göre. Organizatörler seni etkinliklerine kameraman veya fotoğrafçı olarak atar.",
  },
};
export const ROL_SIRASI = ["isletme", "organizator", "hakem", "medya"];

/* Kullanıcı nesnesinden rol bilgisi: oyuncuysa null.
   user.role = 'isletme' | ... ; user.roleStatus = 'bekliyor' | 'onayli' | 'red' | 'yok' */
export function rolBilgi(user) {
  if (!user || !user.role || user.role === "oyuncu") return null;
  const R = ROLLER[user.role];
  if (!R) return null;
  const onayli = user.roleStatus === "onayli";
  return { ...R, onayli, bekliyor: !onayli, metin: onayli ? R.etiket : `${R.etiket} · onay bekliyor` };
}
