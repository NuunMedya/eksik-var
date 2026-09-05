-- ============================================================================
-- EKSİK VAR · Supabase kurulumu (şema + güvenlik)
-- Sıra: 1) bu dosya  2) seed_iller.sql
-- Supabase SQL Editor'e yapıştırıp çalıştırın. Yeniden çalıştırılabilir
-- olacak şekilde yazılmıştır (drop/create if exists).
--
-- Güvenlik modeli özeti:
--  · Her tabloda RLS açık; istemci yalnızca kendi görebileceği satırlara ulaşır.
--  · Yazma kuralları tetikleyicilerle de doğrulanır (RLS + tetikleyici çift kilit).
--  · Hız sınırları veritabanında: mesaj 20/dk, ilan 5/gün + 10 açık,
--    başvuru 20/gün, şikayet 10/gün (aynı kişiye günde 1), arama 30/gün.
--  · Hata mesajları anahtar döner (cok_hizli, engellendi, kadro_dolu, yetki_yok,
--    gec_kaldi, kapali_hesap, kod_hatali...); uygulama bunları Türkçeleştirir.
--  · users.push_token gibi hassas kolonlar sütun-izinleriyle gizlenir.
--  · Görünümler security_invoker: RLS görünümden delinemez.
-- ============================================================================

create extension if not exists pgcrypto;
set check_function_bodies = off;   -- yardımcılar tablolardan önce tanımlanıyor; gövdeler çalıştırma anında doğrulanır

-- ---------------------------------------------------------------------------
-- 0) Yardımcılar
-- ---------------------------------------------------------------------------
create or replace function public.hata(p_key text) returns void
language plpgsql as $$
begin raise exception using errcode = 'P0001', message = p_key; end $$;

-- Hesap aktif mi (askıya alınmış/kapalı hesap yazamaz)
create or replace function public.aktif_mi(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status = 'aktif' and (suspended_until is null or suspended_until < now())
                     from public.users where id = p_user), false)
$$;

-- İki kullanıcı arasında engel var mı (iki yön)
create or replace function public.engel_var(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.blocks
                  where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a))
$$;

create or replace function public.uyesi_mi(p_conv bigint, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conv and user_id = p_user)
$$;

create or replace function public.organizatoru_mu(p_event uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.events where id = p_event and organizer_id = p_user)
$$;

create or replace function public.katilimci_mi(p_event uuid, p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.participants where event_id = p_event and user_id = p_user)
$$;

-- ---------------------------------------------------------------------------
-- 1) Tablolar
-- ---------------------------------------------------------------------------
create table if not exists public.cities (
  id   int primary key,                       -- plaka kodu
  name text not null unique
);

create table if not exists public.districts (
  id      bigserial primary key,
  city_id int not null references public.cities(id),
  name    text not null,
  unique (city_id, name)
);

