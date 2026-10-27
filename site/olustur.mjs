// Eksik Var — şehir/ilçe sayfalarını üretir (docs/<sehir>/index.html, docs/<sehir>/<ilce>/index.html) + sitemap.xml
// Çalıştır: node site/olustur.mjs   (şehir/ilçe listesini Supabase'den çeker; anon anahtar herkese açıktır)
import { mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..", "docs");
const URL = "https://rxmngndtwndqbmlljhth.supabase.co";
const KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bW5nbmR0d25kcWJtbGxqaHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTU1ODksImV4cCI6MjEwMzk5MTU4OX0.ckpunuwIGPFBqil8VQVD3oVfE0Cb_maDfXqfok4AXkc";
const SITE = "https://eksikvarapp.com";
// İlçe sayfası üretilen iller (uygulamanın aktif olduğu şehirler); diğer iller yalnızca il sayfası alır
const ILCELI = ["Ankara", "İstanbul", "İzmir", "Bursa"];
// Sayfa kökünde çakışmaması gereken yollar
const AYRIK = new Set(["e", "docs", "yonetim", "gizlilik", "hesap-silme", "index", "assets"]);

const slug = (s) => s.normalize("NFC")
  .replace(/İ/g, "i").replace(/I/g, "i").replace(/ı/g, "i").replace(/Ş/g, "s").replace(/ş/g, "s").replace(/Ğ/g, "g").replace(/ğ/g, "g")
  .replace(/Ü/g, "u").replace(/ü/g, "u").replace(/Ö/g, "o").replace(/ö/g, "o").replace(/Ç/g, "c").replace(/ç/g, "c").replace(/Â/g, "a").replace(/â/g, "a")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
// "Ankara'da", "İzmir'de", "Bursa'da", "Çankaya'da", "Kadıköy'de" — kaba ünlü uyumu
const ekDa = (ad) => { const u = ad.toLowerCase().replace(/[^aeıioöuü]/g, "").slice(-1); const ince = "eiöü".includes(u); const sert = /[çfhkpsşt]$/i.test(ad); return `${ad}’${sert ? "t" : "d"}${ince ? "e" : "a"}`; };

async function al(path) { const r = await fetch(`${URL}/rest/v1/${path}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } }); if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); }

function sayfa({ il, ilce, ilId, ilceId, ilSlug, ilceSlug, ilceler }) {
  const yer = ilce || il;
  const baslik = ilce ? `${ekDa(ilce)} halı saha eksik oyuncu ilanları` : `${ekDa(il)} halı saha, basketbol ve voleybol maçları`;
  const aciklama = ilce
    ? `${ilce}, ${ekDa(il)} bugün ve bu hafta oyuncu arayan halı saha maçları. "Bir kişi eksiğiz" diyen takımlara tek dokunuşla katıl — Eksik Var uygulamasında.`
    : `${ekDa(il)} oyuncu arayan halı saha, basketbol, voleybol maçları ve rakip arayan takımlar. Eksik kaleci, forvet ya da takım bul; ücretsiz Eksik Var uygulamasıyla.`;
  const url = `${SITE}/${ilSlug}${ilce ? "/" + ilceSlug : ""}`;
  const ldJson = {
    "@context": "https://schema.org", "@type": "WebPage", name: baslik, description: aciklama, url,
    isPartOf: { "@type": "WebSite", name: "Eksik Var", url: SITE },
    about: { "@type": "Place", name: yer, address: { "@type": "PostalAddress", addressLocality: ilce || il, addressRegion: il, addressCountry: "TR" } },
  };
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(baslik)} | Eksik Var</title>
<meta name="description" content="${esc(aciklama)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(baslik)}">
<meta property="og:description" content="${esc(aciklama)}">
<meta property="og:url" content="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Eksik Var">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:ital,wght@0,400;0,600;0,700;0,800;0,900;1,900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/ev.css">
<script type="application/ld+json">${JSON.stringify(ldJson)}</script>
</head>
<body>
<header class="ust"><div class="ust-ic"><a class="marka" href="/">EKSİK <em>VAR</em></a><a class="indir" href="/#indir">Uygulamayı indir</a></div></header>
<section class="hero"><div class="hero-ic">
  <div class="kirinti"><a href="/">Eksik Var</a> › <a href="/${ilSlug}">${esc(il)}</a>${ilce ? ` › ${esc(ilce)}` : ""}</div>
  <h1>${esc(ekDa(yer))} <em>eksik var</em> mı?</h1>
  <p>${esc(ekDa(yer))}ki açık maçlar aşağıda. Kadrosu eksik takımlara tek dokunuşla katıl; ilanı sen açarsan eksik oyuncular sana gelir. Ücretsiz, reklamsız.</p>
  <div class="ist" id="ist"></div>
</div></section>
<main class="govde">
  <div class="liste" id="liste"><div class="yuk">İlanlar yükleniyor…</div></div>
  <div class="cta">
    <h2>${ilce ? esc(ilce) : esc(il)} için ilan ver, eksikler sana gelsin</h2>
    <p>Maçını 30 saniyede aç: eksik mevkileri işaretle, saha ücretini yaz; yakındaki oyunculara alarm gider, ödeme IBAN'la tek dokunuşta toplanır.</p>
    <a class="btn b1" href="https://play.google.com/store/apps/details?id=com.nuunmedya.eksikvar">Google Play'den indir</a>
    <a class="btn b2" href="/#indir">App Store'dan indir</a>
  </div>
  ${ilceler && ilceler.length ? `<section class="ilceler"><h2>${esc(il)} ilçeleri</h2><div class="ilce-liste">${ilceler.map((d) => `<a href="/${ilSlug}/${slug(d.name)}">${esc(d.name)}</a>`).join("")}</div></section>` : ""}
  ${ilce ? `<section class="ilceler"><h2>Yakın ilçeler</h2><div class="ilce-liste"><a href="/${ilSlug}">Tüm ${esc(il)}</a>${(ilceler || []).filter((d) => d.id !== ilceId).slice(0, 12).map((d) => `<a href="/${ilSlug}/${slug(d.name)}">${esc(d.name)}</a>`).join("")}</div></section>` : ""}
  <section class="sss">
    <h2>Sık sorulanlar</h2>
    <details><summary>${esc(ekDa(yer))} bir maça nasıl katılırım?</summary><p>Yukarıdaki ilanlardan birine dokun, "Uygulamada aç" de. Başvurun organizatöre gider; onaylayınca maçın grup sohbetine eklenirsin, saha ve saat orada netleşir.</p></details>
    <details><summary>Takımım eksik, oyuncu nasıl bulurum?</summary><p>Uygulamada "İlan ver": sporu, sahayı, saati ve kaç kişi eksik olduğunu yaz (istersen mevki de). ${esc(yer)} çevresinde o saatte oynayabilecek oyunculara anında alarm gider.</p></details>
    <details><summary>Ücret nasıl ödeniyor?</summary><p>Para uygulamadan geçmez. Organizatör IBAN'ını ekler; sen "Payını öde"ye dokununca IBAN ve tutar panoya kopyalanır, bankandan gönderirsin. Dekont ekleyince organizatör tek bakışta onaylar.</p></details>
    <details><summary>Hakem ya da kameraman bulunur mu?</summary><p>Evet. Organizatör ilanda "hakem lazım / kameraman lazım" der; ${esc(ekDa(il))}ki onaylı hakem ve medya hesaplarına bildirim gider, ilk kabul eden maça atanır.</p></details>
  </section>
</main>
<footer class="alt"><span>© Eksik Var</span><a href="/gizlilik.html">Gizlilik</a><a href="mailto:destek@eksikvarapp.com">destek@eksikvarapp.com</a><a href="/">Ana sayfa</a></footer>
<script src="/ev.js"></script>
<script>EV.feed(${ilId}, ${ilceId || "null"}, document.getElementById("liste"), ${JSON.stringify(il)}, ${JSON.stringify(ilce || null)}); EV.stats(${ilId}, document.getElementById("ist"));</script>
</body>
</html>
`;
}

const iller = await al("cities?select=id,name&order=name");
const ilceler = await al("districts?select=id,city_id,name&order=name&limit=2000");
const urls = [`${SITE}/`];
let n = 0;
for (const il of iller) {
  const ilSlug = slug(il.name);
  if (AYRIK.has(ilSlug)) continue;
  const dir = join(KOK, ilSlug);
  if (existsSync(dir)) rmSync(dir, { recursive: true });
  mkdirSync(dir, { recursive: true });
  const ilIlceleri = ILCELI.includes(il.name) ? ilceler.filter((d) => d.city_id === il.id) : [];
  writeFileSync(join(dir, "index.html"), sayfa({ il: il.name, ilId: il.id, ilSlug, ilceler: ilIlceleri })); n++;
  urls.push(`${SITE}/${ilSlug}`);
  for (const d of ilIlceleri) {
    const s = slug(d.name); mkdirSync(join(dir, s), { recursive: true });
    writeFileSync(join(dir, s, "index.html"), sayfa({ il: il.name, ilce: d.name, ilId: il.id, ilceId: d.id, ilSlug, ilceSlug: s, ilceler: ilIlceleri })); n++;
    urls.push(`${SITE}/${ilSlug}/${s}`);
  }
}
writeFileSync(join(KOK, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`);
writeFileSync(join(KOK, "robots.txt"), `User-agent: *\nAllow: /\nDisallow: /yonetim.html\nSitemap: ${SITE}/sitemap.xml\n`);
// Şehir listesi (ana sayfa ve 404 için)
writeFileSync(join(KOK, "sehirler.json"), JSON.stringify(iller.map((c) => ({ id: c.id, ad: c.name, slug: slug(c.name), ilceli: ILCELI.includes(c.name) }))));
console.log(`${n} sayfa, ${urls.length} URL üretildi → docs/`);
