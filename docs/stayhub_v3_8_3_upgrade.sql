-- StayHub v3.8.3 Enterprise upgrade
-- Safe to run multiple times. Adds documents, audit log, and reporting views.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NULL,
  person_name TEXT NULL,
  company_id UUID NULL,
  company_name TEXT NULL,
  document_type TEXT NOT NULL DEFAULT 'Pas',
  document_number TEXT NULL,
  issue_date DATE NULL,
  expiry_date DATE NULL,
  file_url TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID NULL,
  action TEXT NOT NULL,
  payload JSONB NULL,
  created_by TEXT DEFAULT 'demo@stayhub.app',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE checkin_persons ADD COLUMN IF NOT EXISTS room_condition_checkin TEXT;
ALTER TABLE checkin_persons ADD COLUMN IF NOT EXISTS room_condition_checkout TEXT;
ALTER TABLE checkin_persons ADD COLUMN IF NOT EXISTS keys_issued TEXT;
ALTER TABLE checkin_persons ADD COLUMN IF NOT EXISTS keys_returned TEXT;
ALTER TABLE checkin_persons ADD COLUMN IF NOT EXISTS damage_amount NUMERIC DEFAULT 0;
ALTER TABLE checkin_persons ADD COLUMN IF NOT EXISTS checkout_note TEXT;
ALTER TABLE checkin_persons ADD COLUMN IF NOT EXISTS date_of_birth DATE;

CREATE OR REPLACE VIEW debtor_report AS
SELECT
  p.id,
  p.payment_code,
  p.payer_name,
  p.company_id,
  p.amount,
  p.status,
  p.due_date,
  p.payment_month
FROM payments p
WHERE COALESCE(p.status, '') NOT IN ('Zaplatené','paid','Da thanh toan','Đã thanh toán');

CREATE OR REPLACE VIEW occupancy_report AS
SELECT
  r.id AS room_id,
  r.room_number,
  r.floor,
  r.capacity,
  COUNT(cp.id) FILTER (WHERE cp.status = 'checked_in') AS checked_in_count
FROM rooms r
LEFT JOIN checkin_persons cp ON cp.room_id = r.id
GROUP BY r.id, r.room_number, r.floor, r.capacity;

CREATE OR REPLACE VIEW document_expiry_report AS
SELECT *
FROM documents
WHERE expiry_date IS NOT NULL
AND expiry_date <= CURRENT_DATE + INTERVAL '30 days';

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_all_documents" ON documents;
CREATE POLICY "allow_all_documents" ON documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "allow_all_audit_logs" ON audit_logs;
CREATE POLICY "allow_all_audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
