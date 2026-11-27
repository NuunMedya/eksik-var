-- Ödeme oranı yalnız katılınan maçlardan (gelmeme zaten katılımdan düşüyor) + herkes için yeniden hesap
set search_path = public;
create or replace function public.guven_hesapla(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare j int; n int; seri int := 0; r record; o_pct numeric; o_say int; puan int; rating numeric;
begin
  select count(*) filter (where attendance = 'katildi'), count(*) filter (where attendance = 'gelmedi')
    into j, n from public.participants where user_id = p_user;
  -- seri: en yeni maçtan geriye, ilk 'gelmedi'ye kadar
  for r in select p.attendance from public.participants p join public.events e on e.id = p.event_id
            where p.user_id = p_user and p.attendance in ('katildi','gelmedi') order by e.event_date desc loop
    exit when r.attendance = 'gelmedi';
    seri := seri + 1;
  end loop;
  -- ödeme düzeni: tamamlanmış ücretli maçlar
  select case when count(*) = 0 then null else round(count(*) filter (where p.payment_status in ('odendi','muaf')) * 100.0 / count(*), 2) end,
         count(*) filter (where p.payment_status in ('odendi','muaf') and (p.payment_claimed_at is null or p.payment_claimed_at <= e.event_date + interval '3 days'))
    into o_pct, o_say
    from public.participants p join public.events e on e.id = p.event_id
   where p.user_id = p_user and e.status = 'tamamlandi' and e.price_per_person > 0 and p.attendance is distinct from 'gelmedi';
  select rating_avg into rating from public.users where id = p_user;
  if j + n >= 3 then
    puan := round(0.60 * (j * 100.0 / (j + n))
                + 0.25 * coalesce(o_pct, j * 100.0 / (j + n))
                + 0.15 * (case when rating > 0 then rating / 5.0 * 100 else 85 end));
  else
    puan := null;
  end if;
  perform set_config('eksik.guven_ic', '1', true);   -- koru_guven bu güncellemeye dokunmasın
  update public.users set events_joined = j, no_show_count = n,
         reliability_pct = case when j + n > 0 then round(j * 100.0 / (j + n), 2) end,
         katilim_seri = seri, odeme_pct = o_pct, odeme_sayisi = coalesce(o_say, 0), guven_puani = puan
   where id = p_user;
  perform set_config('eksik.guven_ic', '', true);
end $$;

do $$ declare uid uuid; begin for uid in select id from public.users loop perform public.guven_hesapla(uid); end loop; end $$;
