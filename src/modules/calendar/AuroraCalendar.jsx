import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Home } from 'lucide-react';
import { getCurrentLang } from '../../i18n.js';
import {
  overlapsDates as engineOverlapsDates,
  addDays as engineAddDays,
  isActiveReservation,
  parseBeds,
  activePeople,
} from '../../core/reservationEngine.js';

const CAL_LOCALE = { sk: 'sk-SK', vi: 'vi-VN', en: 'en-GB' };
const CAL_WEEKDAYS = { sk: ['Po','Ut','St','Št','Pi','So','Ne'], vi: ['T2','T3','T4','T5','T6','T7','CN'], en: ['Mo','Tu','We','Th','Fr','Sa','Su'] };
const calLocale = () => CAL_LOCALE[getCurrentLang()] || 'sk-SK';
const calWeekdays = () => CAL_WEEKDAYS[getCurrentLang()] || CAL_WEEKDAYS.sk;

function isoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function today() {
  return isoDate(new Date());
}

function addDays(value, amount) {
  return engineAddDays(value, amount);
}

function safeDate(value, fallback = '') {
  return String(value || fallback || '').slice(0, 10);
}

function startOfMonth(value = today()) {
  const [year, month] = String(value).slice(0, 10).split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function addMonths(value, amount) {
  const [year, month] = String(startOfMonth(value)).split('-').map(Number);
  return isoDate(new Date(year, month - 1 + amount, 1));
}

function monthLabel(value) {
  return new Intl.DateTimeFormat(calLocale(), { month: 'long', year: 'numeric' }).format(new Date(`${startOfMonth(value)}T12:00:00`));
}

function dayLabel(value) {
  return new Intl.DateTimeFormat(calLocale(), { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`));
}

function dayNumber(value) {
  return Number(String(value).slice(8, 10));
}

function buildRoomRows(rooms) {
  return (rooms || []).slice().sort((a, b) => Number(a.room_number || 0) - Number(b.room_number || 0));
}

function roomLabel(room) {
  return `P${String(room?.room_number || '').padStart(3, '0')}`;
}

function roomBeds(room) {
  return Array.from({ length: Number(room?.capacity || 3) }, (_, index) => String(index + 1));
}

function normalizeBookings(bookings) {
  return (bookings || [])
    .filter((booking) => isActiveReservation(booking))
    .slice()
    .sort((a, b) => safeDate(a.check_in_date).localeCompare(safeDate(b.check_in_date)));
}

function normalizePeople(people) {
  return activePeople(people || []).slice();
}

function findPersonBooking(person, bookings) {
  if (person?.booking_id) {
    const byId = bookings.find((booking) => String(booking.id) === String(person.booking_id));
    if (byId) return byId;
  }

  return bookings.find((booking) => parseBeds(booking).some((bed) => (
    String(bed.room_id) === String(person.room_id) && String(bed.bed_code) === String(person.bed_code)
  )));
}

function getBedEvents(room, bedCode, day, bookings, people) {
  const dayEnd = addDays(day, 1);

  // Jediný zdroj pravdy pre kalendár je dátum rezervácie.
  // Check-in iba mení stav osoby, ale nesmie predĺžiť obsadenosť za check-out dátum rezervácie.
  const reservations = bookings.filter((booking) => {
    if (!engineOverlapsDates(day, dayEnd, booking.check_in_date, booking.check_out_date)) return false;
    return parseBeds(booking).some((bed) => String(bed.room_id) === String(room.id) && String(bed.bed_code) === String(bedCode));
  });

  const checked = people.filter((person) => {
    if (String(person.room_id) !== String(room.id) || String(person.bed_code) !== String(bedCode)) return false;
    const booking = findPersonBooking(person, bookings);
    const start = safeDate(booking?.check_in_date || person.checkin_at || person.actual_check_in || person.created_at, day);
    const end = safeDate(booking?.check_out_date || person.checkout_at || person.actual_check_out || '');
    return day >= start && (!end || day < end);
  });

  return { checked, reservations };
}

function getRoomDay(room, day, bookings, people) {
  const beds = roomBeds(room).map((bedCode) => getBedEvents(room, bedCode, day, bookings, people));
  const occupied = beds.filter((x) => x.reservations.length || x.checked.length).length;

  const arrivalKeys = new Set();
  const departureKeys = new Set();
  beds.forEach((x, index) => {
    x.reservations.forEach((booking) => {
      const key = `${booking.id || 'booking'}:${index}`;
      if (safeDate(booking.check_in_date) === day) arrivalKeys.add(key);
      if (safeDate(booking.check_out_date) === day) departureKeys.add(key);
    });
  });

  const conflicts = beds.filter((x) => {
    const sources = new Set();
    x.reservations.forEach((booking) => sources.add(`booking:${booking.id || booking.booking_code || Math.random()}`));
    x.checked.forEach((person) => {
      const booking = findPersonBooking(person, bookings);
      sources.add(booking ? `booking:${booking.id || booking.booking_code}` : `person:${person.id || person.full_name}`);
    });
    return sources.size > 1;
  }).length;

  const capacity = Number(room?.capacity || 3);
  return { capacity, occupied, free: Math.max(0, capacity - occupied), arrivals: arrivalKeys.size, departures: departureKeys.size, conflicts };
}

function getDailyStats(day, rooms, bookings, people) {
  const rows = rooms.map((room) => getRoomDay(room, day, bookings, people));
  const beds = rows.reduce((sum, row) => sum + row.capacity, 0);
  const occupied = rows.reduce((sum, row) => sum + row.occupied, 0);
  return {
    beds,
    occupied,
    free: Math.max(0, beds - occupied),
    arrivals: rows.reduce((sum, row) => sum + row.arrivals, 0),
    departures: rows.reduce((sum, row) => sum + row.departures, 0),
    conflicts: rows.reduce((sum, row) => sum + row.conflicts, 0),
  };
}

function getMonthDays(anchor) {
  const first = new Date(`${startOfMonth(anchor)}T12:00:00`);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return isoDate(d);
  });
}

function DayPill({ day, selected, stats, onClick }) {
  const isToday = day === today();
  const status = stats.conflicts ? 'bad' : stats.free === 0 ? 'full' : stats.occupied > 0 ? 'busy' : 'free';
  return <button className={`mini-cal-day ${selected ? 'selected' : ''} ${status}`} onClick={onClick}>
    <small data-i18n-skip>{dayLabel(day)}</small>
    <b>{dayNumber(day)}</b>
    <span>{stats.free} voľné</span>
    {isToday && <em>Dnes</em>}
  </button>;
}

function RoomSimpleRow({ room, data }) {
  const status = data.conflicts ? 'Konflikt' : data.free === 0 ? 'Plné' : data.occupied > 0 ? 'Obsadené' : 'Voľné';
  const cls = data.conflicts ? 'bad' : data.free === 0 ? 'full' : data.occupied > 0 ? 'busy' : 'free';
  return <div className="mini-cal-room">
    <div>
      <b>{roomLabel(room)}</b>
      <small>{data.occupied}/{data.capacity} obsadené · {data.free} voľné</small>
    </div>
    <strong className={cls}>{status}</strong>
  </div>;
}

export default function AuroraCalendar({ rooms = [], bookings = [], people = [] }) {
  const [anchor, setAnchor] = useState(startOfMonth(today()));
  const [selectedDay, setSelectedDay] = useState(today());

  const sortedRooms = useMemo(() => buildRoomRows(rooms), [rooms]);
  const activeBookings = useMemo(() => normalizeBookings(bookings), [bookings]);
  const activeGuests = useMemo(() => normalizePeople(people), [people]);

  const selectedStats = getDailyStats(selectedDay, sortedRooms, activeBookings, activeGuests);
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(selectedDay, index));
  const monthDays = getMonthDays(anchor);
  const currentMonth = startOfMonth(anchor).slice(0, 7);
  const selectedRows = sortedRooms.map((room) => ({ room, data: getRoomDay(room, selectedDay, activeBookings, activeGuests) }));

  function selectDay(day) {
    setSelectedDay(day);
    setAnchor(startOfMonth(day));
  }

  function shiftMonth(amount) {
    const next = startOfMonth(addMonths(anchor, amount));
    setAnchor(next);
    setSelectedDay(next);
  }

  function goToday() {
    const current = today();
    setSelectedDay(current);
    setAnchor(startOfMonth(current));
  }

  return <section className="mini-cal-shell">
    <div className="mini-cal-top">
      <div>
        <h1>Kalendár</h1>
        <p>Jednoduchý prehľad pre recepciu.</p>
      </div>
      <button onClick={goToday}><Home size={16} /> Dnes</button>
    </div>

    <div className="mini-cal-summary">
      <div><small>Vybraný deň</small><b data-i18n-skip>{dayLabel(selectedDay)}</b></div>
      <div><small>Obsadené</small><b>{selectedStats.occupied}/{selectedStats.beds}</b></div>
      <div><small>Voľné</small><b>{selectedStats.free}</b></div>
      <div><small>Príchody</small><b>{selectedStats.arrivals}</b></div>
      <div><small>Odchody</small><b>{selectedStats.departures}</b></div>
    </div>

    <div className="mini-cal-card">
      <div className="mini-cal-card-head">
        <h3>Najbližších 7 dní</h3>
        <input type="date" value={selectedDay} onChange={(event) => selectDay(event.target.value)} />
      </div>
      <div className="mini-cal-days">
        {weekDays.map((day) => <DayPill key={day} day={day} selected={day === selectedDay} stats={getDailyStats(day, sortedRooms, activeBookings, activeGuests)} onClick={() => selectDay(day)} />)}
      </div>
    </div>

    <div className="mini-cal-card">
      <div className="mini-cal-card-head">
        <h3>Izby v deň <span data-i18n-skip>{dayLabel(selectedDay)}</span></h3>
        <span>{selectedStats.free} voľných lôžok</span>
      </div>
      <div className="mini-cal-rooms">
        {selectedRows.map(({ room, data }) => <RoomSimpleRow key={room.id} room={room} data={data} />)}
      </div>
    </div>

    <div className="mini-cal-card mini-cal-month-card">
      <div className="mini-cal-card-head">
        <button onClick={() => shiftMonth(-1)} aria-label="Predchádzajúci mesiac"><ChevronLeft size={18} /></button>
        <h3 data-i18n-skip>{monthLabel(anchor)}</h3>
        <button onClick={() => shiftMonth(1)} aria-label="Ďalší mesiac"><ChevronRight size={18} /></button>
      </div>
      <div className="mini-cal-weekdays" data-i18n-skip>{calWeekdays().map((d) => <b key={d}>{d}</b>)}</div>
      <div className="mini-cal-month">
        {monthDays.map((day) => {
          const stats = getDailyStats(day, sortedRooms, activeBookings, activeGuests);
          const status = stats.conflicts ? 'bad' : stats.free === 0 ? 'full' : stats.occupied > 0 ? 'busy' : 'free';
          return <button key={day} onClick={() => selectDay(day)} className={`mini-cal-month-cell ${status} ${day === selectedDay ? 'selected' : ''} ${!day.startsWith(currentMonth) ? 'muted' : ''}`}>
            <b>{dayNumber(day)}</b>
            <small>{stats.free}</small>
          </button>;
        })}
      </div>
    </div>
  </section>;
}
