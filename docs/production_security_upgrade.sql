-- StayHub production security upgrade
-- Run in Supabase SQL Editor before using real booking/payment data.

create extension if not exists "pgcrypto";

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.checkin_persons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.rooms add column if not exists room_number integer;
alter table public.rooms add column if not exists name text;
alter table public.rooms add column if not exists floor text default 'I.NP';
alter table public.rooms add column if not exists capacity integer default 3;
alter table public.rooms add column if not exists status text default 'Voľná';
alter table public.rooms add column if not exists price_daily numeric(10,2) default 18;
alter table public.rooms add column if not exists price_monthly numeric(10,2);
alter table public.rooms add column if not exists price_per_night numeric(12,2) default 0;
alter table public.rooms add column if not exists note text;

alter table public.companies add column if not exists name text;
alter table public.companies add column if not exists company_name text;
alter table public.companies add column if not exists contact_person text;
alter table public.companies add column if not exists email text;
alter table public.companies add column if not exists phone text;
alter table public.companies add column if not exists ico text;
alter table public.companies add column if not exists dic text;
alter table public.companies add column if not exists address text;
alter table public.companies add column if not exists note text;

alter table public.bookings add column if not exists room_id uuid;
alter table public.bookings add column if not exists company_id uuid;
alter table public.bookings add column if not exists guest_id uuid;
alter table public.bookings add column if not exists booking_code text;
alter table public.bookings add column if not exists company_name text;
alter table public.bookings add column if not exists guest_name text;
alter table public.bookings add column if not exists phone text;
alter table public.bookings add column if not exists email text;
alter table public.bookings add column if not exists guest_phone text;
alter table public.bookings add column if not exists guest_email text;
alter table public.bookings add column if not exists check_in date;
alter table public.bookings add column if not exists check_out date;
alter table public.bookings add column if not exists check_in_date date;
alter table public.bookings add column if not exists check_out_date date;
alter table public.bookings add column if not exists status text default 'Nová';
alter table public.bookings add column if not exists total_price numeric(12,2) default 0;
alter table public.bookings add column if not exists paid_amount numeric(12,2) default 0;
alter table public.bookings add column if not exists note text;
alter table public.bookings add column if not exists notes text;

alter table public.payments add column if not exists booking_id uuid;
alter table public.payments add column if not exists company_id uuid;
alter table public.payments add column if not exists payment_code text;
alter table public.payments add column if not exists payment_month text;
alter table public.payments add column if not exists amount numeric(12,2) default 0;
alter table public.payments add column if not exists method text;
alter table public.payments add column if not exists status text default 'Čaká';
alter table public.payments add column if not exists due_date date;
alter table public.payments add column if not exists paid_date date;
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists note text;

alter table public.checkin_persons add column if not exists booking_id uuid;
alter table public.checkin_persons add column if not exists company_id uuid;
alter table public.checkin_persons add column if not exists room_id uuid;
alter table public.checkin_persons add column if not exists room_number integer;
alter table public.checkin_persons add column if not exists room_label text;
alter table public.checkin_persons add column if not exists bed_code text;
alter table public.checkin_persons add column if not exists first_name text;
alter table public.checkin_persons add column if not exists last_name text;
alter table public.checkin_persons add column if not exists full_name text;
alter table public.checkin_persons add column if not exists document_number text;
alter table public.checkin_persons add column if not exists passport_no text;
alter table public.checkin_persons add column if not exists nationality text;
alter table public.checkin_persons add column if not exists birth_date date;
alter table public.checkin_persons add column if not exists date_of_birth date;
alter table public.checkin_persons add column if not exists issue_date date;
alter table public.checkin_persons add column if not exists expiry_date date;
alter table public.checkin_persons add column if not exists status text default 'checked_in';
alter table public.checkin_persons add column if not exists checked_in_at timestamptz;
alter table public.checkin_persons add column if not exists checkin_at timestamptz;
alter table public.checkin_persons add column if not exists checkout_at timestamptz;
alter table public.checkin_persons add column if not exists actual_check_in date;
alter table public.checkin_persons add column if not exists actual_check_out date;
alter table public.checkin_persons add column if not exists expected_checkout_date date;
alter table public.checkin_persons add column if not exists phone text;
alter table public.checkin_persons add column if not exists email text;
alter table public.checkin_persons add column if not exists address text;
alter table public.checkin_persons add column if not exists company_name text;
alter table public.checkin_persons add column if not exists keys_issued text default 'Áno';
alter table public.checkin_persons add column if not exists room_condition_checkin text default 'OK';
alter table public.checkin_persons add column if not exists note text;

