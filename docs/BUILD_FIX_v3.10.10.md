# StayHub v3.10.10 Build Fix

- Removed package-lock.json because previous lock could reference an internal registry.
- Added .npmrc forcing npmjs registry.
- Added vite.config.js.
- Keep Vercel install command: npm install --no-audit --fund=false
- Build command: npm run build
- Output directory: dist
