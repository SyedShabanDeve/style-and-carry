/**
 * Where photos and the server's backup copies are kept.
 *
 * On a normal server they are folders on disk: photos in UPLOAD_DIR (or
 * backend/uploads) and backup copies in DATA_DIR/snapshots. On Netlify there
 * is no lasting disk, so lambda.mjs swaps in Netlify Blobs with useStorage().
 * Every method is async so both work the same way.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = () => process.env.UPLOAD_DIR || path.join(HERE, '..', 'uploads');
const snapDir = () => path.join(process.env.DATA_DIR || path.join(HERE, '..', 'data'), 'snapshots');

/** A key is our own `<time>__<reason>` name: never a path. */
const safeKey = (key) => /^[A-Za-z0-9_-]{1,80}$/.test(String(key || ''));

const disk = {
  async hasUpload(name) {
    return fs.existsSync(path.join(uploadDir(), path.basename(name)));
  },
  async putUpload(name, buffer) {
    fs.mkdirSync(uploadDir(), { recursive: true });
    fs.writeFileSync(path.join(uploadDir(), path.basename(name)), buffer);
  },
  async listSnapshots() {
    if (!fs.existsSync(snapDir())) return [];
    return fs
      .readdirSync(snapDir())
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.slice(0, -5))
      .filter(safeKey);
  },
  async getSnapshot(key) {
    if (!safeKey(key)) return null;
    const file = path.join(snapDir(), `${key}.json`);
    return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  },
  async putSnapshot(key, value) {
    if (!safeKey(key)) throw new Error('Bad backup name');
    fs.mkdirSync(snapDir(), { recursive: true });
    fs.writeFileSync(path.join(snapDir(), `${key}.json`), JSON.stringify(value));
  },
  async deleteSnapshot(key) {
    if (!safeKey(key)) return;
    const file = path.join(snapDir(), `${key}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  },
};

let impl = disk;

export const storage = {
  hasUpload: (name) => impl.hasUpload(name),
  putUpload: (name, buffer) => impl.putUpload(name, buffer),
  listSnapshots: () => impl.listSnapshots(),
  getSnapshot: (key) => (safeKey(key) ? impl.getSnapshot(key) : Promise.resolve(null)),
  putSnapshot: (key, value) => impl.putSnapshot(key, value),
  deleteSnapshot: (key) => impl.deleteSnapshot(key),
};

/** Swap in another place to keep files (Netlify Blobs, see lambda.mjs). */
export function useStorage(custom) {
  impl = { ...disk, ...custom };
}

export { safeKey };
