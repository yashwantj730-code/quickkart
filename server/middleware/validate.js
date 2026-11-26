import { z } from 'zod';

export const validate = (schema, where = 'body') => (req, res, next) => {
  const r = schema.safeParse(req[where] ?? {});
  if (!r.success) {
    const issue = r.error.issues[0];
    return res.status(400).json({ error: 'Invalid input.', field: issue?.path?.join('.'), detail: issue?.message });
  }
  req.valid = { ...(req.valid || {}), [where]: r.data };
  next();
};

export const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid id');
export const trimmed = (min, max) => z.string().trim().min(min).max(max);
export const email = z.string().trim().toLowerCase().email().max(120);
export const phone = z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');
export const password = z.string().min(8, 'At least 8 characters').max(72)
  .regex(/[a-z]/, 'Needs a lowercase letter').regex(/[A-Z]/, 'Needs an uppercase letter').regex(/\d/, 'Needs a number');

export const addressSchema = z.object({
  id: z.string().max(40).optional(),
  label: z.enum(['Home', 'Work', 'Other']).default('Home'),
  name: trimmed(2, 60),
  phone,
  line1: trimmed(3, 120),
  line2: z.string().trim().max(120).optional().default(''),
  landmark: z.string().trim().max(80).optional().default(''),
  city: trimmed(2, 60),
  pincode: z.string().trim().regex(/^\d{6}$/, 'Enter a 6-digit pincode'),
});

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(60).optional(),
});
