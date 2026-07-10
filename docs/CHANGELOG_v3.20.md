# StayHub v3.20 – Payment Direct Update Fix

## Opravené
- Stav platby sa po uložení už nezostane nezmenený.
- `payments` UPDATE už nepoužíva `scopedQuery`, ktorý pri starších platbách s NULL/mismatched `property_id` mohol aktualizovať 0 riadkov.
- Pri UPDATE/INSERT platby backend zapisuje aktuálny `property_id` do riadku.
- Ak Supabase update reálne neprebehne, API už nevráti falošný úspech, ale jasnú chybu RLS/service role.

## SQL
SQL netreba púšťať, ak je vo Verceli správne `SUPABASE_SERVICE_ROLE_KEY`.
Ak service role nie je nastavený, RLS musí povoľovať INSERT/UPDATE na `payments`.
