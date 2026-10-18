import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import store from './store';
import App from './App';

import './styles/index.css';
import './styles/admin.css';
import './styles/theme.css';
import './styles/admin-theme.css';
import { resumeLanguage } from './lib/language';

/*
 * Google Translate replaces text nodes with its own <font> wrappers. When React
 * later updates or removes one of the originals it no longer finds it where
 * it left it and throws. These two guards let React carry on instead
 * (the widely used workaround from facebook/react#11538).
 */
if (typeof Node === 'function' && Node.prototype) {
  const removeChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function (child) {
    if (child.parentNode !== this) return child;
    return removeChild.call(this, child);
  };
  const insertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function (node, ref) {
    if (ref && ref.parentNode !== this) return insertBefore.call(this, node, null);
    return insertBefore.call(this, node, ref);
  };
}

resumeLanguage();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);
