import React, { useMemo } from 'react';

const arr = (value) => Array.isArray(value) ? value : [];
const toDate = (value) => value ? new Date(value) : null;
const daysBetween = (start, end) => Math.max(1, Math.ceil((toDate(end) - toDate(start)) / 86400000));

export default function TimelineCalendar({ rooms = [], bookings = [], onOpenBooking }) {
  const rows = useMemo(() => arr(rooms).map((room) => ({ room, bookings: arr(bookings).filter((booking) => String(booking.room_id || '') === String(room.id || '')) })), [rooms, bookings]);
  return <div className="stayhub-timeline">{rows.map(({ room, bookings: roomBookings }) => <div className="stayhub-timeline-row" key={room.id}><div className="stayhub-timeline-room">P{String(room.room_number || '').padStart(3, '0')}</div><div className="stayhub-timeline-bars">{roomBookings.map((booking) => <button key={booking.id} className="stayhub-timeline-bar" style={{ width: `${Math.min(100, daysBetween(booking.check_in_date, booking.check_out_date) * 12)}%` }} onClick={() => onOpenBooking?.(booking)}>{booking.company_name || booking.guest_name || booking.booking_code}</button>)}</div></div>)}</div>;
}
