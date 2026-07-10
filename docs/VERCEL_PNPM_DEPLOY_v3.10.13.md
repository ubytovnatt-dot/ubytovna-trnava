# StayHub v3.10.13 – PNPM Stable Deploy

Dôvod: Vercel zlyhával už počas `npm install` hláškou `npm error Exit handler never called!`, teda pred buildom aplikácie.

Nastavenia vo Verceli:

- Framework Preset: Vite
- Install Command: prázdne
- Build Command: prázdne alebo `pnpm run build`
- Output Directory: prázdne alebo `dist`

Repo obsahuje `packageManager: pnpm@9.15.4`, takže Vercel použije pnpm automaticky.

Redeploy: Without Cache.
