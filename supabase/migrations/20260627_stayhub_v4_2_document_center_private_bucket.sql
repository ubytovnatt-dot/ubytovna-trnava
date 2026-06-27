-- StayHub v4.2 Document Center Architecture Fix
-- One private bucket + automatic object paths by property/company/person/document type.

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
  storage_bucket TEXT DEFAULT 'stayhub-private',
  storage_path TEXT NULL,
  file_url TEXT NULL,
  file_name TEXT NULL,
  mime_type TEXT NULL,
  size_bytes BIGINT NULL,
  ocr_data JSONB DEFAULT '{}'::jsonb,
  note TEXT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS storage_bucket TEXT DEFAULT 'stayhub-private';
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS ocr_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS created_by UUID NULL;

CREATE INDEX IF NOT EXISTS idx_documents_property_person ON public.documents(property_id, person_id);
CREATE INDEX IF NOT EXISTS idx_documents_property_company ON public.documents(property_id, company_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_expiry_date ON public.documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_storage_path ON public.documents(storage_path);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'stayhub-private',
  'stayhub-private',
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
FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "documents_write_manager" ON public.documents;
CREATE POLICY "documents_write_manager" ON public.documents
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "documents_update_manager" ON public.documents;
CREATE POLICY "documents_update_manager" ON public.documents
FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "documents_delete_admin" ON public.documents;
CREATE POLICY "documents_delete_admin" ON public.documents
FOR DELETE USING (auth.role() = 'authenticated');

-- Storage is private. The backend uses SUPABASE_SERVICE_ROLE_KEY for upload
-- and returns temporary signed URLs for preview/download.
