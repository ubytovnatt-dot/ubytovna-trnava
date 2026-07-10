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


## StayHub v4.2 Document Center

Document Center používa jeden private bucket `stayhub-private`. Priečinky sa nevytvárajú ručne v Supabase UI. Backend ich vytvorí automaticky pri uploade podľa štruktúry:

```text
stayhub-private/
  postova-3/
    company-{company_id}/
      person-{person_id}/
        passport/
        visa/
        photos/
        contract/
        insurance/
        work_permit/
        other/
```

Pred deployom spusti migráciu:

```text
supabase/migrations/20260627_stayhub_v4_2_document_center_private_bucket.sql
```

Vo Verceli nastav:

```env
SUPABASE_DOCUMENTS_BUCKET=stayhub-private
SUPABASE_SERVICE_ROLE_KEY=...
```

## StayHub v5.1 Core Architecture

StayHub v5.1 uses reservation as the single source of truth. The existing tables remain compatible:

- `bookings` = reservations
- `checkin_persons` = persons
- `stayhub-documents` = private document bucket for AI OCR uploads

Before production OCR, confirm that Supabase Storage has the private bucket `stayhub-documents` and run:

```sql
supabase/migrations/20260627_stayhub_v5_1_core_architecture.sql
```
commit changes do main


<!-- deploy trigger v6.4.9 2026-07-10 -->
