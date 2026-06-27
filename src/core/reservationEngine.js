export const CANCELLED_STATUSES = new Set(['Zrušená', 'Da huy', 'cancelled', 'canceled', 'Stornovaná']);
export const COMPLETED_STATUSES = new Set(['Ukončená', 'checked_out', 'completed', 'archived', 'Dokončená']);
export const CHECKED_IN_STATUSES = new Set(['Check-in', 'checked_in', 'occupied', 'Ubytovaný', 'Đang ở']);
export const CONFIRMED_STATUSES = new Set(['Nová', 'Potvrdená', 'confirmed', 'reserved', 'Đã đặt chỗ']);

export function parseBeds(booking) {
  if (Array.isArray(booking?.reserved_beds)) return booking.reserved_beds;
  if (typeof booking?.reserved_beds === 'string') {
    try { return JSON.parse(booking.reserved_beds); } catch { return []; }
  }
  return booking?.room_id && booking?.bed_code ? [{ room_id: booking.room_id, bed_code: booking.bed_code }] : [];
}

export function normalizeDate(value) {
  return String(value || '').slice(0, 10);
}

export function addDays(value, amount) {
  const d = new Date(value);
  d.setDate(d.getDate() + amount);
  return d.toISOString().slice(0, 10);
}

export function overlapsDates(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart < bEnd && aEnd > bStart;
}

export function isCancelledReservation(booking) {
  return CANCELLED_STATUSES.has(booking?.status);
}

export function isCompletedReservation(booking) {
  return COMPLETED_STATUSES.has(booking?.status);
}

export function isActiveReservation(booking) {
  return !!booking && !isCancelledReservation(booking) && !isCompletedReservation(booking);
}

export function isCheckedInReservation(booking) {
  return CHECKED_IN_STATUSES.has(booking?.status);
}

export function activePeople(people = []) {
  return (people || []).filter((person) => person.status === 'checked_in');
}

export function checkedOutPeople(people = []) {
  return (people || []).filter((person) => person.status === 'checked_out');
}

export function personBedKey(person) {
  return `${String(person?.room_id)}:${String(person?.bed_code)}`;
}

export function bedKey(bed) {
  return `${String(bed?.room_id)}:${String(bed?.bed_code)}`;
}

export function activePeopleForBooking(people = [], bookingId) {
  return activePeople(people).filter((person) => String(person.booking_id) === String(bookingId));
}

export function activePeopleBedKeysForBooking(people = [], bookingId) {
  return new Set(activePeopleForBooking(people, bookingId).map(personBedKey));
}

export function activeBookingBeds(booking, people = []) {
  if (!isActiveReservation(booking)) return [];
  const beds = parseBeds(booking);
  if (!isCheckedInReservation(booking)) return beds;
  const occupiedKeys = activePeopleBedKeysForBooking(people, booking.id);
  return beds.filter((bed) => !occupiedKeys.has(bedKey(bed)));
}

export function activeReservationsForDay(bookings = [], people = [], day) {
  const end = addDays(day, 1);
  return (bookings || []).filter((booking) => {
    if (!isActiveReservation(booking)) return false;
    if (!overlapsDates(day, end, booking.check_in_date, booking.check_out_date)) return false;
    return activeBookingBeds(booking, people).length > 0;
  });
}

export function roomOccupancy(room, bookings = [], people = [], day) {
  const roomId = String(room?.id);
  const occupiedBeds = new Set(activePeople(people).filter((person) => String(person.room_id) === roomId).map((person) => String(person.bed_code)));
  const reservedBeds = new Set();
  activeReservationsForDay(bookings, people, day).forEach((booking) => {
    activeBookingBeds(booking, people).forEach((bed) => {
      if (String(bed.room_id) === roomId && !occupiedBeds.has(String(bed.bed_code))) reservedBeds.add(String(bed.bed_code));
    });
  });
  const capacity = Number(room?.capacity || 0);
  return {
    capacity,
    occupied: occupiedBeds.size,
    reserved: reservedBeds.size,
    free: Math.max(0, capacity - occupiedBeds.size - reservedBeds.size),
    rate: capacity ? Math.round(((occupiedBeds.size + reservedBeds.size) / capacity) * 100) : 0,
    occupiedBeds: [...occupiedBeds],
    reservedBeds: [...reservedBeds]
  };
}

export function bookingHasNoActivePeopleAfterCheckout(people = [], bookingId, checkoutPersonId) {
  return !activePeople(people).some((person) => String(person.booking_id) === String(bookingId) && String(person.id) !== String(checkoutPersonId));
}
