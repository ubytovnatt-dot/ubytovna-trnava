# StayHub v4.1

Clean GitHub version for StayHub v4.1 with Unified Reservation Engine and Document Center.

## Install

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Project structure

```text
src/
  core/                  # Unified Reservation Engine
  modules/
    calendar/            # Aurora Calendar
    documents/           # Document Center module area
    dashboard/
    reservations/
    rooms/
    payments/
    companies/
    reports/
  services/
    supabase/
    storage/
  components/
  hooks/
  utils/

api/                     # Vercel serverless API
supabase/migrations/     # Supabase SQL migrations
docs/                    # Current project notes and changelogs
```

## Supabase Document Storage

Run the SQL migration:

```text
supabase/migrations/20260627_stayhub_v4_1_documents_storage.sql
```

Required environment variables are listed in `.env.example`.
