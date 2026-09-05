-- ============================================================================
-- EKSİK VAR · Güvenlik testleri (yerel)
-- Çalıştırma: supabase/test_local.sh  (auth_stub → setup → seed → bu dosya)
-- Kullanıcı taklidi: set local role authenticated + app.uid ayarı
-- ============================================================================
\set ON_ERROR_STOP on

-- Oturumluk yardımcılar (DO bloğu iç prosedür desteklemediği için pg_temp'te)
create sequence pg_temp.testno;
grant usage on sequence pg_temp.testno to public;
create function pg_temp.gec(isim text) returns void language plpgsql as $$
begin raise notice '✓ % %', lpad(nextval('pg_temp.testno')::text, 2, '0'), isim; end $$;
create function pg_temp.ol(kim uuid) returns void language plpgsql as $$
begin execute 'set local role authenticated'; perform set_config('app.uid', kim::text, true); end $$;
create function pg_temp.yonetici() returns void language plpgsql as $$
begin execute 'reset role'; perform set_config('app.uid', '', true); end $$;

do $testler$
declare
  ali uuid; veli uuid; deli uuid; can uuid; tekil uuid;
  ev1 uuid; ev2 uuid; ev_hafta uuid; ev_yakin uuid; ev_sonraki uuid;
  v_conv bigint; v_app uuid; v_app2 uuid; v_poll uuid;
  v_int int; v_big bigint; v_bool boolean; v_text text; v_num numeric;
begin
  -- ==== fikstür: 4 kullanıcı (auth kaydı → profil tetikleyiciyle oluşur) ====
  insert into auth.users (phone, raw_user_meta_data) values
    ('+905321110001', '{"full_name":"Ali Yılmaz","username":"ali_kaptan","city_id":"6"}'),
    ('+905321110002', '{"full_name":"Veli Demir","username":"veli","city_id":"6"}'),
    ('+905321110003', '{"full_name":"Deli Dumrul","username":"deli","city_id":"6"}'),
    ('+905321110004', '{"full_name":"Can Tekin","username":"can","city_id":"6"}');
  select id into ali  from public.users where username = 'ali_kaptan';
  select id into veli from public.users where username = 'veli';
  select id into deli from public.users where username = 'deli';
  select id into can  from public.users where username = 'can';
  if ali is null or veli is null or deli is null or can is null then
    raise exception 'profil tetikleyicisi çalışmadı';
  end if;
  perform pg_temp.gec('kayıt: auth.users → public.users profili otomatik açıldı');

  -- çakışan kullanıcı adı: aynı username ile ikinci kayıt patlamamalı
  insert into auth.users (phone, raw_user_meta_data) values
    ('+905321110005', '{"full_name":"Ali Kopya","username":"ali_kaptan","city_id":"6"}');
  if (select count(*) from public.users where username like 'ali_kaptan%') <> 2 then
    raise exception 'username çakışma çözümü çalışmadı';
  end if;
  perform pg_temp.gec('kayıt: çakışan kullanıcı adı otomatik türetildi');

  -- ==== etkinlik oluşturma (Ali) ====
  perform pg_temp.ol(ali);
  insert into public.events (organizer_id, category_id, city_id, title, venue_name, event_date,
                             total_capacity, needed_count, price_per_person)
  values (ali, 1, 6, 'Çarşamba Halı Saha', 'Yıldız Halı Saha', now() + interval '3 days', 14, 2, 150)
  returning id into ev1;
  select id into v_conv from public.conversations where event_id = ev1 and type = 'grup';
  if v_conv is null then raise exception 'ilanla birlikte grup sohbeti açılmadı'; end if;
  if not public.uyesi_mi(v_conv, ali) then raise exception 'organizatör gruba eklenmedi'; end if;
  perform pg_temp.gec('ilan: grup sohbeti + yönetici üyeliği otomatik kuruldu');

  -- ==== profil koruması ====
  perform pg_temp.ol(veli);
  begin
    update public.users set rating_avg = 5.0 where id = veli;
    raise exception 'BEKLENEN_HATA_YOK: rating_avg';
  exception when insufficient_privilege then null;             -- sütun izni yok (42501)
  end;
  perform pg_temp.gec('koruma: kullanıcı kendi puan ortalamasını şişiremiyor (sütun izni)');

  update public.users set bio = 'hacklendi' where id = ali;    -- RLS: 0 satır, hata yok
  perform pg_temp.yonetici();
  if (select bio from public.users where id = ali) is not null then
    raise exception 'RLS delindi: başkasının profili güncellendi';
  end if;
  perform pg_temp.gec('RLS: başkasının profili güncellenemiyor (0 satır)');

  perform pg_temp.ol(veli);
  begin
    perform push_token from public.users where id = ali;
    raise exception 'BEKLENEN_HATA_YOK: push_token';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.gec('gizlilik: push_token istemciden okunamıyor');

  -- ==== başvuru akışı: çift onay → kadro ====
  perform pg_temp.ol(veli);
  insert into public.applications (event_id, applicant_id, message)
  values (ev1, veli, 'Stoper oynarım hocam') returning id into v_app;
  perform pg_temp.yonetici();
  if (select count(*) from public.notifications where user_id = ali and type = 'basvuru') = 0 then
    raise exception 'organizatöre başvuru bildirimi gitmedi';
  end if;
  perform pg_temp.gec('başvuru: birebir sohbet + organizatöre bildirim oluştu');

  -- taraf koruması: başvuran organizatör onayını taklit edemez
  perform pg_temp.ol(veli);
  begin
    update public.applications set organizer_approved = true where id = v_app;
    raise exception 'BEKLENEN_HATA_YOK: party_guard';
  exception when others then
    if sqlerrm <> 'yetki_yok' then raise exception 'yanlış hata: % (beklenen yetki_yok)', sqlerrm; end if;
  end;
  perform pg_temp.gec('koruma: başvuran, organizatör onayını taklit edemiyor');

  -- organizatör onaylar → durum onaylandi, kadroya girer, sayaç artar
  perform pg_temp.ol(ali);
  update public.applications set organizer_approved = true where id = v_app;
  perform pg_temp.yonetici();
  if (select status from public.applications where id = v_app) <> 'onaylandi' then
    raise exception 'çift onay durumu onaylandi yapmadı';
  end if;
  if not public.katilimci_mi(ev1, veli) then raise exception 'onaylanan başvuran kadroya eklenmedi'; end if;
  if (select filled_count from public.events where id = ev1) <> 1 then raise exception 'filled_count artmadı'; end if;
  if not public.uyesi_mi((select id from public.conversations where event_id = ev1 and type = 'grup'), veli) then
    raise exception 'kadroya giren gruba eklenmedi';
  end if;
  perform pg_temp.gec('çift onay: kadro + sayaç + grup üyeliği tek akışta işledi');

  -- aynı ilana ikinci başvuru: benzersizlik
  perform pg_temp.ol(veli);
  begin
    insert into public.applications (event_id, applicant_id) values (ev1, veli);
    raise exception 'BEKLENEN_HATA_YOK: unique_app';
  exception when unique_violation then null;
    when others then
      if sqlerrm <> 'zaten_kadroda' then raise exception 'yanlış hata: %', sqlerrm; end if;
  end;
  perform pg_temp.gec('başvuru: aynı ilana ikinci başvuru reddedildi');

  -- ==== engelleme ====
  perform pg_temp.ol(ali);
  insert into public.blocks (blocker_id, blocked_id) values (ali, deli);
  perform pg_temp.ol(deli);
  begin
    insert into public.applications (event_id, applicant_id) values (ev1, deli);
    raise exception 'BEKLENEN_HATA_YOK: engel';
  exception when others then
    if sqlerrm <> 'engellendi' then raise exception 'yanlış hata: % (beklenen engellendi)', sqlerrm; end if;
  end;
  perform pg_temp.gec('engel: engellenen kullanıcı başvuramıyor');

  -- engelliyken birebir sohbet üyeliği de kurulamaz (RLS with check)
  insert into public.conversations (type, created_by) values ('birebir', deli) returning id into v_big;
  begin
    insert into public.conversation_members (conversation_id, user_id)
    values (v_big, deli), (v_big, ali);
    raise exception 'BEKLENEN_HATA_YOK: engel_dm';
  exception when insufficient_privilege then null;             -- RLS with check ihlali 42501
  end;
  perform pg_temp.gec('engel: engelliyken birebir sohbet kurulamıyor');

  -- ==== mesaj güvenliği ====
  perform pg_temp.yonetici();
  select id into v_conv from public.conversations where event_id = ev1 and type = 'grup';
  perform pg_temp.ol(deli);
  if (select count(*) from public.messages where conversation_id = v_conv) <> 0 then
    raise exception 'RLS delindi: üye olmayan grup mesajlarını okudu';
  end if;
  perform pg_temp.gec('RLS: üye olmayan grup mesajlarını göremiyor (0 satır)');

  begin
    insert into public.messages (conversation_id, sender_id, content) values (v_conv, deli, 'sızdım');
    raise exception 'BEKLENEN_HATA_YOK: mesaj_uyelik';
  exception when others then
    if sqlerrm not in ('yetki_yok') and sqlstate <> '42501' then raise exception 'yanlış hata: %', sqlerrm; end if;
  end;
  perform pg_temp.gec('mesaj: üye olmayan gruba yazamıyor');

  -- kimlik sahteciliği: veli, ali adına mesaj atamaz
  perform pg_temp.ol(veli);
  begin
    insert into public.messages (conversation_id, sender_id, content) values (v_conv, ali, 'ben ali');
    raise exception 'BEKLENEN_HATA_YOK: sahte_gonderen';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.gec('mesaj: başkasının adına gönderilemiyor (sender = auth.uid)');

  -- hız sınırı: 20/dk
  for v_int in 1..20 loop
    insert into public.messages (conversation_id, sender_id, content) values (v_conv, veli, 'mesaj ' || v_int);
  end loop;
  begin
    insert into public.messages (conversation_id, sender_id, content) values (v_conv, veli, '21. mesaj');
    raise exception 'BEKLENEN_HATA_YOK: mesaj_hiz';
  exception when others then
    if sqlerrm <> 'cok_hizli' then raise exception 'yanlış hata: % (beklenen cok_hizli)', sqlerrm; end if;
  end;
  perform pg_temp.gec('hız: dakikada 21. mesaj kesildi (cok_hizli)');

  perform pg_temp.ol(ali);
  begin
    insert into public.messages (conversation_id, sender_id, content) values (v_conv, ali, repeat('a', 1001));
    raise exception 'BEKLENEN_HATA_YOK: mesaj_uzunluk';
  exception when check_violation then null;
  end;
  perform pg_temp.gec('doğrulama: 1000 karakter üstü mesaj reddedildi');

  -- ==== tepkiler ====
  perform pg_temp.yonetici();
  select max(id) into v_big from public.messages where conversation_id = v_conv and sender_id = veli;
  perform pg_temp.ol(veli);
  insert into public.message_reactions (message_id, user_id, emoji) values (v_big, veli, '👍');
  perform pg_temp.ol(deli);
  begin
    insert into public.message_reactions (message_id, user_id, emoji) values (v_big, deli, '🔥');
    raise exception 'BEKLENEN_HATA_YOK: tepki_uyelik';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.gec('tepki: üye olmayan tepki veremiyor');

  perform pg_temp.ol(veli);
  begin
    insert into public.message_reactions (message_id, user_id, emoji) values (v_big, ali, '❤️');
    raise exception 'BEKLENEN_HATA_YOK: tepki_sahte';
  exception when insufficient_privilege then null;
  end;
  update public.message_reactions set emoji = '⚽' where message_id = v_big and user_id = veli;
  perform pg_temp.yonetici();
  if (select emoji from public.message_reactions where message_id = v_big and user_id = veli) <> '⚽' then
    raise exception 'tepki değiştirme çalışmadı';
  end if;
  perform pg_temp.gec('tepki: başkası adına verilemiyor, kendi tepkisi değişebiliyor');

  -- ==== ilan hız sınırı: günde 5 ====
  perform pg_temp.ol(ali);
  for v_int in 1..4 loop
    insert into public.events (organizer_id, category_id, city_id, title, venue_name, event_date, total_capacity, needed_count)
    values (ali, 1, 6, 'Ek Maç ' || v_int, 'Saha', now() + (v_int || ' days')::interval + interval '4 days', 14, 2);
  end loop;
  begin
    insert into public.events (organizer_id, category_id, city_id, title, venue_name, event_date, total_capacity, needed_count)
    values (ali, 1, 6, 'Altıncı Maç', 'Saha', now() + interval '10 days', 14, 2);
    raise exception 'BEKLENEN_HATA_YOK: ilan_hiz';
  exception when others then
    if sqlerrm <> 'cok_hizli_ilan' then raise exception 'yanlış hata: %', sqlerrm; end if;
  end;
  perform pg_temp.gec('hız: günde 6. ilan kesildi (cok_hizli_ilan)');

  -- ==== kadro dolu ====
  perform pg_temp.ol(veli);
  insert into public.events (organizer_id, category_id, city_id, title, venue_name, event_date, total_capacity, needed_count)
  values (veli, 1, 6, 'Tek Kişilik', 'Saha', now() + interval '2 days', 12, 1) returning id into ev2;
  perform pg_temp.ol(can);
  insert into public.applications (event_id, applicant_id) values (ev2, can) returning id into v_app2;
  perform pg_temp.ol(veli);
  update public.applications set organizer_approved = true where id = v_app2;
  perform pg_temp.yonetici();
  if (select status from public.events where id = ev2) <> 'doldu' then raise exception 'kadro dolunca durum doldu olmadı'; end if;
  perform pg_temp.ol(deli);
  begin
    insert into public.applications (event_id, applicant_id) values (ev2, deli);
    raise exception 'BEKLENEN_HATA_YOK: dolu';
  exception when others then
    if sqlerrm <> 'kadro_dolu' then raise exception 'yanlış hata: %', sqlerrm; end if;
  end;
  perform pg_temp.gec('kadro: dolu ilana başvuru kesildi (kadro_dolu)');

  -- yedek listesi: dolu maçta çalışır, açıkta çalışmaz
  insert into public.waitlist (event_id, user_id) values (ev2, deli);
  begin
    insert into public.waitlist (event_id, user_id) values (ev1, deli);
    raise exception 'BEKLENEN_HATA_YOK: yedek';
  exception when others then
    if sqlerrm <> 'yedek_kapali' then raise exception 'yanlış hata: %', sqlerrm; end if;
  end;
  perform pg_temp.gec('yedek: yalnızca dolu maçta listeye girilebiliyor');

  -- ==== bildirim yalıtımı ====
  perform pg_temp.ol(deli);
  if (select count(*) from public.notifications) <> 0 then
    raise exception 'RLS delindi: başkasının bildirimi okundu';
  end if;
  perform pg_temp.gec('RLS: bildirimler yalnızca sahibine görünüyor');

  -- ==== puanlama: önce tamamlanma şartı ====
  perform pg_temp.ol(veli);
  begin
    insert into public.ratings (event_id, rater_id, rated_id, score) values (ev1, veli, ali, 5);
    raise exception 'BEKLENEN_HATA_YOK: erken_puan';
  exception when others then
    if sqlerrm <> 'mac_tamamlanmadi' then raise exception 'yanlış hata: %', sqlerrm; end if;
  end;
  perform pg_temp.gec('puan: maç tamamlanmadan verilemiyor');

  -- ==== yoklama + tamamlama ====
  perform pg_temp.yonetici();
  update public.events set event_date = now() - interval '2 hours' where id = ev1;
  perform pg_temp.ol(ali);
  update public.participants set attendance = 'gelmedi' where event_id = ev1 and user_id = veli;
  select attended, noshow into v_int, v_num from public.complete_event(ev1);
  perform pg_temp.yonetici();
  if (select status from public.events where id = ev1) <> 'tamamlandi' then raise exception 'tamamlama işlemedi'; end if;
  if (select no_show_count from public.users where id = veli) <> 1 then raise exception 'gelmedi sayacı işlemedi'; end if;
  perform pg_temp.gec('yoklama: gelmedi işareti güvenilirlik sayacına yansıdı');

  -- puan: şimdi çalışır, ortalama güncellenir; kendine puan yasak
  perform pg_temp.ol(veli);
  insert into public.ratings (event_id, rater_id, rated_id, score, comment) values (ev1, veli, ali, 4, 'İyi organizasyon');
  perform pg_temp.yonetici();
  if (select rating_avg from public.users where id = ali) <> 4.00 then raise exception 'puan ortalaması güncellenmedi'; end if;
  perform pg_temp.ol(veli);
  begin
    insert into public.ratings (event_id, rater_id, rated_id, score) values (ev1, veli, veli, 5);
    raise exception 'BEKLENEN_HATA_YOK: kendine_puan';
  exception when check_violation then null;
  end;
  perform pg_temp.gec('puan: ortalama işledi, kendine puan yasak');

  -- MVP: kendine oy yasak
  begin
    insert into public.mvp_votes (event_id, voter_id, voted_id) values (ev1, veli, veli);
    raise exception 'BEKLENEN_HATA_YOK: kendine_mvp';
  exception when check_violation then null;
  end;
  insert into public.mvp_votes (event_id, voter_id, voted_id) values (ev1, veli, ali);
  perform pg_temp.gec('MVP: kendine oy yasak, takım arkadaşına serbest');

  -- MVP kesinleştirme (48 saat kuralı)
  perform pg_temp.yonetici();
  update public.events set event_date = now() - interval '49 hours' where id = ev1;
  select public.finalize_due_mvps() into v_int;
  if v_int < 1 or (select mvp_user_id from public.events where id = ev1) <> ali then
    raise exception 'MVP kesinleştirme çalışmadı';
  end if;
  if (select mvp_count from public.users where id = ali) <> 1 then raise exception 'mvp_count artmadı'; end if;
  perform pg_temp.gec('MVP: 48 saat sonra en çok oy kesinleşti, sayaç arttı');

  -- ==== şikayet: aynı kişiye günde 1 ====
  perform pg_temp.ol(veli);
  insert into public.reports (reporter_id, reported_user_id, reason) values (veli, deli, 'taciz');
  begin
    insert into public.reports (reporter_id, reported_user_id, reason) values (veli, deli, 'taciz');
    raise exception 'BEKLENEN_HATA_YOK: sikayet_tekrar';
  exception when others then
    if sqlerrm <> 'zaten_sikayet' then raise exception 'yanlış hata: %', sqlerrm; end if;
  end;
  perform pg_temp.gec('şikayet: aynı kişiye ikinci şikayet aynı gün kesildi');

  -- ==== ödeme: yalnız organizatör onaylar ====
  perform pg_temp.ol(deli);
  begin
    perform public.confirm_payment(ev1, veli, 'odendi');
    raise exception 'BEKLENEN_HATA_YOK: odeme_yetki';
  exception when others then
    if sqlerrm <> 'yetki_yok' then raise exception 'yanlış hata: %', sqlerrm; end if;
  end;
  perform pg_temp.gec('ödeme: kadro dışından onay denemesi kesildi (yetki_yok)');

  -- ödeme görünümü kadro dışına kapalı
  if (select count(*) from public.v_event_payments where event_id = ev1) <> 0 then
    raise exception 'ödeme görünümü dışarı sızdı';
  end if;
  perform pg_temp.gec('gizlilik: ödeme listesi kadro dışına görünmüyor');

  -- ==== geç ayrılma: no_show işler ====
  perform pg_temp.ol(can);
  perform pg_temp.yonetici();
  update public.events set event_date = now() + interval '3 hours' where id = ev2;   -- 24 saatten yakın
  perform pg_temp.ol(can);
  select public.leave_event(ev2) into v_bool;
  perform pg_temp.yonetici();
  if not v_bool then raise exception 'geç ayrılma bayrağı dönmedi'; end if;
  if (select no_show_count from public.users where id = can) <> 1 then raise exception 'geç ayrılma sayaca işlemedi'; end if;
  if (select status from public.events where id = ev2) <> 'acik' then raise exception 'ayrılınca kontenjan yeniden açılmadı'; end if;
  perform pg_temp.gec('ayrılma: maça <24 saat kala ayrılmak gelmedi gibi işledi, yer açıldı');

  -- ==== haftalık seri: tamamlanınca gelecek hafta açılır ====
  perform pg_temp.ol(veli);
  insert into public.events (organizer_id, category_id, city_id, title, venue_name, event_date,
                             total_capacity, needed_count, recurrence)
  values (veli, 1, 6, 'Pazar Ligi', 'Arena', now() - interval '30 minutes', 12, 2, 'haftalik')
  returning id into ev_hafta;
  perform public.complete_event(ev_hafta);
  perform pg_temp.yonetici();
  select id into ev_sonraki from public.events
   where series_id = ev_hafta and id <> ev_hafta and status = 'acik';
  if ev_sonraki is null then raise exception 'haftalık seri sonraki maçı açmadı'; end if;
  if (select count(*) from public.conversations where series_id = ev_hafta) <> 1 then
    raise exception 'seri grubu çoğaldı (tek grup kalmalıydı)';
  end if;
  perform pg_temp.gec('seri: tamamlanan haftalık maç gelecek haftayı açtı, grup tek kaldı');

  -- ==== hesap silme: anonimleştirme ====
  perform pg_temp.ol(deli);
  perform public.delete_own_account();
  perform pg_temp.yonetici();
  if (select full_name from public.users where id = deli) <> 'Ayrılan üye'
     or (select status from public.users where id = deli) <> 'kapali' then
    raise exception 'hesap silme anonimleştirmedi';
  end if;
  perform pg_temp.gec('hesap: silme isteği profili anonimleştirdi, geçmiş kayıtlar bozulmadı');

  -- ==== çift ilan aşısı ====
  perform pg_temp.yonetici();
  insert into auth.users (phone, raw_user_meta_data) values
    ('+905321110099', '{"full_name":"Tekil Test","username":"tekil","city_id":"6"}');
  select id into tekil from public.users where username = 'tekil';
  perform pg_temp.ol(tekil);
  insert into public.events (organizer_id, title, category_id, event_date, city_id, total_capacity, needed_count, price_per_person)
  values (tekil, 'Tekillik Provası', 1, now() + interval '3 day', 6, 10, 2, 0);
  begin
    insert into public.events (organizer_id, title, category_id, event_date, city_id, total_capacity, needed_count, price_per_person)
    values (tekil, 'Tekillik Provası', 1, now() + interval '3 day', 6, 10, 2, 0);
    raise exception 'BEKLENEN_HATA_YOK: cift_ilan';
  exception when unique_violation then null;
  end;
  perform pg_temp.gec('ilan: aynı başlık+saat ikinci kez açılamıyor (tekillik indeksi)');

  -- ==== saha havuzu ====
  perform pg_temp.ol(veli);
  insert into public.venues (city_id, category_id, name, lat, lng, created_by)
  values (6, 1, 'Test Arena Halı Saha', 39.92, 32.85, veli);
  if (select count(*) from public.venues where name = 'Test Arena Halı Saha') <> 1 then
    raise exception 'saha okunamadı';
  end if;
  begin
    insert into public.venues (city_id, category_id, name, created_by) values (6, 1, 'Sahte Kayıt', ali);
    raise exception 'BEKLENEN_HATA_YOK: saha_sahte';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.gec('saha havuzu: okunur, kendi adına eklenir, başkası adına eklenemez');

  -- ==== sponsorlar ====
  perform pg_temp.ol(veli);
  if (select count(*) from public.sponsors where id = 'elitlig') <> 1 then
    raise exception 'sponsor kaydı okunamadı';
  end if;
  perform public.sponsor_click('elitlig');
  begin
    update public.sponsors set clicks = 999 where id = 'elitlig';
    raise exception 'BEKLENEN_HATA_YOK: sponsor_yazma';
  exception when insufficient_privilege then null;
  end;
  perform pg_temp.yonetici();
  if (select clicks from public.sponsors where id = 'elitlig') < 1 then
    raise exception 'tıklama sayacı işlemedi';
  end if;
  perform pg_temp.gec('sponsor: kart okunur, tık sayılır, sayaç istemciden yazılamaz');

  raise notice '';
  raise notice '━━━ % güvenlik testi geçti ━━━', currval('pg_temp.testno');
end $testler$;
