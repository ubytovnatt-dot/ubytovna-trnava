# StayHub v5.3.1 – Check-in OCR Workflow

## Added
- Check-in modal now follows the intended workflow:
  1. Select person / assigned bed
  2. Choose document type: Pas or Občiansky preukaz
  3. Upload document photo/PDF or capture from mobile
  4. Run AI OCR
  5. Review fields and confirm check-in
- OCR result pre-fills guest identity fields.
- Uploaded document is saved to Supabase Storage through existing `/api/documents/upload`.
- Confirmed check-in creates/updates `checkin_persons`.
- Confirmed check-in also creates a linked `documents` record when a document was uploaded.
- Booking status is updated to `Check-in` after successful confirmation.

## Notes
- No new Supabase migration is required beyond v5.2.1.
- Uses existing bucket `stayhub-documents`.
