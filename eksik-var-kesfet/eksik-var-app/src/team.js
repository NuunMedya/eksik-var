// Eksik Var — takım profili: amblem, sezon kaydı, rakip geçmişi.
// Bilerek bağımlılıksız (saf): Node testlerinde doğrudan içe aktarılır.
// Kadro (roster) DemoApp'te kurulur; canlı modda Supabase'ten gelecek.

export const EMBLEM_ICONS = ["🦅", "🦁", "🐺", "🐂", "🔥", "⚡", "⭐", "🛡️", "⚽", "🏆", "🐉", "🦈"];
export const EMBLEM_COLORS = ["#0B3D2E", "#1D5FBF", "#7C3AED", "#B4232A", "#B45309", "#0F766E", "#334155", "#F4600C"];

// Demo takımı: kullanıcının haftalık serisine (e2 · Pazar Ligi) bağlı
// history en yeni önde · home = bizim gol, away = rakibin golü
export const MY_TEAM = {
  id: "t-me", name: "Keçiören Kartalları",
  emblem: { icon: "🦅", color: "#0B3D2E" },
  founded: "Mart 2026", city: "Ankara", district: "Keçiören",
  homeVenue: "Arena Spor Tesisleri, Keçiören",
  seriesId: "e2", captainId: "me",
  history: [
    { id: "h1", opponent: "Çankaya Yıldızları",  date: "Geçen Paz",    venue: "Arena Spor Tesisleri", home: 5, away: 4 },
    { id: "h2", opponent: "Etimesgut Boğaları",  date: "2 hafta önce", venue: "Eryaman Spor Kompleksi", home: 2, away: 2 },
    { id: "h3", opponent: "Kızılay Gücü",        date: "3 hafta önce", venue: "Arena Spor Tesisleri", home: 3, away: 1 },
    { id: "h4", opponent: "Çankaya Yıldızları",  date: "1 ay önce",    venue: "Yıldız Halı Saha",     home: 1, away: 4 },
    { id: "h5", opponent: "Batıkent Şimşekleri", date: "1 ay önce",    venue: "Arena Spor Tesisleri", home: 4, away: 2 },
    { id: "h6", opponent: "Kızılay Gücü",        date: "6 hafta önce", venue: "GoldSaha, Kızılay",    home: 2, away: 3 },
  ],
};

// g: galibiyet · b: beraberlik · m: mağlubiyet
export const resultOf = (match) =>
  Number(match.home) > Number(match.away) ? "g" : Number(match.home) < Number(match.away) ? "m" : "b";

export function teamRecord(history) {
  const r = { g: 0, b: 0, m: 0, gf: 0, ga: 0 };
  (history || []).forEach((h) => {
    r[resultOf(h)] += 1; r.gf += Number(h.home) || 0; r.ga += Number(h.away) || 0;
  });
  const played = r.g + r.b + r.m;
  return { ...r, played, diff: r.gf - r.ga, winPct: played ? Math.round((r.g / played) * 100) : 0 };
}

// Son n maçın sonucu, en yenisi önde: ["g","b","g",...]
export const formDots = (history, n = 5) => (history || []).slice(0, n).map(resultOf);

// Rakip bazında özet tablo: en çok oynanan önde
export function opponentTable(history) {
  const map = {};
  (history || []).forEach((h) => {
    const o = map[h.opponent] || (map[h.opponent] = { name: h.opponent, played: 0, g: 0, b: 0, m: 0, gf: 0, ga: 0 });
    o.played += 1; o[resultOf(h)] += 1; o.gf += Number(h.home) || 0; o.ga += Number(h.away) || 0;
  });
  return Object.values(map).sort((a, b) => b.played - a.played || a.name.localeCompare(b.name, "tr"));
}
