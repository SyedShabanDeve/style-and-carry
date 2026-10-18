import { createSlice } from '@reduxjs/toolkit';
import { loadCurrency, saveCurrency } from '../lib/currency';
import { loadLang } from '../lib/language';

const readTheme = () => {
  try {
    const saved = localStorage.getItem('sc_theme');
    if (saved) return saved;
  } catch {}
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

let toastId = 0;

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: readTheme(),
    cartOpen: false,
    navOpen: false,
    searchOpen: false,
    localeOpen: false,
    currency: loadCurrency(), // display currency code, prices stay in PKR
    lang: loadLang(), // Google Translate target, 'en' = original
    quickView: null, // slug of the product shown in the quick-view modal
    toasts: [],
  },
  reducers: {
    setTheme(state, action) {
      state.theme = action.payload;
      try {
        localStorage.setItem('sc_theme', action.payload);
      } catch {}
      document.documentElement.dataset.theme = action.payload;
    },
    toggleTheme(state) {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      state.theme = next;
      try {
        localStorage.setItem('sc_theme', next);
      } catch {}
      document.documentElement.dataset.theme = next;
    },
    openCart(state) {
      state.cartOpen = true;
      state.navOpen = false;
      state.searchOpen = false;
      state.quickView = null;
    },
    openSearch(state) {
      state.searchOpen = true;
      state.navOpen = false;
    },
    setCurrency(state, action) {
      state.currency = action.payload;
      saveCurrency(action.payload);
    },
    openLocale(state) {
      state.localeOpen = true;
      state.navOpen = false;
    },
    closeLocale(state) {
      state.localeOpen = false;
    },
    setLang(state, action) {
      state.lang = action.payload;
    },
    closeSearch(state) {
      state.searchOpen = false;
    },
    openQuickView(state, action) {
      state.quickView = action.payload;
    },
    closeQuickView(state) {
      state.quickView = null;
    },
    closeCart(state) {
      state.cartOpen = false;
    },
    toggleNav(state) {
      state.navOpen = !state.navOpen;
    },
    closeNav(state) {
      state.navOpen = false;
    },
    /** pushToast('Saved') or pushToast({ title, message, kind, ms, action }) */
    pushToast: {
      reducer(state, action) {
        state.toasts.push(action.payload);
        // Never stack more than three at once.
        if (state.toasts.length > 3) state.toasts.shift();
      },
      prepare(input) {
        const o = typeof input === 'string' ? { message: input } : input || {};
        const kind = o.kind || 'info'; // ok | info | warn | bad
        return {
          payload: {
            id: ++toastId,
            title: o.title || '',
            message: o.message || '',
            kind,
            // Errors stay up longer: people need time to read what went wrong.
            ms: o.ms ?? (kind === 'bad' ? 6500 : kind === 'warn' ? 5000 : 3800),
            // Optional button: { label, to } opens a page, { label, cart: true } opens the cart.
            action: o.action || null,
          },
        };
      },
    },
    dismissToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const {
  setTheme,
  toggleTheme,
  openCart,
  closeCart,
  toggleNav,
  closeNav,
  openSearch,
  closeSearch,
  setCurrency,
  setLang,
  openLocale,
  closeLocale,
  openQuickView,
  closeQuickView,
  pushToast,
  dismissToast,
} = uiSlice.actions;

export default uiSlice.reducer;
