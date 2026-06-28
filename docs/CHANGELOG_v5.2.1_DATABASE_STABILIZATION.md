# StayHub v5.2.1 – Database Stabilization

- Added safe migration `20260628_stayhub_v5_2_1_database_stabilization.sql`.
- Stabilized explicit bed inventory.
- Added `bed_id` to `checkin_persons` and backfilled it from `room_id + bed_code`.
- Added OCR fields for future Check-in OCR.
- Kept existing `bookings` table as the reservation source of truth.
- Added views for bed inventory and today's occupancy.
- Added installation guide with exact Supabase steps.
