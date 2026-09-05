// Eksik Var — sponsor sistemi.
// Canlı modda kaynak Supabase "sponsors" tablosudur (panelden yönetilir);
// tablo boş ya da erişilemezse bu varsayılanlar devreye girer. Saf ve testlenebilir.

export const DEFAULT_SPONSORS = [
  {
    id: "elitlig", name: "Elit Lig", emoji: "🏆", color: "#3E1F76",
    tagline: "Takımını lige taşı — fikstür, puan durumu, istatistik hazır",
    cta: "Ligi incele",
    url: "https://www.elitlig.com",   // ← metni ve adresi Supabase panelinden güncelleyebilirsiniz
    active: true, priority: 1,
  },
];

// Akışa sponsor kartı serpiştirir: ilk kart `first`. ilandan sonra, ardından her `every` ilanda bir.
// Liste kısaysa (hiç araya girilemediyse) sona bir kart ekler ki sponsor her akışta görünsün.
export function injectSponsors(list, sponsors, first = 2, every = 7) {
  const act = (sponsors || []).filter((s) => s && s.active !== false && s.url);
  if (!act.length) return list || [];
  const src = list || [];
  const out = [];
  let si = 0;
  src.forEach((item, i) => {
    out.push(item);
    const n = i + 1;
    if (n === first || (n > first && (n - first) % every === 0)) {
      out.push({ sponsorItem: true, id: "sp-" + n, s: act[si % act.length] });
      si += 1;
    }
  });
  if (src.length > 0 && si === 0) out.push({ sponsorItem: true, id: "sp-son", s: act[0] });
  return out;
}
