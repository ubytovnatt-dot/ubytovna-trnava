# StayHub v3.17 – Check-in Capacity Full Fix

## Opravené
- Frontend posiela do API `booking_capacity`, `requested_beds`, `beds_count` a `reserved_beds`.
- Backend už nikdy nespadne späť na kapacitu 1, ak ide o skupinovú rezerváciu s vyššou kapacitou.
- Opravená opakovaná chyba:
  `Počet check-in osôb prekračuje kapacitu rezervácie (1)`.
- Kapacita sa počíta ako maximum z:
  - `reserved_beds.length`
  - `requested_beds`
  - `beds_count`
  - existujúce checked-in osoby
  - `booking_capacity` z frontendu

## SQL
SQL netreba púšťať.
