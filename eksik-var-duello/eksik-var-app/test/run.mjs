// Saf mantık testleri: node test/run.mjs  (bağımlılık yok)
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
const here = path.dirname(fileURLToPath(import.meta.url));
// data.js "./theme" içe aktarımını ESM'de çözebilmek için geçici kopya
const tmp = path.join(here, "_data.mjs");
fs.writeFileSync(tmp, fs.readFileSync(path.join(here, "../src/data.js"), "utf8").replace('from "./theme"', 'from "../src/theme.js"').replace('from "./i18n"', 'from "../src/i18n.js"'));
const d = await import(tmp); fs.unlinkSync(tmp);
const lineup = await import("../src/lineup.js");
let n = 0; const t = (name, fn) => { fn(); n++; console.log("✓", name); };

t("normalizePhone: Türkiye cep biçimleri", () => {
  for (const x of ["0532 123 45 67", "532 123 45 67", "+90 532 123 45 67", "905321234567"]) assert.equal(d.normalizePhone(x), "+905321234567");
  assert.equal(d.normalizePhone("0212 555 66 77"), null); assert.equal(d.normalizePhone("abc"), null);
});
t("formatIban / isValidIban / extractIban", () => {
  assert.equal(d.isValidIban("TR12 0006 4000 0011 2345 6789 01"), true); assert.equal(d.isValidIban("TR12"), false);
  assert.equal(d.extractIban("💳 Saha ücreti 150₺ · IBAN: TR12 0006 4000 0011 2345 6789 01 (Ali)").raw, "TR120006400000112345678901");
  assert.equal(d.extractIban("merhaba"), null);
});
t("relInfo: yeni oyuncu ve yumuşatma", () => {
  assert.equal(d.relInfo({ joined: 0, noShow: 1 }).isNew, true);
  assert.equal(d.relInfo({ joined: 4, noShow: 0 }).text, "Yeni · 4 maç");
  const r = d.relInfo({ joined: 5, noShow: 1 }); assert.equal(r.isNew, false); assert.ok(r.pct >= 85 && r.pct <= 95, "yumuşatılmış: " + r.pct);
  assert.equal(d.relInfo({ rel: 92 }).text, "%92");
});
t("positionSlots / matchesMyPositions", () => {
  const ev = { needed: 3, needs: { kaleci: 1, defans: 1 }, filledPos: { defans: 1 } };
  const slots = d.positionSlots(ev);
  assert.deepEqual(slots.map((s) => [s.id, s.filled, s.quota]), [["kaleci", 0, 1], ["defans", 1, 1], ["farketmez", 0, 1]]);
  assert.equal(d.matchesMyPositions(ev, ["forvet"]), true);      // serbest yer var
  assert.equal(d.matchesMyPositions({ needed: 1, needs: { kaleci: 1 }, filledPos: {} }, ["forvet"]), false);
});
t("sportFormats / inferFormat", () => {
  assert.equal(d.formatPlayers(4, "1v1"), 2); assert.equal(d.formatPlayers(2, "3x3"), 6);
  assert.equal(d.inferFormat(1, 14), "7v7"); assert.equal(d.inferFormat(4, 2), "1v1");
});
t("fmtEventDate: bugün / yarın / tam tarih", () => {
  const days = d.nextDates(3);
  assert.ok(d.fmtEventDate(days[0].iso, "21:00").startsWith("Bugün"));
  assert.ok(d.fmtEventDate(days[1].iso, "21:00").startsWith("Yarın"));
  assert.match(d.fmtEventDate(days[2].iso, "21:00"), /^[A-ZÇŞİĞÜÖ][a-zçşığüö]{2} \d{1,2} [A-ZÇŞİĞÜÖ][a-zçşığüö]{2} · 21:00$/);
});
t("eventPhase", () => {
  assert.equal(d.eventPhase({ status: "iptal" }), "iptal");
  assert.equal(d.eventPhase({ status: "tamamlandi" }), "tamamlandi");
  assert.equal(d.eventPhase({ status: "acik", ended: true }), "oynandi");
  assert.equal(d.eventPhase({ status: "doldu", dateISO: "2000-01-01" }), "dolu");
});
t("makeTeams: kaleciler ayrı, mevki dengeli, boyut farkı ≤ 1", () => {
  const P = Array.from({ length: 13 }, (_, i) => ({ id: "p" + i, name: "O" + i, rating: 3.5 + (i % 5) * 0.3, positions: i < 2 ? ["kaleci"] : i < 6 ? ["defans"] : i < 10 ? ["orta"] : ["forvet"] }));
  for (let k = 0; k < 50; k++) {
    const { A, B } = lineup.makeTeams(P, "dengeli");
    const c = (T, pos) => T.filter((p) => p.positions.includes(pos)).length;
    assert.equal(c(A, "kaleci"), 1); assert.equal(c(B, "kaleci"), 1);
    assert.ok(Math.abs(c(A, "defans") - c(B, "defans")) <= 1); assert.ok(Math.abs(A.length - B.length) <= 1);
    assert.ok(Math.abs(lineup.avg(A) - lineup.avg(B)) < 0.6);
  }
});
t("paymentSummary / buildMatchSummary", () => {
  const sm = d.paymentSummary([{ amount: 150, status: "odendi" }, { amount: 150, status: "bekliyor" }, { amount: 150, status: "muaf" }]);
  assert.deepEqual(sm, { total: 3, paid: 2, pending: 150 });
  const txt = d.buildMatchSummary({ title: "Cuma", date: "Cum 5 Eyl · 22:00", score: { home: 5, away: 4, label: "A – B" }, mvp: { name: "Zeynep Arslan", votes: 6, final: true } }, { stats: [{ name: "Zeynep A", goals: 3, assists: 0 }] });
  assert.ok(txt.includes("5 – 4") && txt.includes("MVP: Zeynep") && txt.includes("Goller: Zeynep 3"));
});
t("availabilityFor: örnek seride öneri", () => {
  const e2 = d.SEED_EVENTS.find((e) => e.id === "e2"); const a = d.availabilityFor(e2, d.SEED_CHATS);
  assert.equal(a.varim, 8); assert.equal(a.yokum, 1); assert.equal(a.cevapsiz, 1); assert.equal(a.suggested, 3);
});
const team = await import("../src/team.js");
const badges = await import("../src/badges.js");

