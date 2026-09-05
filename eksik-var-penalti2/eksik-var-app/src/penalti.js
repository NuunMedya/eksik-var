// Penaltı 2.0 — saf oyun mantığı (testlenebilir).
// Kale 6 bölge: 3 sütun (sol/orta/sag) × 2 kat (alt/ust).
// Güç: 0..1 → zayıf vuruş kurtarılır, aşırısı direğe/dışarı gider.

export const SUTUNLAR = ["sol", "orta", "sag"];
export const KATLAR = ["ust", "alt"];
export const BOLGELER = KATLAR.flatMap((kat) => SUTUNLAR.map((sutun) => ({ id: `${sutun}-${kat}`, sutun, kat })));

export const gucDegerlendir = (g) => (g < 0.35 ? "zayif" : g > 0.92 ? "asiri" : "iyi");

// hedef/kaleci: {sutun, kat}. Dönen sonuc: gol | kurtaris | direk | dis
export function vurus(hedef, guc, kaleci, rng = Math.random) {
  const gd = gucDegerlendir(guc);
  if (gd === "asiri") return { sonuc: rng() < 0.5 ? "direk" : "dis", gd };
  if (hedef.kat === "ust" && rng() < 0.1) return { sonuc: "dis", gd };   // üst köşe riski
  const ayniSutun = kaleci.sutun === hedef.sutun;
  const ayniKat = kaleci.kat === hedef.kat;
  if (ayniSutun && ayniKat) return { sonuc: "kurtaris", gd };
  if (ayniSutun) return { sonuc: rng() < (gd === "zayif" ? 0.8 : 0.4) ? "kurtaris" : "gol", gd };
  if (gd === "zayif" && rng() < 0.3) return { sonuc: "kurtaris", gd };   // zayıf topa uzanır
  return { sonuc: "gol", gd };
}

export const botKaleci = (rng = Math.random) =>
  ({ sutun: SUTUNLAR[Math.floor(rng() * 3)], kat: KATLAR[Math.floor(rng() * 2)] });

// Kaleci modunda botun şutu: köşeleri sever, gücü genelde iyidir
export const botAtis = (rng = Math.random) => ({
  hedef: { sutun: SUTUNLAR[Math.floor(rng() * 3)], kat: rng() < 0.55 ? "alt" : "ust" },
  guc: 0.45 + rng() * 0.45,
});
