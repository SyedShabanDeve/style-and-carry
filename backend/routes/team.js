/**
 * Dashboard team: the store owner invites admins by email.
 *
 * 1. The owner adds a name and email. The account is created as "pending"
 *    and an email with a one-time verification link is sent.
 * 2. The admin clicks the link. Their email is marked verified, a password
 *    is generated, and a second email tells them how to sign in.
 * 3. On first sign-in the dashboard asks them to change that password.
 *
 * Links are single use and expire after 48 hours. Only a hash of each link
 * token is stored, so a copy of the database cannot be used to verify.
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { read, update, uid } from '../db.js';
import { requireAuth, requireOwner, requireAdmin } from '../middleware/auth.js';
import { sendMail, mailConfig, mailReady, esc } from '../lib/mailer.js';
import { str } from '../lib/clean.js';

const router = Router();
const LINK_HOURS = 48;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

/** 12 characters, easy to read and type: no 0/O or 1/l/I. */
function makePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '@#$%*!'];
  const all = sets.join('');
  const pick = (s) => s[crypto.randomInt(s.length)];
  const chars = [...sets.map(pick), ...Array.from({ length: 8 }, () => pick(all))];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Where links should point: APP_URL in .env, else the dashboard's own address. */
function baseUrl(req) {
  const env = (process.env.APP_URL || '').replace(/\/+$/, '');
  if (env) return env;
  const origin = req.get('origin');
  if (origin && /^https?:\/\/[^/]+$/.test(origin)) return origin;
  return `${req.protocol}://${req.get('host')}`;
}

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email || u.username,
  role: u.role,
  status: u.status || 'active',
  createdAt: u.createdAt,
  invitedAt: u.invitedAt || null,
  verifiedAt: u.verifiedAt || null,
  linkExpires: u.status === 'pending' ? u.verifyExpires || null : null,
  phone: u.phone || '',
  addedByName: u.addedByName || '',
});

const PHONE = /^[0-9+ -]{7,20}$/;

/** Creates a fresh link for a pending admin and emails it. */
async function sendInvite(req, userId) {
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + LINK_HOURS * 3600 * 1000).toISOString();
  const user = update((db) => {
    const u = db.users.find((x) => x.id === userId);
    u.verifyTokenHash = sha(token);
    u.verifyExpires = expires;
    u.invitedAt = new Date().toISOString();
    return u;
  });
  const store = read().settings?.storeName || 'Style & Carry';
  const inviter = req.user?.name || 'The store owner';
  const link = `${baseUrl(req)}/admin/verify?token=${token}`;
  const mail = await sendMail({
    to: user.email,
    subject: `You have been invited to the ${store} dashboard`,
    heading: 'Please verify your email',
    lines: [
      `Hello ${esc(user.name)},`,
      `${esc(inviter)} has added you as an admin of the <b>${esc(store)}</b> store dashboard.`,
      `Press the button below to verify your email address. Straight after, we will email you your sign-in details.`,
      `This link works once and expires in ${LINK_HOURS} hours.`,
    ],
    button: { label: 'Verify my email', href: link },
    footer: `If you were not expecting this, you can ignore this email and nothing will happen.`,
  });
  return { user, link, mail };
}

/* ---------- every admin: see the team, add an admin with a password ---------- */

router.get('/', requireAuth, requireAdmin, (req, res) => {
  const owner = req.user.role === 'owner';
  res.json({ users: read().users.map(publicUser), mailReady: owner ? mailReady() : undefined, canManage: owner });
});

/**
 * Adds an admin straight away with the password given here, no email needed.
 * The owner and admins can both do this; only the owner can remove anyone.
 */
