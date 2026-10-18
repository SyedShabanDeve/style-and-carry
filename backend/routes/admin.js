/** Dashboard numbers and product-image uploads. Admin only. */
import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { read } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const HERE = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(HERE, '..', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/* ---------- stats ---------- */

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

/**
 * GET /api/admin/stats
 * Revenue counts orders that were not cancelled, since a cancelled order
 * never brings money in.
 */
router.get('/stats', requireAuth, requireAdmin, (req, res) => {
  const db = read();
  const orders = db.orders || [];
  const products = db.products || [];

  const earning = orders.filter((o) => o.status !== 'cancelled');
  const today = startOfDay(new Date());
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const byStatus = {};
  for (const o of orders) byStatus[o.status] = (byStatus[o.status] || 0) + 1;

  /* Revenue per day for the last 7 days, oldest first. */
  const series = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(today);
    day.setDate(day.getDate() - i);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dayOrders = earning.filter((o) => {
      const t = new Date(o.createdAt);
      return t >= day && t < next;
    });
    series.push({
      date: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString('en-PK', { weekday: 'short' }),
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    });
  }

  /* Units sold per product, best first. */
  const sold = new Map();
  for (const o of earning) {
    for (const line of o.items) {
      const cur = sold.get(line.productId) || { name: line.name, units: 0, revenue: 0 };
      cur.units += line.qty;
      cur.revenue += line.lineTotal ?? line.price * line.qty;
      sold.set(line.productId, cur);
    }
  }
  const topProducts = [...sold.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.units - a.units)
    .slice(0, 5);

  const revenue = earning.reduce((s, o) => s + o.total, 0);

  res.json({
    stats: {
      revenue,
      revenueToday: earning
        .filter((o) => new Date(o.createdAt) >= today)
        .reduce((s, o) => s + o.total, 0),
      revenueWeek: earning
        .filter((o) => new Date(o.createdAt) >= weekAgo)
        .reduce((s, o) => s + o.total, 0),
      orders: orders.length,
      ordersToday: orders.filter((o) => new Date(o.createdAt) >= today).length,
      pending: byStatus.pending || 0,
      confirmed: byStatus.confirmed || 0,
      shipped: byStatus.shipped || 0,
      delivered: byStatus.delivered || 0,
      cancelled: byStatus.cancelled || 0,
      averageOrder: earning.length ? Math.round(revenue / earning.length) : 0,
      products: products.length,
      activeProducts: products.filter((p) => p.active !== false).length,
      outOfStock: products.filter((p) => (p.stock ?? 0) === 0).length,
      lowStock: products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5).length,
      byStatus,
      series,
      topProducts,
      recentOrders: orders.slice(0, 6),
      pendingReviews: (db.reviews || []).filter((r) => r.status === 'pending').length,
      subscribers: (db.subscribers || []).length,
    },
  });
});

/* ---------- image upload ---------- */

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const safe = path
        .basename(file.originalname, path.extname(file.originalname))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'image';
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${safe}-${Date.now().toString(36)}${ext}`);
    },
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WebP or AVIF images are allowed'));
    }
    cb(null, true);
  },
});

router.post('/upload', requireAuth, requireAdmin, (req, res) => {
  upload.array('images', 6)(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.files?.length) return res.status(400).json({ error: 'No image was sent' });
    // The storefront reads these back from /uploads.
    res.json({ images: req.files.map((f) => `/uploads/${f.filename}`) });
  });
});

/* ---------- product video ----------
   One short clip per product (5-10 seconds). The dashboard shrinks it in the
   browser first; the limit stays under what one request to a Netlify
   Function can carry. */
const VIDEO_TYPES = { 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' };
export const VIDEO_MAX = Math.floor(5.5 * 1024 * 1024);

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const safe = path
        .basename(file.originalname, path.extname(file.originalname))
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'video';
      cb(null, `${safe}-${Date.now().toString(36)}${VIDEO_TYPES[file.mimetype.split(';')[0]] || '.mp4'}`);
    },
  }),
  limits: { fileSize: VIDEO_MAX, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!VIDEO_TYPES[file.mimetype.split(';')[0]]) return cb(new Error('Use an MP4, WebM or MOV video'));
    cb(null, true);
  },
});

router.post('/upload-video', requireAuth, requireAdmin, (req, res) => {
  videoUpload.single('video')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ error: 'This video is too large. Keep it to about 10 seconds.' });
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No video was sent' });
    res.json({ video: `/uploads/${req.file.filename}` });
  });
});

export default router;
