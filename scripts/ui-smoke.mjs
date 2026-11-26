// Optional headless UI smoke test (not part of the app). Requires: npm i -D playwright && npx playwright install chromium
// Usage: BASE_URL=http://localhost:4000 ADMIN_EMAIL=... ADMIN_PASSWORD=... OUT=/tmp/shots node scripts/ui-smoke.mjs
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://localhost:4100';
const out = process.env.OUT || '/tmp/shots';
const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const errors = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
await page.goto(BASE + '/');
await page.waitForSelector('canvas', { timeout: 30000 });
await page.waitForSelector('.loading', { state: 'detached', timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/01-desktop-help.png` });
await page.click('text=Start shopping');
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/02-desktop-store.png` });
// walk forward a bit
await page.keyboard.down('w'); await page.waitForTimeout(1200); await page.keyboard.up('w');
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/03-walked.png` });
// search + teleport
await page.fill('.search input', 'amul taaza');
await page.waitForTimeout(300);
await page.click('.sr-tp');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/04-teleport-card.png` });
const cardOpen = await page.isVisible('.product-card');
console.log('product card open after teleport:', cardOpen);
if (cardOpen) {
  await page.click('.product-card .btn.primary');
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${out}/05-flying.png` });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/06-in-cart.png` });
}
console.log('cart button:', await page.textContent('.cartbtn'));
// press E facing shelf
await page.keyboard.press('e');
await page.waitForTimeout(500);
console.log('E opens card:', await page.isVisible('.product-card'));
await page.keyboard.press('Escape');
// guide to another product (no teleport)
await page.fill('.search input', 'maggi');
await page.keyboard.press('Enter');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/07-guide.png` });
// fps estimate
const fps = await page.evaluate(() => new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else r(n / 2); }; requestAnimationFrame(f); }));
console.log('fps (software GL, headless):', fps);
// checkout panel
await page.click('.cartbtn');
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/08-checkout.png` });
await page.click('text=Log in to place order');
await page.waitForTimeout(400);
await page.click('text=Use demo account');
await page.click('form .btn.primary');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/09-checkout-loggedin.png` });
// fill address
const fill = async (label, v) => { const el = page.locator(`.checkout label:has-text("${label}") input`).first(); if (await el.count()) await el.fill(v); };
await fill('Mobile', '9876543210'); await fill('Pincode', '226026'); await fill('House / flat', '12 MG Road'); 
await page.click('text=Place order →');
await page.waitForTimeout(2000);
await page.screenshot({ path: `${out}/10-success.png` });
console.log('order success visible:', await page.isVisible('.success'));
await page.goto(BASE + '/orders');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/11-orders.png` });

// mobile
const m = await b.newContext({ viewport: { width: 375, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
const mp = await m.newPage();
mp.on('pageerror', (e) => errors.push(`[mobile pageerror] ${e.message}`));
mp.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[mobile error] ${msg.text()}`); });
await mp.goto(BASE + '/');
await mp.waitForSelector('.loading', { state: 'detached', timeout: 60000 });
await mp.waitForTimeout(1000);
await mp.screenshot({ path: `${out}/20-mobile-help.png` });
await mp.click('text=Start shopping');
await mp.waitForTimeout(500);
await mp.screenshot({ path: `${out}/21-mobile-store.png` });
const ov = async (p) => p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
console.log('mobile 3d overflow:', JSON.stringify(await ov(mp)));
// joystick drag
const js = await mp.$('.joystick');
console.log('joystick present:', !!js);
await mp.click('.toggle');
await mp.waitForTimeout(800);
await mp.screenshot({ path: `${out}/22-mobile-list.png`, fullPage: false });
console.log('mobile list overflow:', JSON.stringify(await ov(mp)));
await mp.click('.tile .btn.add');
await mp.click('.cartbtn');
await mp.waitForTimeout(600);
await mp.screenshot({ path: `${out}/23-mobile-checkout.png` });
console.log('mobile checkout overflow:', JSON.stringify(await ov(mp)));
// small tap targets audit
const small = await mp.evaluate(() => [...document.querySelectorAll('button, a, input, select')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 36 || r.width < 36); }).map((e) => `${e.tagName}.${e.className}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`).slice(0, 15));
console.log('small tap targets (<36px):', small);
await mp.keyboard.press('Escape');
await mp.goto(BASE + '/admin');
await mp.waitForTimeout(800);
await mp.screenshot({ path: `${out}/24-mobile-admin-guard.png` });

// admin desktop
const a = await b.newContext({ viewport: { width: 1280, height: 860 } });
const ap = await a.newPage();
ap.on('pageerror', (e) => errors.push(`[admin pageerror] ${e.message}`));
ap.on('console', (msg) => { if (msg.type() === 'error') errors.push(`[admin error] ${msg.text()}`); });
await ap.goto(BASE + '/admin');
await ap.waitForTimeout(800);
await ap.click('.btn.primary:has-text("Log in")');
await ap.fill('input[type=email]', process.env.ADMIN_EMAIL);
await ap.fill('input[type=password]', process.env.ADMIN_PASSWORD);
await ap.click('form .btn.primary');
await ap.waitForTimeout(2000);
await ap.screenshot({ path: `${out}/30-admin-dash.png`, fullPage: true });
await ap.click('text=Products');
await ap.waitForTimeout(1000);
await ap.screenshot({ path: `${out}/31-admin-products.png` });
await ap.click('text=Orders');
await ap.waitForTimeout(1000);
await ap.click('text=View');
await ap.waitForTimeout(800);
await ap.selectOption('.modal select', 'PACKED');
await ap.waitForTimeout(800);
await ap.screenshot({ path: `${out}/32-admin-order.png` });
await ap.setViewportSize({ width: 375, height: 800 });
await ap.keyboard.press('Escape');
await ap.waitForTimeout(500);
console.log('admin mobile overflow:', JSON.stringify(await ov(ap)));
await ap.screenshot({ path: `${out}/33-admin-mobile.png` });
await ap.click('text=Users').catch(() => ap.click('a[href="/admin/users"]'));
await ap.waitForTimeout(800);
console.log('admin users mobile overflow:', JSON.stringify(await ov(ap)));

console.log('\nCONSOLE ERRORS/WARNINGS:\n' + (errors.join('\n') || 'none'));
await b.close();
