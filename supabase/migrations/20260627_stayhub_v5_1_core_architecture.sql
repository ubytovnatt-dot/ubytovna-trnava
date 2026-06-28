-- StayHub v5.1 Core Architecture
-- Reservation is the single source of truth.
-- This migration is intentionally backward-compatible with the existing StayHub tables.

-- 1) Document bucket expected by v5.1 OCR/check-in flow.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stayhub-documents',
  'stayhub-documents',
  false,
  8388608,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'];

-- 2) Core reservation fields. Existing table name remains `bookings` for compatibility.
alter table if exists public.bookings
  add column if not exists payer_type text default 'company',
  add column if not exists requested_beds integer default 1,
  add column if not exists reserved_beds jsonb default '[]'::jsonb,
  add column if not exists total_price numeric default 0,
  add column if not exists pricing_model text default 'daily',
  add column if not exists note text,
  add column if not exists updated_at timestamptz default now();

-- 3) Persons/check-in records are linked to reservation.
alter table if exists public.checkin_persons
  add column if not exists booking_id uuid,
  add column if not exists reservation_id uuid,
  add column if not exists document_type text,
  add column if not exists document_number text,
  add column if not exists nationality text,
  add column if not exists date_of_birth date,
  add column if not exists checked_in_at timestamptz,
  add column if not exists checked_out_at timestamptz,
  add column if not exists updated_at timestamptz default now();

-- Keep both names populated when possible.
update public.checkin_persons
set reservation_id = booking_id
where reservation_id is null and booking_id is not null;

update public.checkin_persons
set booking_id = reservation_id
where booking_id is null and reservation_id is not null;

-- 4) Payments are linked to reservation.
alter table if exists public.payments
  add column if not exists reservation_id uuid,
  add column if not exists updated_at timestamptz default now();

update public.payments
set reservation_id = booking_id
where reservation_id is null and booking_id is not null;

-- 5) Documents are linked to reservation/person and stored in Supabase Storage.
alter table if exists public.documents
  add column if not exists reservation_id uuid,
  add column if not exists booking_id uuid,
  add column if not exists person_id uuid,
  add column if not exists company_id uuid,
  add column if not exists document_type text,
  add column if not exists storage_bucket text default 'stayhub-documents',
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size integer,
  add column if not exists ocr_data jsonb default '{}'::jsonb,
  add column if not exists updated_at timestamptz default now();

update public.documents
set storage_bucket = 'stayhub-documents'
where storage_bucket is null;

-- 6) Optional compatibility views for future v5 naming.
create or replace view public.reservations as
select * from public.bookings;

create or replace view public.persons as
select * from public.checkin_persons;

-- 7) Helpful indexes for calendar, availability and check-in workflow.
create index if not exists idx_bookings_property_dates on public.bookings(property_id, check_in_date, check_out_date);
create index if not exists idx_bookings_company on public.bookings(company_id);
create index if not exists idx_checkin_persons_booking on public.checkin_persons(booking_id);
create index if not exists idx_checkin_persons_reservation on public.checkin_persons(reservation_id);
create index if not exists idx_checkin_persons_room_bed_status on public.checkin_persons(room_id, bed_code, status);
create index if not exists idx_payments_reservation on public.payments(reservation_id);
create index if not exists idx_documents_reservation on public.documents(reservation_id);
create index if not exists idx_documents_person on public.documents(person_id);

-- 8) Private bucket policy placeholder.
-- Keep existing RLS/auth policies if you already configured them.
-- For production, access should go through authenticated users or Vercel server functions.
