# StayHub v4.0 – Unified Reservation Engine

## Hlavná zmena
StayHub prechádza z oddelených stavov modulov na jednotný zdroj pravdy: `src/core/reservationEngine.js`.

## Opravené
- Check-out už nezanechá osobu v rezervovanej / obsadenej izbe.
- Po check-oute osoby sa skontroluje celá rezervácia.
- Ak v rezervácii nezostal žiadny aktívny hosť, rezervácia sa automaticky prepne na `Ukončená`.
- Dashboard, Izby a Aurora Calendar čítajú z rovnakého enginu.
- Aktívna rezervácia už nezduplikuje obsadenie tam, kde existuje aktívny check-in hosť.

## Nový core modul
- `src/core/reservationEngine.js`
- jednotné statusy rezervácií
- výpočet aktívnych rezervácií
- výpočet obsadenosti izby
- aktívne lôžka rezervácie
- centrálna kontrola po check-oute

## Aurora Calendar
- označený ako StayHub v4.0
- timeline číta aktívne rezervácie a osoby cez URE
- ukončené rezervácie sa už nezobrazujú ako rezervované bloky

## Vercel
- zachovaný čistý Vite SPA deploy cez `vercel.json`
