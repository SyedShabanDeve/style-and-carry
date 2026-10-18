/**
 * The shape of a backup, shared by the dashboard's backup routes and the
 * weekly scheduled function on Netlify. No disk or network access here.
 *
 * A backup is one JSON "envelope":
 *   { backupVersion, app, createdAt, reason, by, storeName, counts, data }
 * where `data` is the whole store database: products, categories, homepage
 * content, settings, admins, orders, reviews and subscribers. Photos are
 * referenced from `data` as /uploads/<name>; the dashboard's download adds
 * the files themselves to the zip.
 */

export const BACKUP_VERSION = 1;
export const KEEP_COPIES = 12; // server copies kept (about three months of weeks)
export const REMIND_AFTER_DAYS = 7;

const PHOTO = /\/uploads\/([A-Za-z0-9][A-Za-z0-9._-]{0,150}\.(?:jpe?g|png|webp|avif|mp4|webm|mov))/gi;

/** Every uploaded photo the store data points at, by file name. */
export function photoNames(db) {
  const names = new Set();
  for (const m of JSON.stringify(db || {}).matchAll(PHOTO)) names.add(m[1]);
  return [...names];
}

export function counts(db) {
  return {
    products: db?.products?.length || 0,
    categories: db?.categories?.length || 0,
    admins: db?.users?.length || 0,
    orders: db?.orders?.length || 0,
    reviews: db?.reviews?.length || 0,
    subscribers: db?.subscribers?.length || 0,
    photos: photoNames(db).length,
  };
}

/** A copy safe to hand out: the saved email password never leaves the server. */
export function withoutSecrets(db) {
  const copy = structuredClone(db);
  if (copy.mail && copy.mail.pass) copy.mail = { ...copy.mail, pass: '' };
  return copy;
}

export function envelope(db, { reason = 'manual', by = '', secrets = false } = {}) {
  return {
    backupVersion: BACKUP_VERSION,
    app: 'style-and-carry',
    createdAt: new Date().toISOString(),
    reason,
    by,
    storeName: db?.settings?.storeName || 'Style & Carry',
    counts: counts(db),
    data: secrets ? structuredClone(db) : withoutSecrets(db),
  };
}

/** "2026-10-17T07-30-00-123Z__weekly": sorts by time, safe as a file or blob name. */
export function snapshotKey(reason = 'manual', at = new Date()) {
  const r = String(reason).replace(/[^a-z-]/gi, '').slice(0, 20) || 'manual';
  return `${at.toISOString().replace(/[:.]/g, '-')}__${r}`;
}

export function parseKey(key) {
  const [stamp, reason = 'manual'] = String(key).split('__');
  const iso = stamp.replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/, '$1:$2:$3.$4Z');
  const t = Date.parse(iso);
  return { key, reason, createdAt: Number.isFinite(t) ? new Date(t).toISOString() : null };
}

/** Newest first. */
export function sortKeys(keys) {
  return [...keys].sort().reverse();
}

/** The copies beyond the newest KEEP_COPIES, to delete. */
export function keysToPrune(keys) {
  return sortKeys(keys).slice(KEEP_COPIES);
}

/**
 * Checks that a backup's data looks like a whole store before it replaces
 * anything. Returns a sentence to show the owner, or null when it is fine.
 */
export function problemWith(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return 'This file is not a Style & Carry backup.';
  for (const k of ['products', 'categories', 'users']) {
    if (!Array.isArray(data[k])) return `This backup is missing its ${k === 'users' ? 'admins' : k}.`;
  }
  for (const k of ['settings', 'content']) {
    if (!data[k] || typeof data[k] !== 'object') return `This backup is missing its ${k}.`;
  }
  if (!data.users.length) return 'This backup has no admin accounts, so nobody could sign in. It was not restored.';
  if (data.products.some((p) => !p || !p.id || !p.name)) return 'Some products in this backup are damaged. It was not restored.';
  return null;
}
