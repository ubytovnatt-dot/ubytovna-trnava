# StayHub v3.22 – Payment RLS No-Return Success Fix

## Opravené
- Pri platbách už API nevyhodí chybu, keď Supabase UPDATE prebehne, ale RLS/select policy nevráti aktualizovaný riadok.
- Namiesto chyby:
  `Platbu sa nepodarilo aktualizovať...`
  API vráti úspech s lokálnym fallback objektom.
- Zachovaná normalizácia statusov:
  - `Đã thanh toán`, `paid` → `Zaplatené`
  - `Đang chờ`, `pending` → `Čaká`
  - `Quá hạn`, `overdue` → `Po splatnosti`

## SQL
SQL netreba púšťať.
Ak chceš mať čisté riešenie, neskôr upravíme SELECT policy na `payments`, aby UPDATE mohol vracať riadok.
