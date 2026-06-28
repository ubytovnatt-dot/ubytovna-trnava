# Inštalácia v5.3.2

1. Nahraj nový ZIP/GitHub commit do Vercelu.
2. V Supabase SQL Editor spusti iba tento súbor:

`supabase/migrations/20260628_stayhub_v5_3_2_reservation_engine_fix.sql`

3. Vo Verceli sprav redeploy.
4. Otestuj:
   - vytvor rezerváciu s 2–3 lôžkami,
   - sprav check-in prvej osoby,
   - over, že lôžko je `ubytované`, nie aj `rezervované`,
   - sprav check-in poslednej osoby,
   - over, že rezervácia už nie je v sekcii `Čaká na check-in`,
   - sprav check-out osoby,
   - over, že jej lôžko je voľné,
   - po check-oute poslednej osoby sa rezervácia zmení na `Ukončená`.
