# StayHub v3.18 – Check-in Transient Fields Fix

## Opravené
- Frontend môže posielať pomocné polia pre validáciu kapacity:
  - `booking_capacity`
  - `requested_beds`
  - `beds_count`
  - `reserved_beds`
- Backend ich použije iba na validáciu check-in kapacity.
- Pred INSERT/UPDATE do tabuľky `checkin_persons` sa tieto pomocné polia odstránia.
- Opravená chyba Supabase:
  `Could not find the 'beds_count' column of 'checkin_persons' in the schema cache`.

## SQL
SQL netreba púšťať.
