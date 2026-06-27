import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Home, ListChecks, RefreshCw } from 'lucide-react';
import {
  parseBeds as engineParseBeds,
  overlapsDates as engineOverlapsDates,
  addDays as engineAddDays,
  isActiveReservation,
  activeBookingBeds,
  activePeople,
} from '../../core/reservationEngine.js';

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

function startOfMonth(value = today()) {
  const [year, month] = String(value).slice(0, 10).split('-').map(Number);
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function addMonths(value, amount) {
  const [year, month] = String(startOfMonth(value)).split('-').map(Number);
  return isoDate(new Date(year, month - 1 + amount, 1));
}

function monthLabel(value) {
  return new Intl.DateTimeFormat('sk-SK', { month: 'long', year: 'numeric' }).format(new Date(`${startOfMonth(value)}T12:00:00`));
}

function dayLabel(value) {
  return new Intl.DateTimeFormat('sk-SK', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${value}T12:00:00`));
}

function shortDayLabel(value) {
  return new Intl.DateTimeFormat('sk-SK', { weekday: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

function safeDate(value, fallback = '') {
  return String(value || fallback || '').slice(0, 10);
}

function compareIso(a, b) {
  return safeDate(a).localeCompare(safeDate(b));
}

function normalizeBookings(bookings) {
  return (bookings || [])
    .filter((booking) => isActiveReservation(booking))
    .slice()
    .sort((a, b) => {
      const byCheckIn = compareIso(a.check_in_date, b.check_in_date);
      if (byCheckIn !== 0) return byCheckIn;
      const byCheckOut = compareIso(a.check_out_date, b.check_out_date);
      if (byCheckOut !== 0) return byCheckOut;
      return String(a.booking_code || a.id || '').localeCompare(String(b.booking_code || b.id || ''));
    });
}

function normalizePeople(people) {
  return activePeople(people || [])
    .slice()
    .sort((a, b) => {
      const aStart = a.checkin_at || a.actual_check_in || a.created_at;
      const bStart = b.checkin_at || b.actual_check_in || b.created_at;
      const byCheckIn = compareIso(aStart, bStart);
      if (byCheckIn !== 0) return byCheckIn;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
}

function roomLabel(room) {
  return `P${String(room?.room_number || '').padStart(3, '0')}`;
}

function buildRoomRows(rooms) {
  return (rooms || []).slice().sort((a, b) => Number(a.room_number || 0) - Number(b.room_number || 0));
}

function buildBedRows(rooms) {
  return (rooms || []).flatMap((room) => Array.from({ length: Number(room.capacity || 3) }, (_, index) => ({
    room,
    bed_code: String(index + 1),
    id: `${room.id}-${index + 1}`,
  })));
}

function overlapsDates(aStart, aEnd, bStart, bEnd) {
  return engineOverlapsDates(aStart, aEnd, bStart, bEnd);
}

function roomBeds(room) {
  return Array.from({ length: Number(room?.capacity || 3) }, (_, index) => String(index + 1));
}

function getBedEvents(room, bedCode, day, bookings, people) {
  const checked = normalizePeople(people).filter((person) => {
    if (String(person.room_id) !== String(room.id) || String(person.bed_code) !== String(bedCode)) return false;
    const start = safeDate(person.checkin_at || person.actual_check_in || person.created_at, day);
    const end = safeDate(person.checkout_at || person.actual_check_out || '');
    return day >= start && (!end || day < end);
  });

  const reservations = normalizeBookings(bookings).filter((booking) => {
    if (!overlapsDates(day, addDays(day, 1), booking.check_in_date, booking.check_out_date)) return false;
    return activeBookingBeds(booking, people).some((bed) => String(bed.room_id) === String(room.id) && String(bed.bed_code) === String(bedCode));
  });

  return { checked, reservations };
}

function getRoomDay(room, day, bookings, people) {
  const beds = roomBeds(room).map((bedCode) => getBedEvents(room, bedCode, day, bookings, people));
  const occupied = beds.filter((x) => x.checked.length || x.reservations.length).length;
  const arrivals = beds.filter((x) => x.reservations.some((b) => b.check_in_date === day)).length;
  const departures = beds.filter((x) => x.reservations.some((b) => b.check_out_date === addDays(day, 1))).length;
  const conflicts = beds.filter((x) => x.checked.length + x.reservations.length > 1).length;
  const capacity = Number(room?.capacity || 3);
  const state = conflicts ? 'conflict' : occupied === 0 ? 'free' : occupied >= capacity ? 'full' : 'partial';
  return { capacity, occupied, free: Math.max(0, capacity - occupied), arrivals, departures, conflicts, state };
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
    rate: beds ? Math.round((occupied / beds) * 100) : 0,
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

function statusClass(state) {
  return {
    free: 'simple-cal-free',
    partial: 'simple-cal-partial',
    full: 'simple-cal-full',
    conflict: 'simple-cal-conflict',
  }[state] || 'simple-cal-free';
}

function SimpleMetric({ label, value, hint }) {
  return <div className="simple-cal-metric">
    <small>{label}</small>
    <b>{value}</b>
    {hint && <span>{hint}</span>}
  </div>;
}

function TodayList({ selectedDay, rooms, bookings, people }) {
  const rows = rooms.map((room) => ({ room, data: getRoomDay(room, selectedDay, bookings, people) }));
  return <div className="simple-cal-card">
    <div className="simple-cal-card-head">
      <h3>Dnes / vybraný deň</h3>
      <span>{dayLabel(selectedDay)}</span>
    </div>
    <div className="simple-cal-room-list">
      {rows.map(({ room, data }) => <div key={room.id} className="simple-cal-room-row">
        <div>
          <b>{roomLabel(room)}</b>
          <small>{data.occupied}/{data.capacity} obsadené · {data.free} voľné</small>
        </div>
        <span className={statusClass(data.state)}>{data.conflicts ? 'Konflikt' : data.state === 'full' ? 'Plné' : data.state === 'partial' ? 'Čiastočne' : 'Voľné'}</span>
      </div>)}
    </div>
  </div>;
}

function WeekGrid({ selectedDay, rooms, bookings, people, onSelectDay }) {
  const days = Array.from({ length: 7 }, (_, index) => addDays(selectedDay, index));
  return <div className="simple-cal-card simple-cal-week">
    <div className="simple-cal-card-head">
      <h3>7 dní</h3>
      <span>Izby × dni</span>
    </div>
    <div className="simple-cal-week-grid" style={{ gridTemplateColumns: `130px repeat(${days.length}, minmax(82px, 1fr))` }}>
      <div className="simple-cal-week-head">Izba</div>
      {days.map((day) => <button key={day} className="simple-cal-week-head" onClick={() => onSelectDay(day)}>{shortDayLabel(day)}</button>)}
      {rooms.map((room) => <React.Fragment key={room.id}>
        <div className="simple-cal-week-room">{roomLabel(room)}</div>
        {days.map((day) => {
          const data = getRoomDay(room, day, bookings, people);
          return <button key={`${room.id}-${day}`} onClick={() => onSelectDay(day)} className={`simple-cal-week-cell ${statusClass(data.state)}`} title={`${roomLabel(room)} · ${day} · ${data.occupied}/${data.capacity}`}>
            <b>{data.occupied}/{data.capacity}</b>
            {(data.arrivals > 0 || data.departures > 0) && <small>{data.arrivals ? `+${data.arrivals}` : ''}{data.departures ? ` −${data.departures}` : ''}</small>}
          </button>;
        })}
      </React.Fragment>)}
    </div>
  </div>;
}

function MonthGrid({ anchor, selectedDay, rooms, bookings, people, onSelectDay }) {
  const days = getMonthDays(anchor);
  const currentMonth = startOfMonth(anchor).slice(0, 7);
  return <div className="simple-cal-card">
    <div className="simple-cal-card-head">
      <h3>Mesiac</h3>
      <span>{monthLabel(anchor)}</span>
    </div>
    <div className="simple-cal-weekdays">{['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'].map((d) => <b key={d}>{d}</b>)}</div>
    <div className="simple-cal-month-grid">
      {days.map((day) => {
        const stats = getDailyStats(day, rooms, bookings, people);
        const muted = !day.startsWith(currentMonth);
        const selected = day === selectedDay;
        return <button key={day} onClick={() => onSelectDay(day)} className={`simple-cal-month-day ${muted ? 'is-muted' : ''} ${selected ? 'is-selected' : ''}`}>
          <span>{Number(day.slice(8))}</span>
          <b>{stats.rate}%</b>
          <small>{stats.free}/{stats.beds} voľné</small>
          <i style={{ width: `${stats.rate}%` }} />
        </button>;
      })}
    </div>
  </div>;
}

export default function AuroraCalendar({ rooms = [], bookings = [], people = [] }) {
  const [anchor, setAnchor] = useState(startOfMonth(today()));
  const [selectedDay, setSelectedDay] = useState(today());
  const [view, setView] = useState('week');

  const sortedRooms = useMemo(() => buildRoomRows(rooms), [rooms]);
  const sortedBookings = useMemo(() => normalizeBookings(bookings), [bookings]);
  const sortedPeople = useMemo(() => normalizePeople(people), [people]);
  const stats = getDailyStats(selectedDay, sortedRooms, sortedBookings, sortedPeople);

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

  return <section className="simple-cal-shell">
    <div className="simple-cal-header">
      <div>
        <h1>Kalendár</h1>
        <p>Jednoduchý prehľad obsadenosti izieb. Zelená = voľné, žltá = čiastočne, červená = plné.</p>
      </div>
      <div className="simple-cal-actions">
        <button onClick={goToday}><Home size={16} /> Dnes</button>
        <button className={view === 'today' ? 'is-active' : ''} onClick={() => setView('today')}><ListChecks size={16} /> Deň</button>
        <button className={view === 'week' ? 'is-active' : ''} onClick={() => setView('week')}><CalendarDays size={16} /> 7 dní</button>
        <button className={view === 'month' ? 'is-active' : ''} onClick={() => setView('month')}><CalendarDays size={16} /> Mesiac</button>
      </div>
    </div>

    <div className="simple-cal-toolbar">
      <button onClick={() => shiftMonth(-1)} aria-label="Predchádzajúci mesiac"><ChevronLeft size={18} /></button>
      <strong>{monthLabel(anchor)}</strong>
      <button onClick={() => shiftMonth(1)} aria-label="Ďalší mesiac"><ChevronRight size={18} /></button>
      <input type="date" value={selectedDay} onChange={(event) => selectDay(event.target.value)} />
      <button onClick={goToday}><RefreshCw size={16} /> Obnoviť dnes</button>
    </div>

    <div className="simple-cal-metrics">
      <SimpleMetric label="Obsadenosť" value={`${stats.occupied}/${stats.beds}`} hint={`${stats.rate}%`} />
      <SimpleMetric label="Voľné" value={stats.free} hint="lôžok" />
      <SimpleMetric label="Príchody" value={stats.arrivals} hint={selectedDay} />
      <SimpleMetric label="Odchody" value={stats.departures} hint={selectedDay} />
      <SimpleMetric label="Konflikty" value={stats.conflicts} hint="kontrola" />
    </div>

    {view === 'today' && <TodayList selectedDay={selectedDay} rooms={sortedRooms} bookings={sortedBookings} people={sortedPeople} />}
    {view === 'week' && <WeekGrid selectedDay={selectedDay} rooms={sortedRooms} bookings={sortedBookings} people={sortedPeople} onSelectDay={selectDay} />}
    {view === 'month' && <MonthGrid anchor={anchor} selectedDay={selectedDay} rooms={sortedRooms} bookings={sortedBookings} people={sortedPeople} onSelectDay={selectDay} />}
  </section>;
}
