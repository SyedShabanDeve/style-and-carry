import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import StoreLayout from './components/layout/StoreLayout';
import Toasts from './components/ui/Toasts';

import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import NotFound from './pages/NotFound';

import { fetchProducts, selectAllProducts } from './store/productsSlice';
import { fetchSettings, selectSettings } from './store/settingsSlice';
import { useLogoArt, setFavicon } from './lib/logoArt';
import { fetchContent } from './store/contentSlice';
import { reconcile } from './store/cartSlice';

/* Checkout and the whole admin area load on demand, so a first-time shopper
   never downloads the dashboard. */
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const TrackOrder = lazy(() => import('./pages/TrackOrder'));
const About = lazy(() => import('./pages/About'));
const Wishlist = lazy(() => import('./pages/Wishlist'));

const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const Login = lazy(() => import('./pages/admin/Login'));
const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts'));
const ProductForm = lazy(() => import('./pages/admin/ProductForm'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminHomepage = lazy(() => import('./pages/admin/AdminHomepage'));
const AdminCategories = lazy(() => import('./pages/admin/AdminCategories'));
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews'));
const AdminSubscribers = lazy(() => import('./pages/admin/AdminSubscribers'));
const AdminTeam = lazy(() => import('./pages/admin/AdminTeam'));
const AdminBackup = lazy(() => import('./pages/admin/AdminBackup'));
const AdminActivity = lazy(() => import('./pages/admin/AdminActivity'));
const VerifyEmail = lazy(() => import('./pages/admin/VerifyEmail'));

function Loading() {
  return (
    <div className="page-load" role="status" aria-live="polite">
      <div className="spin" />
      <span>Loading…</span>
    </div>
  );
}

export default function App() {
  const dispatch = useDispatch();
  const products = useSelector(selectAllProducts);
  const status = useSelector((s) => s.products.status);
  const logo = useSelector(selectSettings).logo;
  const logoArt = useLogoArt(logo);

  /* Catalogue and store settings, once, at start-up. */
  useEffect(() => {
    dispatch(fetchProducts());
    dispatch(fetchSettings());
    dispatch(fetchContent());
  }, [dispatch]);

  /* The browser tab shows the store's own logo once one is uploaded. */
  useEffect(() => {
    setFavicon(logo ? logoArt?.icon : null);
  }, [logo, logoArt]);

  /* A cart saved last week may hold old prices or a deleted product. */
  useEffect(() => {
    if (status === 'ready' && products.length) dispatch(reconcile(products));
  }, [status, products, dispatch]);

  return (
    <>
      <Suspense fallback={<Loading />}>
        <Routes>
          {/* ---------- storefront ---------- */}
          <Route element={<StoreLayout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<Shop />} />
            <Route path="product/:slug" element={<ProductDetail />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="order/:orderNo" element={<OrderSuccess />} />
            <Route path="track" element={<TrackOrder />} />
            <Route path="about" element={<About />} />
            <Route path="wishlist" element={<Wishlist />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ---------- admin ---------- */}
          <Route path="/admin/login" element={<Login />} />
          <Route path="/admin/verify" element={<VerifyEmail />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<ProductForm />} />
            <Route path="products/:id" element={<ProductForm />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="homepage" element={<AdminHomepage />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="subscribers" element={<AdminSubscribers />} />
            <Route path="team" element={<AdminTeam />} />
            <Route path="backup" element={<AdminBackup />} />
            <Route path="activity" element={<AdminActivity />} />
          </Route>
        </Routes>
      </Suspense>

      <Toasts />
    </>
  );
}
