# Inštalácia StayHub v5.4 – Payment Engine

1. Nahraj nový kód do GitHubu alebo na Vercel.
2. V Supabase otvor **SQL Editor**.
3. Spusti iba súbor:
   `supabase/migrations/20260628_stayhub_v5_4_payment_engine.sql`
4. Po úspešnom spustení sprav redeploy na Verceli.
5. Otvor StayHub → **Rezervácie**.
6. Na karte rezervácie klikni **Pridať platbu**.

Poznámka: Táto migrácia je bezpečná pre existujúcu databázu, používa `ADD COLUMN IF NOT EXISTS` a nevymazáva dáta.
