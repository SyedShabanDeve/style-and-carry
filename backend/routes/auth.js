import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { read, update } from '../db.js';
import { signToken, requireAuth, SESSION_SECONDS } from '../middleware/auth.js';

const router = Router();

/* Slows down password guessing without locking the owner out for long.
   Only failed attempts count, so signing in correctly never locks anyone out. */
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many wrong passwords. Please wait 10 minutes and try again.' },
});

/** What the dashboard needs to know about the signed-in person. */
const me = (u) => ({
  id: u.id,
  username: u.username,
  email: u.email || u.username,
  name: u.name,
  role: u.role,
  mustChangePassword: Boolean(u.mustChangePassword),
});

router.post('/login', loginLimiter, (req, res) => {
  // The box is labelled "Email"; an old username still works.
  const login = String(req.body?.email || req.body?.username || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!login || !password) {
    return res.status(400).json({ error: 'Please enter your email and password' });
  }

  const user = read().users.find(
    (u) => (u.email || '').toLowerCase() === login || u.username.toLowerCase() === login
  );
  if (user?.status === 'pending') {
    return res.status(403).json({ error: 'Please verify your email first. Check your inbox for the link we sent you.' });
  }
  // Same message either way, so the form cannot be used to discover accounts.
  if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
    return res.status(401).json({ error: 'That email and password do not match' });
  }

  const session = signToken(user);
  res.json({ ...session, user: me(user) });
});

/** Confirms the token is still good and reports how long is left. */
router.get('/me', requireAuth, (req, res) => {
  const user = read().users.find((u) => u.id === req.user.id);
  res.json({ user: me(user), expiresAt: req.tokenExp, expiresIn: SESSION_SECONDS });
});

/** Mints a fresh session while the owner is still working. */
router.post('/refresh', requireAuth, (req, res) => {
  const user = read().users.find((u) => u.id === req.user.id);
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  const session = signToken(user);
  res.json({ ...session, user: me(user) });
});

/** Lets anyone signed in change the name shown in the dashboard. */
router.put('/profile', requireAuth, (req, res) => {
  const name = String(req.body?.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
  if (name.length < 2) return res.status(400).json({ error: 'Please enter your name' });
  const user = update((db) => {
    const u = db.users.find((x) => x.id === req.user.id);
    if (u) {
      u.name = name;
      u.updatedAt = new Date().toISOString();
    }
    return u;
  });
  if (!user) return res.status(401).json({ error: 'Account no longer exists' });
  res.json({ user: me(user) });
});

/** Lets anyone signed in change their own password. */
router.post('/password', requireAuth, (req, res) => {
  const current = String(req.body?.current || '');
  const next = String(req.body?.next || '');

  if (next.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const user = read().users.find((u) => u.id === req.user.id);
  if (!user || !bcrypt.compareSync(current, user.passwordHash)) {
    return res.status(401).json({ error: 'Current password is wrong' });
  }

  update((db) => {
    const u = db.users.find((x) => x.id === req.user.id);
    u.passwordHash = bcrypt.hashSync(next, 10);
    u.mustChangePassword = false;
    u.updatedAt = new Date().toISOString();
  });

  res.json({ ok: true, message: 'Password changed' });
});

export default router;
