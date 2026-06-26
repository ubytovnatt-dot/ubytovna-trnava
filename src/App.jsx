import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LANGUAGES, translateDom, t, pricingLabel } from './i18n.js';
import AuroraCalendar from './aurora/AuroraCalendar.jsx';
import { Menu, X, LogOut, Plus, Edit2, Trash2, Home, Calendar, CreditCard, Building2, Settings, UserCheck, DoorOpen, FileText, BarChart3, LayoutGrid, Download, Eye } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseAuth = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
let apiAccessToken = null;
function setApiToken(token) { apiAccessToken = token || null; }
const DEFAULT_PROPERTIES = [
  { id: 'postova-3', name: 'Postová 3', city: 'Trnava' },
  { id: 'mlynska-28', name: 'Mlynská 28', city: 'Košice' },
  { id: 'nova', name: 'Nová', city: 'Trnava' },
  { id: 'paulinska', name: 'Paulínska', city: 'Trnava' },
];

const USER_ROLES = {
  admin: {
    label: 'Admin',
    description: 'Plný prístup ku všetkým modulom, nastaveniam, mazaniu a reportom.',
    tabs: ['dashboard','rooms','bookings','calendar','checkin','checkout','payments','companies','documents','reports','settings'],
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canManageSettings: true,
    canViewReports: true,
    canViewDocuments: true,
    canManageCompanies: true,
    canManagePayments: true
  },
  manager: {
    label: 'Správca',
    description: 'Prevádzkový manažér: rezervácie, firmy, platby, check-in/out a reporty bez systémových nastavení.',
    tabs: ['dashboard','rooms','bookings','calendar','checkin','checkout','payments','companies','documents','reports'],
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canManageSettings: false,
    canViewReports: true,
    canViewDocuments: true,
    canManageCompanies: true,
    canManagePayments: true
  },
  reception: {
    label: 'Recepcia',
    description: 'Denná prevádzka: rezervácie, check-in, check-out a základné platby bez mazania.',
    tabs: ['dashboard','rooms','bookings','calendar','checkin','checkout','payments'],
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canManageSettings: false,
    canViewReports: false,
    canViewDocuments: false,
    canManageCompanies: false,
    canManagePayments: true
  },
  accounting: {
    label: 'Účtovník',
    description: 'Prístup k platbám, reportom a základnému prehľadu bez prevádzkových zásahov.',
    tabs: ['dashboard','payments','reports'],
    canCreate: true,
    canEdit: true,
    canDelete: false,
    canManageSettings: false,
    canViewReports: true,
    canViewDocuments: false,
    canManageCompanies: false,
    canManagePayments: true
  },
  housekeeping: {
    label: 'Housekeeping',
    description: 'Kontrola izieb a stavov ubytovania bez rezervácií, platieb a nastavení.',
    tabs: ['dashboard','rooms','checkout'],
    canCreate: false,
    canEdit: true,
    canDelete: false,
    canManageSettings: false,
    canViewReports: false,
    canViewDocuments: false,
    canManageCompanies: false,
    canManagePayments: false
  },
  viewer: {
    label: 'Viewer',
    description: 'Iba čítanie dashboardu, izieb, kalendára a rezervácií.',
    tabs: ['dashboard','rooms','bookings','calendar'],
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canManageSettings: false,
    canViewReports: false,
    canViewDocuments: false,
    canManageCompanies: false,
    canManagePayments: false
  }
};
const getRole = (role) => USER_ROLES[role] || USER_ROLES.reception;
const canAccessTab = (role, tab) => getRole(role).tabs.includes(tab);
const canDelete = (role) => !!getRole(role).canDelete;
const canManageSettings = (role) => !!getRole(role).canManageSettings;
const canViewDocuments = (role) => !!getRole(role).canViewDocuments;
const canViewReports = (role) => !!getRole(role).canViewReports;

const today = () => new Date().toISOString().slice(0, 10);
const monthOf = (d) => (d || today()).slice(0, 7);
const eur = (n) => `€${Number(n || 0).toFixed(2)}`;



function parseBeds(b) {
  if (Array.isArray(b?.reserved_beds)) return b.reserved_beds;
  if (typeof b?.reserved_beds === 'string') { try { return JSON.parse(b.reserved_beds); } catch { return []; } }
  return b?.room_id && b?.bed_code ? [{ room_id: b.room_id, bed_code: b.bed_code }] : [];
}
async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(apiAccessToken ? { Authorization: `Bearer ${apiAccessToken}` } : {}),
    ...(typeof localStorage !== 'undefined' && localStorage.getItem('stayhub_property') ? { 'X-Property-Id': localStorage.getItem('stayhub_property') } : {}),
    ...(options.headers || {})
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.success === false) throw new Error(data.error || 'API chyba');
  return data.data ?? data;
}
function bedLabel(b) { return `${b.room_label || `P${String(b.room_number || '').padStart(3, '0')}`}-${b.bed_code}`; }

function overlapsDates(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart < bEnd && aEnd > bStart;
}
function activeBookingsForToday(bookings) {
  const t = today();
  const cancelled = new Set(['Zrušená', 'Da huy', 'cancelled']);
  return (bookings || []).filter(b => !cancelled.has(b.status) && overlapsDates(t, nextDay(t), b.check_in_date, b.check_out_date));
}
function nextDay(d) {
  const x = new Date(d);
  x.setDate(x.getDate() + 1);
  return x.toISOString().slice(0, 10);
}
function roomLabel(room) { return `P${String(room?.room_number || '').padStart(3, '0')}`; }
function getRoomOccupancy(room, bookings = [], people = []) {
  const roomId = String(room.id);
  const activePeople = (people || []).filter(p => p.status === 'checked_in' && String(p.room_id) === roomId);
  const occupied = new Set(activePeople.map(p => String(p.bed_code)));
  const reserved = new Set();
  activeBookingsForToday(bookings).forEach(b => parseBeds(b).forEach(x => {
    if (String(x.room_id) === roomId && !occupied.has(String(x.bed_code))) reserved.add(String(x.bed_code));
  }));
  const capacity = Number(room.capacity || 0);
  return {
    capacity,
    occupied: occupied.size,
    reserved: reserved.size,
    free: Math.max(0, capacity - occupied.size - reserved.size),
    rate: capacity ? Math.round(((occupied.size + reserved.size) / capacity) * 100) : 0,
    occupiedBeds: [...occupied],
    reservedBeds: [...reserved]
  };
}
function occupancyClass(o) {
  if (!o.capacity) return 'border-gray-300';
  if (o.occupied + o.reserved >= o.capacity) return 'border-red-500';
  if (o.occupied + o.reserved > 0) return 'border-yellow-500';
  return 'border-green-500';
}


