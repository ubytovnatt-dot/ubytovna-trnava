# StayHub v4.0.1 – White Screen Hotfix

## Opravené

- Opravené Vercel routovanie pre API endpointy (`/api/*`).
- Pridaný catch-all serverless handler `api/[...path].js`.
- SPA fallback ostáva iba pre frontend routy, nie pre API.
- Frontend už nespadne, ak API vráti neočakávaný objekt namiesto poľa.
- `npm run build` overený úspešne.

## Dôvod chyby

Predošlé `vercel.json` posielalo všetky routy vrátane `/api/rooms`, `/api/bookings`, `/api/checkin-persons` na `index.html`. Frontend potom čítal HTML namiesto JSON dát a po prihlásení mohol spadnúť do bielej obrazovky.
