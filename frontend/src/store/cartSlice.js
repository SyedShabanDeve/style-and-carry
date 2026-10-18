import { createSlice, createSelector } from '@reduxjs/toolkit';

const KEY = 'sc_cart_v1';
const MAX_PER_LINE = 20;

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

function save(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Private browsing can refuse writes. The cart still works for this visit.
  }
}

/** Same product in a different colour is its own line. */
const lineKey = (productId, color) => `${productId}::${color || ''}`;

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: load() },
  reducers: {
    addItem: {
      reducer(state, action) {
        const { productId, color, qty } = action.payload;
        const key = lineKey(productId, color);
        const line = state.items.find((i) => i.key === key);
        if (line) {
          line.qty = Math.min(MAX_PER_LINE, line.qty + qty);
        } else {
          state.items.push({ ...action.payload, key });
        }
        save(state.items);
      },
      prepare(product, { color = null, qty = 1 } = {}) {
        return {
          payload: {
            productId: product.id,
            slug: product.slug,
            name: product.name,
            price: product.price,
            image: product.images?.[0] || null,
            stock: product.stock ?? null,
            color,
            qty: Math.max(1, Math.min(MAX_PER_LINE, qty)),
          },
        };
      },
    },
    setQty(state, action) {
      const { key, qty } = action.payload;
      const line = state.items.find((i) => i.key === key);
      if (!line) return;
      if (qty <= 0) {
        state.items = state.items.filter((i) => i.key !== key);
      } else {
        line.qty = Math.min(MAX_PER_LINE, qty);
      }
      save(state.items);
    },
    removeItem(state, action) {
      state.items = state.items.filter((i) => i.key !== action.payload);
      save(state.items);
    },
    clearCart(state) {
      state.items = [];
      save(state.items);
    },
    /**
     * Re-syncs cart lines against the live catalogue, so a price change or a
     * deleted product cannot sit stale in someone's cart for weeks.
     */
    reconcile(state, action) {
      const products = action.payload || [];
      if (!products.length) return;
      state.items = state.items
        .map((line) => {
          const p = products.find((x) => x.id === line.productId || x.slug === line.slug);
          if (!p || p.active === false) return null;
          return {
            ...line,
            productId: p.id,
            name: p.name,
            price: p.price,
            image: p.images?.[0] || line.image,
            stock: p.stock ?? null,
            qty: p.stock != null ? Math.min(line.qty, Math.max(0, p.stock)) : line.qty,
          };
        })
        .filter((l) => l && l.qty > 0);
      save(state.items);
    },
  },
});

export const { addItem, setQty, removeItem, clearCart, reconcile } = cartSlice.actions;

/* ---------- selectors ---------- */

export const selectCartItems = (s) => s.cart.items;

export const selectCartCount = createSelector(selectCartItems, (items) =>
  items.reduce((n, i) => n + i.qty, 0)
);

export const selectSubtotal = createSelector(selectCartItems, (items) =>
  items.reduce((n, i) => n + i.price * i.qty, 0)
);

/** Delivery follows the rules the owner set in the dashboard. */
export const selectTotals = createSelector(
  [selectSubtotal, (s) => s.settings.data],
  (subtotal, settings) => {
    const freeOver = Number(settings?.freeDeliveryOver ?? 2500);
    const fee = Number(settings?.deliveryFee ?? 200);
    const qualifies = subtotal >= freeOver;
    const delivery = subtotal === 0 ? 0 : qualifies ? 0 : fee;
    return {
      subtotal,
      delivery,
      total: subtotal + delivery,
      freeOver,
      fee,
      qualifies,
      remaining: Math.max(0, freeOver - subtotal),
      progress: freeOver > 0 ? Math.min(100, (subtotal / freeOver) * 100) : 100,
    };
  }
);

export default cartSlice.reducer;
