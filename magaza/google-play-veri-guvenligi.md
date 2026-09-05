# Google Play "Veri güvenliği" formu — cevap rehberi

**Uygulama veri topluyor mu?** Evet. **Şifreleme (aktarımda):** Evet (TLS). **Veri silme talebi:** Evet (Ayarlar > Hesabımı sil + gizlilik@eksikvar.app).

| Veri türü | Toplanıyor | Paylaşılıyor | Zorunlu | Amaç |
|---|---|---|---|---|
| Ad | Evet | Hayır | Evet | Uygulama işlevi, kişiselleştirme |
| Telefon numarası | Evet | Hayır* | Evet | Hesap yönetimi (SMS doğrulama) |
| E-posta | Evet | Hayır | Hayır | Hesap yönetimi |
| Fotoğraf (profil) | Evet | Hayır | Hayır | Uygulama işlevi |
| Kullanıcı adı / profil bilgileri | Evet | Hayır | Evet | Uygulama işlevi |
| Konum (yaklaşık: il/ilçe, kullanıcı beyanı; cihaz konumu yok) | Evet | Hayır | Evet | Uygulama işlevi |
| Mesajlar (uygulama içi) | Evet | Hayır | Hayır | Uygulama işlevi |
| Uygulama etkileşimleri (etkinlik, başvuru, yoklama, puan) | Evet | Hayır | Evet | Uygulama işlevi, dolandırıcılık önleme |
| Cihaz kimlikleri (push belirteci) | Evet | Hayır | Hayır | Uygulama işlevi (bildirim) |
| Kilitlenme/tanılama | Hayır (sağlayıcı eklenirse güncellenir) | – | – | – |

\* Supabase, Expo ve SMS sağlayıcısı **hizmet sağlayıcı** (işleyici) olarak veriyi bizim adımıza işler; Google'ın tanımına göre bu "paylaşım" değildir. Reklam / analitik SDK yoktur.

**Play "Kullanıcı tarafından oluşturulan içerik" politikası** için mevcut araçlar: içerik/kullanıcı şikayeti, engelleme, kullanım şartları, moderasyon (inceleme kuyruğu). Bunları politika beyanında belirtin.
