// Penaltı düellosu — saf oyun mantığı (testlenebilir).
// 3 köşe: sol / orta / sag. Kaleci rastgele dalar; aynı köşe = kurtarış.
export const KOSELER = ["sol", "orta", "sag"];
export const kaleciSec = (rng = Math.random) => KOSELER[Math.floor(rng() * 3)];
export const sut = (secim, kaleci) => ({ gol: secim !== kaleci, kaleci });
export const ozetMetni = (gol, toplam) =>
  gol === toplam ? t5("Kusursuz seri! 🏆") : gol >= 4 ? t5("Golcü ayağın var! 🔥")
  : gol >= 3 ? t5("Fena değil — biraz daha soğukkanlılık 😉") : t5("Kaleci bugün formda… tekrar dene! 🧤");
const t5 = (x) => x;   // i18n ekranda uygulanır; mantık saf kalsın
