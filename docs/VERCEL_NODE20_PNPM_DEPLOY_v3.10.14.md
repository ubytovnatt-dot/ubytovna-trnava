# StayHub v3.10.14 – Node 20 + PNPM Ready

Vercel nastavenie:

1. Settings → General → Node.js Version → `20.x`

2. Build & Development Settings:

- Install Command:
`corepack enable && corepack prepare pnpm@9.15.4 --activate && pnpm install --no-frozen-lockfile`

- Build Command:
`pnpm run build`

- Output Directory:
`dist`

3. Deployments → Redeploy → Without Cache

Neuploadovať: `node_modules`, `dist`, `.vercel`, `package-lock.json`.
