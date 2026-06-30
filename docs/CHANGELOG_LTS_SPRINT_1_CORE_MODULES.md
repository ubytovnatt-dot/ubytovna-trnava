# StayHub LTS Sprint 1 – Core Modules

Type: APP ONLY
Supabase SQL: not required

## Added
- Reusable module files for Dashboard, Reservations, Smart Check-in, Payments and Timeline Calendar.
- Global mobile language switcher independent from Settings screen.
- Reusable module CSS primitives.

## Preserved
- Existing monolithic `App.jsx` screens remain functional.
- Payment Workspace logic in `App.jsx` was not removed.
- Notes display logic was not removed.
- Existing Supabase schema was not changed.

## Regression checklist
- Mobile language switcher visible globally.
- Desktop language switcher remains in header.
- SK / EN / VI state still uses the existing `i18n.js` translator.
- No SQL migration needed.
