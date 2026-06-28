-- StayHub v5.2.1 – Database Stabilization
-- Safe migration for the existing Postova 3 database.
-- Goal: keep current tables/data, stabilize beds, OCR fields and bed_id links.

create extension if not exists pgcrypto;

-- 1) Ensure explicit bed inventory exists.
create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  property_id text not null default 'postova-3',
  room_id uuid not null references public.rooms(id) on delete cascade,
  bed_code text not null,
  sort_order integer not null default 1,
  active boolean not null default true,
  status text not null default 'available',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, room_id, bed_code)
);

create index if not exists idx_beds_property_room on public.beds(property_id, room_id);
create index if not exists idx_beds_active on public.beds(property_id, active);
create index if not exists idx_beds_room_bed_code on public.beds(room_id, bed_code);

-- Seed only missing beds from rooms.capacity. Safe to run repeatedly.
insert into public.beds (property_id, room_id, bed_code, sort_order, active, status)
select
  coalesce(r.property_id, 'postova-3') as property_id,
  r.id as room_id,
  gs::text as bed_code,
  gs as sort_order,
  true as active,
  'available' as status
from public.rooms r
cross join lateral generate_series(1, greatest(coalesce(r.capacity, 0), 0)) as gs
where coalesce(r.capacity, 0) > 0
on conflict (property_id, room_id, bed_code) do nothing;

-- 2) Stabilize check-in persons.
alter table public.checkin_persons add column if not exists bed_id uuid references public.beds(id) on delete set null;
alter table public.checkin_persons add column if not exists full_name text;
alter table public.checkin_persons add column if not exists document_type text default 'passport';
alter table public.checkin_persons add column if not exists document_number text;
alter table public.checkin_persons add column if not exists birth_date date;
alter table public.checkin_persons add column if not exists issue_date date;
alter table public.checkin_persons add column if not exists expiry_date date;
alter table public.checkin_persons add column if not exists checked_in_at timestamptz;
alter table public.checkin_persons add column if not exists actual_check_in timestamptz;
alter table public.checkin_persons add column if not exists actual_check_out timestamptz;
alter table public.checkin_persons add column if not exists ocr_status text default 'not_started';
alter table public.checkin_persons add column if not exists ocr_json jsonb default '{}'::jsonb;
alter table public.checkin_persons add column if not exists document_storage_path text;

-- Backfill readable fields from the current schema.
update public.checkin_persons
set full_name = nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
where full_name is null;

update public.checkin_persons
set document_number = coalesce(document_number, passport_no),
    birth_date = coalesce(birth_date, date_of_birth),
    checked_in_at = coalesce(checked_in_at, checkin_at)
where document_number is null or birth_date is null or checked_in_at is null;

-- Backfill stable bed_id from existing room_id + bed_code.
update public.checkin_persons p
set bed_id = b.id
from public.beds b
where p.bed_id is null
  and p.property_id = b.property_id
  and p.room_id = b.room_id
  and p.bed_code::text = b.bed_code::text;

create index if not exists idx_checkin_persons_bed_id on public.checkin_persons(bed_id);
create index if not exists idx_checkin_persons_booking_status on public.checkin_persons(property_id, booking_id, status);
create index if not exists idx_checkin_persons_room_bed on public.checkin_persons(property_id, room_id, bed_code, status);
create index if not exists idx_checkin_persons_ocr_status on public.checkin_persons(property_id, ocr_status);

-- 3) Stabilize documents for future Check-in OCR.
alter table public.documents add column if not exists storage_bucket text default 'stayhub-documents';
alter table public.documents add column if not exists ocr_status text default 'not_started';
alter table public.documents add column if not exists ocr_json jsonb default '{}'::jsonb;
alter table public.documents add column if not exists verified_by uuid;
alter table public.documents add column if not exists verified_at timestamptz;
alter table public.documents add column if not exists document_type_normalized text;

update public.documents
set storage_bucket = 'stayhub-documents'
where storage_bucket is null;

update public.documents
set document_type_normalized = case
  when lower(coalesce(document_type, type, '')) in ('op', 'id', 'id_card', 'obciansky preukaz', 'občiansky preukaz') then 'id_card'
  else 'passport'
end
where document_type_normalized is null;

create index if not exists idx_documents_booking_person on public.documents(property_id, booking_id, person_id);
create index if not exists idx_documents_ocr_status on public.documents(property_id, ocr_status);
create index if not exists idx_documents_storage_path on public.documents(storage_path);

-- 4) Keep current bookings model, but ensure stable indexes for calendar/date range queries.
create index if not exists idx_bookings_property_dates on public.bookings(property_id, check_in_date, check_out_date);
create index if not exists idx_bookings_property_status on public.bookings(property_id, status);
create index if not exists idx_bookings_company on public.bookings(property_id, company_id);

-- 5) Views used by v5 UI. Reports are calculated, not manually stored.
create or replace view public.v_stayhub_beds_inventory as
select
  b.id as bed_id,
  b.property_id,
  b.room_id,
  coalesce(r.room_number::text, r.name, b.room_id::text) as room_label,
  b.bed_code,
  b.sort_order,
  b.active,
  b.status,
  b.note
from public.beds b
join public.rooms r on r.id = b.room_id;

create or replace view public.v_stayhub_checked_in_beds as
select
  p.property_id,
  p.booking_id,
  p.id as person_id,
  p.full_name,
  p.company_id,
  p.company_name,
  p.room_id,
  p.room_label,
  p.bed_code,
  p.bed_id,
  p.status,
  p.checked_in_at,
  p.actual_check_out,
  p.expected_checkout_date
from public.checkin_persons p
where p.status = 'checked_in';

create or replace view public.v_stayhub_bed_occupancy_today as
with today_value as (
  select current_date::date as day
), active_bookings as (
  select b.*
  from public.bookings b, today_value t
  where coalesce(b.status, '') not in (
    'Zrušená','Zrusena','cancelled','canceled','Da huy','Đã hủy',
    'Ukončená','Dokončená','completed','checked_out','archived'
  )
    and b.check_in_date <= t.day
    and b.check_out_date > t.day
)
select
  bed.property_id,
  bed.room_id,
  bed.bed_code,
  bed.id as bed_id,
  bed.active,
  exists (
    select 1 from public.checkin_persons p
    where p.property_id = bed.property_id
      and p.bed_id = bed.id
      and p.status = 'checked_in'
  ) as occupied_now,
  exists (
    select 1 from active_bookings b
    where b.property_id = bed.property_id
      and coalesce(b.reserved_beds, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('room_id', bed.room_id::text, 'bed_code', bed.bed_code::text))
  ) as reserved_today
from public.beds bed;

create or replace view public.v_stayhub_booking_bed_ranges as
select
  b.id as booking_id,
  b.property_id,
  b.company_id,
  b.company_name,
  b.guest_name,
  b.status,
  b.check_in_date,
  b.check_out_date,
  item.value ->> 'room_id' as room_id_text,
  item.value ->> 'bed_code' as bed_code
from public.bookings b
cross join lateral jsonb_array_elements(coalesce(b.reserved_beds, '[]'::jsonb)) as item(value);

-- 6) Verification queries are intentionally left as comments.
-- select count(*) as beds_total from public.beds;
-- select count(*) as persons_with_bed_id from public.checkin_persons where bed_id is not null;
-- select * from public.v_stayhub_bed_occupancy_today limit 20;
