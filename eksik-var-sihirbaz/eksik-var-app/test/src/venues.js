// Saha/kort havuzu yardımcıları — saf ve testlenebilir.
// Kaynaklar: OSM hasadı (source='osm') + kullanıcı eklemeleri (source='user').

// Basit Türkçe-duyarlı normalizasyon: arama ve tekilleştirme için
export const normVenue = (s) =>
  String(s || "").toLocaleLowerCase("tr").replace(/[\s\u00A0]+/g, " ").trim();

// Ada göre süz (boş sorguda tümü), en fazla `limit`
export function filterVenues(list, q, limit = 50) {
  const n = normVenue(q);
  const src = list || [];
  const out = n ? src.filter((v) => normVenue(v.name).includes(n)) : src.slice();
  return out.slice(0, limit);
}

// Aynı ad (normalize) + aynı kategori tek kalsın; kullanıcı ekleri OSM'yi ezmesin
export function mergeVenues(base, extra) {
  const by = new Map();
  [...(base || []), ...(extra || [])].forEach((v) => {
    const k = v.category_id + "|" + normVenue(v.name);
    if (!by.has(k)) by.set(k, v);
  });
  return [...by.values()].sort((a, b) => normVenue(a.name).localeCompare(normVenue(b.name), "tr"));
}
