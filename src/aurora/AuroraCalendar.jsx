import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Layers, LayoutGrid, ListChecks, Sparkles } from 'lucide-react';

const CANCELLED = new Set(['Zrušená', 'Da huy', 'cancelled']);

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function today() {
  return isoDate(new Date());
}

function addDays(value, amount) {
  const d = new Date(value);
  d.setDate(d.getDate() + amount);
  return isoDate(d);
}

function startOfMonth(value) {
  const d = new Date(`${value || today()}T00:00:00`);
  return isoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

function monthLabel(value) {
  return new Intl.DateTimeFormat('sk-SK', { month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function dayLabel(value) {
  return new Intl.DateTimeFormat('sk-SK', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${value}T00:00:00`));
}

function parseBeds(booking) {
  if (Array.isArray(booking?.reserved_beds)) return booking.reserved_beds;
  if (typeof booking?.reserved_beds === 'string') {
    try { return JSON.parse(booking.reserved_beds); } catch { return []; }
  }
  return booking?.room_id && booking?.bed_code ? [{ room_id: booking.room_id, bed_code: booking.bed_code }] : [];
}

function overlapsDates(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart < bEnd && aEnd > bStart;
}

function roomLabel(room) {
  return `P${String(room?.room_number || '').padStart(3, '0')}`;
}

function bedLabel(room, bedCode) {
  return `${roomLabel(room)}-${bedCode}`;
}

function safeDate(value, fallback = '') {
  return String(value || fallback || '').slice(0, 10);
}

function compareIso(a, b) {
  return safeDate(a).localeCompare(safeDate(b));
}

function normalizeBookings(bookings) {
  return (bookings || [])
    .filter((booking) => !CANCELLED.has(booking.status))
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
  return (people || [])
    .filter((p) => p.status === 'checked_in')
    .slice()
    .sort((a, b) => {
      const aStart = a.checkin_at || a.actual_check_in || a.created_at;
      const bStart = b.checkin_at || b.actual_check_in || b.created_at;
      const byCheckIn = compareIso(aStart, bStart);
      if (byCheckIn !== 0) return byCheckIn;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
}

function buildBedRows(rooms) {
  return (rooms || []).flatMap((room) => Array.from({ length: Number(room.capacity || 3) }, (_, index) => ({
    room,
    bed_code: String(index + 1),
    id: `${room.id}-${index + 1}`,
    label: bedLabel(room, index + 1),
  })));
}

function eventStartForRow(row, bookings, people) {
  const bookingDates = normalizeBookings(bookings).flatMap((booking) => {
    const hasBed = parseBeds(booking).some((bed) => String(bed.room_id) === String(row.room.id) && String(bed.bed_code) === String(row.bed_code));
    return hasBed ? [safeDate(booking.check_in_date)] : [];
  });
  const peopleDates = normalizePeople(people).flatMap((person) => {
    if (String(person.room_id) !== String(row.room.id) || String(person.bed_code) !== String(row.bed_code)) return [];
    return [safeDate(person.checkin_at || person.actual_check_in || person.created_at)];
  });
  return [...bookingDates, ...peopleDates].filter(Boolean).sort()[0] || '9999-12-31';
}

function sortBedRowsByCheckIn(bedRows, bookings, people) {
  return (bedRows || []).slice().sort((a, b) => {
    const byDate = eventStartForRow(a, bookings, people).localeCompare(eventStartForRow(b, bookings, people));
    if (byDate !== 0) return byDate;
    const byRoom = Number(a.room?.room_number || 0) - Number(b.room?.room_number || 0);
    if (byRoom !== 0) return byRoom;
    return Number(a.bed_code || 0) - Number(b.bed_code || 0);
  });
}

function getCellEvents(row, day, bookings, people) {
  const checked = normalizePeople(people).filter((person) => {
    if (String(person.room_id) !== String(row.room.id) || String(person.bed_code) !== String(row.bed_code)) return false;
    const start = String(person.checkin_at || person.actual_check_in || person.created_at || day).slice(0, 10);
    const end = String(person.checkout_at || person.actual_check_out || '').slice(0, 10);
    return day >= start && (!end || day < end);
  });

  const bookingHits = normalizeBookings(bookings).filter((booking) => {
    if (!overlapsDates(day, addDays(day, 1), booking.check_in_date, booking.check_out_date)) return false;
    return parseBeds(booking).some((bed) => String(bed.room_id) === String(row.room.id) && String(bed.bed_code) === String(row.bed_code));
  });

  return { checked, bookings: bookingHits };
}

function statusForCell(row, day, bookings, people) {
  const { checked, bookings: hits } = getCellEvents(row, day, bookings, people);
  if (checked.length > 1 || hits.length > 1) {
    return { state: 'conflict', title: 'Konflikt', detail: `${checked.length + hits.length} záznamy`, person: checked[0], booking: hits[0] };
  }
  if (checked.length === 1) {
    const p = checked[0];
    return { state: 'occupied', title: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Ubytovaný', detail: p.company_name || 'Check-in osoba', person: p };
  }
  if (hits.length === 1) {
    const b = hits[0];
    const name = b.company_name || b.guest_name || b.contact_person || 'Rezervácia';
    if (b.check_in_date === day) return { state: 'arrival', title: name, detail: 'Príchod dnes', booking: b };
    if (b.check_out_date === addDays(day, 1)) return { state: 'departure', title: name, detail: 'Odchod dnes', booking: b };
    return { state: 'reserved', title: name, detail: b.booking_code || 'Rezervované', booking: b };
  }
  return { state: 'free', title: 'Voľné', detail: '' };
}

function cellClass(state) {
  return {
    free: 'aurora-cell-free',
    reserved: 'aurora-cell-reserved',
    occupied: 'aurora-cell-occupied',
    arrival: 'aurora-cell-arrival',
    departure: 'aurora-cell-departure',
    conflict: 'aurora-cell-conflict',
  }[state] || 'aurora-cell-free';
}

function getDailyStats(day, bedRows, bookings, people) {
  const states = bedRows.map((row) => statusForCell(row, day, bookings, people).state);
  const busy = states.filter((state) => state !== 'free').length;
  return {
    beds: bedRows.length,
    free: states.filter((state) => state === 'free').length,
    busy,
    arrivals: states.filter((state) => state === 'arrival').length,
    departures: states.filter((state) => state === 'departure').length,
    conflicts: states.filter((state) => state === 'conflict').length,
    rate: bedRows.length ? Math.round((busy / bedRows.length) * 100) : 0,
  };
}

function getMonthDays(anchor) {
  const first = new Date(`${startOfMonth(anchor)}T00:00:00`);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const d = new Date(start);
    d.setDate(start.getDate() + index);
    return isoDate(d);
  });
}

function AuroraMetric({ title, value, hint, tone = 'slate' }) {
  return <div className={`aurora-metric aurora-metric-${tone}`}>
    <div className="aurora-metric-title">{title}</div>
    <div className="aurora-metric-value">{value}</div>
    {hint && <div className="aurora-metric-hint">{hint}</div>}
  </div>;
}

function AuroraLegend() {
  const items = [
    ['free', 'Voľné'],
    ['reserved', 'Rezervované'],
    ['occupied', 'Ubytované'],
    ['arrival', 'Príchod'],
    ['departure', 'Odchod'],
    ['conflict', 'Konflikt'],
  ];
  return <div className="aurora-legend">
    {items.map(([state, label]) => <span key={state}><i className={`aurora-dot ${cellClass(state)}`} />{label}</span>)}
  </div>;
}


function getTimelineSegments(row, days, bookings, people) {
  if (!days?.length) return [];
  const rangeStart = days[0];
  const rangeEnd = addDays(days[days.length - 1], 1);
  const bookingSegments = normalizeBookings(bookings).flatMap((booking) => {
    const hasBed = parseBeds(booking).some((bed) => String(bed.room_id) === String(row.room.id) && String(bed.bed_code) === String(row.bed_code));
    if (!hasBed || !overlapsDates(rangeStart, rangeEnd, booking.check_in_date, booking.check_out_date)) return [];
    const title = booking.company_name || booking.guest_name || booking.contact_person || 'Rezervácia';
    return [{
      type: 'booking',
      state: booking.check_in_date === rangeStart ? 'arrival' : 'reserved',
      start: booking.check_in_date,
      end: booking.check_out_date,
      title,
      detail: booking.booking_code || 'Rezervácia',
      sortKey: `${safeDate(booking.check_in_date)}-${safeDate(booking.check_out_date)}-${booking.booking_code || booking.id || ''}`,
    }];
  });
  const peopleSegments = normalizePeople(people).flatMap((person) => {
    if (String(person.room_id) !== String(row.room.id) || String(person.bed_code) !== String(row.bed_code)) return [];
    const start = safeDate(person.checkin_at || person.actual_check_in || person.created_at, rangeStart);
    const end = safeDate(person.checkout_at || person.actual_check_out, rangeEnd) || rangeEnd;
    if (!overlapsDates(rangeStart, rangeEnd, start, end)) return [];
    const title = `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.company_name || 'Ubytovaný';
    return [{
      type: 'person',
      state: 'occupied',
      start,
      end,
      title,
      detail: person.company_name || 'Check-in osoba',
      sortKey: `${start}-${end}-${person.id || ''}`,
    }];
  });
  return [...bookingSegments, ...peopleSegments].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

function clampSegmentToDays(segment, days) {
  const rangeStart = days[0];
  const rangeEnd = addDays(days[days.length - 1], 1);
  const start = segment.start < rangeStart ? rangeStart : segment.start;
  const end = segment.end > rangeEnd ? rangeEnd : segment.end;
  const startIndex = days.indexOf(start);
  const endDay = addDays(end, -1);
  const endIndex = days.indexOf(endDay);
  return {
    startColumn: (startIndex >= 0 ? startIndex : 0) + 1,
    endColumn: (endIndex >= 0 ? endIndex : days.length - 1) + 2,
  };
}

function segmentsConflict(segments) {
  return segments.some((segment, index) => segments.some((other, otherIndex) => otherIndex !== index && overlapsDates(segment.start, segment.end, other.start, other.end)));
}

function AuroraTimeline({ days, bedRows, bookings, people }) {
  return <div className="aurora-timeline-shell">
    <div className="aurora-timeline-grid" style={{ gridTemplateColumns: `180px repeat(${days.length}, minmax(72px, 1fr))` }}>
      <div className="aurora-timeline-head aurora-sticky-left">Lôžko</div>
      {days.map((day) => <div key={day} className="aurora-timeline-head">{dayLabel(day)}</div>)}
      {bedRows.map((row) => {
        const segments = getTimelineSegments(row, days, bookings, people);
        const hasConflict = segmentsConflict(segments);
        return <React.Fragment key={row.id}>
          <div className="aurora-bed-label aurora-sticky-left">
            <b>{row.label}</b>
            <small>{row.room?.floor ? `${row.room.floor}. NP` : row.room?.room_type || 'Izba'}</small>
          </div>
          <div className="aurora-row-track" style={{ gridColumn: `span ${days.length}`, gridTemplateColumns: `repeat(${days.length}, minmax(72px, 1fr))` }}>
            {days.map((day) => <div key={`${row.id}-${day}`} className="aurora-row-day" />)}
            {segments.map((segment, index) => {
              const pos = clampSegmentToDays(segment, days);
              const state = hasConflict ? 'conflict' : segment.state;
              return <button key={`${row.id}-${segment.sortKey}-${index}`} type="button" className={`aurora-segment ${cellClass(state)}`} style={{ gridColumn: `${pos.startColumn} / ${pos.endColumn}` }} title={`${row.label} · ${segment.start} → ${segment.end} · ${segment.title}`}>
                <span>{segment.title}</span>
                <em>{segment.start} → {segment.end}</em>
              </button>;
            })}
          </div>
        </React.Fragment>;
      })}
    </div>
  </div>;
}

function AuroraMonth({ anchor, bedRows, bookings, people, selectedDay, onSelectDay }) {
  const days = getMonthDays(anchor);
  const currentMonth = anchor.slice(0, 7);
  return <div className="aurora-month-card">
    <div className="aurora-weekdays">{['Po','Ut','St','Št','Pi','So','Ne'].map((d) => <b key={d}>{d}</b>)}</div>
    <div className="aurora-month-grid">
      {days.map((day) => {
        const stats = getDailyStats(day, bedRows, bookings, people);
        const muted = !day.startsWith(currentMonth);
        const isSelected = day === selectedDay;
        return <button key={day} type="button" onClick={() => onSelectDay(day)} className={`aurora-day ${muted ? 'is-muted' : ''} ${isSelected ? 'is-selected' : ''}`}>
          <span>{Number(day.slice(8))}</span>
          <strong>{stats.rate}%</strong>
          <div className="aurora-day-bar"><i style={{ width: `${stats.rate}%` }} /></div>
          <small>{stats.free}/{stats.beds} voľné</small>
          {stats.conflicts > 0 && <em>{stats.conflicts} konflikt</em>}
        </button>;
      })}
    </div>
  </div>;
}

function AuroraDayPanel({ selectedDay, bedRows, bookings, people }) {
  const stats = getDailyStats(selectedDay, bedRows, bookings, people);
  const rows = bedRows.map((row) => ({ row, status: statusForCell(row, selectedDay, bookings, people) }));
  const important = rows.filter((x) => ['arrival', 'departure', 'conflict'].includes(x.status.state));
  return <div className="aurora-day-panel">
    <div className="aurora-panel-head">
      <span>{dayLabel(selectedDay)}</span>
      <b>{stats.rate}% obsadenosť</b>
    </div>
    <div className="aurora-panel-stats">
      <span>Voľné <b>{stats.free}</b></span>
      <span>Príchody <b>{stats.arrivals}</b></span>
      <span>Odchody <b>{stats.departures}</b></span>
      <span>Konflikty <b>{stats.conflicts}</b></span>
    </div>
    <div className="aurora-panel-list">
      {(important.length ? important : rows.filter((x) => x.status.state !== 'free')).slice(0, 16).map(({ row, status }) => <div key={row.id} className="aurora-panel-item">
        <i className={`aurora-dot ${cellClass(status.state)}`} />
        <div><b>{row.label}</b><small>{status.title} · {status.detail || 'obsadené'}</small></div>
      </div>)}
      {rows.every((x) => x.status.state === 'free') && <div className="aurora-empty">V tento deň sú všetky lôžka voľné.</div>}
    </div>
  </div>;
}

function AuroraMobileDay({ days, bedRows, bookings, people, selectedDay, onSelectDay }) {
  const selectedRows = bedRows.map((row) => ({ row, status: statusForCell(row, selectedDay, bookings, people) }));
  return <div className="aurora-mobile">
    <div className="aurora-mobile-days">
      {days.map((day) => <button key={day} onClick={() => onSelectDay(day)} className={day === selectedDay ? 'is-selected' : ''}>{day.slice(5)}</button>)}
    </div>
    <div className="aurora-mobile-list">
      {selectedRows.map(({ row, status }) => <div key={row.id} className="aurora-mobile-bed">
        <div><b>{row.label}</b><small>{status.detail || status.title}</small></div>
        <span className={cellClass(status.state)}>{status.title}</span>
      </div>)}
    </div>
  </div>;
}

export default function AuroraCalendar({ rooms = [], bookings = [], people = [] }) {
  const [anchor, setAnchor] = useState(startOfMonth(today()));
  const [selectedDay, setSelectedDay] = useState(today());
  const [view, setView] = useState('timeline');
  const rawBedRows = useMemo(() => buildBedRows(rooms), [rooms]);
  const sortedBookings = useMemo(() => normalizeBookings(bookings), [bookings]);
  const sortedPeople = useMemo(() => normalizePeople(people), [people]);
  const bedRows = useMemo(() => sortBedRowsByCheckIn(rawBedRows, sortedBookings, sortedPeople), [rawBedRows, sortedBookings, sortedPeople]);
  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(selectedDay, index)), [selectedDay]);
  const todayStats = getDailyStats(selectedDay, bedRows, sortedBookings, sortedPeople);
  const monthlyBusy = useMemo(() => getMonthDays(anchor).reduce((sum, day) => sum + getDailyStats(day, bedRows, sortedBookings, sortedPeople).busy, 0), [anchor, bedRows, sortedBookings, sortedPeople]);

  function shiftMonth(amount) {
    const d = new Date(`${anchor}T00:00:00`);
    d.setMonth(d.getMonth() + amount);
    const next = startOfMonth(isoDate(d));
    setAnchor(next);
    setSelectedDay(next);
  }

  return <section className="aurora-shell">
    <div className="aurora-hero">
      <div>
        <div className="aurora-kicker"><Sparkles size={16} /> StayHub v3.5A.2 · Aurora Interactive Timeline</div>
        <h1>Aurora Calendar</h1>
        <p>Samostatná plánovacia vrstva s interaktívnou timeline. Obsadenosť sa teraz zoraďuje chronologicky podľa check-in dátumu.</p>
      </div>
      <div className="aurora-switcher">
        <button className={view === 'timeline' ? 'is-active' : ''} onClick={() => setView('timeline')}><Layers size={17}/> Timeline</button>
        <button className={view === 'month' ? 'is-active' : ''} onClick={() => setView('month')}><CalendarDays size={17}/> Mesiac</button>
        <button className={view === 'mobile' ? 'is-active' : ''} onClick={() => setView('mobile')}><ListChecks size={17}/> Deň</button>
      </div>
    </div>

    <div className="aurora-toolbar">
      <div className="aurora-month-nav">
        <button onClick={() => shiftMonth(-1)}><ChevronLeft size={18}/></button>
        <b>{monthLabel(anchor)}</b>
        <button onClick={() => shiftMonth(1)}><ChevronRight size={18}/></button>
      </div>
      <input type="date" value={selectedDay} onChange={(event) => { setSelectedDay(event.target.value); setAnchor(startOfMonth(event.target.value)); }} />
      <AuroraLegend />
    </div>

    <div className="aurora-metrics">
      <AuroraMetric title="Lôžka spolu" value={bedRows.length} hint={`${rooms.length} izieb`} />
      <AuroraMetric title="Voľné dnes" value={todayStats.free} hint={`${todayStats.rate}% obsadenosť`} tone="green" />
      <AuroraMetric title="Príchody" value={todayStats.arrivals} hint={selectedDay} tone="orange" />
      <AuroraMetric title="Konflikty" value={todayStats.conflicts} hint="prekryté záznamy" tone="red" />
      <AuroraMetric title="Mesačné jednotky" value={monthlyBusy} hint="obsadené lôžko-dni" tone="blue" />
    </div>

    {view === 'timeline' && <AuroraTimeline days={days} bedRows={bedRows} bookings={sortedBookings} people={sortedPeople} />}
    {view === 'month' && <div className="aurora-split"><AuroraMonth anchor={anchor} bedRows={bedRows} bookings={sortedBookings} people={sortedPeople} selectedDay={selectedDay} onSelectDay={setSelectedDay} /><AuroraDayPanel selectedDay={selectedDay} bedRows={bedRows} bookings={sortedBookings} people={sortedPeople} /></div>}
    {view === 'mobile' && <AuroraMobileDay days={days} bedRows={bedRows} bookings={sortedBookings} people={sortedPeople} selectedDay={selectedDay} onSelectDay={setSelectedDay} />}

    <div className="aurora-note"><LayoutGrid size={18}/><span>v3.5A.2: interaktívne časové bloky, chronologické triedenie podľa check-in a zvýraznenie prekrytých konfliktov. Drag & drop zápis príde v ďalšej fáze.</span></div>
  </section>;
}
