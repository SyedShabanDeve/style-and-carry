import { configureStore } from '@reduxjs/toolkit';

import ui from './uiSlice';
import cart from './cartSlice';
import products from './productsSlice';
import orders from './ordersSlice';
import auth, { sessionExpired } from './authSlice';
import settings from './settingsSlice';
import wishlist from './wishlistSlice';
import content from './contentSlice';
import stats from './statsSlice';

import { attachAuth } from '../api/client';

export const store = configureStore({
  reducer: { ui, cart, wishlist, content, products, orders, auth, settings, stats },
  middleware: (getDefault) =>
    getDefault({
      // Every action payload here is plain JSON, so the default checks only
      // cost time in development.
      serializableCheck: false,
    }),
});

/**
 * Give the API client a way to read the current token and to report a dead
 * session, without the client importing the store (which would cycle).
 */
attachAuth({
  tokenGetter: () => store.getState().auth.token,
  expiredHandler: () => store.dispatch(sessionExpired()),
});

export default store;
