import { Router } from 'express';
import { read, update, uid } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { ratingIndex } from './reviews.js';
import { imagePath, videoPath } from '../lib/clean.js';

/** Adds the star rating from approved reviews to each product. */
const withRatings = (list) => {
  const idx = ratingIndex();
  return list.map((p) => (idx[p.id] ? { ...p, ...idx[p.id] } : { ...p, rating: 0, reviewCount: 0 }));
};

const router = Router();

const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

/** Shape the admin sends -> shape we store. Unknown keys are dropped. */
function sanitise(body, existing = {}) {
  const num = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };
  const arr = (v, fallback) => (Array.isArray(v) ? v : fallback);

  return {
    name: String(body.name ?? existing.name ?? '').trim(),
    slug: slugify(body.slug || body.name || existing.slug || ''),
    category: String(body.category ?? existing.category ?? 'bifold').trim(),
    price: num(body.price, existing.price ?? 0),
    compareAt: body.compareAt === '' || body.compareAt == null
      ? (existing.compareAt ?? null)
      : num(body.compareAt, existing.compareAt ?? null),
    stock: num(body.stock, existing.stock ?? 0),
    badge: body.badge === undefined ? existing.badge ?? null : body.badge ? String(body.badge).trim() : null,
    description: String(body.description ?? existing.description ?? '').trim(),
    images: arr(body.images, existing.images ?? []).map(imagePath).filter(Boolean),
    // one short clip (5-10 seconds), shown after the first photo
    video: body.video === undefined ? existing.video || '' : videoPath(body.video),
    colors: arr(body.colors, existing.colors ?? []).filter(
      (c) => Array.isArray(c) && c.length === 2
    ),
    specs: arr(body.specs, existing.specs ?? []).filter(Boolean),
    features: arr(body.features, existing.features ?? []).filter(Boolean),
    material: String(body.material ?? existing.material ?? '').trim().slice(0, 600),
    active: body.active === undefined ? (existing.active ?? true) : Boolean(body.active),
  };
}

/* ---------- public ---------- */

/** GET /api/products — the storefront catalogue. */
router.get('/', (req, res) => {
  const { category, q, sort, includeInactive } = req.query;
  let list = read().products;

  // Only the dashboard may see hidden products.
  if (includeInactive !== 'true') list = list.filter((p) => p.active !== false);

  if (category && category !== 'all') list = list.filter((p) => p.category === category);

  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((p) =>
      [p.name, p.description, p.category, ...(p.specs || [])]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }

  const sorters = {
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    newest: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
    name: (a, b) => a.name.localeCompare(b.name),
  };
  list = [...list].sort(sorters[sort] || ((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));

  res.json({ products: withRatings(list), total: list.length });
});

/** GET /api/products/:slug — one product, by slug or id. */
router.get('/:slug', (req, res) => {
  const { slug } = req.params;
  const product = read().products.find((p) => p.slug === slug || p.id === slug);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ product: withRatings([product])[0] });
});

/* ---------- admin ---------- */

router.post('/', requireAuth, requireAdmin, (req, res) => {
  const clean = sanitise(req.body);
  if (!clean.name) return res.status(400).json({ error: 'Please give the product a name' });
  if (!clean.price) return res.status(400).json({ error: 'Please set a price above zero' });

  const db = read();
  if (db.products.some((p) => p.slug === clean.slug)) {
    return res.status(409).json({ error: 'A product with this web address already exists' });
  }

  const now = new Date().toISOString();
  const product = {
    id: uid('prd'),
    ...clean,
    sortOrder: db.products.length,
    createdAt: now,
    updatedAt: now,
  };

  update((d) => d.products.push(product));
  res.status(201).json({ product });
});

router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = read();
  const existing = db.products.find((p) => p.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Product not found' });

  const clean = sanitise(req.body, existing);
  if (!clean.name) return res.status(400).json({ error: 'Please give the product a name' });

  const clash = db.products.find((p) => p.slug === clean.slug && p.id !== existing.id);
  if (clash) {
    return res.status(409).json({ error: 'Another product already uses this web address' });
  }

  const updated = update((d) => {
    const p = d.products.find((x) => x.id === req.params.id);
    Object.assign(p, clean, { updatedAt: new Date().toISOString() });
    return p;
  });

  res.json({ product: updated });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = read();
  if (!db.products.some((p) => p.id === req.params.id)) {
    return res.status(404).json({ error: 'Product not found' });
  }
  update((d) => {
    d.products = d.products.filter((p) => p.id !== req.params.id);
  });
  res.json({ ok: true });
});

export default router;
