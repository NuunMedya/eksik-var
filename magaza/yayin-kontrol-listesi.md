# Yayın kontrol listesi

## Hesaplar ve altyapı
- [ ] Apple Developer Program (99 $/yıl) — onayı günler sürebilir, hemen başvurun
- [ ] Google Play Console (25 $, tek sefer) — kimlik doğrulama + 2025 sonrası kapalı test şartı (en az 12 test kullanıcısı, 14 gün) yeni kişisel hesaplar için geçerli
- [ ] eksikvar.app alan adı + site yayında (gizlilik/KVKK/şartlar linkleri mağazada zorunlu)
- [ ] Supabase Pro'ya geçiş kararı (ücretsizde 7 gün hareketsizlikte duraklatma)
- [ ] SMS sağlayıcısı üretim hesabı (Twilio ücretli / Netgsm) ve Supabase Phone ayarı; test numaraları tanımlı
- [ ] Edge Function `send-push` dağıtıldı, webhook bağlı

## Uygulama
- [ ] `app.json` bu klasördeki gibi (bundle/package: app.eksikvar.mobile, scheme, izin metinleri, universal link)
- [ ] `npx eas init` → projectId; `eas.json` bu klasördeki gibi
- [ ] `src/config.js` üretim Supabase anahtarları (anon), demo modu kapalı
- [ ] Development build ile Android push testi: `eas build --profile development --platform android`
- [ ] Önizleme build'i iki telefonda: `eas build --profile preview --platform all`
- [ ] Sürüm/build numarası (EAS autoIncrement)

## Mağaza sayfaları
- [ ] Metinler (app-store-ve-play-metinleri.md), 6 ekran görüntüsü, 1024×1024 ikon (assets/icon.png)
- [ ] Gizlilik politikası URL'si: https://eksikvar.app/gizlilik
- [ ] App Store: yaş derecelendirmesi 17+, "Review Notes" içinde test numarası + kod
- [ ] Google Play: Veri güvenliği formu (google-play-veri-guvenligi.md), İçerik derecelendirmesi (IARC), "Kullanıcı tarafından oluşturulan içerik" beyanı, Hesap silme URL'si (https://eksikvar.app/gizlilik#8-kontrolleriniz)
- [ ] Destek e-postası aktif: destek@eksikvar.app, gizlilik@eksikvar.app, kvkk@eksikvar.app

## Hukuki
- [ ] Hukuki metinlerdeki köşeli parantezler doldu, danışman gözden geçirdi
- [ ] KVKK yurt dışı aktarım: standart sözleşme + Kurul bildirimi kararı
- [ ] Yaş sınırı kararı (18+) metinlerle tutarlı

## Beta
- [ ] TestFlight'a 4 ildeki WhatsApp gruplarından ilk kullanıcılar (davet linki)
- [ ] Geri bildirim kanalı (WhatsApp grubu / uygulama içi "Şikayet et > Diğer")
- [ ] İlk hafta: şikayet kuyruğu ve yoklama itirazlarını günlük kontrol
