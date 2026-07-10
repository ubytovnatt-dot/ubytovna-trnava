# StayHub v3.5A.2.5 – Aurora Occupancy Sync Fix

## Opravené

- Timeline už nevyznačuje viac dní, než trvá rezervácia alebo reálny pobyt.
- Check-in osoba bez uloženého `booking_id` sa spätne páruje s rezerváciou podľa lôžka, dátumu nástupu a dostupných údajov.
- Denné bunky v timeline používajú efektívny koniec pobytu:
  1. skutočný check-out osoby,
  2. očakávaný check-out osoby,
  3. check-out naviazanej rezervácie,
  4. koniec viditeľného rozsahu iba ako posledný fallback.
- Rezervácia a check-in osoba na rovnakom lôžku už nevytvárajú falošné predĺženie obsadenosti.

## Príklad opravy

Rezervácia `2026-06-26 → 2026-06-28` sa v Aurora Timeline zobrazí len na daný rozsah a nebude pokračovať na ďalšie dni.
