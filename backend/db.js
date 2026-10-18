/**
 * Tiny JSON-file datastore.
 *
 * Deliberately not SQLite: this store handles a handful of orders a day and a
 * JSON file needs no native build step, which keeps `npm install` working on
 * every machine and every host. Writes are atomic (write temp, then rename) so
 * a crash mid-write cannot leave a truncated database behind.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SETTINGS as DEFAULT_SETTINGS,
  CATEGORIES as DEFAULT_CATEGORIES,
  CONTENT as DEFAULT_CONTENT,
  DEFAULT_MATERIAL,
} from './defaults.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// DATA_DIR lets a host put the file somewhere writable (Netlify uses /tmp).
const DATA_DIR = process.env.DATA_DIR || path.join(HERE, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const EMPTY = {
  products: [],
  orders: [],
  users: [],
  settings: {},
  categories: [],
  content: {},
  reviews: [],
  subscribers: [],
  mail: {},
  counters: { order: 1000 },
  // when the owner last downloaded a backup, and similar housekeeping
  meta: {},
  // who changed what in the dashboard (newest first), see lib/activity.js
  activity: [],
};

let cache = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

const titleCase = (s) =>
  String(s)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());

/**
 * Brings a database written by an older version up to date. Only fills gaps:
 * anything the owner has already set or edited is left exactly as it is.
 * Returns true when something changed, so the caller can save once.
 */
function migrate(db) {
  let changed = false;

  /* Categories used to be hard-coded. Create them once, borrowing a photo
     from the first product in each. */
  if (!db.categories.length) {
    db.categories = DEFAULT_CATEGORIES.map((c, i) => {
      const sample = db.products.find((p) => p.category === c.key && p.images?.[0]);
      return {
        id: 'cat_' + c.key,
        key: c.key,
        name: c.name,
        description: c.description,
        image: sample ? '/img/' + sample.images[0] + '.webp' : '',
        sortOrder: i,
        active: true,
      };
    });
    changed = true;
  }

  /* Any category a product uses that the list does not know yet. */
  for (const p of db.products) {
    if (p.category && !db.categories.some((c) => c.key === p.category)) {
      db.categories.push({
        id: 'cat_' + p.category,
        key: p.category,
        name: titleCase(p.category),
        description: '',
        image: '',
        sortOrder: db.categories.length,
        active: true,
      });
      changed = true;
    }
  }

  /* The owner's account can never be lost. With OWNER_EMAIL (and
     OWNER_PASSWORD_HASH, a bcrypt hash, never the password itself) set on the
     host, that account is always present, active and the owner, even if the
     data is ever reset or edited by hand. The password is only used when the
     account has to be recreated, so one changed in Settings stays changed. */
  const ownerEmail = (process.env.OWNER_EMAIL || '').trim().toLowerCase();
  if (ownerEmail) {
    let owner = db.users.find((u) => (u.email || u.username || '').toLowerCase() === ownerEmail);
    if (!owner && process.env.OWNER_PASSWORD_HASH) {
      owner = {
        id: `usr_owner_${Date.now().toString(36)}`,
        username: ownerEmail,
        email: ownerEmail,
        name: process.env.OWNER_NAME || 'Store Owner',
        role: 'owner',
        status: 'active',
        passwordHash: process.env.OWNER_PASSWORD_HASH,
        createdAt: new Date().toISOString(),
      };
      db.users.unshift(owner);
      changed = true;
    }
    if (owner) {
      if (owner.role !== 'owner') {
        for (const u of db.users) if (u !== owner && u.role === 'owner') u.role = 'admin';
        owner.role = 'owner';
        changed = true;
      }
      if (owner.status !== 'active') {
        owner.status = 'active';
        delete owner.verifyTokenHash;
        delete owner.verifyExpires;
        changed = true;
      }
    }
  }

  /* Accounts: the first admin of an older store becomes its owner, and
     every existing account counts as verified. */
  if (db.users.length && !db.users.some((u) => u.role === 'owner')) {
    db.users[0].role = 'owner';
    changed = true;
  }
  for (const u of db.users) {
    if (!u.status) {
      u.status = 'active';
      changed = true;
    }
  }

  /* Homepage content: new sections appear with their defaults. */
  for (const [k, v] of Object.entries(DEFAULT_CONTENT)) {
    if (db.content[k] === undefined) {
      db.content[k] = structuredClone(v);
      changed = true;
    }
  }

  /* The "Material" note used to be fixed text on every product page. */
  for (const p of db.products) {
    if (p.material === undefined) {
      p.material = DEFAULT_MATERIAL;
      changed = true;
    }
  }

  return changed;
}

/** Read the whole database into memory (cached after the first call). */
export function read() {
  if (cache) return cache;
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    cache = structuredClone(EMPTY);
    cache.settings = { ...DEFAULT_SETTINGS };
    migrate(cache);
    write(cache);
    return cache;
  }
  try {
    if (prepare(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')))) write(cache);
  } catch (err) {
    console.error('[db] db.json is unreadable, starting from empty:', err.message);
    cache = structuredClone(EMPTY);
  }
  return cache;
}

/** Makes `data` the live database, filling in anything a later version added.
 *  Returns true when something had to be filled in. */
function prepare(data) {
  cache = data;
  // Fill in any key added by a later version of the app.
  for (const [k, v] of Object.entries(EMPTY)) {
    if (cache[k] === undefined) cache[k] = structuredClone(v);
  }
  /* Settings added in a later version appear with their default, while
     anything the owner already set is kept as-is. */
  cache.settings = { ...DEFAULT_SETTINGS, ...cache.settings };
  return migrate(cache);
}

/**
 * For hosts without a lasting disk (Netlify): load the database kept
 * elsewhere, and hear about every save so it can be sent back there.
 * Returns true when loading had to fill in or repair something, which then
 * needs saving back too.
 */
export function hydrate(data) {
  if (data) return prepare(data);
  cache = null;
  read();
  return false;
}

/**
 * Replaces the whole database with `data` (a restored backup), filling in
 * anything a later version added and re-applying the owner protection, then
 * saves it. `keep` holds keys whose current value survives the restore.
 */
export function replaceAll(data, keep = {}) {
  const next = structuredClone(data);
  Object.assign(next, keep);
  prepare(next);
  write(cache);
  return cache;
}

let onWrite = null;
export function setOnWrite(fn) {
  onWrite = fn;
}

/** Persist the database atomically. */
export function write(data = cache) {
  ensureDir();
  cache = data;
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DB_FILE);
  onWrite?.(data);
  return data;
}

/** Run a mutation against the db and persist the result. */
export function update(fn) {
  const db = read();
  const out = fn(db);
  write(db);
  return out;
}

/** Sequential, human-readable order numbers: SC-1001, SC-1002, ... */
export function nextOrderNo() {
  return update((db) => {
    db.counters.order = (db.counters.order || 1000) + 1;
    return 'SC-' + db.counters.order;
  });
}

export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export const DB_PATH = DB_FILE;
