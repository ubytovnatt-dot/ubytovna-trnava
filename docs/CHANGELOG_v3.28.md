# StayHub v3.28 – Backend Profile Loading Fix

## Opravené
- Backend načíta profil spoľahlivejšie:
  1. najprv podľa `auth.users.id`,
  2. potom fallback podľa emailu,
  3. ak profil chýba, automaticky ho vytvorí cez `SUPABASE_SERVICE_ROLE_KEY`,
  4. ak profil existuje s iným ID, normalizuje ho na aktuálny `auth.users.id`.
- `profiles.role` má prednosť pred `user_metadata.role`.
- Pri chybe tabuľky `profiles` backend nespadne do chybného stavu, ale použije bezpečný fallback.
- `/api/me` tak vie vrátiť správnu rolu a horný panel prestane držať starú hodnotu `Recepcia`, ak je používateľ v `profiles` admin.

## Dôležité
Po deployi sa treba odhlásiť a prihlásiť znova.

## SQL
SQL netreba púšťať, ak tabuľka `profiles` existuje.
