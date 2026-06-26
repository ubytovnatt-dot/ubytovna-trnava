# StayHub v3.10.5 – Users Invite Setup

## Vercel Environment Variables

Required for email invitations:

```txt
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
AUTH_REDIRECT_URL=https://<your-vercel-domain>/auth/callback
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
```

Do not use `VITE_SUPABASE_ANON_KEY` for invitations. The invite endpoint must use the server-only service role key.
The frontend uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` only for user login.

## Supabase Auth URL Configuration

Set:

```txt
Site URL: https://<your-vercel-domain>
Redirect URLs: https://<your-vercel-domain>/auth/callback
```

## Troubleshooting

`User not allowed` means Supabase did not receive a valid service role key. Check Vercel env vars and redeploy without cache.

## Production Security

Run `docs/production_security_upgrade.sql` in Supabase SQL Editor before storing real booking, payment, guest, or document data.
It removes anonymous write/delete policies and enables role-based access for authenticated users.
