import { Router } from 'express';
import { z } from 'zod';
import { repo } from '../db/index.js';
import { ah } from '../lib/http.js';
import { validate, objectId } from '../middleware/validate.js';
import { CATEGORIES } from '../seedData.js';

export const productsRouter = Router();

export const publicProduct = (p) => ({
  id: p.id, slug: p.slug, name: p.name, brand: p.brand, category: p.category, unit: p.unit,
  price: p.price, mrp: p.mrp, stock: p.stock, color: p.color, shape: p.shape, emoji: p.emoji,
  aisle: p.aisle, shelf: p.shelf, slot: p.slot,
});

productsRouter.get('/categories', (_req, res) => res.json({ categories: CATEGORIES }));

productsRouter.get('/', validate(z.object({
  q: z.string().trim().max(60).optional(),
  category: z.string().trim().max(40).optional(),
}), 'query'), ah(async (req, res) => {
  const { q, category } = req.valid.query;
  const { items } = await repo.products.list({ q, category, active: true, limit: 500 });
  res.set('Cache-Control', 'no-store');
  res.json({ products: items.map(publicProduct) });
}));

productsRouter.get('/:id', validate(z.object({ id: objectId }), 'params'), ah(async (req, res) => {
  const p = await repo.products.getById(req.valid.params.id);
  if (!p || !p.active) return res.status(404).json({ error: 'Product not found.' });
  res.json({ product: publicProduct(p) });
}));