alter table public.documents add column if not exists booking_id uuid;
alter table public.documents add column if not exists name text;
alter table public.documents add column if not exists type text;
alter table public.documents add column if not exists url text;

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists role text not null default 'staff';
alter table public.profiles add column if not exists property_id text;
alter table public.profiles add column if not exists is_active boolean not null default true;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

update public.rooms
set room_number = coalesce(room_number, nullif(regexp_replace(coalesce(name,''), '\D', '', 'g'), '')::integer)
where room_number is null and coalesce(name,'') ~ '\d';
update public.rooms
set price_daily = coalesce(price_daily, nullif(price_per_night,0), 18)
where price_daily is null;
update public.companies
set company_name = coalesce(company_name, name)
where company_name is null;
update public.bookings
set check_in_date = coalesce(check_in_date, check_in),
    check_out_date = coalesce(check_out_date, check_out),
    email = coalesce(email, guest_email),
    phone = coalesce(phone, guest_phone)
where check_in_date is null or check_out_date is null or email is null or phone is null;
update public.checkin_persons
set checkin_at = coalesce(checkin_at, checked_in_at),
    date_of_birth = coalesce(date_of_birth, birth_date),
    full_name = coalesce(full_name, trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')))
where checkin_at is null or date_of_birth is null or full_name is null;

alter table public.profiles disable row level security;
insert into public.profiles (id, email, full_name, role, property_id, is_active)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), 'admin', null, true
from auth.users u
where not exists (select 1 from public.profiles p where p.role = 'admin' and p.is_active = true)
order by u.created_at asc
limit 1
on conflict (id) do update set role = 'admin', is_active = true, updated_at = now();
alter table public.profiles enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid() and is_active is not false),
    'none'
  );
$$;

create or replace function public.has_profile_role(allowed_roles text[])
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_profile_role() = any(allowed_roles);
$$;

create or replace function public.is_active_profile()
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.current_profile_role() <> 'none';
$$;

alter table public.rooms enable row level security;
alter table public.companies enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.checkin_persons enable row level security;
alter table public.documents enable row level security;
alter table public.profiles enable row level security;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  property_id text,
  user_id uuid,
  user_email text,
  table_name text,
  record_id text,
  action text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);
alter table public.audit_logs enable row level security;

alter table public.rooms add column if not exists property_id text default 'postova-3';
alter table public.companies add column if not exists property_id text default 'postova-3';
alter table public.bookings add column if not exists property_id text default 'postova-3';
alter table public.payments add column if not exists property_id text default 'postova-3';
alter table public.checkin_persons add column if not exists property_id text default 'postova-3';
alter table public.documents add column if not exists property_id text default 'postova-3';

alter table public.bookings add column if not exists payer_type text default 'company';
alter table public.bookings add column if not exists contact_person text;
alter table public.bookings add column if not exists requested_beds integer default 1;
alter table public.bookings add column if not exists reserved_beds jsonb default '[]'::jsonb;
alter table public.bookings add column if not exists pricing_model text default 'daily';
alter table public.bookings add column if not exists currency text default 'EUR';
alter table public.bookings add column if not exists subtotal_price numeric(10,2) default 0;
alter table public.bookings add column if not exists discount_amount numeric(10,2) default 0;
alter table public.bookings add column if not exists tax_rate numeric(5,2) default 0;
alter table public.bookings add column if not exists tax_amount numeric(10,2) default 0;
alter table public.bookings add column if not exists cancellation_policy text default 'standard';
alter table public.bookings add column if not exists cancellation_reason text;
alter table public.bookings add column if not exists cancelled_at timestamptz;
alter table public.bookings add column if not exists cancellation_fee numeric(10,2) default 0;

