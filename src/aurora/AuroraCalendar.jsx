import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Layers, ListChecks, Sparkles } from 'lucide-react';
import { t as translate } from '../i18n.js';

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

function localeForLang(lang = 'sk') {
  return { sk: 'sk-SK', vi: 'vi-VN', en: 'en-GB' }[lang] || 'sk-SK';
}

function tx(key, lang) {
  return translate(key, lang);
}

function monthLabel(value, lang = 'sk') {
  return new Intl.DateTimeFormat(localeForLang(lang), { month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function dayLabel(value, lang = 'sk') {
  return new Intl.DateTimeFormat(localeForLang(lang), { weekday: 'short', day: '2-digit', month: '2-digit' }).format(new Date(`${value}T00:00:00`));
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

function personStart(person, fallback = '') {
  return safeDate(person?.checkin_at || person?.actual_check_in || person?.created_at, fallback);
}

function personEnd(person, fallback = '') {
  return safeDate(
    person?.checkout_at ||
    person?.actual_check_out ||
    person?.expected_checkout_date ||
    person?.check_out_date,
    fallback
  );
}

function sameRowPerson(row, person) {
  return String(person?.room_id) === String(row.room.id) && String(person?.bed_code) === String(row.bed_code);
}

function sameBooking(booking, person) {
  if (!booking || !person) return false;
  const personBookingId = person.booking_id ? String(person.booking_id) : '';
  const personBookingCode = person.booking_code ? String(person.booking_code) : '';
  const bookingId = booking.id ? String(booking.id) : '';
  const bookingCode = booking.booking_code ? String(booking.booking_code) : '';
  return Boolean(
    (personBookingId && bookingId && personBookingId === bookingId) ||
    (personBookingId && bookingCode && personBookingId === bookingCode) ||
    (personBookingCode && bookingCode && personBookingCode === bookingCode)
  );
}

function checkedPeopleForBookingBed(row, booking, people) {
  return normalizePeople(people).filter((person) => sameRowPerson(row, person) && bookingMatchesPersonLoosely(row, booking, person));
}

function bookingMatchesPersonLoosely(row, booking, person) {
  if (!booking || !person) return false;
  const hasBed = parseBeds(booking).some((bed) => String(bed.room_id) === String(row.room.id) && String(bed.bed_code) === String(row.bed_code));
  if (!hasBed) return false;
  if (sameBooking(booking, person)) return true;

  const personName = `${person.first_name || ''} ${person.last_name || ''}`.trim().toLowerCase();
  const bookingNames = [booking.company_name, booking.guest_name, booking.contact_person]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  const sameName = Boolean(personName && bookingNames.some((value) => value.includes(personName) || personName.includes(value)));
  const sameCompany = Boolean(person.company_name && booking.company_name && String(person.company_name).toLowerCase() === String(booking.company_name).toLowerCase());
  const pStart = personStart(person, booking.check_in_date);

  // Fallback pre staršie demo dáta: pri check-ine nemusí byť uložené booking_id.
  // Vtedy považujeme osobu za naviazanú na rezerváciu, ak sedí lôžko a dátum nástupu.
  return Boolean((sameName || sameCompany || !person.booking_id) && pStart === safeDate(booking.check_in_date));
}

function linkedBookingForPerson(row, person, bookings) {
  const start = personStart(person, '');
  return normalizeBookings(bookings)
    .filter((booking) => bookingMatchesPersonLoosely(row, booking, person))
    .filter((booking) => !start || safeDate(booking.check_in_date) <= start)
    .sort((a, b) => {
      const byEnd = compareIso(a.check_out_date, b.check_out_date);
      if (byEnd !== 0) return byEnd;
      return String(a.id || a.booking_code || '').localeCompare(String(b.id || b.booking_code || ''));
    })[0];
}

function minIsoDate(a, b) {
  const da = safeDate(a);
  const db = safeDate(b);
  if (da && db) return da <= db ? da : db;
  return da || db;
}

function bookingCandidatesForPersonRow(row, person, bookings) {
  const start = personStart(person, '');
  return normalizeBookings(bookings).filter((booking) => {
    const hasBed = parseBeds(booking).some((bed) => String(bed.room_id) === String(row.room.id) && String(bed.bed_code) === String(row.bed_code));
    if (!hasBed) return false;
    if (sameBooking(booking, person)) return true;

    // Najbezpečnejšie párovanie pre kalendár: rovnaké lôžko + rovnaký dátum nástupu.
    // Nepoužívame meno ani firmu ako podmienku, lebo firemná rezervácia často nemá mená hostí.
    return Boolean(start && safeDate(booking.check_in_date) === start);
  }).sort((a, b) => {
    const byEnd = compareIso(a.check_out_date, b.check_out_date);
    if (byEnd !== 0) return byEnd;
    return String(a.id || a.booking_code || '').localeCompare(String(b.id || b.booking_code || ''));
  });
}

function effectivePersonEnd(row, person, bookings, fallback = '') {
  const directEnd = personEnd(person, '');
  const linkedBooking = bookingCandidatesForPersonRow(row, person, bookings)[0] || linkedBookingForPerson(row, person, bookings);
  const bookingEnd = safeDate(linkedBooking?.check_out_date, '');

  // Denná obsadenosť je zdroj pravdy. Pri osobe vytvorenej z check-inu rezervácie
  // nikdy neťaháme obsadenosť za check_out_date naviazanej rezervácie.
  const cappedEnd = minIsoDate(directEnd, bookingEnd);
  return safeDate(cappedEnd, fallback);
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
  const normalizedPeople = normalizePeople(people);
  const checked = normalizedPeople.filter((person) => {
    if (!sameRowPerson(row, person)) return false;
    const start = personStart(person, day);
    const end = effectivePersonEnd(row, person, bookings, '');
    return day >= start && (!end || day < end);
  });

  const bookingHits = normalizeBookings(bookings).filter((booking) => {
    if (!overlapsDates(day, addDays(day, 1), booking.check_in_date, booking.check_out_date)) return false;
    const hasBed = parseBeds(booking).some((bed) => String(bed.room_id) === String(row.room.id) && String(bed.bed_code) === String(row.bed_code));
    if (!hasBed) return false;

    // Ak už existuje reálny check-in záznam na tom istom lôžku a k tej istej rezervácii,
    // timeline má používať skutočný pobyt osoby, nie pôvodný dlhý rozsah rezervácie.
    return !checked.some((person) => bookingMatchesPersonLoosely(row, booking, person));
  });

  return { checked, bookings: bookingHits };
}

function statusForCell(row, day, bookings, people, lang = 'sk') {
  const { checked, bookings: hits } = getCellEvents(row, day, bookings, people);
  if (checked.length + hits.length > 1) {
    return { state: 'conflict', title: tx('Konflikt', lang), detail: `${checked.length + hits.length} ${tx('záznamy', lang)}`, person: checked[0], booking: hits[0] };
  }
  if (checked.length === 1) {
    const p = checked[0];
    return { state: 'occupied', title: `${p.first_name || ''} ${p.last_name || ''}`.trim() || tx('Ubytovaný', lang), detail: p.company_name || tx('Check-in osoba', lang), person: p };
  }
  if (hits.length === 1) {
    const b = hits[0];
    const name = b.company_name || b.guest_name || b.contact_person || tx('Rezervácia', lang);
    if (b.check_in_date === day) return { state: 'arrival', title: name, detail: tx('Príchod dnes', lang), booking: b };
    if (b.check_out_date === addDays(day, 1)) return { state: 'departure', title: name, detail: tx('Odchod dnes', lang), booking: b };
    return { state: 'reserved', title: name, detail: b.booking_code || tx('Rezervované', lang), booking: b };
  }
  return { state: 'free', title: tx('Voľné', lang), detail: '' };
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

function getDailyStats(day, bedRows, bookings, people, lang = 'sk') {
  const states = bedRows.map((row) => statusForCell(row, day, bookings, people, lang).state);
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

function AuroraLegend({ lang = 'sk' }) {
  const items = [
    ['free', 'Voľné'],
    ['reserved', 'Rezervované'],
    ['occupied', 'Ubytované'],
    ['arrival', 'Príchod'],
    ['departure', 'Odchod'],
    ['conflict', 'Konflikt'],
  ];
  return <div className="aurora-legend">
    {items.map(([state, label]) => <span key={state}><i className={`aurora-dot ${cellClass(state)}`} />{tx(label, lang)}</span>)}
  </div>;
}


function getTimelineSegments(row, days, bookings, people, lang = 'sk') {
  if (!days?.length) return [];
  const rangeStart = days[0];
  const rangeEnd = addDays(days[days.length - 1], 1);
  const bookingSegments = normalizeBookings(bookings).flatMap((booking) => {
    const hasBed = parseBeds(booking).some((bed) => String(bed.room_id) === String(row.room.id) && String(bed.bed_code) === String(row.bed_code));
    if (!hasBed || !overlapsDates(rangeStart, rangeEnd, booking.check_in_date, booking.check_out_date)) return [];
    const checkedForThisBooking = checkedPeopleForBookingBed(row, booking, people);
    if (checkedForThisBooking.length) return [];
    const title = booking.company_name || booking.guest_name || booking.contact_person || tx('Rezervácia', lang);
    return [{
      type: 'booking',
      state: booking.check_in_date === rangeStart ? 'arrival' : 'reserved',
      start: booking.check_in_date,
      end: booking.check_out_date,
      title,
      detail: booking.booking_code || tx('Rezervácia', lang),
      sortKey: `${safeDate(booking.check_in_date)}-${safeDate(booking.check_out_date)}-${booking.booking_code || booking.id || ''}`,
    }];
  });
  const peopleSegments = normalizePeople(people).flatMap((person) => {
    if (String(person.room_id) !== String(row.room.id) || String(person.bed_code) !== String(row.bed_code)) return [];
    const start = personStart(person, rangeStart);
    const end = effectivePersonEnd(row, person, bookings, rangeEnd) || rangeEnd;
    if (!overlapsDates(rangeStart, rangeEnd, start, end)) return [];
    const title = `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.company_name || tx('Ubytovaný', lang);
    return [{
      type: 'person',
      state: 'occupied',
      start,
      end,
      title,
      detail: person.company_name || tx('Check-in osoba', lang),
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

function AuroraTimeline({ days, bedRows, bookings, people, lang = 'sk' }) {
  return <div className="aurora-timeline-shell aurora-date-grid-shell">
    <div className="aurora-timeline-grid" style={{ gridTemplateColumns: `180px repeat(${days.length}, minmax(72px, 1fr))` }}>
      <div className="aurora-timeline-head aurora-sticky-left">{tx('Lôžko', lang)}</div>
      {days.map((day) => <div key={day} className="aurora-timeline-head">{dayLabel(day, lang)}</div>)}
      {bedRows.map((row) => (
        <React.Fragment key={row.id}>
          <div className="aurora-bed-label aurora-sticky-left">
            <b>{row.label}</b>
            <small>{row.room?.floor ? `${row.room.floor}. NP` : row.room?.room_type || tx('Izba', lang)}</small>
          </div>
          <div className="aurora-row-track aurora-row-track-date-only" style={{ gridColumn: `span ${days.length}`, gridTemplateColumns: `repeat(${days.length}, minmax(72px, 1fr))` }}>
            {days.map((day) => {
              const cellStatus = statusForCell(row, day, bookings, people, lang);
              const isToday = day === today();
              const isBusy = cellStatus.state !== 'free';
              return <button
                key={`${row.id}-${day}`}
                type="button"
                className={`aurora-row-day aurora-date-cell aurora-row-day-${cellStatus.state} ${cellClass(cellStatus.state)} ${isToday ? 'is-today' : ''}`}
                title={`${row.label} · ${day} · ${cellStatus.title}${cellStatus.detail ? ` · ${cellStatus.detail}` : ''}`}
              >
                {isBusy && <span>{cellStatus.title}</span>}
                {isBusy && <em>{day}</em>}
              </button>;
            })}
          </div>
        </React.Fragment>
      ))}
    </div>
  </div>;
}

function AuroraMonth({ anchor, bedRows, bookings, people, selectedDay, onSelectDay, lang = 'sk' }) {
  const days = getMonthDays(anchor);
  const currentMonth = anchor.slice(0, 7);
  return <div className="aurora-month-card">
    <div className="aurora-weekdays">{['Po','Ut','St','Št','Pi','So','Ne'].map((d) => <b key={d}>{tx(d, lang)}</b>)}</div>
    <div className="aurora-month-grid">
      {days.map((day) => {
        const stats = getDailyStats(day, bedRows, bookings, people, lang);
        const muted = !day.startsWith(currentMonth);
        const isSelected = day === selectedDay;
        return <button key={day} type="button" onClick={() => onSelectDay(day)} className={`aurora-day ${muted ? 'is-muted' : ''} ${isSelected ? 'is-selected' : ''}`}>
          <span>{Number(day.slice(8))}</span>
          <strong>{stats.rate}%</strong>
          <div className="aurora-day-bar"><i style={{ width: `${stats.rate}%` }} /></div>
          <small>{stats.free}/{stats.beds} {tx('voľné', lang)}</small>
          {stats.conflicts > 0 && <em>{stats.conflicts} {tx('konflikt', lang)}</em>}
        </button>;
      })}
    </div>
  </div>;
}

function AuroraDayPanel({ selectedDay, bedRows, bookings, people, lang = 'sk' }) {
  const stats = getDailyStats(selectedDay, bedRows, bookings, people, lang);
  const rows = bedRows.map((row) => ({ row, status: statusForCell(row, selectedDay, bookings, people, lang) }));
  const important = rows.filter((x) => ['arrival', 'departure', 'conflict'].includes(x.status.state));
  return <div className="aurora-day-panel">
    <div className="aurora-panel-head">
      <span>{dayLabel(selectedDay, lang)}</span>
      <b>{stats.rate}% {tx('obsadenosť', lang)}</b>
    </div>
    <div className="aurora-panel-stats">
      <span>{tx('Voľné', lang)} <b>{stats.free}</b></span>
      <span>{tx('Príchody', lang)} <b>{stats.arrivals}</b></span>
      <span>{tx('Odchody', lang)} <b>{stats.departures}</b></span>
      <span>{tx('Konflikty', lang)} <b>{stats.conflicts}</b></span>
    </div>
    <div className="aurora-panel-list">
      {(important.length ? important : rows.filter((x) => x.status.state !== 'free')).slice(0, 16).map(({ row, status }) => <div key={row.id} className="aurora-panel-item">
        <i className={`aurora-dot ${cellClass(status.state)}`} />
        <div><b>{row.label}</b><small>{status.title} · {status.detail || tx('obsadené', lang)}</small></div>
      </div>)}
      {rows.every((x) => x.status.state === 'free') && <div className="aurora-empty">{tx('V tento deň sú všetky lôžka voľné.', lang)}</div>}
    </div>
  </div>;
}

function AuroraDayView({ days, bedRows, bookings, people, selectedDay, onSelectDay, lang = 'sk' }) {
  const selectedRows = bedRows.map((row) => ({ row, status: statusForCell(row, selectedDay, bookings, people, lang) }));
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

export default function AuroraCalendar({ rooms = [], bookings = [], people = [], lang = 'sk' }) {
  const initialDay = today();
  const [anchor, setAnchor] = useState(startOfMonth(initialDay));
  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [view, setView] = useState('timeline');
  const rawBedRows = useMemo(() => buildBedRows(rooms), [rooms]);
  const sortedBookings = useMemo(() => normalizeBookings(bookings), [bookings]);
  const sortedPeople = useMemo(() => normalizePeople(people), [people]);
  const bedRows = useMemo(() => sortBedRowsByCheckIn(rawBedRows, sortedBookings, sortedPeople), [rawBedRows, sortedBookings, sortedPeople]);
  const days = useMemo(() => Array.from({ length: 14 }, (_, index) => addDays(selectedDay, index)), [selectedDay]);
  const todayStats = getDailyStats(selectedDay, bedRows, sortedBookings, sortedPeople, lang);
  const monthlyBusy = useMemo(() => getMonthDays(anchor).reduce((sum, day) => sum + getDailyStats(day, bedRows, sortedBookings, sortedPeople, lang).busy, 0), [anchor, bedRows, sortedBookings, sortedPeople, lang]);

  function selectDay(day) {
    if (!day) return;
    setSelectedDay(day);
    setAnchor(startOfMonth(day));
  }

  function shiftMonth(amount) {
    const d = new Date(`${anchor}T00:00:00`);
    d.setMonth(d.getMonth() + amount);
    const next = startOfMonth(isoDate(d));
    setAnchor(next);
    if (!selectedDay.startsWith(next.slice(0, 7))) setSelectedDay(next);
  }

  function changeMonth(value) {
    if (!value) return;
    const next = `${value}-01`;
    setAnchor(next);
    if (!selectedDay.startsWith(value)) setSelectedDay(next);
  }

  function goToday() {
    const now = today();
    setSelectedDay(now);
    setAnchor(startOfMonth(now));
  }

  return <section className="aurora-shell">
    <div className="aurora-hero">
      <div>
        <div className="aurora-kicker"><Sparkles size={16} /> StayHub</div>
        <h1>{tx('Calendar', lang)}</h1>
        <p>{tx('Inteligentný plánovací kalendár pre rezervácie, ubytovanie a obsadenosť lôžok.', lang)}</p>
      </div>
      <div className="aurora-switcher">
        <button type="button" className={view === 'timeline' ? 'is-active' : ''} onClick={() => setView('timeline')}><Layers size={17}/> {tx('Timeline', lang)}</button>
        <button type="button" className={view === 'month' ? 'is-active' : ''} onClick={() => setView('month')}><CalendarDays size={17}/> {tx('Mesiac', lang)}</button>
        <button type="button" className={view === 'day' ? 'is-active' : ''} onClick={() => setView('day')}><ListChecks size={17}/> {tx('Deň', lang)}</button>
      </div>
    </div>

    <div className="aurora-toolbar">
      <div className="aurora-month-nav">
        <button type="button" aria-label={tx('Predchádzajúci mesiac', lang)} onClick={() => shiftMonth(-1)}><ChevronLeft size={18}/></button>
        <b>{monthLabel(anchor, lang)}</b>
        <button type="button" aria-label={tx('Nasledujúci mesiac', lang)} onClick={() => shiftMonth(1)}><ChevronRight size={18}/></button>
      </div>
      <div className="aurora-toolbar-group">
        <label>{tx('Mesiac', lang)}<input type="month" value={anchor.slice(0, 7)} onChange={(event) => changeMonth(event.target.value)} /></label>
        <label>{tx('Deň', lang)}<input type="date" value={selectedDay} onChange={(event) => selectDay(event.target.value)} /></label>
        <button type="button" className="aurora-today-button" onClick={goToday}>{tx('Dnes', lang)}</button>
      </div>
      <AuroraLegend lang={lang} />
    </div>

    <div className="aurora-metrics">
      <AuroraMetric title={tx('Lôžka spolu', lang)} value={bedRows.length} hint={`${rooms.length} ${tx('izieb', lang)}`} />
      <AuroraMetric title={tx('Voľné dnes', lang)} value={todayStats.free} hint={`${todayStats.rate}% ${tx('obsadenosť', lang)}`} tone="green" />
      <AuroraMetric title={tx('Príchody', lang)} value={todayStats.arrivals} hint={selectedDay} tone="orange" />
      <AuroraMetric title={tx('Konflikty', lang)} value={todayStats.conflicts} hint={tx('prekryté záznamy', lang)} tone="red" />
      <AuroraMetric title={tx('Mesačné jednotky', lang)} value={monthlyBusy} hint={tx('obsadené lôžko-dni', lang)} tone="blue" />
    </div>

    {view === 'timeline' && <AuroraTimeline days={days} bedRows={bedRows} bookings={sortedBookings} people={sortedPeople} lang={lang} />}
    {view === 'month' && <div className="aurora-split"><AuroraMonth anchor={anchor} bedRows={bedRows} bookings={sortedBookings} people={sortedPeople} selectedDay={selectedDay} onSelectDay={selectDay} lang={lang} /><AuroraDayPanel selectedDay={selectedDay} bedRows={bedRows} bookings={sortedBookings} people={sortedPeople} lang={lang} /></div>}
    {view === 'day' && <AuroraDayView days={days} bedRows={bedRows} bookings={sortedBookings} people={sortedPeople} selectedDay={selectedDay} onSelectDay={selectDay} lang={lang} />}
  </section>;
}
