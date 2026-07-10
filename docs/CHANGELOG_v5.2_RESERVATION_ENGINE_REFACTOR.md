# StayHub v5.2 – Reservation Engine Refactor

## Cieľ
Zachovať existujúcu Supabase databázu a urobiť z tabuľky `bookings` jediný zdroj pravdy pre rezervácie.

## Zmeny
- pridaný inventár lôžok `beds`, generovaný z `rooms.capacity`,
- `bookings` zostáva hlavná tabuľka rezervácií,
- `checkin_persons` zostáva tabuľka osôb pri check-ine,
- `documents` rozšírené o OCR stav a OCR JSON,
- kalendár a obsadenosť sa počítajú podľa celého intervalu `check_in_date → check_out_date`,
- aktívne osoby sa už nepočítajú donekonečna mimo dátumov rezervácie,
- API podporuje `/api/beds`,
- existujúci bucket zostáva `stayhub-documents`.

## Supabase
Spusti migráciu:

`supabase/migrations/20260628_stayhub_v5_2_reservation_engine_refactor.sql`

Migrácia je bezpečná: používa `if not exists` a existujúce dáta nemaže.
