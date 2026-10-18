/** Shared formatting helpers. */

export const money = (n, currency = 'Rs') =>
  `${currency} ${Number(n || 0).toLocaleString('en-PK')}`;

/** Shown wherever a product has no photo, or its photo fails to load. */
export const PLACEHOLDER_IMG = '/img/placeholder.svg';

/** Product image path. Uploaded images already carry a leading slash. */
export const imageUrl = (name, square = false) => {
  if (!name) return PLACEHOLDER_IMG;
  if (name.startsWith('/') || name.startsWith('http')) return name;
  return `/img/${name}${square ? '-sq' : ''}.webp`;
};

export const CATEGORIES = [
  ['all', 'All wallets'],
  ['bifold', 'Bifold'],
  ['trifold', 'Trifold'],
  ['long', 'Long wallets'],
  ['card', 'Card wallets'],
];

/* Category names from the dashboard, filled in once /api/content answers. */
let registry = [];
export const registerCategories = (list) => {
  registry = Array.isArray(list) ? list : [];
};

/** Dashboard name first, then the built-in label, then the key title-cased. */
export const categoryLabel = (key) => {
  const managed = registry.find((c) => c.key === key)?.name;
  if (managed) return managed;
  const known = CATEGORIES.find(([k]) => k === key)?.[1];
  if (known) return known;
  if (!key) return 'Other';
  return String(key)
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

/** Price, old price, saving and percentage off, worked out once. */
export const pricing = (p = {}) => {
  const price = Number(p.price) || 0;
  const was = Number(p.compareAt) || 0;
  const saving = was > price ? was - price : 0;
  return {
    price,
    compareAt: saving ? was : 0,
    saving,
    off: saving ? Math.round((saving / was) * 100) : 0,
  };
};

/** Stock state as the storefront talks about it. */
export const stockState = (p = {}) => {
  const n = p.stock ?? 0;
  if (n <= 0) return { soldOut: true, low: false, left: 0 };
  return { soldOut: false, low: n <= 5, left: n };
};

export const SORTS = [
  ['featured', 'Featured'],
  ['price-asc', 'Price: low to high'],
  ['price-desc', 'Price: high to low'],
  ['name', 'Name: A to Z'],
  ['newest', 'Newest first'],
];

export const ORDER_STATUSES = [
  ['pending', 'Pending', 'warn'],
  ['confirmed', 'Confirmed', 'info'],
  ['shipped', 'Shipped', 'info'],
  ['delivered', 'Delivered', 'ok'],
  ['cancelled', 'Cancelled', 'bad'],
];

export const statusMeta = (status) =>
  ORDER_STATUSES.find(([k]) => k === status) || [status, status, 'info'];

/** "2 Sep 2026, 4:30 pm" */
export const formatDate = (iso, withTime = true) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  });
};

/** "5 minutes ago" */
export const timeAgo = (iso) => {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const units = [
    [60, 'minute'],
    [24, 'hour'],
    [7, 'day'],
    [4.35, 'week'],
    [12, 'month'],
  ];
  let value = secs / 60;
  let unit = 'minute';
  for (let i = 0; i < units.length; i++) {
    if (value < units[i][0]) {
      unit = units[i][1];
      break;
    }
    if (i + 1 < units.length) {
      value /= units[i + 1] ? units[i][0] : 1;
      unit = units[i + 1][1];
    }
  }
  const n = Math.floor(value);
  return `${n} ${unit}${n === 1 ? '' : 's'} ago`;
};

/** mm:ss for the admin session countdown. */
export const clock = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

/* ---------- payment ---------- */

/**
 * The payment methods the storefront knows about. `flag` is the settings key
 * the owner toggles in the dashboard, so turning one off here and on there
 * stays in step.
 */
