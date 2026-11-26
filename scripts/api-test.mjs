// End-to-end API security/flow test. Usage:
//   BASE_URL=http://localhost:4000 ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/api-test.mjs
const BASE = process.env.BASE_URL || 'http://localhost:4000';
let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { if (cond) { pass++; console.log(`  PASS  ${name}`); } else { fail++; console.log(`  FAIL  ${name} ${extra}`); } };

function client() {
  let cookie = '';
  return async (method, path, body, headers = {}) => {
    const r = await fetch(BASE + path, {
      method, headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...headers },
      body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
    });
    const sc = r.headers.get('set-cookie');
    if (sc) cookie = sc.split(';')[0];
    let data = null; const t = await r.text();
    try { data = JSON.parse(t); } catch { data = t; }
    return { status: r.status, data, headers: r.headers };
  };
}

const rnd = Math.random().toString(36).slice(2, 8);
const addr = { label: 'Home', name: 'Test User', phone: '9876543210', line1: '12 MG Road', city: 'Lucknow', pincode: '226026' };

const a = client(), b = client(), adm = client(), anon = client();

console.log('Auth');
let r = await a('POST', '/api/auth/register', { name: 'Alice', email: `alice_${rnd}@test.dev`, phone: '9876543211', password: 'Passw0rdA' });
check('register -> 201', r.status === 201, JSON.stringify(r.data));
check('httpOnly SameSite cookie set', /HttpOnly/i.test(r.headers.get('set-cookie') || '') && /SameSite=Strict/i.test(r.headers.get('set-cookie') || ''));
r = await a('POST', '/api/auth/register', { name: 'Alice', email: `weak_${rnd}@test.dev`, phone: '9876543211', password: 'weak' });
check('weak password rejected 400', r.status === 400);
r = await b('POST', '/api/auth/register', { name: 'Bob', email: `bob_${rnd}@test.dev`, phone: '9876543212', password: 'Passw0rdB' });
check('register bob', r.status === 201);
r = await anon('POST', '/api/auth/login', { email: `alice_${rnd}@test.dev`, password: 'WrongPass1' });
check('wrong password -> 401', r.status === 401 && !/stack/i.test(JSON.stringify(r.data)), JSON.stringify(r.data));
r = await anon('POST', '/api/auth/login', { email: { $gt: '' }, password: { $gt: '' } });
check('NoSQL operator injection on login rejected (400)', r.status === 400, r.status);
r = await a('POST', '/api/auth/login', { email: `alice_${rnd}@test.dev`, password: 'Passw0rdA' });
check('login -> 200', r.status === 200 && r.data.user?.role === 'user');
r = await a('GET', '/api/auth/me');
check('me returns alice', r.data.user?.email === `alice_${rnd}@test.dev`);

console.log('Products');
r = await anon('GET', '/api/products');
const products = r.data.products || [];
check('product list (>=60)', r.status === 200 && products.length >= 60, products.length);
const milk = products.find((p) => p.name.includes('Amul Taaza'));
const lowItem = products.find((p) => p.name.includes('Exo'));
check('Amul Taaza Milk is ₹28', milk?.price === 28);

