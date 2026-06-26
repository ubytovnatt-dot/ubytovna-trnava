# StayHub v3.23 – Payment Verified Update Fix

## Opravené
- Backend už nevráti úspech, ak sa stav platby reálne nezmenil v DB.
- Platba sa po UPDATE vždy znovu overí cez SELECT.
- Pri zaplatenej platbe sa striktne nastaví:
  - `status = 'Zaplatené'`
  - `paid_date`
  - `paid_at`
- Ak update podľa `id` nestačí, backend skúsi update podľa `payment_code`.
- Ak DB stále drží starý stav, API vráti presnú chybu s aktuálnym DB statusom.

## SQL
SQL netreba púšťať.
Ak API zahlási, že DB status sa nezmenil, bude potrebné skontrolovať trigger na tabuľke `payments`.
