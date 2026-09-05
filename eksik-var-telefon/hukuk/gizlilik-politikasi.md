# Eksik Var — Gizlilik Politikası

**Sürüm 0.1 (Taslak) · Son güncelleme: [TARİH]**

Eksik Var, halı saha, basketbol, voleybol ve benzeri amatör spor etkinliklerinde eksik kalan kadroyu tamamlamak için organizatörlerle oyuncuları buluşturan bir mobil uygulamadır. Bu politika, Uygulama'yı kullandığınızda hangi verileri topladığımızı, neden topladığımızı, kimlerin görebildiğini ve verileriniz üzerinde hangi kontrollere sahip olduğunuzu sade bir dille anlatır. Kanuni aydınlatma metnimiz için [KVKK Aydınlatma Metni]([eksikvar.app/kvkk]) sayfasına bakabilirsiniz.

**Uygulamayı geliştiren ve veri sorumlusu:** [ŞİRKET UNVANI / AD SOYAD] · [ADRES] · [gizlilik@eksikvar.app]

## 1. Topladığımız veriler

**Sizin verdikleriniz**

- Hesap bilgileri: ad soyad, kullanıcı adı, cep telefonu numarası (kayıt ve girişte SMS koduyla doğrulanır; şifre yoktur), isteğe bağlı e-posta ve profil fotoğrafı.
- Nerede oynadığınız: seçtiğiniz il ve ilçe. Cihazınızın GPS konumunu **almıyoruz**.
- Etkinlik ve başvuru bilgileri: açtığınız talepler, başvurularınız ve başvuru notlarınız, onaylarınız.
- Mesajlar: grup ve birebir sohbetlerde yazdıklarınız.
- Puanlar ve yorumlar: verdiğiniz ve aldığınız değerlendirmeler.
- Tercihleriniz: iletişim (mesaj/arama) ve bildirim ayarlarınız, engellediğiniz kişiler, şikayetleriniz.

**Uygulama kullanımından oluşanlar**

- Yoklama kayıtları: organizatörün sizi "katıldı" veya "gelmedi" olarak işaretlemesi ve buradan hesaplanan güvenilirlik oranınız.
- Arama kayıtları: uygulama içi aramalarda kimin kimi ne zaman aradığı ve süre. **Görüşme içeriği kaydedilmez.**
- Teknik bilgiler: cihaz türü, işletim sistemi, uygulama sürümü, IP adresi, giriş kayıtları ve bildirim gönderebilmemiz için gereken cihaz belirteci.

## 2. Verilerinizi ne için kullanıyoruz

- Hesabınızı oluşturmak ve sizi tanımak,
- eksik kadroları oyuncularla eşleştirmek; başvuru, çift onay ve kadro süreçlerini yürütmek,
- sohbet ve uygulama içi arama hizmetini sunmak,
- topluluk güvenini korumak: puanlar, yorumlar, yoklama ve güvenilirlik oranı,
- başvuru, onay, mesaj ve maç hatırlatması bildirimleri göndermek,
- kötüye kullanımı önlemek; engelleme, şikayet ve itirazları değerlendirmek,
- hataları bulmak, hizmeti geliştirmek (mümkün olduğunda anonim istatistiklerle),
- yasal yükümlülüklerimizi yerine getirmek.

Verilerinizi **reklam amacıyla satmıyor, kiralamıyor ve üçüncü taraf reklam ağlarıyla paylaşmıyoruz.**

## 3. Diğer kullanıcılar neyi görür

Eksik Var bir topluluk uygulamasıdır; bazı bilgileriniz diğer kullanıcılara açıktır:

| Diğer kullanıcılar görür | Kimse görmez |
|---|---|
| Ad soyad, kullanıcı adı, profil fotoğrafı | Telefon numaranız |
| İl ve ilçeniz | E-posta adresiniz |
| Puan ortalamanız, aldığınız yorumlar ve güvenilirlik oranınız | Şifreniz |
| Kadrosunda yer aldığınız etkinlikler | Arama görüşme içeriğiniz (kaydedilmez) |
| Grup sohbetine yazdıklarınız (grup üyeleri) | Birebir mesajlarınız (yalnızca karşı taraf görür) |

Uygulama içi aramalar telefon numaranız paylaşılmadan yapılır. Size kimlerin mesaj atabileceğini ve kimlerin arayabileceğini **Ayarlar**'dan siz belirlersiniz (herkes / sadece kadronuzdakiler; yalnızca mesaj / yalnızca arama / ikisi; sessiz saatler).

