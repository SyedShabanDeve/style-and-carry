/**
 * Activity log: who changed what in the dashboard.
 *
 * A middleware watches every successful change an admin makes (products,
 * categories, website, settings, orders, reviews, team, backups) and writes
 * one plain sentence about it, with the admin's name and email. The owner
 * sees these as notifications. Shoppers' actions (placing an order, writing
 * a review) are not logged here.
 */
import { read, update, uid } from '../db.js';

export const KEEP_ACTIVITY = 300;

const q = (s) => `“${String(s || '').slice(0, 80)}”`;

/** What the request is about, read before it runs (a delete removes it). */
function lookup(path) {
  const db = read();
  let m;
  if ((m = path.match(/^\/products\/([^/]+)/))) return db.products.find((p) => p.id === m[1])?.name;
  if ((m = path.match(/^\/categories\/([^/]+)/))) return db.categories.find((c) => c.id === m[1])?.name;
  if ((m = path.match(/^\/orders\/([^/]+)/))) return db.orders.find((o) => o.id === m[1])?.orderNo;
  if ((m = path.match(/^\/team\/([^/]+)/))) {
    const u = db.users.find((x) => x.id === m[1]);
    return u && (u.name ? `${u.name} (${u.email || u.username})` : u.email || u.username);
  }
  if ((m = path.match(/^\/reviews\/([^/]+)/))) return db.reviews.find((r) => r.id === m[1])?.name;
  return '';
}

/* Path words that are part of a route, not the id of something. */
const WORDS = new Set([
  'products', 'categories', 'orders', 'reviews', 'newsletter', 'team', 'direct', 'mail', 'test',
  'resend', 'password', 'status', 'payment', 'auth', 'profile', 'backup', 'done', 'copies',
  'restore', 'settings', 'content', 'admin',
]);
const routeOf = (path) =>
  '/' + path.split('/').filter(Boolean).map((s) => (WORDS.has(s) ? s : ':id')).join('/');

/** One sentence for a change, or null to leave it out of the log. */
function describe(method, path, body, out, before) {
  const k = `${method} ${routeOf(path)}`;
  switch (k) {
    case 'POST /products':
      return ['product', `added the product ${q(out?.product?.name)}`, out?.product?.id && `/admin/products/${out.product.id}`];
    case 'PUT /products/:id':
    case 'PATCH /products/:id':
      return ['product', `edited the product ${q(out?.product?.name || before)}`, out?.product?.id && `/admin/products/${out.product.id}`];
    case 'DELETE /products/:id':
      return ['product', `deleted the product ${q(before)}`];
    case 'POST /categories':
      return ['category', `added the category ${q(out?.category?.name)}`, '/admin/categories'];
    case 'PUT /categories/:id':
      return ['category', `edited the category ${q(out?.category?.name || before)}`, '/admin/categories'];
    case 'PUT /categories':
      return ['category', 'changed the order of the categories', '/admin/categories'];
    case 'DELETE /categories/:id':
      return ['category', `deleted the category ${q(before)}`, '/admin/categories'];
    case 'PUT /content':
      return ['website', 'published changes to the website', '/admin/homepage'];
    case 'PUT /settings':
      return ['settings', 'changed the store settings', '/admin/settings'];
    case 'PATCH /orders/:id/status':
      return ['order', `marked order ${before || ''} as ${body?.status || 'updated'}`, '/admin/orders'];
    case 'PATCH /orders/:id/payment':
      return ['order', `updated the payment of order ${before || ''}`, '/admin/orders'];
    case 'DELETE /orders/:id':
      return ['order', `deleted order ${before || ''}`, '/admin/orders'];
    case 'PATCH /reviews/:id':
      return ['review', `updated a review by ${q(before)}`, '/admin/reviews'];
    case 'DELETE /reviews/:id':
      return ['review', `deleted a review by ${q(before)}`, '/admin/reviews'];
    case 'DELETE /newsletter/:id':
      return ['subscriber', 'removed a newsletter subscriber', '/admin/subscribers'];
    case 'POST /team/direct':
      return ['team', `added ${q(out?.user?.name)} (${out?.user?.email}) as an admin`, '/admin/team'];
    case 'POST /team':
      return ['team', `invited ${q(out?.user?.name)} (${out?.user?.email}) as an admin`, '/admin/team'];
    case 'DELETE /team/:id':
      return ['team', `removed the admin ${before}`, '/admin/team'];
    case 'PUT /team/:id/password':
      return ['team', `set a new password for ${before}`, '/admin/team'];
    case 'PUT /team/mail':
      return ['team', 'changed the email settings', '/admin/team'];
    case 'PUT /auth/profile':
      return ['account', `changed their name to ${q(out?.user?.name)}`];
    case 'POST /auth/password':
      return ['account', 'changed their own password'];
    case 'POST /backup/done':
      return ['backup', 'downloaded a full backup', '/admin/backup'];
    case 'POST /backup/copies':
      return ['backup', 'saved a backup copy on the server', '/admin/backup'];
    case 'POST /backup/restore':
    case 'POST /backup/copies/:id/restore':
      return ['backup', 'restored the store from a backup', '/admin/backup'];
    default:
      return null;
  }
}

/** Express middleware, mounted on /api. */
export function activityLogger(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  const path = req.path;
  if (/^\/(auth\/(login|refresh)|team\/verify|backup\/(photo|photos)|admin\/upload|activity)/.test(path)) return next();
  let before = '';
  try {
    before = lookup(path) || '';
  } catch {}
  const json = res.json.bind(res);
  res.json = (out) => {
    try {
      if (req.user && res.statusCode < 400) {
        const d = describe(req.method, path, req.body, out, before);
        if (d) {
          const [kind, text, link] = d;
          update((db) => {
            db.activity = [
              {
                id: uid('act'),
                at: new Date().toISOString(),
                by: { id: req.user.id, name: req.user.name || '', email: req.user.email || req.user.username, role: req.user.role },
                kind,
                text,
                link: link || null,
              },
              ...(db.activity || []),
            ].slice(0, KEEP_ACTIVITY);
          });
        }
      }
    } catch {}
    return json(out);
  };
  next();
}
