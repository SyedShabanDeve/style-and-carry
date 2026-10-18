import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';

import Logo from './Logo';
import { selectSettings } from '../../store/settingsSlice';
import { selectCategories } from '../../store/productsSlice';
import { selectContent, useFill } from '../../store/contentSlice';
import { whatsappLink, enabledPayments } from '../../lib/format';
import { Whatsapp, Tiktok, Instagram, Mail, Phone, MapPin, Clock, ArrowUp } from '../ui/Icons';

export default function Footer() {
  const s = useSelector(selectSettings);
  const categories = useSelector(selectCategories);
  const payments = enabledPayments(s);
  const footer = useSelector(selectContent).footer || {};
  const fill = useFill();
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="wrap">
        {/* top row: questions, logo, socials */}
        <div className="foot-top">
          <div className="foot-q">
            <strong>{fill(footer.questionsTitle || 'Got questions?')}</strong>
            {s.phoneDisplay && (
              <a href={`tel:+${s.phone}`}>
                <Phone size={14} /> {s.phoneDisplay}
              </a>
            )}
            <a href={whatsappLink(s)} target="_blank" rel="noopener noreferrer">
              <Whatsapp size={14} /> Chat on WhatsApp
            </a>
          </div>

          <div className="foot-logo">
            <Logo light />
          </div>

          <div className="socials">
            <a href={whatsappLink(s)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <Whatsapp />
            </a>
            {s.tiktok && (
              <a href={s.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                <Tiktok />
              </a>
            )}
            {s.instagram && (
              <a href={s.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram />
              </a>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} aria-label="Email us">
                <Mail />
              </a>
            )}
          </div>
        </div>

        <div className="foot-grid">
          <div>
            <h4>Get in touch</h4>
            <ul className="foot-contact">
              {s.address && (
                <li>
                  <MapPin size={15} /> <span>{s.address}</span>
                </li>
              )}
              {s.phoneDisplay && (
                <li>
                  <Phone size={15} />
                  <a href={`tel:+${s.phone}`}>{s.phoneDisplay}</a>
                </li>
              )}
              {s.email && (
                <li>
                  <Mail size={15} />
                  <a href={`mailto:${s.email}`} className="foot-mail">
                    {s.email}
                  </a>
                </li>
              )}
              {s.hours && (
                <li>
                  <Clock size={15} /> <span>{s.hours}</span>
                </li>
              )}
            </ul>
          </div>

          <div>
            <h4>Shop</h4>
            <ul>
              <li>
                <Link to="/shop">All products</Link>
              </li>
              {categories.slice(0, 7).map((c) => (
                <li key={c.key}>
                  <Link to={`/shop?category=${encodeURIComponent(c.key)}`}>{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4>Quick links</h4>
            <ul>
              <li>
                <Link to="/about">Our story</Link>
              </li>
              <li>
                <Link to="/track">Track your order</Link>
              </li>
              <li>
                <Link to="/wishlist">Your wishlist</Link>
              </li>
              <li>
                <Link to="/shop?sale=1">Offers</Link>
              </li>
            </ul>
          </div>

          <div>
            <h4>Help</h4>
            <ul>
              <li>
                <Link to="/about#faq">Delivery &amp; exchanges</Link>
              </li>
              <li>
                <Link to="/about#faq">Frequently asked questions</Link>
              </li>
              <li>
                <a href={whatsappLink(s)} target="_blank" rel="noopener noreferrer">
                  WhatsApp support
                </a>
              </li>
              <li>
                <Link to="/admin" className="foot-dim">
                  Store login
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="foot-bot">
          <span>
            © {year} {s.storeName || 'Style & Carry'}. All rights reserved.
          </span>
          <div className="foot-pay" aria-label="Ways to pay">
            {payments.map((m) => (
              <span key={m.key}>{m.label}</span>
            ))}
          </div>
          <button type="button" className="foot-top-btn" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <ArrowUp /> Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