## 4. Verilerinizi kimlerle paylaşıyoruz

Yalnızca hizmeti sunmak için gereken sağlayıcılarla:

- **Supabase** — veritabanı, kimlik doğrulama, dosya depolama ve gerçek zamanlı mesajlaşma altyapımız. Sunucular Avrupa Birliği'nde (Frankfurt) bulunur.
- **Apple, Google ve Expo** — uygulamanın dağıtımı ve anlık bildirimlerin iletilmesi.
- **SMS sağlayıcısı ([Twilio / Netgsm])** — doğrulama kodunun telefonunuza iletilmesi.
- **Yetkili makamlar** — yalnızca hukuka uygun bir talep olduğunda ve taleple sınırlı olarak.

Bu sağlayıcılar verilerinizi bizim adımıza ve talimatlarımızla işler; kendi amaçları için kullanamaz.

## 5. Verilerinizi ne kadar süre tutuyoruz

- Hesabınız açık olduğu sürece verileriniz saklanır.
- Hesabınızı sildiğinizde kimlik ve iletişim bilgileriniz [30 gün] içinde silinir.
- Sohbetlerdeki mesajlarınız ve verdiğiniz puanlar, diğer kullanıcıların deneyimini bozmamak için gönderen bilgisi kaldırılmış (anonim) hâlde kalabilir.
- Giriş ve güvenlik kayıtları yasal süre boyunca ([2 yıl]) saklanır.
- Kural ihlali nedeniyle kapatılan hesapların numarası ve e-postası, yeniden kayıt olmayı önlemek için yalnızca geri döndürülemez özet (hash) olarak [2 yıl] tutulur; ad, fotoğraf ve açık numara silinir.

## 6. Verilerinizi nasıl koruyoruz

- Tüm veri iletimi şifrelidir (TLS); veriler sunucuda şifrelenmiş olarak saklanır.
- Veritabanımızda satır bazlı erişim kuralları uygulanır: her kullanıcı yalnızca görmeye yetkili olduğu verilere ulaşabilir; örneğin üyesi olmadığınız bir sohbeti teknik olarak okuyamazsınız.
- Şifreler geri döndürülemez biçimde özetlenerek saklanır.
- Telefon numaraları uygulamada gösterilmez; aramalar uygulama içinden yapılır.

Hiçbir sistem yüzde yüz güvenli değildir; bir güvenlik ihlali olması hâlinde sizi ve gerekli makamları mevzuata uygun sürede bilgilendiririz.

## 7. Yaş sınırı

Eksik Var **[18] yaş ve üzeri** kullanıcılar içindir. [18] yaşından küçük olduğunu öğrendiğimiz hesapları kapatır ve verilerini sileriz. [18] yaşından küçük bir kullanıcının hesabı olduğunu düşünüyorsanız bize yazın.

> **Geliştirici notu:** Amatör takımlarda 16-17 yaş oyuncular yaygındır. Yaş sınırını düşürmek isterseniz veli onayı süreci ve mağaza yaş derecelendirmesi buna göre tasarlanmalıdır; ilk sürüm için 18+ en sade yoldur.

## 8. Kontrolleriniz

- **Profil** — ad, fotoğraf, il/ilçe bilgilerinizi dilediğiniz zaman değiştirebilirsiniz.
- **Ayarlar → İletişim** — kimlerin size yazabileceğini ve arayabileceğini seçersiniz.
- **Ayarlar → Bildirimler** — bildirim türlerini açıp kapatırsınız.
- **Engelle / Şikayet et** — engellediğiniz kişi size ne yazabilir ne arayabilir; şikayetler incelenir.
- **İtiraz et** — hatalı bir "gelmedi" işaretine uygulama içinden itiraz edebilirsiniz.
- **Ayarlar → Hesabımı sil** — hesabınızı ve verilerinizi siz silebilirsiniz; ayrıca [gizlilik@eksikvar.app] adresine yazarak verilerinize erişim, düzeltme ve silme talep edebilirsiniz.

## 9. Değişiklikler

Bu politikayı güncellediğimizde yeni sürümü **[eksikvar.app/gizlilik]** adresinde yayımlar, önemli değişiklikleri Uygulama içinden bildiririz.

## 10. Bize ulaşın

Sorularınız için: **[gizlilik@eksikvar.app]** · [ŞİRKET UNVANI / AD SOYAD], [ADRES]
