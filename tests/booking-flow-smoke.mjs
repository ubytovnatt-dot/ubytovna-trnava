import { createClient } from '@supabase/supabase-js';

const API_URL = process.env.STAYHUB_API_URL || 'http://127.0.0.1:4174';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const TEST_EMAIL = process.env.STAYHUB_TEST_EMAIL;
const TEST_PASSWORD = process.env.STAYHUB_TEST_PASSWORD;
const PROPERTY_ID = process.env.STAYHUB_TEST_PROPERTY || 'postova-3';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !TEST_EMAIL || !TEST_PASSWORD) {
  console.error('Missing env: SUPABASE_URL/VITE_SUPABASE_URL, SUPABASE_ANON_KEY/VITE_SUPABASE_ANON_KEY, STAYHUB_TEST_EMAIL, STAYHUB_TEST_PASSWORD');
  process.exit(2);
}

const auth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const { data, error } = await auth.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
if (error || !data.session?.access_token) throw error || new Error('No Supabase session returned');

const token = data.session.access_token;
const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token}`,
  'X-Property-Id': PROPERTY_ID
};

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(`${options.method || 'GET'} ${path} failed ${res.status}: ${json.error || res.statusText}`);
  }
  return json.data ?? json;
}

const suffix = Date.now().toString().slice(-6);
const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const afterTomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
const cleanup = [];

try {
  const room = await api('/api/rooms', {
    method: 'POST',
    body: JSON.stringify({ room_number: Number(`9${suffix.slice(-3)}`), floor: 'TEST', capacity: 2, status: 'Voľná', price_daily: 20 })
  });
  cleanup.push(['/api/rooms', room.id]);

  const company = await api('/api/companies', {
    method: 'POST',
    body: JSON.stringify({ company_name: `Smoke Test ${suffix}`, email: `smoke-${suffix}@stayhub.test`, contract_status: 'active' })
  });
  cleanup.push(['/api/companies', company.id]);

  const booking = await api('/api/bookings', {
    method: 'POST',
    body: JSON.stringify({
      payer_type: 'company',
      company_id: company.id,
      company_name: company.company_name,
      contact_person: 'Smoke Tester',
      requested_beds: 1,
      check_in_date: tomorrow,
      check_out_date: afterTomorrow,
      status: 'Potvrdená',
      pricing_model: 'daily',
      discount_amount: 0,
      tax_rate: 0,
      reserved_beds: [{ room_id: room.id, room_number: room.room_number, room_label: `P${String(room.room_number).padStart(3, '0')}`, bed_code: '1' }]
    })
  });
  cleanup.push(['/api/bookings', booking.id]);
  if (Number(booking.total_price) <= 0) throw new Error('Booking total_price was not calculated');

  const person = await api('/api/checkin-persons', {
    method: 'POST',
    body: JSON.stringify({
      booking_id: booking.id,
      company_id: company.id,
      company_name: company.company_name,
      room_id: room.id,
      room_number: room.room_number,
      room_label: `P${String(room.room_number).padStart(3, '0')}`,
      bed_code: '1',
      first_name: 'Smoke',
      last_name: 'Guest',
      nationality: 'SK',
      status: 'checked_in',
      expected_checkout_date: afterTomorrow
    })
  });
  cleanup.push(['/api/checkin-persons', person.id]);

  const payment = await api('/api/payments', {
    method: 'POST',
    body: JSON.stringify({
      booking_id: booking.id,
      company_id: company.id,
      payer_type: 'company',
      payer_name: company.company_name,
      tenant_name: 'Smoke Guest',
      payment_month: tomorrow.slice(0, 7),
      amount: booking.total_price,
      due_date: tomorrow,
      status: 'Zaplatené'
    })
  });
  cleanup.push(['/api/payments', payment.id]);
  if (!payment.invoice_number) throw new Error('Payment invoice_number was not generated');

  const checkedOut = await api(`/api/checkin-persons/${person.id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...person, status: 'checked_out', checkout_at: new Date().toISOString() })
  });
  if (checkedOut.status !== 'checked_out') throw new Error('Checkout did not persist');

  console.log(JSON.stringify({
    ok: true,
    property_id: PROPERTY_ID,
    booking_code: booking.booking_code,
    total_price: booking.total_price,
    invoice_number: payment.invoice_number
  }, null, 2));
} finally {
  for (const [path, id] of cleanup.reverse()) {
    try { await api(`${path}/${id}`, { method: 'DELETE' }); } catch {}
  }
}
