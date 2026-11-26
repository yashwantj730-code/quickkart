import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { config } from './config.js';
import { attachUser } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { productsRouter } from './routes/products.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render / reverse proxy: correct client IP for rate limits + secure cookies

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"], // framer-motion / drei inline styles
        'img-src': ["'self'", 'data:', 'blob:'],
        'font-src': ["'self'", 'data:'],
        'connect-src': ["'self'"],
        'worker-src': ["'self'", 'blob:'],
        'object-src': ["'none'"],
        'frame-ancestors': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'upgrade-insecure-requests': config.isProd ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());

  // Same-origin API: no CORS headers are emitted, so browsers block cross-origin reads.
  // Additionally reject state-changing requests whose Origin doesn't match our host.
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin) {
      try {
        if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Cross-origin request blocked.' });
      } catch { return res.status(403).json({ error: 'Cross-origin request blocked.' }); }
    }
    next();
  });

  app.use(express.json({ limit: '20kb' }));
  app.use(cookieParser());
  app.use(mongoSanitize({ replaceWith: '_' }));

  const json429 = (msg) => (_req, res) => res.status(429).json({ error: msg });
  const apiLimiter = rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false, handler: json429('Too many requests. Please slow down.') });
  const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: config.authRateLimit, standardHeaders: 'draft-7', legacyHeaders: false, handler: json429('Too many attempts. Try again in a few minutes.') });
  const orderLimiter = rateLimit({ windowMs: 15 * 60_000, limit: config.orderRateLimit, standardHeaders: 'draft-7', legacyHeaders: false, handler: json429('Too many orders. Try again later.') });

  app.use('/api', apiLimiter, attachUser);
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/orders', (req, res, next) => (req.method === 'POST' ? orderLimiter(req, res, next) : next()), ordersRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1y', setHeaders: (res, p) => { if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
    app.get('*', (_req, res) => { res.setHeader('Cache-Control', 'no-cache'); res.sendFile(path.join(dist, 'index.html')); });
  } else {
    app.get('/', (_req, res) => res.type('text').send('QuickKart API running. Build the frontend with `npm run build`.'));
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request too large.' });
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (!config.isProd) console.error(err);
    else console.error('[error]', err?.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}
