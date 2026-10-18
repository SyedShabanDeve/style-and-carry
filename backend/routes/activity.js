/**
 * Notifications for the store owner: what each admin changed, and when.
 * The log itself is written by lib/activity.js.
 */
import { Router } from 'express';
import { read, update } from '../db.js';
import { requireAuth, requireOwner } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth, requireOwner);

/** Unread = changes made by someone else since the owner last looked. */
function unreadFor(db, user) {
  const seen = user?.activitySeenAt ? Date.parse(user.activitySeenAt) : 0;
  return (db.activity || []).filter((a) => a.by?.id !== user?.id && Date.parse(a.at) > seen).length;
}

router.get('/', (req, res) => {
  const db = read();
  const me = db.users.find((u) => u.id === req.user.id);
  const limit = Math.min(300, Math.max(1, Number(req.query.limit) || 100));
  res.set('Cache-Control', 'no-store');
  res.json({
    items: (db.activity || []).slice(0, limit),
    unread: unreadFor(db, me),
    seenAt: me?.activitySeenAt || null,
  });
});

router.post('/seen', (req, res) => {
  const at = new Date().toISOString();
  update((db) => {
    const me = db.users.find((u) => u.id === req.user.id);
    if (me) me.activitySeenAt = at;
  });
  res.json({ ok: true, seenAt: at, unread: 0 });
});

export default router;
