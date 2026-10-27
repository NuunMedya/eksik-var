/* Eksik Var — herkese açık sayfalar için küçük istemci (giriş yok, yalnızca okuma). */
(function () {
  var URL = "https://rxmngndtwndqbmlljhth.supabase.co";
  var KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bW5nbmR0d25kcWJtbGxqaHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTU1ODksImV4cCI6MjEwMzk5MTU4OX0.ckpunuwIGPFBqil8VQVD3oVfE0Cb_maDfXqfok4AXkc";
  var CATS = { 1: ["⚽", "Halı Saha"], 2: ["🏀", "Basketbol"], 3: ["🏐", "Voleybol"], 4: ["🎾", "Tenis"] };
  var LEVEL = { farketmez: "Her seviye", baslangic: "Başlangıç", orta: "Orta", ileri: "İleri" };
  var POS = { kaleci: "kaleci", defans: "defans", orta: "orta saha", forvet: "forvet", forvet_b: "forvet", guard: "guard", pivot: "pivot", pasor: "pasör", smacor: "smaçör", libero: "libero", orta_v: "orta oyuncu" };
  var GUN = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  var AY = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
  var PLAY = "https://play.google.com/store/apps/details?id=com.nuunmedya.eksikvar";
  var IOS = "https://eksikvarapp.com/#indir";

  function rpc(name, args) {
    return fetch(URL + "/rest/v1/rpc/" + name, { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json" }, body: JSON.stringify(args || {}) })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); });
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function tarih(iso) {
    var d = new Date(iso), now = new Date();
    var ayni = function (a, b) { return a.toDateString() === b.toDateString(); };
    var yarin = new Date(now); yarin.setDate(now.getDate() + 1);
    var gun = ayni(d, now) ? "Bugün" : ayni(d, yarin) ? "Yarın" : GUN[d.getDay()] + " " + d.getDate() + " " + AY[d.getMonth()];
    return gun + " · " + ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  }
  function mevkiler(p) {
    var k = Object.keys(p || {});
    if (!k.length) return "";
    return k.map(function (x) { return p[x] + " " + (POS[x] || x); }).join(", ");
  }
  function kart(e) {
    var cat = CATS[e.cat] || ["🏟️", "Spor"];
    var eksik = Math.max(0, (e.needed || 0) - (e.filled || 0));
    var durum = e.status === "doldu" || eksik === 0 ? '<span class="pill ok">Kadro doldu</span>' : '<span class="pill hot">' + eksik + " eksik" + (mevkiler(e.positions) ? " · " + esc(mevkiler(e.positions)) : "") + "</span>";
    var rakip = e.kind === "rakip";
    var ek = "";
    if (e.hakem) ek += '<span class="pill mor">🟣 Hakem aranıyor</span>';
    if (e.medya) ek += '<span class="pill mor">🎥 Kameraman aranıyor</span>';
    return '<a class="ev" href="/e/' + esc(e.id) + '">' +
      '<div class="ev-ico">' + cat[0] + "</div>" +
      '<div class="ev-body"><div class="ev-title">' + esc(rakip ? (e.team || "Takım") + " rakip arıyor" : e.title) + "</div>" +
      '<div class="ev-sub">' + esc(tarih(e.date)) + " · " + esc((e.venue || "").split(",")[0] || cat[1]) + (e.district ? " · " + esc(e.district) : "") + "</div>" +
      '<div class="ev-pills">' + (rakip ? '<span class="pill hot">🆚 Rakip aranıyor</span>' : durum) +
      '<span class="pill">' + (e.price > 0 ? esc(e.price) + "₺/kişi" : "Ücretsiz") + "</span>" +
      (e.level && e.level !== "farketmez" ? '<span class="pill">' + esc(LEVEL[e.level] || e.level) + "</span>" : "") + ek + "</div></div>" +
      '<div class="ev-go">›</div></a>';
  }
  function bos(il, ilce) {
    return '<div class="bos"><div class="bos-ico">🕐</div><div class="bos-t">' + esc(ilce || il) + " için önümüzdeki 14 günde açık ilan yok</div>" +
      '<div class="bos-s">İlk ilanı sen aç: uygulamayı indir, "İlan ver" de — eksik oyuncular sana gelsin.</div></div>';
  }
  function indirDugmeleri() {
    var ua = navigator.userAgent || "";
    var a = /android/i.test(ua), i = /iphone|ipad|ipod/i.test(ua);
    return (i ? "" : '<a class="btn b1" href="' + PLAY + '">Google Play\'den indir</a>') + (a ? "" : '<a class="btn b2" href="' + IOS + '">App Store\'dan indir</a>');
  }

  window.EV = {
    feed: function (cityId, districtId, el, il, ilce) {
      el.innerHTML = '<div class="yuk">İlanlar yükleniyor…</div>';
      rpc("public_feed", { p_city: cityId, p_district: districtId || null }).then(function (list) {
        if (!list || !list.length) { el.innerHTML = bos(il, ilce); return; }
        el.innerHTML = '<div class="say">' + list.length + " açık ilan · önümüzdeki 14 gün</div>" + list.map(kart).join("");
      }).catch(function () { el.innerHTML = '<div class="bos"><div class="bos-t">İlanlar şu an yüklenemedi</div><div class="bos-s">Biraz sonra tekrar dene ya da uygulamadan bak.</div></div>'; });
    },
    stats: function (cityId, el) {
      rpc("public_stats", { p_city: cityId }).then(function (s) {
        if (!s) return;
        var parca = [];
        if (s.oyuncu > 0) parca.push("<b>" + s.oyuncu + "</b> oyuncu");
        if (s.acik > 0) parca.push("<b>" + s.acik + "</b> açık ilan");
        if (s.ilan30 > 0) parca.push("son 30 günde <b>" + s.ilan30 + "</b> maç");
        el.innerHTML = parca.join(" · ");
      }).catch(function () {});
    },
    event: function (id, el) {
      rpc("public_event", { p_id: id }).then(function (e) {
        if (!e) { el.innerHTML = '<h1>Bu ilan artık yok</h1><p>Kaldırılmış ya da süresi geçmiş olabilir. Uygulamada benzer maçlara bakabilirsin.</p>' + indirDugmeleri(); return; }
        var cat = CATS[e.cat] || ["🏟️", "Spor"];
        var eksik = Math.max(0, (e.needed || 0) - (e.filled || 0));
        var rakip = e.kind === "rakip";
        var basl = rakip ? (e.team || "Bir takım") + " rakip arıyor" : (eksik > 0 ? eksik + " kişi eksik — sen de gel ⚽" : "Kadro doldu, yedek listesine yazıl");
        var iptal = e.status === "iptal";
        document.title = (rakip ? basl : e.title) + " · " + (e.district || e.city || "") + " | Eksik Var";
        el.innerHTML =
          '<div class="ev-hero"><div class="ev-hero-ico">' + cat[0] + "</div><div>" +
          '<div class="ev-hero-k">' + esc(cat[1]) + (e.format ? " · " + esc(e.format) : "") + "</div>" +
          '<h1 class="ev-hero-t">' + esc(rakip ? e.team || e.title : e.title) + "</h1></div></div>" +
          (iptal ? '<div class="uyari">Bu maç iptal edildi.</div>' : "") +
          '<div class="grid">' +
          '<div class="g"><div class="g-k">Ne zaman</div><div class="g-v">' + esc(tarih(e.date)) + "</div></div>" +
          '<div class="g"><div class="g-k">Nerede</div><div class="g-v">' + esc(e.venue || "-") + "<br><small>" + esc([e.district, e.city].filter(Boolean).join(", ")) + "</small></div></div>" +
          '<div class="g"><div class="g-k">Ücret</div><div class="g-v">' + (e.price > 0 ? esc(e.price) + "₺ / kişi" : "Ücretsiz") + "</div></div>" +
          '<div class="g"><div class="g-k">' + (rakip ? "Durum" : "Kadro") + '</div><div class="g-v">' + (rakip ? "Rakip aranıyor" : (e.capacity - eksik) + "/" + e.capacity + (eksik > 0 ? ' · <b class="hot">' + eksik + " eksik</b>" : "")) +
          (mevkiler(e.positions) ? "<br><small>" + esc(mevkiler(e.positions)) + "</small>" : "") + "</div></div>" +
          "</div>" +
          '<div class="ev-pills" style="justify-content:center;margin-top:12px">' +
          '<span class="pill">' + esc(LEVEL[e.level] || "Her seviye") + "</span>" +
          '<span class="pill">Organizatör: ' + esc(e.org) + (e.orgRel != null ? " · %" + esc(e.orgRel) + " güvenilir" : "") + "</span>" +
          (e.hakem ? '<span class="pill mor">🟣 Hakem aranıyor</span>' : "") + (e.medya ? '<span class="pill mor">🎥 Kameraman aranıyor</span>' : "") + "</div>" +
          '<p class="ev-cta-t">' + esc(basl) + "</p>" +
          '<a class="btn b1" href="eksikvar://e/' + esc(id) + '">Uygulamada aç ve katıl</a>' + indirDugmeleri() +
          '<div class="meta">Uygulama yüklü değilse önce indir, sonra bu linke tekrar dokun. Başvurun organizatöre gider; onaylanınca grup sohbetine eklenirsin.</div>';
      }).catch(function () {
        el.innerHTML = '<h1>Bir maça davet edildin ⚽</h1><p>Detaylar şu an yüklenemedi; uygulamada açabilirsin.</p><a class="btn b1" href="eksikvar://e/' + esc(id) + '">Uygulamada aç</a>' + indirDugmeleri();
      });
    },
    kart: kart, indir: indirDugmeleri,
  };
})();
