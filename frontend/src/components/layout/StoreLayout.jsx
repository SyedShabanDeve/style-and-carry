import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import Header from './Header';
import Footer from './Footer';
import MobileMenu from './MobileMenu';
import CartDrawer from '../shop/CartDrawer';
import SearchOverlay from '../shop/SearchOverlay';
import QuickView from '../shop/QuickView';
import { NewsletterBand } from '../home/Sections';
import PreviewBridge from './PreviewBridge';
import LocalePicker from './LocalePicker';
import { closeLocale } from '../../store/uiSlice';
import { useDispatch } from 'react-redux';
import { useGlobalReveal } from '../../hooks/useReveal';
import { selectContent, useFill, isOn } from '../../store/contentSlice';
import { selectSettings } from '../../store/settingsSlice';
import { whatsappLink } from '../../lib/format';
import { Whatsapp, Truck, Refresh, Shield } from '../ui/Icons';

const ANNOUNCE_ICONS = [Truck, Shield, Refresh];

/** The thin bar above the header. Edited in Dashboard -> Website -> Header & footer. */
function Announce() {
  const content = useSelector(selectContent);
  const fill = useFill();
  const bar = content.announcement;
  const items = (bar?.items || []).filter(Boolean);
  if (!isOn(bar) || (content.announcement && !items.length)) return null;
  const shown = items.length ? items : ['Cash on delivery all over Pakistan'];
  return (
    <div className="announce" data-section="announcement">
      <div className="wrap announce-in">
        {shown.map((t, i) => {
          const Icon = ANNOUNCE_ICONS[i % ANNOUNCE_ICONS.length];
          return (
            <span key={i} className={i ? 'announce-2' : undefined}>
              <Icon size={14} /> {fill(t)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Every route change starts at the top of the new page. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  }, [pathname, hash]);
  return null;
}

export default function StoreLayout() {
  const settings = useSelector(selectSettings);
  const content = useSelector(selectContent);
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  const dispatch = useDispatch();
  const localeOpen = useSelector((s) => s.ui.localeOpen);
  useGlobalReveal(mainRef);

  // The checkout stays focused on the order: no sign-up band there.
  /* The browser tab on the homepage reads "Store name — tagline". */
  useEffect(() => {
    if (pathname !== '/') return;
    const name = settings.storeName || 'Style & Carry';
    document.title = settings.tagline ? `${name} — ${settings.tagline}` : name;
  }, [pathname, settings.storeName, settings.tagline]);

  const showNewsletter = !pathname.startsWith('/checkout') && !pathname.startsWith('/order/');

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <ScrollToTop />
      <PreviewBridge />
      <Announce />
      <Header />

      <main id="main" ref={mainRef}>
        <div className="page-enter" key={pathname}>
          <Outlet />
        </div>
        {showNewsletter && <NewsletterBand newsletter={content.newsletter} />}
      </main>

      <Footer />
      <CartDrawer />
      <MobileMenu />
      <SearchOverlay />
      <QuickView />
      <LocalePicker open={localeOpen} onClose={() => dispatch(closeLocale())} />

      <a
        className="fab"
        href={whatsappLink(settings)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Order on WhatsApp"
        title="Order on WhatsApp"
      >
        <Whatsapp size={24} />
      </a>
    </>
  );
}
