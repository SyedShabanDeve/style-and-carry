import { NavLink, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import Modal from '../ui/Modal';
import Logo from './Logo';
import { closeNav, toggleTheme, openSearch, openLocale } from '../../store/uiSlice';
import { LocaleButton } from './LocalePicker';
import { selectCategories } from '../../store/productsSlice';
import { selectWishCount } from '../../store/wishlistSlice';
import { selectSettings } from '../../store/settingsSlice';
import { whatsappLink } from '../../lib/format';
import { Search, Sun, Moon, Whatsapp, ChevronRight } from '../ui/Icons';

/** Slide-in menu for phones and small tablets. */
export default function MobileMenu() {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.navOpen);
  const theme = useSelector((s) => s.ui.theme);
  const categories = useSelector(selectCategories);
  const wishCount = useSelector(selectWishCount);
  const settings = useSelector(selectSettings);
  const close = () => dispatch(closeNav());

  return (
    <Modal open={open} onClose={close} label="Menu" variant="left" className="mm">
      <div className="mm-head">
        <Logo onClick={close} />
      </div>

      <div className="mm-body" id="mobile-menu">
        <button
          type="button"
          className="mm-search"
          onClick={() => dispatch(openSearch())}
        >
          <Search size={18} /> Search the shop
        </button>

        <nav className="mm-nav" aria-label="Main">
          <NavLink to="/" end onClick={close}>
            Home <ChevronRight />
          </NavLink>
          <NavLink to="/shop" end onClick={close}>
            Shop all <ChevronRight />
          </NavLink>
          <NavLink to="/wishlist" onClick={close}>
            Wishlist {wishCount > 0 && <span className="mm-count">{wishCount}</span>} <ChevronRight />
          </NavLink>
          <NavLink to="/track" onClick={close}>
            Track order <ChevronRight />
          </NavLink>
          <NavLink to="/about" onClick={close}>
            About <ChevronRight />
          </NavLink>
        </nav>

        {categories.length > 0 && (
          <div className="mm-sec">
            <span className="eyebrow-sm">Categories</span>
            <div className="mm-cats">
              {categories.map((c) => (
                <Link
                  key={c.key}
                  to={`/shop?category=${encodeURIComponent(c.key)}`}
                  onClick={close}
                >
                  {c.label}
                  <small>{c.count}</small>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mm-foot">
        <LocaleButton className="mm-row mm-loc" onClick={() => dispatch(openLocale())} />
        <button type="button" className="mm-row" onClick={() => dispatch(toggleTheme())}>
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <a className="mm-row" href={whatsappLink(settings)} target="_blank" rel="noopener noreferrer">
          <Whatsapp size={18} /> Chat on WhatsApp
        </a>
      </div>
    </Modal>
  );
}
