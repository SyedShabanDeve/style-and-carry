import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import api from '../api/client';
import { CATEGORIES, categoryLabel } from '../lib/format';

export const fetchProducts = createAsyncThunk(
  'products/fetch',
  async (opts = {}, { rejectWithValue }) => {
    try {
      const qs = opts.includeInactive ? '?includeInactive=true' : '';
      const data = await api.get(`/products${qs}`);
      return data.products;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchProduct = createAsyncThunk(
  'products/fetchOne',
  async (slug, { rejectWithValue }) => {
    try {
      const data = await api.get(`/products/${slug}`);
      return data.product;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const saveProduct = createAsyncThunk(
  'products/save',
  async ({ id, values }, { rejectWithValue }) => {
    try {
      const data = id
        ? await api.put(`/products/${id}`, values, { auth: true })
        : await api.post('/products', values, { auth: true });
      return data.product;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteProduct = createAsyncThunk(
  'products/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.del(`/products/${id}`, { auth: true });
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const productsSlice = createSlice({
  name: 'products',
  initialState: {
    items: [],
    status: 'idle', // idle | loading | ready | error
    error: null,
    category: 'all',
    query: '',
    sort: 'featured',
    // Product detail page
    current: null,
    currentStatus: 'idle',
    currentError: null,
  },
  reducers: {
    setCategory(state, action) {
      state.category = action.payload;
    },
    setQuery(state, action) {
      state.query = action.payload;
    },
    setSort(state, action) {
      state.sort = action.payload;
    },
    clearFilters(state) {
      state.category = 'all';
      state.query = '';
      state.sort = 'featured';
    },
    clearCurrent(state) {
      state.current = null;
      state.currentStatus = 'idle';
      state.currentError = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchProducts.pending, (state) => {
      state.status = state.items.length ? 'ready' : 'loading';
      state.error = null;
    })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.items = Array.isArray(action.payload) ? action.payload : [];
        state.status = 'ready';
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || 'Could not load the catalogue';
      })

      .addCase(fetchProduct.pending, (state) => {
        state.currentStatus = 'loading';
        state.currentError = null;
      })
      .addCase(fetchProduct.fulfilled, (state, action) => {
        state.current = action.payload;
        state.currentStatus = 'ready';
      })
      .addCase(fetchProduct.rejected, (state, action) => {
        state.currentStatus = 'error';
        state.currentError = action.payload || 'Product not found';
      })

      .addCase(saveProduct.fulfilled, (state, action) => {
        const i = state.items.findIndex((p) => p.id === action.payload.id);
        if (i >= 0) state.items[i] = action.payload;
        else state.items.push(action.payload);
      })
      .addCase(deleteProduct.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p.id !== action.payload);
      });
  },
});

export const { setCategory, setQuery, setSort, clearFilters, clearCurrent } =
  productsSlice.actions;

/* ---------- selectors ---------- */

const NONE = [];
/** Always a list, even if the server ever answers with something unexpected. */
export const selectAllProducts = (s) => (Array.isArray(s.products.items) ? s.products.items : NONE);

/** Only what shoppers should see. */
export const selectLiveProducts = createSelector(selectAllProducts, (items) =>
  items.filter((p) => p.active !== false)
);

/**
 * Filtering runs in the browser rather than as a new request per keystroke:
 * the catalogue is small, so this feels instant and costs no round trip.
 */
export const selectVisibleProducts = createSelector(
  [
    selectLiveProducts,
    (s) => s.products.category,
    (s) => s.products.query,
    (s) => s.products.sort,
  ],
  (items, category, query, sort) => {
    let list = items;

    if (category !== 'all') list = list.filter((p) => p.category === category);

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        [p.name, p.description, p.category, categoryLabel(p.category), ...(p.specs || [])]
          .join(' ')
          .toLowerCase()
          .includes(q)
      );
    }

    const sorters = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name),
      newest: (a, b) => String(b.createdAt).localeCompare(String(a.createdAt)),
      featured: (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    };

    return [...list].sort(sorters[sort] || sorters.featured);
  }
);

/** Badged products first, then the owner's order. Up to six for the homepage. */
export const selectFeatured = createSelector(selectLiveProducts, (items) =>
  [...items]
    .sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0) || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .slice(0, 6)
);

export const selectCheapest = createSelector(selectLiveProducts, (items) =>
  items.length ? Math.min(...items.map((p) => p.price)) : 0
);

/**
 * Categories the shop should show: the ones managed in the dashboard, in the
 * owner's order, that are switched on and actually have products. Each comes
 * with a count, a photo (its own, or its first product's) and a starting
 * price. A category a product uses that the dashboard does not know still
 * appears, so nothing is ever unreachable.
 */
export const selectCategories = createSelector(
  [selectLiveProducts, (s) => s.content.categories],
  (items, managed) => {
    const stats = new Map();
    for (const p of items) {
      const key = p.category || 'other';
      if (!stats.has(key)) stats.set(key, { count: 0, sample: null, from: Infinity });
      const st = stats.get(key);
      st.count += 1;
      if (!st.sample && p.images?.[0]) st.sample = p.images[0];
      st.from = Math.min(st.from, Number(p.price) || 0);
    }

    const out = [];
    const seen = new Set();
    const order = managed.length
      ? managed
      : CATEGORIES.filter(([k]) => k !== 'all').map(([key, name]) => ({ key, name }));

    for (const c of order) {
      seen.add(c.key);
      const st = stats.get(c.key);
      if (!st || c.active === false) continue;
      out.push({
        key: c.key,
        label: c.name || categoryLabel(c.key),
        description: c.description || '',
        count: st.count,
        image: c.image || st.sample,
        from: st.from,
      });
    }
    for (const [key, st] of stats) {
      if (seen.has(key)) continue;
      out.push({ key, label: categoryLabel(key), description: '', count: st.count, image: st.sample, from: st.from });
    }
    return out;
  }
);

/** Most recently added first. */
export const selectNewest = createSelector(selectLiveProducts, (items) =>
  [...items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
);

/** Discounted products, biggest saving first. */
export const selectOnSale = createSelector(selectLiveProducts, (items) =>
  items
    .filter((p) => Number(p.compareAt) > Number(p.price))
    .sort((a, b) => (b.compareAt - b.price) / b.compareAt - (a.compareAt - a.price) / a.compareAt)
);

export default productsSlice.reducer;
