import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/client';

/**
 * Sensible defaults so the storefront renders correctly on the very first
 * paint, before /api/settings has answered, and still reads sanely if the
 * API is unreachable.
 */
export const DEFAULTS = {
  storeName: 'Style & Carry',
  tagline: 'Wallets that carry well',
  phone: '923079415512',
  phoneDisplay: '0307 9415512',
  email: 'syedshaban330@gmail.com',
  tiktok: 'https://www.tiktok.com/@foldandcarry1',
  instagram: '',
  currency: 'Rs',
  deliveryFee: 200,
  freeDeliveryOver: 2500,
  announcement: 'Cash on delivery all over Pakistan · Free delivery over Rs 2,500',
  returnDays: 7,
  address: '',
  hours: 'Mon to Sat, 11am to 9pm',
  logo: '',
};

export const fetchSettings = createAsyncThunk(
  'settings/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/settings');
      return data.settings;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const saveSettings = createAsyncThunk(
  'settings/save',
  async (values, { rejectWithValue }) => {
    try {
      const data = await api.put('/settings', values, { auth: true });
      return data.settings;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const settingsSlice = createSlice({
  name: 'settings',
  initialState: { data: DEFAULTS, status: 'idle', error: null, saving: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchSettings.fulfilled, (state, action) => {
      state.data = { ...DEFAULTS, ...action.payload };
      state.status = 'ready';
    })
      .addCase(fetchSettings.rejected, (state, action) => {
        // Keep the defaults on screen rather than blanking the store.
        state.status = 'error';
        state.error = action.payload;
      })
      .addCase(saveSettings.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
        state.data = { ...DEFAULTS, ...action.payload };
        state.saving = false;
      })
      .addCase(saveSettings.rejected, (state) => {
        state.saving = false;
      });
  },
});

export const selectSettings = (s) => s.settings.data;

export default settingsSlice.reducer;
