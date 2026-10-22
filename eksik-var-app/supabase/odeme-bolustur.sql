-- EKSİK VAR — Saha ücretini kişi başına otomatik bölme (bir kez, Supabase SQL Editor)
set search_path = public;

-- 1) Toplam saha ücreti alanı (null = organizatör kişi başını elle giriyor)
alter table public.events add column if not exists total_cost numeric(10,2);
grant insert (total_cost) on public.events to authenticated;
grant update (total_cost) on public.events to authenticated;

-- 2) Paylaşım tabanı: uygulamadaki katılımcılar (muaf hariç) + uygulamaya girmemiş sabit ekip
create or replace function public.odeyen_sayisi(p_event uuid) returns int
language sql stable security definer set search_path = public as $$
  select greatest(1,
    (select count(*) from public.participants where event_id = p_event and payment_status <> 'muaf')::int
    + coalesce((select offline_regulars from public.events where id = p_event), 0))
$$;

-- 3) Organizatör: "gelenlere göre yeniden böl" → kişi başı güncellenir, ödemesi bekleyenlere bildirim
create or replace function public.rebalance_price(p_event uuid) returns int
language plpgsql security definer set search_path = public as $$
declare e record; n int; yeni int;
begin
  select * into e from public.events where id = p_event;
  if e is null or e.organizer_id <> auth.uid() then perform public.hata('yetki_yok'); end if;
  if e.total_cost is null or e.total_cost <= 0 then perform public.hata('toplam_ucret_yok'); end if;
  n := public.odeyen_sayisi(p_event);
  yeni := ceil(e.total_cost / n);
  if yeni <> coalesce(e.price_per_person, 0) then
    update public.events set price_per_person = yeni where id = p_event;
    insert into public.notifications (user_id, type, title, body, data)
    select p.user_id, 'odeme', 'Payın güncellendi',
           '"' || e.title || '" için kişi başı ' || yeni || '₺ oldu (' || n || ' kişi · saha ' || e.total_cost::int || '₺)',
           jsonb_build_object('eventId', p_event)
      from public.participants p where p.event_id = p_event and p.payment_status in ('bekliyor','odedim');
  end if;
  return yeni;
end $$;
grant execute on function public.rebalance_price(uuid) to authenticated;
grant execute on function public.odeyen_sayisi(uuid) to authenticated;

-- 4) Kayıt/güncellemede toplam girildiyse kişi başını planlanan kadroya göre otomatik hesapla
create or replace function public.events_price_from_total() returns trigger
language plpgsql as $$
begin
  if new.total_cost is not null and new.total_cost > 0 then
    if tg_op = 'INSERT' or new.total_cost is distinct from old.total_cost or new.total_capacity is distinct from old.total_capacity or new.offline_regulars is distinct from old.offline_regulars then
      new.price_per_person := ceil(new.total_cost / greatest(1, coalesce(new.total_capacity, 1)));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_events_price_from_total on public.events;
create trigger trg_events_price_from_total before insert or update on public.events
  for each row execute function public.events_price_from_total();
