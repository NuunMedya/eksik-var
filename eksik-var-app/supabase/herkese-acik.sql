-- EKSİK VAR — Herkese açık maç sayfası + şehir/ilçe sayfaları (bir kez, Supabase SQL Editor)
-- eksikvarapp.com/e/<id>  → maçın özeti (giriş gerekmez; telefon, açıklama, kadro isimleri paylaşılmaz)
-- eksikvarapp.com/ankara/cankaya → o ilçedeki açık ilanlar (önümüzdeki 14 gün)
set search_path = public;

-- Organizatör adı: "Ahmet Y." biçiminde
create or replace function public.kisa_ad(p text) returns text
language sql immutable as $$
  select case when p is null or btrim(p) = '' then 'Organizatör'
    when array_length(regexp_split_to_array(btrim(p), '\s+'), 1) >= 2
      then (regexp_split_to_array(btrim(p), '\s+'))[1] || ' ' || left((regexp_split_to_array(btrim(p), '\s+'))[array_length(regexp_split_to_array(btrim(p), '\s+'), 1)], 1) || '.'
    else btrim(p) end
$$;

create or replace function public.public_event(p_id uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', e.id, 'title', e.title, 'cat', e.category_id, 'kind', e.kind, 'status', e.status,
    'city', c.name, 'district', d.name, 'venue', e.venue_name,
    'date', e.event_date, 'price', e.price_per_person, 'capacity', e.total_capacity,
    'needed', e.needed_count, 'filled', e.filled_count, 'level', e.skill_level,
    'positions', coalesce(e.needed_positions, '{}'::jsonb), 'format', e.format, 'team', e.team_name,
    'hakem', e.gorev_hakem and e.hakem_id is null, 'medya', e.gorev_medya and e.medya_id is null,
    'org', public.kisa_ad(u.full_name), 'orgRel', u.reliability_pct, 'orgRating', u.rating_avg, 'orgCount', u.events_organized)
  from public.events e
  join public.users u on u.id = e.organizer_id
  left join public.cities c on c.id = e.city_id
  left join public.districts d on d.id = e.district_id
  where e.id = p_id and u.status = 'aktif'
$$;
grant execute on function public.public_event(uuid) to anon, authenticated;

create or replace function public.public_feed(p_city int, p_district int default null) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(x order by x->>'date'), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', e.id, 'title', e.title, 'cat', e.category_id, 'kind', e.kind, 'status', e.status,
      'district', d.name, 'venue', e.venue_name, 'date', e.event_date, 'price', e.price_per_person,
      'capacity', e.total_capacity, 'needed', e.needed_count, 'filled', e.filled_count, 'level', e.skill_level,
      'positions', coalesce(e.needed_positions, '{}'::jsonb), 'format', e.format, 'team', e.team_name,
      'hakem', e.gorev_hakem and e.hakem_id is null, 'medya', e.gorev_medya and e.medya_id is null,
      'org', public.kisa_ad(u.full_name), 'orgRel', u.reliability_pct) as x
    from public.events e
    join public.users u on u.id = e.organizer_id and u.status = 'aktif'
    left join public.districts d on d.id = e.district_id
    where e.city_id = p_city and (p_district is null or e.district_id = p_district)
      and e.status in ('acik','doldu') and e.event_date between now() and now() + interval '14 days'
    order by e.event_date limit 60) s
$$;
grant execute on function public.public_feed(int, int) to anon, authenticated;

-- Şehir sayfası için küçük istatistik (kaç ilan, kaç oyuncu — güven verir)
create or replace function public.public_stats(p_city int) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'oyuncu', (select count(*) from public.users where city_id = p_city and status = 'aktif'),
    'ilan30', (select count(*) from public.events where city_id = p_city and event_date > now() - interval '30 days'),
    'acik', (select count(*) from public.events where city_id = p_city and status in ('acik','doldu') and event_date > now()))
$$;
grant execute on function public.public_stats(int) to anon, authenticated;