router.post('/direct', requireAuth, requireAdmin, (req, res) => {
  const name = str(req.body?.name, 60);
  const email = str(req.body?.email, 120).toLowerCase();
  const phone = str(req.body?.phone, 20);
  const password = String(req.body?.password || '');
  if (name.length < 2) return res.status(400).json({ error: 'Please enter the admin’s name' });
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (phone && !PHONE.test(phone)) return res.status(400).json({ error: 'Please enter a valid phone number, like 0300 1234567' });
  if (password.length < 8) return res.status(400).json({ error: 'The password needs at least 8 characters' });
  if (read().users.some((u) => (u.email || u.username).toLowerCase() === email)) {
    return res.status(409).json({ error: 'Someone with this email is already on the team' });
  }
  const user = {
    id: uid('usr'),
    username: email,
    email,
    name,
    phone,
    role: 'admin',
    status: 'active',
    passwordHash: bcrypt.hashSync(password, 10),
    invitedBy: req.user.id,
    addedByName: req.user.name || req.user.email,
    createdAt: new Date().toISOString(),
  };
  update((db) => db.users.push(user));
  res.status(201).json({ user: publicUser(user) });
});

/* ---------- owner only ---------- */

/** The owner sets a new password for an admin, e.g. when they forgot it. */
router.put('/:id/password', requireAuth, requireOwner, (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length < 8) return res.status(400).json({ error: 'The password needs at least 8 characters' });
  const u = read().users.find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Admin not found' });
  if (u.role === 'owner') return res.status(400).json({ error: 'Change your own password under Settings' });
  update((db) => {
    const x = db.users.find((y) => y.id === u.id);
    x.passwordHash = bcrypt.hashSync(password, 10);
    x.mustChangePassword = false;
    if (x.status === 'pending') {
      x.status = 'active';
      delete x.verifyTokenHash;
      delete x.verifyExpires;
    }
    x.updatedAt = new Date().toISOString();
  });
  res.json({ ok: true, user: publicUser(read().users.find((x) => x.id === u.id)) });
});

router.post('/', requireAuth, requireOwner, async (req, res) => {
  const name = str(req.body?.name, 60);
  const email = str(req.body?.email, 120).toLowerCase();
  if (name.length < 2) return res.status(400).json({ error: 'Please enter the admin’s name' });
  if (!EMAIL.test(email)) return res.status(400).json({ error: 'Please enter a valid email address' });
  if (read().users.some((u) => (u.email || u.username).toLowerCase() === email)) {
    return res.status(409).json({ error: 'Someone with this email is already on the team' });
  }

  const now = new Date().toISOString();
  const user = {
    id: uid('usr'),
    username: email,
    email,
    name,
    role: 'admin',
    status: 'pending',
    passwordHash: '',
    invitedBy: req.user.id,
    createdAt: now,
  };
  update((db) => db.users.push(user));
  const out = await sendInvite(req, user.id);

  res.status(201).json({
    user: publicUser(out.user),
    emailSent: out.mail.sent,
    // Only when the email could not be sent, so the owner can pass it on.
    link: out.mail.sent ? undefined : out.link,
    reason: out.mail.sent ? undefined : out.mail.reason,
  });
});

router.post('/:id/resend', requireAuth, requireOwner, async (req, res) => {
  const u = read().users.find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Admin not found' });
  if (u.status !== 'pending') return res.status(400).json({ error: 'This admin has already verified their email' });
  const out = await sendInvite(req, u.id);
  res.json({
    user: publicUser(out.user),
    emailSent: out.mail.sent,
    link: out.mail.sent ? undefined : out.link,
    reason: out.mail.sent ? undefined : out.mail.reason,
  });
});

router.delete('/:id', requireAuth, requireOwner, (req, res) => {
  const u = read().users.find((x) => x.id === req.params.id);
  if (!u) return res.status(404).json({ error: 'Admin not found' });
  if (u.role === 'owner') return res.status(400).json({ error: 'The store owner cannot be removed' });
  if (u.id === req.user.id) return res.status(400).json({ error: 'You cannot remove yourself' });
  update((db) => {
    db.users = db.users.filter((x) => x.id !== u.id);
  });
  res.json({ ok: true });
});

/* ---------- email settings (owner only) ---------- */

