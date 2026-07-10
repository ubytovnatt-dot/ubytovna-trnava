# StayHub v5.3.2 – Reservation Engine Fix

## Opravené

- Check-in presunie lôžko zo stavu `rezervované` do stavu `ubytované`.
- Po check-ine poslednej osoby sa rezervácia už nezobrazuje ako čakajúca na check-in.
- Check-out zmení konkrétne lôžko na voľné.
- Ak odišla posledná osoba a v rezervácii nezostali rezervované lôžka, rezervácia sa automaticky ukončí.
- Dashboard/izby/kalendár už nemajú počítať jedno lôžko naraz ako rezervované aj obsadené.
- Availability kontroluje nielen `bookings.reserved_beds`, ale aj fyzicky ubytované osoby v `checkin_persons`.

## Databáza

Voliteľná bezpečná migrácia:

`supabase/migrations/20260628_stayhub_v5_3_2_reservation_engine_fix.sql`

Ak si už ručne doplnil `checked_out_at`, migrácia je stále bezpečná.
