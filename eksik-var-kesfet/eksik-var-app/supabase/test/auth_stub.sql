-- Yerel test saplaması: Supabase'in auth şemasını ve rollerini taklit eder.
-- ÜRETİMDE ÇALIŞTIRMAYIN — Supabase bunları kendisi sağlar.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  phone text, email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- Oturum kullanıcısı: SET app.uid = '<uuid>' ile taklit edilir
create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated;
