/**
 * Backups, for the store owner only.
 *
 * - The dashboard downloads a full backup to the owner's computer: this
 *   route hands over the data, the browser adds every photo and saves a zip.
 *   When that finishes it reports back, so the dashboard can remind the
 *   owner again after REMIND_AFTER_DAYS ("Backup needed").
 * - The server also keeps its own copies: one each week (made here when the
 *   dashboard checks in, and by the scheduled function on Netlify), one on
 *   request, and one automatically before every restore. The newest
 *   KEEP_COPIES are kept.
 * - A restore puts back products, categories, homepage, settings, admins,
 *   orders, reviews and subscribers, from a downloaded file or a server copy.
 *   Missing photos are uploaded first, under their original names.
 *
 * Backups hold admins' password hashes and customers' details, which is
 * why only the owner can make, see or restore them.
 */
import { Router } from 'express';
import multer from 'multer';
import { read, update, replaceAll } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { storage } from '../lib/storage.js';
import {
  envelope,
  counts,
  photoNames,
  withoutSecrets,
  snapshotKey,
  parseKey,
  sortKeys,
  keysToPrune,
  problemWith,
  REMIND_AFTER_DAYS,
} from '../lib/snapshot.js';

const router = Router();
const DAY = 24 * 3600 * 1000;
const PHOTO_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(jpe?g|png|webp|avif)$/i;

router.use(requireAuth, (req, res, next) => {
  if (req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Only the store owner can use backups', code: 'FORBIDDEN' });
  }
  next();
});

const who = (req) => req.user?.name || req.user?.email || 'Owner';

/** Saves a copy of the store on the server and trims the oldest ones. */
async function saveCopy(reason, by) {
  const key = snapshotKey(reason);
  await storage.putSnapshot(key, envelope(read(), { reason, by, secrets: true }));
  for (const old of keysToPrune(await storage.listSnapshots())) await storage.deleteSnapshot(old);
  return key;
}

/** Makes this week's copy if the newest weekly one is a week old or more. */
async function weeklyCopyIfDue() {
  const weekly = sortKeys(await storage.listSnapshots())
    .map(parseKey)
    .filter((c) => c.reason === 'weekly' && c.createdAt);
  const newest = weekly[0];
  if (newest && Date.now() - Date.parse(newest.createdAt) < REMIND_AFTER_DAYS * DAY) return null;
  return saveCopy('weekly', 'Automatic');
}

async function status() {
  const meta = read().meta || {};
  const last = meta.lastBackupAt ? Date.parse(meta.lastBackupAt) : null;
  const daysSince = last ? Math.floor((Date.now() - last) / DAY) : null;
  return {
    lastBackupAt: meta.lastBackupAt || null,
    lastBackupBy: meta.lastBackupBy || null,
    lastRestoreAt: meta.restoredAt || null,
    remindAfterDays: REMIND_AFTER_DAYS,
    daysSince,
    due: !last || Date.now() - last >= REMIND_AFTER_DAYS * DAY,
    current: counts(read()),
    copies: sortKeys(await storage.listSnapshots()).map(parseKey),
  };
}

/** Replaces the store with a backup's data, after saving a safety copy. */
async function restoreFrom(data, req, source) {
  const problem = problemWith(data);
  if (problem) {
    const err = new Error(problem);
    err.status = 400;
    throw err;
  }
  const safety = await saveCopy('before-restore', who(req));
  const current = read();
  // The saved email password is never in a downloaded file: keep today's.
  const mail = { ...(data.mail || {}) };
  if (!mail.pass && current.mail?.pass) mail.pass = current.mail.pass;
  replaceAll(data, {
    mail,
    meta: { ...(current.meta || {}), restoredAt: new Date().toISOString(), restoredBy: who(req), restoredFrom: source },
  });
  return { ok: true, safetyCopy: safety, counts: counts(read()) };
}

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((err) => res.status(err.status || 500).json({ error: err.message || 'The backup could not be completed' }));

/* ---------- status and reminder ---------- */

router.get(
  '/status',
  wrap(async (req, res) => {
    const made = await weeklyCopyIfDue();
    res.json({ ...(await status()), madeWeeklyCopy: made });
  })
);

/* ---------- download to the owner's computer ---------- */

router.get('/data', (req, res) => {
  const env = envelope(read(), { reason: 'download', by: who(req) });
  res.set('Cache-Control', 'no-store');
  res.json({ ...env, photos: photoNames(env.data) });
});

router.post(
  '/done',
  wrap(async (req, res) => {
    const photos = Math.max(0, Number(req.body?.photos) || 0);
    update((db) => {
      db.meta = { ...(db.meta || {}), lastBackupAt: new Date().toISOString(), lastBackupBy: who(req), lastBackupPhotos: photos };
    });
    res.json(await status());
  })
);

/* ---------- copies kept on the server ---------- */

router.post(
  '/copies',
  wrap(async (req, res) => {
    const key = await saveCopy('manual', who(req));
    res.status(201).json({ key, ...(await status()) });
  })
);

router.get(
  '/copies/:key',
  wrap(async (req, res) => {
    const copy = await storage.getSnapshot(req.params.key);
    if (!copy) return res.status(404).json({ error: 'That backup copy was not found' });
    res.set('Cache-Control', 'no-store');
    res.json({ ...copy, data: withoutSecrets(copy.data), photos: photoNames(copy.data) });
  })
);

router.post(
  '/copies/:key/restore',
  wrap(async (req, res) => {
    const copy = await storage.getSnapshot(req.params.key);
    if (!copy) return res.status(404).json({ error: 'That backup copy was not found' });
    res.json(await restoreFrom(copy.data, req, `server copy ${req.params.key}`));
  })
);

/* ---------- restore from a downloaded file ---------- */

router.post(
  '/photos/check',
  wrap(async (req, res) => {
    const names = (Array.isArray(req.body?.names) ? req.body.names : []).filter((n) => PHOTO_NAME.test(n)).slice(0, 3000);
    const missing = [];
    for (let i = 0; i < names.length; i += 20) {
      const part = names.slice(i, i + 20);
      const have = await Promise.all(part.map((n) => storage.hasUpload(n)));
      part.forEach((n, j) => !have[j] && missing.push(n));
    }
    res.json({ missing });
  })
);

const photoUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024, files: 1 } });

router.post('/photo', (req, res) => {
  photoUpload.single('file')(req, res, async (err) => {
    try {
      if (err) return res.status(400).json({ error: err.message });
      const name = String(req.body?.name || req.file?.originalname || '');
      if (!req.file || !PHOTO_NAME.test(name)) return res.status(400).json({ error: 'Send one photo with its original name' });
      if (await storage.hasUpload(name)) return res.json({ name, saved: false, alreadyThere: true });
      await storage.putUpload(name, req.file.buffer);
      res.status(201).json({ name, saved: true });
    } catch (e) {
      res.status(500).json({ error: e.message || 'The photo could not be saved' });
    }
  });
});

router.post(
  '/restore',
  wrap(async (req, res) => {
    const backup = req.body?.backup;
    const data = backup?.data && backup.app ? backup.data : backup;
    res.json(await restoreFrom(data, req, 'downloaded file'));
  })
);

export default router;
