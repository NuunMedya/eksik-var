// Smaç Serisi — saf mantık. Pas havalanır (sure ms'de tepe = sure/2),
// oyuncu tepe penceresinde boş yöne vurmalı.
export const YONLER = ["sol", "orta", "sag"];
export const blokYonu = (rng = Math.random) => YONLER[Math.floor(rng() * 3)];
export const zamanla = (gecen, tepe, tol) =>
  gecen < tepe - tol ? "erken" : gecen > tepe + tol ? "gec" : "ideal";
export function smac(yon, blok, zaman) {
  if (zaman === "erken") return "file";
  if (zaman === "gec") return "aut";
  return yon === blok ? "blok" : "sayi";
}
// sayı arttıkça pas hızlanır, pencere daralır
export const volTur = (sayi) => ({
  sure: Math.max(1500 - sayi * 55, 700),
  tol: Math.max(170 - sayi * 6, 80),
});
