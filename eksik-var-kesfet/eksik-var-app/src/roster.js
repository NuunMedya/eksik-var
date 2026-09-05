// WhatsApp kadro listesi çözümleyici — saf ve testlenebilir.
// "1. Ali ✅", "2- Veli (kaleci)", "• Hasan", "Ozan 🧤" gibi satırlardan ad çıkarır.

const GK_ISARET = /(\(kaleci\)|\bkaleci\b|🧤|\bgk\b)/i;
const COP_SATIR = /(^https?:)|\b(maç|halı ?saha|kadro|liste|toplam|yedek|konum|adres)\b|\b\d{1,2}[:.]\d{2}\b/i;

export function parseRoster(text) {
  const gorulen = new Set();
  const out = [];
  for (let ham of String(text || "").split(/\r?\n/)) {
    let s = ham.trim();
    if (!s || COP_SATIR.test(s)) continue;
    const gk = GK_ISARET.test(s);
    s = s
      .replace(/^[\s>*•·\-–—]*\d{1,2}\s*[.)\-:]?\s*/, "")   // "1." "2-" "3)" öneki
      .replace(/^[•·\-–—*+]\s*/, "")                        // madde imi
      .replace(GK_ISARET, "")
      .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/gu, "")   // emoji
      .replace(/\+?\d[\d\s()-]{6,}/g, "")                   // telefon numarası
      .replace(/[()[\]{}✓✔✗✘+?]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (s.length < 2 || s.length > 40) continue;
    if (!/\p{L}/u.test(s)) continue;                        // en az bir harf
    if (/^\d+$/.test(s)) continue;
    const anahtar = s.toLocaleLowerCase("tr");
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    out.push({ name: s, gk });
    if (out.length >= 30) break;
  }
  return out;
}
