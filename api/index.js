import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const ALLOWED_ORIGINS = (process.env.CORS_ALLOWED_ORIGINS || 'https://ubytovna-trnava-02.vercel.app').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) { if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true); return cb(new Error('CORS: origin not allowed')); }, credentials: false }));
app.use(express.json({ limit: '15mb' }));

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const authSupabase = supabaseUrl && anonKey ? createClient(supabaseUrl, anonKey) : null;
const hasServiceRoleKey = Boolean(serviceRoleKey) && !serviceRoleKey.startsWith('sb_publishable_');
const adminSupabase = supabaseUrl && hasServiceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;

const DOCUMENT_BUCKET = process.env.SUPABASE_DOCUMENTS_BUCKET || 'stayhub-documents';
const DOCUMENT_FOLDERS = {
  passport: 'passport',
  pas: 'passport',
  visa: 'visa',
  víza: 'visa',
  viza: 'visa',
  pobyt: 'visa',
  photo: 'photos',
  fotka: 'photos',
  fotografia: 'photos',
  contract: 'contract',
  zmluva: 'contract',
  insurance: 'insurance',
  poistenie: 'insurance',
  work: 'work_permit',
  pracovne: 'work_permit',
  pracovné: 'work_permit'
};

function safeFileName(name = 'document') {
  const cleaned = String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return cleaned || `document-${Date.now()}`;
}

function slugPart(value = '', fallback = 'unassigned') {
  const cleaned = String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return cleaned || fallback;
}

function documentFolder(type = '', mime = '') {
  const key = String(type || '').toLowerCase();
  const mapped = Object.entries(DOCUMENT_FOLDERS).find(([needle]) => key.includes(needle));
  if (mapped) return mapped[1];
  if (String(mime || '').startsWith('image/')) return 'photos';
  return 'other';
}

function buildDocumentStoragePath({ propertyId, company_id, person_id, document_type, filename, mime_type }) {
  const property = slugPart(propertyId || 'postova-3', 'postova-3');
  const company = company_id ? `company-${slugPart(company_id)}` : 'company-unassigned';
  const person = person_id ? `person-${slugPart(person_id)}` : 'person-unassigned';
  const folder = documentFolder(document_type, mime_type);
  const uniqueName = `${Date.now()}-${safeFileName(filename)}`;
  return `${property}/${company}/${person}/${folder}/${uniqueName}`;
}

function normalizeOcrDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const iso = raw.match(/(20\d{2}|19\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`;
  const eur = raw.match(/(\d{1,2})[-\/.](\d{1,2})[-\/.](20\d{2}|19\d{2})/);
  if (eur) return `${eur[3]}-${eur[2].padStart(2,'0')}-${eur[1].padStart(2,'0')}`;
  return null;
}

function fallbackOcrFromText(text = '') {
  const t = String(text || '');
  const passport = t.match(/(?:passport|pas|cestovny|cestovn\w*|document|doklad)[^A-Z0-9]{0,12}([A-Z0-9]{6,12})/i) || t.match(/\b([A-Z]{1,3}\d{6,9})\b/);
  const expiry = t.match(/(?:expiry|expires|valid until|platn\w* do|expiration)[^0-9]{0,20}([0-9]{1,2}[.\/-][0-9]{1,2}[.\/-][12][0-9]{3}|[12][0-9]{3}[.\/-][0-9]{1,2}[.\/-][0-9]{1,2})/i);
  return {
    document_number: passport?.[1] || '',
    expiry_date: normalizeOcrDate(expiry?.[1]),
    issue_date: null,
    full_name: '',
    nationality: '',
    summary: passport?.[1] ? 'Rozpoznané základné údaje zo scanu.' : 'OCR demo: údaje neboli spoľahlivo rozpoznané.'
  };
}

async function openAiOcr({ base64, file_url, mime_type, document_type }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Chýba OPENAI_API_KEY vo Vercel Environment Variables. Bez neho AI OCR nevie čítať doklady.');
  const imageUrl = base64 || file_url;
  if (!imageUrl) throw new Error('Chýba obrázok alebo link na dokument pre AI OCR.');
  if (String(mime_type || '').includes('pdf')) throw new Error('AI OCR v tejto verzii podporuje fotky dokladov JPG/PNG/WEBP/HEIC. PDF prosím nahraj ako fotografiu alebo screenshot.');
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_OCR_MODEL || 'gpt-4.1-mini',
      input: [{ role: 'user', content: [
        { type: 'input_text', text: `Extract OCR data from this ${document_type || 'document'}. Return ONLY JSON with keys: document_number, issue_date, expiry_date, full_name, nationality, summary. Dates must be YYYY-MM-DD or null.` },
        { type: 'input_image', image_url: imageUrl }
      ] }],
      text: { format: { type: 'json_object' } }
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'OpenAI OCR zlyhalo.');
  const text = data.output_text || data.output?.flatMap(o=>o.content||[]).map(c=>c.text).filter(Boolean).join('') || '{}';
  const parsed = JSON.parse(text);
  return {
    document_number: parsed.document_number || '',
    issue_date: normalizeOcrDate(parsed.issue_date),
    expiry_date: normalizeOcrDate(parsed.expiry_date),
    full_name: parsed.full_name || '',
    nationality: parsed.nationality || '',
    summary: parsed.summary || 'AI OCR spracované.'
  };
}

const TABLES = {
  rooms: 'rooms',
  bookings: 'bookings',
  payments: 'payments',
  companies: 'companies',
  'checkin-persons': 'checkin_persons',
  checkin_persons: 'checkin_persons',
  documents: 'documents',
  beds: 'beds',
  audit_logs: 'audit_logs',
  profiles: 'profiles'
};
const PROPERTY_TABLES = new Set(['rooms', 'beds', 'bookings', 'payments', 'companies', 'checkin_persons', 'documents']);

const cancelled = new Set(['cancelled', 'canceled', 'Da huy', 'Đã hủy', 'Zrušená', 'Zrusena', 'zrušené']);
const paid = new Set(['paid', 'Da thanh toan', 'Đã thanh toán', 'Zaplatené', 'zaplatené']);
const cancelledStatus = new Set(['cancelled', 'canceled', 'Zrušená', 'Zrusena', 'zrušené']);

function requireSupabase(req, res) {
  if (!req.supabase) {
    res.status(500).json({ success: false, error: 'Supabase nie je nakonfigurovaný.' });
    return false;
  }
  return true;
}

function authenticatedClient(token) {
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });
}

function tokenFrom(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' ? token : null;
}

async function loadProfile(db, user) {
  const query = adminSupabase || db;
  const allowedRoles = new Set(['admin', 'manager', 'reception', 'accounting', 'housekeeping', 'viewer']);
  const email = user?.email || user?.user_metadata?.email || null;
  const metadataRole = user?.user_metadata?.role;
  const metadataProperty = user?.user_metadata?.property_id || 'postova-3';

  let profile = null;
  let profileError = null;

  // 1) Prefer exact auth user id.
  try {
    const result = await query
      .from('profiles')
      .select('id,email,full_name,role,property_id,is_active')
      .eq('id', user.id)
      .maybeSingle();
    profile = result.data || null;
    profileError = result.error || null;
  } catch (err) {
    profileError = err;
  }

  // 2) Fallback by email. This fixes older profiles created manually or imported.
  if (!profile && email) {
    try {
      const resultByEmail = await query
        .from('profiles')
        .select('id,email,full_name,role,property_id,is_active')
        .eq('email', email)
        .maybeSingle();
      if (resultByEmail.data) profile = resultByEmail.data;
      if (resultByEmail.error) profileError = resultByEmail.error;
    } catch (err) {
      profileError = err;
    }
  }

  // 3) If profile exists by email but has different id, normalize it to auth.users.id.
  // This prevents the app from reading fallback "reception" forever.
  if (profile && String(profile.id) !== String(user.id) && adminSupabase) {
    const normalized = {
      ...profile,
      id: user.id,
      email: email || profile.email,
      updated_at: new Date().toISOString()
    };
    try {
      const { data: upserted } = await adminSupabase
        .from('profiles')
        .upsert(normalized, { onConflict: 'id' })
        .select('id,email,full_name,role,property_id,is_active')
        .maybeSingle();
      if (upserted) profile = upserted;
    } catch {}
  }

  // 4) Auto-create missing profile so backend can always load a role.
  if (!profile && adminSupabase && user?.id) {
    const fallbackRole = allowedRoles.has(metadataRole) ? metadataRole : 'viewer';
    const newProfile = {
      id: user.id,
      email,
      full_name: user?.user_metadata?.full_name || email || null,
      role: fallbackRole,
      property_id: metadataProperty,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    try {
      const { data: created } = await adminSupabase
        .from('profiles')
        .upsert(newProfile, { onConflict: 'id' })
        .select('id,email,full_name,role,property_id,is_active')
        .maybeSingle();
      if (created) profile = created;
    } catch (err) {
      profileError = err;
    }
  }

  // 5) Safe fallback. Do not break login only because profiles select/upsert failed.
  const role = allowedRoles.has(profile?.role) ? profile.role : (allowedRoles.has(metadataRole) ? metadataRole : 'viewer');

  return {
    id: user.id,
    email: profile?.email || email || null,
    full_name: profile?.full_name || user?.user_metadata?.full_name || email || null,
    role,
    property_id: profile?.property_id || metadataProperty || 'postova-3',
    is_active: profile?.is_active !== false,
    profile_loaded: Boolean(profile),
    profile_error: profileError?.message || null
  };
}

// v6.4.9 vykon: kratka cache overenia tokenu (per-instancia), aby sa getUser+loadProfile
// neopakovali pri kazdom volani. Token jednoznacne identifikuje pouzivatela.
const AUTH_CACHE = new Map();
const AUTH_TTL_MS = 60000;
async function authenticateRequest(req, res, next) {
  if (!supabaseUrl || !anonKey || !authSupabase) {
    return res.status(500).json({ success: false, error: 'Chýba SUPABASE_URL alebo SUPABASE_ANON_KEY.' });
  }
  const token = tokenFrom(req);
  if (!token) return res.status(401).json({ success: false, error: 'Chýba prihlásenie. Prihlás sa znova.' });
  try {
    let user, profile;
    const cached = AUTH_CACHE.get(token);
    if (cached && (Date.now() - cached.at) < AUTH_TTL_MS) {
      user = cached.user; profile = cached.profile;
    } else {
      const { data, error } = await authSupabase.auth.getUser(token);
      if (error || !data?.user) return res.status(401).json({ success: false, error: 'Neplatné alebo expirované prihlásenie.' });
      user = data.user;
      profile = await loadProfile(authenticatedClient(token), user);
      AUTH_CACHE.set(token, { user, profile, at: Date.now() });
      if (AUTH_CACHE.size > 500) { for (const k of AUTH_CACHE.keys()) { AUTH_CACHE.delete(k); if (AUTH_CACHE.size <= 300) break; } }
    }
    if (!profile.is_active) return res.status(403).json({ success: false, error: 'Používateľ je deaktivovaný.' });
    req.user = user;
    req.profile = profile;
    req.role = profile.role;
    req.propertyId = effectivePropertyId(req, profile);
    req.supabase = authenticatedClient(token);
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: err.message || 'Prihlásenie sa nedá overiť.' });
  }
}

function effectivePropertyId(req, profile) {
  const requested = String(req.headers['x-property-id'] || '').trim();
  if (profile.role === 'admin' && requested) return requested;
  return profile.property_id || 'postova-3';
}

function scopedQuery(req, table, query) {
  if (PROPERTY_TABLES.has(table)) return query.eq('property_id', req.propertyId);
  return query;
}

function withProperty(req, table, payload) {
  if (!PROPERTY_TABLES.has(table)) return payload;
  return { ...payload, property_id: req.propertyId };
}

function nightsBetween(start, end) {
  const diff = (new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24);
  return Math.max(1, Number.isFinite(diff) ? diff : 1);
}

function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

function invoiceNumber(prefix = 'INV') {
  const d = new Date();
  const stamp = d.toISOString().slice(0, 10).replace(/-/g, '');
  return `${prefix}-${stamp}-${String(Date.now()).slice(-6)}`;
}

async function calculateBookingPricing(db, payload) {
  const beds = normalizeBeds(payload);
  const nights = nightsBetween(payload.check_in_date, payload.check_out_date);
  const roomIds = [...new Set(beds.map(b => b.room_id).filter(Boolean))];
  let rooms = [];
  if (roomIds.length) {
    const { data, error } = await db.from('rooms').select('id,price_daily,price_monthly').in('id', roomIds);
    if (error) throw error;
    rooms = data || [];
  }
  const roomById = new Map(rooms.map(r => [String(r.id), r]));
  const fallbackDaily = Number(payload.unit_price || 18);
  const pricingModel = payload.pricing_model || 'daily';
  const subtotal = beds.reduce((sum, bed) => {
    const room = roomById.get(String(bed.room_id));
    const daily = Number(room?.price_daily || fallbackDaily);
    const monthly = Number(room?.price_monthly || daily * 30);
    return sum + (pricingModel === 'monthly' ? (monthly / 30) * nights : daily * nights);
  }, 0);
  const discount = money(payload.discount_amount || 0);
  const taxRate = Number(payload.tax_rate || 0);
  const taxable = Math.max(0, subtotal - discount);
  const taxAmount = money(taxable * taxRate / 100);
  return {
    pricing_model: pricingModel,
    currency: payload.currency || 'EUR',
    subtotal_price: money(subtotal),
    discount_amount: discount,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    total_price: money(taxable + taxAmount)
  };
}

function cancellationFee(payload) {
  if (!cancelledStatus.has(payload.status)) return payload.cancellation_fee || 0;
  if (payload.cancellation_fee !== undefined && payload.cancellation_fee !== null && payload.cancellation_fee !== '') return Number(payload.cancellation_fee || 0);
  const today = new Date().toISOString().slice(0, 10);
  const daysBeforeArrival = Math.ceil((new Date(payload.check_in_date) - new Date(today)) / (1000 * 60 * 60 * 24));
  const total = Number(payload.total_price || 0);
  if (daysBeforeArrival >= 7) return 0;
  if (daysBeforeArrival >= 2) return money(total * 0.25);
  return money(total * 0.5);
}

async function writeAudit(req, table, action, recordId, oldData, newData) {
  const db = adminSupabase || req.supabase;
  if (!db || table === 'audit_logs') return;
  try {
    await db.from('audit_logs').insert({
      property_id: req.propertyId,
      user_id: req.user?.id || null,
      user_email: req.profile?.email || req.user?.email || null,
      table_name: table,
      record_id: recordId ? String(recordId) : null,
      action,
      old_data: oldData || null,
      new_data: newData || null
    });
  } catch {
    // Audit must never break the operational booking flow.
  }
}

function requireRoles(req, res, roles) {
  if (!roles.includes(req.role)) {
    res.status(403).json({ success: false, error: 'Na túto akciu nemáš oprávnenie.' });
    return false;
  }
  return true;
}

function canUseTable(role, table, action) {
  const rules = {
    rooms: {
      read: ['admin','manager','reception','housekeeping','viewer'],
      write: ['admin','manager','housekeeping'],
      delete: ['admin']
    },
    bookings: {
      read: ['admin','manager','reception','viewer'],
      write: ['admin','manager','reception'],
      delete: ['admin']
    },
    beds: {
      read: ['admin','manager','reception','housekeeping','viewer'],
      write: ['admin','manager'],
      delete: ['admin']
    },
    payments: {
      read: ['admin','manager','reception','accounting'],
      write: ['admin','manager','reception','accounting'],
      delete: ['admin']
    },
    companies: {
      read: ['admin','manager','reception','accounting'],
      write: ['admin','manager'],
      delete: ['admin']
    },
    checkin_persons: {
      read: ['admin','manager','reception','housekeeping'],
      write: ['admin','manager','reception','housekeeping'],
      delete: ['admin']
    },
    documents: {
      read: ['admin','manager'],
      write: ['admin','manager'],
      delete: ['admin']
    },
    audit_logs: {
      read: ['admin'],
      write: ['admin'],
      delete: ['admin']
    },
    profiles: {
      read: ['admin'],
      write: ['admin'],
      delete: ['admin']
    }
  };
  return Boolean(rules[table]?.[action]?.includes(role));
}

function orderBy(table) {
  if (table === 'rooms') return ['room_number', true];
  if (table === 'beds') return ['sort_order', true];
  if (table === 'companies') return ['company_name', true];
  if (table === 'bookings') return ['check_in_date', false];
  if (table === 'payments') return ['payment_month', false];
  if (table === 'checkin_persons') return ['checkin_at', false];
  if (table === 'documents') return ['created_at', false];
  return ['created_at', false];
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return String(aStart) < String(bEnd) && String(aEnd) > String(bStart);
}

function dateOnly(value) {
  return value ? String(value).slice(0, 10) : null;
}

function validateStayDatesAgainstBooking(payload, booking) {
  const start = dateOnly(booking?.check_in_date || booking?.check_in);
  const end = dateOnly(booking?.check_out_date || booking?.check_out);
  if (!start || !end) return;

  const checkinDate = dateOnly(payload.checkin_at || payload.checked_in_at || payload.actual_check_in);
  if (checkinDate) {
    if (checkinDate < start) {
      throw new Error(`Check-in je možný najskôr v prvý deň rezervácie (${start}).`);
    }
    if (checkinDate > end) {
      throw new Error(`Check-in nie je možný po poslednom dni rezervácie (${end}).`);
    }
  }

  const checkoutDate = dateOnly(payload.checkout_at || payload.actual_check_out);
  if (checkoutDate) {
    if (checkoutDate < start) {
      throw new Error(`Check-out nie je možný pred začiatkom rezervácie (${start}).`);
    }
    // v6.4.7: oneskoreny check-out (prespanie / zabudnute odhlasenie) musi byt povoleny -
    // uz neblokujeme check-out po poslednom dni rezervacie.
  }
}

function normalizeBeds(b) {
  let beds = [];
  if (Array.isArray(b?.reserved_beds)) beds = b.reserved_beds;
  else if (typeof b?.reserved_beds === 'string') {
    try { beds = JSON.parse(b.reserved_beds); } catch { beds = []; }
  }
  if ((!beds || beds.length === 0) && b?.room_id && b?.bed_code) beds = [{ room_id: b.room_id, bed_code: String(b.bed_code) }];
  return beds || [];
}


function canonicalOperationalStatus(status) {
  const s = String(status || '').trim();
  if (['checked_out','Ukončená','Dokončená','completed','archived'].includes(s)) return 'checked_out';
  if (['checked_in','Check-in','occupied','Ubytovaný','Đang ở'].includes(s)) return 'checked_in';
  if (['cancelled','canceled','Zrušená','Zrusena','Da huy','Đã hủy'].includes(s)) return 'cancelled';
  return s || 'reserved';
}

function bedIdentity(row = {}) {
  return `${String(row.room_id || '')}:${String(row.bed_code || '')}`;
}

function removeBedFromList(beds = [], roomId, bedCode) {
  const target = `${String(roomId || '')}:${String(bedCode || '')}`;
  return (beds || []).filter(bed => `${String(bed.room_id || '')}:${String(bed.bed_code || '')}` !== target);
}

function personDateRange(person = {}) {
  const start = dateOnly(person.checkin_at || person.checked_in_at || person.actual_check_in || person.created_at) || '1900-01-01';
  const end = dateOnly(person.checkout_at || person.checked_out_at || person.actual_check_out || person.expected_checkout_date) || '9999-12-31';
  return { start, end };
}

function checkedInPersonOverlaps(person, start, end) {
  if (canonicalOperationalStatus(person.status) !== 'checked_in') return false;
  const range = personDateRange(person);
  return overlaps(start, end, range.start, range.end);
}

async function updateBedInventory(db, propertyId, person) {
  if (!person?.room_id || person?.bed_code === undefined || person?.bed_code === null) return;
  const status = canonicalOperationalStatus(person.status) === 'checked_in' ? 'occupied' : 'available';
  try {
    await db
      .from('beds')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('property_id', propertyId)
      .eq('room_id', person.room_id)
      .eq('bed_code', String(person.bed_code));
  } catch {
    // Beds inventory is supportive. Do not break check-in/out when beds table is missing in older deployments.
  }
}

async function syncBookingAfterPersonChange(req, db, personRow) {
  if (!personRow?.booking_id) return null;
  const directDb = adminSupabase || db;
  const now = new Date().toISOString();
  const propertyId = req.propertyId || personRow.property_id || 'postova-3';

  const { data: booking, error: bookingError } = await directDb
    .from('bookings')
    .select('*')
    .eq('id', personRow.booking_id)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) return null;

  const { data: people, error: peopleError } = await directDb
    .from('checkin_persons')
    .select('*')
    .eq('booking_id', booking.id)
    .eq('property_id', propertyId);
  if (peopleError) throw peopleError;

  const activePeople = (people || []).filter(p => canonicalOperationalStatus(p.status) === 'checked_in');
  const checkedOutPeople = (people || []).filter(p => canonicalOperationalStatus(p.status) === 'checked_out');
  const personStatus = canonicalOperationalStatus(personRow.status);

  let nextReservedBeds = normalizeBeds(booking);
  // Once a person checks in, the bed is no longer "reserved"; it is occupied.
  // Once that person checks out, the bed becomes free, not reserved again.
  if ((personStatus === 'checked_in' || personStatus === 'checked_out') && personRow.room_id && personRow.bed_code !== undefined) {
    nextReservedBeds = removeBedFromList(nextReservedBeds, personRow.room_id, personRow.bed_code);
  }

  let nextStatus = booking.status || 'Potvrdená';
  const update = {
    reserved_beds: nextReservedBeds,
    updated_at: now
  };

  if (activePeople.length > 0) {
    nextStatus = 'Check-in';
    update.status = nextStatus;
    update.actual_check_in = booking.actual_check_in || activePeople
      .map(p => p.checkin_at || p.checked_in_at || p.actual_check_in)
      .filter(Boolean)
      .sort()[0] || now;
    update.actual_check_out = null;
  } else if (nextReservedBeds.length > 0 && personStatus !== 'checked_out') {
    nextStatus = 'Potvrdená';
    update.status = nextStatus;
  } else if (personStatus === 'checked_out' || checkedOutPeople.length > 0) {
    nextStatus = 'Ukončená';
    update.status = nextStatus;
    update.actual_check_out = personRow.checkout_at || personRow.checked_out_at || personRow.actual_check_out || now;
    update.reserved_beds = [];
  } else if (nextReservedBeds.length === 0) {
    // Fully checked-in group with no remaining reserved beds keeps Check-in state
    // when active people exist; otherwise leave the old state.
    update.status = nextStatus;
  }

  const { data: savedBooking, error: updateError } = await directDb
    .from('bookings')
    .update(update)
    .eq('id', booking.id)
    .select('*')
    .maybeSingle();
  if (updateError) throw updateError;

  await updateBedInventory(directDb, propertyId, personRow);
  await writeAudit(req, 'bookings', 'sync_after_person_state', booking.id, booking, savedBooking || { ...booking, ...update });
  return savedBooking || { ...booking, ...update };
}

function looksLikeUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

function cleanPayload(table, payload) {
  const out = { ...payload };
  const nullableDates = ['due_date','paid_date','check_in_date','check_out_date','actual_check_in','actual_check_out','checkin_at','checkout_at','checked_out_at','expected_checkout_date','date_of_birth','issue_date','expiry_date'];
  nullableDates.forEach(k => { if (out[k] === '') out[k] = null; });
  ['company_id','booking_id','room_id','guest_id','person_id'].forEach(k => { if (out[k] === '') out[k] = null; });
  if (table === 'documents') {
    delete out._ocr_base64;
    delete out.ocr_result;
  }
  if (table === 'payments') {
    if (!out.payment_code) delete out.payment_code;
    if (out.amount === '') delete out.amount;
    if (out.amount !== undefined && out.amount !== null && out.amount !== '') out.amount = Number(out.amount);

    // Normalize localized UI statuses into canonical DB values.
    const paidStatuses = new Set(['Zaplatené','paid','Đã thanh toán','Da thanh toan']);
    const pendingStatuses = new Set(['Čaká','Caka','pending','Đang chờ','Dang cho']);
    const overdueStatuses = new Set(['Po splatnosti','overdue','Quá hạn','Qua han']);

    if (paidStatuses.has(out.status)) out.status = 'Zaplatené';
    else if (pendingStatuses.has(out.status)) out.status = 'Čaká';
    else if (overdueStatuses.has(out.status)) out.status = 'Po splatnosti';

    if (out.status === 'Zaplatené') {
      if (!out.paid_date) out.paid_date = new Date().toISOString().slice(0, 10);
      if (!out.paid_at) out.paid_at = new Date().toISOString();
    } else {
      if (out.paid_date === '') out.paid_date = null;
      if (out.paid_at === '') out.paid_at = null;
    }
  }
  if (table === 'bookings') {
    // Bookings table uses actual_check_out; checked_out_at belongs to checkin_persons.
    delete out.checked_out_at;
    if (out.check_in_date && !out.check_in) out.check_in = out.check_in_date;
    if (out.check_out_date && !out.check_out) out.check_out = out.check_out_date;
    if (out.email && !out.guest_email) out.guest_email = out.email;
    if (out.phone && !out.guest_phone) out.guest_phone = out.phone;
    ['requested_beds'].forEach(k => { if (out[k] !== undefined && out[k] !== null && out[k] !== '') out[k] = Number(out[k]); });
    ['total_price','subtotal_price','discount_amount','tax_rate','tax_amount','cancellation_fee','unit_price'].forEach(k => {
      if (out[k] === '') delete out[k];
      else if (out[k] !== undefined && out[k] !== null) out[k] = Number(out[k]);
    });
  }
  if (table === 'bookings' && out.payer_type === 'person') {
    out.company_id = null;
    out.company_name = null;
  }
  if (table === 'checkin_persons') {
    if (out.passport_no && !out.document_number) out.document_number = out.passport_no;
    if (out.document_number && !out.passport_no) out.passport_no = out.document_number;
    if (out.date_of_birth && !out.birth_date) out.birth_date = out.date_of_birth;
    if (out.birth_date && !out.date_of_birth) out.date_of_birth = out.birth_date;
    if (out.checked_in_at && !out.checkin_at) out.checkin_at = out.checked_in_at;
    if (out.checkin_at && !out.checked_in_at) out.checked_in_at = out.checkin_at;
    if (out.checked_out_at && !out.checkout_at) out.checkout_at = out.checked_out_at;
    if (out.checkout_at && !out.checked_out_at) out.checked_out_at = out.checkout_at;
    if (out.actual_check_out && !out.checked_out_at) out.checked_out_at = out.actual_check_out;
    if (!out.full_name) {
      out.full_name = `${out.first_name || ''} ${out.last_name || ''}`.trim() || null;
    }
  }
  return out;
}


async function syncBookingPaymentTotals(req, db, bookingId) {
  if (!bookingId) return null;
  const directDb = adminSupabase || db;
  const { data: booking, error: bookingError } = await scopedQuery(req, 'bookings', directDb.from('bookings').select('*')).eq('id', bookingId).maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking) return null;
  const { data: payments, error: paymentError } = await scopedQuery(req, 'payments', directDb.from('payments').select('*')).eq('booking_id', bookingId);
  if (paymentError) throw paymentError;
  const paidAmount = (payments || [])
    .filter((payment) => paid.has(payment.status))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const total = Number(booking.total_price || 0);
  const balance = Math.max(0, total - paidAmount);
  const nextPaymentStatus = total > 0 && balance <= 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'unpaid');
  const update = {
    paid_amount: money(paidAmount),
    payment_status: nextPaymentStatus,
    updated_at: new Date().toISOString()
  };
  const { data: saved, error: updateError } = await directDb.from('bookings').update(update).eq('id', bookingId).select('*').maybeSingle();
  if (updateError) throw updateError;
  return saved || { ...booking, ...update };
}


async function recomputeBookingWorkflow(req, db, bookingId, options = {}) {
  if (!bookingId) return null;
  const directDb = adminSupabase || db;
  const propertyId = req.propertyId || 'postova-3';
  const now = new Date().toISOString();

  const { data: booking, error: bookingError } = await directDb
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .maybeSingle();
  if (bookingError) throw bookingError;
  if (!booking || (booking.property_id && booking.property_id !== propertyId)) return null;
  if (canonicalOperationalStatus(booking.status) === 'cancelled') return booking;

  const { data: people, error: peopleError } = await directDb
    .from('checkin_persons')
    .select('*')
    .eq('booking_id', booking.id)
    .eq('property_id', propertyId);
  if (peopleError) throw peopleError;

  const allPeople = people || [];
  const activePeople = allPeople.filter(p => canonicalOperationalStatus(p.status) === 'checked_in');
  const checkedOutPeople = allPeople.filter(p => canonicalOperationalStatus(p.status) === 'checked_out');
  const movedBeds = new Set(allPeople
    .filter(p => ['checked_in','checked_out'].includes(canonicalOperationalStatus(p.status)))
    .filter(p => p.room_id && p.bed_code !== undefined && p.bed_code !== null)
    .map(bedIdentity));

  const currentReserved = normalizeBeds(booking);
  const nextReservedBeds = currentReserved.filter(bed => !movedBeds.has(bedIdentity(bed)));
  const checkedInTimes = activePeople.map(p => p.checkin_at || p.checked_in_at || p.actual_check_in).filter(Boolean).sort();
  const checkedOutTimes = checkedOutPeople.map(p => p.checkout_at || p.checked_out_at || p.actual_check_out).filter(Boolean).sort();

  const update = { reserved_beds: nextReservedBeds, updated_at: now };

  if (activePeople.length > 0) {
    update.status = 'Check-in';
    update.actual_check_in = booking.actual_check_in || checkedInTimes[0] || now;
    update.actual_check_out = null;
  } else if (allPeople.length > 0 && checkedOutPeople.length === allPeople.length) {
    update.status = 'Ukončená';
    update.reserved_beds = [];
    update.actual_check_out = checkedOutTimes[checkedOutTimes.length - 1] || now;
  } else if (nextReservedBeds.length > 0) {
    update.status = booking.status && canonicalOperationalStatus(booking.status) !== 'checked_out' ? booking.status : 'Potvrdená';
  } else if (currentReserved.length > 0 && nextReservedBeds.length === 0 && checkedOutPeople.length > 0) {
    update.status = 'Ukončená';
    update.actual_check_out = checkedOutTimes[checkedOutTimes.length - 1] || now;
    update.reserved_beds = [];
  }

  const { data: saved, error: updateError } = await directDb
    .from('bookings')
    .update(update)
    .eq('id', booking.id)
    .select('*')
    .maybeSingle();
  if (updateError) throw updateError;

  if (!options.skipBedRecompute) await recomputeBedInventory(req, directDb);
  return saved || { ...booking, ...update };
}

async function recomputeBedInventory(req, db) {
  const directDb = adminSupabase || db;
  const propertyId = req.propertyId || 'postova-3';
  const day = new Date().toISOString().slice(0, 10);

  let bedsResult = await directDb.from('beds').select('*').eq('property_id', propertyId);
  if (bedsResult.error) return { skipped: true, reason: bedsResult.error.message };
  const beds = bedsResult.data || [];
  if (!beds.length) return { updated: 0 };

  const [{ data: people, error: peopleError }, { data: bookings, error: bookingsError }] = await Promise.all([
    directDb.from('checkin_persons').select('*').eq('property_id', propertyId),
    directDb.from('bookings').select('*').eq('property_id', propertyId)
  ]);
  if (peopleError) throw peopleError;
  if (bookingsError) throw bookingsError;

  const occupied = new Set((people || [])
    .filter(p => canonicalOperationalStatus(p.status) === 'checked_in')
    .filter(p => p.room_id && p.bed_code !== undefined && p.bed_code !== null)
    .map(bedIdentity));

  const reserved = new Set();
  (bookings || [])
    .filter(b => canonicalOperationalStatus(b.status) !== 'cancelled' && canonicalOperationalStatus(b.status) !== 'checked_out')
    .filter(b => overlaps(day, nextDate(day), b.check_in_date || b.check_in, b.check_out_date || b.check_out))
    .forEach(b => normalizeBeds(b).forEach(bed => {
      const key = bedIdentity(bed);
      if (!occupied.has(key)) reserved.add(key);
    }));

  let updated = 0;
  for (const bed of beds) {
    const key = bedIdentity(bed);
    const nextStatus = occupied.has(key) ? 'occupied' : (reserved.has(key) ? 'reserved' : 'available');
    if (bed.status !== nextStatus) {
      const { error } = await directDb
        .from('beds')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', bed.id);
      if (!error) updated += 1;
    }
  }
  return { updated, occupied: occupied.size, reserved: reserved.size, available: Math.max(0, beds.length - occupied.size - reserved.size) };
}

function nextDate(day) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function syncWorkflow(req, db) {
  const directDb = adminSupabase || db;
  const propertyId = req.propertyId || 'postova-3';
  const { data: bookings, error } = await directDb.from('bookings').select('id').eq('property_id', propertyId);
  if (error) throw error;
  const syncedBookings = [];
  for (const booking of bookings || []) {
    const synced = await recomputeBookingWorkflow(req, directDb, booking.id, { skipBedRecompute: true });
    if (synced) syncedBookings.push(synced.id);
    await syncBookingPaymentTotals(req, directDb, booking.id).catch(() => null);
  }
  const beds = await recomputeBedInventory(req, directDb);
  return { property_id: propertyId, bookings_synced: syncedBookings.length, beds };
}

function stripTransientFields(table, payload) {
  const out = { ...payload };
  if (table === 'checkin_persons') {
    // Frontend-only fields used only for API validation. They do not exist
    // in the Supabase checkin_persons table and must not be inserted/updated.
    delete out.booking_capacity;
    delete out.requested_beds;
    delete out.beds_count;
    delete out.reserved_beds;
  }
  if (table === 'documents') {
    delete out._ocr_base64;
    delete out.ocr_result;
  }
  if (table === 'payments') {
    // Payment form uses reservation-derived display fields. Keep only columns that exist in payments.
    delete out.booking;
    delete out.company;
    delete out.reservation;
    delete out.reserved_beds;
    delete out.beds_count;
    delete out.booking_capacity;
  }
  return out;
}

app.get('/api', (_req, res) => res.json({ success: true, name: 'StayHub API v6.1 Workflow Sync Engine' }));
app.get('/api/health', (_req, res) => res.json({
  success: true,
  status: 'OK',
  supabaseConfigured: Boolean(supabaseUrl && anonKey),
  serviceRoleConfigured: Boolean(adminSupabase)
}));
app.get('/api/auth/status', (_req, res) => {
  const hasSupabaseUrl = Boolean(supabaseUrl);
  const hasAnonKey = Boolean(anonKey);
  const hasRedirectUrl = Boolean(process.env.AUTH_REDIRECT_URL);
  const inviteReady = Boolean(adminSupabase && hasSupabaseUrl && hasAnonKey);
  let message = 'Pozvánky sú pripravené.';
  if (!hasSupabaseUrl) message = 'Chýba SUPABASE_URL alebo VITE_SUPABASE_URL vo Verceli.';
  else if (!hasAnonKey) message = 'Chýba SUPABASE_ANON_KEY alebo VITE_SUPABASE_ANON_KEY vo Verceli.';
  else if (!hasServiceRoleKey) message = 'Chýba serverový SUPABASE_SERVICE_ROLE_KEY. Nepoužívaj VITE_SUPABASE_ANON_KEY ani publishable key.';
  else if (!hasRedirectUrl) message = 'AUTH_REDIRECT_URL nie je nastavený. Pozvánky môžu fungovať, ale odporúčame ho doplniť.';
  res.json({ success: true, data: { hasSupabaseUrl, hasAnonKey, hasServiceRoleKey, hasRedirectUrl, inviteReady, message } });
});

app.use('/api', authenticateRequest);

app.get('/api/me', (req, res) => {
  res.json({ success: true, data: { ...req.profile, active_property_id: req.propertyId } });
});

app.get('/api/stats', async (req, res) => {
  if (!requireSupabase(req, res)) return;
  try {
    const db = req.supabase;
    const [{ data: rooms, error: re }, { data: bookings, error: be }, { data: payments, error: pe }, { data: people, error: ce }] = await Promise.all([
      scopedQuery(req, 'rooms', db.from('rooms').select('id,capacity')),
      scopedQuery(req, 'bookings', db.from('bookings').select('*')),
      scopedQuery(req, 'payments', db.from('payments').select('*')),
      scopedQuery(req, 'checkin_persons', db.from('checkin_persons').select('*'))
    ]);
    if (re) throw re; if (be) throw be; if (pe) throw pe; if (ce) throw ce;
    const today = new Date().toISOString().slice(0, 10);
    const activeBookings = (bookings || []).filter(b => !cancelled.has(b.status));
    const currentBookings = activeBookings.filter(b => b.check_in_date <= today && b.check_out_date > today);
    const reservedBedsNow = currentBookings.reduce((s, b) => s + normalizeBeds(b).length, 0);
    const checkedInNow = (people || []).filter(p => p.status === 'checked_in').length;
    const paidPayments = (payments || []).filter(p => paid.has(p.status));
    const pending = (payments || []).filter(p => !paid.has(p.status));
    const overdue = pending.filter(p => p.due_date && p.due_date < today);
    res.json({ success: true, data: {
      total_rooms: rooms?.length || 0,
      total_capacity: (rooms || []).reduce((s, r) => s + Number(r.capacity || 0), 0),
      reserved_beds_now: reservedBedsNow,
      checked_in_now: checkedInNow,
      unpaid_payments: pending.length,
      overdue_payments: overdue.length,
      total_revenue: paidPayments.reduce((s, p) => s + Number(p.amount || 0), 0)
    }});
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/availability', async (req, res) => {
  if (!requireSupabase(req, res)) return;
  const { check_in_date, check_out_date, exclude_id } = req.query;
  if (!check_in_date || !check_out_date) return res.status(400).json({ success: false, error: 'Chýba termín.' });
  try {
    const db = req.supabase;
    const [{ data: rooms, error: re }, { data: bookings, error: be }, { data: people, error: pe }] = await Promise.all([
      scopedQuery(req, 'rooms', db.from('rooms').select('*')).order('room_number', { ascending: true }),
      scopedQuery(req, 'bookings', db.from('bookings').select('*')),
      scopedQuery(req, 'checkin_persons', db.from('checkin_persons').select('*'))
    ]);
    if (re) throw re; if (be) throw be; if (pe) throw pe;
    const used = new Set();

    // 1) Remaining reserved beds block the period.
    (bookings || [])
      .filter(b => String(b.id) !== String(exclude_id || '') && !cancelled.has(b.status) && canonicalOperationalStatus(b.status) !== 'checked_out' && overlaps(check_in_date, check_out_date, b.check_in_date, b.check_out_date))
      .forEach(b => normalizeBeds(b).forEach(x => used.add(`${x.room_id}:${x.bed_code}`)));

    // 2) Physically checked-in guests also block their bed until checkout/expected checkout.
    (people || [])
      .filter(p => String(p.booking_id || '') !== String(exclude_id || '') && checkedInPersonOverlaps(p, check_in_date, check_out_date))
      .forEach(p => used.add(`${p.room_id}:${p.bed_code}`));

    const availability = (rooms || []).map(r => {
      const cap = Number(r.capacity || 3);
      const beds = Array.from({ length: cap }, (_, i) => String(i + 1)).map(code => ({
        room_id: r.id,
        room_number: r.room_number,
        room_label: `P${String(r.room_number).padStart(3, '0')}`,
        bed_code: code,
        is_free: !used.has(`${r.id}:${code}`)
      }));
      return { ...r, room_label: `P${String(r.room_number).padStart(3, '0')}`, beds, free_count: beds.filter(b => b.is_free).length };
    });
    res.json({ success: true, data: availability, total_free: availability.reduce((s, r) => s + r.free_count, 0) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});


app.post('/api/auth/invite-user', async (req, res) => {
  if (!requireRoles(req, res, ['admin'])) return;
  const { email, full_name, role = 'reception', property_id = 'postova-3', redirect_to } = req.body || {};
  if (!email) return res.status(400).json({ success: false, error: 'Chýba email používateľa.' });
  if (!adminSupabase) {
    return res.status(500).json({
      success: false,
      error: 'Pozvánky nie sú nakonfigurované. Vo Verceli nastav SUPABASE_SERVICE_ROLE_KEY, nie anon/publishable key, a sprav redeploy.'
    });
  }
  const allowed = new Set(['admin', 'manager', 'reception', 'accounting', 'housekeeping', 'viewer']);
  const safeRole = allowed.has(role) ? role : 'reception';
  try {
    const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirect_to || process.env.AUTH_REDIRECT_URL || undefined,
      data: { full_name: full_name || '', role: safeRole, property_id }
    });
    if (error) {
      if (String(error.message || '').toLowerCase().includes('user not allowed')) {
        return res.status(403).json({
          success: false,
          error: 'User not allowed: Supabase odmietol admin invite. Skontroluj, že SUPABASE_SERVICE_ROLE_KEY je skutočný service_role key a po zmene bol projekt redeploynutý.'
        });
      }
      throw error;
    }
    const invitedUser = data?.user || null;
    if (!invitedUser?.id) throw new Error('Supabase nevrátil ID pozvaného používateľa.');
    const profile = {
      id: invitedUser.id,
      email,
      full_name: full_name || null,
      role: safeRole,
      property_id: property_id || 'postova-3',
      is_active: true,
      invited_at: new Date().toISOString()
    };
    const { data: savedProfile, error: pe } = await adminSupabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select('*')
      .single();
    if (pe) throw pe;
    res.status(201).json({ success: true, data: savedProfile, invited: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/profiles/:id/role', async (req, res) => {
  if (!requireSupabase(req, res)) return;
  if (!requireRoles(req, res, ['admin'])) return;
  const { role, property_id, is_active, full_name } = req.body || {};
  const allowed = new Set(['admin', 'manager', 'reception', 'accounting', 'housekeeping', 'viewer']);
  const payload = { updated_at: new Date().toISOString() };
  if (role) payload.role = allowed.has(role) ? role : 'reception';
  if (property_id !== undefined) payload.property_id = property_id;
  if (is_active !== undefined) payload.is_active = Boolean(is_active);
  if (full_name !== undefined) payload.full_name = full_name;
  try {
    const db = adminSupabase || req.supabase;
    const { data, error } = await db.from('profiles').update(payload).eq('id', req.params.id).select('*').single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});


app.post('/api/auth/create-user', async (req, res) => {
  if (!requireRoles(req, res, ['admin'])) return;
  const { email, password, full_name, role = 'reception', property_id = 'postova-3', is_active = true } = req.body || {};
  if (!email) return res.status(400).json({ success: false, error: 'Chýba email používateľa.' });
  if (!password || String(password).length < 6) return res.status(400).json({ success: false, error: 'Heslo musí mať aspoň 6 znakov.' });
  if (!adminSupabase) return res.status(500).json({ success: false, error: 'Vytvorenie používateľa vyžaduje SUPABASE_SERVICE_ROLE_KEY vo Verceli.' });

  const allowed = new Set(['admin', 'manager', 'reception', 'accounting', 'housekeeping', 'viewer']);
  const safeRole = allowed.has(role) ? role : 'reception';

  try {
    const { data, error } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || '', role: safeRole, property_id: property_id || 'postova-3' }
    });
    if (error) throw error;
    const createdUser = data?.user;
    if (!createdUser?.id) throw new Error('Supabase nevrátil ID vytvoreného používateľa.');

    const profile = {
      id: createdUser.id,
      email,
      full_name: full_name || null,
      role: safeRole,
      property_id: property_id || 'postova-3',
      is_active: is_active !== false,
      updated_at: new Date().toISOString()
    };

    const { data: savedProfile, error: pe } = await adminSupabase
      .from('profiles')
      .upsert(profile, { onConflict: 'id' })
      .select('*')
      .single();
    if (pe) throw pe;

    res.status(201).json({ success: true, data: savedProfile, created: true });
  } catch (err) {
    const msg = String(err.message || '');
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
      return res.status(409).json({ success: false, error: 'Používateľ s týmto emailom už existuje.' });
    }
    res.status(500).json({ success: false, error: msg });
  }
});

app.put('/api/auth/users/:id/password', async (req, res) => {
  if (!requireRoles(req, res, ['admin'])) return;
  const { password } = req.body || {};
  if (!password || String(password).length < 6) return res.status(400).json({ success: false, error: 'Heslo musí mať aspoň 6 znakov.' });
  if (!adminSupabase) return res.status(500).json({ success: false, error: 'Zmena hesla vyžaduje SUPABASE_SERVICE_ROLE_KEY.' });
  try {
    const { data, error } = await adminSupabase.auth.admin.updateUserById(req.params.id, { password });
    if (error) throw error;
    res.json({ success: true, data: { id: data?.user?.id, email: data?.user?.email } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/auth/users/:id', async (req, res) => {
  if (!requireRoles(req, res, ['admin'])) return;
  if (!adminSupabase) return res.status(500).json({ success: false, error: 'Vymazanie používateľa vyžaduje SUPABASE_SERVICE_ROLE_KEY.' });
  try {
    await adminSupabase.from('profiles').delete().eq('id', req.params.id);
    const { error } = await adminSupabase.auth.admin.deleteUser(req.params.id);
    if (error) throw error;
    res.json({ success: true, data: { id: req.params.id } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});



app.post('/api/admin/factory-reset', async (req, res) => {
  if (!requireRoles(req, res, ['admin'])) return;
  const { confirm } = req.body || {};
  if (confirm !== 'RESET') return res.status(400).json({ success: false, error: 'Pre potvrdenie napíšte RESET.' });
  if (!adminSupabase) return res.status(500).json({ success: false, error: 'Factory Reset vyžaduje SUPABASE_SERVICE_ROLE_KEY.' });
  try {
    const db = adminSupabase;
    const propertyId = req.propertyId || 'postova-3';
    for (const table of ['documents','checkin_persons','payments','bookings']) {
      const { error } = await db.from(table).delete().eq('property_id', propertyId);
      if (error) throw error;
    }
    try { await db.from('rooms').update({ occupied_beds: 0, status: 'Voľná', updated_at: new Date().toISOString() }).eq('property_id', propertyId); } catch {}
    res.json({ success: true, data: { property_id: propertyId, reset: true } });
  } catch (err) { res.status(500).json({ success: false, error: err.message || 'Factory Reset zlyhal.' }); }
});



app.post('/api/documents/ocr', async (req, res) => {
  // v6.4.8: AI OCR vypnute (doklady sa neposielaju do OpenAI). Doklad sa len uklada, udaje sa vyplnaju rucne.
  return res.status(410).json({ success: false, error: 'AI OCR je vypnute. Doklad sa ulozi a udaje vypln rucne.' });
});

app.post('/api/documents/upload', async (req, res) => {
  if (!requireSupabase(req, res)) return;
  if (!canUseTable(req.role, 'documents', 'write')) return res.status(403).json({ success: false, error: 'Na nahratie dokumentu nemáš oprávnenie.' });
  if (!adminSupabase) return res.status(500).json({ success: false, error: 'Chýba SUPABASE_SERVICE_ROLE_KEY pre bezpečný upload do Storage.' });
  try {
    const { filename, mime_type, base64, document_type, person_id, company_id } = req.body || {};
    if (!base64) return res.status(400).json({ success: false, error: 'Chýba obsah súboru.' });
    const rawBase64 = String(base64).includes(',') ? String(base64).split(',').pop() : String(base64);
    const buffer = Buffer.from(rawBase64, 'base64');
    if (!buffer.length) return res.status(400).json({ success: false, error: 'Súbor je prázdny.' });
    if (buffer.length > 8 * 1024 * 1024) return res.status(413).json({ success: false, error: 'Súbor je príliš veľký. Maximum je 8 MB.' });

    const path = buildDocumentStoragePath({
      propertyId: req.propertyId,
      company_id,
      person_id,
      document_type,
      filename,
      mime_type
    });

    const { error: uploadError } = await adminSupabase.storage
      .from(DOCUMENT_BUCKET)
      .upload(path, buffer, { contentType: mime_type || 'application/octet-stream', upsert: false });
    if (uploadError) throw uploadError;

    const { data: signed, error: signedError } = await adminSupabase.storage
      .from(DOCUMENT_BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signedError) throw signedError;

    res.json({ success: true, data: { bucket: DOCUMENT_BUCKET, storage_path: path, file_url: signed?.signedUrl || null, mime_type: mime_type || null, size_bytes: buffer.length } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post('/api/workflow/sync', async (req, res) => {
  if (!requireSupabase(req, res)) return;
  if (!['admin','manager','reception','accounting','housekeeping'].includes(req.role)) {
    return res.status(403).json({ success: false, error: 'Na synchronizáciu workflow nemáš oprávnenie.' });
  }
  try {
    const result = await syncWorkflow(req, adminSupabase || req.supabase);
    await writeAudit(req, 'bookings', 'workflow_sync', null, null, result);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/:table', async (req, res) => {
  if (!requireSupabase(req, res)) return;
  const table = TABLES[req.params.table];
  if (!table) return res.status(404).json({ success: false, error: 'Neznáma tabuľka' });
  if (!canUseTable(req.role, table, 'read')) return res.status(403).json({ success: false, error: 'Na túto tabuľku nemáš oprávnenie.' });
  try {
    const db = req.supabase;
    const [col, asc] = orderBy(table);
    const { data, error } = await scopedQuery(req, table, db.from(table).select('*')).order(col, { ascending: asc });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

async function validateBookingBeds(req, db, payload, excludeId) {
  const beds = normalizeBeds(payload);
  if (!payload.check_in_date || !payload.check_out_date || beds.length === 0) return null;
  const [{ data: bookings, error: bookingError }, { data: people, error: peopleError }] = await Promise.all([
    scopedQuery(req, 'bookings', db.from('bookings').select('*')),
    scopedQuery(req, 'checkin_persons', db.from('checkin_persons').select('*'))
  ]);
  if (bookingError) throw bookingError;
  if (peopleError) throw peopleError;
  const wanted = new Set(beds.map(b => `${b.room_id}:${b.bed_code}`));
  const conflicts = [];

  (bookings || [])
    .filter(b => String(b.id) !== String(excludeId || '') && !cancelled.has(b.status) && canonicalOperationalStatus(b.status) !== 'checked_out' && overlaps(payload.check_in_date, payload.check_out_date, b.check_in_date, b.check_out_date))
    .forEach(b => {
      normalizeBeds(b).forEach(x => {
        if (wanted.has(`${x.room_id}:${x.bed_code}`)) conflicts.push({ type: 'reserved', booking: b, room_id: x.room_id, bed_code: x.bed_code });
      });
    });

  (people || [])
    .filter(p => String(p.booking_id || '') !== String(excludeId || '') && checkedInPersonOverlaps(p, payload.check_in_date, payload.check_out_date))
    .forEach(p => {
      if (wanted.has(`${p.room_id}:${p.bed_code}`)) conflicts.push({ type: 'occupied', person: p, room_id: p.room_id, bed_code: p.bed_code });
    });

  return conflicts.length ? conflicts : null;
}


async function validateCheckinPerson(req, db, payload, existingId = null) {
  if (!payload.booking_id) throw new Error('Check-in musí byť priradený k rezervácii.');

  const bookingRef = String(payload.booking_id);
  const bookingColumn = looksLikeUuid(bookingRef) ? 'id' : 'booking_code';

  let { data: bookingRows, error: bookingError } = await db
    .from('bookings')
    .select('*')
    .eq(bookingColumn, bookingRef)
    .limit(1);

  if (!bookingError && (!bookingRows || bookingRows.length === 0) && bookingColumn === 'id') {
    const fallback = await db
      .from('bookings')
      .select('*')
      .eq('booking_code', bookingRef)
      .limit(1);
    bookingRows = fallback.data;
    bookingError = fallback.error;
  }

  if (bookingError) throw bookingError;

  // If RLS or older data prevents reading the full booking row, never fall back to capacity 1
  // when the frontend sends known booking capacity.
  const payloadCapacity = Number(
    payload.booking_capacity ||
    payload.requested_beds ||
    payload.beds_count ||
    0
  );

  const booking = bookingRows?.[0] || (looksLikeUuid(bookingRef) ? {
    id: bookingRef,
    property_id: req.propertyId,
    requested_beds: payloadCapacity || 1,
    beds_count: payloadCapacity || 1,
    reserved_beds: payload.reserved_beds || [{ room_id: payload.room_id, bed_code: String(payload.bed_code) }]
  } : null);

  if (!booking || (booking.property_id && booking.property_id !== req.propertyId)) {
    throw new Error(`Rezervacia pre check-in sa nenasla v aktualnom objekte. ref=${bookingRef}; property=${req.propertyId}`);
  }

  payload.booking_id = booking.id;

  // v3.24: Check-in/check-out date boundaries.
  // Check-in is not allowed before the first reservation day.
  // Check-out is not allowed after the last reservation day.
  validateStayDatesAgainstBooking(payload, booking);

  const beds = normalizeBeds(booking);
  const requestedCapacity = Number(
    booking.requested_beds ||
    booking.beds_count ||
    payloadCapacity ||
    0
  );

  const { data: activePeople, error: peopleError } = await scopedQuery(req, 'checkin_persons', db
    .from('checkin_persons')
    .select('*')
  )
    .eq('booking_id', payload.booking_id)
    .eq('status', 'checked_in');

  if (peopleError) throw peopleError;

  const existingActiveCount = new Set((activePeople || []).map(p => `${String(p.room_id)}:${String(p.bed_code)}`)).size;

  // Final capacity must never shrink to 1 for legacy/group bookings.
  const capacity = Math.max(
    beds.length,
    requestedCapacity,
    payloadCapacity,
    existingActiveCount,
    1
  );

  if (capacity <= 0) {
    throw new Error('Rezervácia nemá pridelené lôžka. Najprv prideľ lôžka v rezervácii.');
  }

  const bedKey = `${String(payload.room_id)}:${String(payload.bed_code)}`;
  const reservedBedKeys = new Set(beds.map(b => `${String(b.room_id)}:${String(b.bed_code)}`));
  const existingBedKeys = new Set((activePeople || []).map(p => `${String(p.room_id)}:${String(p.bed_code)}`));

  // Strict bed validation only when reserved_beds is complete.
  // If reserved_beds is incomplete but requested_beds says capacity is larger, allow
  // existing checked-in beds and submitted beds while still enforcing capacity.
  const reservedIncomplete = beds.length < capacity;
  if (!reservedBedKeys.has(bedKey) && !reservedIncomplete && !existingBedKeys.has(bedKey)) {
    throw new Error('Toto lôžko nepatrí do vybranej rezervácie.');
  }

  const sameBed = (activePeople || []).find(p =>
    String(p.id) !== String(existingId || '') &&
    String(p.room_id) === String(payload.room_id) &&
    String(p.bed_code) === String(payload.bed_code)
  );

  if (sameBed) {
    return { mode: 'updateExistingBed', existing: sameBed, booking, capacity };
  }

  const uniqueBeds = new Set((activePeople || [])
    .filter(p => String(p.id) !== String(existingId || ''))
    .map(p => `${String(p.room_id)}:${String(p.bed_code)}`));

  uniqueBeds.add(bedKey);

  if (uniqueBeds.size > capacity) {
    throw new Error(`Počet check-in osôb prekračuje kapacitu rezervácie (${capacity}).`);
  }

  return { mode: 'insertOrUpdate', booking, capacity };
}

app.post('/api/:table', async (req, res) => {
  if (!requireSupabase(req, res)) return;
  const table = TABLES[req.params.table];
  if (!table) return res.status(404).json({ success: false, error: 'Neznáma tabuľka' });
  if (!canUseTable(req.role, table, 'write')) return res.status(403).json({ success: false, error: 'Na vytvorenie záznamu nemáš oprávnenie.' });
  try {
    const db = adminSupabase || req.supabase;
    let payload = withProperty(req, table, cleanPayload(table, { ...req.body }));
    if (table === 'bookings') {
      if (!payload.booking_code) payload.booking_code = `R${Date.now()}`;
      if (!payload.guest_name) payload.guest_name = payload.company_name || payload.contact_person || 'Rezervácia';
      if (!payload.requested_beds) payload.requested_beds = normalizeBeds(payload).length || 1;
      Object.assign(payload, await calculateBookingPricing(db, payload));
      if (cancelledStatus.has(payload.status)) {
        payload.cancelled_at = payload.cancelled_at || new Date().toISOString();
        payload.cancellation_fee = cancellationFee(payload);
      }
      const conflicts = await validateBookingBeds(req, db, payload);
      if (conflicts) return res.status(409).json({ success: false, error: 'KONFLIKT DÁTUMOV: niektoré pridelené lôžko je v tomto termíne už rezervované.', conflicts });
    }
    if (table === 'payments') {
      if (!payload.payment_code) payload.payment_code = `P${Date.now()}`;
      if (!payload.invoice_number) payload.invoice_number = invoiceNumber('INV');
      if (!payload.variable_symbol) payload.variable_symbol = String(payload.payment_code || '').replace(/\D/g, '').slice(-10) || String(Date.now()).slice(-10);
      payload.currency = payload.currency || 'EUR';
    }
    if (table === 'checkin_persons') {
      const validation = await validateCheckinPerson(req, db, payload);
      if (validation.mode === 'updateExistingBed') {
        const { data, error } = await db
          .from(table)
          .update(stripTransientFields(table, { ...payload, updated_at: new Date().toISOString() }))
          .eq('id', validation.existing.id)
          .select('*')
          .single();
        if (error) throw error;
        const syncedBooking = await syncBookingAfterPersonChange(req, db, data);
        await syncWorkflow(req, db).catch(() => null);
        await writeAudit(req, table, 'deduplicate_update', data?.id, validation.existing, data);
        return res.status(200).json({ success: true, data, booking: syncedBooking, deduplicated: true });
      }
    }
    payload = stripTransientFields(table, payload);

    let insertedRows, error;
    if (table === 'payments') {
      const directDb = adminSupabase || db;
      if (req.propertyId && !payload.property_id) payload.property_id = req.propertyId;
      const result = await directDb.from(table).insert(payload).select('*');
      insertedRows = result.data;
      error = result.error;
    } else {
      const result = await db.from(table).insert(payload).select('*');
      insertedRows = result.data;
      error = result.error;
    }
    if (error) throw error;
    const data = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;
    if (!data) throw new Error('Zaznam sa vytvoril bez navratovych dat. Skontroluj Supabase RLS/select policy pre tuto tabulku.');
    let syncedBooking = null;
    if (table === 'checkin_persons') { syncedBooking = await syncBookingAfterPersonChange(req, db, data); await syncWorkflow(req, db).catch(() => null); }
    if (table === 'payments') { syncedBooking = await syncBookingPaymentTotals(req, db, data.booking_id); await syncWorkflow(req, db).catch(() => null); }
    await writeAudit(req, table, 'create', data?.id, null, data);
    res.status(201).json({ success: true, data, booking: syncedBooking });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.put('/api/:table/:id', async (req, res) => {
  if (!requireSupabase(req, res)) return;
  const table = TABLES[req.params.table];
  if (!table) return res.status(404).json({ success: false, error: 'Neznáma tabuľka' });
  if (!canUseTable(req.role, table, 'write')) return res.status(403).json({ success: false, error: 'Na úpravu záznamu nemáš oprávnenie.' });
  try {
    const db = adminSupabase || req.supabase;
    const { data: oldData } = await scopedQuery(req, table, db.from(table).select('*')).eq('id', req.params.id).maybeSingle();
    let payload = withProperty(req, table, cleanPayload(table, { ...req.body, updated_at: new Date().toISOString() }));
    if (table === 'bookings') {
      Object.assign(payload, await calculateBookingPricing(db, payload));
      if (cancelledStatus.has(payload.status)) {
        payload.cancelled_at = payload.cancelled_at || new Date().toISOString();
        payload.cancellation_fee = cancellationFee(payload);
      }
      const conflicts = await validateBookingBeds(req, db, payload, req.params.id);
      if (conflicts) return res.status(409).json({ success: false, error: 'KONFLIKT DÁTUMOV: niektoré pridelené lôžko je v tomto termíne už rezervované.', conflicts });
    }
    if (table === 'checkin_persons') {
      await validateCheckinPerson(req, db, payload, req.params.id);
      payload = stripTransientFields(table, payload);
    }
    if (table === 'payments') {
      payload = stripTransientFields(table, payload);

      // Payments fix v3.23:
      // Use a verified direct update. Do not return success unless DB row is really changed.
      const directDb = adminSupabase || db;
      if (req.propertyId && !payload.property_id) payload.property_id = req.propertyId;

      const paidStatuses = new Set(['Zaplatené','paid','Đã thanh toán','Da thanh toan']);
      const isPaidPayload = paidStatuses.has(payload.status);
      if (isPaidPayload) {
        payload.status = 'Zaplatené';
        payload.paid_date = payload.paid_date || new Date().toISOString().slice(0, 10);
        payload.paid_at = payload.paid_at || new Date().toISOString();
      }

      const updatePayload = {
        ...payload,
        updated_at: new Date().toISOString()
      };

      // First try stable id.
      let updateResult = await directDb
        .from(table)
        .update(updatePayload)
        .eq('id', req.params.id);

      if (updateResult.error) throw updateResult.error;

      // Verify by id.
      let verify = await directDb
        .from(table)
        .select('*')
        .eq('id', req.params.id)
        .maybeSingle();

      if (verify.error) throw verify.error;

      let data = verify.data;

      // If id is stale but payment_code exists, update and verify by payment_code.
      if ((!data || (payload.status && data.status !== payload.status)) && payload.payment_code) {
        updateResult = await directDb
          .from(table)
          .update(updatePayload)
          .eq('payment_code', payload.payment_code);

        if (updateResult.error) throw updateResult.error;

        verify = await directDb
          .from(table)
          .select('*')
          .eq('payment_code', payload.payment_code)
          .maybeSingle();

        if (verify.error) throw verify.error;
        data = verify.data;
      }

      if (!data) {
        throw new Error('Platbu sa nepodarilo nájsť po update. Skontroluj id/payment_code platby.');
      }

      if (payload.status && data.status !== payload.status) {
        throw new Error(`Platba sa našla, ale status sa nezmenil. DB status=${data.status}, očakávané=${payload.status}. Skontroluj trigger alebo RLS na payments.`);
      }

      await writeAudit(req, table, 'update_verified', data.id || req.params.id, oldData, data);
      return res.json({ success: true, data });
    }
    let { data: updatedRows, error } = await scopedQuery(req, table, db.from(table).update(payload).eq('id', req.params.id)).select('*');
    if (error) throw error;
    let data = Array.isArray(updatedRows) ? updatedRows[0] : updatedRows;

    // Robust fallback for production: some Supabase RLS/select policies or property_id
    // mismatches may allow the update but return no row. Do not break check-in flow.
    // For operational tables we return a safe local object and write audit if possible.
    if (!data && (table === 'bookings' || table === 'checkin_persons' || table === 'payments')) {
      if (adminSupabase) {
        const fallback = await adminSupabase
          .from(table)
          .update(payload)
          .eq('id', req.params.id)
          .select('*');
        if (fallback.error) throw fallback.error;
        data = Array.isArray(fallback.data) ? fallback.data[0] : fallback.data;
      }
      if (!data) {
        data = { ...(oldData || {}), ...payload, id: req.params.id };
        const syncedBooking = table === 'checkin_persons' ? await syncBookingAfterPersonChange(req, db, data) : null;
        await writeAudit(req, table, 'update_fallback', req.params.id, oldData, data);
        return res.json({ success: true, data, booking: syncedBooking, warning: 'Update nevratil data zo Supabase, použitý fallback.' });
      }
    }

    if (!data) {
      const fallbackData = oldData ? { ...oldData, ...payload, id: req.params.id } : null;
      if (!fallbackData) throw new Error('Zaznam sa nepodarilo aktualizovat alebo vratit zo Supabase.');
      let syncedBooking = null;
      if (table === 'checkin_persons') syncedBooking = await syncBookingAfterPersonChange(req, db, fallbackData);
      await writeAudit(req, table, 'update', req.params.id, oldData, fallbackData);
      return res.json({ success: true, data: fallbackData, booking: syncedBooking, warning: 'Update nevratil data zo Supabase.' });
    }
    let syncedBooking = null;
    if (table === 'checkin_persons') { syncedBooking = await syncBookingAfterPersonChange(req, db, data); await syncWorkflow(req, db).catch(() => null); }
    if (table === 'payments') { syncedBooking = await syncBookingPaymentTotals(req, db, data.booking_id || oldData?.booking_id); await syncWorkflow(req, db).catch(() => null); }
    await writeAudit(req, table, 'update', req.params.id, oldData, data);
    res.json({ success: true, data, booking: syncedBooking });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.delete('/api/:table/:id', async (req, res) => {
  if (!requireSupabase(req, res)) return;
  const table = TABLES[req.params.table];
  if (!table) return res.status(404).json({ success: false, error: 'Neznáma tabuľka' });
  if (!canUseTable(req.role, table, 'delete')) return res.status(403).json({ success: false, error: 'Na vymazanie záznamu nemáš oprávnenie.' });
  try {
    const db = adminSupabase || req.supabase;
    // v6.4.7: nedovol zmazat rezervaciu, ktora ma ubytovanych hosti (inak by ostali osirene)
    if (table === 'bookings') {
      const { data: activeGuests } = await scopedQuery(req, 'checkin_persons', db.from('checkin_persons').select('id').eq('booking_id', req.params.id).eq('status', 'checked_in')).limit(1);
      if (activeGuests && activeGuests.length) {
        return res.status(409).json({ success: false, error: 'Rezervaciu nemozno zmazat - ma ubytovanych hosti. Najprv ich odhlas (check-out).' });
      }
    }
    const { data: oldData } = await scopedQuery(req, table, db.from(table).select('*')).eq('id', req.params.id).maybeSingle();
    const { error } = await scopedQuery(req, table, db.from(table).delete().eq('id', req.params.id));
    if (error) throw error;
    await writeAudit(req, table, 'delete', req.params.id, oldData, null);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.use((_req, res) => res.status(404).json({ success: false, error: 'Endpoint neexistuje' }));
export default app;
