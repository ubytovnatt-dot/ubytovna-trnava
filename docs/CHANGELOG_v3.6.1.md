# StayHub v3.6.1 – Dashboard First Load Fix

## Opravené
- Dashboard sa pri prvom načítaní už nezasekne na hodnotách 0/0, keď zlyhá jeden z voliteľných API endpointov.
- Dáta sa načítavajú nezávisle: rooms, bookings, payments, companies, check-in persons, documents, stats.
- Pri čiastočnej chybe ostanú dostupné údaje zobrazené a chyba sa ukáže iba ako upozornenie.
- Branding v UI ostáva čistý: StayHub / Dashboard / Calendar.

## Technická poznámka
Pôvodné `Promise.all` zhodilo celé načítanie pri jednej chybe. Nová verzia používa `Promise.allSettled`.
