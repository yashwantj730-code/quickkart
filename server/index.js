import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { initDb } from './db/index.js';
import { createApp } from './app.js';
import { buildSeedProducts } from './seedData.js';

const ORDER_FLOW = ['PLACED', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];

async function seed(repo) {
  if ((await repo.products.count()) === 0) {
    await repo.products.insertMany(buildSeedProducts());
    console.log('[seed] products inserted');
  }
  // Demo shopper account (public on purpose; documented in README).
  if (!(await repo.users.findByEmail('demo@quickkart.dev'))) {
    await repo.users.create({ name: 'Demo Shopper', email: 'demo@quickkart.dev', phone: '9876543210', passwordHash: await bcrypt.hash('Demo@1234', 12), role: 'user' });
    console.log('[seed] demo user created');
  }
  // Admin from env only (never hard-coded).
  if (config.adminEmail && config.adminPassword) {
    const hash = await bcrypt.hash(config.adminPassword, 12);
    const existing = await repo.users.findByEmail(config.adminEmail);
    if (existing) await repo.users.update(existing.id, { passwordHash: hash, role: 'admin', blocked: false });
    else await repo.users.create({ name: 'QuickKart Admin', email: config.adminEmail, phone: '9000000000', passwordHash: hash, role: 'admin' });
    console.log('[seed] admin user upserted');
  } else {
    console.warn('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set - no admin account configured.');
  }
}

function startStatusTicker(repo) {
  const tl = config.statusTimeline;
  const due = { PACKED: tl.PACKED, OUT_FOR_DELIVERY: tl.OUT_FOR_DELIVERY, DELIVERED: tl.DELIVERED };
  setInterval(async () => {
    try {
      const active = await repo.orders.activeAuto();
      const t = Date.now();
      for (const o of active) {
        const age = t - new Date(o.createdAt).getTime();
        let idx = ORDER_FLOW.indexOf(o.status);
        let target = idx;
        for (let i = idx + 1; i < ORDER_FLOW.length; i++) if (age >= due[ORDER_FLOW[i]]) target = i;
        if (target > idx) {
          const status = ORDER_FLOW[target];
          await repo.orders.update(o.orderId, { status }, { status, at: new Date() });
        }
      }
    } catch (e) { console.error('[ticker]', e.message); }
  }, 10_000).unref();
}

const repo = await initDb();
await seed(repo);
startStatusTicker(repo);
createApp().listen(config.port, () => console.log(`[server] QuickKart listening on :${config.port}`));
