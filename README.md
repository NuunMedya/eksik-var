# ⚽ Eksik Var — kadron eksik kalmasın

Halı saha, basketbol, voleybol ve benzeri amatör spor etkinliklerinde eksik kalan kadroyu tamamlayan mobil uygulama.
Organizatör "eksik var" talebi açar, oyuncular başvurur, **çift onay** ile kadro dolar, ekip grubu otomatik kurulur,
maç sonrası **yoklama** alınır ve **güvenilirlik puanı** oluşur.

## Depo düzeni

| Klasör | İçerik |
|---|---|
| `eksik-var-app/` | Expo / React Native uygulaması (`App.js` mod seçici; `src/DemoApp.js` örnek verili mod, `src/live/` Supabase modu) |
| `1-veritabani/` | `supabase_kurulum.sql` — Supabase'e tek seferde yüklenen tam şema (RLS, trigger'lar, il/ilçe, yoklama, tekrar, yaptırımlar). `test/` — yerel test senaryoları (37 senaryo) |
| `2-tasarim/` | Tıklanabilir web prototipi |
| `hukuk/` | Gizlilik politikası, KVKK aydınlatma metni, kullanım şartları (md + html) |

## Uygulamayı çalıştırma

```bash
cd eksik-var-app
npm install
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill expo-image-picker react-native-safe-area-context expo-notifications expo-device expo-constants expo-clipboard expo-calendar
npx expo start
```

Telefonda Expo Go ile QR'ı okutun. `src/config.js` boşsa uygulama **demo modunda** (örnek veriler, SMS kodu `123456`) çalışır;
Supabase adresi ve anon anahtarı girilince **canlı moda** geçer.

Testler: `node test/run.mjs` (saf mantık, 10 test) · lint: `npx eslint -c eslint.config.mjs App.js "src/**/*.js"` · veritabanı: `1-veritabani/test/calistir.sh` (115 senaryo)

## Özellikler (Eylül 2026)

Telefon+SMS girişi · il/ilçe akışı · eksik talebi (spora göre format, mevki kotası) · başvuru ve çift onay · davet · yedek listesi ·
kalıcı ekip grubu, anket, fotoğraf, sabitlenmiş mesaj, sessize alma · "Var mısın?" sabit kadro ve eksik önerisi · uygulamasız oyuncular ·
rakip bul · kura · yoklama, "sahadayım", yoklama kodu, itiraz · skor, MVP, gol/asist, sezon tablosu · ödeme takibi ve IBAN ·
güvenilirlik (yumuşatılmış) ve ödeme düzeni · profil, arama, engelleme, şikayet, ban/askı · yakında maç bildirimi · takvime ekle, yol tarifi ·
yönetici paneli · push (Edge Function) · KVKK/gizlilik/şartlar · site

## Supabase kurulumu (bir kez)

1. supabase.com'da proje aç (bölge: Frankfurt).
2. SQL Editor → `1-veritabani/supabase_kurulum.sql` içeriğini yapıştır → Run.
3. Authentication → Providers → **Phone** → aç; SMS sağlayıcısı (Twilio deneme hesabı ya da test telefon numaraları).
4. Project Settings → API → Project URL ve anon anahtarı `eksik-var-app/src/config.js` içine yaz.

## Geliştirme kuralları

- Her değişiklikten önce lint: `cd eksik-var-app && npx eslint -c eslint.config.mjs App.js "src/**/*.js"` (GitHub Actions da her push'ta çalıştırır; `npm i -D eslint eslint-plugin-react` gerekir).
- Veritabanı değişiklikleri `supabase_kurulum.sql`'e eklenir ve `1-veritabani/test/calistir.sh` ile yerel Postgres'te test edilir.
- Sunucu tarafı kural (RLS/trigger) olmayan hiçbir güvenlik kararı istemciye bırakılmaz.

## Yol haritası

- [x] Şema, prototip, uygulama (demo modu), logo, hukuki metinler
- [x] Bağlantı 1-3 kodu (kimlik, etkinlik, başvuru, sohbet, yoklama, bildirim, push)
- [x] Kullanıcı raporu 1-5 turları (misafir oyuncu, sohbet, bildirim, form, sezon…)
- [ ] Supabase kurulumu ve canlı test
- [ ] Kapalı beta (TestFlight / Play iç test) — 4 ildeki WhatsApp grupları
- [ ] Mağaza yayını; sonra sesli arama (WebRTC), harita
