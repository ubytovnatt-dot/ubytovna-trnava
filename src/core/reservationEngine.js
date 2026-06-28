/**
 * StayHub v5.2 Reservation Engine Refactor
 * ----------------------------------------
 * Existing Supabase model is preserved:
 * - bookings = reservation source of truth
 * - checkin_persons = physical checked-in guests
 * - rooms + beds = capacity and assignable bed inventory
 * - documents = files/OCR metadata linked to booking/person/company
 */

export const RESERVATION_STATUS = {
  DRAFT: 'draft',
  CONFIRMED: 'confirmed',
  ASSIGNED: 'assigned',
  CHECKED_IN: 'checked_in',
  OCCUPIED: 'occupied',
  CHECKED_OUT: 'checked_out',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  ARCHIVED: 'archived'
};

export const PERSON_STATUS = {
  RESERVED: 'reserved',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out'
};

export const DOCUMENT_BUCKET = 'stayhub-documents';

export const CANCELLED_STATUSES = new Set(['Zrušená', 'Zrusena', 'Da huy', 'Đã hủy', 'cancelled', 'canceled', 'Stornovaná', RESERVATION_STATUS.CANCELLED]);
export const COMPLETED_STATUSES = new Set(['Ukončená', 'Dokončená', 'checked_out', 'completed', 'archived', RESERVATION_STATUS.CHECKED_OUT, RESERVATION_STATUS.COMPLETED, RESERVATION_STATUS.ARCHIVED]);
export const CHECKED_IN_STATUSES = new Set(['Check-in', 'checked_in', 'occupied', 'Ubytovaný', 'Đang ở', RESERVATION_STATUS.CHECKED_IN, RESERVATION_STATUS.OCCUPIED]);
export const CONFIRMED_STATUSES = new Set(['Nová', 'Potvrdená', 'confirmed', 'reserved', 'Đã đặt chỗ', RESERVATION_STATUS.DRAFT, RESERVATION_STATUS.CONFIRMED, RESERVATION_STATUS.ASSIGNED]);

export function normalizeDate(value) {
  return String(value || '').slice(0, 10);
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(value, amount) {
  const base = normalizeDate(value) || todayISO();
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + Number(amount || 0));
  return d.toISOString().slice(0, 10);
}

export function overlapsDates(aStart, aEnd, bStart, bEnd) {
  const as = normalizeDate(aStart);
  const ae = normalizeDate(aEnd);
  const bs = normalizeDate(bStart);
  const be = normalizeDate(bEnd);
  if (!as || !ae || !bs || !be) return false;
  // Hotel logic: checkout date is free for next guest.
  return as < be && ae > bs;
}

export function reservationRange(reservation) {
  return {
    start: normalizeDate(reservation?.check_in_date || reservation?.check_in || reservation?.date_from || reservation?.start_date),
    end: normalizeDate(reservation?.check_out_date || reservation?.check_out || reservation?.date_to || reservation?.end_date)
  };
}

export function parseBeds(reservation) {
  let beds = [];
  if (Array.isArray(reservation?.reserved_beds)) beds = reservation.reserved_beds;
  else if (typeof reservation?.reserved_beds === 'string' && reservation.reserved_beds.trim()) {
    try { beds = JSON.parse(reservation.reserved_beds) || []; } catch { beds = []; }
  } else if (Array.isArray(reservation?.beds)) beds = reservation.beds;

  if ((!beds || beds.length === 0) && reservation?.room_id && reservation?.bed_code) {
    beds = [{ room_id: reservation.room_id, bed_code: reservation.bed_code }];
  }

  return (beds || [])
    .filter((bed) => bed?.room_id && bed?.bed_code !== undefined && bed?.bed_code !== null)
    .map((bed) => ({
      ...bed,
      room_id: bed.room_id,
      bed_code: String(bed.bed_code),
      room_number: bed.room_number,
      room_label: bed.room_label
    }));
}

export function bedKey(bed) {
  return `${String(bed?.room_id)}:${String(bed?.bed_code)}`;
}

export function personBedKey(person) {
  return `${String(person?.room_id)}:${String(person?.bed_code)}`;
}

export function bedLabel(bed) {
  const room = bed?.room_label || bed?.room_number || bed?.room_id || '?';
  return `P${String(room).replace(/^P/i, '').padStart(3, '0')}-${bed?.bed_code || '?'}`;
}

export function normalizeReservationStatus(status) {
  if (CANCELLED_STATUSES.has(status)) return RESERVATION_STATUS.CANCELLED;
  if (COMPLETED_STATUSES.has(status)) return RESERVATION_STATUS.COMPLETED;
  if (CHECKED_IN_STATUSES.has(status)) return RESERVATION_STATUS.CHECKED_IN;
  if (CONFIRMED_STATUSES.has(status)) return RESERVATION_STATUS.CONFIRMED;
  return status || RESERVATION_STATUS.CONFIRMED;
}

