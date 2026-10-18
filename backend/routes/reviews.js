/**
 * Customer reviews.
 *
 * Anyone can write one, but it stays hidden until the owner approves it in
 * the dashboard, so the shop never shows spam or anything it has not seen.
 * Only approved reviews count towards a product's star rating.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { read, update, uid } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { str, bool } from '../lib/clean.js';

const router = Router();

const writeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reviews from this connection. Please try again later.' },
});

/** What a shopper may see of a review: no status, no internal fields. */
const publicShape = (r) => ({
  id: r.id,
  productSlug: r.productSlug,
  productName: r.productName,
  name: r.name,
  city: r.city,
  rating: r.rating,
  text: r.text,
  createdAt: r.createdAt,
});

/** Average rating and count per product, from approved reviews only. */
export function ratingIndex(db = read()) {
  const map = {};
  for (const r of db.reviews) {
    if (r.status !== 'approved') continue;
    const m = (map[r.productId] ||= { sum: 0, count: 0 });
    m.sum += r.rating;
    m.count += 1;
  }
  for (const k of Object.keys(map)) {
    map[k] = { rating: Math.round((map[k].sum / map[k].count) * 10) / 10, reviewCount: map[k].count };
  }
  return map;
}

/* ---------- public ---------- */

/**
 * GET /api/reviews?product=<slug>   approved reviews for one product
 * GET /api/reviews?featured=1       reviews for the homepage testimonials
 * Both include a summary: { average, count }.
 */
router.get('/', (req, res) => {
  const db = read();
  let list = db.reviews.filter((r) => r.status === 'approved');

  if (req.query.product) {
    const p = db.products.find((x) => x.slug === req.query.product || x.id === req.query.product);
    list = p ? list.filter((r) => r.productId === p.id) : [];
  }

  const count = list.length;
  const average = count ? Math.round((list.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : 0;

  list = [...list].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  if (req.query.featured) {
    // Featured first, then the best recent ones.
    list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating);
  }
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  res.json({ reviews: list.slice(0, limit).map(publicShape), summary: { average, count } });
});

/** POST /api/reviews — a shopper leaves a review. Held for approval. */
router.post('/', writeLimiter, (req, res) => {
  const b = req.body || {};
  const db = read();
  const product = db.products.find((p) => p.slug === b.product && p.active !== false);
  if (!product) return res.status(404).json({ error: 'That product is no longer available' });

  const name = str(b.name, 60);
  const text = str(b.text, 1000);
  const rating = Math.round(Number(b.rating));

  if (name.length < 2) return res.status(400).json({ error: 'Please enter your name' });
  if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: 'Please choose a star rating' });
  if (text.length < 10) return res.status(400).json({ error: 'Please write at least a sentence' });

  const review = {
    id: uid('rev'),
    productId: product.id,
    productSlug: product.slug,
    productName: product.name,
    name,
    city: str(b.city, 40),
    rating,
    text,
    status: 'pending',
    featured: false,
    createdAt: new Date().toISOString(),
  };
  update((d) => d.reviews.unshift(review));
  res.status(201).json({ ok: true, message: 'Thank you. Your review will appear once we have checked it.' });
});

/* ---------- admin ---------- */

router.get('/admin', requireAuth, requireAdmin, (req, res) => {
  res.json({ reviews: read().reviews });
});

router.patch('/:id', requireAuth, requireAdmin, (req, res) => {
  const b = req.body || {};
  const review = update((db) => {
    const r = db.reviews.find((x) => x.id === req.params.id);
    if (!r) return null;
    if (['pending', 'approved', 'rejected'].includes(b.status)) r.status = b.status;
    if (b.featured !== undefined) r.featured = bool(b.featured, false);
    r.updatedAt = new Date().toISOString();
    return r;
  });
  if (!review) return res.status(404).json({ error: 'Review not found' });
  res.json({ review });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = read();
  if (!db.reviews.some((r) => r.id === req.params.id)) {
    return res.status(404).json({ error: 'Review not found' });
  }
  update((d) => {
    d.reviews = d.reviews.filter((r) => r.id !== req.params.id);
  });
  res.json({ ok: true });
});

export default router;
