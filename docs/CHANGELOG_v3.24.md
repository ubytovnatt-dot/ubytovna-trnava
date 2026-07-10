# StayHub v3.24 – Check-in / Check-out Date Boundaries

## Opravené / doplnené
- Check-in je povolený najskôr v prvý deň rezervácie.
- Check-in nie je povolený po poslednom dni rezervácie.
- Check-out je povolený najneskôr v posledný deň rezervácie.
- Check-out nie je povolený pred začiatkom rezervácie.
- Kontrola je v API (`api/index.js`), nie v SQL.

## Príklad
Rezervácia: `01.07.2026 → 31.07.2026`

Povolené:
- Check-in od `01.07.2026`
- Check-out najneskôr `31.07.2026`

Nepovolené:
- Check-in `30.06.2026`
- Check-out `01.08.2026`

## SQL
SQL netreba púšťať.
