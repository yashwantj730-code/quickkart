// Fallback store for local runs without MongoDB. Persists to server/.data/db.json.
// Single-process + synchronous mutations => stock checks are atomic within this process.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.data');
const file = path.join(dir, 'db.json');
let db = { products: [], users: [], orders: [] };
let timer = null;

const newId = () => crypto.randomBytes(12).toString('hex');
const clone = (x) => (x == null ? null : structuredClone(x));
const now = () => new Date();
const save = () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    try { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(db)); } catch (e) { console.error('[memory] persist failed', e.message); }
  }, 200);
};
const revive = (o) => { for (const k of ['createdAt', 'updatedAt']) if (o[k]) o[k] = new Date(o[k]); return o; };
const strip = (u) => { if (!u) return null; const { passwordHash, ...r } = u; return r; };
const page = (arr, p = 1, l = 20) => ({ items: arr.slice((p - 1) * l, (p - 1) * l + l).map(clone), total: arr.length });
const has = (s, q) => String(s || '').toLowerCase().includes(String(q).toLowerCase());

export function loadMemory() {
  try {
    if (fs.existsSync(file)) {
      db = JSON.parse(fs.readFileSync(file, 'utf8'));
      db.products.forEach(revive); db.users.forEach(revive);
      db.orders.forEach((o) => { revive(o); o.statusHistory?.forEach((h) => { h.at = new Date(h.at); }); });
    }
  } catch { db = { products: [], users: [], orders: [] }; }
}

export const memoryRepo = {
  kind: 'memory',
  products: {
    async count() { return db.products.length; },
    async insertMany(arr) { arr.forEach((p) => db.products.push({ id: newId(), ...p, createdAt: now(), updatedAt: now() })); save(); },
    async list({ q, category, active, page: p = 1, limit = 100, lowStock } = {}) {
      let a = db.products;
      if (q) a = a.filter((x) => has(x.name, q) || has(x.brand, q));
      if (category) a = a.filter((x) => x.category === category);
      if (typeof active === 'boolean') a = a.filter((x) => x.active === active);
      if (lowStock != null) a = a.filter((x) => x.stock <= lowStock);
      a = [...a].sort((x, y) => x.category.localeCompare(y.category) || x.slot - y.slot);
      return page(a, p, limit);
    },
    async getById(id) { return clone(db.products.find((x) => x.id === id)); },
    async getManyByIds(ids) { return db.products.filter((x) => ids.includes(x.id)).map(clone); },
    async create(data) { const p = { id: newId(), ...data, createdAt: now(), updatedAt: now() }; db.products.push(p); save(); return clone(p); },
    async update(id, patch) { const p = db.products.find((x) => x.id === id); if (!p) return null; Object.assign(p, patch, { updatedAt: now() }); save(); return clone(p); },
    async remove(id) { const i = db.products.findIndex((x) => x.id === id); if (i < 0) return false; db.products.splice(i, 1); save(); return true; },
    async decrementStock(id, qty) {
      const p = db.products.find((x) => x.id === id);
      if (!p || !p.active || p.stock < qty) return false;
      p.stock -= qty; save(); return true;
    },
    async incrementStock(id, qty) { const p = db.products.find((x) => x.id === id); if (p) { p.stock += qty; save(); } },
    async countLowStock(t) { return db.products.filter((x) => x.stock <= t).length; },
  },
  users: {
    async findByEmail(email, withHash = false) { const u = db.users.find((x) => x.email === String(email).toLowerCase()); return withHash ? clone(u) : clone(strip(u)); },
    async findById(id) { return clone(strip(db.users.find((x) => x.id === id))); },
    async create(data) { const u = { id: newId(), role: 'user', blocked: false, addresses: [], cart: [], ...data, email: data.email.toLowerCase(), createdAt: now(), updatedAt: now() }; db.users.push(u); save(); return clone(strip(u)); },
    async update(id, patch) {
      const u = db.users.find((x) => x.id === id); if (!u) return null;
      if (patch.addresses) patch.addresses = patch.addresses.map((a) => ({ id: a.id || newId(), ...a }));
      Object.assign(u, patch, { updatedAt: now() }); save(); return clone(strip(u));
    },
    async list({ q, page: p = 1, limit = 20 } = {}) {
      let a = db.users; if (q) a = a.filter((x) => has(x.name, q) || has(x.email, q));
      return page([...a].sort((x, y) => y.createdAt - x.createdAt).map(strip), p, limit);
    },
    async count() { return db.users.filter((x) => x.role === 'user').length; },
  },
  orders: {
    async create(data) { if (db.orders.some((o) => o.orderId === data.orderId)) throw new Error('dup'); const o = { id: newId(), ...data, createdAt: now(), updatedAt: now() }; db.orders.push(o); save(); return clone(o); },
    async findByOrderId(orderId) { return clone(db.orders.find((x) => x.orderId === orderId)); },
    async listByUser(userId) { return db.orders.filter((x) => x.user === userId).sort((a, b) => b.createdAt - a.createdAt).slice(0, 100).map(clone); },
    async list({ status, q, from, to, page: p = 1, limit = 20 } = {}) {
      let a = db.orders;
      if (status) a = a.filter((x) => x.status === status);
      if (q) a = a.filter((x) => has(x.orderId, q) || has(x.userEmail, q));
      if (from) a = a.filter((x) => x.createdAt >= from);
      if (to) a = a.filter((x) => x.createdAt <= to);
      return page([...a].sort((x, y) => y.createdAt - x.createdAt), p, limit);
    },
    async since(date) { return db.orders.filter((x) => x.createdAt >= date).map(clone); },
    async activeAuto() { return db.orders.filter((x) => x.autoAdvance && !['DELIVERED', 'CANCELLED'].includes(x.status)).map(clone); },
    async update(orderId, patch, pushHistory) {
      const o = db.orders.find((x) => x.orderId === orderId); if (!o) return null;
      Object.assign(o, patch, { updatedAt: now() }); if (pushHistory) o.statusHistory.push(pushHistory); save(); return clone(o);
    },
  },
};
