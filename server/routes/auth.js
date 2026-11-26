import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { repo } from '../db/index.js';
import { ah, publicUser } from '../lib/http.js';
import { validate, email, phone, password, trimmed, addressSchema, objectId } from '../middleware/validate.js';
import { COOKIE, cookieOpts, signToken, requireAuth } from '../middleware/auth.js';

export const authRouter = Router();

// constant-time-ish defence against user enumeration via timing
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password-Qk1', 10);

authRouter.post('/register', validate(z.object({
  name: trimmed(2, 60), email, phone, password,
})), ah(async (req, res) => {
  const { name, email: em, phone: ph, password: pw } = req.valid.body;
  if (await repo.users.findByEmail(em)) return res.status(409).json({ error: 'An account with this email already exists.' });
  const passwordHash = await bcrypt.hash(pw, 12);
  const user = await repo.users.create({ name, email: em, phone: ph, passwordHash, role: 'user' });
  res.cookie(COOKIE, signToken(user), cookieOpts());
  res.status(201).json({ user: publicUser(user) });
}));

authRouter.post('/login', validate(z.object({ email, password: z.string().min(1).max(72) })), ah(async (req, res) => {
  const { email: em, password: pw } = req.valid.body;
  const user = await repo.users.findByEmail(em, true);
  const ok = await bcrypt.compare(pw, user?.passwordHash || DUMMY_HASH);
  if (!user || !ok) return res.status(401).json({ error: 'Invalid email or password.' });
  if (user.blocked) return res.status(403).json({ error: 'This account has been disabled. Contact support.' });
  res.cookie(COOKIE, signToken(user), cookieOpts());
  res.json({ user: publicUser(user) });
}));

authRouter.post('/logout', (_req, res) => {
  const { maxAge, ...opts } = cookieOpts();
  res.clearCookie(COOKIE, opts);
  res.json({ ok: true });
});

authRouter.get('/me', (req, res) => res.json({ user: publicUser(req.user) || null }));

// Saved addresses
authRouter.post('/me/addresses', requireAuth, validate(addressSchema), ah(async (req, res) => {
  const addresses = [...(req.user.addresses || [])];
  if (addresses.length >= 5) return res.status(400).json({ error: 'You can save up to 5 addresses.' });
  const { id, ...a } = req.valid.body;
  addresses.push(a);
  const u = await repo.users.update(req.user.id, { addresses });
  res.status(201).json({ addresses: u.addresses });
}));

authRouter.delete('/me/addresses/:id', requireAuth, validate(z.object({ id: z.string().min(1).max(40) }), 'params'), ah(async (req, res) => {
  const addresses = (req.user.addresses || []).filter((a) => a.id !== req.valid.params.id);
  const u = await repo.users.update(req.user.id, { addresses });
  res.json({ addresses: u.addresses });
}));

// Server-side cart (used to merge the guest cart after login)
const cartSchema = z.object({ items: z.array(z.object({ productId: objectId, qty: z.number().int().min(1).max(20) })).max(50) });

authRouter.get('/cart', requireAuth, (req, res) => res.json({ items: req.user.cart || [] }));
authRouter.put('/cart', requireAuth, validate(cartSchema), ah(async (req, res) => {
  const seen = new Map();
  for (const it of req.valid.body.items) seen.set(it.productId, Math.min(20, (seen.get(it.productId) || 0) + it.qty));
  const items = [...seen].map(([productId, qty]) => ({ productId, qty }));
  await repo.users.update(req.user.id, { cart: items });
  res.json({ items });
}));
