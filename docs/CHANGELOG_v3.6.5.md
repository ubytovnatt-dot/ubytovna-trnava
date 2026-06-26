# StayHub v3.6.5 – Vercel Config Fix

## Oprava deploy
- Odstránený starší zápis `version: 2` z `vercel.json`.
- Pridaný oficiálny `$schema` pre Vercel konfiguráciu.
- Nastavený framework `vite`.
- Upravené rewrites na aktuálny tvar `/api/:path*` a SPA fallback `/:path*`.
- Zachovaný build command `npm run build` a output directory `dist`.

## Overenie
- `npm install` prešiel úspešne.
- `npm run build` prešiel úspešne.
