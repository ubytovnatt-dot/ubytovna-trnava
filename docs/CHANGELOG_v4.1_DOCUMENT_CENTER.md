# StayHub v4.1 – Document Center + Supabase Storage

## Added
- New document upload workflow in the Documents modal.
- Supabase Storage upload through `/api/documents/upload`.
- Private bucket `stayhub-documents` with logical folders:
  - `passports/`
  - `visas/`
  - `photos/`
- Document metadata columns:
  - `storage_path`
  - `file_name`
  - `mime_type`
  - `size_bytes`
- File picker supports PDF and images, including mobile camera capture.
- Preview link uses signed Supabase URL.

## Notes
- Add Vercel env variable `SUPABASE_SERVICE_ROLE_KEY` for secure server-side upload.
- Optional env variable: `SUPABASE_DOCUMENTS_BUCKET=stayhub-documents`.
- Run `docs/stayhub_v4_1_documents_storage.sql` in Supabase SQL Editor before production use.
