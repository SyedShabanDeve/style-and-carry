import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/client';

/** Customer-facing: place the order. */
export const placeOrder = createAsyncThunk(
  'orders/place',
  async ({ customer, items, payment, shownCurrency }, { rejectWithValue }) => {
    try {
      const payload = {
        customer,
        payment,
        shownCurrency,
        items: items.map((i) => ({
          productId: i.productId,
          slug: i.slug,
          qty: i.qty,
          color: i.color,
        })),
      };
      const data = await api.post('/orders', payload);
      return data.order;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/** Customer-facing: look an order up by number and mobile. */
export const trackOrder = createAsyncThunk(
  'orders/track',
  async ({ orderNo, phone }, { rejectWithValue }) => {
    try {
      const data = await api.get(
        `/orders/track/${encodeURIComponent(orderNo)}?phone=${encodeURIComponent(phone)}`
      );
      return data.order;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/* ---------- admin ---------- */

export const fetchOrders = createAsyncThunk(
  'orders/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/orders', { auth: true });
      return data.orders;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateOrderStatus = createAsyncThunk(
  'orders/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const data = await api.patch(`/orders/${id}/status`, { status }, { auth: true });
      return data.order;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/** Admin: mark a bank or wallet transfer as received. */
export const markPayment = createAsyncThunk(
  'orders/markPayment',
  async ({ id, paymentStatus }, { rejectWithValue }) => {
    try {
      const data = await api.patch(`/orders/${id}/payment`, { paymentStatus }, { auth: true });
      return data.order;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteOrder = createAsyncThunk(
  'orders/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.del(`/orders/${id}`, { auth: true });
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const ordersSlice = createSlice({
  name: 'orders',
  initialState: {
    // checkout
    placing: false,
    placeError: null,
    lastOrder: null,
    // tracking
    tracking: false,
    trackError: null,
    tracked: null,
    // admin list
    list: [],
    listStatus: 'idle',
    listError: null,
    filter: 'all',
    query: '',
  },
  reducers: {
    clearLastOrder(state) {
      state.lastOrder = null;
    },
    clearPlaceError(state) {
      state.placeError = null;
    },
    clearTracked(state) {
      state.tracked = null;
      state.trackError = null;
    },
    setFilter(state, action) {
      state.filter = action.payload;
    },
    setQuery(state, action) {
      state.query = action.payload;
    },
  },
  extraReducers: (b) => {
    b.addCase(placeOrder.pending, (state) => {
      state.placing = true;
      state.placeError = null;
    })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.placing = false;
        state.lastOrder = action.payload;
      })
      .addCase(placeOrder.rejected, (state, action) => {
        state.placing = false;
        state.placeError = action.payload || 'Could not place the order';
      })

      .addCase(trackOrder.pending, (state) => {
        state.tracking = true;
        state.trackError = null;
        state.tracked = null;
      })
      .addCase(trackOrder.fulfilled, (state, action) => {
        state.tracking = false;
        state.tracked = action.payload;
      })
      .addCase(trackOrder.rejected, (state, action) => {
        state.tracking = false;
        state.trackError = action.payload || 'Could not find that order';
      })

      .addCase(fetchOrders.pending, (state) => {
        state.listStatus = state.list.length ? 'ready' : 'loading';
        state.listError = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.list = action.payload;
        state.listStatus = 'ready';
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.listStatus = 'error';
        state.listError = action.payload || 'Could not load orders';
      })

      .addCase(updateOrderStatus.fulfilled, (state, action) => {
        const i = state.list.findIndex((o) => o.id === action.payload.id);
        if (i >= 0) state.list[i] = action.payload;
      })
      .addCase(markPayment.fulfilled, (state, action) => {
        const i = state.list.findIndex((o) => o.id === action.payload.id);
        if (i >= 0) state.list[i] = action.payload;
      })
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.list = state.list.filter((o) => o.id !== action.payload);
      });
  },
});

export const {
  clearLastOrder,
  clearPlaceError,
  clearTracked,
  setFilter,
  setQuery,
} = ordersSlice.actions;

export const selectVisibleOrders = (s) => {
  const { list, filter, query } = s.orders;
  let out = filter === 'all' ? list : list.filter((o) => o.status === filter);
  const q = query.trim().toLowerCase();
  if (q) {
    out = out.filter((o) =>
      [o.orderNo, o.customer.name, o.customer.phone, o.customer.city]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );
  }
  return out;
};

export default ordersSlice.reducer;
