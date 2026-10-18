/**
 * Runs the whole API as one Netlify Function, for a test copy of the shop.
 *
 * Netlify Functions have no lasting disk, so the database and any uploaded
 * photos live in Netlify Blobs:
 *   - before each request the database is loaded from the "shop" store,
 *   - after it, the database is saved back if anything changed,
 *   - photos uploaded from the dashboard are moved into the "uploads" store,
 *     and /uploads/<name> is answered from there.
 *
 * The first request on a new site starts from netlify-seed.mjs, a copy of
 * backend/data/db.json made at deploy time (see README). Netlify calls this
 * through netlify/api.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import serverless from 'serverless-http';
import { getStore } from '@netlify/blobs';
// Written at deploy time from data/db.json; not in git (see README).
import seed from './netlify-seed.mjs';

// Only /tmp is writable inside a function. Set before the app loads.
process.env.DATA_DIR ||= '/tmp/sc-data';
process.env.UPLOAD_DIR ||= '/tmp/sc-uploads';

const MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

let ready;
const init = () =>
  (ready ||= (async () => {
    const { default: app } = await import('./app.js');
    const db = await import('./db.js');
    // Photos and the server's backup copies live in Blobs here, not on disk.
    const { useStorage } = await import('./lib/storage.js');
    const photos = () => getStore({ name: 'uploads', consistency: 'strong' });
    const copies = () => getStore({ name: 'backups', consistency: 'strong' });
    useStorage({
      hasUpload: async (name) => Boolean(await photos().getMetadata(name)),
      putUpload: (name, buffer) => photos().set(name, new Blob([buffer])),
      listSnapshots: async () => (await copies().list()).blobs.map((b) => b.key),
      getSnapshot: (key) => copies().get(key, { type: 'json' }),
      putSnapshot: (key, value) => copies().setJSON(key, value),
      deleteSnapshot: (key) => copies().delete(key),
    });
    return { db, handle: serverless(app) };
  })());

/** Answers one request, given as a Lambda-style event (see netlify/api.mjs). */
export const handler = async (event, context) => {
  const shop = getStore({ name: 'shop', consistency: 'strong' });
  const uploads = getStore({ name: 'uploads', consistency: 'strong' });

  // Requests arrive either as /api/... or as /.netlify/functions/api/api/...
  event.path = (event.path || '/').replace(/^\/\.netlify\/functions\/api/, '') || '/';

  if (event.path.startsWith('/uploads/')) {
    const name = path.basename(event.path);
    const buf = await uploads.get(name, { type: 'arrayBuffer' });
    if (!buf) return { statusCode: 404, body: 'Not found' };
    return {
      statusCode: 200,
      headers: {
        'Content-Type': MIME[path.extname(name).toLowerCase()] || 'application/octet-stream',
        // Upload names are unique and never reused, so the file can be kept
        // for good, by browsers and by Netlify's CDN (no function call after
        // the first visit).
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Netlify-CDN-Cache-Control': 'public, durable, max-age=31536000, immutable',
      },
      body: Buffer.from(buf).toString('base64'),
      isBase64Encoded: true,
    };
  }

  const { db, handle } = await init();
  let dirty = false;
  db.setOnWrite(() => {
    dirty = true;
  });
  const saved = await shop.get('db', { type: 'json' });
  if (db.hydrate(saved || structuredClone(seed))) dirty = true;
  if (!saved) dirty = true;

  const res = await handle(event, context);

  if (dirty) await shop.setJSON('db', db.read());

  const dir = process.env.UPLOAD_DIR;
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      const file = path.join(dir, f);
      await uploads.set(f, new Blob([fs.readFileSync(file)]));
      fs.unlinkSync(file);
    }
  }
  return res;
};
