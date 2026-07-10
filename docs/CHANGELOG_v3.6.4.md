# StayHub v3.6.4 – Dashboard Data Binding Fix

## Oprava
- Dashboard už nepoužíva nulové/stará hodnoty z `/api/stats` ako primárny zdroj.
- Hlavné karty sa počítajú priamo z rovnakých dát ako Rooms a Calendar: `rooms`, `bookings`, `people`.
- Pri prvom načítaní sa už nemá zobrazovať `0/0`, keď sú izby a rezervácie už načítané.
- `/api/stats` zostáva len ako fallback, ak ešte nie sú načítané izby.

## Test
- `npm run build` prešiel úspešne.
