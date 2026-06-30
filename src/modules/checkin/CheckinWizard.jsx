import React, { useState } from 'react';

export default function CheckinWizard({ bookings = [], people = [], onConfirm, labels = {} }) {
  const [bookingId, setBookingId] = useState('');
  const [documentType, setDocumentType] = useState('passport');
  const [file, setFile] = useState(null);
  const selectedBooking = bookings.find((booking) => String(booking.id) === String(bookingId));
  const bookingPeople = people.filter((person) => String(person.booking_id) === String(bookingId));
  return <div className="stayhub-workspace"><h2>{labels.title || 'Smart Check-in'}</h2><label>{labels.reservation || 'Rezervácia'}<select value={bookingId} onChange={(event) => setBookingId(event.target.value)}><option value="">—</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.company_name || booking.guest_name || booking.booking_code}</option>)}</select></label><label>{labels.documentType || 'Typ dokladu'}<select value={documentType} onChange={(event) => setDocumentType(event.target.value)}><option value="passport">{labels.passport || 'Pas'}</option><option value="id_card">{labels.idCard || 'Občiansky preukaz'}</option></select></label><label>{labels.upload || 'Nahrať / odfotiť'}<input type="file" accept="image/*,.pdf" capture="environment" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>{file && <p className="stayhub-muted">{labels.selectedFile || 'Vybraný súbor'}: {file.name}</p>}<button disabled={!selectedBooking} onClick={() => onConfirm?.({ booking: selectedBooking, people: bookingPeople, documentType, file })}>{labels.confirm || 'Potvrdiť Check-in'}</button></div>;
}