create table if not exists public.users (
  id               uuid primary key references auth.users(id) on delete cascade,
  full_name        text not null check (char_length(full_name) between 2 and 40),
  username         text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  bio              text check (char_length(bio) <= 160),
  skill_level      text not null default 'farketmez' check (skill_level in ('farketmez','baslangic','orta','ileri')),
  avatar_url       text,
  positions        jsonb not null default '[]'::jsonb,
  team_name        text check (char_length(team_name) <= 28),
  city_id          int references public.cities(id),
  district_id      bigint references public.districts(id),
  rating_avg       numeric(3,2) not null default 0,
  rating_count     int not null default 0,
  reliability_pct  numeric(5,2),
  events_joined    int not null default 0,
  events_organized int not null default 0,
  no_show_count    int not null default 0,
  mvp_count        int not null default 0,
  is_verified      boolean not null default false,
  status           text not null default 'aktif' check (status in ('aktif','askida','kapali')),
  status_reason    text,
  suspended_until  timestamptz,
  contact_mode     text not null default 'ikisi' check (contact_mode in ('ikisi','mesaj','arama')),
  contact_scope    text not null default 'herkes' check (contact_scope in ('herkes','kadro')),
  quiet_enabled    boolean not null default false,
  quiet_start      time not null default '22:00',
  quiet_end        time not null default '08:00',
  notif_basvuru    boolean not null default true,
  notif_mesaj      boolean not null default true,
  notif_hatirlatma boolean not null default true,
  notif_yakin      boolean not null default true,
  push_token       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.users add column if not exists fav_cat int check (fav_cat between 1 and 4);
alter table public.users add column if not exists fav_cats jsonb not null default '[]';
alter table public.users add column if not exists cat_levels jsonb not null default '{}';

create table if not exists public.events (
  id                    uuid primary key default gen_random_uuid(),
  organizer_id          uuid not null references public.users(id) on delete cascade,
  category_id           int not null check (category_id between 1 and 4),
  city_id               int not null references public.cities(id),
  district_id           bigint references public.districts(id),
  title                 text not null check (char_length(title) between 3 and 60),
  description           text check (char_length(description) <= 500),
  venue_name            text not null default '' check (char_length(venue_name) <= 80),
  event_date            timestamptz not null,
  total_capacity        int not null check (total_capacity between 2 and 30),
  needed_count          int not null check (needed_count between 0 and 29),
  filled_count          int not null default 0,
  price_per_person      numeric(8,2) not null default 0 check (price_per_person between 0 and 10000),
  skill_level           text not null default 'farketmez' check (skill_level in ('farketmez','baslangic','orta','ileri')),
  status                text not null default 'acik' check (status in ('acik','doldu','tamamlandi','iptal')),
  recurrence            text not null default 'yok' check (recurrence in ('yok','haftalik')),
  recurrence_until      date,
  series_id             uuid,
  needed_positions      jsonb not null default '{}'::jsonb,
  kind                  text not null default 'oyuncu' check (kind in ('oyuncu','rakip')),
  team_name             text check (char_length(team_name) <= 28),
  format                text,
  venue_mode            text check (venue_mode in ('bizde','sizde','farketmez')),
  venue_lat             double precision,
  venue_lng             double precision,
  cost_mode             text check (cost_mode in ('yari_yariya','biz','siz','ucretsiz')),
  offline_regulars      int not null default 0 check (offline_regulars between 0 and 30),
  availability_asked_at timestamptz,
  availability_poll_id  uuid,
  score_home            int check (score_home between 0 and 99),
  score_away            int check (score_away between 0 and 99),
  score_label           text,
  mvp_user_id           uuid references public.users(id),
  mvp_finalized_at      timestamptz,
  checkin_code          text,
  checkin_opened_at     timestamptz,
  completed_at          timestamptz,
  cancelled_reason      text,
  created_at            timestamptz not null default now(),
  check (needed_count < total_capacity)
);
alter table public.events drop constraint if exists events_cost_mode_check;
alter table public.events add column if not exists venue_lat double precision;
alter table public.events add column if not exists venue_lng double precision;
alter table public.events add constraint events_cost_mode_check check (cost_mode in ('yari_yariya','biz','siz','ucretsiz'));
create index if not exists idx_events_feed on public.events (city_id, status, event_date);
create index if not exists idx_events_org  on public.events (organizer_id, event_date);
create index if not exists idx_events_seri on public.events (series_id);

create table if not exists public.participants (
  event_id           uuid not null references public.events(id) on delete cascade,
  user_id            uuid not null references public.users(id) on delete cascade,
  position           text,
  attendance         text not null default 'bekleniyor' check (attendance in ('bekleniyor','katildi','gelmedi')),
  checked_in_at      timestamptz,
  payment_status     text not null default 'bekliyor' check (payment_status in ('bekliyor','odedim','odendi','muaf')),
  payment_claimed_at timestamptz,
  joined_at          timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists idx_part_user on public.participants (user_id);

create table if not exists public.conversations (
  id                bigserial primary key,
  type              text not null check (type in ('grup','birebir')),
  event_id          uuid references public.events(id) on delete set null,
  series_id         uuid,
  name              text check (char_length(name) <= 80),
  created_by        uuid references public.users(id) on delete set null,
  pinned_message_id bigint,
  created_at        timestamptz not null default now()
);
create index if not exists idx_conv_event on public.conversations (event_id);
create index if not exists idx_conv_seri  on public.conversations (series_id);

create table if not exists public.conversation_members (
  conversation_id      bigint not null references public.conversations(id) on delete cascade,
  user_id              uuid not null references public.users(id) on delete cascade,
  role                 text not null default 'uye' check (role in ('yonetici','uye')),
  is_muted             boolean not null default false,
  last_read_message_id bigint not null default 0,
  joined_at            timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index if not exists idx_cm_user on public.conversation_members (user_id);

create table if not exists public.messages (
  id              bigserial primary key,
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  sender_id       uuid references public.users(id) on delete set null,     -- null = sistem
  type            text not null default 'metin' check (type in ('metin','sistem','resim')),
  content         text check (content is null or char_length(content) <= 1000),
  image_url       text,
  poll_id         uuid,
  created_at      timestamptz not null default now(),
  check (type = 'resim' or content is not null)
);
create index if not exists idx_msg_conv on public.messages (conversation_id, id desc);
alter table public.conversations
  drop constraint if exists conversations_pinned_message_id_fkey,
  add  constraint conversations_pinned_message_id_fkey
       foreign key (pinned_message_id) references public.messages(id) on delete set null;

create table if not exists public.polls (
  id              uuid primary key default gen_random_uuid(),
  conversation_id bigint not null references public.conversations(id) on delete cascade,
  event_id        uuid references public.events(id) on delete cascade,
  kind            text not null default 'serbest' check (kind in ('serbest','varmisin')),
  question        text not null check (char_length(question) between 2 and 200),
  options         jsonb not null,
  multiple        boolean not null default false,
  closed_at       timestamptz,
  created_by      uuid not null references public.users(id) on delete cascade,
  created_at      timestamptz not null default now()
);

create table if not exists public.poll_votes (
  poll_id   uuid not null references public.polls(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  option_id text not null check (option_id in ('a','b','c','d','e','f','varim','yokum','belirsiz')),
  created_at timestamptz not null default now(),
  primary key (poll_id, user_id, option_id)
);

create table if not exists public.notifications (
  id         bigserial primary key,
  user_id    uuid not null references public.users(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  data       jsonb not null default '{}'::jsonb,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications (user_id, created_at desc);

create table if not exists public.blocks (
  blocker_id uuid not null references public.users(id) on delete cascade,
  blocked_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists public.reports (
  id               bigserial primary key,
  reporter_id      uuid not null references public.users(id) on delete cascade,
  reported_user_id uuid not null references public.users(id) on delete cascade,
  event_id         uuid references public.events(id) on delete set null,
  reason           text not null check (char_length(reason) <= 40),
  description      text check (char_length(description) <= 500),
  status           text not null default 'yeni' check (status in ('yeni','incelendi','kapatildi')),
  created_at       timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);

create table if not exists public.applications (
  id                 uuid primary key default gen_random_uuid(),
  event_id           uuid not null references public.events(id) on delete cascade,
  applicant_id       uuid not null references public.users(id) on delete cascade,
  message            text check (char_length(message) <= 200),
  position           text,
  status             text not null default 'beklemede' check (status in ('beklemede','onaylandi','reddedildi','iptal')),
  organizer_approved  boolean not null default false,
  applicant_approved  boolean not null default true,
  invited_by         uuid references public.users(id),
  from_waitlist      boolean not null default false,
  offer_expires_at   timestamptz,
  conversation_id    bigint references public.conversations(id) on delete set null,
  created_at         timestamptz not null default now(),
  unique (event_id, applicant_id)
);

create table if not exists public.ratings (
  id         bigserial primary key,
  event_id   uuid not null references public.events(id) on delete cascade,
  rater_id   uuid not null references public.users(id) on delete cascade,
  rated_id   uuid not null references public.users(id) on delete cascade,
  score      int not null check (score between 1 and 5),
  comment    text check (char_length(comment) <= 200),
  created_at timestamptz not null default now(),
  unique (event_id, rater_id, rated_id),
  check (rater_id <> rated_id)
);

create table if not exists public.waitlist (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  position   text,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

create table if not exists public.mvp_votes (
  event_id   uuid not null references public.events(id) on delete cascade,
  voter_id   uuid not null references public.users(id) on delete cascade,
  voted_id   uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, voter_id),
  check (voter_id <> voted_id)
);

create table if not exists public.guests (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.users(id) on delete cascade,
  event_id   uuid references public.events(id) on delete cascade,
  series_id  uuid,
  name       text not null check (char_length(name) between 2 and 40),
  created_at timestamptz not null default now(),
  check (event_id is not null or series_id is not null)
);

create table if not exists public.guest_records (
  event_id       uuid not null references public.events(id) on delete cascade,
  guest_id       uuid not null references public.guests(id) on delete cascade,
  available      boolean not null default true,
  attendance     text not null default 'bekleniyor' check (attendance in ('bekleniyor','katildi','gelmedi')),
  payment_status text not null default 'bekliyor' check (payment_status in ('bekliyor','odedim','odendi','muaf')),
  created_at     timestamptz not null default now(),
  primary key (event_id, guest_id)
);

create table if not exists public.match_stats (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id  uuid references public.users(id) on delete cascade,
  guest_id uuid references public.guests(id) on delete cascade,
  goals    int not null default 0 check (goals between 0 and 99),
  assists  int not null default 0 check (assists between 0 and 99),
  check (num_nonnulls(user_id, guest_id) = 1)
);
create unique index if not exists uq_stat_user  on public.match_stats (event_id, user_id) where user_id is not null;
create unique index if not exists uq_stat_guest on public.match_stats (event_id, guest_id) where guest_id is not null;

create table if not exists public.payment_details (
  user_id     uuid primary key references public.users(id) on delete cascade,
  iban        text not null check (iban ~ '^TR[0-9]{24}$'),
  holder_name text check (char_length(holder_name) <= 60),
  updated_at  timestamptz not null default now()
);

create table if not exists public.saved_venues (
  user_id     uuid not null references public.users(id) on delete cascade,
  name        text not null check (char_length(name) <= 80),
  district_id bigint references public.districts(id),
  price       numeric(8,2),
  used_count  int not null default 1,
  primary key (user_id, name)
);

create table if not exists public.calls (
  id          bigserial primary key,
  caller_id   uuid not null references public.users(id) on delete cascade,
  callee_id   uuid not null references public.users(id) on delete cascade,
  status      text not null default 'ariyor' check (status in ('ariyor','cevaplandi','cevapsiz')),
  created_at  timestamptz not null default now(),
  answered_at timestamptz,
  ended_at    timestamptz,
  check (caller_id <> callee_id)
);

-- ---------------------------------------------------------------------------
-- 2) Yeni kayıt: auth.users → public.users profili (metadata'dan)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'Oyuncu');
  v_user text := lower(coalesce(nullif(trim(new.raw_user_meta_data->>'username'), ''), 'oyuncu'));
  v_pos  jsonb := case when jsonb_typeof(new.raw_user_meta_data->'positions') = 'array'
    then new.raw_user_meta_data->'positions' else '[]'::jsonb end;
  v_cats jsonb := case when jsonb_typeof(new.raw_user_meta_data->'fav_cats') = 'array'
    then new.raw_user_meta_data->'fav_cats' else '[]'::jsonb end;
begin
  v_user := regexp_replace(v_user, '[^a-z0-9_]', '', 'g');
  if char_length(v_user) < 3 then v_user := 'oyuncu' || floor(random() * 10000)::int; end if;
  if exists (select 1 from public.users where username = v_user) then
    v_user := left(v_user, 14) || '_' || left(replace(new.id::text, '-', ''), 5);
  end if;
  insert into public.users (id, full_name, username, city_id, district_id, is_verified, fav_cat, positions, fav_cats)
  values (
    new.id, left(v_name, 40), v_user,
    nullif(new.raw_user_meta_data->>'city_id', '')::int,
    nullif(new.raw_user_meta_data->>'district_id', '')::bigint,
    new.phone is not null,
    nullif(new.raw_user_meta_data->>'fav_cat', '')::int,
    v_pos, v_cats
  ) on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 3) Etkinlik tetikleyicileri: hız sınırı, grup sohbeti, seri
-- ---------------------------------------------------------------------------
create or replace function public.trg_event_insert_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.aktif_mi(new.organizer_id) then perform public.hata('kapali_hesap'); end if;
  if (select count(*) from public.events where organizer_id = new.organizer_id
        and created_at > now() - interval '1 day') >= 5 then
    perform public.hata('cok_hizli_ilan');                                   -- günde en çok 5 ilan
  end if;
  if (select count(*) from public.events where organizer_id = new.organizer_id
        and status in ('acik','doldu') and event_date > now()) >= 10 then
    perform public.hata('cok_fazla_acik_ilan');                              -- aynı anda 10 açık ilan
  end if;
  if new.event_date < now() - interval '1 hour' then perform public.hata('gecmis_tarih'); end if;
  if new.recurrence = 'haftalik' and new.series_id is null then new.series_id := new.id; end if;
  return new;
end $$;
drop trigger if exists event_insert_check on public.events;
create trigger event_insert_check before insert on public.events
  for each row execute function public.trg_event_insert_check();

create or replace function public.trg_event_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_conv bigint;
begin
  -- seri devam ediyorsa mevcut grup sohbeti kullanılır; yoksa yeni grup açılır
  if new.series_id is not null then
    select id into v_conv from public.conversations where series_id = new.series_id limit 1;
  end if;
  if v_conv is null then
    insert into public.conversations (type, event_id, series_id, name, created_by)
    values ('grup', new.id,
            case when new.recurrence = 'haftalik' then new.series_id end,
            case when new.kind = 'rakip' then coalesce(new.team_name, 'Takım') || ' · kaptanlar' else new.title end,
            new.organizer_id)
    returning id into v_conv;
    insert into public.conversation_members (conversation_id, user_id, role) values (v_conv, new.organizer_id, 'yonetici');
    insert into public.messages (conversation_id, sender_id, type, content)
    values (v_conv, null, 'sistem', case when new.kind = 'rakip'
      then 'Kaptanlar sohbeti · Rakip takımın kaptanı kabul edilince buraya eklenir'
      else 'Grubu oluşturdun · Onaylanan oyuncular buraya eklenir' end);
  else
    update public.conversations set event_id = new.id where id = v_conv;   -- grup en güncel maçı gösterir
  end if;
  update public.users set events_organized = events_organized + 1 where id = new.organizer_id;
  -- kayıtlı saha defteri
  if new.venue_name <> '' then
    insert into public.saved_venues (user_id, name, district_id, price)
    values (new.organizer_id, new.venue_name, new.district_id, new.price_per_person)
    on conflict (user_id, name) do update set used_count = public.saved_venues.used_count + 1, price = excluded.price;
  end if;
  -- seri misafirleri bu maça taşınır
  insert into public.guest_records (event_id, guest_id)
  select new.id, g.id from public.guests g where g.series_id = new.series_id and new.series_id is not null
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists event_after_insert on public.events;
create trigger event_after_insert after insert on public.events
  for each row execute function public.trg_event_after_insert();

-- ---------------------------------------------------------------------------
-- 4) Başvuru akışı: doğrulama → sohbet → çift onay → kadro
-- ---------------------------------------------------------------------------
create or replace function public.trg_application_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = new.event_id;
  if e is null then perform public.hata('bulunamadi'); end if;
  if not public.aktif_mi(new.applicant_id) then perform public.hata('kapali_hesap'); end if;
  if e.organizer_id = new.applicant_id then perform public.hata('kendi_ilanin'); end if;
  if public.engel_var(e.organizer_id, new.applicant_id) then perform public.hata('engellendi'); end if;
  if e.status not in ('acik','doldu') or e.event_date < now() then perform public.hata('kapali_ilan'); end if;
  if e.status = 'doldu' and not new.from_waitlist and new.invited_by is null then perform public.hata('kadro_dolu'); end if;
  if public.katilimci_mi(new.event_id, new.applicant_id) then perform public.hata('zaten_kadroda'); end if;
  if new.invited_by is null and (select count(*) from public.applications
        where applicant_id = new.applicant_id and created_at > now() - interval '1 day') >= 20 then
    perform public.hata('cok_hizli_basvuru');
  end if;
  return new;
end $$;
drop trigger if exists application_check on public.applications;
create trigger application_check before insert on public.applications
  for each row execute function public.trg_application_check();

create or replace function public.trg_application_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record; v_conv bigint; v_name text;
begin
  select * into e from public.events where id = new.event_id;
  select full_name into v_name from public.users where id = new.applicant_id;
  -- başvuru sohbeti (birebir, etkinliğe bağlı)
  insert into public.conversations (type, event_id, created_by)
  values ('birebir', new.event_id, new.applicant_id) returning id into v_conv;
  insert into public.conversation_members (conversation_id, user_id)
  values (v_conv, new.applicant_id), (v_conv, e.organizer_id);
  update public.applications set conversation_id = v_conv where id = new.id;
  if new.invited_by is not null then
    insert into public.messages (conversation_id, sender_id, type, content) values (v_conv, null, 'sistem',
      (select full_name from public.users where id = e.organizer_id) || ' seni "' || e.title || '" kadrosuna davet etti. Kabul edersen yerin kesinleşir.');
    insert into public.notifications (user_id, type, title, body, data)
    values (new.applicant_id, 'davet', 'Kadroya davet edildin',
            e.title || case when new.position is not null then ' · ' || new.position else '' end,
            jsonb_build_object('eventId', e.id, 'chatId', v_conv));
  else
    insert into public.messages (conversation_id, sender_id, type, content) values (v_conv, null, 'sistem',
      v_name || ', "' || e.title || '" için başvurdu.' ||
      case when coalesce(new.message,'') <> '' then ' Not: "' || new.message || '"' else '' end);
    insert into public.notifications (user_id, type, title, body, data)
    values (e.organizer_id, 'basvuru', 'Yeni başvuru',
            v_name || ', ' || e.title || ' için başvurdu' ||
            case when coalesce(new.message,'') <> '' then ': "' || new.message || '"' else '' end,
            jsonb_build_object('eventId', e.id, 'chatId', v_conv));
  end if;
  return new;
end $$;
drop trigger if exists application_after_insert on public.applications;
create trigger application_after_insert after insert on public.applications
  for each row execute function public.trg_application_after_insert();

create or replace function public.trg_application_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = new.event_id;
  -- çift onay tamam → kadroya al
  if new.organizer_approved and new.applicant_approved and old.status = 'beklemede' and new.status = 'beklemede' then
    new.status := 'onaylandi';
  end if;
  if new.status = 'onaylandi' and old.status <> 'onaylandi' then
    if e.filled_count >= e.needed_count then perform public.hata('kadro_dolu'); end if;
    insert into public.participants (event_id, user_id, position)
    values (new.event_id, new.applicant_id, new.position) on conflict do nothing;
    insert into public.notifications (user_id, type, title, body, data)
    values (new.applicant_id, 'onay', 'Kadrodasın 🎉', e.title || ' · ' || to_char(e.event_date, 'DD.MM HH24:MI'),
            jsonb_build_object('eventId', e.id));
  elsif new.status = 'reddedildi' and old.status <> 'reddedildi' then
    insert into public.notifications (user_id, type, title, body, data)
    values (new.applicant_id, 'red', 'Başvurun sonuçlandı', e.title || ' için bu kez olmadı', jsonb_build_object('eventId', e.id));
  end if;
  return new;
end $$;
drop trigger if exists application_update on public.applications;
create trigger application_update before update on public.applications
  for each row execute function public.trg_application_update();

-- Kadroya katılınca: sayaç, grup üyeliği, sistem mesajı
create or replace function public.trg_participant_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record; v_conv bigint; v_name text;
begin
  select * into e from public.events where id = new.event_id;
  select full_name into v_name from public.users where id = new.user_id;
  update public.events set filled_count = filled_count + 1,
    status = case when filled_count + 1 >= needed_count and status = 'acik' then 'doldu' else status end
  where id = new.event_id;
  select id into v_conv from public.conversations
   where type = 'grup' and (event_id = new.event_id or (series_id is not null and series_id = e.series_id)) limit 1;
  if v_conv is not null then
    insert into public.conversation_members (conversation_id, user_id) values (v_conv, new.user_id) on conflict do nothing;
    insert into public.messages (conversation_id, sender_id, type, content)
    values (v_conv, null, 'sistem', v_name || ' kadroya eklendi 🎉');
  end if;
  return new;
end $$;
drop trigger if exists participant_after_insert on public.participants;
create trigger participant_after_insert after insert on public.participants
  for each row execute function public.trg_participant_after_insert();

create or replace function public.trg_participant_after_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.events set filled_count = greatest(filled_count - 1, 0),
    status = case when status = 'doldu' then 'acik' else status end
  where id = old.event_id and status in ('acik','doldu');
  delete from public.conversation_members cm using public.conversations c, public.events e
   where e.id = old.event_id and c.id = cm.conversation_id and cm.user_id = old.user_id
     and c.type = 'grup' and (c.event_id = old.event_id or (c.series_id is not null and c.series_id = e.series_id));
  return old;
end $$;
drop trigger if exists participant_after_delete on public.participants;
create trigger participant_after_delete after delete on public.participants
  for each row execute function public.trg_participant_after_delete();

-- Yoklama değişince güvenilirlik sayaçları yeniden hesaplanır
create or replace function public.trg_participant_attendance() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.attendance is distinct from old.attendance then
    update public.users u set
      events_joined  = s.j, no_show_count = s.n,
      reliability_pct = case when s.j + s.n > 0 then round(s.j * 100.0 / (s.j + s.n), 2) end
    from (select count(*) filter (where attendance = 'katildi') j,
                 count(*) filter (where attendance = 'gelmedi') n
            from public.participants where user_id = new.user_id) s
    where u.id = new.user_id;
  end if;
  return new;
end $$;
drop trigger if exists participant_attendance on public.participants;
create trigger participant_attendance after update on public.participants
  for each row execute function public.trg_participant_attendance();

-- ---------------------------------------------------------------------------
-- 5) Mesaj güvenliği: üyelik, engel, sessiz kapsam, hız sınırı (20/dk)
-- ---------------------------------------------------------------------------
create or replace function public.trg_message_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare c record; v_other uuid;
begin
  if new.sender_id is null then return new; end if;               -- sistem mesajı yalnız definer fonksiyonlardan
  select * into c from public.conversations where id = new.conversation_id;
  if not public.uyesi_mi(new.conversation_id, new.sender_id) then perform public.hata('yetki_yok'); end if;
  if not public.aktif_mi(new.sender_id) then perform public.hata('kapali_hesap'); end if;
  if c.type = 'birebir' then
    select user_id into v_other from public.conversation_members
     where conversation_id = c.id and user_id <> new.sender_id limit 1;
    if v_other is not null and public.engel_var(new.sender_id, v_other) then perform public.hata('engellendi'); end if;
  end if;
  if (select count(*) from public.messages
       where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 20 then
    perform public.hata('cok_hizli');
  end if;
  return new;
end $$;
drop trigger if exists message_check on public.messages;
create trigger message_check before insert on public.messages
  for each row execute function public.trg_message_check();

-- Şikayet: aynı kişiye günde 1, toplam günde 10 (şikayet bombardımanına karşı)
create or replace function public.trg_report_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.reports where reporter_id = new.reporter_id
              and reported_user_id = new.reported_user_id and created_at > now() - interval '1 day') then
    perform public.hata('zaten_sikayet');
  end if;
  if (select count(*) from public.reports
       where reporter_id = new.reporter_id and created_at > now() - interval '1 day') >= 10 then
    perform public.hata('cok_hizli');
  end if;
  return new;
end $$;
drop trigger if exists report_check on public.reports;
create trigger report_check before insert on public.reports
  for each row execute function public.trg_report_check();

-- Arama kaydı: günde 30
create or replace function public.trg_call_check() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.engel_var(new.caller_id, new.callee_id) then perform public.hata('engellendi'); end if;
  if (select count(*) from public.calls
       where caller_id = new.caller_id and created_at > now() - interval '1 day') >= 30 then
    perform public.hata('cok_hizli');
  end if;
  return new;
end $$;
drop trigger if exists call_check on public.calls;
create trigger call_check before insert on public.calls
  for each row execute function public.trg_call_check();

-- Puan: yalnızca tamamlanmış maçta birlikte oynadığın kişiye; ortalama güncellenir
create or replace function public.trg_rating_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = new.event_id;
  if e is null or e.status <> 'tamamlandi' then perform public.hata('mac_tamamlanmadi'); end if;
  if not (public.katilimci_mi(new.event_id, new.rater_id) or e.organizer_id = new.rater_id) then perform public.hata('yetki_yok'); end if;
  if not (public.katilimci_mi(new.event_id, new.rated_id) or e.organizer_id = new.rated_id) then perform public.hata('yetki_yok'); end if;
  return new;
end $$;
drop trigger if exists rating_check on public.ratings;
create trigger rating_check before insert on public.ratings
  for each row execute function public.trg_rating_check();

create or replace function public.trg_rating_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.users u set rating_avg = s.avg, rating_count = s.cnt
  from (select round(avg(score)::numeric, 2) as avg, count(*) as cnt
          from public.ratings where rated_id = new.rated_id) s
  where u.id = new.rated_id;
  return new;
end $$;
drop trigger if exists rating_after on public.ratings;
create trigger rating_after after insert on public.ratings
  for each row execute function public.trg_rating_after();

-- MVP oyu: tamamlanan maçta, katılan katılana
create or replace function public.trg_mvp_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = new.event_id;
  if e is null or e.status <> 'tamamlandi' then perform public.hata('mac_tamamlanmadi'); end if;
  if e.mvp_finalized_at is not null then perform public.hata('oylama_kapandi'); end if;
  if not (public.katilimci_mi(new.event_id, new.voter_id) or e.organizer_id = new.voter_id) then perform public.hata('yetki_yok'); end if;
  return new;
end $$;
drop trigger if exists mvp_check on public.mvp_votes;
create trigger mvp_check before insert on public.mvp_votes
  for each row execute function public.trg_mvp_check();

-- Yedek listesi: yalnızca dolu ve gelecekteki maçlar
create or replace function public.trg_waitlist_check() returns trigger
language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = new.event_id;
  if e is null or e.status <> 'doldu' or e.event_date < now() then perform public.hata('yedek_kapali'); end if;
  if public.engel_var(e.organizer_id, new.user_id) then perform public.hata('engellendi'); end if;
  return new;
end $$;
drop trigger if exists waitlist_check on public.waitlist;
create trigger waitlist_check before insert on public.waitlist
  for each row execute function public.trg_waitlist_check();

-- Misafir: etkinliğe bağlıysa kaydı otomatik açılır
create or replace function public.trg_guest_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.event_id is not null then
    insert into public.guest_records (event_id, guest_id) values (new.event_id, new.id) on conflict do nothing;
  elsif new.series_id is not null then
    insert into public.guest_records (event_id, guest_id)
    select e.id, new.id from public.events e
     where e.series_id = new.series_id and e.status in ('acik','doldu') on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists guest_after_insert on public.guests;
create trigger guest_after_insert after insert on public.guests
  for each row execute function public.trg_guest_after_insert();

-- ---------------------------------------------------------------------------
-- 6) Görünümler (security_invoker: RLS görünümden delinmez)
-- ---------------------------------------------------------------------------
drop view if exists public.v_event_position_fill;
create view public.v_event_position_fill with (security_invoker = true) as
  select event_id, position, count(*)::int as filled
    from public.participants where position is not null group by event_id, position;

drop view if exists public.v_event_waitlist_count;
create view public.v_event_waitlist_count with (security_invoker = true) as
  select event_id, count(*)::int as waiting from public.waitlist group by event_id;

drop view if exists public.v_event_payments;
create view public.v_event_payments with (security_invoker = true) as
  select p.event_id, p.user_id, u.full_name, u.avatar_url,
         e.price_per_person as amount, p.payment_status as status
    from public.participants p
    join public.events e on e.id = p.event_id
    join public.users u on u.id = p.user_id
   where e.price_per_person > 0
     and (public.katilimci_mi(p.event_id, auth.uid()) or public.organizatoru_mu(p.event_id, auth.uid()));

drop view if exists public.v_event_mvp;
create view public.v_event_mvp with (security_invoker = true) as
  select event_id, voted_id, u.full_name, count(*)::int as votes,
         rank() over (partition by event_id order by count(*) desc)::int as rnk
    from public.mvp_votes v join public.users u on u.id = v.voted_id
   group by event_id, voted_id, u.full_name;

drop view if exists public.v_event_guests;
create view public.v_event_guests with (security_invoker = true) as
  select gr.event_id, g.id as guest_id, g.name, gr.available, gr.attendance,
         gr.payment_status, coalesce(e.price_per_person, 0) as amount
    from public.guest_records gr
    join public.guests g on g.id = gr.guest_id
    join public.events e on e.id = gr.event_id;

drop view if exists public.v_event_availability;
create view public.v_event_availability with (security_invoker = true) as
  select e.id as event_id, e.availability_asked_at, e.availability_poll_id as poll_id,
         coalesce(v.varim, 0)::int as varim, coalesce(v.yokum, 0)::int as yokum,
         coalesce(v.belirsiz, 0)::int as belirsiz,
         greatest(coalesce(m.uye, 0) - coalesce(v.toplam, 0), 0)::int as cevapsiz,
         greatest(e.total_capacity - e.offline_regulars - 1 - coalesce(v.varim, 0), e.filled_count, 0)::int as suggested
    from public.events e
    left join lateral (
      select count(*) filter (where option_id = 'varim')    as varim,
             count(*) filter (where option_id = 'yokum')    as yokum,
             count(*) filter (where option_id = 'belirsiz') as belirsiz,
             count(distinct user_id)                         as toplam
        from public.poll_votes where poll_id = e.availability_poll_id
    ) v on true
    left join lateral (
      select count(*)::int as uye from public.conversation_members cm
        join public.conversations c on c.id = cm.conversation_id
       where c.type = 'grup' and (c.event_id = e.id or (c.series_id is not null and c.series_id = e.series_id))
         and cm.role <> 'yonetici'
    ) m on true
   where e.series_id is not null;

-- ---------------------------------------------------------------------------
-- 7) RPC fonksiyonları (istemcinin çağırdığı 23 işlem)
--    Hepsi security definer: yetki denetimi içeride, RLS'ten bağımsız çift kilit.
-- ---------------------------------------------------------------------------
create or replace function public.invite_user(p_event uuid, p_user uuid, p_position text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.organizatoru_mu(p_event, auth.uid()) then perform public.hata('yetki_yok'); end if;
  if public.engel_var(auth.uid(), p_user) then perform public.hata('engellendi'); end if;
  insert into public.applications (event_id, applicant_id, position, invited_by, organizer_approved, applicant_approved)
  values (p_event, p_user, p_position, auth.uid(), true, false)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.create_poll(p_conversation bigint, p_question text, p_options jsonb, p_multiple boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.uyesi_mi(p_conversation, auth.uid()) then perform public.hata('yetki_yok'); end if;
  if jsonb_array_length(p_options) not between 2 and 6 then perform public.hata('gecersiz'); end if;
  insert into public.polls (conversation_id, question, options, multiple, created_by)
  values (p_conversation, left(p_question, 200), p_options, p_multiple, auth.uid()) returning id into v_id;
  insert into public.messages (conversation_id, sender_id, type, content, poll_id)
  values (p_conversation, auth.uid(), 'metin', '📊 ' || left(p_question, 200), v_id);
  return v_id;
end $$;

create or replace function public.ask_availability(p_event uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare e record; v_conv bigint; v_poll uuid;
begin
  select * into e from public.events where id = p_event;
  if e is null or e.organizer_id <> auth.uid() then perform public.hata('yetki_yok'); end if;
  select id into v_conv from public.conversations
   where type = 'grup' and (event_id = p_event or (series_id is not null and series_id = e.series_id)) limit 1;
  if v_conv is null then perform public.hata('grup_yok'); end if;
  insert into public.polls (conversation_id, event_id, kind, question, options, multiple, created_by)
  values (v_conv, p_event, 'varmisin', 'Bu hafta var mısın? · ' || to_char(e.event_date, 'DD.MM HH24:MI'),
          '[{"id":"varim","text":"Varım ✅"},{"id":"yokum","text":"Yokum ❌"},{"id":"belirsiz","text":"Belli değil 🤔"}]'::jsonb,
          false, auth.uid()) returning id into v_poll;
  insert into public.messages (conversation_id, sender_id, type, content, poll_id)
  values (v_conv, auth.uid(), 'metin', '📊 Bu hafta var mısın? · ' || to_char(e.event_date, 'DD.MM HH24:MI'), v_poll);
  update public.events set availability_asked_at = now(), availability_poll_id = v_poll where id = p_event;
  return v_poll;
end $$;

create or replace function public.apply_suggested_needed(p_event uuid)
returns int language plpgsql security definer set search_path = public as $$
declare v int;
begin
  if not public.organizatoru_mu(p_event, auth.uid()) then perform public.hata('yetki_yok'); end if;
  select suggested into v from public.v_event_availability where event_id = p_event;
  if v is null then perform public.hata('grup_yok'); end if;
  update public.events set needed_count = v,
    status = case when filled_count >= v then 'doldu' else 'acik' end
  where id = p_event and status in ('acik','doldu');
  insert into public.notifications (user_id, type, title, body, data)
  select p.user_id, 'kadro', 'Eksik güncellendi', 'Eksik ' || v || ' olarak güncellendi', jsonb_build_object('eventId', p_event)
    from public.participants p where p.event_id = p_event;
  return v;
end $$;

create or replace function public.record_score(p_event uuid, p_home int, p_away int, p_label text default null)
returns void language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = p_event;
  if e is null or e.organizer_id <> auth.uid() then perform public.hata('yetki_yok'); end if;
  if p_home not between 0 and 99 or p_away not between 0 and 99 then perform public.hata('gecersiz'); end if;
  update public.events set score_home = p_home, score_away = p_away,
    score_label = coalesce(p_label, case when kind = 'rakip' then coalesce(team_name,'Biz') || ' – Rakip' else 'Yelekliler – Yeleksizler' end)
  where id = p_event;
end $$;

create or replace function public.complete_event(p_event uuid)
returns table (attended int, noshow int) language plpgsql security definer set search_path = public as $$
declare e record; v_next uuid; v_next_date timestamptz;
begin
  select * into e from public.events where id = p_event;
  if e is null or e.organizer_id <> auth.uid() then perform public.hata('yetki_yok'); end if;
  if e.event_date > now() then perform public.hata('mac_oynanmadi'); end if;
  update public.participants set attendance = 'katildi'
   where event_id = p_event and attendance = 'bekleniyor';                      -- işaretlenmeyen katıldı sayılır
  update public.events set status = 'tamamlandi', completed_at = now() where id = p_event;
  -- puanlama daveti
  insert into public.notifications (user_id, type, title, body, data)
  select p.user_id, 'puanlama', e.title || ' tamamlandı', 'Takım arkadaşlarını puanla', jsonb_build_object('rate', true, 'eventId', p_event)
    from public.participants p where p.event_id = p_event;
  -- haftalık seri: gelecek hafta otomatik açılır
  if e.recurrence = 'haftalik' then
    v_next_date := e.event_date + interval '7 days';
    if e.recurrence_until is null or v_next_date::date <= e.recurrence_until then
      insert into public.events (organizer_id, category_id, city_id, district_id, title, description, venue_name,
        event_date, total_capacity, needed_count, price_per_person, skill_level, recurrence, recurrence_until,
        series_id, needed_positions, kind, team_name, format, offline_regulars)
      values (e.organizer_id, e.category_id, e.city_id, e.district_id, e.title, e.description, e.venue_name,
        v_next_date, e.total_capacity, e.needed_count + e.filled_count, e.price_per_person, e.skill_level, 'haftalik',
        e.recurrence_until, e.series_id, e.needed_positions, e.kind, e.team_name, e.format, e.offline_regulars)
      returning id into v_next;
    end if;
  end if;
  return query
    select count(*) filter (where p.attendance = 'katildi')::int,
           count(*) filter (where p.attendance = 'gelmedi')::int
      from public.participants p where p.event_id = p_event;
end $$;

create or replace function public.cancel_event(p_event uuid, p_reason text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare e record; v_late boolean;
begin
  select * into e from public.events where id = p_event;
  if e is null or e.organizer_id <> auth.uid() then perform public.hata('yetki_yok'); end if;
  if e.status in ('tamamlandi','iptal') then perform public.hata('kapali_ilan'); end if;
  v_late := e.event_date - now() < interval '24 hours' and e.filled_count > 0;
  update public.events set status = 'iptal', cancelled_reason = left(p_reason, 200) where id = p_event;
  insert into public.notifications (user_id, type, title, body, data)
  select p.user_id, 'etkinlik_iptal', e.title || ' iptal edildi',
         coalesce(nullif(left(p_reason, 200), ''), 'Organizatör iptal etti'), jsonb_build_object('eventId', p_event)
    from public.participants p where p.event_id = p_event;
  if v_late then                                                                 -- geç iptal güvenilirliğe işler
    update public.users set no_show_count = no_show_count + 1,
      reliability_pct = case when events_joined + no_show_count + 1 > 0
        then round(events_joined * 100.0 / (events_joined + no_show_count + 1), 2) end
    where id = e.organizer_id;
  end if;
  return v_late;
end $$;

create or replace function public.leave_event(p_event uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare e record; v_late boolean;
begin
  select * into e from public.events where id = p_event;
  if e is null then perform public.hata('bulunamadi'); end if;
  if not public.katilimci_mi(p_event, auth.uid()) then perform public.hata('yetki_yok'); end if;
  if e.status in ('tamamlandi','iptal') then perform public.hata('kapali_ilan'); end if;
  v_late := e.event_date - now() < interval '24 hours';
  delete from public.participants where event_id = p_event and user_id = auth.uid();
  update public.applications set status = 'iptal' where event_id = p_event and applicant_id = auth.uid();
  if v_late then
    update public.users set no_show_count = no_show_count + 1,
      reliability_pct = case when events_joined + no_show_count + 1 > 0
        then round(events_joined * 100.0 / (events_joined + no_show_count + 1), 2) end
    where id = auth.uid();
  end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (e.organizer_id, 'kadro', 'Kadrodan ayrılan var',
          (select full_name from public.users where id = auth.uid()) || ' "' || e.title || '" kadrosundan ayrıldı · yer yeniden açıldı',
          jsonb_build_object('eventId', p_event));
  return v_late;
end $$;

create or replace function public.open_checkin_code(p_event uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v text;
begin
  if not public.organizatoru_mu(p_event, auth.uid()) then perform public.hata('yetki_yok'); end if;
  v := lpad(floor(random() * 10000)::int::text, 4, '0');
  update public.events set checkin_code = v, checkin_opened_at = now() where id = p_event;
  return v;
end $$;

create or replace function public.check_in(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = p_event;
  if e is null or not public.katilimci_mi(p_event, auth.uid()) then perform public.hata('yetki_yok'); end if;
  if abs(extract(epoch from (e.event_date - now()))) > 6 * 3600 then perform public.hata('erken'); end if;
  update public.participants set checked_in_at = now() where event_id = p_event and user_id = auth.uid();
end $$;

create or replace function public.check_in_with_code(p_event uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = p_event;
  if e is null or not public.katilimci_mi(p_event, auth.uid()) then perform public.hata('yetki_yok'); end if;
  if e.checkin_code is null or e.checkin_opened_at < now() - interval '6 hours' then perform public.hata('kod_kapali'); end if;
  if e.checkin_code <> p_code then perform public.hata('kod_hatali'); end if;
  update public.participants set checked_in_at = now() where event_id = p_event and user_id = auth.uid();
end $$;

create or replace function public.claim_payment(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = p_event;
  if e is null or not public.katilimci_mi(p_event, auth.uid()) then perform public.hata('yetki_yok'); end if;
  update public.participants set payment_status = 'odedim', payment_claimed_at = now()
   where event_id = p_event and user_id = auth.uid() and payment_status in ('bekliyor','odedim');
  insert into public.notifications (user_id, type, title, body, data)
  values (e.organizer_id, 'odeme', 'Ödeme bildirimi',
          (select full_name from public.users where id = auth.uid()) || ' "' || e.title || '" için ödedim dedi · onayla',
          jsonb_build_object('eventId', p_event));
end $$;

create or replace function public.confirm_payment(p_event uuid, p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.organizatoru_mu(p_event, auth.uid()) then perform public.hata('yetki_yok'); end if;
  if p_status not in ('bekliyor','odendi','muaf') then perform public.hata('gecersiz'); end if;
  update public.participants set payment_status = p_status where event_id = p_event and user_id = p_user;
end $$;

create or replace function public.send_iban(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e record; d record; v_conv bigint;
begin
  select * into e from public.events where id = p_event;
  if e is null or e.organizer_id <> auth.uid() then perform public.hata('yetki_yok'); end if;
  select * into d from public.payment_details where user_id = auth.uid();
  if d is null then perform public.hata('iban_yok'); end if;
  select id into v_conv from public.conversations
   where type = 'grup' and (event_id = p_event or (series_id is not null and series_id = e.series_id)) limit 1;
  if v_conv is null then perform public.hata('grup_yok'); end if;
  insert into public.messages (conversation_id, sender_id, type, content)
  values (v_conv, null, 'sistem', '💳 Saha ücreti ' || e.price_per_person::int || '₺ · IBAN: ' ||
          regexp_replace(d.iban, '(.{4})', '\1 ', 'g') || ' (' || coalesce(d.holder_name, '') || ')');
end $$;

create or replace function public.remind_payments(p_event uuid)
returns int language plpgsql security definer set search_path = public as $$
declare e record; n int;
begin
  select * into e from public.events where id = p_event;
  if e is null or e.organizer_id <> auth.uid() then perform public.hata('yetki_yok'); end if;
  if e.event_date > now() - interval '24 hours' then return 0; end if;        -- maçtan 24 saat sonra
  insert into public.notifications (user_id, type, title, body, data)
  select p.user_id, 'odeme', 'Ödeme hatırlatması', e.title || ' · ' || e.price_per_person::int || '₺ bekleniyor',
         jsonb_build_object('eventId', p_event)
    from public.participants p
   where p.event_id = p_event and p.payment_status = 'bekliyor'
     and not exists (select 1 from public.notifications x where x.user_id = p.user_id and x.type = 'odeme'
                      and x.data->>'eventId' = p_event::text and x.created_at > now() - interval '24 hours');
  get diagnostics n = row_count;
  return n;
end $$;

create or replace function public.payment_stats(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case when count(*) = 0 then null else jsonb_build_object(
    'paid',    count(*) filter (where p.payment_status in ('odendi','muaf')),
    'late',    count(*) filter (where p.payment_status = 'odendi' and p.payment_claimed_at > e.event_date + interval '3 days'),
    'overdue', count(*) filter (where p.payment_status in ('bekliyor','odedim') and e.event_date < now() - interval '7 days'),
    'pct',     round(count(*) filter (where p.payment_status in ('odendi','muaf')) * 100.0 / count(*))
  ) end
  from public.participants p join public.events e on e.id = p.event_id
  where p.user_id = p_user and e.status = 'tamamlandi' and e.price_per_person > 0
$$;

create or replace function public.player_totals(p_user uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'goals',   coalesce(sum(goals), 0), 'assists', coalesce(sum(assists), 0),
    'matches', (select count(*) from public.participants pp join public.events ee on ee.id = pp.event_id
                 where pp.user_id = p_user and pp.attendance = 'katildi' and ee.status = 'tamamlandi'))
  from public.match_stats where user_id = p_user
$$;

create or replace function public.season_table(p_series uuid)
returns table (player_id uuid, name text, is_guest boolean, matches bigint, goals bigint, assists bigint, mvps bigint)
language sql stable security definer set search_path = public as $$
  with done as (select id from public.events where series_id = p_series and status = 'tamamlandi')
  select coalesce(s.user_id, s.guest_id) as player_id,
         coalesce(u.full_name, g.name)   as name,
         s.user_id is null               as is_guest,
         count(distinct s.event_id)      as matches,
         sum(s.goals)                    as goals,
         sum(s.assists)                  as assists,
         (select count(*) from public.events e2 where e2.series_id = p_series and e2.mvp_user_id = s.user_id and e2.mvp_finalized_at is not null) as mvps
    from public.match_stats s
    left join public.users  u on u.id = s.user_id
    left join public.guests g on g.id = s.guest_id
   where s.event_id in (select id from done)
   group by 1, 2, 3, s.user_id
   order by goals desc nulls last, assists desc
$$;

create or replace function public.set_match_stat(p_event uuid, p_user uuid, p_guest uuid, p_goals int, p_assists int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.organizatoru_mu(p_event, auth.uid()) then perform public.hata('yetki_yok'); end if;
  if p_goals not between 0 and 99 or p_assists not between 0 and 99 then perform public.hata('gecersiz'); end if;
  if p_user is not null then
    insert into public.match_stats (event_id, user_id, goals, assists) values (p_event, p_user, p_goals, p_assists)
    on conflict (event_id, user_id) where user_id is not null
    do update set goals = excluded.goals, assists = excluded.assists;
  else
    insert into public.match_stats (event_id, guest_id, goals, assists) values (p_event, p_guest, p_goals, p_assists)
    on conflict (event_id, guest_id) where guest_id is not null
    do update set goals = excluded.goals, assists = excluded.assists;
  end if;
end $$;

create or replace function public.event_disputes(p_event uuid)
returns table (user_id uuid, full_name text, description text)
language sql stable security definer set search_path = public as $$
  select r.reporter_id, u.full_name, r.description
    from public.reports r join public.users u on u.id = r.reporter_id
   where r.event_id = p_event and r.reason = 'yoklama_itiraz'
     and exists (select 1 from public.events e where e.id = p_event and e.organizer_id = auth.uid())
$$;

create or replace function public.event_updated_notice(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
declare e record;
begin
  select * into e from public.events where id = p_event;
  if e is null or e.organizer_id <> auth.uid() then perform public.hata('yetki_yok'); end if;
  insert into public.notifications (user_id, type, title, body, data)
  select p.user_id, 'hatirlatma', 'Etkinlik güncellendi', e.title || ' · detayları kontrol et', jsonb_build_object('eventId', p_event)
    from public.participants p where p.event_id = p_event;
end $$;

create or replace function public.pin_message(p_conversation bigint, p_message bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.conversation_members
                  where conversation_id = p_conversation and user_id = auth.uid() and role = 'yonetici') then
    perform public.hata('yetki_yok');
  end if;
  update public.conversations set pinned_message_id = p_message where id = p_conversation;
end $$;

-- MVP kesinleştirme: maçtan 48 saat sonra en çok oyu alan (beraberlikte erken oy önde).
-- Supabase'te zamanlanmış görev (cron) ile günde bir çağırın; complete_event de fırsatçı çağırır.
create or replace function public.finalize_due_mvps()
returns int language plpgsql security definer set search_path = public as $$
declare n int := 0; r record;
begin
  for r in
    select e.id, w.voted_id from public.events e
    join lateral (select voted_id from public.mvp_votes v where v.event_id = e.id
                   group by voted_id order by count(*) desc, min(created_at) limit 1) w on true
    where e.status = 'tamamlandi' and e.mvp_finalized_at is null and e.event_date < now() - interval '48 hours'
  loop
    update public.events set mvp_user_id = r.voted_id, mvp_finalized_at = now() where id = r.id;
    update public.users set mvp_count = mvp_count + 1 where id = r.voted_id;
    insert into public.notifications (user_id, type, title, body, data)
    values (r.voted_id, 'mvp', 'MVP seçildin 🏆', 'Takım arkadaşların seni maçın oyuncusu seçti', jsonb_build_object('eventId', r.id));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = public as $$
declare v uuid := auth.uid();
begin
  update public.events set status = 'iptal', cancelled_reason = 'Organizatör hesabını kapattı'
   where organizer_id = v and status in ('acik','doldu') and event_date > now();
  delete from public.participants where user_id = v
    and event_id in (select id from public.events where event_date > now());
  delete from public.payment_details where user_id = v;
  delete from public.waitlist where user_id = v;
  update public.users set status = 'kapali', full_name = 'Ayrılan üye', bio = null, avatar_url = null,
    push_token = null, team_name = null, positions = '[]'::jsonb,
    username = 'ayrilan_' || left(replace(v::text, '-', ''), 8)
  where id = v;
end $$;

-- ---------------------------------------------------------------------------
-- 8) RLS: her tabloda açık; politikalar aşağıda
-- ---------------------------------------------------------------------------
alter table public.cities               enable row level security;
alter table public.districts            enable row level security;
alter table public.users                enable row level security;
alter table public.events               enable row level security;
alter table public.participants         enable row level security;
alter table public.conversations        enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages             enable row level security;
alter table public.polls                enable row level security;
alter table public.poll_votes           enable row level security;
alter table public.notifications        enable row level security;
alter table public.blocks               enable row level security;
alter table public.reports              enable row level security;
alter table public.applications         enable row level security;
alter table public.ratings              enable row level security;
alter table public.waitlist             enable row level security;
alter table public.mvp_votes            enable row level security;
alter table public.guests               enable row level security;
alter table public.guest_records        enable row level security;
alter table public.match_stats          enable row level security;
alter table public.payment_details      enable row level security;
alter table public.saved_venues         enable row level security;
alter table public.calls                enable row level security;

-- iller/ilçeler: kayıt ekranı girişten önce okur → anon dahil herkese açık
drop policy if exists p_cities_read on public.cities;
create policy p_cities_read on public.cities for select using (true);
drop policy if exists p_districts_read on public.districts;
create policy p_districts_read on public.districts for select using (true);

-- kullanıcılar: profiller uygulama içinde görünür; yalnızca kendi satırını güncelleyebilirsin
drop policy if exists p_users_read on public.users;
create policy p_users_read on public.users for select to authenticated using (true);
drop policy if exists p_users_update on public.users;
create policy p_users_update on public.users for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- etkinlikler
drop policy if exists p_events_read on public.events;
create policy p_events_read on public.events for select to authenticated using (true);
drop policy if exists p_events_insert on public.events;
create policy p_events_insert on public.events for insert to authenticated
  with check (organizer_id = auth.uid());
drop policy if exists p_events_update on public.events;
create policy p_events_update on public.events for update to authenticated
  using (organizer_id = auth.uid() and status in ('acik','doldu'))
  with check (organizer_id = auth.uid());

-- kadro
drop policy if exists p_part_read on public.participants;
create policy p_part_read on public.participants for select to authenticated using (true);
drop policy if exists p_part_update on public.participants;
create policy p_part_update on public.participants for update to authenticated
  using (public.organizatoru_mu(event_id, auth.uid()));
drop policy if exists p_part_delete on public.participants;
create policy p_part_delete on public.participants for delete to authenticated
  using (public.organizatoru_mu(event_id, auth.uid()));

-- sohbetler: yalnızca üyeler
drop policy if exists p_conv_read on public.conversations;
create policy p_conv_read on public.conversations for select to authenticated
  using (public.uyesi_mi(id, auth.uid()) or created_by = auth.uid());   -- kuran, üyelik yazılana dek de görebilmeli (insert…returning)
drop policy if exists p_conv_insert on public.conversations;
create policy p_conv_insert on public.conversations for insert to authenticated
  with check (created_by = auth.uid() and type = 'birebir' and event_id is null);

drop policy if exists p_cm_read on public.conversation_members;
create policy p_cm_read on public.conversation_members for select to authenticated
  using (public.uyesi_mi(conversation_id, auth.uid()));
drop policy if exists p_cm_insert on public.conversation_members;
create policy p_cm_insert on public.conversation_members for insert to authenticated
  with check (exists (select 1 from public.conversations c
                       where c.id = conversation_id and c.type = 'birebir'
                         and c.created_by = auth.uid()
                         and not public.engel_var(auth.uid(), user_id)));
drop policy if exists p_cm_update on public.conversation_members;
create policy p_cm_update on public.conversation_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists p_cm_delete on public.conversation_members;
create policy p_cm_delete on public.conversation_members for delete to authenticated
  using (exists (select 1 from public.conversations c join public.events e on e.id = c.event_id
                  where c.id = conversation_id and e.organizer_id = auth.uid()));

-- mesajlar: yalnızca üyeler okur; gönderen kimliği sahte olamaz
drop policy if exists p_msg_read on public.messages;
create policy p_msg_read on public.messages for select to authenticated
  using (public.uyesi_mi(conversation_id, auth.uid()));
drop policy if exists p_msg_insert on public.messages;
create policy p_msg_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and type in ('metin','resim'));

-- anketler ve oylar
drop policy if exists p_poll_read on public.polls;
create policy p_poll_read on public.polls for select to authenticated
  using (public.uyesi_mi(conversation_id, auth.uid()));
drop policy if exists p_poll_close on public.polls;
create policy p_poll_close on public.polls for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
drop policy if exists p_pv_read on public.poll_votes;
create policy p_pv_read on public.poll_votes for select to authenticated
  using (exists (select 1 from public.polls p where p.id = poll_id and public.uyesi_mi(p.conversation_id, auth.uid())));
drop policy if exists p_pv_insert on public.poll_votes;
create policy p_pv_insert on public.poll_votes for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.polls p where p.id = poll_id
                 and p.closed_at is null and public.uyesi_mi(p.conversation_id, auth.uid())));
drop policy if exists p_pv_delete on public.poll_votes;
create policy p_pv_delete on public.poll_votes for delete to authenticated using (user_id = auth.uid());

-- bildirimler: yalnızca sahibinin
drop policy if exists p_notif_read on public.notifications;
create policy p_notif_read on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists p_notif_update on public.notifications;
create policy p_notif_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- engel, şikayet
drop policy if exists p_blocks_all on public.blocks;
create policy p_blocks_all on public.blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());
drop policy if exists p_reports_insert on public.reports;
create policy p_reports_insert on public.reports for insert to authenticated
  with check (reporter_id = auth.uid());                     -- okuma yok: şikayetler yalnızca yönetim panelinde

-- başvurular: taraflar görür; davet yalnızca RPC ile
drop policy if exists p_app_read on public.applications;
create policy p_app_read on public.applications for select to authenticated
  using (applicant_id = auth.uid() or public.organizatoru_mu(event_id, auth.uid()));
drop policy if exists p_app_insert on public.applications;
create policy p_app_insert on public.applications for insert to authenticated
  with check (applicant_id = auth.uid() and invited_by is null);
drop policy if exists p_app_update on public.applications;
create policy p_app_update on public.applications for update to authenticated
  using (applicant_id = auth.uid() or public.organizatoru_mu(event_id, auth.uid()));

-- puanlar: herkes okur (profil yorumları), yalnız kendi adına yazar
drop policy if exists p_ratings_read on public.ratings;
create policy p_ratings_read on public.ratings for select to authenticated using (true);
drop policy if exists p_ratings_insert on public.ratings;
create policy p_ratings_insert on public.ratings for insert to authenticated
  with check (rater_id = auth.uid());

-- yedek listesi
drop policy if exists p_wait_read on public.waitlist;
create policy p_wait_read on public.waitlist for select to authenticated using (true);
drop policy if exists p_wait_insert on public.waitlist;
create policy p_wait_insert on public.waitlist for insert to authenticated with check (user_id = auth.uid());
drop policy if exists p_wait_delete on public.waitlist;
create policy p_wait_delete on public.waitlist for delete to authenticated
  using (user_id = auth.uid() or public.organizatoru_mu(event_id, auth.uid()));

-- MVP oyları: kadro içi görünür, kendi adına oy
drop policy if exists p_mvp_read on public.mvp_votes;
create policy p_mvp_read on public.mvp_votes for select to authenticated
  using (voter_id = auth.uid() or public.katilimci_mi(event_id, auth.uid()) or public.organizatoru_mu(event_id, auth.uid()));
drop policy if exists p_mvp_insert on public.mvp_votes;
create policy p_mvp_insert on public.mvp_votes for insert to authenticated with check (voter_id = auth.uid());

-- misafirler: sahibi + o maçın kadrosu
drop policy if exists p_guests_read on public.guests;
create policy p_guests_read on public.guests for select to authenticated
  using (owner_id = auth.uid() or exists (
    select 1 from public.guest_records gr where gr.guest_id = id
      and (public.katilimci_mi(gr.event_id, auth.uid()) or public.organizatoru_mu(gr.event_id, auth.uid()))));
drop policy if exists p_guests_write on public.guests;
create policy p_guests_write on public.guests for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists p_guests_delete on public.guests;
create policy p_guests_delete on public.guests for delete to authenticated using (owner_id = auth.uid());
drop policy if exists p_gr_read on public.guest_records;
create policy p_gr_read on public.guest_records for select to authenticated
  using (public.katilimci_mi(event_id, auth.uid()) or public.organizatoru_mu(event_id, auth.uid())
         or exists (select 1 from public.guests g where g.id = guest_id and g.owner_id = auth.uid()));
drop policy if exists p_gr_update on public.guest_records;
create policy p_gr_update on public.guest_records for update to authenticated
  using (public.organizatoru_mu(event_id, auth.uid())
         or exists (select 1 from public.guests g where g.id = guest_id and g.owner_id = auth.uid()));

-- gol/asist: kadro okur, yazma yalnız RPC
drop policy if exists p_stats_read on public.match_stats;
create policy p_stats_read on public.match_stats for select to authenticated
  using (public.katilimci_mi(event_id, auth.uid()) or public.organizatoru_mu(event_id, auth.uid()));

-- IBAN: yalnızca sahibi (kadroya sistem mesajıyla RPC üzerinden gider)
drop policy if exists p_pay_all on public.payment_details;
create policy p_pay_all on public.payment_details for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_venues_all on public.saved_venues;
create policy p_venues_all on public.saved_venues for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists p_calls_read on public.calls;
create policy p_calls_read on public.calls for select to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid());
drop policy if exists p_calls_insert on public.calls;
create policy p_calls_insert on public.calls for insert to authenticated with check (caller_id = auth.uid());
drop policy if exists p_calls_update on public.calls;
create policy p_calls_update on public.calls for update to authenticated
  using (caller_id = auth.uid() or callee_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 9) İzinler: hassas sütunlar gizli, sayaç sütunları istemciden yazılamaz
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.cities, public.districts to anon, authenticated;
grant select, insert, update, delete on
  public.events, public.participants, public.conversations, public.conversation_members,
  public.messages, public.polls, public.poll_votes, public.notifications, public.blocks,
  public.reports, public.applications, public.ratings, public.waitlist, public.mvp_votes,
  public.guests, public.guest_records, public.match_stats, public.payment_details,
  public.saved_venues, public.calls
to authenticated;
grant select on public.v_event_position_fill, public.v_event_waitlist_count, public.v_event_payments,
  public.v_event_mvp, public.v_event_guests, public.v_event_availability to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- users: push_token dışarıya kapalı; puan/sayaç/durum sütunları istemciden değiştirilemez
revoke all on public.users from anon, authenticated;
grant select (id, full_name, username, bio, skill_level, avatar_url, positions, fav_cat, fav_cats, cat_levels, team_name,
  city_id, district_id, rating_avg, rating_count, reliability_pct, events_joined, events_organized,
  no_show_count, mvp_count, is_verified, status, status_reason, suspended_until,
  contact_mode, contact_scope, quiet_enabled, quiet_start, quiet_end,
  notif_basvuru, notif_mesaj, notif_hatirlatma, notif_yakin, created_at) on public.users to authenticated;
grant update (full_name, username, bio, skill_level, avatar_url, positions, fav_cat, fav_cats, cat_levels, team_name,
  city_id, district_id, contact_mode, contact_scope, quiet_enabled, quiet_start, quiet_end,
  notif_basvuru, notif_mesaj, notif_hatirlatma, notif_yakin, push_token) on public.users to authenticated;

-- events: durum/sayaç/skor sütunları yalnızca tetikleyici ve RPC ile değişir
revoke insert, update on public.events from authenticated;
grant insert (organizer_id, category_id, city_id, district_id, title, description, venue_name,
  event_date, total_capacity, needed_count, price_per_person, skill_level, recurrence,
  recurrence_until, needed_positions, kind, team_name, format, venue_mode, cost_mode,
  offline_regulars, venue_lat, venue_lng) on public.events to authenticated;
grant update (category_id, city_id, district_id, title, description, venue_name, event_date,
  total_capacity, needed_count, price_per_person, skill_level, needed_positions, team_name,
  format, venue_mode, cost_mode, offline_regulars, recurrence_until, venue_lat, venue_lng) on public.events to authenticated;

-- participants: istemci yalnız yoklama işaretler (organizatör, RLS ile)
revoke insert, update on public.participants from authenticated;
grant update (attendance) on public.participants to authenticated;

-- applications: taraflar yalnız onay/karar alanlarını değiştirir
revoke insert, update on public.applications from authenticated;
grant insert (event_id, applicant_id, message, position) on public.applications to authenticated;
grant update (status, organizer_approved, applicant_approved, position, offer_expires_at) on public.applications to authenticated;

-- polls: istemci yalnız kapatır
revoke insert, update on public.polls from authenticated;
grant update (closed_at) on public.polls to authenticated;

-- notifications: istemci yalnız okundu işaretler
revoke insert, update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

-- match_stats yazma yalnız RPC
revoke insert, update, delete on public.match_stats from authenticated;

-- calls: istemci yalnız durum kapatır
revoke update on public.calls from authenticated;
grant update (status, answered_at, ended_at) on public.calls to authenticated;

-- ---------------------------------------------------------------------------
-- 10) Başvuru güncellemesinde taraf denetimi (karşı tarafın onayı taklit edilemez)
-- ---------------------------------------------------------------------------
create or replace function public.trg_application_party_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;              -- definer RPC'leri serbest
  if auth.uid() = new.applicant_id and new.organizer_approved and not old.organizer_approved then
    perform public.hata('yetki_yok');
  end if;
  if auth.uid() <> new.applicant_id and new.applicant_approved and not old.applicant_approved then
    perform public.hata('yetki_yok');
  end if;
  return new;
end $$;
drop trigger if exists application_party_guard on public.applications;
create trigger application_party_guard before update on public.applications
  for each row execute function public.trg_application_party_guard();

-- ---------------------------------------------------------------------------
-- 10b) Sohbet+: mesaja yanıt ve emoji tepkileri
-- ---------------------------------------------------------------------------
alter table public.messages add column if not exists reply_to_id bigint references public.messages(id) on delete set null;

create table if not exists public.message_reactions (
  message_id bigint not null references public.messages(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  emoji      text not null check (emoji in ('👍','❤️','😂','😮','⚽','🔥')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)                        -- kullanıcı başına tek tepki
);
alter table public.message_reactions enable row level security;

drop policy if exists p_react_read on public.message_reactions;
create policy p_react_read on public.message_reactions for select to authenticated
  using (exists (select 1 from public.messages m
                  where m.id = message_id and public.uyesi_mi(m.conversation_id, auth.uid())));
drop policy if exists p_react_write on public.message_reactions;
create policy p_react_write on public.message_reactions for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.messages m
                 where m.id = message_id and public.uyesi_mi(m.conversation_id, auth.uid())));
drop policy if exists p_react_update on public.message_reactions;
create policy p_react_update on public.message_reactions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists p_react_delete on public.message_reactions;
create policy p_react_delete on public.message_reactions for delete to authenticated
  using (user_id = auth.uid());
grant select, insert, update, delete on public.message_reactions to authenticated;

-- ---------------------------------------------------------------------------
-- 10e2) Takımlar, üyelik, teklifler, kulüp ilanları
-- ---------------------------------------------------------------------------
create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.users(id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 40),
  emblem      text not null default '🛡',
  city_id     int references public.cities(id),
  category_id int not null default 1 check (category_id between 1 and 4),
  misafirler  text[] not null default '{}',
  created_at  timestamptz not null default now(),
  unique (owner_id, category_id)
);
alter table public.teams add column if not exists misafirler text[] not null default '{}';
alter table public.teams enable row level security;
drop policy if exists p_teams_read on public.teams;
create policy p_teams_read on public.teams for select to authenticated using (true);
drop policy if exists p_teams_ins on public.teams;
create policy p_teams_ins on public.teams for insert to authenticated with check (owner_id = auth.uid());
drop policy if exists p_teams_upd on public.teams;
create policy p_teams_upd on public.teams for update to authenticated using (owner_id = auth.uid());
grant select, insert, update on public.teams to authenticated;

create table if not exists public.team_members (
  team_id   uuid not null references public.teams(id) on delete cascade,
  user_id   uuid not null references public.users(id) on delete cascade,
  role      text not null default 'oyuncu' check (role in ('kaptan','oyuncu')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
alter table public.team_members enable row level security;
drop policy if exists p_tm_read on public.team_members;
create policy p_tm_read on public.team_members for select to authenticated using (true);
drop policy if exists p_tm_del on public.team_members;
create policy p_tm_del on public.team_members for delete to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()));
grant select, delete on public.team_members to authenticated;

create or replace function public.takim_kaptani_ekle() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.team_members (team_id, user_id, role) values (new.id, new.owner_id, 'kaptan')
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists trg_takim_kaptan on public.teams;
create trigger trg_takim_kaptan after insert on public.teams
  for each row execute function public.takim_kaptani_ekle();

create table if not exists public.club_listings (
  team_id    uuid primary key references public.teams(id) on delete cascade,
  positions  text[] not null default '{}',
  bio        text check (char_length(bio) <= 200),
  active     boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.club_listings enable row level security;
drop policy if exists p_cl_read on public.club_listings;
create policy p_cl_read on public.club_listings for select to authenticated using (true);
drop policy if exists p_cl_write on public.club_listings;
create policy p_cl_write on public.club_listings for all to authenticated
  using (exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()))
  with check (exists (select 1 from public.teams t where t.id = team_id and t.owner_id = auth.uid()));
grant select, insert, update, delete on public.club_listings to authenticated;

create table if not exists public.offers (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('oyuncu','takim','kulup')),
  from_user  uuid not null references public.users(id) on delete cascade,
  to_user    uuid not null references public.users(id) on delete cascade,
  team_id    uuid references public.teams(id) on delete cascade,
  message    text check (char_length(message) <= 200),
  status     text not null default 'bekliyor' check (status in ('bekliyor','kabul','ret','iptal')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  constraint offers_taraf check (from_user <> to_user)
);
create index if not exists ix_offers_to on public.offers (to_user, status, created_at desc);
alter table public.offers enable row level security;
drop policy if exists p_of_read on public.offers;
create policy p_of_read on public.offers for select to authenticated
  using (from_user = auth.uid() or to_user = auth.uid());
drop policy if exists p_of_ins on public.offers;
create policy p_of_ins on public.offers for insert to authenticated with check (from_user = auth.uid());
drop policy if exists p_of_upd on public.offers;
create policy p_of_upd on public.offers for update to authenticated
  using (to_user = auth.uid() or from_user = auth.uid());
grant select, insert, update on public.offers to authenticated;

create or replace function public.offer_karari() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'bekliyor' then raise exception 'teklif_kapali'; end if;
  if new.status in ('kabul','ret') and auth.uid() <> old.to_user then raise exception 'yetki_yok'; end if;
  if new.status = 'iptal' and auth.uid() <> old.from_user then raise exception 'yetki_yok'; end if;
  new.decided_at := now();
  if new.status = 'kabul' and new.team_id is not null and new.kind in ('takim','kulup') then
    insert into public.team_members (team_id, user_id)
    values (new.team_id, case when new.kind = 'takim' then new.to_user else new.from_user end)
    on conflict do nothing;
  end if;
  if new.status = 'kabul' or new.status = 'ret' then
    insert into public.notifications (user_id, type, title, body, data)
    values (new.from_user, 'teklif', case when new.status='kabul' then 'Teklifin kabul edildi 🎉' else 'Teklifin reddedildi' end,
            coalesce(new.message,''), jsonb_build_object('offer_id', new.id));
  end if;
  return new;
end $$;
drop trigger if exists trg_offer_karar on public.offers;
create trigger trg_offer_karar before update on public.offers
  for each row execute function public.offer_karari();

create or replace function public.offer_bildirimi() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  values (new.to_user, 'teklif',
          case new.kind when 'takim' then '🏆 Takım daveti aldın' when 'kulup' then '🏘 Kulübüne başvuru var' else '💌 Transfer teklifi aldın' end,
          coalesce(new.message,''), jsonb_build_object('offer_id', new.id));
  return new;
end $$;
drop trigger if exists trg_offer_bildirim on public.offers;
create trigger trg_offer_bildirim after insert on public.offers
  for each row execute function public.offer_bildirimi();

-- ---------------------------------------------------------------------------
-- 10f) Keşfet: oyuncu paylaşımları (fotoğraf + yazı, isteğe bağlı vitrin ekli)
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.users(id) on delete cascade,
  city_id        int references public.cities(id),
  caption        text check (char_length(caption) <= 300),
  image_url      text check (image_url is null or image_url ~ '^https://'),
  video_url      text check (video_url is null or video_url ~ '^https://'),
  attach_listing boolean not null default false,
  created_at     timestamptz not null default now(),
  constraint posts_icerik check (caption is not null or image_url is not null or video_url is not null)
);
alter table public.posts add column if not exists video_url text check (video_url is null or video_url ~ '^https://');
alter table public.posts drop constraint if exists posts_icerik;
alter table public.posts add constraint posts_icerik check (caption is not null or image_url is not null or video_url is not null);
create index if not exists ix_posts_akis on public.posts (city_id, created_at desc);
alter table public.posts enable row level security;
drop policy if exists p_posts_read on public.posts;
create policy p_posts_read on public.posts for select to authenticated using (true);
drop policy if exists p_posts_insert on public.posts;
create policy p_posts_insert on public.posts for insert to authenticated with check (user_id = auth.uid());
drop policy if exists p_posts_delete on public.posts;
create policy p_posts_delete on public.posts for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.posts to authenticated;

create or replace function public.posts_gunluk_sinir() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.posts
       where user_id = new.user_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'paylasim_gunluk_sinir';
  end if;
  return new;
end $$;
drop trigger if exists trg_posts_sinir on public.posts;
create trigger trg_posts_sinir before insert on public.posts
  for each row execute function public.posts_gunluk_sinir();

create table if not exists public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
drop policy if exists p_plike_read on public.post_likes;
create policy p_plike_read on public.post_likes for select to authenticated using (true);
drop policy if exists p_plike_write on public.post_likes;
create policy p_plike_write on public.post_likes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists p_plike_del on public.post_likes;
create policy p_plike_del on public.post_likes for delete to authenticated using (user_id = auth.uid());
grant select, insert, delete on public.post_likes to authenticated;

-- ---------------------------------------------------------------------------
-- 10e) Transfer Pazarı: oyuncu arz ilanları (kişi başına tek vitrin)
-- ---------------------------------------------------------------------------
create table if not exists public.player_listings (
  user_id     uuid primary key references public.users(id) on delete cascade,
  category_id int not null check (category_id between 1 and 4),
  city_id     int not null references public.cities(id),
  district_id bigint references public.districts(id),
  positions   text[] not null default '{}',
  days        int[] not null default '{}',       -- 0=Paz … 6=Cmt
  bio         text check (char_length(bio) <= 200),
  active      boolean not null default true,
  updated_at  timestamptz not null default now()
);
alter table public.player_listings enable row level security;
drop policy if exists p_market_read on public.player_listings;
create policy p_market_read on public.player_listings for select to authenticated
  using (active or user_id = auth.uid());
drop policy if exists p_market_write on public.player_listings;
create policy p_market_write on public.player_listings for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists p_market_update on public.player_listings;
create policy p_market_update on public.player_listings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists p_market_delete on public.player_listings;
create policy p_market_delete on public.player_listings for delete to authenticated
  using (user_id = auth.uid());
grant select, insert, update, delete on public.player_listings to authenticated;

-- ---------------------------------------------------------------------------
-- 10d) Saha/kort havuzu: OSM hasadı + kullanıcı eklemeleri (haritadan iğne)
-- ---------------------------------------------------------------------------
create table if not exists public.venues (
  id          uuid primary key default gen_random_uuid(),
  city_id     int not null references public.cities(id),
  district_id bigint references public.districts(id),
  category_id int not null check (category_id between 1 and 4),
  name        text not null check (char_length(name) between 2 and 80),
  lat         double precision check (lat between 35 and 43),
  lng         double precision check (lng between 25 and 45.5),
  source      text not null default 'user' check (source in ('osm', 'user')),
  created_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index if not exists uq_venues_ad
  on public.venues (city_id, category_id, lower(name));
alter table public.venues enable row level security;
drop policy if exists p_venues_read on public.venues;
create policy p_venues_read on public.venues for select to authenticated using (true);
drop policy if exists p_venues_insert on public.venues;
create policy p_venues_insert on public.venues for insert to authenticated
  with check (source = 'user' and created_by = auth.uid());
grant select, insert on public.venues to authenticated;

alter table public.events add column if not exists venue_lat double precision;
alter table public.events add column if not exists venue_lng double precision;

-- ---------------------------------------------------------------------------
-- 10c) Sponsorlar: panelden yönetilen reklam kartları + tıklama sayacı
--      Yeni kampanya = Table Editor > sponsors'a satır eklemek; uygulama günceli çeker.
-- ---------------------------------------------------------------------------
create table if not exists public.sponsors (
  id         text primary key check (id ~ '^[a-z0-9_]{2,30}$'),
  name       text not null check (char_length(name) <= 40),
  emoji      text not null default '🤝' check (char_length(emoji) <= 8),
  color      text not null default '#0B3D2E' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  tagline    text check (char_length(tagline) <= 90),
  cta        text not null default 'İncele' check (char_length(cta) <= 20),
  url        text not null check (url ~ '^https?://'),
  priority   int not null default 1,
  active     boolean not null default true,
  clicks     int not null default 0,            -- yalnız sponsor_click RPC artırır
  created_at timestamptz not null default now()
);
alter table public.sponsors enable row level security;
drop policy if exists p_sponsors_read on public.sponsors;
create policy p_sponsors_read on public.sponsors for select to authenticated using (active);
grant select on public.sponsors to authenticated;          -- yazma yok: yönetim yalnız panelden

create or replace function public.sponsor_click(p_id text)
returns void language sql security definer set search_path = public as $$
  update public.sponsors set clicks = clicks + 1 where id = p_id and active
$$;

-- Çift kayıt aşısı: aynı organizatör, aynı başlık, aynı tarih-saatte ikinci açık ilan olamaz
create unique index if not exists uq_events_tekil
  on public.events (organizer_id, title, event_date)
  where status in ('acik', 'doldu');

alter table public.sponsors add column if not exists logo_url text
  check (logo_url is null or logo_url ~ '^https://');

insert into public.sponsors (id, name, emoji, color, tagline, cta, url, priority)
values ('elitlig', 'Elit Lig', '🏆', '#B4232A',
        'Takımını lige taşı — fikstür, puan durumu, istatistik hazır',
        'Ligi incele', 'https://www.elitlig.com', 1)
on conflict (id) do nothing;
update public.sponsors set color = '#3E1F76' where id = 'elitlig' and color = '#B4232A';   -- marka moru

-- ---------------------------------------------------------------------------
-- 11) Depolama (avatars + chat) ve gerçek zamanlı yayın — Supabase'te çalışır,
--     yerel testte storage/publication yoksa sessizce atlanır
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
    insert into storage.buckets (id, name, public) values ('chat', 'chat', true) on conflict (id) do nothing;
    insert into storage.buckets (id, name, public) values ('sponsors', 'sponsors', true) on conflict (id) do nothing;
    insert into storage.buckets (id, name, public) values ('posts', 'posts', true) on conflict (id) do nothing;
    execute 'drop policy if exists p_storage_read on storage.objects';
    execute $p$create policy p_storage_read on storage.objects for select using (bucket_id in ('avatars','chat','sponsors','posts'))$p$;
    execute 'drop policy if exists p_storage_write on storage.objects';
    execute $p$create policy p_storage_write on storage.objects for insert to authenticated
      with check (bucket_id in ('avatars','chat','posts') and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute 'drop policy if exists p_storage_update on storage.objects';
    execute $p$create policy p_storage_update on storage.objects for update to authenticated
      using (bucket_id in ('avatars','chat') and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute 'drop policy if exists p_storage_delete on storage.objects';
    execute $p$create policy p_storage_delete on storage.objects for delete to authenticated
      using (bucket_id in ('avatars','chat') and (storage.foldername(name))[1] = auth.uid()::text)$p$;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    declare tbl text;
    begin
      foreach tbl in array array['messages','applications','events','conversation_members','notifications','poll_votes','polls','waitlist','message_reactions','posts','post_likes','offers'] loop
        begin
          execute format('alter publication supabase_realtime add table public.%I', tbl);
        exception when duplicate_object then null;
        end;
      end loop;
    end;
  end if;
exception when duplicate_object then null;
end $$;

-- Bitti. Sıradaki adım: seed_iller.sql
