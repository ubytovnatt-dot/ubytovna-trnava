-- Ubytovňa Trnava – upgrade pre kompletnú logiku
-- Bezpečné spustiť opakovane v Supabase SQL Editor.

alter table bookings add column if not exists guest_phone text;
alter table bookings add column if not exists guest_email text;
alter table bookings add column if not exists phone text;
alter table bookings add column if not exists email text;
alter table bookings add column if not exists company_id uuid references companies(id) on delete set null;
alter table bookings add column if not exists bed_code text;
alter table bookings add column if not exists total_price numeric(10,2);
alter table bookings add column if not exists note text;
alter table bookings add column if not exists actual_check_in timestamptz;
alter table bookings add column if not exists actual_check_out timestamptz;
alter table bookings add column if not exists keys_issued boolean default false;
alter table bookings add column if not exists room_condition_checkin text;
alter table bookings add column if not exists room_condition_checkout text;

update bookings set guest_phone = phone where guest_phone is null and phone is not null;
update bookings set guest_email = email where guest_email is null and email is not null;

alter table payments add column if not exists booking_id uuid references bookings(id) on delete set null;
alter table payments add column if not exists company_id uuid references companies(id) on delete set null;
alter table payments add column if not exists payment_month text;
alter table payments add column if not exists amount numeric(10,2) default 0;
alter table payments add column if not exists due_date date;
alter table payments add column if not exists paid_date date;
alter table payments add column if not exists status text default 'pending';
alter table payments add column if not exists note text;

alter table companies add column if not exists ico text;
alter table companies add column if not exists email text;
alter table companies add column if not exists phone text;
alter table companies add column if not exists address text;
alter table companies add column if not exists contract_status text default 'active';
alter table companies add column if not exists monthly_amount numeric(10,2);
