# StayHub v3.16 – Check-in Capacity API Fix

## Opravené
- API validácia check-inu už nepovažuje staré rezervácie s `requested_beds > reserved_beds.length` za kapacitu 1.
- Pri check-ine sa kapacita počíta ako maximum z:
  - `reserved_beds.length`
  - `requested_beds`
  - `beds_count`
- Pri starších/neúplných dátach systém dovolí upraviť existujúce check-in osoby bez falošnej chyby `kapacita rezervácie (1)`.
- Zachovaná ochrana proti prekročeniu skutočnej kapacity rezervácie.

## Poznámka
SQL netreba púšťať.
