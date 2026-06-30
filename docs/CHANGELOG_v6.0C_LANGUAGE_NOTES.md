# StayHub v6.0C – Language Consistency + Notes Restore

## Zmeny

- Zjednotený jazyk UI pre prepínač SK / EN / VI.
- Rozšírený centrálny prekladový slovník pre nové v6 Apple UI obrazovky.
- Preklad sa aplikuje aj na select options, title, aria-label a placeholder texty.
- Mobile bottom navigation používa preklady priamo cez `t()`.
- Dátum na obrazovke Dnes používa lokalizáciu podľa zvoleného jazyka.
- Rola a fallback používateľský text v hlavičke sa zobrazujú v zvolenom jazyku.
- Obnovené zobrazenie poznámok v:
  - kartách rezervácií,
  - príchodoch/check-ine,
  - zozname ubytovaných osôb pri check-oute,
  - tabuľke platieb.

## Supabase

- Bez novej migrácie.
- Používa existujúce polia `note`, `notes`, `internal_note`, prípadne `checkout_note`.

## Test

- `npm run build` prešiel úspešne.
