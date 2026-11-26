import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { repo } from '../db/index.js';
import { ah } from '../lib/http.js';
import { computeBill } from '../lib/bill.js';
import { validate, objectId, addressSchema } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';

export const ordersRouter = Router();

const orderInput = z.object({
  // Any client-sent price/total fields are stripped by zod and never used.
  items: z.array(z.object({ productId: objectId, qty: z.number().int().min(1).max(20) })).min(1).max(30),
  address: addressSchema,
  saveAddress: z.boolean().optional().default(false),
  paymentMethod: z.enum(['COD', 'DEMO_UPI']),
});

const genOrderId = () => `QK${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

export const publicOrder = (o) => ({
  orderId: o.orderId, items: o.items, bill: o.bill, address: o.address, paymentMethod: o.paymentMethod,
  status: o.status, statusHistory: o.statusHistory, createdAt: o.createdAt, etaMinutes: 10,
});

ordersRouter.post('/', requireAuth, validate(orderInput), ah(async (req, res) => {
  const { items, address, saveAddress, paymentMethod } = req.valid.body;
  const merged = new Map();
  for (const it of items) merged.set(it.productId, (merged.get(it.productId) || 0) + it.qty);
  if ([...merged.values()].some((q) => q > 20)) return res.status(400).json({ error: 'Max 20 units per product.' });

  const products = await repo.products.getManyByIds([...merged.keys()]);
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const id of merged.keys()) {
    const p = byId.get(id);
    if (!p || !p.active) return res.status(400).json({ error: 'Some items are no longer available. Please review your cart.', productId: id });
  }

  // Atomic per-product decrement with stock check; roll back on any failure.
  const done = [];
  for (const [id, qty] of merged) {
    const ok = await repo.products.decrementStock(id, qty);
    if (!ok) {
      for (const d of done) await repo.products.incrementStock(d.id, d.qty);
      const fresh = await repo.products.getById(id);
      return res.status(409).json({ error: `Only ${Math.max(0, fresh?.stock ?? 0)} left of ${byId.get(id).name}.`, productId: id, available: fresh?.stock ?? 0 });
    }
    done.push({ id, qty });
  }

  const lines = [...merged].map(([id, qty]) => {
    const p = byId.get(id);
    return { productId: id, name: p.name, unit: p.unit, price: p.price, mrp: p.mrp, qty, color: p.color, emoji: p.emoji, category: p.category };
  });
  const bill = computeBill(lines);
  const at = new Date();
  let order;
  try {
    order = await repo.orders.create({
      orderId: genOrderId(), user: req.user.id, userName: req.user.name, userEmail: req.user.email,
      items: lines, bill, address: { ...address, id: undefined }, paymentMethod,
      status: 'PLACED', statusHistory: [{ status: 'PLACED', at }], autoAdvance: true,
    });
  } catch (e) {
    for (const d of done) await repo.products.incrementStock(d.id, d.qty);
    throw e;
  }

  const patch = { cart: [] };
  if (saveAddress) {
    const list = req.user.addresses || [];
    const dup = list.some((a) => a.line1 === address.line1 && a.pincode === address.pincode);
    if (!dup && list.length < 5) { const { id, ...a } = address; patch.addresses = [...list, a]; }
  }
  await repo.users.update(req.user.id, patch);
  res.status(201).json({ order: publicOrder(order) });
}));

ordersRouter.get('/', requireAuth, ah(async (req, res) => {
  const orders = await repo.orders.listByUser(req.user.id);
  res.json({ orders: orders.map(publicOrder) });
}));

const orderIdParam = z.object({ orderId: z.string().regex(/^QK[A-Z0-9]{6,20}$/) });

ordersRouter.get('/:orderId', requireAuth, validate(orderIdParam, 'params'), ah(async (req, res) => {
  const o = await repo.orders.findByOrderId(req.valid.params.orderId);
  // Ownership check: respond 404 so order ids can't be probed.
  if (!o || (o.user !== req.user.id && req.user.role !== 'admin')) return res.status(404).json({ error: 'Order not found.' });
  res.json({ order: publicOrder(o) });
}));

ordersRouter.post('/:orderId/cancel', requireAuth, validate(orderIdParam, 'params'), ah(async (req, res) => {
  const o = await repo.orders.findByOrderId(req.valid.params.orderId);
  if (!o || o.user !== req.user.id) return res.status(404).json({ error: 'Order not found.' });
  if (o.status !== 'PLACED') return res.status(400).json({ error: 'This order can no longer be cancelled.' });
  const u = await repo.orders.update(o.orderId, { status: 'CANCELLED', autoAdvance: false }, { status: 'CANCELLED', at: new Date() });
  for (const it of o.items) await repo.products.incrementStock(it.productId, it.qty);
  res.json({ order: publicOrder(u) });
}));