alter table public.payments add column if not exists payer_type text default 'company';
alter table public.payments add column if not exists payer_name text;
alter table public.payments add column if not exists tenant_name text;
alter table public.payments add column if not exists room_label text;
alter table public.payments add column if not exists invoice_number text;
alter table public.payments add column if not exists variable_symbol text;
alter table public.payments add column if not exists currency text default 'EUR';

alter table public.audit_logs add column if not exists property_id text;
alter table public.audit_logs add column if not exists user_id uuid;
alter table public.audit_logs add column if not exists user_email text;
alter table public.audit_logs add column if not exists table_name text;
alter table public.audit_logs add column if not exists record_id text;
alter table public.audit_logs add column if not exists action text;
alter table public.audit_logs add column if not exists old_data jsonb;
alter table public.audit_logs add column if not exists new_data jsonb;
alter table public.audit_logs add column if not exists created_at timestamptz default now();

create index if not exists rooms_property_idx on public.rooms(property_id);
create index if not exists companies_property_idx on public.companies(property_id);
create index if not exists bookings_property_dates_idx on public.bookings(property_id, check_in_date, check_out_date);
create index if not exists payments_property_month_idx on public.payments(property_id, payment_month);
create index if not exists checkin_persons_property_status_idx on public.checkin_persons(property_id, status);
create index if not exists audit_logs_property_created_idx on public.audit_logs(property_id, created_at desc);

drop policy if exists "rooms anon read" on public.rooms;
drop policy if exists "rooms anon insert" on public.rooms;
drop policy if exists "rooms anon update" on public.rooms;
drop policy if exists "rooms anon delete" on public.rooms;
drop policy if exists "companies anon read" on public.companies;
drop policy if exists "companies anon insert" on public.companies;
drop policy if exists "companies anon update" on public.companies;
drop policy if exists "companies anon delete" on public.companies;
drop policy if exists "bookings anon read" on public.bookings;
drop policy if exists "bookings anon insert" on public.bookings;
drop policy if exists "bookings anon update" on public.bookings;
drop policy if exists "bookings anon delete" on public.bookings;
drop policy if exists "payments anon read" on public.payments;
drop policy if exists "payments anon insert" on public.payments;
drop policy if exists "payments anon update" on public.payments;
drop policy if exists "payments anon delete" on public.payments;

drop policy if exists "rooms_read_active" on public.rooms;
create policy "rooms_read_active" on public.rooms
for select to authenticated using (public.is_active_profile());
drop policy if exists "rooms_write_manager" on public.rooms;
create policy "rooms_write_manager" on public.rooms
for insert to authenticated with check (public.has_profile_role(array['admin','manager']));
drop policy if exists "rooms_update_manager" on public.rooms;
create policy "rooms_update_manager" on public.rooms
for update to authenticated using (public.has_profile_role(array['admin','manager'])) with check (public.has_profile_role(array['admin','manager']));
drop policy if exists "rooms_delete_admin" on public.rooms;
create policy "rooms_delete_admin" on public.rooms
for delete to authenticated using (public.has_profile_role(array['admin']));

drop policy if exists "companies_read_active" on public.companies;
create policy "companies_read_active" on public.companies
for select to authenticated using (public.is_active_profile());
drop policy if exists "companies_write_manager" on public.companies;
create policy "companies_write_manager" on public.companies
for insert to authenticated with check (public.has_profile_role(array['admin','manager']));
drop policy if exists "companies_update_manager" on public.companies;
create policy "companies_update_manager" on public.companies
for update to authenticated using (public.has_profile_role(array['admin','manager'])) with check (public.has_profile_role(array['admin','manager']));
drop policy if exists "companies_delete_admin" on public.companies;
create policy "companies_delete_admin" on public.companies
for delete to authenticated using (public.has_profile_role(array['admin']));

