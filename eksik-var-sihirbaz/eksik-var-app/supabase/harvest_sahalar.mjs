// Eksik Var — OSM saha hasadı
// Çalıştırma (uygulama klasöründe):  node supabase/harvest_sahalar.mjs
// Ne yapar: 81 il × 4 spor için OpenStreetMap'ten İSİMLİ tesisleri çeker,
// supabase/seed_sahalar.sql dosyasını üretir. Yarıda kesilirse tekrar
// çalıştırın; kaldığı ilden devam eder (harvest_ckpt.json).
// Süre: ~10-20 dk (OSM sunucusuna saygılı beklemelerle).

import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";

const SPORLAR = { 1: "soccer", 2: "basketball", 3: "volleyball", 4: "tennis" };
const AYNALAR = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// İl (id, ad) çiftlerini seed_iller.sql'den oku — tek gerçek kaynak
const iller = [...readFileSync(new URL("./seed_iller.sql", import.meta.url), "utf8")
  .split("public.districts")[0]                     // yalnız il bölümü (ilçeler karışmasın)
  .matchAll(/\((\d+), '([^']+)'\)/g)]
  .map((m) => [Number(m[1]), m[2]]);

const ckptYol = new URL("./harvest_ckpt.json", import.meta.url);
const cikti = new URL("./seed_sahalar.sql", import.meta.url);
const ckpt = existsSync(ckptYol) ? JSON.parse(readFileSync(ckptYol, "utf8")) : { yapilan: [] };
if (!existsSync(cikti) || ckpt.yapilan.length === 0) {
  writeFileSync(cikti, "-- OSM hasadı: isimli saha/kortlar (kaynak: OpenStreetMap katkıcıları, ODbL)\n");
}

const uyut = (ms) => new Promise((r) => setTimeout(r, ms));
const kacir = (s) => s.replace(/'/g, "''").slice(0, 80);

async function sorgula(il, spor) {
  const q = `[out:json][timeout:60];area["name"="${il}"]["admin_level"="4"]["boundary"="administrative"]->.a;nwr["sport"~"(^|;) *${spor} *(;|$)"]["name"](area.a);out center 500;`;
  const basliklar = {
    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
    "User-Agent": "EksikVarApp/1.0 (saha hasadi; +https://github.com/NuunMedya/eksik-var)",
    "Accept": "application/json",
  };
  for (let deneme = 0; deneme < 6; deneme++) {
    const ayna = AYNALAR[deneme % AYNALAR.length];
    try {
      // önce POST; olmadı mı aynı aynaya GET ile bir şans daha
      let r = await fetch(ayna, { method: "POST", body: "data=" + encodeURIComponent(q), headers: basliklar, signal: AbortSignal.timeout(90000) });
      if (!r.ok && r.status !== 429 && r.status !== 504) {
        r = await fetch(ayna + "?data=" + encodeURIComponent(q), { headers: { "User-Agent": basliklar["User-Agent"], "Accept": "application/json" }, signal: AbortSignal.timeout(90000) });
      }
      if (r.status === 429 || r.status === 504) { await uyut(15000 * (deneme + 1)); continue; }
      if (!r.ok) {
        const beden = (await r.text()).replace(/\s+/g, " ").slice(0, 90);
        throw new Error(`HTTP ${r.status} → ${beden}`);
      }
      return (await r.json()).elements || [];
    } catch (e) {
      process.stdout.write(` (tekrar: ${e.name === "TimeoutError" ? "90sn doldu, ayna değişiyor" : e.message})`);
      await uyut(8000 * (deneme + 1));
    }
  }
  return null;   // bu il+spor atlandı; sonraki koşuda tekrar denenir
}

let toplam = 0;
for (const [cityId, il] of iller) {
  if (ckpt.yapilan.includes(cityId)) continue;
  process.stdout.write(`${String(cityId).padStart(2)} ${il}: `);
  const gorulen = new Set();
  const satirlar = [];
  let eksikKaldi = false;
  for (const [catId, spor] of Object.entries(SPORLAR)) {
    const el = await sorgula(il, spor);
    if (el === null) { eksikKaldi = true; process.stdout.write(`${spor}:? `); continue; }
    let n = 0;
    for (const e of el) {
      const ad = e.tags && e.tags.name;
      const lat = e.lat ?? (e.center && e.center.lat);
      const lng = e.lon ?? (e.center && e.center.lon);
      if (!ad || ad.length < 2 || lat == null) continue;
      const anahtar = catId + "|" + ad.toLocaleLowerCase("tr").trim();
      if (gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      satirlar.push(`(${cityId}, ${catId}, '${kacir(ad)}', ${lat.toFixed(6)}, ${lng.toFixed(6)}, 'osm')`);
      n++;
    }
    process.stdout.write(`${spor}:${n} `);
    await uyut(2500);
  }
  if (satirlar.length) {
    appendFileSync(cikti,
      `insert into public.venues (city_id, category_id, name, lat, lng, source) values\n  ` +
      satirlar.join(",\n  ") + "\non conflict do nothing;\n\n");
    toplam += satirlar.length;
  }
  if (!eksikKaldi) { ckpt.yapilan.push(cityId); writeFileSync(ckptYol, JSON.stringify(ckpt)); }
  console.log(`→ ${satirlar.length} saha ${eksikKaldi ? "(yarım, tekrar koşun)" : "✓"}`);
}
console.log(`\nBitti: ${toplam} yeni saha yazıldı → supabase/seed_sahalar.sql`);
console.log("Sırada: dosyayı Supabase SQL Editor'de çalıştırın (pbcopy < supabase/seed_sahalar.sql).");
