/**
 * Style & Carry: the Express app (API, and the built shop when present).
 * server.js runs it on a port; lambda.mjs runs it as a Netlify Function.
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import settingsRoutes from './routes/settings.js';
import adminRoutes from './routes/admin.js';
import contentRoutes from './routes/content.js';
import categoryRoutes from './routes/categories.js';
import reviewRoutes from './routes/reviews.js';
import newsletterRoutes from './routes/newsletter.js';
import teamRoutes from './routes/team.js';
import backupRoutes from './routes/backup.js';
import activityRoutes from './routes/activity.js';
import { activityLogger } from './lib/activity.js';
import { read } from './db.js';
import { SESSION_SECONDS } from './middleware/auth.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PROD = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1); // correct client IPs behind a host's proxy
app.disable('x-powered-by');

/* Basic security headers. The dashboard preview frames the shop, so framing
   is allowed from this same site only. */
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  });
  if (PROD && req.secure) res.set('Strict-Transport-Security', 'max-age=15552000');
  next();
});

/* ---------- middleware ---------- */

const allowed = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Same-origin and curl have no Origin header.
      if (!origin) return cb(null, true);
      // With nothing configured, allow any origin: convenient in development,
      // and safe enough here because the API carries no cookies, only a bearer
      // token the browser will not attach on its own.
      if (allowed.length === 0) return cb(null, true);
      cb(null, allowed.includes(origin));
    },
  })
);

// A restore carries the whole store, so backups may send more than other calls.
app.use('/api/backup', express.json({ limit: '12mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* Small request log, skipping noisy asset hits. */
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    const t = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - t}ms`);
    });
  }
  next();
});

/* Images the owner uploaded from the dashboard. */
app.use(
  '/uploads',
  express.static(process.env.UPLOAD_DIR || path.join(HERE, 'uploads'), { maxAge: '7d', fallthrough: true })
);

/* ---------- api ---------- */

app.get('/api/health', (req, res) => {
  const db = read();
  res.json({
    ok: true,
    service: 'style-and-carry',
    products: db.products.length,
    orders: db.orders.length,
    sessionMinutes: SESSION_SECONDS / 60,
    time: new Date().toISOString(),
  });
});

// Notes every change an admin makes, for the owner's notifications.
app.use('/api', activityLogger);

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/activity', activityRoutes);

app.use('/api', (req, res) => res.status(404).json({ error: 'No such endpoint' }));

/* ---------- search engines ---------- */

/** The public address of the shop: APP_URL in .env, else the address used. */
const siteUrl = (req) => (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

app.get('/robots.txt', (req, res) => {
  // A test copy of the shop (SITE_NOINDEX=1) keeps search engines out entirely.
  if (process.env.SITE_NOINDEX === '1') return res.type('text/plain').send('User-agent: *\nDisallow: /\n');
  res
    .type('text/plain')
    .send(['User-agent: *', 'Disallow: /admin', 'Disallow: /checkout', 'Disallow: /order/', '', `Sitemap: ${siteUrl(req)}/sitemap.xml`, ''].join('\n'));
});

app.get('/sitemap.xml', (req, res) => {
  const db = read();
  const base = siteUrl(req);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const urls = ['/', '/shop', '/about', '/track'];
  for (const c of db.categories || []) if (c.active !== false && c.key && (db.products || []).some((p) => p.category === c.key && p.active !== false)) urls.push(`/shop?category=${encodeURIComponent(c.key)}`);
  for (const p of db.products || []) if (p.active !== false && p.slug) urls.push(`/product/${encodeURIComponent(p.slug)}`);
  const body = urls.map((u) => `  <url><loc>${esc(base + u)}</loc></url>`).join('\n');
  res
    .type('application/xml')
    .send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
});

/* ---------- frontend ---------- */

const dist = path.join(HERE, '..', 'frontend', 'dist');
if (fs.existsSync(dist)) {
  // Built files have a hash in their name, so they can be cached for a year.
  app.use('/assets', express.static(path.join(dist, 'assets'), { maxAge: '1y', immutable: true, index: false }));
  app.use(express.static(dist, { maxAge: '1h', index: false }));
  // React Router owns every non-API path. The page itself is never cached,
  // so customers get a new version as soon as it is deployed.
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
  console.log('Serving built frontend from frontend/dist');
}

/* ---------- errors ---------- */

app.use((err, req, res, next) => {
  console.error('[error]', err);
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || 500;
  // In production, never show internal details to visitors.
  const message = status >= 500 && PROD ? 'Something went wrong on our side. Please try again.' : err.message || 'Something went wrong';
  res.status(status).json({ error: message });
});

export default app;
