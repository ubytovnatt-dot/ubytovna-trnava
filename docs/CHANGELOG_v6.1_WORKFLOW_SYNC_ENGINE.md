# StayHub v6.1 – Workflow Sync Engine

## Cieľ
Zjednotiť dáta podľa reálneho workflow recepcie, aby sa rovnaká rezervácia, osoba, lôžko, platba, kalendár a dashboard nikdy nezobrazovali v rozdielnych stavoch.

## Opravené
- Check-in presunie lôžko zo stavu rezervované do obsadené.
- Po check-ine poslednej osoby rezervácia už nezostáva ako čakajúca na check-in.
- Check-out uvoľní konkrétne lôžko.
- Po check-oute poslednej osoby sa rezervácia ukončí.
- `reserved_beds` sa čistí podľa stavu osôb.
- Tabuľka `beds` sa prepočíta na `available / reserved / occupied`.
- Platby sa synchronizujú späť do `bookings.paid_amount` a `bookings.payment_status`.
- Dashboard, Rezervácie, Check-in/Check-out, Platby a Kalendár sa načítavajú po backend synchronizácii.

## Backend
Pridaný endpoint:

```text
POST /api/workflow/sync
```

Endpoint prepočíta:

- `bookings`
- `checkin_persons`
- `beds`
- `payments`

## Supabase
Nová migrácia nie je potrebná.
Používa existujúce tabuľky z v5.2.1 a v5.3.2.
