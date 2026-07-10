-- StayHub v5.4 – Payment Engine
-- Safe migration for existing database. It does not recreate tables and preserves data.

alter table public.payments add column if not exists payment_method text default 'cash';
alter table public.payments add column if not exists payment_scope text default 'booking';
alter table public.payments add column if not exists payer_type text default 'company';
alter table public.payments add column if not exists person_id uuid;
alter table public.payments add column if not exists applied_person_ids uuid[] default '{}';
alter table public.payments add column if not exists currency text default 'EUR';
alter table public.payments add column if not exists paid_at timestamptz;
alter table public.payments add column if not exists invoice_number text;
alter table public.payments add column if not exists variable_symbol text;
alter table public.payments add column if not exists balance_snapshot numeric;
alter table public.payments add column if not exists created_at timestamptz default now();
alter table public.payments add column if not exists updated_at timestamptz default now();

alter table public.bookings add column if not exists paid_amount numeric default 0;
alter table public.bookings add column if not exists payment_status text default 'unpaid';

update public.payments
set currency = coalesce(currency, 'EUR'),
    payment_method = coalesce(payment_method, method, 'cash'),
    payment_scope = coalesce(payment_scope, 'booking'),
    payer_type = coalesce(payer_type, case when company_id is null then 'person' else 'company' end),
    paid_at = coalesce(paid_at, case when status in ('Zaplatené','paid','Đã thanh toán','Da thanh toan') and paid_date is not null then paid_date::timestamptz else null end)
where currency is null
   or payment_method is null
   or payment_scope is null
   or payer_type is null
   or paid_at is null;

with payment_totals as (
  select
    booking_id,
    sum(case when status in ('Zaplatené','paid','Đã thanh toán','Da thanh toan') then coalesce(amount,0) else 0 end) as paid_total
  from public.payments
  where booking_id is not null
  group by booking_id
)
update public.bookings b
set paid_amount = coalesce(pt.paid_total, 0),
    payment_status = case
      when coalesce(b.total_price,0) > 0 and coalesce(pt.paid_total,0) >= coalesce(b.total_price,0) then 'paid'
      when coalesce(pt.paid_total,0) > 0 then 'partial'
      else 'unpaid'
    end
from payment_totals pt
where b.id = pt.booking_id;

update public.bookings b
set paid_amount = coalesce(paid_amount, 0),
    payment_status = coalesce(payment_status, 'unpaid')
where paid_amount is null or payment_status is null;

create index if not exists idx_payments_booking_status on public.payments(property_id, booking_id, status);
create index if not exists idx_payments_method on public.payments(property_id, payment_method);
create index if not exists idx_payments_due_date on public.payments(property_id, due_date);
create index if not exists idx_bookings_payment_status on public.bookings(property_id, payment_status);

create or replace view public.v_stayhub_booking_balances as
select
  b.property_id,
  b.id as booking_id,
  b.booking_code,
  b.company_id,
  b.company_name,
  b.guest_name,
  coalesce(b.total_price, 0) as total_price,
  coalesce(sum(case when p.status in ('Zaplatené','paid','Đã thanh toán','Da thanh toan') then p.amount else 0 end), 0) as paid_amount,
  greatest(0, coalesce(b.total_price,0) - coalesce(sum(case when p.status in ('Zaplatené','paid','Đã thanh toán','Da thanh toan') then p.amount else 0 end), 0)) as balance,
  case
    when coalesce(b.total_price,0) > 0 and coalesce(sum(case when p.status in ('Zaplatené','paid','Đã thanh toán','Da thanh toan') then p.amount else 0 end), 0) >= coalesce(b.total_price,0) then 'paid'
    when coalesce(sum(case when p.status in ('Zaplatené','paid','Đã thanh toán','Da thanh toan') then p.amount else 0 end), 0) > 0 then 'partial'
    else 'unpaid'
  end as payment_status
from public.bookings b
left join public.payments p on p.booking_id = b.id and p.property_id = b.property_id
group by b.property_id, b.id, b.booking_code, b.company_id, b.company_name, b.guest_name, b.total_price;
