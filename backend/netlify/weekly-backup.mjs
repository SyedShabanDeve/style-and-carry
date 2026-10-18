/**
 * Netlify Scheduled Function: once a week, keeps a copy of the whole store
 * (products, categories, homepage, settings, admins, orders...) in the
 * "backups" Blobs store, and trims the oldest beyond KEEP_COPIES.
 *
 * The dashboard also makes this weekly copy when it checks in, so a week is
 * never skipped; this function makes sure it happens even when nobody opens
 * the dashboard. Copies are listed and restored under Dashboard -> Backup.
 */
import { getStore } from '@netlify/blobs';
import { envelope, snapshotKey, sortKeys, parseKey, keysToPrune, REMIND_AFTER_DAYS } from '../lib/snapshot.js';

export default async () => {
  const shop = getStore({ name: 'shop', consistency: 'strong' });
  const copies = getStore({ name: 'backups', consistency: 'strong' });
  const db = await shop.get('db', { type: 'json' });
  if (!db) return new Response('No store data yet', { status: 200 });

  const keys = (await copies.list()).blobs.map((b) => b.key);
  const newestWeekly = sortKeys(keys).map(parseKey).find((c) => c.reason === 'weekly' && c.createdAt);
  // Six days, so a copy made by the dashboard earlier in the week still counts.
  if (newestWeekly && Date.now() - Date.parse(newestWeekly.createdAt) < (REMIND_AFTER_DAYS - 1) * 864e5) {
    return new Response('This week already has a copy', { status: 200 });
  }

  const key = snapshotKey('weekly');
  await copies.setJSON(key, envelope(db, { reason: 'weekly', by: 'Automatic', secrets: true }));
  for (const old of keysToPrune([...keys, key])) await copies.delete(old);
  return new Response(`Saved ${key}`, { status: 200 });
};

export const config = { schedule: '@weekly' };
