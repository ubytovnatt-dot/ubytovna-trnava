# StayHub v3.10 – Supabase Auth + Email Invitations

## Nové
- Modul používateľov v Nastaveniach pre Admin rolu.
- Email pozvánka používateľa cez Supabase Auth Admin API.
- Tabuľka `profiles` pre role a priradenie objektu.
- Roly: Admin, Správca, Recepcia.
- Úprava roly, objektu a aktívneho stavu používateľa.
- API endpoint `/api/auth/invite-user`.
- API endpoint `/api/profiles/:id/role`.

## Vercel Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- voliteľne `AUTH_REDIRECT_URL`

## SQL
Pred testom spusti:

```txt
docs/stayhub_v3_10_auth_invites.sql
```

## Bezpečnosť
`SUPABASE_SERVICE_ROLE_KEY` patrí iba do Vercel Environment Variables. Nikdy ho neukladať do GitHubu.