export default function UbytovnaApp() {
  const [logged, setLogged] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [people, setPeople] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({});
  const [lang, setLang] = useState(() => localStorage.getItem('stayhub_lang') || 'sk');
  const [selectedPropertyId, setSelectedPropertyId] = useState(() => localStorage.getItem('stayhub_property') || DEFAULT_PROPERTIES[0].id);
  const [currentRole, setCurrentRole] = useState('reception');
  const selectedProperty = DEFAULT_PROPERTIES.find((p) => p.id === selectedPropertyId) || DEFAULT_PROPERTIES[0];
  const roleInfo = getRole(currentRole);

  async function applySession(session) {
    if (!session?.access_token) {
      setApiToken(null);
      setCurrentUser(null);
      setCurrentRole('reception');
      setLogged(false);
      setAuthLoading(false);
      return;
    }
    setApiToken(session.access_token);
    try {
      const profile = await api('/api/me');
      const safeRole = USER_ROLES[profile.role] ? profile.role : 'reception';
      setCurrentUser({ ...profile, email: profile.email || session.user?.email });
      setCurrentRole(safeRole);
      setSelectedPropertyId(profile.property_id || DEFAULT_PROPERTIES[0].id);
      localStorage.setItem('stayhub_property', profile.property_id || DEFAULT_PROPERTIES[0].id);
      setActiveTab(getRole(safeRole).tabs[0] || 'dashboard');
      setLogged(true);
    } catch (e) {
      setError(e.message);
      setApiToken(null);
      setLogged(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function loginWithPassword(email, password) {
    if (!supabaseAuth) throw new Error('Chýba VITE_SUPABASE_URL alebo VITE_SUPABASE_ANON_KEY.');
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) throw error;
    await applySession(data.session);
  }

  async function logout() {
    if (supabaseAuth) await supabaseAuth.auth.signOut();
    setApiToken(null);
    setCurrentUser(null);
    setLogged(false);
    setRooms([]); setBookings([]); setPayments([]); setCompanies([]); setPeople([]); setDocuments([]); setStats({});
  }

  function changeLang(code) {
    setLang(code);
    localStorage.setItem('stayhub_lang', code);
  }

  useEffect(() => {
    const id = window.setTimeout(() => translateDom(lang), 0);
    return () => window.clearTimeout(id);
  }, [lang, logged, activeTab, sidebarOpen, selectedPropertyId, loading, error, rooms, bookings, payments, companies, people]);

  useEffect(() => {
    if (!supabaseAuth) {
      setAuthLoading(false);
      return undefined;
    }
    let mounted = true;
    supabaseAuth.auth.getSession().then(({ data }) => {
      if (mounted) applySession(data.session);
    });
    const { data: listener } = supabaseAuth.auth.onAuthStateChange((_event, session) => {
      if (mounted) applySession(session);
    });
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  async function fetchData() {
    setLoading(true); setError(null);
    try {
      const entries = [
        ['rooms', api('/api/rooms')],
        ['bookings', api('/api/bookings')],
        ['payments', api('/api/payments')],
        ['companies', api('/api/companies')],
        ['people', api('/api/checkin-persons')],
        ['documents', api('/api/documents')],
        ['stats', api('/api/stats')]
      ];
      const results = await Promise.allSettled(entries.map(([, promise]) => promise));
      const data = Object.fromEntries(entries.map(([key], index) => [key, results[index].status === 'fulfilled' ? results[index].value : null]));
      const failed = entries
        .map(([key], index) => results[index].status === 'rejected' ? `${key}: ${results[index].reason?.message || 'chyba načítania'}` : null)
        .filter(Boolean);

      // v3.6.1: dashboard must not stay empty when one optional endpoint fails.
      // Load every dataset independently and keep usable data visible on first page load.
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      setPayments(Array.isArray(data.payments) ? data.payments : []);
      setCompanies(Array.isArray(data.companies) ? data.companies : []);
      setPeople(Array.isArray(data.people) ? data.people : []);
      setDocuments(Array.isArray(data.documents) ? data.documents : []);
      setStats(data.stats && typeof data.stats === 'object' ? data.stats : {});

      if (failed.length) setError(`Niektoré údaje sa nenačítali: ${failed.join(' · ')}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (logged) fetchData(); }, [logged, selectedPropertyId]);
  useEffect(() => { if (logged && !canAccessTab(currentRole, activeTab)) setActiveTab(roleInfo.tabs[0] || 'dashboard'); }, [logged, currentRole, activeTab]);
  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white font-black">Načítavam StayHub...</div>;
  if (!logged) return <LoginScreen onLogin={loginWithPassword} setupReady={Boolean(supabaseAuth)} />;
  return <div className="app-shell flex h-screen bg-slate-50 text-slate-900"><Sidebar open={sidebarOpen} active={activeTab} setActive={(tab)=>{ if (!canAccessTab(currentRole, tab)) return; setActiveTab(tab); if (typeof window !== 'undefined' && window.innerWidth < 1024) setSidebarOpen(false);}} onLogout={logout} property={selectedProperty} lang={lang} role={currentRole} /><button aria-label="Zatvoriť menu" className={`mobile-menu-overlay ${sidebarOpen ? 'is-open' : ''}`} onClick={() => setSidebarOpen(false)} /><div className="flex-1 overflow-auto page-scroll"><Header open={sidebarOpen} setOpen={setSidebarOpen} lang={lang} setLang={changeLang} properties={DEFAULT_PROPERTIES} propertyId={selectedPropertyId} setPropertyId={(id)=>{setSelectedPropertyId(id);localStorage.setItem('stayhub_property', id);}} role={currentRole} user={currentUser} />{error && <Banner type="error">Chyba: {error}</Banner>}{loading && <Banner>⏳ Načítavam dáta...</Banner>}<main className="p-5 md:p-8 max-w-[1800px] mx-auto">
    {activeTab === 'dashboard' && <Dashboard stats={stats} bookings={bookings} payments={payments} people={people} rooms={rooms} lang={lang} />}
    {activeTab === 'rooms' && <Rooms rooms={rooms} bookings={bookings} people={people} onRefresh={fetchData} role={currentRole} />}
    {activeTab === 'bookings' && <Bookings bookings={bookings} rooms={rooms} companies={companies} onRefresh={fetchData} role={currentRole} />}
    {activeTab === 'checkin' && <CheckIn bookings={bookings} companies={companies} people={people} onRefresh={fetchData} />}
    {activeTab === 'checkout' && <CheckOut people={people} companies={companies} onRefresh={fetchData} />}
    {activeTab === 'payments' && <Payments payments={payments} bookings={bookings} companies={companies} onRefresh={fetchData} role={currentRole} />}
    {activeTab === 'companies' && <Companies companies={companies} onRefresh={fetchData} role={currentRole} />}
    {activeTab === 'calendar' && <AuroraCalendar rooms={rooms} bookings={bookings} people={people} lang={lang} />}
    {activeTab === 'documents' && <Documents documents={documents} people={people} companies={companies} onRefresh={fetchData} role={currentRole} />}
    {activeTab === 'reports' && <Reports rooms={rooms} bookings={bookings} payments={payments} people={people} companies={companies} documents={documents} />}
    {activeTab === 'settings' && <SettingsTab role={currentRole} />}
  </main></div></div>;
}

function BrandMark({ compact = false, dark = false }) {
  return <div className="flex items-center gap-3">
    <div className={`${compact ? 'w-11 h-11 text-base' : 'w-16 h-16 text-2xl'} rounded-2xl flex items-center justify-center font-black tracking-tight bg-[#0B0B0D] text-[#C8A96B] border border-[#C8A96B]/30 shadow-lg`}>SH</div>
    {!compact && <div className="text-left">
      <div className={`text-3xl font-black tracking-tight ${dark ? 'text-white' : 'text-slate-950'}`}>StayHub</div>
      <div className={`text-xs font-semibold tracking-[0.18em] uppercase ${dark ? 'text-slate-300' : 'text-slate-500'}`}>Smart Accommodation Management</div>
    </div>}
  </div>;
}

function LoginScreen({ onLogin, setupReady }) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [loading,setLoading]=useState(false);
  const [msg,setMsg]=useState(null);
  async function submit(e) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    try { await onLogin(email.trim(), password); }
    catch (err) { setMsg(err.message || 'Prihlásenie zlyhalo.'); }
    setLoading(false);
  }
  return <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#334155_0,#0f172a_42%,#020617_100%)] flex items-center justify-center p-4">
    <div className="w-full max-w-md">
      <div className="flex justify-center mb-8"><BrandMark dark /></div>
      <form onSubmit={submit} className="bg-white rounded-3xl shadow-2xl p-8 space-y-5 border border-white/60">
        <div><h1 className="text-2xl font-black text-slate-950">Prihlásenie do systému</h1><p className="text-sm text-slate-500 mt-1">Použi účet pozvaný cez Supabase Auth.</p></div>
        <Field label="Email" value={email} onChange={setEmail} placeholder="recepcia@example.com"/>
        <Field label="Heslo" type="password" value={password} onChange={setPassword}/>
        {msg&&<div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-800 rounded">{msg}</div>}
        {!setupReady&&<div className="bg-amber-50 border-l-4 border-amber-500 p-3 text-sm text-amber-900 rounded">Chýba VITE_SUPABASE_URL alebo VITE_SUPABASE_ANON_KEY.</div>}
        <button disabled={loading || !setupReady} className="w-full bg-slate-950 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-3 rounded-2xl transition">{loading?'Prihlasujem...':'Prihlásiť sa'}</button>
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-3 text-sm text-emerald-900 rounded"><b>Produkčný režim:</b> rolu a objekt načíta server z profilu používateľa.</div>
      </form>
      <p className="text-center text-slate-400 text-xs mt-6">StayHub · Secure Booking Management</p>
    </div>
  </div>;
}

function Sidebar({ open, active, setActive, onLogout, property, lang, role }) {
  const allItems=[
    ['dashboard','Dashboard',Home],
    ['rooms','Izby',Home],
    ['bookings','Rezervácie',Calendar],
    ['calendar','Kalendár',LayoutGrid],
    ['checkin','Check-in',UserCheck],
    ['checkout','Check-out',DoorOpen],
    ['payments','Platby',CreditCard],
    ['companies','Firmy',Building2],
    ['documents','Dokumenty',FileText],
    ['reports','Reporty',BarChart3],
    ['settings','Nastavenia',Settings]
  ];
  const items=allItems.filter(([id])=>canAccessTab(role,id));
  const roleLabel = getRole(role).label;

  return <aside className={`${open?'w-72':'w-20'} stayhub-sidebar text-white transition-all flex flex-col shadow-2xl`}>
    <div className="sidebar-head">
      <div className="flex items-center gap-3">
        <BrandMark compact />
        {open&&<div>
          <div className="font-black text-lg leading-tight tracking-tight">StayHub</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Smart Accommodation</div>
        </div>}
      </div>

      {open&&<div className="mt-5 space-y-3">
        <div className="sidebar-info-card">
          <div className="sidebar-kicker">{t('Aktívny objekt', lang)}</div>
          <div className="sidebar-card-title">🏢 {property?.name || t('Hlavný objekt', lang)}</div>
          <div className="sidebar-card-sub">{property?.city || t('Multi-property', lang)}</div>
        </div>

        <div className="sidebar-role-card">
          <div className="sidebar-kicker">{t('Rola', lang)}</div>
          <div className="sidebar-role-text">{t(roleLabel, lang)}</div>
        </div>
      </div>}
    </div>

    <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto sidebar-nav">
      {items.map(([id,label,Icon])=>{
        const isActive = active===id;
        return <button key={id} onClick={()=>setActive(id)} className={`sidebar-nav-item ${isActive?'is-active':''}`} title={t(label, lang)}>
          <span className="sidebar-icon-wrap"><Icon size={22}/></span>
          {open&&<span className="sidebar-label">{t(label, lang)}</span>}
        </button>;
      })}
    </nav>

    <div className="p-4 border-t border-white/10">
      <button onClick={onLogout} className="sidebar-logout" title={t('Odhlásiť', lang)}>
        <LogOut size={20}/>
        {open&&<span>{t('Odhlásiť', lang)}</span>}
      </button>
    </div>
  </aside>;
}

function Header({ open, setOpen, lang, setLang, properties, propertyId, setPropertyId, role, user }) {
  return <header className="bg-white/90 backdrop-blur border-b border-slate-200 sticky top-0 z-10"><div className="flex justify-between items-center px-5 md:px-8 py-4">
    <button onClick={()=>setOpen(!open)} className="icon-btn">{open?<X/>:<Menu/>}</button>
    <div className="flex items-center gap-3 flex-wrap justify-end">
      <label className="hidden sm:flex items-center gap-2 text-sm font-bold text-slate-600"><span>{t('Objekt', lang)}</span><select value={propertyId} onChange={(e)=>setPropertyId(e.target.value)} className="border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800 font-semibold">{properties.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <LanguageSwitcher lang={lang} setLang={setLang} />
      <div className="hidden md:block rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">{getRole(role).label}</div>
      <div className="text-right"><b>👤 {user?.full_name || getRole(role).label}</b><div className="text-sm text-gray-500">{user?.email || 'prihlásený používateľ'}</div></div>
    </div>
  </div></header>;
}

function LanguageSwitcher({ lang, setLang }) {
  return <div className="lang-switcher flex items-center gap-1 rounded-full bg-slate-100 p-1 border border-slate-200" title={t('Jazyk', lang)}>
    {LANGUAGES.map((item) => (
      <button
        key={item.code}
        onClick={() => setLang(item.code)}
        className={`px-3 py-1.5 rounded-full text-xs font-black transition ${lang === item.code ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}
        aria-label={item.name}
      >
        {item.label}
      </button>
    ))}
  </div>;
}

function Dashboard({ stats, bookings, payments, people, rooms, lang='sk' }) {
  const roomOcc = rooms.map(r => ({ room: r, occ: getRoomOccupancy(r, bookings, people) }));

  // v3.6.4: Dashboard must be bound to the same live datasets as Rooms/Calendar.
  // The /api/stats endpoint can return 0 or stale values during the first load,
  // while rooms/bookings/people are already loaded. Therefore the main dashboard
  // counters are calculated from rooms + active bookings + checked-in people.
  const derivedCapacity = roomOcc.reduce((s, x) => s + Number(x.occ.capacity || 0), 0);
  const occupied = roomOcc.reduce((s, x) => s + Number(x.occ.occupied || 0), 0);
  const reserved = roomOcc.reduce((s, x) => s + Number(x.occ.reserved || 0), 0);
  const used = occupied + reserved;
  const cap = derivedCapacity > 0 ? derivedCapacity : Math.max(0, Number(stats?.total_capacity || 0));
  const free = Math.max(0, cap - used);
  const rate = cap ? Math.round((used / cap) * 100) : 0;

  const todayDate = today();
  const personDate = (p, ...keys) => {
    for (const k of keys) {
      if (p?.[k]) return String(p[k]).slice(0, 10);
    }
    return null;
  };

  // v3.25: dashboard daily counters are based on real person events,
  // not reservation start/end dates.
  const todayIn = (people || []).filter(p =>
    personDate(p, 'actual_check_in', 'checked_in_at', 'checkin_at') === todayDate
  ).length;

  const todayOut = (people || []).filter(p =>
    personDate(p, 'actual_check_out', 'checkout_at') === todayDate ||
    (p.status === 'checked_out' && personDate(p, 'updated_at') === todayDate)
  ).length;

  const paidRevenue = (payments || [])
    .filter(p => ['Zaplatené','paid','Đã thanh toán','Da thanh toan'].includes(p.status))
    .reduce((s,p)=>s+Number(p.amount||0),0);

  return <div className="space-y-6"><h1 className="text-3xl font-bold">📊 {t('Dashboard', lang)}</h1>
    <div className="grid md:grid-cols-4 gap-4">
      <Card title={t('Obsadenosť', lang)} value={`${used}/${cap} (${rate}%)`} color="border-teal-500"/>
      <Card title={t('Voľné lôžka', lang)} value={free} color="border-green-500"/>
      <Card title={t('Dnes check-in', lang)} value={todayIn} color="border-blue-500"/>
      <Card title={t('Dnes check-out', lang)} value={todayOut} color="border-purple-500"/>
    </div>
    <div className="grid md:grid-cols-3 gap-4">
      <Card title={t('Ubytovaní teraz', lang)} value={occupied} color="border-blue-500"/>
      <Card title={t('Rezervované dnes', lang)} value={reserved} color="border-yellow-500"/>
      <Card title={t('Tržby uhradené', lang)} value={eur(paidRevenue || stats.total_revenue || 0)} color="border-green-500"/>
    </div>
    <div className="bg-white rounded-xl shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">{t('Obsadenosť podľa izieb', lang)}</h2>
        <span className="text-sm text-gray-500">🟢 {t('voľné', lang)} · 🟡 {t('čiastočne', lang)} · 🔴 {t('plné', lang)}</span>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roomOcc.map(({room, occ}) => <div key={room.id} className={`rounded-xl border-l-4 ${occupancyClass(occ)} bg-gray-50 p-4`}>
          <div className="flex justify-between"><b>{roomLabel(room)}</b><span className="font-bold">{occ.occupied + occ.reserved}/{occ.capacity}</span></div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-3"><div className="bg-teal-600 h-2 rounded-full" style={{width:`${occ.rate}%`}} /></div>
          <div className="mt-3 text-sm text-gray-600">
            {t('Ubytovaní', lang)}: <b>{occ.occupied}</b> · {t('Rezervované', lang)}: <b>{occ.reserved}</b> · {t('Voľné', lang)}: <b>{occ.free}</b>
          </div>
        </div>)}
      </div>
    </div>
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold mb-4">{t('Aktívne firmy / rezervácie', lang)}</h2>
      {bookings.slice(0,6).map(b=><div key={b.id} className="border-b py-3 flex justify-between"><div><b>{b.company_name||b.guest_name}</b><div className="text-sm text-gray-500">{b.booking_code} • {b.check_in_date} → {b.check_out_date}</div></div><Badge>{b.requested_beds||parseBeds(b).length} {t('lôžok', lang)}</Badge></div>)}
    </div>
  </div>;
}

function Rooms({ rooms, bookings = [], people = [], onRefresh, role }) { const [show,setShow]=useState(false); const [edit,setEdit]=useState(null); const [msg,setMsg]=useState(null); async function save(f){try{await api(edit?`/api/rooms/${edit.id}`:'/api/rooms',{method:edit?'PUT':'POST',body:JSON.stringify({room_number:Number(f.room_number),floor:f.floor,capacity:Number(f.capacity),status:f.status,price_daily:Number(f.price_daily||0),price_monthly:f.price_monthly?Number(f.price_monthly):null,note:f.note||null})}); setShow(false); setEdit(null); setMsg('Izba uložená.'); onRefresh();}catch(e){setMsg(`Chyba: ${e.message}`)}} async function del(r){ if(!confirm('Vymazať izbu?')) return; await api(`/api/rooms/${r.id}`,{method:'DELETE'}); onRefresh(); } return <div className="space-y-6"><Top title="🛏️ Izby" action={role==='reception'?null:'Nová izba'} onAction={()=>{setEdit(null);setShow(true)}} onRefresh={onRefresh}/>{msg&&<Banner type={msg.startsWith('Chyba')?'error':undefined}>{msg}</Banner>}<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">{rooms.map(r=>{ const o=getRoomOccupancy(r, bookings, people); const used=o.occupied+o.reserved; return <div key={r.id} className={`bg-white rounded-xl shadow p-5 border-l-4 ${occupancyClass(o)}`}><div className="flex justify-between items-start"><div><h3 className="text-2xl font-bold">{roomLabel(r)}</h3><p className="text-sm text-gray-500">{r.floor}</p></div><span className="text-sm font-bold bg-gray-100 px-3 py-1 rounded-full">{used}/{o.capacity}</span></div><div className="mt-4"><div className="flex justify-between text-sm mb-1"><span>Obsadenosť</span><b>{o.rate}%</b></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-teal-600 h-2 rounded-full" style={{width:`${o.rate}%`}} /></div></div><div className="grid grid-cols-3 gap-2 mt-4 text-center text-sm"><div className="bg-blue-50 rounded-lg p-2"><div className="font-bold text-blue-700">{o.occupied}</div><div>Ubyt.</div></div><div className="bg-yellow-50 rounded-lg p-2"><div className="font-bold text-yellow-700">{o.reserved}</div><div>Rez.</div></div><div className="bg-green-50 rounded-lg p-2"><div className="font-bold text-green-700">{o.free}</div><div>Voľné</div></div></div><p className="text-sm text-gray-600 mt-4">👥 Kapacita {r.capacity} · 💰 {eur(r.price_daily)}/deň</p><div className="mt-3 text-xs text-gray-500 min-h-[32px]">{o.occupiedBeds.length>0 && <div>Ubytované: {o.occupiedBeds.map(x=>`${roomLabel(r)}-${x}`).join(', ')}</div>}{o.reservedBeds.length>0 && <div>Rezervované: {o.reservedBeds.map(x=>`${roomLabel(r)}-${x}`).join(', ')}</div>}</div><div className="flex gap-2 mt-4"><Btn onClick={()=>{setEdit(r);setShow(true)}}><Edit2 size={16}/></Btn>{canDelete(role)&&<Btn red onClick={()=>del(r)}><Trash2 size={16}/></Btn>}</div></div>})}</div>{show&&<RoomModal room={edit} onClose={()=>setShow(false)} onSave={save}/>}</div>; }

function RoomModal({ room, onClose, onSave }) { const [f,setF]=useState({room_number:room?.room_number||'',floor:room?.floor||'I.NP',capacity:room?.capacity||3,status:room?.status||'Voľná',price_daily:room?.price_daily||18,price_monthly:room?.price_monthly||'',note:room?.note||''}); const sf=(k,v)=>setF(p=>({...p,[k]:v})); return <Modal title={room?'Upraviť izbu':'Nová izba'} onClose={onClose} onSave={()=>onSave(f)}><Grid><Field label="Číslo izby" type="number" value={f.room_number} onChange={v=>sf('room_number',v)}/><Select label="Poschodie" value={f.floor} onChange={v=>sf('floor',v)} opts={[['0.NP','0.NP'],['I.NP','I.NP'],['II.NP','II.NP']]}/><Field label="Kapacita" type="number" value={f.capacity} onChange={v=>sf('capacity',v)}/><Select label="Stav" value={f.status} onChange={v=>sf('status',v)} opts={[['Voľná','Voľná'],['Obsadená','Obsadená'],['Mimo prevádzky','Mimo prevádzky']]}/><Field label="Cena/deň" type="number" value={f.price_daily} onChange={v=>sf('price_daily',v)}/><Field label="Cena/mesiac" type="number" value={f.price_monthly} onChange={v=>sf('price_monthly',v)}/></Grid><Text label="Poznámka" value={f.note} onChange={v=>sf('note',v)}/></Modal>; }

function Bookings({ bookings, rooms, companies, onRefresh, role }) { const [show,setShow]=useState(false); const [edit,setEdit]=useState(null); const [msg,setMsg]=useState(null); async function save(f){try{await api(edit?`/api/bookings/${edit.id}`:'/api/bookings',{method:edit?'PUT':'POST',body:JSON.stringify(f)}); setShow(false); setEdit(null); setMsg('Rezervácia uložená.'); onRefresh();}catch(e){setMsg(`Chyba: ${e.message}`)}} async function del(b){ if(!confirm('Vymazať rezerváciu?')) return; await api(`/api/bookings/${b.id}`,{method:'DELETE'}); onRefresh(); } return <div className="space-y-6"><Top title="📅 Rezervácie kapacity" action="Nová firemná/skupinová" onAction={()=>{setEdit(null);setShow(true)}} onRefresh={onRefresh}/>{msg&&<Banner type={msg.startsWith('Chyba')?'error':undefined}>{msg}</Banner>}<Table heads={['Kód','Platiteľ','Termín','Lôžka','Pridelené','Cena','Stav','Akcie']}>{bookings.map(b=><tr key={b.id} className="border-t"><Td teal>{b.booking_code}</Td><Td>{b.company_name||b.guest_name}</Td><Td>{b.check_in_date} → {b.check_out_date}</Td><Td>{b.requested_beds}</Td><Td>{parseBeds(b).map(bedLabel).join(', ')}</Td><Td>{b.total_price?eur(b.total_price):'—'}</Td><Td><Badge>{b.status}</Badge></Td><Td><div className="flex gap-2"><Btn onClick={()=>{setEdit(b);setShow(true)}}><Edit2 size={16}/></Btn>{canDelete(role)&&<Btn red onClick={()=>del(b)}><Trash2 size={16}/></Btn>}</div></Td></tr>)}</Table>{show&&<BookingModal booking={edit} rooms={rooms} companies={companies} onClose={()=>setShow(false)} onSave={save}/>}</div>; }
function BookingModal({ booking, rooms, companies, onClose, onSave }) { const defaultCheckIn = today(); const [f,setF]=useState({payer_type:booking?.payer_type||'company',company_id:booking?.company_id||companies[0]?.id||'',company_name:booking?.company_name||companies[0]?.company_name||'',guest_name:booking?.guest_name||'',contact_person:booking?.contact_person||'',phone:booking?.phone||booking?.guest_phone||'',email:booking?.email||booking?.guest_email||'',requested_beds:booking?.requested_beds||parseBeds(booking).length||1,check_in_date:booking?.check_in_date||defaultCheckIn,check_out_date:booking?.check_out_date||nextDay(defaultCheckIn),status:booking?.status||'Potvrdená',pricing_model:booking?.pricing_model||'daily',discount_amount:booking?.discount_amount||0,tax_rate:booking?.tax_rate||0,total_price:booking?.total_price||'',cancellation_policy:booking?.cancellation_policy||'standard',cancellation_reason:booking?.cancellation_reason||'',cancellation_fee:booking?.cancellation_fee||'',reserved_beds:parseBeds(booking),note:booking?.note||''}); const [availability,setAvailability]=useState([]); const [loading,setLoading]=useState(false); const beds=parseBeds({reserved_beds:f.reserved_beds}); const sf=(k,v)=>setF(p=>({...p,[k]:v})); async function loadAvailability(){ if(!f.check_in_date||!f.check_out_date) return; setLoading(true); try{ const av=await api(`/api/availability?check_in_date=${f.check_in_date}&check_out_date=${f.check_out_date}${booking?.id?`&exclude_id=${booking.id}`:''}`); setAvailability(av||[]);}catch{setAvailability([])} setLoading(false); } useEffect(()=>{loadAvailability();},[f.check_in_date,f.check_out_date]); useEffect(()=>{ if(f.payer_type==='person') { if(f.company_id || f.company_name) setF(p=>({...p,company_id:'',company_name:''})); return; } const c=companies.find(c=>String(c.id)===String(f.company_id)); if(c && f.company_name!==c.company_name) setF(p=>({...p,company_name:c.company_name}));},[f.company_id,f.payer_type]); function toggleBed(b){ const exists=beds.some(x=>String(x.room_id)===String(b.room_id)&&String(x.bed_code)===String(b.bed_code)); const next=exists?beds.filter(x=>!(String(x.room_id)===String(b.room_id)&&String(x.bed_code)===String(b.bed_code))):[...beds,b]; sf('reserved_beds',next); } function autoAssign(){ const free=availability.flatMap(r=>r.beds.filter(b=>b.is_free).map(b=>({...b,room_label:r.room_label,room_number:r.room_number}))).slice(0,Number(f.requested_beds||0)); sf('reserved_beds',free); } function submit(){ if(Number(f.requested_beds)!==beds.length) return alert(`Vyber presne ${f.requested_beds} lôžok.`); const base={...f,total_price:f.total_price||undefined,booking_code:booking?.booking_code||undefined}; const payload=f.payer_type==='person'?{...base,payer_type:'person',company_id:null,company_name:null,guest_name:f.guest_name||f.contact_person||'Súkromná osoba'}:{...base,payer_type:'company',guest_name:f.contact_person||f.guest_name||''}; onSave(payload); } return <Modal title={booking?'Upraviť rezerváciu':'Nová firemná/skupinová rezervácia'} onClose={onClose} onSave={submit} wide><Grid><Select label="Typ" value={f.payer_type} onChange={v=>setF(p=>v==='person'?{...p,payer_type:v,company_id:'',company_name:''}:{...p,payer_type:v,company_id:p.company_id||companies[0]?.id||'',company_name:p.company_name||companies[0]?.company_name||''})} opts={[['company','Firma – objednávka kapacity'],['person','Súkromná osoba']]}/>{f.payer_type==='company'?<Select label="Firma" value={f.company_id} onChange={v=>sf('company_id',v)} opts={companies.map(c=>[c.id,c.company_name])}/>:<Field label="Meno osoby" value={f.guest_name} onChange={v=>sf('guest_name',v)}/>}<Field label="Kontaktná osoba" value={f.contact_person} onChange={v=>sf('contact_person',v)}/><Field label="Telefón" value={f.phone} onChange={v=>sf('phone',v)}/><Field label="Email" value={f.email} onChange={v=>sf('email',v)}/><Field label="Počet lôžok" type="number" value={f.requested_beds} onChange={v=>sf('requested_beds',v)}/><Field label="Príchod" type="date" value={f.check_in_date} onChange={v=>sf('check_in_date',v)}/><Field label="Odchod" type="date" value={f.check_out_date} onChange={v=>sf('check_out_date',v)}/><Select label="Stav" value={f.status} onChange={v=>sf('status',v)} opts={[['Nová','Nová'],['Potvrdená','Potvrdená'],['Check-in','Check-in'],['Ukončená','Ukončená'],['Zrušená','Zrušená']]}/><Select label="Cenový model" value={f.pricing_model} onChange={v=>sf('pricing_model',v)} opts={[['daily','Denná cena'],['monthly','Mesačná cena / pomerom']]}/><Field label="Zľava" type="number" value={f.discount_amount} onChange={v=>sf('discount_amount',v)}/><Field label="DPH %" type="number" value={f.tax_rate} onChange={v=>sf('tax_rate',v)}/><Field label="Cena spolu" type="number" value={f.total_price} onChange={v=>sf('total_price',v)} placeholder="vypočíta server" /><Select label="Storno pravidlo" value={f.cancellation_policy} onChange={v=>sf('cancellation_policy',v)} opts={[['standard','Štandard'],['flexible','Flexibilné'],['non_refundable','Nevratné']]}/><Field label="Storno poplatok" type="number" value={f.cancellation_fee} onChange={v=>sf('cancellation_fee',v)} placeholder="vypočíta server"/><Field label="Dôvod storna" value={f.cancellation_reason} onChange={v=>sf('cancellation_reason',v)}/></Grid><div className="my-4 p-4 bg-gray-50 rounded-lg"><div className="flex justify-between items-center mb-3"><b>Voľné lôžka v termíne</b><button type="button" onClick={autoAssign} className="bg-teal-600 text-white px-3 py-2 rounded">Automaticky prideliť {f.requested_beds}</button></div>{loading?'Načítavam...':<div className="space-y-3 max-h-72 overflow-auto">{availability.map(r=><div key={r.id} className="border rounded-lg p-3"><div className="font-bold">{r.room_label} • voľné {r.free_count}/{r.capacity}</div><div className="flex flex-wrap gap-2 mt-2">{r.beds.map(b=>{const sel=beds.some(x=>String(x.room_id)===String(b.room_id)&&String(x.bed_code)===String(b.bed_code)); return <button type="button" key={b.bed_code} disabled={!b.is_free&&!sel} onClick={()=>toggleBed({...b,room_label:r.room_label,room_number:r.room_number})} className={`px-3 py-2 rounded border ${sel?'bg-teal-600 text-white':b.is_free?'bg-white hover:bg-teal-50':'bg-red-100 text-red-400 cursor-not-allowed'}`}>{r.room_label}-{b.bed_code}</button>})}</div></div>)}</div>}<div className="mt-3 text-sm"><b>Vybrané:</b> {beds.map(bedLabel).join(', ') || 'nič'} ({beds.length}/{f.requested_beds})</div></div><Text label="Poznámka" value={f.note} onChange={v=>sf('note',v)}/></Modal>; }


function CheckIn({ bookings, companies, people, onRefresh }) {
  const [booking,setBooking]=useState(null);
  const activeBookings=bookings.filter(b=>!['Ukončená','Zrušená','Da huy','cancelled'].includes(b.status));
  const checkinStats = (b) => {
    const beds = parseBeds(b);
    const allowedBeds = new Set(beds.map(x => `${String(x.room_id)}:${String(x.bed_code)}`));
    const active = people.filter(p => String(p.booking_id) === String(b.id) && p.status === 'checked_in');
    const validActive = active.filter(p => allowedBeds.has(`${String(p.room_id)}:${String(p.bed_code)}`));
    const unique = new Set(validActive.map(p => `${String(p.room_id)}:${String(p.bed_code)}`));
    return { beds, capacity: beds.length, rawCount: active.length, count: unique.size, free: Math.max(0, beds.length - unique.size), over: active.length > beds.length || unique.size > beds.length };
  };
  return <div className="space-y-6">
    <Top title="🔑 Check-in" onRefresh={onRefresh}/>
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-sm text-slate-600">
      Vyber rezerváciu a doplň konkrétne osoby k prideleným lôžkam. Systém nedovolí prekročiť rezervovanú kapacitu a po naplnení kapacity check-in uzamkne.
    </div>
    <Table heads={['Rezervácia','Firma/platiteľ','Termín','Lôžka','Ubytované','Voľné','Akcia']}>
      {activeBookings.map(b=>{
        const st = checkinStats(b);
        const canCheckIn = st.capacity > 0 && st.free > 0;
        const canEdit = st.capacity > 0 && st.count > 0;
        return <tr key={b.id} className={`border-t ${st.over ? 'bg-red-50' : ''}`}>
          <Td teal>{b.booking_code}</Td>
          <Td>{b.company_name||b.guest_name||b.contact_person||'—'}{st.over && <div className="text-xs text-red-600 font-bold mt-1">⚠ Nekonzistentné dáta: {st.rawCount}/{st.capacity}. Otvor a ulož check-in pre opravu.</div>}</Td>
          <Td>{b.check_in_date} → {b.check_out_date}</Td>
          <Td>{st.capacity || '—'}</Td>
          <Td><span className={st.count >= st.capacity ? 'font-black text-green-700' : 'font-bold'}>{st.count}/{st.capacity || 0}</span></Td>
          <Td>{st.free}</Td>
          <Td>
            <button
              onClick={()=>setBooking(b)}
              disabled={!canCheckIn && !canEdit}
              className={`${(canCheckIn || canEdit) ? 'bg-teal-600 hover:bg-teal-700' : 'bg-slate-300 cursor-not-allowed'} text-white px-4 py-2 rounded-xl font-bold`}
              title={st.capacity === 0 ? 'Rezervácia nemá pridelené lôžka' : st.free === 0 ? 'Kapacita je naplnená – možno iba upraviť existujúci check-in' : 'Doplniť osoby na check-in'}
            >
              {st.count > 0 ? 'Upraviť check-in' : 'Pridať check-in'}
            </button>
          </Td>
        </tr>})}
    </Table>
    {activeBookings.length===0 && <div className="bg-white rounded-2xl p-8 text-center text-slate-500">Žiadne aktívne rezervácie na check-in.</div>}
    {booking&&<CheckInModal booking={booking} companies={companies} people={people} onClose={()=>setBooking(null)} onSaved={()=>{setBooking(null);onRefresh();}}/>}
  </div>;
}

function CheckInModal({ booking, people, onClose, onSaved }) {
  const beds=parseBeds(booking);
  const existingPeopleForBooking = (people || []).filter(p => String(p.booking_id) === String(booking.id) && p.status === 'checked_in');
  const bookingCapacity = Math.max(
    beds.length,
    Number(booking.requested_beds || 0),
    Number(booking.beds_count || 0),
    existingPeopleForBooking.length,
    1
  );
  const buildRows=()=>beds.map(b=>{
    const existing=people.find(p=>String(p.booking_id)===String(booking.id)&&String(p.room_id)===String(b.room_id)&&String(p.bed_code)===String(b.bed_code));
    return existing||{
      booking_id:booking.id,
      company_id:booking.company_id||null,
      company_name:booking.company_name||null,
      room_id:b.room_id,
      room_label:b.room_label,
      room_number:b.room_number,
      bed_code:b.bed_code,
      first_name:'',
      last_name:'',
      phone:'',
      passport_no:'',
      nationality:'Vietnam',
      date_of_birth:'',
      checkin_at:new Date().toISOString(),
      expected_checkout_date:booking.check_out_date,
      status:'checked_in',
      keys_issued:'Áno',
      room_condition_checkin:'OK'
    };
  });
  const [rows,setRows]=useState(buildRows);
  const [error,setError]=useState('');
  const update=(i,k,v)=>setRows(r=>r.map((x,idx)=>idx===i?{...x,[k]:v}:x));
  const fillDemoName=(i)=>update(i,'first_name',`Osoba ${i+1}`);
  async function save(){
    try{
      setError('');
      const filledRows = rows.filter(row => String(row.first_name||'').trim() || String(row.last_name||'').trim());
      if(filledRows.length === 0) return setError('Doplň aspoň jedno meno osoby pre check-in.');
      if(filledRows.length > bookingCapacity) return setError(`Počet osôb (${filledRows.length}) prekračuje kapacitu rezervácie (${bookingCapacity}).`);
      const uniqueBeds = new Set(filledRows.map(row => `${String(row.room_id)}:${String(row.bed_code)}`));
      if(uniqueBeds.size !== filledRows.length) return setError('Jedno lôžko je použité viackrát. Skontroluj check-in osoby.');
      let saved=0;
      for(const row of filledRows){
        const payload={...row,status:'checked_in',checkin_at:row.checkin_at||new Date().toISOString(),expected_checkout_date:row.expected_checkout_date||booking.check_out_date,booking_capacity:bookingCapacity,requested_beds:booking.requested_beds||bookingCapacity,beds_count:booking.beds_count||bookingCapacity,reserved_beds:beds};
        if(row.id) await api(`/api/checkin-persons/${row.id}`,{method:'PUT',body:JSON.stringify(payload)});
        else await api('/api/checkin-persons',{method:'POST',body:JSON.stringify(payload)});
        saved++;
      }
      // Status rezervácie meníme iba minimálnym payloadom.
      // Neposielame celý objekt booking, aby Supabase neodmietol read-only / vypočítané polia.
      await api(`/api/bookings/${booking.id}`,{method:'PUT',body:JSON.stringify({status:'Check-in'})});
      onSaved();
    }catch(e){
      console.error('Check-in save error:', e);
      setError(e.message || 'Check-in sa nepodarilo uložiť.');
    }
  }
  const filledCount = rows.filter(row => String(row.first_name||'').trim() || String(row.last_name||'').trim()).length;
  const freeCount = Math.max(0, bookingCapacity - filledCount);
  const isFull = bookingCapacity > 0 && freeCount === 0;
  return <Modal title={`Check-in: ${booking.booking_code}`} onClose={onClose} onSave={save} wide>
    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
      <div className="font-black text-slate-900">{booking.company_name||booking.guest_name||booking.contact_person}</div>
      <div className="text-sm text-slate-500 mt-1">{booking.check_in_date} → {booking.check_out_date} · {bookingCapacity} lôžok</div>
      <div className={`mt-3 rounded-xl p-3 text-sm font-bold ${isFull ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
        Kapacita: {bookingCapacity} · Vyplnené osoby: {filledCount}/{bookingCapacity} · Voľné miesta: {freeCount}{isFull ? ' · Kapacita naplnená' : ''}
      </div>
    </div>
    {error && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700 font-bold">{error}</div>}
    {rows.map((r,i)=><div key={`${r.room_id}-${r.bed_code}`} className="border rounded-2xl p-4 space-y-3 bg-white">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-black text-lg">{bedLabel(r)}</h3>
        {!r.first_name && !r.last_name && <button type="button" onClick={()=>fillDemoName(i)} className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 font-bold">Dočasné meno</button>}
      </div>
      <Grid>
        <Field label="Meno" value={r.first_name} onChange={v=>update(i,'first_name',v)}/>
        <Field label="Priezvisko" value={r.last_name} onChange={v=>update(i,'last_name',v)}/>
        <Field label="Telefón" value={r.phone} onChange={v=>update(i,'phone',v)}/>
        <Field label="Pas / OP" value={r.passport_no} onChange={v=>update(i,'passport_no',v)}/>
        <Field label="Národnosť" value={r.nationality} onChange={v=>update(i,'nationality',v)}/>
        <Field label="Dátum narodenia" type="date" value={r.date_of_birth} onChange={v=>update(i,'date_of_birth',v)}/>
        <Select label="Kľúče vydané" value={r.keys_issued||'Áno'} onChange={v=>update(i,'keys_issued',v)} opts={[["Áno","Áno"],["Nie","Nie"]]}/>
        <Select label="Stav izby" value={r.room_condition_checkin||'OK'} onChange={v=>update(i,'room_condition_checkin',v)} opts={[["OK","OK"],["Poškodené","Poškodené"],["Znečistené","Znečistené"]]}/>
      </Grid>
    </div>)}
    {rows.length===0 && <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">Táto rezervácia nemá pridelené lôžka. Najprv v rezervácii prideľ lôžka.</div>}
  </Modal>;
}

function CheckOut({ people, onRefresh }) { const [person,setPerson]=useState(null); const active=people.filter(p=>p.status==='checked_in'); async function save(row){ try{ await api(`/api/checkin-persons/${row.id}`,{method:'PUT',body:JSON.stringify({...row,status:'checked_out',checkout_at:new Date().toISOString()})}); setPerson(null); onRefresh(); }catch(e){alert(e.message)} } return <div className="space-y-6"><Top title="🚪 Check-out" onRefresh={onRefresh}/><Table heads={['Osoba','Firma','Izba/lôžko','Očakávaný odchod','Akcia']}>{active.map(p=><tr key={p.id} className="border-t"><Td>{p.first_name} {p.last_name}</Td><Td>{p.company_name||'—'}</Td><Td>{bedLabel(p)}</Td><Td>{p.expected_checkout_date}</Td><Td><button onClick={()=>setPerson(p)} className="bg-purple-600 text-white px-4 py-2 rounded">Check-out</button></Td></tr>)}</Table>{person&&<CheckOutModal person={person} onClose={()=>setPerson(null)} onSave={save}/>}</div>; }
function CheckOutModal({ person, onClose, onSave }) { const [f,setF]=useState({...person,keys_returned:person.keys_returned||'Áno',room_condition_checkout:person.room_condition_checkout||'OK',damage_amount:person.damage_amount||0,checkout_note:person.checkout_note||''}); const sf=(k,v)=>setF(p=>({...p,[k]:v})); return <Modal title={`Check-out: ${person.first_name} ${person.last_name}`} onClose={onClose} onSave={()=>onSave(f)}><Grid><Field label="Izba/lôžko" value={bedLabel(person)} disabled/><Field label="Skutočný odchod" type="date" value={today()} disabled/><Select label="Kľúče vrátené" value={f.keys_returned} onChange={v=>sf('keys_returned',v)} opts={[['Áno','Áno'],['Nie','Nie']]}/><Select label="Stav izby" value={f.room_condition_checkout} onChange={v=>sf('room_condition_checkout',v)} opts={[['OK','OK'],['Poškodené','Poškodené'],['Znečistené','Znečistené']]}/><Field label="Škoda / doplatok" type="number" value={f.damage_amount} onChange={v=>sf('damage_amount',v)}/></Grid><Text label="Poznámka" value={f.checkout_note} onChange={v=>sf('checkout_note',v)}/></Modal>; }

function Payments({ payments, bookings, companies, onRefresh, role }) { const [show,setShow]=useState(false); const [edit,setEdit]=useState(null); const [msg,setMsg]=useState(null); const stats=useMemo(()=>({paid:payments.filter(p=>['Zaplatené','paid'].includes(p.status)).reduce((s,p)=>s+Number(p.amount||0),0),pending:payments.filter(p=>!['Zaplatené','paid'].includes(p.status)).reduce((s,p)=>s+Number(p.amount||0),0),overdue:payments.filter(p=>!['Zaplatené','paid'].includes(p.status)&&p.due_date&&p.due_date<today()).length}),[payments]); async function save(payload){ try{ const saved = await api(edit?`/api/payments/${edit.id}`:'/api/payments',{method:edit?'PUT':'POST',body:JSON.stringify(payload)}); setShow(false); setEdit(null); setMsg('Platba uložená.'); await onRefresh(); }catch(e){setMsg(`Chyba: ${e.message}`);} } async function del(p){ if(!confirm('Vymazať platbu?')) return; await api(`/api/payments/${p.id}`,{method:'DELETE'}); onRefresh(); } return <div className="space-y-6"><Top title="💰 Platby" action="Nová platba" onAction={()=>{setEdit(null);setShow(true)}} onRefresh={onRefresh}/><div className="grid md:grid-cols-3 gap-4"><Card title="Zaplatené" value={eur(stats.paid)} color="border-green-500"/><Card title="Čaká" value={eur(stats.pending)} color="border-yellow-500"/><Card title="Po splatnosti" value={stats.overdue} color="border-red-500"/></div>{msg&&<Banner type={msg.startsWith('Chyba')?'error':undefined}>{msg}</Banner>}<Table heads={['Kód','Platiteľ','Za čo / koho','Rezervácia','Izba/lôžka','Mesiac','Suma','Stav','Akcie']}>{payments.map(p=><tr key={p.id} className="border-t"><Td teal>{p.payment_code}</Td><Td>{p.payer_name}</Td><Td>{p.tenant_name}</Td><Td>{bookings.find(b=>b.id===p.booking_id)?.booking_code||'—'}</Td><Td>{p.room_label}</Td><Td>{p.payment_month}</Td><Td>{eur(p.amount)}</Td><Td><Badge green={p.status==='Zaplatené'}>{p.status}</Badge></Td><Td><div className="flex gap-2"><Btn onClick={()=>{setEdit(p);setShow(true)}}><Edit2 size={16}/></Btn>{canDelete(role)&&<Btn red onClick={()=>del(p)}><Trash2 size={16}/></Btn>}</div></Td></tr>)}</Table>{show&&<PaymentModal payment={edit} bookings={bookings} companies={companies} onClose={()=>setShow(false)} onSave={save}/>}</div>; }
function PaymentModal({ payment, bookings, onClose, onSave }) { const selectedInitial=bookings.find(b=>String(b.id)===String(payment?.booking_id))||bookings[0]; const [f,setF]=useState({payment_code:payment?.payment_code||'',booking_id:payment?.booking_id||selectedInitial?.id||'',payment_month:payment?.payment_month||monthOf(selectedInitial?.check_in_date),amount:payment?.amount||selectedInitial?.total_price||'',due_date:payment?.due_date||selectedInitial?.check_in_date||today(),paid_date:payment?.paid_date||'',status:payment?.status||'Čaká',note:payment?.note||''}); const b=bookings.find(x=>String(x.id)===String(f.booking_id)); const beds=parseBeds(b).map(bedLabel).join(', '); const payer=b?.payer_type==='person'?(b?.guest_name||'Osoba'):(b?.company_name||'Firma'); const sf=(k,v)=>setF(p=>({...p,[k]:v})); useEffect(()=>{ if(!b) return; setF(p=>({...p,payment_month:monthOf(b.check_in_date),amount:b.total_price||p.amount,due_date:b.check_in_date||today()})); },[f.booking_id]); const submit=()=>{ const isPaid=f.status==='Zaplatené'||f.status==='paid'||f.status==='Đã thanh toán'||f.status==='Da thanh toan'; const canonicalStatus=isPaid?'Zaplatené':(f.status==='Đang chờ'||f.status==='Dang cho'?'Čaká':(f.status==='Quá hạn'||f.status==='Qua han'?'Po splatnosti':f.status)); const payload={...f,booking_id:b?.id||null,company_id:b?.payer_type==='person'?null:(b?.company_id||null),payer_type:b?.payer_type||'company',payer_name:payer,tenant_name:b?.payer_type==='person'?b?.guest_name:`${b?.requested_beds||parseBeds(b).length} lôžok / osoby pri check-ine`,room_label:beds,status:canonicalStatus,payment_code:f.payment_code||undefined,amount:f.amount?Number(f.amount):0,due_date:f.due_date||null,paid_date:f.paid_date|| (isPaid ? today() : null),paid_at:isPaid?new Date().toISOString():null,note:f.note||null}; onSave(payload); }; return <Modal title={payment?'Upraviť platbu':'Nová platba'} onClose={onClose} onSave={submit} wide><Grid><Field label="Kód platby" value={f.payment_code} onChange={v=>sf('payment_code',v)} placeholder="automaticky"/><Select label="Rezervácia" value={f.booking_id} onChange={v=>sf('booking_id',v)} opts={bookings.map(b=>[b.id,`${b.booking_code} • ${b.company_name||b.guest_name} • ${b.requested_beds||parseBeds(b).length} lôžok`])}/><Field label="Platiteľ" value={payer} disabled/><Field label="Za čo / koho" value={b?.payer_type==='person'?b?.guest_name:`${b?.requested_beds||parseBeds(b).length} lôžok / osoby pri check-in`} disabled/><Field label="Mesiac" value={f.payment_month} onChange={v=>sf('payment_month',v)}/><Field label="Suma" type="number" value={f.amount} onChange={v=>sf('amount',v)}/><Field label="Splatnosť" type="date" value={f.due_date} onChange={v=>sf('due_date',v)}/><Field label="Dátum úhrady" type="date" value={f.paid_date} onChange={v=>sf('paid_date',v)}/><Select label="Stav" value={f.status} onChange={v=>sf('status',v)} opts={[['Čaká','Čaká'],['Zaplatené','Zaplatené'],['Po splatnosti','Po splatnosti']]}/><Field label="Izba/lôžka" value={beds} disabled/></Grid><Text label="Poznámka" value={f.note} onChange={v=>sf('note',v)}/></Modal>; }

function Companies({ companies, onRefresh, role }) { const [show,setShow]=useState(false); const [edit,setEdit]=useState(null); const [msg,setMsg]=useState(null); async function save(f){ try{ await api(edit?`/api/companies/${edit.id}`:'/api/companies',{method:edit?'PUT':'POST',body:JSON.stringify(f)}); setShow(false); setEdit(null); setMsg('Firma uložená.'); onRefresh(); }catch(e){setMsg(`Chyba: ${e.message}`)} } return <div className="space-y-6"><Top title="🏢 Firmy" action={getRole(role).canManageCompanies?'Nová firma':null} onAction={()=>{setEdit(null);setShow(true)}} onRefresh={onRefresh}/>{msg&&<Banner>{msg}</Banner>}<div className="grid md:grid-cols-3 gap-4">{companies.map(c=><div key={c.id} className="bg-white rounded-xl p-6 shadow border-l-4 border-teal-500"><h3 className="font-bold text-xl">{c.company_name}</h3><p>📧 {c.email||'—'}</p><p>📞 {c.phone||'—'}</p><button onClick={()=>{setEdit(c);setShow(true)}} className="mt-4 bg-blue-100 text-blue-700 px-3 py-2 rounded"><Edit2 size={16}/></button></div>)}</div>{show&&<CompanyModal company={edit} onClose={()=>setShow(false)} onSave={save}/>}</div>; }
function CompanyModal({ company, onClose, onSave }) { const [f,setF]=useState({company_name:company?.company_name||'',ico:company?.ico||'',contact_person:company?.contact_person||'',email:company?.email||'',phone:company?.phone||'',address:company?.address||'',note:company?.note||''}); const sf=(k,v)=>setF(p=>({...p,[k]:v})); return <Modal title={company?'Upraviť firmu':'Nová firma'} onClose={onClose} onSave={()=>onSave(f)}><Grid><Field label="Názov firmy" value={f.company_name} onChange={v=>sf('company_name',v)}/><Field label="IČO" value={f.ico} onChange={v=>sf('ico',v)}/><Field label="Kontakt" value={f.contact_person} onChange={v=>sf('contact_person',v)}/><Field label="Email" value={f.email} onChange={v=>sf('email',v)}/><Field label="Telefón" value={f.phone} onChange={v=>sf('phone',v)}/><Field label="Adresa" value={f.address} onChange={v=>sf('address',v)}/></Grid><Text label="Poznámka" value={f.note} onChange={v=>sf('note',v)}/></Modal>; }

function OccupancyCalendar({ rooms = [], bookings = [], people = [] }) {
  const [start, setStart] = useState(today());
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d.toISOString().slice(0,10); });
  const rows = rooms.flatMap(room => Array.from({ length: Number(room.capacity || 3) }, (_, i) => ({ room, bed_code: String(i + 1), label: `${roomLabel(room)}-${i + 1}` })));
  function cellStatus(row, day) {
    const checked = people.find(p => {
      if (p.status !== 'checked_in') return false;
      if (String(p.room_id) !== String(row.room.id) || String(p.bed_code) !== String(row.bed_code)) return false;
      const start = String(p.checkin_at || p.actual_check_in || p.created_at || '').slice(0, 10) || day;
      const end = String(p.checkout_at || p.actual_check_out || '').slice(0, 10);
      return day >= start && (!end || day < end);
    });
    if (checked) return { label: `${checked.first_name || ''} ${checked.last_name || ''}`.trim() || 'Ubytovaný', cls: 'bg-blue-600 text-white' };
    const booking = bookings.find(b => !['Zrušená','cancelled','Da huy'].includes(b.status) && overlapsDates(day, nextDay(day), b.check_in_date, b.check_out_date) && parseBeds(b).some(x => String(x.room_id) === String(row.room.id) && String(x.bed_code) === String(row.bed_code)));
    if (booking) {
      if (booking.check_in_date === day) return { label: booking.company_name || booking.guest_name || 'Check-in', cls: 'bg-orange-500 text-white' };
      if (booking.check_out_date === nextDay(day)) return { label: booking.company_name || booking.guest_name || 'Check-out', cls: 'bg-red-500 text-white' };
      return { label: booking.company_name || booking.guest_name || 'Rez.', cls: 'bg-amber-200 text-amber-900' };
    }
    return { label: '', cls: 'bg-emerald-50 hover:bg-emerald-100' };
  }
  return <div className="space-y-6"><Top title="🗓️ Kalendár obsadenosti" onRefresh={()=>{}} />
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between"><div><b>14-dňový prehľad lôžok</b><div className="text-sm text-slate-500">Zelené = voľné, žlté = rezervované, modré = ubytované, oranžové/červené = príchod/odchod.</div></div><Field label="Začiatok" type="date" value={start} onChange={setStart}/></div>
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-auto"><table className="w-full min-w-[1100px]"><thead><tr className="bg-slate-50"><th className="sticky left-0 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase text-slate-500">Lôžko</th>{days.map(d=><th key={d} className="px-3 py-3 text-xs font-black text-slate-500">{d.slice(5)}</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.label} className="border-t"><td className="sticky left-0 bg-white px-4 py-2 font-bold text-sm">{row.label}</td>{days.map(d=>{ const st=cellStatus(row,d); return <td key={d} className="p-1"><div className={`h-10 rounded-lg px-2 flex items-center justify-center text-[11px] font-bold truncate ${st.cls}`}>{st.label}</div></td>})}</tr>)}</tbody></table></div>
  </div>;
}

function Documents({ documents = [], people = [], companies = [], onRefresh }) {
  const [show,setShow]=useState(false); const [edit,setEdit]=useState(null); const [msg,setMsg]=useState(null);
  const expiring = documents.filter(d => d.expiry_date && d.expiry_date <= nextDays(30));
  async function save(f){try{await api(edit?`/api/documents/${edit.id}`:'/api/documents',{method:edit?'PUT':'POST',body:JSON.stringify(f)}); setShow(false); setEdit(null); setMsg('Dokument uložený.'); onRefresh();}catch(e){setMsg(`Chyba: ${e.message}`)}}
  async function del(d){ if(!confirm('Vymazať dokument?')) return; await api(`/api/documents/${d.id}`,{method:'DELETE'}); onRefresh(); }
  return <div className="space-y-6"><Top title="📄 Dokumenty" action="Nový dokument" onAction={()=>{setEdit(null);setShow(true)}} onRefresh={onRefresh}/><div className="grid md:grid-cols-3 gap-4"><Card title="Dokumenty spolu" value={documents.length} color="border-blue-500"/><Card title="Expirácia do 30 dní" value={expiring.length} color="border-red-500"/><Card title="Osoby v evidencii" value={people.length} color="border-teal-500"/></div>{msg&&<Banner type={msg.startsWith('Chyba')?'error':undefined}>{msg}</Banner>}<Table heads={['Typ','Osoba/Firma','Číslo','Platnosť do','Súbor','Poznámka','Akcie']}>{documents.map(d=><tr key={d.id} className="border-t"><Td teal>{d.document_type}</Td><Td>{d.person_name || d.company_name || '—'}</Td><Td>{d.document_number || '—'}</Td><Td>{d.expiry_date || '—'}</Td><Td>{d.file_url ? <a className="text-teal-700 font-bold" href={d.file_url} target="_blank">Otvoriť</a> : '—'}</Td><Td>{d.note}</Td><Td><div className="flex gap-2"><Btn onClick={()=>{setEdit(d);setShow(true)}}><Edit2 size={16}/></Btn><Btn red onClick={()=>del(d)}><Trash2 size={16}/></Btn></div></Td></tr>)}</Table>{show&&<DocumentModal document={edit} people={people} companies={companies} onClose={()=>setShow(false)} onSave={save}/>}</div>;
}

function DocumentModal({ document, people, companies, onClose, onSave }) { const [f,setF]=useState({document_type:document?.document_type||'Pas',person_id:document?.person_id||'',person_name:document?.person_name||'',company_id:document?.company_id||'',company_name:document?.company_name||'',document_number:document?.document_number||'',issue_date:document?.issue_date||'',expiry_date:document?.expiry_date||'',file_url:document?.file_url||'',note:document?.note||''}); const sf=(k,v)=>setF(p=>({...p,[k]:v})); useEffect(()=>{ const person=people.find(p=>String(p.id)===String(f.person_id)); if(person) setF(p=>({...p,person_name:`${person.first_name||''} ${person.last_name||''}`.trim(),company_id:person.company_id||p.company_id,company_name:person.company_name||p.company_name})); },[f.person_id]); useEffect(()=>{ const c=companies.find(c=>String(c.id)===String(f.company_id)); if(c) sf('company_name', c.company_name); },[f.company_id]); return <Modal title={document?'Upraviť dokument':'Nový dokument'} onClose={onClose} onSave={()=>onSave(f)} wide><Grid><Select label="Typ dokumentu" value={f.document_type} onChange={v=>sf('document_type',v)} opts={['Pas','Občiansky preukaz','Pobytová karta','Pracovné povolenie','Zmluva o ubytovaní','GDPR súhlas','Iné'].map(x=>[x,x])}/><Select label="Osoba" value={f.person_id} onChange={v=>sf('person_id',v)} opts={[['','—'],...people.map(p=>[p.id,`${p.first_name||''} ${p.last_name||''} • ${bedLabel(p)}`])]}/><Select label="Firma" value={f.company_id} onChange={v=>sf('company_id',v)} opts={[['','—'],...companies.map(c=>[c.id,c.company_name])]}/><Field label="Číslo dokumentu" value={f.document_number} onChange={v=>sf('document_number',v)}/><Field label="Vydané" type="date" value={f.issue_date} onChange={v=>sf('issue_date',v)}/><Field label="Platné do" type="date" value={f.expiry_date} onChange={v=>sf('expiry_date',v)}/><Field label="URL súboru / scan" value={f.file_url} onChange={v=>sf('file_url',v)} placeholder="https://... alebo Supabase Storage URL"/></Grid><Text label="Poznámka" value={f.note} onChange={v=>sf('note',v)}/></Modal> }

function Reports({ rooms = [], bookings = [], payments = [], people = [], companies = [], documents = [] }) {
  const paidTotal = payments.filter(p=>['Zaplatené','paid'].includes(p.status)).reduce((s,p)=>s+Number(p.amount||0),0);
  const pendingTotal = payments.filter(p=>!['Zaplatené','paid'].includes(p.status)).reduce((s,p)=>s+Number(p.amount||0),0);
  const debtors = payments.filter(p=>!['Zaplatené','paid'].includes(p.status));
  const companyTotals = companies.map(c => ({...c, total: payments.filter(p=>String(p.company_id)===String(c.id)).reduce((s,p)=>s+Number(p.amount||0),0), active: people.filter(p=>String(p.company_id)===String(c.id)&&p.status==='checked_in').length})).sort((a,b)=>b.total-a.total);
  const exportPayments = () => downloadCSV('stayhub_payments.csv', payments.map(p=>({payment_code:p.payment_code,payer:p.payer_name,amount:p.amount,status:p.status,due_date:p.due_date,paid_date:p.paid_date})));
  const exportPolice = () => downloadCSV('stayhub_foreign_police_export.csv', people.map(p=>({first_name:p.first_name,last_name:p.last_name,nationality:p.nationality,passport_no:p.passport_no,date_of_birth:p.date_of_birth,checkin_at:p.checkin_at,checkout_at:p.checkout_at,room_bed:bedLabel(p)})));
  const printContract = () => { const p = people.find(x=>x.status==='checked_in') || people[0]; const html = contractHtml(p); const w = window.open('', '_blank'); w.document.write(html); w.document.close(); w.print(); };
  return <div className="space-y-6"><Top title="📊 Reporty" onRefresh={()=>{}}/><div className="grid md:grid-cols-4 gap-4"><Card title="Uhradené" value={eur(paidTotal)} color="border-green-500"/><Card title="Neuhradené" value={eur(pendingTotal)} color="border-red-500"/><Card title="Aktívne osoby" value={people.filter(p=>p.status==='checked_in').length} color="border-blue-500"/><Card title="Dokumenty" value={documents.length} color="border-purple-500"/></div><div className="grid md:grid-cols-3 gap-4"><button className="btn-primary-soft justify-center" onClick={exportPayments}><Download size={18}/> Export platieb CSV</button><button className="btn-primary-soft justify-center" onClick={exportPolice}><Download size={18}/> Export pre políciu CSV</button><button className="btn-primary-soft justify-center" onClick={printContract}><FileText size={18}/> Zmluva PDF / tlač</button></div><div className="grid lg:grid-cols-2 gap-6"><div className="bg-white rounded-2xl p-6 shadow-sm border"><h2 className="text-xl font-black mb-4">Dlžníci</h2>{debtors.slice(0,10).map(p=><div key={p.id} className="flex justify-between border-b py-3"><div><b>{p.payer_name}</b><div className="text-sm text-slate-500">{p.payment_code} · splatnosť {p.due_date||'—'}</div></div><b className="text-red-600">{eur(p.amount)}</b></div>)}</div><div className="bg-white rounded-2xl p-6 shadow-sm border"><h2 className="text-xl font-black mb-4">Firmy podľa obratu</h2>{companyTotals.slice(0,10).map(c=><div key={c.id} className="flex justify-between border-b py-3"><div><b>{c.company_name}</b><div className="text-sm text-slate-500">Aktívne osoby: {c.active}</div></div><b>{eur(c.total)}</b></div>)}</div></div></div>;
}

function nextDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function downloadCSV(filename, rows){ const cols=[...new Set(rows.flatMap(r=>Object.keys(r)))]; const csv=[cols.join(','),...rows.map(r=>cols.map(c=>`"${String(r[c]??'').replace(/"/g,'""')}"`).join(','))].join('\n'); const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }
function contractHtml(p={}){ return `<!doctype html><html><head><title>Zmluva o ubytovaní</title><style>body{font-family:Arial;margin:40px;line-height:1.5}h1{font-size:24px}.box{border:1px solid #ddd;padding:16px;border-radius:12px;margin:16px 0}</style></head><body><h1>Zmluva o ubytovaní – StayHub</h1><div class="box"><b>Ubytovaný:</b> ${p.first_name||''} ${p.last_name||''}<br/><b>Pas/OP:</b> ${p.passport_no||''}<br/><b>Národnosť:</b> ${p.nationality||''}<br/><b>Lôžko:</b> ${bedLabel(p)}<br/><b>Check-in:</b> ${p.checkin_at||''}<br/><b>Očakávaný odchod:</b> ${p.expected_checkout_date||''}</div><p>Ubytovaný potvrdzuje prevzatie ubytovania, kľúčov a oboznámenie sa s domovým poriadkom.</p><br/><br/><table width="100%"><tr><td>____________________<br/>Podpis ubytovaného</td><td align="right">____________________<br/>Prevádzkovateľ</td></tr></table></body></html>`; }

function SettingsTab({ role }){
  return <div className="space-y-6">
    <h1 className="text-3xl font-bold">⚙️ Nastavenia</h1>
    <div className="bg-white rounded-xl p-8 space-y-5">
      <div>
        <h2 className="text-xl font-black">Právomoci používateľov</h2>
        <p className="text-slate-500 mt-1">Roly Admin / Správca / Recepcia / Účtovník / Housekeeping / Viewer. Ukladajú sa do Supabase tabuľky profiles.</p>
      </div>
      <div className="max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="text-sm font-bold text-slate-500">Tvoja rola</div>
        <div className="text-xl font-black text-slate-950">{getRole(role).label}</div>
        <p className="text-sm text-slate-500 mt-1">Rolu mení iba Admin v module Používatelia a oprávnenia.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(USER_ROLES).map(([key, value]) => <div key={key} className={`rounded-2xl border p-5 ${role===key?'border-[#C8A96B] bg-amber-50':'border-slate-200 bg-slate-50'}`}>
          <h3 className="font-black">{value.label}</h3>
          <p className="text-sm text-slate-600 mt-2">{value.description}</p>
          <p className="text-xs text-slate-500 mt-3">Moduly: {value.tabs.join(', ')}</p>
        </div>)}
      </div>
    </div>
    {canManageSettings(role) && <><UserInvitations /><FactoryResetAdmin /></>}
  </div>
}

function UserInvitations(){
  const [profiles,setProfiles]=useState([]);
  const [msg,setMsg]=useState(null);
  const [loading,setLoading]=useState(false);
  const [authStatus,setAuthStatus]=useState(null);
  const [passwordChange,setPasswordChange]=useState(null);
  const [form,setForm]=useState({email:'',full_name:'',password:'',password2:'',role:'reception',property_id:DEFAULT_PROPERTIES[0].id,is_active:true});
  const sf=(k,v)=>setForm(p=>({...p,[k]:v}));

  async function load(){ try{ setProfiles(await api('/api/profiles')); } catch(e){ setProfiles([]); } }
  async function checkSetup(){ try{ setAuthStatus(await api('/api/auth/status')); } catch(e){ setAuthStatus(null); } }
  useEffect(()=>{load(); checkSetup();},[]);

  async function createManualUser(){
    if(!form.email) return alert('Vyplň email používateľa.');
    if(!form.email.includes('@')) return alert('Email nemá správny formát.');
    if(!form.password || form.password.length < 6) return alert('Heslo musí mať aspoň 6 znakov.');
    if(form.password !== form.password2) return alert('Heslá sa nezhodujú.');
    setLoading(true); setMsg(null);
    try{
      await api('/api/auth/create-user',{method:'POST',body:JSON.stringify({email:form.email.trim(),password:form.password,full_name:form.full_name,role:form.role,property_id:form.property_id,is_active:form.is_active})});
      setMsg('Používateľ bol vytvorený manuálne a môže sa hneď prihlásiť.');
      setForm({email:'',full_name:'',password:'',password2:'',role:'reception',property_id:form.property_id,is_active:true});
      await load();
    }catch(e){ setMsg(`Chyba: ${e.message}`); }
    setLoading(false);
  }

  async function updateProfile(profile, patch){
    try{ await api(`/api/profiles/${profile.id}/role`,{method:'PUT',body:JSON.stringify(patch)}); await load(); }
    catch(e){ alert(e.message); }
  }

  async function changePassword(){
    if(!passwordChange?.id) return;
    if(!passwordChange.password || passwordChange.password.length < 6) return alert('Heslo musí mať aspoň 6 znakov.');
    if(passwordChange.password !== passwordChange.password2) return alert('Heslá sa nezhodujú.');
    try{
      await api(`/api/auth/users/${passwordChange.id}/password`,{method:'PUT',body:JSON.stringify({password:passwordChange.password})});
      setPasswordChange(null); setMsg('Heslo používateľa bolo zmenené.');
    }catch(e){ alert(e.message); }
  }

  async function deleteUser(profile){
    if(!confirm(`Vymazať používateľa ${profile.email}?`)) return;
    try{ await api(`/api/auth/users/${profile.id}`,{method:'DELETE'}); setMsg('Používateľ bol vymazaný.'); await load(); }
    catch(e){ alert(e.message); }
  }

  return <div className="bg-white rounded-xl p-8 space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div>
        <h2 className="text-xl font-black">Používatelia a oprávnenia</h2>
        <p className="text-slate-500 mt-1">Admin vytvorí používateľa manuálne, nastaví heslo, rolu, objekt a aktiváciu. Email pozvánky nie sú potrebné.</p>
      </div>
      <button onClick={checkSetup} className="btn-secondary whitespace-nowrap">Skontrolovať API</button>
    </div>

    <div className={`rounded-2xl border p-4 ${authStatus?.hasServiceRoleKey?'bg-emerald-50 border-emerald-200 text-emerald-800':'bg-amber-50 border-amber-200 text-amber-900'}`}>
      <div className="font-black mb-1">Stav manuálneho vytvárania používateľov</div>
      <div className="text-sm">{authStatus?.hasServiceRoleKey ? 'Service role key je dostupný. Používateľov môžeš vytvárať manuálne.' : 'Chýba alebo je nesprávny SUPABASE_SERVICE_ROLE_KEY.'}</div>
      <div className="grid md:grid-cols-3 gap-2 mt-3 text-xs">
        <div>Supabase URL: <b>{authStatus?.hasSupabaseUrl ? 'OK' : 'chýba'}</b></div>
        <div>Anon key: <b>{authStatus?.hasAnonKey ? 'OK' : 'chýba'}</b></div>
        <div>Service role key: <b>{authStatus?.hasServiceRoleKey ? 'OK' : 'chýba / zlý kľúč'}</b></div>
      </div>
    </div>

    {msg&&<div className={`p-4 rounded-2xl border ${msg.startsWith('Chyba')?'bg-red-50 border-red-200 text-red-700':'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{msg}</div>}

    <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5 space-y-4">
      <h3 className="font-black text-slate-950">Nový používateľ</h3>
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Email" value={form.email} onChange={v=>sf('email',v.trim())} placeholder="recepcia@example.com" />
        <Field label="Meno" value={form.full_name} onChange={v=>sf('full_name',v)} placeholder="Recepcia Postová" />
        <Select label="Rola" value={form.role} onChange={v=>sf('role',v)} opts={Object.entries(USER_ROLES).map(([key,value])=>[key,value.label])}/>
        <Select label="Objekt" value={form.property_id} onChange={v=>sf('property_id',v)} opts={DEFAULT_PROPERTIES.map(p=>[p.id,`${p.name} · ${p.city}`])}/>
        <Field label="Heslo" type="password" value={form.password} onChange={v=>sf('password',v)} placeholder="min. 6 znakov" />
        <Field label="Potvrdiť heslo" type="password" value={form.password2} onChange={v=>sf('password2',v)} placeholder="zopakuj heslo" />
      </div>
      <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><input type="checkbox" checked={form.is_active} onChange={e=>sf('is_active',e.target.checked)} />Aktívny používateľ</label>
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <button onClick={createManualUser} disabled={loading || authStatus?.hasServiceRoleKey===false} className="btn-save">{loading?'Vytváram...':'Vytvoriť používateľa'}</button>
        <p className="text-sm text-slate-500">Používateľ sa môže prihlásiť ihneď po vytvorení. Email pozvánka sa neposiela.</p>
      </div>
    </div>

    <div className="table-shell bg-white rounded-2xl border border-slate-100 overflow-x-auto">
      <table className="w-full min-w-[980px]"><thead><tr className="bg-slate-50"><th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">Email</th><th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">Meno</th><th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">Rola</th><th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">Objekt</th><th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">Aktívny</th><th className="px-5 py-4 text-left text-xs font-bold uppercase text-slate-500">Akcie</th></tr></thead>
      <tbody className="divide-y divide-slate-100">{profiles.map(p=><tr key={p.id||p.email}><td className="px-5 py-4 text-sm font-bold text-teal-700">{p.email}</td><td className="px-5 py-4 text-sm">{p.full_name||'—'}</td><td className="px-5 py-4"><select className="input-polish py-2" value={p.role||'reception'} onChange={e=>updateProfile(p,{role:e.target.value})}>{Object.entries(USER_ROLES).map(([key,value])=><option key={key} value={key}>{value.label}</option>)}</select></td><td className="px-5 py-4"><select className="input-polish py-2" value={p.property_id||DEFAULT_PROPERTIES[0].id} onChange={e=>updateProfile(p,{property_id:e.target.value})}>{DEFAULT_PROPERTIES.map(prop=><option key={prop.id} value={prop.id}>{prop.name}</option>)}</select></td><td className="px-5 py-4"><button className={`px-3 py-2 rounded-xl font-bold ${p.is_active===false?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-700'}`} onClick={()=>updateProfile(p,{is_active:!(p.is_active!==false)})}>{p.is_active===false?'Vypnutý':'Aktívny'}</button></td><td className="px-5 py-4"><div className="flex gap-2"><button className="btn-secondary py-2 px-3" onClick={()=>setPasswordChange({id:p.id,email:p.email,password:'',password2:''})}>Heslo</button><button className="btn-danger py-2 px-3" onClick={()=>deleteUser(p)}>Vymazať</button></div></td></tr>)}</tbody></table>
      {profiles.length===0&&<div className="p-6 text-slate-500">Zatiaľ žiadni používatelia v profiles.</div>}
    </div>

    {passwordChange && <Modal title={`Zmeniť heslo: ${passwordChange.email}`} onClose={()=>setPasswordChange(null)} onSave={changePassword}>
      <Field label="Nové heslo" type="password" value={passwordChange.password} onChange={v=>setPasswordChange(p=>({...p,password:v}))}/>
      <Field label="Potvrdiť heslo" type="password" value={passwordChange.password2} onChange={v=>setPasswordChange(p=>({...p,password2:v}))}/>
    </Modal>}
  </div>
}


function FactoryResetAdmin({ onDone }){
  const [confirmText,setConfirmText]=useState('');
  const [msg,setMsg]=useState(null);
  const [loading,setLoading]=useState(false);
  async function runReset(){
    if(confirmText !== 'RESET') return alert('Pre potvrdenie napíšte RESET.');
    if(!confirm('Naozaj chcete vymazať všetky testovacie dáta?')) return;
    setLoading(true); setMsg(null);
    try{
      await api('/api/admin/factory-reset',{method:'POST',body:JSON.stringify({confirm:'RESET'})});
      setMsg('Factory Reset úspešne dokončený. Rezervácie, check-in osoby, platby a dokumenty boli vymazané.');
      setConfirmText('');
      if(onDone) await onDone();
    }catch(e){ setMsg(`Chyba: ${e.message}`); }
    setLoading(false);
  }
  return <div className="bg-white rounded-xl p-8 space-y-5 border border-red-100">
    <div><h2 className="text-xl font-black">Administrácia</h2><p className="text-slate-500 mt-1">Factory Reset (Test Mode)</p></div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><div className="font-black mb-2">Vymaže iba testovacie prevádzkové dáta.</div><p className="text-sm">Rezervácie, check-in osoby, platby a dokumenty budú vymazané.</p><p className="text-sm mt-1">Nevymaže používateľov, firmy, izby, objekty ani nastavenia.</p></div>
    {msg&&<div className={`p-4 rounded-2xl border ${msg.startsWith('Chyba')?'bg-red-50 border-red-200 text-red-700':'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{msg}</div>}
    <div className="grid md:grid-cols-[1fr_auto] gap-3 items-end"><Field label="Pre potvrdenie napíšte RESET." value={confirmText} onChange={setConfirmText} placeholder="RESET" /><button onClick={runReset} disabled={loading || confirmText !== 'RESET'} className="btn-danger min-h-[52px]">{loading?'Resetujem...':'Vymazať testovacie dáta'}</button></div>
  </div>
}

function Top({title,action,onAction,onRefresh}){return <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4"><div><h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-950">{title}</h1><p className="text-sm text-slate-500 mt-1">StayHub · Smart Accommodation Management</p></div><div className="flex gap-2 flex-wrap"><button onClick={onRefresh} className="btn-secondary">🔄 Obnoviť</button>{action&&<button onClick={onAction} className="btn-primary-soft"><Plus size={20}/>{action}</button>}</div></div>}
function Modal({title,onClose,onSave,children,wide}){return <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className={`modal-card bg-white rounded-3xl shadow-2xl w-full ${wide?'max-w-6xl':'max-w-xl'} max-h-[92vh] overflow-auto`}><div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/95 backdrop-blur z-10"><h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2><button onClick={onClose} className="icon-btn"><X/></button></div><div className="p-6 space-y-5">{children}<div className="flex justify-end gap-3 pt-5 border-t border-slate-100"><button onClick={onClose} className="btn-muted">Zrušiť</button><button onClick={onSave} className="btn-save">Uložiť</button></div></div></div></div>}
function Grid({children}){return <div className="grid md:grid-cols-2 gap-4">{children}</div>}
function Field({label,value,onChange,type='text',placeholder,disabled}){return <label className="block"><span className="block text-sm font-bold text-slate-700 mb-1.5">{label}</span><input disabled={disabled} type={type} value={value||''} placeholder={placeholder} onChange={e=>onChange?.(e.target.value)} className="input-polish disabled:bg-slate-100"/></label>}
function Select({label,value,onChange,opts}){return <label className="block"><span className="block text-sm font-bold text-slate-700 mb-1.5">{label}</span><select value={value||''} onChange={e=>onChange(e.target.value)} className="input-polish">{opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>}
function Text({label,value,onChange}){return <label className="block"><span className="block text-sm font-bold text-slate-700 mb-1.5">{label}</span><textarea value={value||''} onChange={e=>onChange(e.target.value)} className="input-polish min-h-[96px]" rows="3"/></label>}
function Table({heads,children}){return <div className="table-shell bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="bg-slate-50/90">{heads.map(h=><th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{children}</tbody></table></div>}
function Td({children,teal}){return <td className={`px-5 py-4 text-sm align-top text-slate-700 ${teal?'text-teal-700 font-bold':''}`}>{children}</td>}
function Btn({children,onClick,red}){return <button onClick={onClick} className={`action-btn ${red?'action-danger':'action-edit'}`}>{children}</button>}
function Badge({children,green}){return <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${green?'bg-emerald-100 text-emerald-800':'bg-amber-100 text-amber-800'}`}>{children}</span>}
function Card({title,value,color}){return <div className={`metric-card bg-white rounded-2xl shadow-sm p-6 border-l-4 ${color}`}><p className="text-slate-500 text-sm font-semibold">{title}</p><p className="text-3xl font-black mt-2 tracking-tight text-slate-950">{value}</p></div>}
function Banner({children,type}){return <div className={`mx-5 md:mx-8 mt-5 p-4 border rounded-2xl shadow-sm ${type==='error'?'bg-red-50 border-red-200 text-red-700':'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>{children}</div>}
