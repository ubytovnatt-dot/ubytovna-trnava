# StayHub v5.2 Core Architecture

## Jediný zdroj pravdy
`bookings` je reservation table. Nepridávame novú tabuľku `reservations`, aby sme nerozbili existujúce dáta.

## Hlavné tabuľky
- `rooms` – izby a kapacita
- `beds` – jednotlivé lôžka odvodené z kapacity izieb
- `bookings` – rezervácie / skupiny / firmy
- `checkin_persons` – reálni ubytovaní hostia
- `companies` – firmy vytvárané v rezervácii
- `payments` – platby naviazané na booking
- `documents` – doklady a OCR metadata

## Kalendár
Kalendár nikdy nepoužíva iba dátum check-inu. Obsadenosť sa počíta podľa:

`booking.check_in_date <= deň < booking.check_out_date`

Check-out deň je už voľný pre ďalšiu rezerváciu.