drop policy if exists "bookings_read_active" on public.bookings;
create policy "bookings_read_active" on public.bookings
for select to authenticated using (public.is_active_profile());
drop policy if exists "bookings_write_staff" on public.bookings;
create policy "bookings_write_staff" on public.bookings
for insert to authenticated with check (public.has_profile_role(array['admin','manager','reception']));
drop policy if exists "bookings_update_staff" on public.bookings;
create policy "bookings_update_staff" on public.bookings
for update to authenticated using (public.has_profile_role(array['admin','manager','reception'])) with check (public.has_profile_role(array['admin','manager','reception']));
drop policy if exists "bookings_delete_admin" on public.bookings;
create policy "bookings_delete_admin" on public.bookings
for delete to authenticated using (public.has_profile_role(array['admin']));

drop policy if exists "payments_read_active" on public.payments;
create policy "payments_read_active" on public.payments
for select to authenticated using (public.is_active_profile());
drop policy if exists "payments_write_manager" on public.payments;
create policy "payments_write_manager" on public.payments
for insert to authenticated with check (true);
drop policy if exists "payments_update_manager" on public.payments;
create policy "payments_update_manager" on public.payments
for update to authenticated using (true) with check (true);
drop policy if exists "payments_delete_admin" on public.payments;
create policy "payments_delete_admin" on public.payments
for delete to authenticated using (public.has_profile_role(array['admin']));

drop policy if exists "checkin_persons_read_active" on public.checkin_persons;
create policy "checkin_persons_read_active" on public.checkin_persons
for select to authenticated using (public.is_active_profile());
drop policy if exists "checkin_persons_write_staff" on public.checkin_persons;
create policy "checkin_persons_write_staff" on public.checkin_persons
for insert to authenticated with check (public.has_profile_role(array['admin','manager','reception']));
drop policy if exists "checkin_persons_update_staff" on public.checkin_persons;
create policy "checkin_persons_update_staff" on public.checkin_persons
for update to authenticated using (public.has_profile_role(array['admin','manager','reception'])) with check (public.has_profile_role(array['admin','manager','reception']));
drop policy if exists "checkin_persons_delete_admin" on public.checkin_persons;
create policy "checkin_persons_delete_admin" on public.checkin_persons
for delete to authenticated using (public.has_profile_role(array['admin']));

drop policy if exists "documents_read_manager" on public.documents;
create policy "documents_read_manager" on public.documents
for select to authenticated using (public.has_profile_role(array['admin','manager']));
drop policy if exists "documents_write_manager" on public.documents;
create policy "documents_write_manager" on public.documents
for insert to authenticated with check (public.has_profile_role(array['admin','manager']));
drop policy if exists "documents_update_manager" on public.documents;
create policy "documents_update_manager" on public.documents
for update to authenticated using (public.has_profile_role(array['admin','manager'])) with check (public.has_profile_role(array['admin','manager']));
drop policy if exists "documents_delete_admin" on public.documents;
create policy "documents_delete_admin" on public.documents
for delete to authenticated using (public.has_profile_role(array['admin']));

drop policy if exists "audit_logs_read_admin" on public.audit_logs;
create policy "audit_logs_read_admin" on public.audit_logs
for select to authenticated using (public.has_profile_role(array['admin']));
drop policy if exists "audit_logs_insert_active" on public.audit_logs;
create policy "audit_logs_insert_active" on public.audit_logs
for insert to authenticated with check (public.is_active_profile());

drop policy if exists "profiles_read_authenticated" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin" on public.profiles
for select to authenticated
using (auth.uid() = id or public.has_profile_role(array['admin']));
drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
for update to authenticated
using (public.has_profile_role(array['admin']))
with check (public.has_profile_role(array['admin']));
