import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import Logo from './Logo';
import { openCart, toggleNav, closeNav, toggleTheme, openSearch, openLocale } from '../../store/uiSlice';
import { LocaleButton } from './LocalePicker';
import { selectCartCount } from '../../store/cartSlice';
import { selectWishCount } from '../../store/wishlistSlice';
import { selectCategories } from '../../store/productsSlice';
import { Cart, Menu, Sun, Moon, Search, Heart, ChevronDown, ArrowRight } from '../ui/Icons';

const LINKS = [
  ['/', 'Home'],
  ['/shop', 'Shop'],
  ['/track', 'Track order'],
  ['/about', 'About'],
];

function CountDot({ n }) {
  if (!n) return null;
  return (
    <span className="count-dot" key={n}>
      {n > 99 ? '99+' : n}
    </span>
  );
}

/** Desktop "Categories" menu. Opens on hover or click, closes on Escape. */
function CategoriesMenu() {
  const categories = useSelector(selectCategories);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.search]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!categories.length) return null;

  return (
    <div
      className={`nav-drop${open ? ' open' : ''}`}
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="nav-link"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
      >
        Categories <ChevronDown size={14} />
      </button>
      <div className="nav-drop-panel" role="menu">
        {categories.map((c) => (
          <Link key={c.key} to={`/shop?category=${encodeURIComponent(c.key)}`} role="menuitem">
            <span>{c.label}</span>
            <small>{c.count}</small>
          </Link>
        ))}
        <Link to="/shop" className="nav-drop-all" role="menuitem">
          Shop everything <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  );
}

export default function Header() {
  const dispatch = useDispatch();
  const location = useLocation();
  const count = useSelector(selectCartCount);
  const wishCount = useSelector(selectWishCount);
  const navOpen = useSelector((s) => s.ui.navOpen);
  const theme = useSelector((s) => s.ui.theme);
  const [stuck, setStuck] = useState(false);

  /* A hairline under the header once the page has moved. */
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Any navigation closes the mobile menu. */
  useEffect(() => {
    dispatch(closeNav());
  }, [location.pathname, location.search, dispatch]);

  return (
    <header className={`header${stuck ? ' stuck' : ''}${location.pathname === '/' && !stuck ? ' over' : ''}`}>
      <div className="wrap header-in">
        <button
          className="icon-btn burger"
          onClick={() => dispatch(toggleNav())}
          aria-label="Open menu"
          aria-expanded={navOpen}
          aria-controls="mobile-menu"
        >
          <Menu />
        </button>

        <Logo />

        <nav className="nav" aria-label="Main">
          {LINKS.slice(0, 2).map(([to, label]) => (
            <NavLink key={to} to={to} end={to === '/'} className="nav-link">
              {label}
            </NavLink>
          ))}
          <CategoriesMenu />
          {LINKS.slice(2).map(([to, label]) => (
            <NavLink key={to} to={to} className="nav-link">
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="header-act">
          <LocaleButton className="hide-xs" onClick={() => dispatch(openLocale())} />
          <button className="icon-btn" onClick={() => dispatch(openSearch())} aria-label="Search">
            <Search size={19} />
          </button>

          <button
            className="icon-btn hide-sm"
            onClick={() => dispatch(toggleTheme())}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <Sun /> : <Moon />}
          </button>

          <Link
            to="/wishlist"
            className="icon-btn"
            aria-label={`Wishlist, ${wishCount} saved`}
            title="Wishlist"
          >
            <Heart size={19} />
            <CountDot n={wishCount} />
          </Link>

          <button
            className="icon-btn"
            onClick={() => dispatch(openCart())}
            aria-label={`Open cart, ${count} item${count === 1 ? '' : 's'}`}
          >
            <Cart size={19} />
            <CountDot n={count} />
          </button>
        </div>
      </div>
    </header>
  );
}
