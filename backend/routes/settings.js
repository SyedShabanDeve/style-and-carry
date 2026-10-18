import { Router } from 'express';
import { read, update } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { imagePath } from '../lib/clean.js';

const router = Router();

/* Only these keys can be written, and each is coerced to its own type. */
const FIELDS = {
  storeName: 'string',
  tagline: 'string',
  phone: 'string',
  phoneDisplay: 'string',
  email: 'string',
  tiktok: 'string',
  instagram: 'string',
  currency: 'string',
  announcement: 'string',
  deliveryFee: 'number',
  freeDeliveryOver: 'number',
  returnDays: 'number',
  address: 'string',
  hours: 'string',
  logo: 'string',
  showLanguagePicker: 'boolean',
  showCurrencyPicker: 'boolean',

  /* Which ways a customer may pay, and the account details shown when they
     pick one. Kept flat so the dashboard form stays simple to edit. */
  codEnabled: 'boolean',
  bankEnabled: 'boolean',
  bankName: 'string',
  bankAccountTitle: 'string',
  bankAccountNumber: 'string',
  bankIban: 'string',
  easypaisaEnabled: 'boolean',
  easypaisaNumber: 'string',
  easypaisaName: 'string',
  jazzcashEnabled: 'boolean',
  jazzcashNumber: 'string',
  jazzcashName: 'string',
};

/** GET /api/settings — public; the storefront reads delivery rules from here. */
router.get('/', (req, res) => {
  res.json({ settings: read().settings || {} });
});

router.put('/', requireAuth, requireAdmin, (req, res) => {
  const patch = {};

  for (const [key, type] of Object.entries(FIELDS)) {
    if (req.body[key] === undefined) continue;
    if (type === 'number') {
      const n = Number(req.body[key]);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ error: `${key} must be a number of 0 or more` });
      }
      patch[key] = n;
    } else if (type === 'boolean') {
      patch[key] = Boolean(req.body[key]);
    } else {
      patch[key] = String(req.body[key]).trim().slice(0, 300);
    }
  }

  /* Currencies: a list of { code, rate, enabled }. Rupees always stay on at
     rate 1, because every price is stored and charged in rupees. */
  if (req.body.currencies !== undefined) {
    if (!Array.isArray(req.body.currencies)) {
      return res.status(400).json({ error: 'Currencies must be a list' });
    }
    const seen = new Set();
    const list = [];
    for (const c of req.body.currencies.slice(0, 40)) {
      const code = String(c?.code || '').toUpperCase().trim();
      if (!/^[A-Z]{3}$/.test(code) || seen.has(code)) continue;
      const rate = Number(c.rate);
      if (code !== 'PKR' && !(Number.isFinite(rate) && rate > 0)) {
        return res.status(400).json({ error: `Enter a rate above 0 for ${code}` });
      }
      seen.add(code);
      list.push({ code, rate: code === 'PKR' ? 1 : rate, enabled: code === 'PKR' ? true : Boolean(c.enabled) });
    }
    if (!seen.has('PKR')) list.unshift({ code: 'PKR', rate: 1, enabled: true });
    patch.currencies = list;
  }

  if (patch.logo && !imagePath(patch.logo)) {
    return res.status(400).json({ error: 'Upload the logo from the dashboard' });
  }

  if (patch.phone) {
    let digits = patch.phone.replace(/[^\d]/g, '');
    // Accept the way people write it in Pakistan: 0318 4051521 → 923184051521.
    if (/^03\d{9}$/.test(digits)) digits = '92' + digits.slice(1);
    if (!/^92\d{10}$/.test(digits)) {
      return res.status(400).json({
        error: 'Enter the WhatsApp number like 0318 4051521 or 923184051521',
      });
    }
    patch.phone = digits;
  }

  const merged = { ...read().settings, ...patch };
  const anyPayment =
    merged.codEnabled || merged.bankEnabled || merged.easypaisaEnabled || merged.jazzcashEnabled;
  if (!anyPayment) {
    return res.status(400).json({
      error: 'Keep at least one payment method switched on, or nobody can check out',
    });
  }

  /* An account detail that is switched on but blank would leave the customer
     with nothing to pay into. */
  if (merged.bankEnabled && !String(merged.bankAccountNumber || '').trim()) {
    return res.status(400).json({ error: 'Add the bank account number before turning bank transfer on' });
  }
  if (merged.easypaisaEnabled && !String(merged.easypaisaNumber || '').trim()) {
    return res.status(400).json({ error: 'Add the Easypaisa number before turning it on' });
  }
  if (merged.jazzcashEnabled && !String(merged.jazzcashNumber || '').trim()) {
    return res.status(400).json({ error: 'Add the JazzCash number before turning it on' });
  }

  const settings = update((db) => {
    db.settings = { ...db.settings, ...patch, updatedAt: new Date().toISOString() };
    return db.settings;
  });

  res.json({ settings });
});

/**
 * POST /api/settings/rates — refresh every currency's rate from the internet.
 * Only the rates change; which currencies are switched on stays as it is.
 */
router.post('/rates', requireAuth, requireAdmin, async (req, res) => {
  let data;
  try {
    const r = await fetch('https://open.er-api.com/v6/latest/PKR', { signal: AbortSignal.timeout(10000) });
    data = await r.json();
  } catch {
    return res.status(502).json({ error: 'Could not reach the exchange-rate service. Check the internet connection, or type the rates by hand.' });
  }
  if (data?.result !== 'success' || !data.rates) {
    return res.status(502).json({ error: 'The exchange-rate service did not answer properly. Try again later.' });
  }
  const settings = update((db) => {
    const list = db.settings.currencies || [];
    for (const c of list) {
      if (c.code !== 'PKR' && Number(data.rates[c.code]) > 0) c.rate = Number(data.rates[c.code]);
    }
    db.settings.currencies = list;
    db.settings.ratesUpdatedAt = new Date((data.time_last_update_unix || Date.now() / 1000) * 1000).toISOString();
    return db.settings;
  });
  res.json({ settings });
});

export default router;
