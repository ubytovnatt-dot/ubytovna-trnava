# StayHub v5.1 – Core Architecture

## Added

- Core reservation architecture documentation.
- Backward-compatible Supabase migration `20260627_stayhub_v5_1_core_architecture.sql`.
- New `src/core/domainModel.js` with v5 table aliases and workflow constants.
- Expanded `src/core/reservationEngine.js` as the single source of truth for:
  - reservation normalization,
  - date-range occupancy,
  - room occupancy,
  - bed conflicts,
  - today dashboard metrics,
  - document storage path generation.

## Changed

- Default Supabase Storage bucket changed to existing `stayhub-documents`.
- Package version updated to `5.1.0`.
- API health name updated to `StayHub API v5.1 Core Architecture`.

## Notes

- No `node_modules` or `dist` included.
- Existing database tables remain compatible: `bookings` and `checkin_persons` continue to work.
- Future code may use v5 names `reservations` and `persons` through compatibility views.
