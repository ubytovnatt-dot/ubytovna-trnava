# StayHub v3.6.6 – Node 24 Vercel Fix

## Oprava deployu
- Nastavené `engines.node` na `24.x` podľa aktuálnej požiadavky Vercel.
- Zachovaná validná konfigurácia `vercel.json` pre Vite + API rewrites.
- Cieľ: odstrániť hlásenie `Node.js version 20.x is deprecated`.

## Poznámka
Vercel log ukazoval, že build aj deployment prešli, ale používal sa Node 20.x. Od tejto verzie má projekt explicitne Node 24.x.
