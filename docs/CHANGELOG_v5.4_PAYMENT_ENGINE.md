# StayHub v5.4 – Payment Engine

## Zmeny
- Platby sú priamo v detaile rezervácie, nie ako samostatný modul v hlavnom menu.
- Každá rezervácia zobrazuje cenu, zaplatené a zostáva.
- Tlačidlo **Pridať platbu** je priamo na karte rezervácie.
- Platiteľ sa dedí z rezervácie: firma alebo osoba.
- Podporované spôsoby platby: hotovosť, karta, bankový prevod, iné.
- API po vytvorení, úprave alebo vymazaní platby prepočíta `bookings.paid_amount` a `bookings.payment_status`.
- Pridaná bezpečná migrácia `20260628_stayhub_v5_4_payment_engine.sql`.

## Supabase
Spusti iba novú migráciu:

```sql
supabase/migrations/20260628_stayhub_v5_4_payment_engine.sql
```

Staršie migrácie nespúšťaj znova.
