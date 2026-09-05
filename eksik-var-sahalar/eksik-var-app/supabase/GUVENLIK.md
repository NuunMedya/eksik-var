# Eksik Var · Supabase Kurulumu ve Güvenlik Modeli

## Kurulum (10 dakika)

1. [supabase.com](https://supabase.com) → yeni proje aç (bölge: Frankfurt `eu-central-1` Türkiye'ye en yakını).
2. **SQL Editor** → `setup.sql` içeriğini yapıştır → Run. ("Success" görmelisin; yeniden çalıştırmak güvenlidir.)
3. Aynı yerde `seed_iller.sql` → Run (81 il + 973 ilçe yüklenir).
4. **Authentication → Providers → Phone**: aç, SMS sağlayıcısı olarak Twilio/MessageBird bilgilerini gir.
5. **Project Settings → API**: `Project URL` ve `anon public` anahtarını kopyala → uygulamada `src/config.js` içine yaz.
6. Uygulamayı canlı modda başlat; kayıt ol ekranından ilk hesabı aç.

### Panelden yapılacak iki ayar
- **Auth → Rate Limits**: SMS gönderimini saatte 4-5 ile sınırla (OTP maliyet/istismar koruması — bu dosyada değil, panelde ayarlanır).
- **Database → Cron (pg_cron)**: günde bir `select public.finalize_due_mvps();` çalıştır (MVP oyları 48 saat sonra kesinleşir). Cron kurmazsan da sistem çalışır; MVP rozeti sadece gecikmeli kesinleşir.

## Güvenlik modeli (özet)

**Çift kilit:** Her kural hem satır güvenliği (RLS) hem tetikleyici/RPC katmanında doğrulanır; istemciden gelen hiçbir yazma güvenilmez.

- **RLS her tabloda açık.** Mesajlar/anketler yalnızca sohbet üyelerine, bildirimler ve IBAN yalnızca sahibine, başvurular yalnızca taraflara görünür. Görünümler `security_invoker` — görünüm üzerinden RLS delinemez.
- **Sütun izinleri:** `users.push_token` istemciden okunamaz; `rating_avg`, `reliability_pct`, sayaçlar, `events.status/filled_count/skor/MVP` istemciden yazılamaz (yalnızca tetikleyici/RPC değiştirir).
- **Kimlik sahteciliği kapalı:** mesajda `sender_id`, ilanlarda `organizer_id`, başvuruda `applicant_id` = oturum kimliği olmak zorunda. Başvuran organizatör onayını, organizatör başvuran onayını işaretleyemez.
- **Hız sınırları (veritabanında):** mesaj 20/dk · ilan 5/gün ve 10 açık · başvuru 20/gün · şikayet 10/gün, aynı kişiye günde 1 · arama kaydı 30/gün.
- **Engelleme:** engelliyken başvuru, birebir sohbet ve arama kurulamaz.
- **Güvenilirlik:** "gelmedi" işaretleri, maça <24 saat kala iptal/ayrılma sayaçlara tetikleyiciyle işler.
- **Hesap silme:** `delete_own_account()` profili anonimleştirir, gelecekteki ilanları iptal eder, IBAN'ı siler; geçmiş maç kayıtları bozulmaz.
- **Hata sözleşmesi:** Sunucu kısa anahtar döner (`cok_hizli`, `kadro_dolu`, `engellendi`…); uygulama `LiveApp.friendly()` ile Türkçeleştirir.

## Yerel test

```bash
supabase/test_local.sh     # PostgreSQL 16 gerekir
```

Temiz veritabanında saplama auth şemasını kurar, `setup.sql`'i iki kez koşar (yeniden çalıştırılabilirlik kanıtı), illeri yükler ve 32 güvenlik senaryosunu kullanıcı taklidiyle doğrular: RLS sızıntıları, sahte onay, hız sınırları, çift onay akışı, haftalık seri, MVP kesinleştirme, hesap silme…

> `test/auth_stub.sql` yalnızca yerel test içindir; **Supabase'e yapıştırmayın** (orada gerçek `auth` şeması var).
