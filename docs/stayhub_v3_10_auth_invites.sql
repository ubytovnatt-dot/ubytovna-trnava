-- StayHub v3.10 Auth + Email Invitations
-- Spusti v Supabase SQL Editor pred testovaním pozvánok používateľov.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role text not null default 'reception' check (role in ('admin','manager','reception')),
  property_id text default 'postova-3',
  is_active boolean default true,
  invited_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_property_id_idx on public.profiles(property_id);

alter table public.profiles enable row level security;

-- Čítanie profilov pre prihlásených používateľov.
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated"
on public.profiles for select
to authenticated
using (true);

-- Používateľ môže upraviť len vlastný profil, nie rolu.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Poznámka:
-- Pozývanie používateľov v aplikácii ide cez /api/auth/invite-user,
-- ktorý musí bežať so SUPABASE_SERVICE_ROLE_KEY vo Vercel Environment Variables.
-- Service role obchádza RLS, preto ho nikdy nedávaj do frontendu ani GitHubu.
