# StayHub v3.19 – Payment Update Fallback Fix

## Opravené
- Platby teraz používajú robustný fallback pri UPDATE, podobne ako rezervácie a check-in osoby.
- Opravená chyba pri editácii platby:
  `Zaznam sa nepodarilo aktualizovat alebo vratit zo Supabase.`
- Backend odstráni pomocné/formulárové polia z payloadu pred zápisom do tabuľky `payments`.
- Ak Supabase update prebehne, ale nevráti riadok kvôli RLS/select policy, API vráti bezpečný fallback objekt.

## SQL
SQL netreba púšťať.
