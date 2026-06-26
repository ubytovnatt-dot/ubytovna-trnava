# StayHub v3.6.2 – Timeline Occupancy Hard Fix

- Opravené predĺženie denných buniek v Calendar timeline po check-ine.
- Check-in osoba sa pri zobrazení páruje s rezerváciou podľa lôžka, dátumu a firmy/mena.
- Ak má osoba chybne dlhší `expected_checkout_date`, denná mriežka ho oreže podľa konca naviazanej rezervácie.
- Rezervácia 26.06 → 28.06 sa zobrazuje len v intervale 26.06–27.06, nie na 28.06/29.06.
