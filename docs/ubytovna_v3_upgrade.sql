-- UBYTOVŇA TRNAVA v3 UPGRADE
-- Spusti v Supabase SQL Editore pred nasadením v3.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS ico TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payer_type TEXT DEFAULT 'company',
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS contact_person TEXT,
ADD COLUMN IF NOT EXISTS requested_beds INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS reserved_beds JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS total_price NUMERIC,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payer_type TEXT DEFAULT 'company',
ADD COLUMN IF NOT EXISTS payer_name TEXT,
ADD COLUMN IF NOT EXISTS company_id UUID,
ADD COLUMN IF NOT EXISTS booking_id UUID,
ADD COLUMN IF NOT EXISTS tenant_name TEXT,
ADD COLUMN IF NOT EXISTS room_label TEXT,
ADD COLUMN IF NOT EXISTS due_date DATE,
ADD COLUMN IF NOT EXISTS paid_date DATE,
ADD COLUMN IF NOT EXISTS note TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS checkin_persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID,
  company_id UUID,
  company_name TEXT,
  room_id UUID,
  room_label TEXT,
  bed_code TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  passport_no TEXT,
  nationality TEXT,
  date_of_birth DATE,
  checkin_at TIMESTAMPTZ,
  expected_checkout_date DATE,
  checkout_at TIMESTAMPTZ,
  keys_issued TEXT DEFAULT 'Áno',
  keys_returned TEXT,
  room_condition_checkin TEXT DEFAULT 'OK',
  room_condition_checkout TEXT,
  damage_amount NUMERIC DEFAULT 0,
  checkout_note TEXT,
  status TEXT DEFAULT 'checked_in',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkin_persons ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='checkin_persons' AND policyname='allow_all_checkin_persons') THEN
    CREATE POLICY allow_all_checkin_persons ON checkin_persons FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
