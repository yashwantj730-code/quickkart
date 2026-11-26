import { Router } from 'express';
import { z } from 'zod';
import { repo } from '../db/index.js';
import { ah, publicUser } from '../lib/http.js';
import { STATUSES } from '../lib/bill.js';
import { validate, objectId, pageQuery } from '../middleware/validate.js';
import { requireAdmin } from '../middleware/auth.js';
import { CATEGORIES } from '../seedData.js';

export const adminRouter = Router();
adminRouter.use(requireAdmin);

const LOW_STOCK = 10;
const catIds = CATEGORIES.map((c) => c.id);

adminRouter.get('/stats', ah(async (_req, res) => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const weekStart = new Date(start); weekStart.setDate(weekStart.getDate() - 6);
  const [week, users, lowStock] = await Promise.all([repo.orders.since(weekStart), repo.users.count(), repo.products.countLowStock(LOW_STOCK)]);
  const valid = week.filter((o) => o.status !== 'CANCELLED');
  const today = valid.filter((o) => new Date(o.createdAt) >= start);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart); d.setDate(d.getDate() + i);
    const n = new Date(d); n.setDate(n.getDate() + 1);
    const os = valid.filter((o) => new Date(o.createdAt) >= d && new Date(o.createdAt) < n);
    days.push({ date: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-IN', { weekday: 'short' }), orders: os.length, revenue: os.reduce((s, o) => s + o.bill.total, 0) });
  }
  const byCat = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
  valid.forEach((o) => o.items.forEach((it) => { if (it.category in byCat) byCat[it.category] += it.price * it.qty; }));
  const statusCounts = Object.fromEntries(STATUSES.map((s) => [s, week.filter((o) => o.status === s).length]));
  res.json({
    kpis: { todayOrders: today.length, todayRevenue: today.reduce((s, o) => s + o.bill.total, 0), weekRevenue: valid.reduce((s, o) => s + o.bill.total, 0), users, lowStock },
    days,
    categories: CATEGORIES.map((c) => ({ id: c.id, name: c.name, sales: byCat[c.id] })),
    statusCounts,
  });
}));

// ---------- Products ----------
const productBody = z.object({
  name: z.string().trim().min(2).max(120),
  brand: z.string().trim().max(60).default(''),
  category: z.enum(catIds),
  unit: z.string().trim().max(40).default(''),
  price: z.number().min(0).max(100000),
  mrp: z.number().min(0).max(100000),
  stock: z.number().int().min(0).max(100000),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#22c55e'),
  shape: z.enum(['box', 'pack', 'bottle', 'can', 'jar', 'fruit', 'bag', 'tub']).default('box'),
  emoji: z.string().max(8).default('🛒'),
  aisle: z.string().trim().max(10).default(''),
  shelf: z.number().int().min(0).max(2).default(0),
  slot: z.number().int().min(0).max(200).default(0),
  active: z.boolean().default(true),
}).refine((p) => p.mrp >= p.price, { message: 'MRP must be >= price', path: ['mrp'] });

const productPatch = z.object({
  name: z.string().trim().min(2).max(120), brand: z.string().trim().max(60), category: z.enum(catIds),
  unit: z.string().trim().max(40), price: z.number().min(0).max(100000), mrp: z.number().min(0).max(100000),
  stock: z.number().int().min(0).max(100000), color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  shape: z.enum(['box', 'pack', 'bottle', 'can', 'jar', 'fruit', 'bag', 'tub']), emoji: z.string().max(8),
  aisle: z.string().trim().max(10), shelf: z.number().int().min(0).max(2), slot: z.number().int().min(0).max(200), active: z.boolean(),
}).partial().strict();

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

adminRouter.get('/products', validate(pageQuery.extend({
  category: z.string().max(40).optional(),
  status: z.enum(['active', 'inactive', 'low']).optional(),
}), 'query'), ah(async (req, res) => {
  const { page, limit, q, category, status } = req.valid.query;
  const r = await repo.products.list({ q, category, page, limit, active: status === 'active' ? true : status === 'inactive' ? false : undefined, lowStock: status === 'low' ? LOW_STOCK : undefined });
  res.json({ ...r, page, limit, lowStockThreshold: LOW_STOCK });
}));

adminRouter.post('/products', validate(productBody), ah(async (req, res) => {
  const b = req.valid.body;
  const p = await repo.products.create({ ...b, slug: `${slugify(`${b.brand}-${b.name}-${b.unit}`)}-${Date.now().toString(36)}` });
  res.status(201).json({ product: p });
}));