export function normalizePersonStatus(status) {
  if (status === 'checked_out' || status === PERSON_STATUS.CHECKED_OUT) return PERSON_STATUS.CHECKED_OUT;
  if (status === 'checked_in' || status === PERSON_STATUS.CHECKED_IN || status === 'Ubytovaný' || status === 'Đang ở') return PERSON_STATUS.CHECKED_IN;
  return status || PERSON_STATUS.RESERVED;
}

export function normalizeReservation(raw = {}) {
  const range = reservationRange(raw);
  return {
    ...raw,
    id: raw.id,
    reservation_id: raw.reservation_id || raw.booking_id || raw.id,
    payer_type: raw.payer_type || (raw.company_id || raw.company_name ? 'company' : 'person'),
    company_id: raw.company_id || null,
    company_name: raw.company_name || null,
    guest_name: raw.guest_name || raw.contact_person || '',
    requested_beds: Number(raw.requested_beds || parseBeds(raw).length || 1),
    check_in_date: range.start,
    check_out_date: range.end,
    status: normalizeReservationStatus(raw.status),
    reserved_beds: parseBeds(raw)
  };
}

export function normalizePerson(raw = {}) {
  return {
    ...raw,
    person_id: raw.person_id || raw.id,
    reservation_id: raw.reservation_id || raw.booking_id || null,
    booking_id: raw.booking_id || raw.reservation_id || null,
    room_id: raw.room_id || null,
    bed_code: raw.bed_code !== undefined && raw.bed_code !== null ? String(raw.bed_code) : null,
    status: normalizePersonStatus(raw.status),
    document_number: raw.document_number || raw.passport_number || raw.passport_no || raw.id_number || '',
    checked_in_at: raw.checked_in_at || raw.checkin_at || raw.actual_check_in || null,
    checked_out_at: raw.checked_out_at || raw.checkout_at || raw.actual_check_out || null,
    expected_checkout_date: raw.expected_checkout_date || null
  };
}

export function isCancelledReservation(reservation) {
  return normalizeReservationStatus(reservation?.status) === RESERVATION_STATUS.CANCELLED;
}

export function isCompletedReservation(reservation) {
  const s = normalizeReservationStatus(reservation?.status);
  return [RESERVATION_STATUS.COMPLETED, RESERVATION_STATUS.CHECKED_OUT, RESERVATION_STATUS.ARCHIVED].includes(s);
}

export function isActiveReservation(reservation) {
  return !!reservation && !isCancelledReservation(reservation) && !isCompletedReservation(reservation);
}

export function isCheckedInReservation(reservation) {
  const s = normalizeReservationStatus(reservation?.status);
  return [RESERVATION_STATUS.CHECKED_IN, RESERVATION_STATUS.OCCUPIED].includes(s);
}

export function reservationCoversDay(reservation, day) {
  const { start, end } = reservationRange(reservation);
  return overlapsDates(day, addDays(day, 1), start, end);
}

export function findReservationForPerson(person, reservations = []) {
  const normalized = normalizePerson(person);
  if (normalized.booking_id) {
    const byId = reservations.find((reservation) => String(reservation.id || reservation.booking_id || reservation.reservation_id) === String(normalized.booking_id));
    if (byId) return byId;
  }
  return reservations.find((reservation) => parseBeds(reservation).some((bed) => bedKey(bed) === personBedKey(normalized)));
}

export function personCoversDay(person, reservations = [], day = todayISO()) {
  const p = normalizePerson(person);
  if (p.status !== PERSON_STATUS.CHECKED_IN) return false;

  const booking = findReservationForPerson(p, reservations);
  if (booking) return reservationCoversDay(booking, day);

  const start = normalizeDate(p.checked_in_at || p.checkin_at || p.actual_check_in || p.created_at);
  const end = normalizeDate(p.checked_out_at || p.checkout_at || p.actual_check_out || p.expected_checkout_date);
  if (!start) return false;
  return day >= start && (!end || day < end);
}

export function activePeople(people = []) {
  return (people || []).map(normalizePerson).filter((person) => person.status === PERSON_STATUS.CHECKED_IN);
}

export function activePeopleForDay(people = [], reservations = [], day = todayISO()) {
  return (people || []).map(normalizePerson).filter((person) => personCoversDay(person, reservations, day));
}

export function checkedOutPeople(people = []) {
  return (people || []).map(normalizePerson).filter((person) => person.status === PERSON_STATUS.CHECKED_OUT);
}

export function activePeopleForBooking(people = [], reservationId, reservations = [], day = null) {
  return (day ? activePeopleForDay(people, reservations, day) : activePeople(people))
    .filter((person) => String(person.reservation_id || person.booking_id) === String(reservationId));
}

export function activePeopleBedKeysForBooking(people = [], reservationId, reservations = [], day = null) {
  return new Set(activePeopleForBooking(people, reservationId, reservations, day).map(personBedKey));
}

export function activeBookingBeds(reservation, people = [], reservations = [], day = null) {
  if (!isActiveReservation(reservation)) return [];
  const beds = parseBeds(reservation);
  if (!day || reservationCoversDay(reservation, day)) return beds;
  return [];
}

