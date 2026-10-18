/**
 * Product categories, managed from the dashboard. The storefront reads them
 * through GET /api/content; these routes are admin-only.
 */
import { Router } from 'express';
import { read, update, uid } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { str, imagePath, bool, slugify } from '../lib/clean.js';

const router = Router();
router.use(requireAuth, requireAdmin);

function clean(body, existing = {}) {
  const name = str(body.name ?? existing.name, 60);
  return {
    name,
    // The key is the web address part: /shop?category=<key>
    key: slugify(body.key || existing.key || name),
    description: str(body.description ?? existing.description, 160),
    image: body.image === undefined ? existing.image || '' : imagePath(body.image),
    active: bool(body.active, existing.active ?? true),
    sortOrder: Number.isFinite(Number(body.sortOrder))
      ? Number(body.sortOrder)
      : existing.sortOrder ?? read().categories.length,
  };
}

router.get('/', (req, res) => {
  const db = read();
  const counts = {};
  for (const p of db.products) counts[p.category] = (counts[p.category] || 0) + 1;
  res.json({
    categories: [...db.categories]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((c) => ({ ...c, productCount: counts[c.key] || 0 })),
  });
});

router.post('/', (req, res) => {
  const c = clean(req.body || {});
  if (!c.name) return res.status(400).json({ error: 'Give the category a name' });
  if (!c.key) return res.status(400).json({ error: 'Use letters or numbers in the name' });
  if (read().categories.some((x) => x.key === c.key)) {
    return res.status(409).json({ error: 'A category with this web address already exists' });
  }
  const category = { id: uid('cat'), ...c };
  update((db) => db.categories.push(category));
  res.status(201).json({ category });
});

router.put('/:id', (req, res) => {
  const db = read();
  const existing = db.categories.find((c) => c.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Category not found' });

  const c = clean(req.body || {}, existing);
  if (!c.name) return res.status(400).json({ error: 'Give the category a name' });
  if (db.categories.some((x) => x.key === c.key && x.id !== existing.id)) {
    return res.status(409).json({ error: 'Another category already uses this web address' });
  }

  const category = update((d) => {
    const cat = d.categories.find((x) => x.id === existing.id);
    // Renaming the key moves its products along with it.
    if (cat.key !== c.key) {
      for (const p of d.products) if (p.category === cat.key) p.category = c.key;
    }
    Object.assign(cat, c);
    return cat;
  });
  res.json({ category });
});

/** PUT /api/categories — save a new order: { order: [id, id, ...] } */
router.put('/', (req, res) => {
  const order = Array.isArray(req.body?.order) ? req.body.order : [];
  update((db) => {
    order.forEach((id, i) => {
      const c = db.categories.find((x) => x.id === id);
      if (c) c.sortOrder = i;
    });
  });
  res.json({ ok: true });
});

router.delete('/:id', (req, res) => {
  const db = read();
  const cat = db.categories.find((c) => c.id === req.params.id);
  if (!cat) return res.status(404).json({ error: 'Category not found' });
  const used = db.products.filter((p) => p.category === cat.key).length;
  if (used) {
    return res.status(409).json({
      error: `${used} product${used === 1 ? '' : 's'} still use this category. Move them to another category first, or hide it instead.`,
    });
  }
  update((d) => {
    d.categories = d.categories.filter((c) => c.id !== cat.id);
  });
  res.json({ ok: true });
});

export default router;
