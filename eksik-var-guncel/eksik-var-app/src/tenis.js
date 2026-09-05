// Duvar Rallisi — segment fiziği: top bir sonraki çarpmaya dek düz gider.
// Alan: x 0..W, y 0 (üst duvar) .. H (alt raket çizgisi). Hızlar px/ms.
export function sonrakiSegment(x, y, vx, vy, W, H) {
  const tX = vx > 0 ? (W - x) / vx : vx < 0 ? -x / vx : Infinity;
  const tY = vy > 0 ? (H - y) / vy : vy < 0 ? -y / vy : Infinity;
  const t = Math.min(tX, tY);
  const x2 = x + vx * t, y2 = y + vy * t;
  if (tY <= tX) {
    if (vy < 0) return { t, x2, y2, tip: "ust", vx, vy: -vy };
    return { t, x2, y2, tip: "alt", vx, vy };            // raket çizgisi: karar ekranda
  }
  return { t, x2, y2, tip: "yan", vx: -vx, vy };
}
export const karsiladiMi = (topX, raketX, yariGenislik) => Math.abs(topX - raketX) <= yariGenislik;
// skor kademesi: hız cana değil skora bağlı — can yansa da geri düşmez
export const hizKademe = (skor) => Math.min(0.26 + skor * 0.014, 0.62);

// raketle vuruş: hız = kademe; vuruş noktası açıyı değiştirir
export function sekme(vx, vy, topX, raketX, yariGenislik, hedefHiz) {
  const sapma = (topX - raketX) / yariGenislik;          // -1..1
  const hiz = hedefHiz != null ? hedefHiz : Math.min(Math.hypot(vx, vy) * 1.06, 0.9);
  const aci = sapma * 0.9;
  const yeniVx = Math.sin(aci) * hiz;
  return { vx: yeniVx, vy: -Math.sqrt(Math.max(hiz * hiz - yeniVx * yeniVx, 0.01)) };
}
