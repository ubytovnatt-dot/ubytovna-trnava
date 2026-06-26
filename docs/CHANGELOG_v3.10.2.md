# StayHub v3.10.2 – VI i18n + Calendar Sync Fix

## Opravy
- doplnené vietnamské a anglické preklady pre nové moduly: kalendár, dokumenty, reporty, role, používatelia, check-in/check-out, formuláre a tabuľky
- prekladá sa aj text v `<option>`, `placeholder`, `title` a `aria-label`
- kalendár obsadenosti už neblokuje lôžko donekonečna pre každú `checked_in` osobu; rešpektuje `checkin_at` a `checkout_at`
- aktualizovaný text verzie v nastaveniach

## SQL
Nie je potrebný nový SQL skript.
