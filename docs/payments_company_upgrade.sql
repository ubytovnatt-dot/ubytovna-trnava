-- Voliteľné rozšírenie platieb pre detailnejší reporting.
-- Aktuálny UI fix funguje aj bez týchto stĺpcov, lebo firmu vie zobraziť cez company_id.
-- Spusti len ak chceš mať v platbe uložené aj textové snapshoty platiteľa/ubytovaného.

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payer_type TEXT DEFAULT 'person';

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS payer_name TEXT;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS tenant_name TEXT;

ALTER TABLE payments
ADD COLUMN IF NOT EXISTS room_label TEXT;

-- Odporúčané pre existujúce staršie platby: doplniť firmu z rezervácie, ak platba nemá company_id.
UPDATE payments p
SET company_id = b.company_id
FROM bookings b
WHERE p.booking_id = b.id
  AND p.company_id IS NULL
  AND b.company_id IS NOT NULL;
