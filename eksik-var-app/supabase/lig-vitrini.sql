-- EKSİK VAR — Lig Vitrini (lig/turnuva ilanları). Supabase SQL Editor'de bir kez çalıştırın.
set search_path = public;

create table if not exists public.lig_ilanlari (
  id            uuid primary key default gen_random_uuid(),
  baslik        text not null check (char_length(baslik) between 3 and 60),
  aciklama      text check (char_length(aciklama) <= 400),
  afis_url      text,
  city_id       int references public.cities(id),         -- null = tüm Türkiye
  district_id   bigint references public.districts(id),   -- null = tüm il
  cat           int not null default 1,                   -- branş (CATEGORIES id; 1 = halı saha)
  baslangic     date,
  takim_ucreti  text,                                      -- serbest metin: "12.000 TL / sezon"
  kontenjan     int,                                       -- kalan takım sayısı (null = belirtilmedi)
  iletisim_tel  text,                                      -- 905xxxxxxxxx (WhatsApp)
  link          text check (link is null or link ~ '^https?://'),
  oncelik       int not null default 5,                   -- küçük = üstte
  aktif         boolean not null default true,
  bitis         date,                                      -- bu tarihten sonra gösterilmez
  odendi        boolean not null default false,
  goster        int not null default 0,
  tikla         int not null default 0,
  basvuru       int not null default 0,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create table if not exists public.lig_basvurulari (
  id         uuid primary key default gen_random_uuid(),
  lig_id     uuid not null references public.lig_ilanlari(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  tur        text not null default 'takim' check (tur in ('takim','oyuncu')),
  takim_adi  text,
  notu       text check (char_length(notu) <= 300),
  created_at timestamptz not null default now(),
  unique (lig_id, user_id)
);

alter table public.lig_ilanlari enable row level security;
alter table public.lig_basvurulari enable row level security;

-- okuma: giriş yapan herkes aktif ilanları görür; yöneticiler hepsini
drop policy if exists p_lig_read on public.lig_ilanlari;
create policy p_lig_read on public.lig_ilanlari for select to authenticated
  using (is_admin() or (aktif and (bitis is null or bitis >= current_date)));
-- yazma: yalnız yöneticiler
drop policy if exists p_lig_write on public.lig_ilanlari;
create policy p_lig_write on public.lig_ilanlari for all to authenticated
  using (is_admin()) with check (is_admin());
-- başvurular: kullanıcı kendininkini yazar/görür, yönetici hepsini görür
drop policy if exists p_ligb_insert on public.lig_basvurulari;
create policy p_ligb_insert on public.lig_basvurulari for insert to authenticated with check (user_id = auth.uid());
drop policy if exists p_ligb_read on public.lig_basvurulari;
create policy p_ligb_read on public.lig_basvurulari for select to authenticated using (user_id = auth.uid() or is_admin());

grant select, insert, update, delete on public.lig_ilanlari to authenticated;
grant select, insert on public.lig_basvurulari to authenticated;

-- sayaçlar: yalnız RPC artırır (istemci doğrudan güncelleyemez)
create or replace function public.lig_goster(p_ids uuid[]) returns void
language sql security definer set search_path = public as $$
  update public.lig_ilanlari set goster = goster + 1 where id = any(p_ids) and aktif
$$;
create or replace function public.lig_tikla(p_id uuid) returns void
language sql security definer set search_path = public as $$
  update public.lig_ilanlari set tikla = tikla + 1 where id = p_id and aktif
$$;
create or replace function public.lig_basvur(p_id uuid, p_tur text, p_takim text, p_not text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'GIRIS_GEREKLI'; end if;
  insert into public.lig_basvurulari (lig_id, user_id, tur, takim_adi, notu)
  values (p_id, auth.uid(), coalesce(p_tur,'takim'), nullif(trim(p_takim),''), nullif(trim(p_not),''))
  on conflict (lig_id, user_id) do update set tur = excluded.tur, takim_adi = excluded.takim_adi, notu = excluded.notu, created_at = now();
  update public.lig_ilanlari set basvuru = (select count(*) from public.lig_basvurulari where lig_id = p_id) where id = p_id;
end $$;
grant execute on function public.lig_goster(uuid[]), public.lig_tikla(uuid), public.lig_basvur(uuid, text, text, text) to authenticated;

-- yönetici: başvuru listesi (isim ve telefonla)
create or replace function public.lig_basvuru_listesi(p_id uuid)
returns table (ad text, kullanici text, telefon text, tur text, takim_adi text, notu text, tarih timestamptz)
language sql security definer set search_path = public as $$
  select u.full_name, u.username, au.phone, b.tur, b.takim_adi, b.notu, b.created_at
    from public.lig_basvurulari b
    join public.users u on u.id = b.user_id
    join auth.users au on au.id = b.user_id
   where b.lig_id = p_id and is_admin()
   order by b.created_at desc
$$;
grant execute on function public.lig_basvuru_listesi(uuid) to authenticated;
