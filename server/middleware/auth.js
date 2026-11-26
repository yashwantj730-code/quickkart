import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { repo } from '../db/index.js';

export const COOKIE = 'qk_token';
export const cookieOpts = () => ({
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'strict',
  path: '/',
  maxAge: 7 * 24 * 3600 * 1000,
});

export const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: '7d', algorithm: 'HS256' });

function readToken(req) {
  const c = req.cookies?.[COOKIE];
  if (c) return c;
  const h = req.get('authorization');
  if (h && h.startsWith('Bearer ')) return h.slice(7);
  return null;
}

// Attaches req.user if a valid token is present; never rejects.
export async function attachUser(req, _res, next) {
  const token = readToken(req);
  if (!token) return next();
  try {
    const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    const user = await repo.users.findById(String(payload.sub));
    if (user && !user.blocked) req.user = user;
  } catch { /* invalid/expired token -> treated as guest */ }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please log in to continue.' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden.' });
  next();
}
