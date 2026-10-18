import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/client';

export const fetchStats = createAsyncThunk(
  'stats/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const data = await api.get('/admin/stats', { auth: true });
      return data.stats;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const statsSlice = createSlice({
  name: 'stats',
  initialState: { data: null, status: 'idle', error: null },
  reducers: {
    clearStats(state) {
      state.data = null;
      state.status = 'idle';
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchStats.pending, (state) => {
      state.status = state.data ? 'ready' : 'loading';
      state.error = null;
    })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.data = action.payload;
        state.status = 'ready';
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || 'Could not load the dashboard';
      });
  },
});

export const { clearStats } = statsSlice.actions;
export default statsSlice.reducer;
