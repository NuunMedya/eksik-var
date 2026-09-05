// Kura: kadroyu iki dengeli takıma böler. Kaleciler ayrı takımlara, sonra puana göre yılan sıralı dağıtım;
// eşit puanlılar her seferinde farklı sırada gelir ki "yeniden karıştır" gerçekten karıştırsın.
export const TEAM_NAMES = [{ id: "A", name: "Yelekliler", emoji: "🟢" }, { id: "B", name: "Yeleksizler", emoji: "🟠" }];

const shuffle = (arr) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sum = (t) => t.reduce((s, p) => s + (p.rating || 0), 0);
export const avg = (t) => (t.length ? +(sum(t) / t.length).toFixed(2) : 0);
const isGk = (p) => (p.positions || []).includes("kaleci") || p.position === "kaleci";

export function makeTeams(players, mode = "dengeli") {
  const pool = shuffle(players);
  const A = [], B = [];
  if (mode === "rastgele") {
    pool.forEach((p, i) => (i % 2 === 0 ? A : B).push(p));
    return { A, B };
  }
  // kaleciler önce, ayrı takımlara
  const gks = pool.filter(isGk); const rest = pool.filter((p) => !isGk(p));
  gks.forEach((p, i) => (i % 2 === 0 ? A : B).push(p));
  // kalanlar: puana göre azalan (eşitler karışık), her adımda toplamı düşük olan takıma; boyut farkı 1'i aşmasın
  rest.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  rest.forEach((p) => {
    const aFull = A.length - B.length >= 1, bFull = B.length - A.length >= 1;
    if (aFull) B.push(p); else if (bFull) A.push(p);
    else (sum(A) <= sum(B) ? A : B).push(p);
  });
  return { A, B };
}

export function lineupText(title, teams) {
  const line = (t, team) => `${t.emoji} ${t.name} (★${avg(team)}): ${team.map((p) => p.name.split(" ")[0]).join(", ")}`;
  return `⚽ Kura sonucu · ${title}\n${line(TEAM_NAMES[0], teams.A)}\n${line(TEAM_NAMES[1], teams.B)}`;
}
