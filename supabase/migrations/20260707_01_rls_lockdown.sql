-- =====================================================================
-- StayHub – RLS LOCKDOWN (KRITICKÉ)
-- Dátum: 2026-07-07
-- Cieľ: zavrieť anonymný prístup k databáze. Po spustení už verejný
--       publishable/anon kľúč NESMIE čítať ani zapisovať do tabuliek.
-- Spustiť: Supabase → SQL Editor → Run. Je idempotentné (dá sa spustiť viackrát).
-- =====================================================================

-- 0) Pomocné funkcie na role (ak ešte neexistujú).
create or replace function public.current_profile_role()
returns text language sql security definer set search_path = public as $$
  select coalesce((select role from public.profiles
                   where id = auth.uid() and is_active is not false), 'none');
$$;

create or replace function public.has_profile_role(allowed_roles text[])
returns boolean language sql security definer set search_path = public as $$
  select public.current_profile_role() = any(allowed_roles);
$$;

create or replace function public.is_active_profile()
returns boolean language sql security definer set search_path = public as $$
  select public.current_profile_role() <> 'none';
$$;

-- 1) Zapnúť RLS na všetkých tabuľkách.
alter table public.rooms            enable row level security;
alter table public.companies        enable row level security;
alter table public.bookings         enable row level security;
alter table public.payments         enable row level security;
alter table public.checkin_persons  enable row level security;
alter table public.documents        enable row level security;
alter table public.profiles         enable row level security;
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='beds')
  then execute 'alter table public.beds enable row level security'; end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='audit_logs')
  then execute 'alter table public.audit_logs enable row level security'; end if;
end $$;

-- 2) ZMAZAŤ všetky otvorené "anon" politiky (zdroj úniku dát).
--    Pochádzajú z docs/supabase_schema.sql (using(true) pre anon).
do $$
declare pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname='public'
      and (
        'anon' = any(roles)                    -- politiky priradené anon roli
        or policyname ilike '%anon%'           -- pomenované ...anon...
      )
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- 3) Odobrať priame tabuľkové práva anon/public (obrana navyše).
--    Prihlásený prístup ide cez rolu 'authenticated' + politiky nižšie.
revoke all on all tables    in schema public from anon;
revoke all on all sequences in schema public from anon;
-- (voliteľné, ak nechceš žiadny public grant)
-- revoke all on all tables in schema public from public;

-- 4) Rolové politiky len pre 'authenticated'. (Idempotentné cez drop/create.)
-- ROOMS
drop policy if exists rooms_read   on public.rooms;
drop policy if exists rooms_write  on public.rooms;
drop policy if exists rooms_update on public.rooms;
drop policy if exists rooms_delete on public.rooms;
create policy rooms_read   on public.rooms for select to authenticated using (public.is_active_profile());
create policy rooms_write  on public.rooms for insert to authenticated with check (public.has_profile_role(array['admin','manager','housekeeping']));
create policy rooms_update on public.rooms for update to authenticated using (public.has_profile_role(array['admin','manager','housekeeping'])) with check (public.has_profile_role(array['admin','manager','housekeeping']));
create policy rooms_delete on public.rooms for delete to authenticated using (public.has_profile_role(array['admin']));

-- COMPANIES
drop policy if exists companies_read   on public.companies;
drop policy if exists companies_write  on public.companies;
drop policy if exists companies_update on public.companies;
drop policy if exists companies_delete on public.companies;
create policy companies_read   on public.companies for select to authenticated using (public.is_active_profile());
create policy companies_write  on public.companies for insert to authenticated with check (public.has_profile_role(array['admin','manager']));
create policy companies_update on public.companies for update to authenticated using (public.has_profile_role(array['admin','manager'])) with check (public.has_profile_role(array['admin','manager']));
create policy companies_delete on public.companies for delete to authenticated using (public.has_profile_role(array['admin']));

-- BOOKINGS
drop policy if exists bookings_read   on public.bookings;
drop policy if exists bookings_write  on public.bookings;
drop policy if exists bookings_update on public.bookings;
drop policy if exists bookings_delete on public.bookings;
create policy bookings_read   on public.bookings for select to authenticated using (public.is_active_profile());
create policy bookings_write  on public.bookings for insert to authenticated with check (public.has_profile_role(array['admin','manager','reception']));
create policy bookings_update on public.bookings for update to authenticated using (public.has_profile_role(array['admin','manager','reception'])) with check (public.has_profile_role(array['admin','manager','reception']));
create policy bookings_delete on public.bookings for delete to authenticated using (public.has_profile_role(array['admin']));

