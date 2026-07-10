import React, { useMemo, useState } from 'react';

const arr = (value) => Array.isArray(value) ? value : [];

export function ReservationCard({ booking, onOpen, labels = {} }) {
  return <article className="stayhub-card-row" onClick={() => onOpen?.(booking)}><div><strong>{booking.company_name || booking.guest_name || booking.booking_code}</strong><small>{booking.check_in_date} → {booking.check_out_date}</small>{(booking.note || booking.notes) && <small>{labels.note || 'Poznámka'}: {booking.note || booking.notes}</small>}</div><span>{booking.status || labels.status || 'Stav'}</span></article>;
}

export default function ReservationWorkspace({ bookings = [], onOpen, labels = {} }) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => arr(bookings).filter((booking) => JSON.stringify(booking).toLowerCase().includes(query.toLowerCase())), [bookings, query]);
  return <div className="stayhub-workspace"><input className="stayhub-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search || 'Hľadať rezerváciu'} />{rows.map((booking) => <ReservationCard key={booking.id} booking={booking} onOpen={onOpen} labels={labels} />)}</div>;
}
