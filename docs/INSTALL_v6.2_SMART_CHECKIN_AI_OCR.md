# Inštalácia StayHub v6.2 – Smart Check-in / AI OCR

## Typ verzie

APP ONLY – Supabase SQL netreba spúšťať.

## Postup

1. Rozbaľ ZIP.
2. Nahraj obsah do GitHub repozitára.
3. Vo Verceli skontroluj Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
4. Redeploy vo Verceli.
5. V aplikácii otvor `Check-in / Check-out`.
6. Vyber rezerváciu v sekcii Príchody.
7. Vyber osobu/lôžko.
8. Vyber `Pas` alebo `Občiansky preukaz`.
9. Nahraj alebo odfoť doklad.
10. Klikni `Skontrolovať fotku` a potom `AI OCR`.
11. Skontroluj údaje a potvrď check-in.

## Poznámka

Ak OCR vráti chybu `Chýba OPENAI_API_KEY`, problém nie je v Supabase, ale vo Vercel Environment Variables.
