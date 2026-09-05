// Eksik Var — rozetler ve haftalık özet.
// Bilerek bağımlılıksız (saf): Node testlerinde doğrudan içe aktarılır.
// Başlık ve açıklamalar Türkçe anahtar; ekranlar t() ile çevirir.

const num = (v) => Number(v || 0);

// flag'li rozetler tek adımda kazanılır; value/goal'lüler ilerleme gösterir
export const BADGES = [
  { id: "kurucu", icon: "🌱", title: "Kurucu üye",  desc: "İlk sezondan beri aramızda",        flag: (u) => !!u.founder },
  { id: "ekip",   icon: "🤝", title: "Ekip kurucu", desc: "Ekibini uygulamaya taşıdı",         flag: (u) => !!u.teamName },
  { id: "mac10",  icon: "🥉", title: "10 maç",      desc: "10 maça katıldı",                   value: (u) => num(u.joined), goal: 10 },
  { id: "mac50",  icon: "🥇", title: "50 maç",      desc: "50 maça katıldı",                   value: (u) => num(u.joined), goal: 50 },
  { id: "seri10", icon: "🛡️", title: "Tam güven",   desc: "Üst üste 10 maç, sıfır kaçak",      value: (u) => num(u.streak), goal: 10 },
  { id: "mvp5",   icon: "🏆", title: "5× MVP",      desc: "5 kez maçın oyuncusu seçildi",      value: (u) => num(u.mvpCount), goal: 5 },
  { id: "org5",   icon: "📋", title: "Organizatör", desc: "5 maç organize etti",               value: (u) => num(u.organized), goal: 5 },
  { id: "golcu",  icon: "⚽", title: "Golcü",       desc: "10 gol attı",                       value: (u) => num(u.totals && u.totals.goals), goal: 10 },
];

export function badgesFor(u) {
  const user = u || {};
  return BADGES.map((b) => {
    if (b.flag) { const e = b.flag(user); return { ...b, earned: e, value: e ? 1 : 0, goal: 1, progress: e ? 1 : 0 }; }
    const v = b.value(user);
    return { ...b, earned: v >= b.goal, value: Math.min(v, b.goal), goal: b.goal, progress: Math.min(1, v / b.goal) };
  });
}

export const earnedBadges = (u) => badgesFor(u).filter((b) => b.earned);

// Kazanılmamışlar arasında hedefe en yakın olan (özet ve profil "sıradaki" için)
export function nextBadge(u) {
  return badgesFor(u).filter((b) => !b.earned).sort((a, b) => b.progress - a.progress)[0] || null;
}

/* ---------- haftalık özet (Pazartesi) ----------
   Demo: biten etkinliklerden hesaplar; canlı modda sunucu geçen haftayı süzer. */
export function buildWeeklyDigest(user, events) {
  const played = (events || []).filter((e) => (e.joined || e.mine) && e.ended);
  const mine = played.map((e) => (e.stats || []).find((s) => s.id === "me")).filter(Boolean);
  const goals = mine.reduce((a, s) => a + num(s.goals), 0);
  const assists = mine.reduce((a, s) => a + num(s.assists), 0);
  const mvp = played.some((e) => e.mvp && e.mvp.final && e.mvp.id === "me");
  const upcoming = (events || []).filter((e) => (e.joined || e.mine) && !e.ended && e.status !== "iptal").slice(0, 3);
  const badges = badgesFor(user);
  return {
    matches: played.length, goals, assists, mvp, upcoming,
    next: nextBadge(user), earned: badges.filter((b) => b.earned).length, total: badges.length,
  };
}

// Paylaşım metni (organik yayılım) · link çağırandan gelir (data.APP_LINK)
export function buildDigestShare(user, digest, link) {
  return [
    "📬 Haftalık özetim · Eksik Var",
    `⚽ ${digest.matches} maç · ${digest.goals} gol · ${digest.assists} asist${digest.mvp ? " · 🏆 MVP" : ""}`,
    `🎖 ${digest.earned}/${digest.total} rozet`,
    "",
    `Sen de gel: ${link}?d=${user.username}`,
  ].join("\n");
}
