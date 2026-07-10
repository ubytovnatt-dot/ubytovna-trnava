# StayHub v3.21 – Payment Status Normalization Fix

## Opravené
- Stav platby sa pred zápisom normalizuje do kanonických DB hodnôt:
  - `Zaplatené`
  - `Čaká`
  - `Po splatnosti`
- Podporené sú aj VI/EN hodnoty z UI:
  - `Đã thanh toán`, `paid` → `Zaplatené`
  - `Đang chờ`, `pending` → `Čaká`
  - `Quá hạn`, `overdue` → `Po splatnosti`
- Pri zaplatenej platbe sa doplní `paid_date` aj `paid_at`.
- Ak update podľa `id` nevráti riadok, backend skúsi fallback podľa `payment_code`.

## SQL
SQL netreba púšťať.
