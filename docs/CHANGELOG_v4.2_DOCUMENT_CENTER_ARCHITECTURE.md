# StayHub v4.2 – Document Center Architecture Fix

## Added
- Private Supabase bucket: `stayhub-private`.
- Automatic storage path generation:
  `property_id/company-{company_id}/person-{person_id}/{document_type}/{timestamp}-{filename}`.
- Supported logical document folders: `passport`, `visa`, `photos`, `contract`, `insurance`, `work_permit`, `other`.
- New migration: `supabase/migrations/20260627_stayhub_v4_2_document_center_private_bucket.sql`.

## Changed
- Documents are no longer organized by manually created root folders.
- Removed manual signed URL editing from the document modal.
- Frontend only displays `storage_path`; previews use signed URLs returned by backend.

## Environment
Use:

```env
SUPABASE_DOCUMENTS_BUCKET=stayhub-private
SUPABASE_SERVICE_ROLE_KEY=...
```

If `SUPABASE_DOCUMENTS_BUCKET` is omitted, StayHub uses `stayhub-private` by default.
