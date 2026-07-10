# StayHub v4.5.1 – Calendar Occupancy Range Fix

## Opravené
- Kalendár už neoznačuje izbu/lôžko ako obsadené len podľa dátumu check-in.
- Obsadenosť sa počíta podľa celého rozsahu rezervácie: `check_in_date <= deň < check_out_date`.
- Check-in osoby už nepredlžuje obsadenosť do budúcnosti bez limitu.
- Plánovaný check-out rezervácie je hranica obsadenosti v kalendári.
- Odchody sa počítajú na skutočný deň `check_out_date`.

## Technické zmeny
- `src/modules/calendar/AuroraCalendar.jsx` teraz používa `parseBeds()` pre všetky rezervované lôžka.
- Kalendár používa rezerváciu ako hlavný zdroj pravdy pre dátumový rozsah.
- `checked_in` osoba je iba stav osoby, nie samostatný nekonečný occupancy event.
