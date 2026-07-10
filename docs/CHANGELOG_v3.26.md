# StayHub v3.26 – Users, Roles & Permissions

## Doplnené
- Rozšírené role:
  - Admin
  - Správca
  - Recepcia
  - Účtovník
  - Housekeeping
  - Viewer
- Modul `Nastavenia → Používatelia a oprávnenia` zobrazuje prehľad rolí.
- Admin môže vytvoriť používateľa, odoslať Supabase pozvánku, zmeniť rolu, objekt a aktivitu.
- API má upravenú permission matrix pre nové role.
- Viewer je read-only.
- Účtovník má platby a reporty.
- Housekeeping má izby a check-out prevádzkové záznamy.

## SQL
SQL netreba púšťať, ak tabuľka `profiles` už existuje.
Ak chýbajú role v starých dátach, stačí v `profiles.role` použiť hodnoty:
`admin`, `manager`, `reception`, `accounting`, `housekeeping`, `viewer`.
