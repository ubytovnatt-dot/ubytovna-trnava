# StayHub v3.25 – Dashboard i18n + Today Counters

## Opravené
- Dashboard už nemieša SK/VI texty pri vietnamčine.
- Karty izieb používajú i18n pre:
  - Ubytovaní / Đang ở
  - Rezervované / Đã đặt
  - Voľné / Trống
- `Check-in dnes` sa počíta zo skutočných check-in osôb (`actual_check_in`, `checked_in_at`, `checkin_at`), nie zo začiatku rezervácie.
- `Check-out dnes` sa počíta zo skutočného check-out dátumu (`actual_check_out`, `checkout_at`).
- Tržby uhradené sa počítajú z aktuálne načítaných platieb.

## SQL
SQL netreba púšťať.
