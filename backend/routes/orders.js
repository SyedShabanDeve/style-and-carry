import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { read, update, uid, nextOrderNo } from '../db.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();

export const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

/** Payment methods, and the settings flag that switches each one on. */
export const PAYMENT_METHODS = {
  cod: { label: 'Cash on delivery', flag: 'codEnabled', onDelivery: true },
  bank: { label: 'Bank transfer', flag: 'bankEnabled', onDelivery: false },
  easypaisa: { label: 'Easypaisa', flag: 'easypaisaEnabled', onDelivery: false },
  jazzcash: { label: 'JazzCash', flag: 'jazzcashEnabled', onDelivery: false },
};

/* Stops a bot from filling the order book. */
const placeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many orders from this connection. Please message us on WhatsApp.' },
});

/** Pakistani mobile numbers, written any of the usual ways. */
function normalisePhone(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (/^03\d{9}$/.test(digits)) return '92' + digits.slice(1);
  if (/^923\d{9}$/.test(digits)) return digits;
  if (/^3\d{9}$/.test(digits)) return '92' + digits;
  return null;
}

/* ---------- public ---------- */

/**
 * POST /api/orders — place an order.
 *
 * Prices and totals are recalculated here from the database. Whatever the
 * browser sends for money is ignored, so a tampered cart cannot change what
 * the order is worth.
 */
