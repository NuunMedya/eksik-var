// Basket Yağmuru — saf oyun mantığı (testlenebilir).
// Çember -genlik..+genlik arasında üçgen dalgayla kayar; top sabit süre uçar.
// Dokunma anındaki konum+yönden, topun varış anındaki çember konumu öngörülür.

// x: şu anki konum, yon: +1/-1, hiz: px/ms, sure: uçuş ms, genlik: sınır
export function ileriSar(x, yon, hiz, sure, genlik) {
  let konum = x + yon * hiz * sure;
  let y = yon;
  // sınırdan yansıt (gerekirse birden çok kez)
  for (let i = 0; i < 6 && (konum > genlik || konum < -genlik); i++) {
    if (konum > genlik) { konum = 2 * genlik - konum; y = -y; }
    else if (konum < -genlik) { konum = -2 * genlik - konum; y = -y; }
  }
  return { x: konum, yon: y };
}

export const isabet = (cemberX, tolerans) => Math.abs(cemberX) <= tolerans;

// seri çarpanı: 0-2 → ×1, 3-5 → ×2, 6+ → ×3
export const seriCarpan = (seri) => (seri >= 6 ? 3 : seri >= 3 ? 2 : 1);

// tur ilerledikçe zorlaşma: hız artar, tolerans daralır
export const turAyari = (basket) => ({
  hiz: Math.min(0.09 + basket * 0.006, 0.22),          // px/ms
  tolerans: Math.max(34 - basket * 0.8, 16),
});
