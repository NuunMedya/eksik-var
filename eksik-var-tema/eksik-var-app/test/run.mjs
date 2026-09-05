// Saf mantık testleri: node test/run.mjs  (bağımlılık yok)
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
const here = path.dirname(fileURLToPath(import.meta.url));
// data.js "./theme" içe aktarımını ESM'de çözebilmek için geçici kopya
const tmp = path.join(here, "_data.mjs");
fs.writeFileSync(tmp, fs.readFileSync(path.join(here, "../src/data.js"), "utf8").replace('from "./theme"', 'from "../src/theme.js"'));
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
console.log(`\n${n} test geçti`);
