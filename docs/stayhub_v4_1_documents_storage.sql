-- StayHub v4.1 Document Center + Supabase Storage
-- Spusti v Supabase SQL Editori. Safe to run repeatedly.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id TEXT DEFAULT 'postova-3',
  person_id UUID NULL,
  person_name TEXT NULL,
  company_id UUID NULL,
  company_name TEXT NULL,
  booking_id UUID NULL,
  document_type TEXT NOT NULL DEFAULT 'Pas',
  document_number TEXT NULL,
  issue_date DATE NULL,
  expiry_date DATE NULL,
  file_url TEXT NULL,
  storage_path TEXT NULL,
  file_name TEXT NULL,
  mime_type TEXT NULL,
  size_bytes BIGINT NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS property_id TEXT DEFAULT 'postova-3';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS person_id UUID NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS person_name TEXT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS company_id UUID NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS company_name TEXT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS booking_id UUID NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'Pas';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS document_number TEXT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS issue_date DATE NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS expiry_date DATE NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_url TEXT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS storage_path TEXT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS file_name TEXT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS mime_type TEXT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS size_bytes BIGINT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS note TEXT NULL;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_documents_property_id ON public.documents(property_id);
CREATE INDEX IF NOT EXISTS idx_documents_person_id ON public.documents(person_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON public.documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_storage_path ON public.documents(storage_path);

-- One private bucket with folders: passports/, visas/, photos/.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stayhub-documents',
  'stayhub-documents',
  false,
  8388608,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 8388608,
  allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp','image/heic','image/heif'];

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_read_manager" ON public.documents;
CREATE POLICY "documents_read_manager" ON public.documents
FOR SELECT USING (true);

DROP POLICY IF EXISTS "documents_write_manager" ON public.documents;
CREATE POLICY "documents_write_manager" ON public.documents
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "documents_update_manager" ON public.documents;
CREATE POLICY "documents_update_manager" ON public.documents
FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "documents_delete_admin" ON public.documents;
CREATE POLICY "documents_delete_admin" ON public.documents
FOR DELETE USING (true);

-- Storage upload runs through the server API with SUPABASE_SERVICE_ROLE_KEY.
-- Keep bucket private; app returns signed URLs for preview/download.
