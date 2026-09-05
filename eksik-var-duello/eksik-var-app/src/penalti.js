// Penaltı Düellosu — saf mantık (güç çubuksuz, akıl oyunu).
// Aynı bölge = kurtarış; aynı sütun farklı kat = %50; gerisi gol.
export const SUTUNLAR = ["sol", "orta", "sag"];
export const KATLAR = ["ust", "alt"];
export const BOLGELER = KATLAR.flatMap((kat) => SUTUNLAR.map((sutun) => ({ id: `${sutun}-${kat}`, sutun, kat })));

export function basitVurus(hedef, kaleci, rng = Math.random) {
  if (hedef.sutun === kaleci.sutun && hedef.kat === kaleci.kat) return { sonuc: "kurtaris" };
  if (hedef.sutun === kaleci.sutun) return { sonuc: rng() < 0.5 ? "kurtaris" : "gol" };
  return { sonuc: "gol" };
}
export const botKaleci = (rng = Math.random) =>
  ({ sutun: SUTUNLAR[Math.floor(rng() * 3)], kat: KATLAR[Math.floor(rng() * 2)] });
export const botHedef = (rng = Math.random) =>
  ({ sutun: SUTUNLAR[Math.floor(rng() * 3)], kat: rng() < 0.5 ? "alt" : "ust" });

// seri penaltı durumu: 5'er atıştan sonra eşitse ölüm-kalım (tur sonunda fark varsa biter)
export function bittiMi(golA, golB, atisA, atisB) {
  if (atisA < 5 || atisB < 5) return false;
  if (atisA !== atisB) return false;            // tur tamamlanmadan karar yok
  return golA !== golB;
}
