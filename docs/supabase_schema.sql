-- Ubytovňa Trnava – kompletná Supabase schéma
-- Spusti v Supabase SQL Editor pri čistom projekte.

create extension if not exists "pgcrypto";

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  room_number integer not null unique,
  floor text,
  capacity integer not null default 3,
  status text not null default 'Trong',
  price_daily numeric(10,2),
  price_monthly numeric(10,2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  ico text,
  email text,
  phone text,
  address text,
  contract_status text default 'active',
  monthly_amount numeric(10,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code text unique,
  guest_name text not null,
  guest_phone text,
  guest_email text,
  phone text,
  email text,
  room_id uuid references rooms(id) on delete set null,
  bed_code text,
  company_id uuid references companies(id) on delete set null,
  check_in_date date not null,
  check_out_date date not null,
  actual_check_in timestamptz,
  actual_check_out timestamptz,
  keys_issued boolean default false,
  room_condition_checkin text,
  room_condition_checkout text,
  status text not null default 'Nova',
  total_price numeric(10,2),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_dates_valid check (check_out_date > check_in_date)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  payment_code text unique,
  booking_id uuid references bookings(id) on delete set null,
  company_id uuid references companies(id) on delete set null,
  payment_month text,
  amount numeric(10,2) not null default 0,
  due_date date,
  paid_date date,
  status text not null default 'pending',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table rooms enable row level security;
alter table companies enable row level security;
alter table bookings enable row level security;
alter table payments enable row level security;

do $$ begin create policy "rooms anon read" on rooms for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "rooms anon insert" on rooms for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "rooms anon update" on rooms for update using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "rooms anon delete" on rooms for delete using (true); exception when duplicate_object then null; end $$;

do $$ begin create policy "companies anon read" on companies for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "companies anon insert" on companies for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "companies anon update" on companies for update using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "companies anon delete" on companies for delete using (true); exception when duplicate_object then null; end $$;

do $$ begin create policy "bookings anon read" on bookings for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "bookings anon insert" on bookings for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "bookings anon update" on bookings for update using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "bookings anon delete" on bookings for delete using (true); exception when duplicate_object then null; end $$;

do $$ begin create policy "payments anon read" on payments for select using (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "payments anon insert" on payments for insert with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "payments anon update" on payments for update using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy "payments anon delete" on payments for delete using (true); exception when duplicate_object then null; end $$;
