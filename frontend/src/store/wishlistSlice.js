import { createSlice, createSelector } from '@reduxjs/toolkit';
import { selectLiveProducts } from './productsSlice';

const KEY = 'sc_wishlist_v1';

function load() {
  try {
    const ids = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(ids) ? ids.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function save(ids) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // Private browsing can refuse writes. The list still works for this visit.
  }
}

/**
 * Saved products, keyed by slug so a list survives a product being re-imported
 * with a new id. Stored in the browser, like the cart.
 */
const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: { slugs: load() },
  reducers: {
    toggleWish(state, action) {
      const slug = action.payload;
      state.slugs = state.slugs.includes(slug)
        ? state.slugs.filter((s) => s !== slug)
        : [slug, ...state.slugs];
      save(state.slugs);
    },
    removeWish(state, action) {
      state.slugs = state.slugs.filter((s) => s !== action.payload);
      save(state.slugs);
    },
    clearWishlist(state) {
      state.slugs = [];
      save(state.slugs);
    },
  },
});

export const { toggleWish, removeWish, clearWishlist } = wishlistSlice.actions;

export const selectWishSlugs = (s) => s.wishlist.slugs;

export const selectWishCount = createSelector(
  [selectWishSlugs, selectLiveProducts, (s) => s.products.status],
  (slugs, products, status) =>
    // Until the catalogue arrives, trust the saved list.
    status === 'ready' ? slugs.filter((slug) => products.some((p) => p.slug === slug)).length : slugs.length
);

/** Saved products that still exist in the shop, newest save first. */
export const selectWishProducts = createSelector([selectWishSlugs, selectLiveProducts], (slugs, products) =>
  slugs.map((slug) => products.find((p) => p.slug === slug)).filter(Boolean)
);

export const makeSelectIsWished = (slug) => (s) => s.wishlist.slugs.includes(slug);

export default wishlistSlice.reducer;