t("teamRecord / formDots / opponentTable", () => {
  const h = [{ home: 5, away: 4 }, { home: 2, away: 2 }, { home: 1, away: 3 }];
  const r = team.teamRecord(h);
  assert.deepEqual([r.g, r.b, r.m, r.played], [1, 1, 1, 3]);
  assert.equal(r.gf, 8); assert.equal(r.ga, 9); assert.equal(r.diff, -1); assert.equal(r.winPct, 33);
  assert.deepEqual(team.formDots(h), ["g", "b", "m"]);
  const rec = team.teamRecord(team.MY_TEAM.history);
  assert.deepEqual([rec.g, rec.b, rec.m], [3, 1, 2]);
  assert.equal(team.opponentTable(team.MY_TEAM.history)[0].played, 2);   // en çok oynanan rakip önde
});
t("badgesFor: eşikler, ilerleme, sıradaki", () => {
  const u = { joined: 23, mvpCount: 1, organized: 5, totals: { goals: 14 }, founder: true, streak: 7, teamName: "X" };
  const map = Object.fromEntries(badges.badgesFor(u).map((b) => [b.id, b]));
  assert.equal(map.mac10.earned, true); assert.equal(map.mac50.earned, false); assert.equal(map.mac50.value, 23);
  assert.equal(map.org5.earned, true); assert.equal(map.golcu.earned, true); assert.equal(map.kurucu.earned, true);
  assert.equal(map.mvp5.earned, false); assert.equal(map.seri10.value, 7);
  assert.equal(badges.earnedBadges(u).length, 5);
  assert.equal(badges.nextBadge(u).id, "seri10");                        // 7/10 hedefe en yakın
  assert.equal(badges.badgesFor({}).filter((b) => b.earned).length, 0);  // boş kullanıcı güvenli
});
t("buildWeeklyDigest / buildDigestShare", () => {
  const evs = [
    { joined: true, ended: true, stats: [{ id: "me", goals: 1, assists: 2 }], mvp: { id: "zeynep", final: true } },
    { mine: true, ended: true },
    { joined: true, ended: false, status: "acik", id: "x", title: "T", date: "D", venue: "V" },
  ];
  const dg = badges.buildWeeklyDigest({ joined: 23 }, evs);
  assert.equal(dg.matches, 2); assert.equal(dg.goals, 1); assert.equal(dg.assists, 2);
  assert.equal(dg.mvp, false); assert.equal(dg.upcoming.length, 1);
  const txt = badges.buildDigestShare({ username: "emre_k" }, dg, "https://eksikvar.app");
  assert.ok(txt.includes("2 maç · 1 gol · 2 asist") && txt.includes("?d=emre_k"));
});
t("toggleReaction / myReaction / replyPreview", () => {
  const ben = { id: "me", name: "Emre" };
  let r = d.toggleReaction({}, "👍", ben);
  assert.deepEqual(Object.keys(r), ["👍"]);
  r = d.toggleReaction(r, "❤️", ben);                       // farklı emoji: taşınır
  assert.deepEqual(Object.keys(r), ["❤️"]);
  assert.equal(d.myReaction(r), "❤️");
  r = d.toggleReaction(r, "❤️", ben);                       // aynı emoji: kaldırılır
  assert.deepEqual(r, {}); assert.equal(d.myReaction(r), null);
  const iki = d.toggleReaction({ "👍": [{ id: "ozan", name: "Ozan" }] }, "👍", ben);
  assert.equal(iki["👍"].length, 2);
  assert.deepEqual(d.reactionList({ "🔥": [1, 2].map(() => ({ id: "x" })), "👍": [{ id: "y" }] })[0][0], "🔥");
  const p = d.replyPreview({ id: "m1", from: "ozan", name: "Ozan Demir", text: "x".repeat(200) });
  assert.equal(p.name, "Ozan Demir"); assert.equal(p.text.length, 90);
  assert.equal(d.replyPreview({ id: "m2", from: "me", image: "u" }).text, "📷 Fotoğraf");
});
const sp = await import("../src/sponsors.js");
t("injectSponsors: yerleşim ve kısa liste", () => {
  const S = [{ id: "x", url: "https://x", active: true }];
  const L = (k) => Array.from({ length: k }, (_, i) => ({ id: "e" + i }));
  const on = sp.injectSponsors(L(10), S);                 // 2.den sonra + her 7'de bir
  assert.deepEqual(on.map((x) => x.sponsorItem ? "S" : "."), [".", ".", "S", ".", ".", ".", ".", ".", ".", ".", "S", "."]);
  assert.equal(sp.injectSponsors(L(1), S).filter((x) => x.sponsorItem).length, 1);   // kısa listede sona ekler
  assert.deepEqual(sp.injectSponsors(L(3), []), L(3));                                // sponsor yoksa dokunmaz
  assert.equal(sp.injectSponsors([], S).length, 0);                                   // boş akışa karışmaz
});
const vn = await import("../src/venues.js");
t("saha havuzu: süzme ve birleştirme", () => {
  const L = [{ name: "Yıldız Halı Saha", category_id: 1 }, { name: "Arena SPOR", category_id: 1 }];
  assert.equal(vn.filterVenues(L, "yıldız").length, 1);
  assert.equal(vn.filterVenues(L, "").length, 2);
  const m = vn.mergeVenues(L, [{ name: "arena spor", category_id: 1 }, { name: "Kort A", category_id: 4 }]);
  assert.equal(m.length, 3);                                  // arena tekilleşti
  assert.equal(vn.normVenue("  ÇAĞLAYAN  Spor "), "çağlayan spor");
});
const ro = await import("../src/roster.js");
t("whatsapp kadro çözümleyici", () => {
  const m = "Perşembe Halı Saha 21:00 ⚽\n1. Ali Yılmaz ✅\n2- Veli (kaleci)\n3) Hasan 🧤\n• Ozan Demir\nMurat +90 532 111 22 33\n4. Ali Yılmaz\nhttps://x.co\n5.";
  const p = ro.parseRoster(m);
  assert.deepEqual(p.map((x) => x.name), ["Ali Yılmaz", "Veli", "Hasan", "Ozan Demir", "Murat"]);
  assert.deepEqual(p.map((x) => x.gk), [false, true, true, false, false]);
  assert.equal(ro.parseRoster("").length, 0);
});
t("pazar süzgeci", () => {
  const L = d.SEED_MARKET;
  assert.equal(d.marketFilter(L, {}).length, 3);
  assert.equal(d.marketFilter(L, { cat: 2 }).length, 1);
  assert.equal(d.marketFilter(L, { district: "Çankaya" })[0].name, "Zeynep Arslan");
  assert.equal(d.marketFilter(L, { q: "şut" }).length, 1);
});
t("timeAgo göreli zaman", () => {
  const su_an = Date.now();
  const iso = (sn) => new Date(su_an - sn * 1000).toISOString();
  assert.equal(d.timeAgo(iso(20), su_an), "şimdi");
  assert.equal(d.timeAgo(iso(180), su_an), "3 dk önce");
  assert.equal(d.timeAgo(iso(7200), su_an), "2 sa önce");
  assert.equal(d.timeAgo(iso(2 * 86400), su_an), "2 gün önce");
});
const pn = await import("../src/penalti.js");
t("penaltı düello mantığı", () => {
  const H = { sutun: "sol", kat: "alt" };
  assert.equal(pn.basitVurus(H, { sutun: "sol", kat: "alt" }).sonuc, "kurtaris");
  assert.equal(pn.basitVurus(H, { sutun: "sag", kat: "ust" }).sonuc, "gol");
  assert.equal(pn.basitVurus(H, { sutun: "sol", kat: "ust" }, () => 0.3).sonuc, "kurtaris");
  assert.equal(pn.basitVurus(H, { sutun: "sol", kat: "ust" }, () => 0.7).sonuc, "gol");
  assert.equal(pn.bittiMi(3, 3, 5, 5), false);   // eşit → ölüm-kalım
  assert.equal(pn.bittiMi(4, 3, 5, 5), true);
  assert.equal(pn.bittiMi(5, 4, 6, 5), false);   // tur yarım → bekle
  assert.equal(pn.bittiMi(5, 4, 6, 6), true);
});
const bk = await import("../src/basket.js");
t("basket yağmuru mantığı", () => {
  assert.equal(bk.ileriSar(0, 1, 0.1, 100, 100).x, 10);                    // düz ilerleme
  const y = bk.ileriSar(90, 1, 0.1, 300, 100);                              // sınırdan yansıma
  assert.equal(y.x, 80); assert.equal(y.yon, -1);
  assert.equal(bk.isabet(10, 20), true);
  assert.equal(bk.isabet(-25, 20), false);
  assert.equal(bk.seriCarpan(2), 1); assert.equal(bk.seriCarpan(4), 2); assert.equal(bk.seriCarpan(7), 3);
  assert.ok(bk.turAyari(0).hiz < bk.turAyari(10).hiz);
  assert.ok(bk.turAyari(0).tolerans > bk.turAyari(10).tolerans);
});
const vl = await import("../src/voleybol.js");
t("libero mantığı", () => {
  assert.ok(vl.spawnAyar(20).aralik < vl.spawnAyar(0).aralik);
  assert.ok(vl.spawnAyar(20).hiz > vl.spawnAyar(0).hiz);
  assert.equal(vl.kurtardiMi(100, 90, 30), true);
  assert.equal(vl.kurtardiMi(100, 60, 30), false);
  const s = vl.servisUret(300, vl.spawnAyar(0), () => 0.5);
  assert.ok(s.x0 >= 30 && s.x0 <= 270);
  assert.ok(vl.inisSuresi(400, 0.2) === 2000);
});
const tn = await import("../src/tenis.js");
t("duvar rallisi fiziği", () => {
  const s1 = tn.sonrakiSegment(50, 50, 0.1, -0.1, 200, 400);   // üst duvara
  assert.equal(s1.tip, "ust"); assert.equal(s1.y2, 0); assert.ok(s1.vy > 0);
  const s2 = tn.sonrakiSegment(190, 50, 0.2, 0.05, 200, 400);  // yan duvara
  assert.equal(s2.tip, "yan"); assert.ok(s2.vx < 0);
  assert.equal(tn.karsiladiMi(100, 90, 30), true);
  assert.equal(tn.karsiladiMi(100, 60, 30), false);
  const sk = tn.sekme(0.1, 0.2, 120, 100, 40, tn.hizKademe(5));
  assert.ok(sk.vy < 0);                                        // yukarı döner
  assert.ok(tn.hizKademe(10) > tn.hizKademe(0));               // merdiven yukarı
  assert.ok(Math.abs(Math.hypot(sk.vx, sk.vy) - tn.hizKademe(5)) < 0.01);
});
console.log(`\n${n} test geçti`);
