import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import SessionTimer from './SessionTimer';
import { LogoImage } from '../layout/Logo';
import { logout, selectIsAuthed } from '../../store/authSlice';
import { pushToast, toggleTheme } from '../../store/uiSlice';
import { fetchOrders } from '../../store/ordersSlice';
import { fetchProducts } from '../../store/productsSlice';
import { fetchContent } from '../../store/contentSlice';
import api from '../../api/client';
import {
  Grid,
  Bag,
  Package,
  Cog,
  LogOut,
  Menu,
  X,
  User,
  Sun,
  Moon,
  ArrowRight,
  Home,
  Layers,
  Star,
  Mail,
  Users,
  Lock,
  Search,
  Bell,
  ChevronDown,
  Plus,
  Database,
  Clock,
} from '../ui/Icons';

/* Title and a short, friendly line for each page. */
const PAGES = {
  '/admin': ['Dashboard', 'How your store is doing today'],
  '/admin/orders': ['Orders', 'Confirm, ship and track every order'],
  '/admin/products': ['Products', 'Everything you sell, with price and stock'],
  '/admin/products/new': ['Add product', 'Name, price, photos and colours'],
  '/admin/settings': ['Settings', 'Store details, delivery, payments and password'],
  '/admin/homepage': ['Edit website', 'Change any picture or text on your shop'],
  '/admin/categories': ['Categories', 'Group your products, like Watches or Ladies suits'],
  '/admin/reviews': ['Reviews', 'Approve what customers wrote before it goes live'],
  '/admin/subscribers': ['Subscribers', 'People who joined your newsletter'],
  '/admin/team': ['Team', 'Invite admins and set up email'],
  '/admin/backup': ['Backup', 'Keep a copy of your products, photos and admins'],
};

