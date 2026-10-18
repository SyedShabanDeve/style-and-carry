/**
 * Small input cleaners shared by the routes. Everything that arrives from a
 * browser goes through one of these before it is stored.
 */

/** Trimmed string, cut to `max` characters. Non-strings become ''. */
export const str = (v, max = 300) =>
  typeof v === 'string' || typeof v === 'number' ? String(v).trim().slice(0, max) : '';

/**
 * An image reference we are willing to store: an upload, a file in the
 * site's /img folder, or a bare product-image name like "metro-trifold-1".
 */
export function imagePath(v) {
  const s = str(v, 300);
  if (!s) return '';
  if (/^\/(uploads|img)\/[\w./-]+$/i.test(s) && !s.includes('..')) return s;
  if (/^[\w-]+$/.test(s)) return s;
  return '';
}

/** An uploaded product video (short clip), or empty. */
export function videoPath(v) {
  const s = str(v, 300);
  return /^\/uploads\/[\w.-]+\.(mp4|webm|mov)$/i.test(s) && !s.includes('..') ? s : '';
}

/** A link for a button: a path on this site, or an http(s) address. */
export function link(v) {
  const s = str(v, 300);
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//')) return s;
  if (/^https?:\/\/[^\s]+$/i.test(s)) return s;
  return '';
}

export const bool = (v, fallback = true) => (v === undefined ? fallback : Boolean(v));

export const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/** Cap a list and clean each entry; entries the cleaner rejects are dropped. */
export const list = (v, max, fn) => (Array.isArray(v) ? v.slice(0, max).map(fn).filter(Boolean) : []);