export function activeReservationsForDay(reservations = [], people = [], day) {
  return (reservations || [])
    .filter(isActiveReservation)
    .filter((reservation) => reservationCoversDay(reservation, day))
    .map(normalizeReservation);
}

export function deriveBedsFromRooms(rooms = []) {
  return (rooms || []).flatMap((room) => roomBeds(room));
}

export function roomBeds(room) {
  return Array.from({ length: Number(room?.capacity || 0) }, (_, index) => ({
    id: `${room?.id}:${index + 1}`,
    property_id: room?.property_id || 'postova-3',
    room_id: room?.id,
    room_number: room?.room_number,
    room_label: room?.room_label || `P${String(room?.room_number || '').padStart(3, '0')}`,
    bed_code: String(index + 1),
    active: true,
    sort_order: index + 1
  }));
}

export function roomOccupancy(room, reservations = [], people = [], day = todayISO()) {
  const roomId = String(room?.id);
  const capacity = Number(room?.capacity || 0);
  const activeDayPeople = activePeopleForDay(people, reservations, day);

  const occupiedBeds = new Set(
    activeDayPeople
      .filter((person) => String(person.room_id) === roomId)
      .map((person) => String(person.bed_code))
  );

  const reservedBeds = new Set();
  activeReservationsForDay(reservations, people, day).forEach((reservation) => {
    parseBeds(reservation).forEach((bed) => {
      const key = String(bed.bed_code);
      if (String(bed.room_id) === roomId && !occupiedBeds.has(key)) reservedBeds.add(key);
    });
  });

  const used = occupiedBeds.size + reservedBeds.size;
  return {
    capacity,
    occupied: occupiedBeds.size,
    reserved: reservedBeds.size,
    free: Math.max(0, capacity - used),
    used,
    rate: capacity ? Math.round((used / capacity) * 100) : 0,
    occupiedBeds: [...occupiedBeds],
    reservedBeds: [...reservedBeds]
  };
}

export function findBedConflicts(reservations = []) {
  const active = (reservations || []).filter(isActiveReservation);
  const conflicts = [];

  active.forEach((a, index) => {
    const bedsA = parseBeds(a).map(bedKey);
    active.slice(index + 1).forEach((b) => {
      if (!overlapsDates(a.check_in_date, a.check_out_date, b.check_in_date, b.check_out_date)) return;
      const overlapBed = parseBeds(b).map(bedKey).find((key) => bedsA.includes(key));
      if (overlapBed) conflicts.push({ bed_key: overlapBed, reservation_a: a, reservation_b: b });
    });
  });

  return conflicts;
}

export function buildTodayDashboard({ rooms = [], reservations = [], payments = [], people = [], day = todayISO() }) {
  const roomStats = rooms.map((room) => roomOccupancy(room, reservations, people, day));
  const totalCapacity = roomStats.reduce((sum, item) => sum + item.capacity, 0);
  const usedBeds = roomStats.reduce((sum, item) => sum + item.used, 0);
  const freeBeds = Math.max(0, totalCapacity - usedBeds);
  const freeRooms = roomStats.filter((item) => item.used === 0).length;
  const arrivals = (reservations || []).filter((reservation) => isActiveReservation(reservation) && normalizeDate(reservation.check_in_date) === day);
  const departures = (reservations || []).filter((reservation) => isActiveReservation(reservation) && normalizeDate(reservation.check_out_date) === day);
  const unpaid = (reservations || []).filter((reservation) => {
    const total = Number(reservation.total_price || 0);
    if (!total) return false;
    const paid = (payments || [])
      .filter((payment) => String(payment.booking_id || payment.reservation_id) === String(reservation.id))
      .filter((payment) => ['Zaplatené', 'paid', 'Đã thanh toán', 'Da thanh toan'].includes(payment.status))
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    return paid < total;
  });

  return {
    day,
    totalCapacity,
    usedBeds,
    freeBeds,
    freeRooms,
    occupancyRate: totalCapacity ? Math.round((usedBeds / totalCapacity) * 100) : 0,
    arrivals,
    departures,
    unpaid,
    conflicts: findBedConflicts(reservations)
  };
}

export function bookingHasNoActivePeopleAfterCheckout(people = [], reservationId, checkoutPersonId) {
  return !activePeople(people).some((person) => (
    String(person.reservation_id || person.booking_id) === String(reservationId) && String(person.id) !== String(checkoutPersonId)
  ));
}

export function buildDocumentStoragePath({ propertyId = 'postova-3', reservationId, personId, documentType = 'passport', filename = 'document' }) {
  const clean = (value, fallback) => String(value || fallback)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90) || fallback;
  const type = documentType === 'id_card' || documentType === 'op' ? 'id-card' : 'passport';
  return `${clean(propertyId, 'postova-3')}/${reservationId ? `reservation-${clean(reservationId, 'unassigned')}` : 'reservation-unassigned'}/${personId ? `person-${clean(personId, 'unassigned')}` : 'person-unassigned'}/${type}/${Date.now()}-${clean(filename, 'document')}`;
}