console.log('Orders');
r = await anon('POST', '/api/orders', { items: [{ productId: milk.id, qty: 1 }], address: addr, paymentMethod: 'COD' });
check('guest cannot order (401)', r.status === 401);
r = await a('POST', '/api/orders', { items: [{ productId: milk.id, qty: 2, price: 1, total: 1 }], address: addr, paymentMethod: 'COD', total: 1, bill: { total: 1 } });
const orderA = r.data.order;
check('order placed 201', r.status === 201, JSON.stringify(r.data));
check('tampered price ignored: uses DB price ₹28', orderA?.items[0].price === 28 && orderA.bill.itemTotal === 56);
check('bill: delivery ₹25 (<199) + handling ₹4 => ₹85', orderA?.bill.total === 85, JSON.stringify(orderA?.bill));
r = await a('POST', '/api/orders', { items: [{ productId: lowItem.id, qty: lowItem.stock + 1 }], address: addr, paymentMethod: 'DEMO_UPI' });
check('overselling blocked (409)', r.status === 409, JSON.stringify(r.data));
r = await anon('GET', `/api/products/${lowItem.id}`);
check('stock unchanged after failed order', r.data.product.stock === lowItem.stock);
r = await a('POST', '/api/orders', { items: [{ productId: milk.id, qty: 1 }, { productId: lowItem.id, qty: 99 }], address: addr, paymentMethod: 'COD' });
check('qty > 20 rejected (400)', r.status === 400);
r = await a('GET', `/api/orders/${orderA.orderId}`);
check('owner can read own order', r.status === 200);
r = await b('GET', `/api/orders/${orderA.orderId}`);
check("other user cannot read alice's order (404)", r.status === 404 || r.status === 403, r.status);
r = await b('GET', '/api/orders');
check("bob's order list excludes alice's", r.status === 200 && !r.data.orders.some((o) => o.orderId === orderA.orderId));

console.log('Admin');
r = await a('GET', '/api/admin/stats');
check('non-admin blocked from admin (403)', r.status === 403);
r = await anon('GET', '/api/admin/orders');
check('anonymous blocked from admin (401)', r.status === 401);
r = await a('PATCH', `/api/admin/orders/${orderA.orderId}/status`, { status: 'DELIVERED' });
check('non-admin cannot update status (403)', r.status === 403);
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  r = await adm('POST', '/api/auth/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  check('admin login', r.status === 200 && r.data.user.role === 'admin');
  r = await adm('GET', '/api/admin/stats');
  check('admin stats', r.status === 200 && r.data.kpis.todayOrders >= 1);
  r = await adm('PATCH', `/api/admin/orders/${orderA.orderId}/status`, { status: 'OUT_FOR_DELIVERY' });
  check('admin status update', r.status === 200 && r.data.order.status === 'OUT_FOR_DELIVERY');
  r = await a('GET', `/api/orders/${orderA.orderId}`);
  check("status reflects on user's tracker", r.data.order.status === 'OUT_FOR_DELIVERY');
  r = await adm('GET', '/api/admin/orders.csv');
  check('CSV export', r.status === 200 && String(r.data).includes(orderA.orderId));
  r = await adm('PATCH', `/api/admin/products/${milk.id}`, { price: 30, stock: 'lots' });
  check('admin product patch validated (400)', r.status === 400);
  const bobId = (await adm('GET', `/api/admin/users?q=bob_${rnd}`)).data.items[0]?.id;
  r = await adm('PATCH', `/api/admin/users/${bobId}/block`, { blocked: true });
  check('admin blocks bob', r.status === 200 && r.data.user.blocked);
  r = await b('GET', '/api/orders');
  check('blocked user session rejected (401)', r.status === 401);
  await adm('PATCH', `/api/admin/users/${bobId}/block`, { blocked: false });
} else console.log('  SKIP  admin tests (set ADMIN_EMAIL/ADMIN_PASSWORD)');

console.log('Hardening');
r = await a('POST', '/api/auth/login', 'x'.repeat(30000));
check('body size limit (413)', r.status === 413, r.status);
r = await a('POST', '/api/orders', { items: [] }, { origin: 'https://evil.example' });
check('cross-origin POST blocked (403)', r.status === 403);
r = await anon('GET', '/api/products/not-an-id');
check('bad id -> 400 without stack', r.status === 400 && !JSON.stringify(r.data).includes('at '));
r = await anon('GET', '/');
check('security headers (CSP)', !!r.headers.get('content-security-policy'));

console.log('Rate limit');
let got429 = false;
for (let i = 0; i < 40 && !got429; i++) {
  r = await anon('POST', '/api/auth/login', { email: `nobody_${rnd}@test.dev`, password: 'Nope12345' });
  if (r.status === 429) got429 = true;
}
check('auth rate limit triggers 429', got429);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
