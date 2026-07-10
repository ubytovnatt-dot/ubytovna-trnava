# StayHub v3.5A.2 – Vercel config fix

## Oprava

Pôvodný `vercel.json` spôsoboval chybu **Invalid vercel.json file provided** pri deployi.

V tejto verzii je konfigurácia zjednodušená pre čistý Vite SPA deploy:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Prečo

- `framework: vite` dá Vercelu jasný typ projektu.
- `buildCommand` zostáva `npm run build`.
- `outputDirectory` zostáva `dist`.
- SPA fallback smeruje všetky frontend routy na `index.html`.
- Odstránená bola problematická API rewrite definícia.
