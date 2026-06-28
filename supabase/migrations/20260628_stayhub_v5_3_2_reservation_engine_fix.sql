-- StayHub v5.3.2 – Reservation Engine Fix
-- Safe migration. It only adds missing checkout/OCR support columns used by the engine.

alter table public.checkin_persons
  add column if not exists checked_out_at timestamptz;

update public.checkin_persons
set checked_out_at = coalesce(checked_out_at, checkout_at, actual_check_out)
where checked_out_at is null;

create index if not exists idx_checkin_persons_checked_out_at
  on public.checkin_persons(checked_out_at);

-- Support columns used by the state engine if they are missing in older DBs.
alter table public.bookings
  add column if not exists actual_check_in timestamptz,
  add column if not exists actual_check_out timestamptz;

create index if not exists idx_bookings_actual_checkout
  on public.bookings(property_id, actual_check_out);
