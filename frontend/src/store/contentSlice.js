import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/client';
import { categoryLabel, registerCategories, fillTokens } from '../lib/format';
import { useMoney } from '../lib/currency';

/**
 * Homepage content and the category list, both edited in the dashboard.
 * Loaded once at start-up alongside the catalogue.
 */
export const fetchContent = createAsyncThunk('content/fetch', async (_, { rejectWithValue }) => {
  try {
    const data = await api.get('/content');
    registerCategories(data.categories);
    return data;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const saveContent = createAsyncThunk('content/save', async (values, { rejectWithValue }) => {
  try {
    const data = await api.put('/content', values, { auth: true });
    return data.content;
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const contentSlice = createSlice({
  name: 'content',
  initialState: {
    data: null,
    categories: [],
    status: 'idle', // idle | loading | ready | error
    saving: false,
    /* Only set inside the dashboard's live-preview frame: the unsaved draft,
       and whether to show it (after) or the live site (before). */
    preview: null,
  },
  reducers: {
    setPreview(s, a) {
      s.preview = { ...(s.preview || {}), ...a.payload };
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchContent.pending, (s) => {
      if (!s.data) s.status = 'loading';
    })
      .addCase(fetchContent.fulfilled, (s, a) => {
        s.data = a.payload.content;
        s.categories = a.payload.categories;
        s.status = 'ready';
      })
      .addCase(fetchContent.rejected, (s) => {
        s.status = 'error';
      })
      .addCase(saveContent.pending, (s) => {
        s.saving = true;
      })
      .addCase(saveContent.fulfilled, (s, a) => {
        s.data = a.payload;
        s.saving = false;
      })
      .addCase(saveContent.rejected, (s) => {
        s.saving = false;
      });
  },
});

const EMPTY = {};
export const { setPreview } = contentSlice.actions;

/** Saved content, or the dashboard draft when previewing the "after" view. */
export const selectContent = (s) => {
  const p = s.content.preview;
  if (p?.draft && p.mode !== 'before') return p.draft;
  return s.content.data || EMPTY;
};
export const selectIsPreview = (s) => Boolean(s.content.preview);
export const selectContentStatus = (s) => s.content.status;
export const selectAllCategories = (s) => s.content.categories;

/** Returns a function that turns a category key into its display name. */
export function useCategoryName() {
  const cats = useSelector(selectAllCategories);
  return useCallback((key) => cats.find((c) => c.key === key)?.name || categoryLabel(key), [cats]);
}

export default contentSlice.reducer;

/** Returns a function that fills Settings tokens into dashboard text. */
export function useFill() {
  const settings = useSelector((s) => s.settings.data);
  const fmt = useMoney();
  return useCallback((text) => fillTokens(text, settings, fmt), [settings, fmt]);
}

/** A section is on unless the owner switched it off. */
export const isOn = (group) => group?.enabled !== false;
