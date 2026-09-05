# Mağaza metinleri (TR) — Eksik Var

## Kimlik
- Uygulama adı: **Eksik Var**
- Alt başlık (30 kr.): **Kadron eksik kalmasın**
- Kategori: Spor (ikincil: Sosyal Ağ)
- Anahtar kelimeler (App Store, 100 kr.): `halı saha,futbol,basketbol,voleybol,kadro,maç,oyuncu bul,takım,spor,eksik`
- Kısa açıklama (Google Play, 80 kr.): **Halı saha, basket, voleybol: eksik kadroyu tamamla, çift onayla kadro dolsun.**

## Açıklama
"Bir kişi eksiğiz, kim var?" mesajı tarihe karışıyor.

Eksik Var, halı saha, basketbol, voleybol ve benzeri amatör spor etkinliklerinde eksik kalan kadroyu tamamlar. Organizatör talebi açar, yakındaki oyuncular puanları ve güvenilirlik oranlarıyla başvurur, çift onayla kadro dolar; ekip grubu kendiliğinden kurulur.

**Nasıl çalışır?**
• Talebi aç: ilçe, saha, saat, kişi başı ücret, kaç eksik. Her hafta oynuyorsanız "Her Çarşamba" deyin; maç bitince gelecek hafta kendiliğinden açılır.
• Başvurular gelsin: organizatörle birebir sohbet otomatik açılır. Numaralar gizli kalır.
• Çift onay: organizatör onaylar, oyuncu son onayı verir; kontenjan düşer, oyuncu ekip grubuna eklenir.

**Neden Eksik Var?**
• Güvenilirlik puanı: "geliyorum" deyip gelmeyenler yoklamada işaretlenir; "sahadayım" beyanı ve yoklama koduyla tartışma biter.
• "Var mısın?": haftalık maçta uygulama herkese sorar, eksik sayısını önerir; uygulamaya geçmemiş arkadaşların da adıyla kadroda.
• Mevki, davet, yedek: "1 kaleci, 1 stoper" diye ilan; tanıdığını davet et; kadro doluysa yedek ol.
• Rakip bul: takımına rakip, iki kaptan onayıyla maç.
• Kura, skor, MVP, gol krallığı, sezon tablosu.
• Para takibi: kim ödedi, IBAN tek dokunuşla, hatırlatma; para uygulamadan geçmez.
• Anket, fotoğraf, sabitlenmiş mesaj; numaran gizli; yakınında maç açılınca bildirim.

Ekibini uygulamaya taşı, "kim var?" karmaşası bitsin.

## Sürüm notu (1.0.0)
İlk sürüm: talep açma, başvuru ve çift onay, ekip grubu, yoklama ve güvenilirlik puanı, haftalık tekrar, il/ilçe akışı, bildirimler.

## İnceleme ekibi için notlar (App Store Review Notes / Play test hesabı)
Giriş telefon numarası + SMS koduyla yapılır. İnceleme için Supabase'de tanımlı **test numarası** kullanın:
- Telefon: `+90 555 000 00 01` · Kod: `123456`  (Supabase > Authentication > Phone > test telefon numaraları bölümünde tanımlanacak; SMS gönderilmez)
- İkinci hesap (başvuru/onay akışını görmek için): `+90 555 000 00 02` · Kod: `123456`
Kullanıcı içeriği için gerekli araçlar: kullanım şartları onayı (kayıtta), şikayet et, engelle, hesabı sil (Ayarlar), iletişim: destek@eksikvar.app.

## Yaş derecelendirmesi
- App Store: kullanıcılar arası mesajlaşma ve tanışma içerdiği için **17+** ile başlayın (sonradan düşürülebilir). Anketi: "Unrestricted Web Access: Hayır", diğer içerik türleri "Yok".
- Google Play: IARC anketinde "kullanıcılar birbirleriyle etkileşime giriyor / konum paylaşımı: il-ilçe düzeyinde" işaretlenir.
- Kullanım Şartları'ndaki yaş sınırı 18; mağaza derecelendirmesi bundan bağımsızdır.
