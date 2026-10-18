/**
 * Homepage content: hero slides, brand logos, promo banners, the story,
 * the features block, testimonials heading, newsletter text and FAQs.
 *
 * GET is public (the storefront renders from it). PUT is admin-only and
 * replaces the sections it is sent, cleaning every field on the way in.
 */
import { Router } from 'express';
import { read, update, uid } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { str, imagePath, link, bool, list } from '../lib/clean.js';

const router = Router();

/**
 * Cleans a flat group of fields from a spec: { title: 100, enabled: 'bool' }.
 * Numbers are maximum lengths for text.
 */
const group = (spec) => (v = {}) => {
  const out = {};
  for (const [k, t] of Object.entries(spec)) out[k] = t === 'bool' ? bool(v?.[k]) : str(v?.[k], t);
  return out;
};

const pairs = (max, a, b) => (v) =>
  list(v, max, (i) => (str(i?.[a[0]], a[1]) ? { [a[0]]: str(i[a[0]], a[1]), [b[0]]: str(i?.[b[0]], b[1]) } : null));

const heading = group({ enabled: 'bool', eyebrow: 80, title: 100 });
const page = group({ eyebrow: 80, title: 100, text: 300 });

const CLEANERS = {
  heroSlides: (v) =>
    list(v, 8, (s) => {
      const image = imagePath(s?.image);
      if (!image) return null;
      return {
        id: str(s.id, 40) || uid('hero'),
        image,
        mobileImage: imagePath(s.mobileImage),
        eyebrow: str(s.eyebrow, 60),
        title: str(s.title, 80),
        text: str(s.text, 220),
        ctaLabel: str(s.ctaLabel, 40),
        ctaLink: link(s.ctaLink),
        active: bool(s.active),
      };
    }),

  brands: (v) =>
    list(v, 16, (b) => {
      const image = imagePath(b?.image);
      if (!image) return null;
      return { id: str(b.id, 40) || uid('brand'), image, name: str(b.name, 60), link: link(b.link) };
    }),

  banners: (v) =>
    list(v, 8, (b) => {
      const image = imagePath(b?.image);
      if (!image) return null;
      return {
        id: str(b.id, 40) || uid('ban'),
        image,
        eyebrow: str(b.eyebrow, 60),
        title: str(b.title, 80),
        link: link(b.link),
        position: b.position === 'bottom' ? 'bottom' : 'top',
      };
    }),

  story: (v = {}) => ({
    enabled: bool(v.enabled),
    eyebrow: str(v.eyebrow, 80),
    title: str(v.title, 100),
    text: str(v.text, 900),
    button: str(v.button, 40),
  }),

  heroSearch: group({ enabled: 'bool', button: 30 }),
  categorySection: group({ enabled: 'bool', eyebrow: 80, title: 100, text: 240 }),
  offers: group({ enabled: 'bool', eyebrow: 80, title: 100, text: 240, button: 40 }),
  quote: (v = {}) => ({
    enabled: bool(v.enabled),
    text: str(v.text, 220),
    author: str(v.author, 80),
    image: imagePath(v.image),
  }),
  aboutSection: (v = {}) => ({
    enabled: bool(v.enabled),
    eyebrow: str(v.eyebrow, 80),
    title: str(v.title, 100),
    text: str(v.text, 1200),
    button: str(v.button, 40),
    image: imagePath(v.image),
  }),
  gallery: group({ enabled: 'bool', eyebrow: 80, title: 100 }),

  features: (v = {}) => ({
    enabled: bool(v.enabled),
    eyebrow: str(v.eyebrow, 80),
    title: str(v.title, 100),
    image: imagePath(v.image),
    items: list(v.items, 6, (i) =>
      str(i?.title, 60) ? { title: str(i.title, 60), text: str(i.text, 200) } : null
    ),
  }),

  testimonials: heading,

  announcement: (v = {}) => ({
    enabled: bool(v.enabled),
    items: list(v.items, 3, (t) => str(t, 90) || null),
  }),

  trust: (v = {}) => ({
    enabled: bool(v.enabled),
    items: pairs(4, ['title', 60], ['text', 80])(v.items),
  }),

  topSellers: group({ enabled: 'bool', eyebrow: 80, title: 100, button: 40 }),
  newArrivals: group({ enabled: 'bool', eyebrow: 80, title: 100, button: 40 }),
  faqSection: heading,

  pages: (v = {}) => ({
    shop: page(v.shop),
    about: page(v.about),
    track: page(v.track),
    wishlist: page(v.wishlist),
    checkout: page(v.checkout),
  }),

  about: (v = {}) => ({
    heading: str(v.heading, 100),
    body: str(v.body, 3000),
    points: pairs(4, ['title', 60], ['text', 80])(v.points),
    faqTitle: str(v.faqTitle, 100),
    faqs: pairs(20, ['q', 200], ['a', 1000])(v.faqs),
    ctaTitle: str(v.ctaTitle, 100),
    ctaText: str(v.ctaText, 240),
    ctaButton: str(v.ctaButton, 40),
  }),

  product: group({ deliveryTitle: 80, deliveryText: 200, exchangeTitle: 80, exchangeText: 200, policyText: 800 }),

  footer: group({ questionsTitle: 60 }),

  newsletter: (v = {}) => ({
    enabled: bool(v.enabled),
    title: str(v.title, 80),
    text: str(v.text, 200),
  }),

  faqs: (v) =>
    list(v, 20, (f) => (str(f?.q, 200) && str(f?.a, 1000) ? { q: str(f.q, 200), a: str(f.a, 1000) } : null)),
};

/** GET /api/content — everything the storefront needs to draw its pages. */
router.get('/', (req, res) => {
  const db = read();
  res.json({
    content: db.content,
    categories: [...db.categories].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
  });
});

/** PUT /api/content — replace the sections that are sent. */
router.put('/', requireAuth, requireAdmin, (req, res) => {
  const patch = {};
  for (const [key, clean] of Object.entries(CLEANERS)) {
    if (req.body?.[key] !== undefined) patch[key] = clean(req.body[key]);
  }
  if (!Object.keys(patch).length) {
    return res.status(400).json({ error: 'Nothing to save' });
  }
  if (patch.heroSlides && !patch.heroSlides.some((s) => s.active)) {
    return res.status(400).json({ error: 'Keep at least one hero slide switched on' });
  }

  const content = update((db) => {
    db.content = { ...db.content, ...patch, updatedAt: new Date().toISOString() };
    return db.content;
  });
  res.json({ content });
});

export default router;
