-- StayHub v5.2 – Reservation Engine Refactor
-- Safe migration for existing database. It preserves current data.

create extension if not exists pgcrypto;

-- 1) Beds inventory. Rooms keep capacity, beds are explicit assignable units.
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

-- Seed missing beds from existing rooms.capacity.
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

-- 2) Keep bookings as reservation table. Add columns only if missing.
alter table public.bookings add column if not exists check_in date;
alter table public.bookings add column if not exists check_out date;
alter table public.bookings add column if not exists requested_beds integer default 1;
alter table public.bookings add column if not exists paid_amount numeric default 0;

update public.bookings
set check_in = coalesce(check_in, check_in_date),
    check_out = coalesce(check_out, check_out_date)
where check_in is null or check_out is null;

create index if not exists idx_bookings_property_dates on public.bookings(property_id, check_in_date, check_out_date);
create index if not exists idx_bookings_property_status on public.bookings(property_id, status);

-- 3) Check-in persons: add OCR/check-in fields safely.
alter table public.checkin_persons add column if not exists full_name text;
alter table public.checkin_persons add column if not exists document_number text;
alter table public.checkin_persons add column if not exists birth_date date;
alter table public.checkin_persons add column if not exists issue_date date;
alter table public.checkin_persons add column if not exists expiry_date date;
alter table public.checkin_persons add column if not exists checked_in_at timestamptz;
alter table public.checkin_persons add column if not exists actual_check_in timestamptz;
alter table public.checkin_persons add column if not exists actual_check_out timestamptz;
alter table public.checkin_persons add column if not exists ocr_status text default 'not_started';
alter table public.checkin_persons add column if not exists ocr_json jsonb;
alter table public.checkin_persons add column if not exists document_type text default 'passport';
alter table public.checkin_persons add column if not exists document_storage_path text;

update public.checkin_persons
set full_name = nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), '')
where full_name is null;

update public.checkin_persons
set document_number = coalesce(document_number, passport_no),
    birth_date = coalesce(birth_date, date_of_birth),
    checked_in_at = coalesce(checked_in_at, checkin_at)
where document_number is null or birth_date is null or checked_in_at is null;

create index if not exists idx_checkin_persons_booking_status on public.checkin_persons(property_id, booking_id, status);
create index if not exists idx_checkin_persons_room_bed on public.checkin_persons(property_id, room_id, bed_code, status);

-- 4) Documents: keep existing table, add OCR metadata.
alter table public.documents add column if not exists ocr_status text default 'not_started';
alter table public.documents add column if not exists ocr_json jsonb;
alter table public.documents add column if not exists verified_by uuid;
alter table public.documents add column if not exists verified_at timestamptz;
alter table public.documents add column if not exists document_type_normalized text;

update public.documents
set document_type_normalized = case
  when lower(coalesce(document_type, type, '')) in ('op', 'id', 'id_card', 'obciansky preukaz', 'občiansky preukaz') then 'id_card'
  else 'passport'
end
where document_type_normalized is null;

create index if not exists idx_documents_booking_person on public.documents(property_id, booking_id, person_id);
create index if not exists idx_documents_ocr_status on public.documents(property_id, ocr_status);

-- 5) Live views. Do not store reports manually.
create or replace view public.v_stayhub_bed_occupancy_today as
with today_value as (
  select current_date::date as day
), active_bookings as (
  select b.*
  from public.bookings b, today_value t
  where coalesce(b.status, '') not in ('Zrušená','Zrusena','cancelled','canceled','Da huy','Đã hủy','Ukončená','Dokončená','completed','checked_out','archived')
    and b.check_in_date <= t.day
    and b.check_out_date > t.day
)
select
  bed.property_id,
  bed.room_id,
  bed.bed_code,
  bed.active,
  exists (
    select 1 from public.checkin_persons p
    where p.property_id = bed.property_id
      and p.room_id = bed.room_id
      and p.bed_code::text = bed.bed_code::text
      and p.status = 'checked_in'
  ) as occupied_now,
  exists (
    select 1 from active_bookings b
    where b.property_id = bed.property_id
      and coalesce(b.reserved_beds, '[]'::jsonb) @> jsonb_build_array(jsonb_build_object('room_id', bed.room_id::text, 'bed_code', bed.bed_code::text))
  ) as reserved_today
from public.beds bed;
