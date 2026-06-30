import React, { useMemo, useState } from 'react';

const arr = (value) => Array.isArray(value) ? value : [];
const eur = (value) => `€${Number(value || 0).toFixed(2)}`;

export function paymentSummary(booking = {}, payments = []) {
  const rows = arr(payments).filter((payment) => String(payment.booking_id || '') === String(booking.id || ''));
  const paid = rows.reduce((sum, payment) => sum + Number(payment.amount || payment.paid_amount || 0), 0);
  const total = Number(booking.total_price || booking.price || 0);
  return { total, paid, balance: Math.max(0, total - paid), rows };
}

export default function PaymentWorkspace({ bookings = [], payments = [], onAddPayment, labels = {} }) {
  const [filter, setFilter] = useState('open');
  const rows = useMemo(() => arr(bookings).map((booking) => ({ booking, summary: paymentSummary(booking, payments) })), [bookings, payments]);
  const visible = rows.filter(({ summary }) => filter === 'all' || (filter === 'paid' ? summary.balance <= 0 : summary.balance > 0));
  return <div className="stayhub-workspace"><div className="stayhub-filter"><button onClick={() => setFilter('open')}>{labels.open || 'Na úhradu'}</button><button onClick={() => setFilter('paid')}>{labels.paid || 'Uhradené'}</button><button onClick={() => setFilter('all')}>{labels.all || 'Všetko'}</button></div>{visible.map(({ booking, summary }) => <article className="stayhub-card-row" key={booking.id}><div><strong>{booking.company_name || booking.guest_name || booking.booking_code}</strong><small>{eur(summary.paid)} / {eur(summary.total)}</small></div><div><b>{eur(summary.balance)}</b><button onClick={() => onAddPayment?.(booking)}>{labels.add || '+ Platba'}</button></div></article>)}</div>;
}
