/**
 * Newsletter sign-ups. Shoppers add their email from the homepage; the owner
 * sees the list in the dashboard and can download it as a spreadsheet.
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { read, update, uid } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { str } from '../lib/clean.js';

const router = Router();

const joinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sign-ups from this connection. Please try again later.' },
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

router.post('/', joinLimiter, (req, res) => {
  const email = str(req.body?.email, 120).toLowerCase();
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });

  const exists = read().subscribers.some((s) => s.email === email);
  if (!exists) {
    update((db) => db.subscribers.unshift({ id: uid('sub'), email, createdAt: new Date().toISOString() }));
  }
  // Same answer either way, so the form cannot be used to test who is signed up.
  res.status(201).json({ ok: true, message: 'You are on the list. Thank you!' });
});

router.get('/', requireAuth, requireAdmin, (req, res) => {
  res.json({ subscribers: read().subscribers });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  update((db) => {
    db.subscribers = db.subscribers.filter((s) => s.id !== req.params.id);
  });
  res.json({ ok: true });
});

export default router;
