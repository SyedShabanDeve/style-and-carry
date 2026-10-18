import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../api/client';

/**
 * Admin sessions last 10 minutes (the backend decides; we read `expiresAt`
 * off the login response rather than assuming).
 *
 * The session is kept in sessionStorage, not localStorage: closing the tab
 * ends it, which is what you want for a dashboard opened on a shared phone.
 */
const KEY = 'sc_admin_session';

function loadSession() {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    // A session restored past its expiry is no session at all.
    if (!s?.token || !s?.expiresAt || Date.now() >= s.expiresAt) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

function saveSession(s) {
  try {
    if (s) sessionStorage.setItem(KEY, JSON.stringify(s));
    else sessionStorage.removeItem(KEY);
  } catch {}
}

const restored = loadSession();

export const login = createAsyncThunk(
  'auth/login',
  async ({ username, password }, { rejectWithValue }) => {
    try {
      return await api.post('/auth/login', { email: username, password });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

/** Extends the session by another full window while the owner is working. */
export const refreshSession = createAsyncThunk(
  'auth/refresh',
  async (_, { rejectWithValue }) => {
    try {
      return await api.post('/auth/refresh', {}, { auth: true });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async ({ current, next }, { rejectWithValue }) => {
    try {
      return await api.post('/auth/password', { current, next }, { auth: true });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async ({ name }, { rejectWithValue }) => {
    try {
      return await api.put('/auth/profile', { name }, { auth: true });
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    token: restored?.token || null,
    user: restored?.user || null,
    expiresAt: restored?.expiresAt || null,
    /** Full session length in seconds, as the server reported it. */
    sessionSeconds: restored?.sessionSeconds || 600,
    status: 'idle', // idle | loading | error
    error: null,
    /** Set when a session ended by itself, so the login page can explain why. */
    expiredNotice: false,
  },
  reducers: {
    logout(state) {
      state.token = null;
      state.user = null;
      state.expiresAt = null;
      state.error = null;
      state.expiredNotice = false;
      saveSession(null);
    },
    /** Called by the countdown, and by the API client on a 401. */
    sessionExpired(state) {
      if (!state.token) return;
      state.token = null;
      state.user = null;
      state.expiresAt = null;
      state.expiredNotice = true;
      saveSession(null);
    },
    clearExpiredNotice(state) {
      state.expiredNotice = false;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (b) => {
    const accept = (state, action) => {
      const { token, user, expiresIn } = action.payload;
      /* Count the session from this device's own clock. The server's
         expiresAt is in the server's time, so a phone whose clock runs
         10+ minutes fast would see the session as over on arrival. The
         server still enforces the real expiry on every request. */
      const expiresAt = expiresIn ? Date.now() + expiresIn * 1000 : action.payload.expiresAt;
      state.token = token;
      state.user = user;
      state.expiresAt = expiresAt;
      state.sessionSeconds = expiresIn || state.sessionSeconds || 600;
      state.status = 'idle';
      state.error = null;
      state.expiredNotice = false;
      saveSession({ token, user, expiresAt, sessionSeconds: state.sessionSeconds });
    };

    b.addCase(login.pending, (state) => {
      state.status = 'loading';
      state.error = null;
    })
      .addCase(login.fulfilled, accept)
      .addCase(login.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload || 'Could not sign in';
      })

      .addCase(changePassword.fulfilled, (state) => {
        if (state.user) {
          state.user = { ...state.user, mustChangePassword: false };
          saveSession({ token: state.token, user: state.user, expiresAt: state.expiresAt, sessionSeconds: state.sessionSeconds });
        }
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        if (state.user && action.payload?.user) {
          state.user = { ...state.user, name: action.payload.user.name };
          saveSession({ token: state.token, user: state.user, expiresAt: state.expiresAt, sessionSeconds: state.sessionSeconds });
        }
      })
      .addCase(refreshSession.fulfilled, accept)
      .addCase(refreshSession.rejected, (state) => {
        // The token was already dead; treat it as a normal expiry.
        state.token = null;
        state.user = null;
        state.expiresAt = null;
        state.expiredNotice = true;
        saveSession(null);
      });
  },
});

export const { logout, sessionExpired, clearExpiredNotice, clearError } = authSlice.actions;

export const selectIsAuthed = (s) =>
  Boolean(s.auth.token) && Boolean(s.auth.expiresAt) && s.auth.expiresAt > Date.now();

export default authSlice.reducer;
