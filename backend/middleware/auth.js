/**
 * JWT auth for the admin dashboard.
 *
 * Sessions are short on purpose: the token carries a 10-minute expiry, so a
 * dashboard left open on a shared phone stops working on its own. The frontend
 * reads `expiresAt` off the login response to run its countdown, and calls
 * POST /api/auth/refresh to mint a fresh 10 minutes while the owner is active.
 */
import jwt from 'jsonwebtoken';
import { read } from '../db.js';

/** How long an admin session lasts, in seconds. */
export const SESSION_SECONDS = Number(process.env.SESSION_MINUTES || 10) * 60;

const SECRET =
  process.env.JWT_SECRET ||
  'style-and-carry-dev-secret-change-me-in-production-0f3a91';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn(
    '[auth] JWT_SECRET is not set. Set it in backend/.env before going live.'
  );
}

export function signToken(user) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role, name: user.name },
    SECRET,
    { expiresIn: SESSION_SECONDS }
  );
  return {
    token,
    expiresAt: (issuedAt + SESSION_SECONDS) * 1000, // ms, for the client clock
    expiresIn: SESSION_SECONDS,
  };
}

function bearer(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : null;
}

/** Rejects anything without a live token. Attaches req.user on success. */
export function requireAuth(req, res, next) {
  const token = bearer(req);
  if (!token) {
    return res.status(401).json({ error: 'Please sign in to continue', code: 'NO_TOKEN' });
  }
  try {
    const payload = jwt.verify(token, SECRET);
    const user = read().users.find((u) => u.id === payload.sub);
    if (!user || user.status === 'pending') {
      return res.status(401).json({ error: 'This account no longer exists. Please sign in again.', code: 'NO_USER' });
    }
    req.user = { id: user.id, username: user.username, email: user.email || user.username, role: user.role, name: user.name };
    req.tokenExp = payload.exp * 1000;
    next();
  } catch (err) {
    const expired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      error: expired ? 'Session expired. Please sign in again.' : 'Your session is not valid. Please sign in again.',
      code: expired ? 'EXPIRED' : 'INVALID',
    });
  }
}

/** Use after requireAuth when a route is admin-only. The owner is an admin too. */
export function requireAdmin(req, res, next) {
  if (!['owner', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({ error: 'Only store admins can do this', code: 'FORBIDDEN' });
  }
  next();
}

/** Use after requireAuth for things only the store owner may do, like managing the team. */
export function requireOwner(req, res, next) {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Only the store owner can manage the team', code: 'FORBIDDEN' });
  }
  next();
}