-- PAYMENTS  (OPRAVA bodu 8 – už NIE using(true))
drop policy if exists payments_read   on public.payments;
drop policy if exists payments_write  on public.payments;
drop policy if exists payments_update on public.payments;
drop policy if exists payments_delete on public.payments;
create policy payments_read   on public.payments for select to authenticated using (public.has_profile_role(array['admin','manager','reception','accounting']));
create policy payments_write  on public.payments for insert to authenticated with check (public.has_profile_role(array['admin','manager','reception','accounting']));
create policy payments_update on public.payments for update to authenticated using (public.has_profile_role(array['admin','manager','reception','accounting'])) with check (public.has_profile_role(array['admin','manager','reception','accounting']));
create policy payments_delete on public.payments for delete to authenticated using (public.has_profile_role(array['admin']));

-- CHECKIN_PERSONS
drop policy if exists checkin_read   on public.checkin_persons;
drop policy if exists checkin_write  on public.checkin_persons;
drop policy if exists checkin_update on public.checkin_persons;
drop policy if exists checkin_delete on public.checkin_persons;
create policy checkin_read   on public.checkin_persons for select to authenticated using (public.is_active_profile());
create policy checkin_write  on public.checkin_persons for insert to authenticated with check (public.has_profile_role(array['admin','manager','reception','housekeeping']));
create policy checkin_update on public.checkin_persons for update to authenticated using (public.has_profile_role(array['admin','manager','reception','housekeeping'])) with check (public.has_profile_role(array['admin','manager','reception','housekeeping']));
create policy checkin_delete on public.checkin_persons for delete to authenticated using (public.has_profile_role(array['admin']));

-- DOCUMENTS (osobné doklady – len admin/manager)
drop policy if exists documents_read   on public.documents;
drop policy if exists documents_write  on public.documents;
drop policy if exists documents_update on public.documents;
drop policy if exists documents_delete on public.documents;
create policy documents_read   on public.documents for select to authenticated using (public.has_profile_role(array['admin','manager']));
create policy documents_write  on public.documents for insert to authenticated with check (public.has_profile_role(array['admin','manager']));
create policy documents_update on public.documents for update to authenticated using (public.has_profile_role(array['admin','manager'])) with check (public.has_profile_role(array['admin','manager']));
create policy documents_delete on public.documents for delete to authenticated using (public.has_profile_role(array['admin']));

-- PROFILES (vlastný profil alebo admin)
drop policy if exists profiles_read   on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_read   on public.profiles for select to authenticated using (auth.uid() = id or public.has_profile_role(array['admin']));
create policy profiles_update on public.profiles for update to authenticated using (public.has_profile_role(array['admin'])) with check (public.has_profile_role(array['admin']));

-- BEDS / AUDIT_LOGS (ak existujú)
do $$ begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='beds') then
    execute 'drop policy if exists beds_read on public.beds';
    execute 'drop policy if exists beds_write on public.beds';
    execute 'create policy beds_read on public.beds for select to authenticated using (public.is_active_profile())';
    execute 'create policy beds_write on public.beds for all to authenticated using (public.has_profile_role(array[''admin'',''manager''])) with check (public.has_profile_role(array[''admin'',''manager'']))';
  end if;
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='audit_logs') then
    execute 'drop policy if exists audit_read on public.audit_logs';
    execute 'drop policy if exists audit_insert on public.audit_logs';
    execute 'create policy audit_read on public.audit_logs for select to authenticated using (public.has_profile_role(array[''admin'']))';
    execute 'create policy audit_insert on public.audit_logs for insert to authenticated with check (public.is_active_profile())';
  end if;
end $$;

-- =====================================================================
-- 5) OVERENIE – po spustení musí byť tento výsledok PRÁZDNY:
--    (žiadna tabuľka nesmie mať politiku pre rolu anon)
-- =====================================================================
-- select tablename, policyname, roles
-- from pg_policies
-- where schemaname='public' and 'anon' = any(roles);
--
-- A test z prehliadača (s publishable kľúčom) musí vrátiť 401/prázdno:
--   fetch(URL+'/rest/v1/bookings?select=*', {headers:{apikey:KEY, Authorization:'Bearer '+KEY}})
