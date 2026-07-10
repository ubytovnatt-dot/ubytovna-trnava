-- Ubytovňa Trnava – skupinové/firemné rezervácie kapacity
-- Spustiť v Supabase SQL Editor. Bezpečné opakovať.

create extension if not exists pgcrypto;

alter table companies add column if not exists ico text;
alter table companies add column if not exists contact_person text;
alter table companies add column if not exists email text;
alter table companies add column if not exists phone text;
alter table companies add column if not exists address text;
alter table companies add column if not exists contract_status text default 'active';
alter table companies add column if not exists note text;

alter table bookings add column if not exists reservation_type text default 'company'; -- company/person
alter table bookings add column if not exists payer_type text default 'company'; -- company/person
alter table bookings add column if not exists company_id uuid references companies(id) on delete set null;
alter table bookings add column if not exists company_name text;
alter table bookings add column if not exists contact_person text;
alter table bookings add column if not exists phone text;
alter table bookings add column if not exists email text;
alter table bookings add column if not exists guest_name text;
alter table bookings add column if not exists requested_beds integer default 1;
alter table bookings add column if not exists reserved_beds jsonb default '[]'::jsonb; -- [{room_id, room_label, bed_code}]
alter table bookings add column if not exists room_id uuid references rooms(id) on delete set null;
alter table bookings add column if not exists bed_code text;
alter table bookings add column if not exists total_price numeric(10,2);
alter table bookings add column if not exists note text;
alter table bookings add column if not exists actual_check_in timestamptz;
alter table bookings add column if not exists actual_check_out timestamptz;
alter table bookings add column if not exists keys_issued boolean default false;
alter table bookings add column if not exists room_condition_checkin text;
alter table bookings add column if not exists room_condition_checkout text;
alter table bookings add column if not exists updated_at timestamptz default now();

alter table payments add column if not exists booking_id uuid references bookings(id) on delete set null;
alter table payments add column if not exists company_id uuid references companies(id) on delete set null;
alter table payments add column if not exists payer_type text default 'company';
alter table payments add column if not exists payer_name text;
alter table payments add column if not exists tenant_name text;
alter table payments add column if not exists room_label text;
alter table payments add column if not exists payment_month text;
alter table payments add column if not exists amount numeric(10,2) default 0;
alter table payments add column if not exists due_date date;
alter table payments add column if not exists paid_date date;
alter table payments add column if not exists status text default 'pending';
alter table payments add column if not exists note text;
alter table payments add column if not exists updated_at timestamptz default now();

-- Prechod starších rezervácií 1 osoba → reserved_beds
update bookings b
set reserved_beds = jsonb_build_array(jsonb_build_object(
  'room_id', b.room_id,
  'room_label', 'P' || lpad(coalesce(r.room_number::text,''), 3, '0'),
  'bed_code', b.bed_code
)), requested_beds = coalesce(requested_beds, 1)
from rooms r
where b.room_id = r.id
  and b.bed_code is not null
  and (b.reserved_beds is null or b.reserved_beds = '[]'::jsonb);