router.get('/mail', requireAuth, requireOwner, (req, res) => {
  const c = mailConfig();
  res.json({
    mail: { host: c.host, port: c.port, secure: c.secure, user: c.user, from: c.from, hasPassword: Boolean(c.pass), fromEnv: c.fromEnv },
  });
});

router.put('/mail', requireAuth, requireOwner, (req, res) => {
  const b = req.body || {};
  const host = str(b.host, 120);
  const port = Number(b.port) || 587;
  if (host && !/^[a-z0-9.-]+$/i.test(host)) return res.status(400).json({ error: 'The server name looks wrong, like smtp.gmail.com' });
  if (port < 1 || port > 65535) return res.status(400).json({ error: 'The port must be a number, usually 587 or 465' });
  const user = str(b.user, 120);
  const from = str(b.from, 120);
  if (from && !EMAIL.test(from)) return res.status(400).json({ error: 'The "from" address must be an email' });

  update((db) => {
    const prev = db.mail || {};
    db.mail = {
      host,
      port,
      secure: Boolean(b.secure),
      user,
      from,
      // An empty box keeps the saved password.
      pass: b.pass === null ? '' : typeof b.pass === 'string' && b.pass.trim() ? b.pass.trim() : prev.pass || '',
      updatedAt: new Date().toISOString(),
    };
  });
  res.json({ ok: true, mailReady: mailReady() });
});

router.post('/mail/test', requireAuth, requireOwner, async (req, res) => {
  const me = read().users.find((u) => u.id === req.user.id);
  const to = me?.email || me?.username;
  if (!EMAIL.test(to || '')) return res.status(400).json({ error: 'Your account has no email address to send to' });
  const r = await sendMail({
    to,
    subject: 'Test email from your store dashboard',
    heading: 'Email is working',
    lines: ['This is a test from your store dashboard. Invitations and sign-in details will be sent the same way.'],
  });
  if (!r.sent) return res.status(502).json({ error: `The email could not be sent: ${r.reason}` });
  res.json({ ok: true, to });
});

/* ---------- public: the link in the invitation ---------- */

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/verify', verifyLimiter, async (req, res) => {
  const token = String(req.body?.token || '');
  if (!/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'This verification link is not valid.' });

  const hash = sha(token);
  const u = read().users.find((x) => x.verifyTokenHash === hash);
  if (!u) return res.status(400).json({ error: 'This link has already been used or is not valid. Ask the store owner to send a new one.' });
  if (new Date(u.verifyExpires) < new Date()) {
    return res.status(410).json({ error: 'This link has expired. Ask the store owner to send you a new one.' });
  }

  const password = makePassword();
  update((db) => {
    const x = db.users.find((y) => y.id === u.id);
    x.status = 'active';
    x.verifiedAt = new Date().toISOString();
    x.passwordHash = bcrypt.hashSync(password, 10);
    x.mustChangePassword = true;
    delete x.verifyTokenHash;
    delete x.verifyExpires;
  });

  const store = read().settings?.storeName || 'Style & Carry';
  const login = `${baseUrl(req)}/admin/login`;
  const mail = await sendMail({
    to: u.email,
    subject: `Your ${store} dashboard sign-in details`,
    heading: 'Your email is verified',
    lines: [
      `Hello ${esc(u.name)}, you can now sign in to the <b>${esc(store)}</b> dashboard.`,
      `<b>Email:</b> ${esc(u.email)}<br><b>Password:</b> <span style="font-family:Consolas,monospace;font-size:16px;background:#f3f0eb;padding:2px 8px;border-radius:6px">${esc(password)}</span>`,
      `For your safety, please change this password after you sign in (Settings → Change your password).`,
    ],
    button: { label: 'Sign in to the dashboard', href: login },
    footer: 'Keep this email private. Anyone with these details can sign in to the dashboard.',
  });

  res.json({
    ok: true,
    email: u.email,
    emailSent: mail.sent,
    // Only if the email failed, so the new admin is never locked out.
    password: mail.sent ? undefined : password,
  });
});

export default router;
