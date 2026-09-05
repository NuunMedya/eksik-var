# 📱 Eksik Var — Mobil Uygulama Kurulumu (macOS)

Bu rehberin sonunda uygulama **kendi telefonunda** çalışıyor olacak.
Toplam süre: yaklaşık 15 dakika. Hiçbir kodlama bilgisi gerekmez,
komutları kopyala-yapıştır yeterli.

---

## Hazırlık (bir kereye mahsus)

**1. Node.js kur:** nodejs.org adresine gir, yeşil **LTS** butonuyla indir,
kurulumu ileri-ileri-bitir şeklinde tamamla. Kontrol için Terminal'i aç
(⌘+Boşluk → "Terminal") ve şunu yaz:

```
node -v
```

`v20` veya üzeri bir numara görüyorsan hazırsın.

**2. Telefonuna Expo Go indir:** App Store'da (iPhone) veya Google Play'de
(Android) "Expo Go" diye arat, kur. Uygulamayı telefonda çalıştırmamızı
sağlayan araç bu.

**3. Önemli:** Bilgisayar ve telefon **aynı Wi-Fi ağında** olmalı.

---

## Kurulum

**Adım 1 — Expo projesini oluştur.** Terminal'de sırayla:

```
cd ~/Desktop/eksik-var
npx create-expo-app@latest eksik-var-app --template blank
```

İlk çalıştırmada "Ok to proceed? (y)" sorarsa `y` yazıp Enter'a bas.
Birkaç dakika sürer, sabırla bekle.

> Not: README'de bu klasörü "3-mobil-uygulama" diye planlamıştık ama npm
> klasör adları rakamla başlayamıyor; o yüzden adı `eksik-var-app` oldu.
> Projenin 3. aşaması burası.

**Adım 2 — Kodları yerleştir.** Bu zip'ten çıkan `mobil-kod` klasörünün
içindeki `App.js` dosyasını ve `src` klasörünü kopyala, masaüstündeki
`eksik-var/eksik-var-app` klasörünün içine yapıştır. "App.js zaten var,
değiştirilsin mi?" derse **Değiştir** de. (`src` diye bir klasör yoktur,
direkt eklenecektir.)

**Adım 3 — Çalıştır.** Terminal'de:

```
cd ~/Desktop/eksik-var/eksik-var-app
npx expo start
```

Terminalde kocaman bir **QR kod** belirecek.

**Adım 4 — Telefonda aç.** iPhone'da normal Kamera uygulamasıyla QR'ı
okut ve çıkan bildirime dokun; Android'de Expo Go'yu açıp içindeki
"Scan QR code" ile okut. Birkaç saniye içinde **Eksik Var telefonunda
açılır.** 🎉

---

## Denenecekler

Uygulama şimdilik örnek verilerle çalışıyor (prototiple aynı akışlar):

- Giriş yap → "Çarşamba Halı Saha"ya başvur → Ali ile sohbet açılır →
  onayı gelince "Onayla ve kadroya katıl" → kontenjan düşer, gruba eklenirsin.
- "Pazar Ligi Maçı" senin etkinliğin → Murat'ın başvurusunu yönet.
- Turuncu **+** ile kendi talebini yayınla, profilden puanlama yap.

## Sorun giderme

- **QR okuttuktan sonra bağlanmıyor:** İkisi de aynı Wi-Fi'da mı kontrol et.
  Olmadıysa Terminal'de `npx expo start --tunnel` dene (ek paket sorarsa `y`).
- **Terminali kapattın, tekrar açmak istiyorsun:** Adım 3'ü tekrarla yeter.
- **Kodda değişiklik yaptın:** Kaydettiğin anda telefon kendini yeniler,
  hiçbir şey yapmana gerek yok (Fast Refresh).

## Sırada ne var?

Supabase bağlantısı: gerçek kayıt/giriş, canlı etkinlik listesi ve gerçek
zamanlı mesajlaşma. Kurduğumuz veritabanı şeması (1-veritabani klasörü)
buraya bağlanacak — örnek veriler yerini gerçeklerine bırakacak.
