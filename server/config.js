import 'dotenv/config';
import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 16) {
  if (isProd) {
    console.error('[config] JWT_SECRET (min 16 chars) is required in production.');
    process.exit(1);
  }
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('[config] JWT_SECRET not set - using a random dev secret (sessions reset on restart).');
}

export const config = {
  isProd,
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || '',
  jwtSecret,
  adminEmail: (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  authRateLimit: Number(process.env.AUTH_RATE_LIMIT) || 20,
  orderRateLimit: Number(process.env.ORDER_RATE_LIMIT) || 30,
  // order auto-advance thresholds (ms after placement)
  statusTimeline: { PACKED: 60_000, OUT_FOR_DELIVERY: 180_000, DELIVERED: 600_000 },
};
