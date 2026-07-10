/** StayHub v5.2 domain model
 * Existing Supabase tables are preserved.
 * `bookings` is the reservation table and single source of truth.
 */
export const CORE_TABLES = [
  'rooms',
  'beds',
  'bookings',
  'checkin_persons',
  'companies',
  'payments',
  'documents',
  'profiles',
  'audit_logs'
];

export const DOMAIN_ALIASES = {
  Reservation: 'bookings',
  Person: 'checkin_persons',
  Company: 'companies',
  Payment: 'payments',
  Document: 'documents',
  Room: 'rooms',
  Bed: 'beds'
};

export const STORAGE = {
  bucket: 'stayhub-documents',
  documentTypes: ['passport', 'id_card'],
  maxUploadMB: 8,
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
};

export const CORE_WORKFLOW = [
  { id: 'booking', label: 'Rezervácia', description: 'Firma/osoba, termín, počet lôžok a priradené postele.' },
  { id: 'checkin', label: 'Check-in', description: 'Hosť vzniká pri check-ine. AI OCR je súčasť check-inu.' },
  { id: 'stay', label: 'Pobyt', description: 'Platby, dokumenty a poznámky sú naviazané na booking.' },
  { id: 'checkout', label: 'Check-out', description: 'Check-out uvoľní lôžko a booking sa uzavrie až po odchode poslednej aktívnej osoby.' },
  { id: 'calendar', label: 'Kalendár', description: 'Kalendár číta celý interval check_in_date → check_out_date, nie iba check-in deň.' }
];

export const STATUS = {
  bookingActive: ['Nová', 'Potvrdená', 'Check-in', 'confirmed', 'reserved', 'checked_in'],
  bookingClosed: ['Ukončená', 'Dokončená', 'completed', 'checked_out', 'archived'],
  bookingCancelled: ['Zrušená', 'Zrusena', 'cancelled', 'canceled', 'Da huy', 'Đã hủy'],
  personActive: ['checked_in', 'Ubytovaný', 'Đang ở'],
  personClosed: ['checked_out']
};
