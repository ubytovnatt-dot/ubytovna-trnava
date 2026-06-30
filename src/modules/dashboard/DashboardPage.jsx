import React from 'react';

const safeList = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const money = (value) => `€${Number(value || 0).toFixed(2)}`;

export function TodayCards({ bookings = [], people = [], payments = [], rooms = [], labels = {} }) {
  const day = today();
  const arrivals = safeList(bookings).filter((booking) => String(booking.check_in_date || '').slice(0, 10) === day);
  const departures = safeList(people).filter((person) => String(person.expected_checkout_date || person.checkout_at || '').slice(0, 10) === day && person.status === 'checked_in');
  const occupiedBeds = safeList(people).filter((person) => person.status === 'checked_in').length;
  const totalBeds = safeList(rooms).reduce((sum, room) => sum + Number(room.capacity || 0), 0);
  const unpaid = safeList(bookings).filter((booking) => Number(booking.total_price || 0) > Number(booking.paid_amount || 0)).length;

  const cards = [
    { label: labels.arrivals || 'Príchody', value: arrivals.length },
    { label: labels.departures || 'Odchody', value: departures.length },
    { label: labels.freeBeds || 'Voľné lôžka', value: Math.max(0, totalBeds - occupiedBeds) },
    { label: labels.unpaid || 'Neuhradené', value: unpaid },
  ];

  return <div className="stayhub-grid-cards">{cards.map((card) => <article key={card.label} className="stayhub-card"><span>{card.label}</span><strong>{card.value}</strong></article>)}</div>;
}

export function ArrivalsToday({ bookings = [], onCheckin, labels = {} }) {
  const day = today();
  const arrivals = safeList(bookings).filter((booking) => String(booking.check_in_date || '').slice(0, 10) === day);
  return <section className="stayhub-section"><h2>{labels.title || 'Príchody dnes'}</h2>{arrivals.length === 0 ? <p className="stayhub-muted">{labels.empty || 'Dnes nie sú príchody.'}</p> : arrivals.map((booking) => <div className="stayhub-row" key={booking.id}><div><strong>{booking.company_name || booking.guest_name || booking.booking_code}</strong><small>{booking.check_in_date} → {booking.check_out_date}</small></div><button onClick={() => onCheckin?.(booking)}>{labels.checkin || 'Check-in'}</button></div>)}</section>;
}

export function DeparturesToday({ people = [], onCheckout, labels = {} }) {
  const day = today();
  const departures = safeList(people).filter((person) => String(person.expected_checkout_date || person.checkout_at || '').slice(0, 10) === day && person.status === 'checked_in');
  return <section className="stayhub-section"><h2>{labels.title || 'Odchody dnes'}</h2>{departures.length === 0 ? <p className="stayhub-muted">{labels.empty || 'Dnes nie sú odchody.'}</p> : departures.map((person) => <div className="stayhub-row" key={person.id}><div><strong>{person.full_name || `${person.first_name || ''} ${person.last_name || ''}`.trim()}</strong><small>{person.room_label || person.room_number || 'Izba'}-{person.bed_code || 'lôžko'}</small></div><button onClick={() => onCheckout?.(person)}>{labels.checkout || 'Check-out'}</button></div>)}</section>;
}

export function QuickActions({ onReservation, onCheckin, labels = {} }) {
  return <div className="stayhub-actions"><button onClick={onReservation}>{labels.reservation || '+ Rezervácia'}</button><button onClick={onCheckin}>{labels.checkin || '+ Check-in'}</button></div>;
}

export default function DashboardPage(props) {
  return <div className="stayhub-workspace"><TodayCards {...props} /><QuickActions {...props} /><ArrivalsToday {...props} /><DeparturesToday {...props} /></div>;
}
