// Libero — saf mantık. Servisler üstten yağar; skor arttıkça
// aralık kısalır, iniş hızlanır, çapraz açı ihtimali büyür.
export const spawnAyar = (skor) => ({
  aralik: Math.max(1450 - skor * 42, 520),          // ms: yeni top sıklığı
  hiz: Math.min(0.16 + skor * 0.006, 0.44),         // px/ms iniş hızı
  capraz: Math.min(0.15 + skor * 0.02, 0.6),        // açılı gelme ihtimali
});
export const kurtardiMi = (topX, liberoX, tol) => Math.abs(topX - liberoX) <= tol;
export const inisSuresi = (mesafe, hiz) => mesafe / hiz;
// çapraz servis: hedef x, spawn x'ten sapar ama alan içinde kalır
export function servisUret(w, ayar, rng = Math.random) {
  const x0 = 30 + rng() * (w - 60);
  const acili = rng() < ayar.capraz;
  const hedefX = acili ? Math.min(Math.max(x0 + (rng() < 0.5 ? -1 : 1) * (60 + rng() * 120), 20), w - 40) : x0;
  return { x0, hedefX, hiz: ayar.hiz * (0.9 + rng() * 0.25) };
}