export const PAYMENT_METHODS = [
  {
    key: 'cod',
    label: 'Cash on delivery',
    note: 'Pay the courier in cash when the parcel reaches you',
    flag: 'codEnabled',
    tag: 'Easiest',
    onDelivery: true,
  },
  {
    key: 'bank',
    label: 'Bank transfer',
    note: 'Transfer to our account, then send the receipt on WhatsApp',
    flag: 'bankEnabled',
    onDelivery: false,
  },
  {
    key: 'easypaisa',
    label: 'Easypaisa',
    note: 'Send to our Easypaisa account, then share the screenshot',
    flag: 'easypaisaEnabled',
    onDelivery: false,
  },
  {
    key: 'jazzcash',
    label: 'JazzCash',
    note: 'Send to our JazzCash account, then share the screenshot',
    flag: 'jazzcashEnabled',
    onDelivery: false,
  },
];

/** Only the methods the owner has switched on. */
export const enabledPayments = (settings) =>
  PAYMENT_METHODS.filter((m) => settings?.[m.flag]);

export const paymentMeta = (key) =>
  PAYMENT_METHODS.find((m) => m.key === key) || PAYMENT_METHODS[0];

/** The account rows to show once a transfer method is picked. */
export function paymentDetails(key, settings = {}) {
  const rows = [];
  if (key === 'bank') {
    if (settings.bankName) rows.push(['Bank', settings.bankName]);
    if (settings.bankAccountTitle) rows.push(['Account title', settings.bankAccountTitle]);
    if (settings.bankAccountNumber) rows.push(['Account number', settings.bankAccountNumber]);
    if (settings.bankIban) rows.push(['IBAN', settings.bankIban]);
  } else if (key === 'easypaisa') {
    if (settings.easypaisaName) rows.push(['Account title', settings.easypaisaName]);
    if (settings.easypaisaNumber) rows.push(['Easypaisa number', settings.easypaisaNumber]);
  } else if (key === 'jazzcash') {
    if (settings.jazzcashName) rows.push(['Account title', settings.jazzcashName]);
    if (settings.jazzcashNumber) rows.push(['JazzCash number', settings.jazzcashNumber]);
  }
  return rows;
}

/** Builds the WhatsApp deep link, optionally pre-filled with a cart. */
export function whatsappLink(settings, { product, items } = {}) {
  const phone = settings?.phone || '923079415512';
  const cur = settings?.currency || 'Rs';
  const store = settings?.storeName || 'Style & Carry';
  let msg;

  if (product) {
    msg = `Hello ${store}, I would like to order:\n\n*${product.name}* — ${money(
      product.price,
      cur
    )}\n\nColour: \nQuantity: 1\nName: \nPhone: \nAddress: \nCity: \n\n(Sent from your website)`;
  } else if (items?.length) {
    const lines = items
      .map((i) => `• ${i.name}${i.color ? ` (${i.color})` : ''} x${i.qty} — ${money(i.price * i.qty, cur)}`)
      .join('\n');
    const sum = items.reduce((n, i) => n + i.price * i.qty, 0);
    msg = `Hello ${store}, I would like to place this order:\n\n${lines}\n\nItems total: ${money(sum, cur)} (plus delivery, if any)\n\nName: \nPhone: \nAddress: \nCity: \n\n(Sent from your website)`;
  } else {
    msg = `Hello ${store}, I have a question about your products.`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

/**
 * Fills the tokens the owner can type into dashboard text:
 * {freeDelivery} {deliveryFee} {returnDays} {phone} {storeName}
 */
export function fillTokens(text, s = {}, fmt) {
  if (!text) return '';
  const cur = s.currency || 'Rs';
  const m = fmt || ((n) => money(n, cur));
  return String(text)
    .replace(/\{freeDelivery\}/g, m(s.freeDeliveryOver ?? 2500))
    .replace(/\{deliveryFee\}/g, m(s.deliveryFee ?? 200))
    .replace(/\{returnDays\}/g, String(s.returnDays ?? 7))
    .replace(/\{phone\}/g, s.phoneDisplay || '')
    .replace(/\{storeName\}/g, s.storeName || 'Style & Carry');
}
