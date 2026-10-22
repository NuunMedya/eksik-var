-- EKSİK VAR — Kolay ödeme (bir kez, Supabase SQL Editor)
set search_path = public;

-- 1) Dekont alanı
alter table public.participants add column if not exists payment_proof_url text;

-- 2) Katılımcı, maçın organizatörünün IBAN'ını görebilsin (yalnız o maç için, yalnız katılımcıysa)
create or replace function public.organizer_iban(p_event uuid)
returns table (iban text, holder text, organizer_name text)
language sql security definer set search_path = public as $$
  select pd.iban, pd.holder_name, u.full_name
    from public.events e
    join public.users u on u.id = e.organizer_id
    left join public.payment_details pd on pd.user_id = e.organizer_id
   where e.id = p_event
     and (public.katilimci_mi(p_event, auth.uid()) or public.organizatoru_mu(p_event, auth.uid()))
$$;
grant execute on function public.organizer_iban(uuid) to authenticated;

-- 3) "Ödedim" + isteğe bağlı dekont (mevcut claim_payment'ı korur, üstüne dekont yazar)
create or replace function public.claim_payment_proof(p_event uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.claim_payment(p_event);
  update public.participants set payment_proof_url = nullif(trim(p_url), '')
   where event_id = p_event and user_id = auth.uid();
end $$;
grant execute on function public.claim_payment_proof(uuid, text) to authenticated;

-- 4) Ödeme görünümüne dekont ve onay zamanı eklendi
drop view if exists public.v_event_payments;
create view public.v_event_payments with (security_invoker = true) as
  select p.event_id, p.user_id, u.full_name, u.avatar_url,
         e.price_per_person as amount, p.payment_status as status,
         p.payment_proof_url as proof_url, p.payment_claimed_at as claimed_at
    from public.participants p
    join public.events e on e.id = p.event_id
    join public.users u on u.id = p.user_id
   where e.price_per_person > 0
     and (public.katilimci_mi(p.event_id, auth.uid()) or public.organizatoru_mu(p.event_id, auth.uid()));
grant select on public.v_event_payments to authenticated;
