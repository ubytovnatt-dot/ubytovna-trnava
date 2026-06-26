# StayHub v3.30 – Vietnamese UI + Pricing Labels Normalization

## Opravené
- VI rozhranie už nemá miešať slovenské a vietnamské výrazy.
- Doplnené VI preklady pre:
  - Dashboard
  - Izby
  - Rezervácie
  - Kalendár
  - Check-in / Check-out
  - Platby
  - Firmy
  - Dokumenty
  - Reporty
  - Nastavenia
  - Používatelia a oprávnenia
- Zjednotené zobrazovanie cenového režimu v UI:
  - SK: `deň` / `mesiac`
  - VI: `ngày` / `tháng`
  - EN: `day` / `month`
- Backend normalizuje `bookings.pricing_model` do technických hodnôt:
  - `daily`
  - `monthly`

## Odporúčané SQL čistenie databázy
```sql
update public.bookings
set pricing_model = 'daily'
where lower(coalesce(pricing_model, '')) in ('deň','den','day','daily','ngày','ngay');

update public.bookings
set pricing_model = 'monthly'
where lower(coalesce(pricing_model, '')) in ('mesiac','mesac','month','monthly','tháng','thang');

update public.bookings
set pricing_model = 'daily'
where pricing_model is null or trim(pricing_model) = '';
```