router.post('/', placeLimiter, (req, res) => {
  const { customer = {}, items = [], payment: rawPayment, shownCurrency } = req.body || {};

  const name = String(customer.name || '').trim();
  const address = String(customer.address || '').trim();
  const city = String(customer.city || '').trim();
  const notes = String(customer.notes || '').trim().slice(0, 500);
  const phone = normalisePhone(customer.phone);

  if (name.length < 3) return res.status(400).json({ error: 'Please enter your full name' });
  if (!phone) return res.status(400).json({ error: 'Please enter a valid mobile number, like 0307 9415512' });
  if (address.length < 10) return res.status(400).json({ error: 'Please enter a complete delivery address' });
  if (!city) return res.status(400).json({ error: 'Please enter your city' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Your cart is empty' });
  }

  const db = read();
  const settings = db.settings || {};

  /* Default to cash on delivery, and only accept a method the owner has
     actually switched on — the browser does not get to decide this. */
  const payment = String(rawPayment || 'cod');
  const method = PAYMENT_METHODS[payment];
  if (!method) {
    return res.status(400).json({ error: 'Choose a valid payment method' });
  }
  if (settings[method.flag] === false) {
    return res.status(400).json({ error: `${method.label} is not available right now` });
  }

  const lines = [];

  for (const raw of items) {
    const product = db.products.find((p) => p.id === raw.productId || p.slug === raw.slug);
    if (!product) {
      return res.status(400).json({ error: `"${raw.name || 'A product'}" is no longer available` });
    }
    if (product.active === false) {
      return res.status(400).json({ error: `${product.name} is no longer available` });
    }

    const qty = Math.max(1, Math.min(20, Number(raw.qty) || 1));
    if (product.stock != null && product.stock < qty) {
      return res.status(409).json({
        error:
          product.stock === 0
            ? `${product.name} has just sold out`
            : `Only ${product.stock} left of ${product.name}`,
      });
    }

    lines.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price, // authoritative price, from the database
      qty,
      color: raw.color ? String(raw.color).slice(0, 40) : null,
      image: product.images?.[0] || null,
      lineTotal: product.price * qty,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const freeOver = Number(settings.freeDeliveryOver ?? 2500);
  const fee = Number(settings.deliveryFee ?? 200);
  const delivery = subtotal >= freeOver ? 0 : fee;
  const total = subtotal + delivery;

  const now = new Date().toISOString();
  const order = {
    id: uid('ord'),
    orderNo: nextOrderNo(),
    customer: { name, phone, address, city, notes },
    items: lines,
    subtotal,
    delivery,
    total,
    payment,
    paymentLabel: method.label,
    currency: 'PKR',
    shownCurrency: /^[A-Z]{3}$/.test(String(shownCurrency || '')) ? String(shownCurrency) : 'PKR',
    /* COD is settled by the courier; the rest are marked paid by the owner
       once the transfer lands. */
    paymentStatus: method.onDelivery ? 'on_delivery' : 'awaiting',
    status: 'pending',
    statusHistory: [{ status: 'pending', at: now, by: 'customer' }],
    createdAt: now,
    updatedAt: now,
  };

  update((d) => {
    d.orders.unshift(order);
    // Hold the stock straight away so two people cannot buy the last one.
    for (const line of lines) {
      const p = d.products.find((x) => x.id === line.productId);
      if (p && p.stock != null) p.stock = Math.max(0, p.stock - line.qty);
    }
  });

  res.status(201).json({ order });
});

/** GET /api/orders/track/:orderNo?phone=03... — customer order lookup. */
router.get('/track/:orderNo', (req, res) => {
  const phone = normalisePhone(req.query.phone);
  if (!phone) {
    return res.status(400).json({ error: 'Enter the mobile number you ordered with' });
  }

  const orderNo = String(req.params.orderNo).trim().toUpperCase();
  const order = read().orders.find(
    (o) => o.orderNo.toUpperCase() === orderNo && o.customer.phone === phone
  );

  if (!order) {
    return res.status(404).json({ error: 'We could not find an order with that number and mobile. Please check both and try again.' });
  }

  // Only what the customer needs to see.
  res.json({
    order: {
      orderNo: order.orderNo,
      status: order.status,
      statusHistory: order.statusHistory,
      items: order.items.map(({ name, qty, color, image, price }) => ({ name, qty, color, image, price })),
      subtotal: order.subtotal,
      delivery: order.delivery,
      total: order.total,
      payment: order.payment || 'cod',
      paymentLabel: order.paymentLabel || 'Cash on delivery',
      paymentStatus: order.paymentStatus || 'on_delivery',
      city: order.customer.city,
      createdAt: order.createdAt,
    },
  });
});

/* ---------- admin ---------- */

router.get('/', requireAuth, requireAdmin, (req, res) => {
  const { status, q } = req.query;
  let list = read().orders;

  if (status && status !== 'all') list = list.filter((o) => o.status === status);

  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter((o) =>
      [o.orderNo, o.customer.name, o.customer.phone, o.customer.city]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }

  res.json({ orders: list, total: list.length });
});

router.get('/:id', requireAuth, requireAdmin, (req, res) => {
  const order = read().orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json({ order });
});

router.patch('/:id/status', requireAuth, requireAdmin, (req, res) => {
  const status = String(req.body?.status || '');
  if (!STATUSES.includes(status)) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}` });
  }

  const db = read();
  const existing = db.orders.find((o) => o.id === req.params.id);
  if (!existing) return res.status(404).json({ error: 'Order not found' });
  if (existing.status === status) return res.json({ order: existing });

  const wasCancelled = existing.status === 'cancelled';
  const nowCancelled = status === 'cancelled';

  const updated = update((d) => {
    const o = d.orders.find((x) => x.id === req.params.id);
    o.status = status;
    o.updatedAt = new Date().toISOString();
    o.statusHistory.push({ status, at: o.updatedAt, by: req.user.username });

    // Cancelling puts the stock back; un-cancelling takes it again.
    if (nowCancelled && !wasCancelled) {
      for (const line of o.items) {
        const p = d.products.find((x) => x.id === line.productId);
        if (p && p.stock != null) p.stock += line.qty;
      }
    } else if (wasCancelled && !nowCancelled) {
      for (const line of o.items) {
        const p = d.products.find((x) => x.id === line.productId);
        if (p && p.stock != null) p.stock = Math.max(0, p.stock - line.qty);
      }
    }
    return o;
  });

  res.json({ order: updated });
});

/** Marks a bank or wallet transfer as received. */
router.patch('/:id/payment', requireAuth, requireAdmin, (req, res) => {
  const paymentStatus = String(req.body?.paymentStatus || '');
  if (!['awaiting', 'paid', 'on_delivery'].includes(paymentStatus)) {
    return res.status(400).json({ error: 'Payment status must be awaiting, paid or on_delivery' });
  }

  const db = read();
  if (!db.orders.some((o) => o.id === req.params.id)) {
    return res.status(404).json({ error: 'Order not found' });
  }

  const updated = update((d) => {
    const o = d.orders.find((x) => x.id === req.params.id);
    o.paymentStatus = paymentStatus;
    o.updatedAt = new Date().toISOString();
    return o;
  });

  res.json({ order: updated });
});

router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  const db = read();
  const order = db.orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  update((d) => {
    // Return stock unless it was already given back at cancellation.
    if (order.status !== 'cancelled') {
      for (const line of order.items) {
        const p = d.products.find((x) => x.id === line.productId);
        if (p && p.stock != null) p.stock += line.qty;
      }
    }
    d.orders = d.orders.filter((o) => o.id !== req.params.id);
  });

  res.json({ ok: true });
});

export default router;