/** Wraps every admin route; sends anyone without a live session to the login. */
export default function AdminLayout() {
  const authed = useSelector(selectIsAuthed);
  const user = useSelector((s) => s.auth.user);
  const orders = useSelector((s) => s.orders.list);
  const theme = useSelector((s) => s.ui.theme);
  const storeName = useSelector((s) => s.settings.data.storeName) || 'Style & Carry';
  const storeLogo = useSelector((s) => s.settings.data.logo);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [waitingReviews, setWaitingReviews] = useState(0);
  const [menu, setMenu] = useState(false);
  const [backup, setBackup] = useState(null);
  const backupChecked = useRef(0);
  const menuRef = useRef(null);

  /* The account menu closes on any click outside it. */
  useEffect(() => {
    if (!menu) return undefined;
    const off = (e) => !menuRef.current?.contains(e.target) && setMenu(false);
    document.addEventListener('pointerdown', off);
    return () => document.removeEventListener('pointerdown', off);
  }, [menu]);

  /* Load what the dashboard needs, once we know the session is good. */
  useEffect(() => {
    if (!authed) return;
    dispatch(fetchOrders());
    dispatch(fetchProducts({ includeInactive: true }));
    dispatch(fetchContent());
  }, [authed, dispatch]);

  /* Reviews waiting for approval, refreshed on every page change. */
  useEffect(() => {
    if (!authed) return;
    api
      .get('/reviews/admin', { auth: true })
      .then((d) => setWaitingReviews(d.reviews.filter((r) => r.status === 'pending').length))
      .catch(() => {});
  }, [authed, location.pathname]);

  /* Backup reminder for the owner: checked on arrival and again every few
     minutes as they move around, and updated at once by the Backup page. */
  useEffect(() => {
    if (!authed || user?.role !== 'owner') return;
    if (Date.now() - backupChecked.current < 3 * 60 * 1000) return;
    backupChecked.current = Date.now();
    api
      .get('/backup/status', { auth: true })
      .then(setBackup)
      .catch(() => {});
  }, [authed, user?.role, location.pathname]);
  useEffect(() => {
    const on = (e) => setBackup(e.detail);
    window.addEventListener('sc:backup', on);
    return () => window.removeEventListener('sc:backup', on);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [location.pathname]);

  if (!authed) {
    // Remember where they were headed so login can send them back.
    return <Navigate to="/admin/login" state={{ from: location.pathname }} replace />;
  }

  const signOut = () => {
    dispatch(logout());
    dispatch(pushToast({ title: 'Signed out', message: 'You have been signed out safely.', kind: 'info' }));
    navigate('/admin/login', { replace: true });
  };

  const pending = orders.filter((o) => o.status === 'pending').length;
  const page =
    PAGES[location.pathname] ||
    (location.pathname.includes('/products/') ? ['Edit product', 'Change details, photos and price'] : ['Admin', '']);
  const [title, sub] = page;
  const first = user?.name || user?.username || '';
  const backupDue = user?.role === 'owner' && Boolean(backup?.due);
  const showBackupNote = backupDue && location.pathname !== '/admin/backup';
  const alerts = pending + waitingReviews + (backupDue ? 1 : 0);
  const bellTo = pending ? '/admin/orders?status=pending' : waitingReviews ? '/admin/reviews' : backupDue ? '/admin/backup' : '/admin/orders?status=pending';
  const backupLine = backup?.lastBackupAt
    ? `Last backup ${backup.daysSince} day${backup.daysSince === 1 ? '' : 's'} ago`
    : 'No backup saved yet';

  const nav = (to, Icon, label, extra, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'on' : undefined)}>
      <Icon size={17} /> <span>{label}</span>
      {extra}
    </NavLink>
  );

  return (
    <div className="admin notranslate" translate="no">
      <div className={`side-scrim${open ? ' on' : ''}`} onClick={() => setOpen(false)} />

      <aside className={`side${open ? ' open' : ''}`}>
        <div className="side-head">
          <Link to="/admin" className="logo">
            {storeLogo ? (
              <LogoImage logo={storeLogo} alt="" />
            ) : (
              <span className="logo-mark">
                S<i>&amp;</i>C
              </span>
            )}
            <span className="side-brand">
              <b>{storeName}</b>
              <small>Store dashboard</small>
            </span>
          </Link>
          <button className="icon-btn side-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="side-nav">
          {nav('/admin', Grid, 'Overview', null, true)}
          {nav('/admin/orders', Bag, 'Orders', pending > 0 && <span className="tally">{pending}</span>)}
          {nav('/admin/products', Package, 'Products')}
          {nav('/admin/categories', Layers, 'Categories')}
          {nav('/admin/reviews', Star, 'Reviews', waitingReviews > 0 && <span className="tally">{waitingReviews}</span>)}
          {nav('/admin/subscribers', Mail, 'Subscribers')}
          {nav('/admin/homepage', Home, 'Edit website')}

          <div className="side-sep" />
          {nav('/admin/settings', Cog, 'Settings')}
          {user?.role === 'owner' && nav('/admin/team', Users, 'Team')}
          {user?.role === 'owner' && nav('/admin/backup', Database, 'Backup', backupDue && <span className="tally tally-warn" aria-label="Backup needed">!</span>)}
          <button type="button" className="side-link" onClick={signOut}>
            <LogOut size={17} /> <span>Log out</span>
          </button>
        </nav>

        <div className="side-foot">
          <a className="side-promo" href="/" target="_blank" rel="noopener noreferrer">
            <span className="side-promo-i">
              <Home size={18} />
            </span>
            <strong>Visit your store</strong>
            <small>See the shop the way customers do</small>
            <span className="side-promo-b">
              Open store <ArrowRight size={13} />
            </span>
          </a>
          <SessionTimer onLogout={signOut} />
        </div>
      </aside>

      <div className="admin-main">
        <header className={`topbar${showBackupNote ? ' has-alert' : ''}`}>
          <button className="icon-btn side-toggle" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <div className="topbar-t">
            <h1>{title}</h1>
            {sub && <p>{sub}</p>}
          </div>

          {/* The jobs done most often, one click away on the overview. */}
          {location.pathname === '/admin' && (
            <nav className="top-quick" aria-label="Quick actions">
              <Link to="/admin/products/new" className="btn btn-primary btn-sm">
                <Plus size={15} /> Add product
              </Link>
              <Link to="/admin/orders" className="btn btn-outline btn-sm">
                <Bag size={15} /> Orders
              </Link>
              <Link to="/admin/homepage" className="btn btn-outline btn-sm">
                <Home size={15} /> Edit website
              </Link>
            </nav>
          )}

          {showBackupNote && (
            <Link to="/admin/backup" className="top-backup" title={backupLine}>
              <Clock size={15} />
              <span>
                <b>Backup needed</b>
                <small>{backupLine}</small>
              </span>
            </Link>
          )}

          <form
            className="top-search"
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              const q = e.currentTarget.q.value.trim();
              navigate(q ? `/admin/orders?q=${encodeURIComponent(q)}` : '/admin/orders');
              e.currentTarget.reset();
            }}
          >
            <Search size={15} />
            <input name="q" placeholder="Search orders, names, phones…" aria-label="Search orders" />
          </form>

          <Link to={bellTo} className="icon-btn top-bell" aria-label={`${alerts} things need your attention`} title="Needs attention">
            <Bell size={18} />
            {alerts > 0 && <span className="count-dot">{alerts > 99 ? '99+' : alerts}</span>}
          </Link>
          <button className="icon-btn" onClick={() => dispatch(toggleTheme())} aria-label="Toggle dark mode" title="Light / dark">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="top-me-wrap" ref={menuRef}>
            <button type="button" className="topbar-me" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="menu">
              <i>{(first || 'O').slice(0, 1).toUpperCase()}</i>
              <span>
                <b>{first || 'Owner'}</b>
                <small>{user?.role === 'owner' ? 'Owner' : 'Admin'}</small>
              </span>
              <ChevronDown size={14} />
            </button>
            {menu && (
              <div className="top-menu" role="menu">
                <div className="top-menu-who">
                  <strong>{first}</strong>
                  <span>{user?.email}</span>
                </div>
                <Link to="/admin/settings" role="menuitem" onClick={() => setMenu(false)}>
                  <Cog size={15} /> Settings
                </Link>
                <Link to="/admin/settings#password" role="menuitem" onClick={() => setMenu(false)}>
                  <Lock size={15} /> Change password
                </Link>
                {user?.role === 'owner' && (
                  <Link to="/admin/team" role="menuitem" onClick={() => setMenu(false)}>
                    <Users size={15} /> Team
                  </Link>
                )}
                {user?.role === 'owner' && (
                  <Link to="/admin/backup" role="menuitem" onClick={() => setMenu(false)}>
                    <Database size={15} /> Backup
                  </Link>
                )}
                <button type="button" role="menuitem" onClick={signOut}>
                  <LogOut size={15} /> Log out
                </button>
              </div>
            )}
          </div>
        </header>

        {showBackupNote && (
          <Link to="/admin/backup" className="bk-banner" role="status">
            <Database size={16} />
            <span>
              <b>Backup needed.</b> {backupLine}. Save one so your products, photos and admins are safe.
            </span>
            <ArrowRight size={14} />
          </Link>
        )}

        {user?.mustChangePassword && location.pathname !== '/admin/settings' && (
          <div className="pw-banner" role="status">
            <Lock size={15} />
            <span>You are signed in with a temporary password. Please choose your own.</span>
            <Link to="/admin/settings#password" className="btn btn-sm btn-primary">
              Change password
            </Link>
          </div>
        )}

        <div className="admin-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