adminRouter.patch('/products/:id', validate(z.object({ id: objectId }), 'params'), validate(productPatch), ah(async (req, res) => {
  const cur = await repo.products.getById(req.valid.params.id);
  if (!cur) return res.status(404).json({ error: 'Product not found.' });
  const next = { ...cur, ...req.valid.body };
  if (next.mrp < next.price) return res.status(400).json({ error: 'Invalid input.', field: 'mrp', detail: 'MRP must be >= price' });
  const p = await repo.products.update(req.valid.params.id, req.valid.body);
  res.json({ product: p });
}));

adminRouter.delete('/products/:id', validate(z.object({ id: objectId }), 'params'), ah(async (req, res) => {
  const ok = await repo.products.remove(req.valid.params.id);
  if (!ok) return res.status(404).json({ error: 'Product not found.' });
  res.json({ ok: true });
}));

// ---------- Orders ----------
const orderFilters = pageQuery.extend({
  status: z.enum(STATUSES).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

adminRouter.get('/orders', validate(orderFilters, 'query'), ah(async (req, res) => {
  const { page, limit, ...f } = req.valid.query;
  const r = await repo.orders.list({ ...f, page, limit });
  res.json({ ...r, page, limit });
}));

const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // CSV formula-injection guard
  return `"${s.replace(/"/g, '""')}"`;
};

adminRouter.get('/orders.csv', validate(orderFilters.omit({ page: true, limit: true }), 'query'), ah(async (req, res) => {
  const { items } = await repo.orders.list({ ...req.valid.query, page: 1, limit: 5000 });
  const rows = [['Order ID', 'Date', 'Customer', 'Email', 'Items', 'Item total', 'Delivery', 'Handling', 'Total', 'Payment', 'Status', 'City', 'Pincode']];
  for (const o of items) {
    rows.push([o.orderId, new Date(o.createdAt).toISOString(), o.userName, o.userEmail, o.items.map((i) => `${i.name} x${i.qty}`).join('; '),
      o.bill.itemTotal, o.bill.deliveryFee, o.bill.handlingFee, o.bill.total, o.paymentMethod, o.status, o.address?.city, o.address?.pincode]);
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="quickkart-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\n'));
}));

adminRouter.get('/orders/:orderId', validate(z.object({ orderId: z.string().regex(/^QK[A-Z0-9]{6,20}$/) }), 'params'), ah(async (req, res) => {
  const o = await repo.orders.findByOrderId(req.valid.params.orderId);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order: o });
}));

adminRouter.patch('/orders/:orderId/status',
  validate(z.object({ orderId: z.string().regex(/^QK[A-Z0-9]{6,20}$/) }), 'params'),
  validate(z.object({ status: z.enum(STATUSES) }).strict()),
  ah(async (req, res) => {
    const o = await repo.orders.findByOrderId(req.valid.params.orderId);
    if (!o) return res.status(404).json({ error: 'Order not found.' });
    const { status } = req.valid.body;
    if (o.status === status) return res.json({ order: o });
    if (o.status === 'CANCELLED') return res.status(400).json({ error: 'Cancelled orders cannot be changed.' });
    const u = await repo.orders.update(o.orderId, { status, autoAdvance: false }, { status, at: new Date() });
    if (status === 'CANCELLED') for (const it of o.items) await repo.products.incrementStock(it.productId, it.qty);
    res.json({ order: u });
  }));

// ---------- Users ----------
adminRouter.get('/users', validate(pageQuery, 'query'), ah(async (req, res) => {
  const { page, limit, q } = req.valid.query;
  const r = await repo.users.list({ q, page, limit });
  res.json({ items: r.items.map((u) => ({ ...publicUser(u), blocked: !!u.blocked, createdAt: u.createdAt })), total: r.total, page, limit });
}));

adminRouter.patch('/users/:id/block', validate(z.object({ id: objectId }), 'params'), validate(z.object({ blocked: z.boolean() }).strict()), ah(async (req, res) => {
  if (req.valid.params.id === req.user.id) return res.status(400).json({ error: 'You cannot block yourself.' });
  const target = await repo.users.findById(req.valid.params.id);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.role === 'admin') return res.status(400).json({ error: 'Admins cannot be blocked here.' });
  const u = await repo.users.update(target.id, { blocked: req.valid.body.blocked });
  res.json({ user: { ...publicUser(u), blocked: u.blocked } });
}));
