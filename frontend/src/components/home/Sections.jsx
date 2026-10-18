import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import api from '../../api/client';
import SmartLink from '../ui/SmartLink';
import ProductImage from '../ui/ProductImage';
import { Stars } from '../shop/Reviews';
import { imageUrl, formatDate } from '../../lib/format';
import {
  Truck,
  Shield,
  Refresh,
  Check,
  Heart,
  Whatsapp,
  Quote,
  ArrowRight,
  Send,
} from '../ui/Icons';

/** Centred section heading: small italic line, then the serif title. */
export function SectionTitle({ eyebrow, title, text, align = 'center', as: H = 'h2' }) {
  return (
    <div className={`st st-${align} rv`}>
      {eyebrow && (
        <span className="st-eyebrow">
          <i className="st-line" aria-hidden="true" />
          {eyebrow}
          <i className="st-line" aria-hidden="true" />
        </span>
      )}
      {title && <H className="st-title">{title}</H>}
      {text && <p className="st-text">{text}</p>}
    </div>
  );
}

/** Brand or partner logos, scrolling slowly in a loop. */
export function BrandStrip({ brands }) {
  if (!brands?.length) return null;
  // Repeat the set so the loop never shows a gap, however few logos there are.
  const reps = Math.max(2, Math.ceil(12 / brands.length));
  const row = Array.from({ length: reps }, () => brands).flat();
  return (
    <section className="brands" aria-label="Brands">
      <div className="brands-track" style={{ '--n': row.length }}>
        {[0, 1].map((copy) => (
          <div className="brands-row" key={copy} aria-hidden={copy === 1 || undefined}>
            {row.map((b, i) => (
              <SmartLink key={`${copy}-${b.id}-${i}`} to={b.link} className="brand" tabIndex={copy ? -1 : undefined}>
                <img src={imageUrl(b.image)} alt={copy ? '' : b.name || 'Brand logo'} loading="lazy" width="200" height="100" />
              </SmartLink>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

/** Two large promotional banners side by side. */
export function PromoBanners({ banners, section }) {
  if (!banners?.length) return null;
  return (
    <section className="section-sm sec-banners" data-section={section}>
      <div className={`wrap promos promos-${Math.min(banners.length, 3)}`}>
        {banners.map((b, i) => (
          <SmartLink key={b.id} to={b.link} className={`promo-card rv ${i % 2 ? 'rv-right' : 'rv-left'}`} style={{ transitionDelay: `${i * 110}ms` }}>
            <img src={imageUrl(b.image)} alt="" loading="lazy" width="1200" height="600" />
            <span className="promo-card-b">
              {b.eyebrow && <small>{b.eyebrow}</small>}
              {b.title && <strong>{b.title}</strong>}
              {b.link && (
                <em>
                  Shop now <ArrowRight size={14} />
                </em>
              )}
            </span>
          </SmartLink>
        ))}
      </div>
    </section>
  );
}

/** Category tiles with the name printed across the top of each photo. */
export function CategoryTiles({ categories }) {
  if (!categories?.length) return null;
  return (
    <div className="tiles">
      {categories.map((c, i) => (
        <Link
          key={c.key}
          to={`/shop?category=${encodeURIComponent(c.key)}`}
          className="tile rv rv-clip"
          style={{ transitionDelay: `${(i % 4) * 70}ms` }}
        >
          <ProductImage name={c.image} square alt="" width={800} height={800} />
          <span className="tile-name">{c.label}</span>
          <span className="tile-more">
            {c.count} {c.count === 1 ? 'product' : 'products'} <ArrowRight size={13} />
          </span>
        </Link>
      ))}
    </div>
  );
}

const FEATURE_ICONS = [Truck, Shield, Check, Refresh, Heart, Whatsapp];

/** Centre image with three promises on each side. */
export function FeatureShowcase({ features }) {
  const items = features?.items || [];
  if (!items.length) return null;
  const left = items.slice(0, Math.ceil(items.length / 2));
  const right = items.slice(Math.ceil(items.length / 2));
  const Item = ({ f, i, side }) => {
    const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
    return (
      <li className={`fs-item fs-${side} rv ${side === 'l' ? 'rv-left' : 'rv-right'}`} style={{ transitionDelay: `${(i % 3) * 120}ms` }}>
        <i>
          <Icon size={18} />
        </i>
        <div>
          <strong>{f.title}</strong>
          {f.text && <span>{f.text}</span>}
        </div>
      </li>
    );
  };

  return (
    <section className="section fs-sec" data-section="features">
      <div className="wrap">
        <SectionTitle eyebrow={features.eyebrow} title={features.title} />
        <div className="fs">
          <ul className="fs-col">
            {left.map((f, i) => (
              <Item key={f.title + i} f={f} i={i} side="l" />
            ))}
          </ul>
          <div className="fs-art rv rv-zoom">
            <span className="fs-ring" />
            {features.image && <img src={imageUrl(features.image)} alt="" loading="lazy" width="900" height="900" />}
          </div>
          <ul className="fs-col">
            {right.map((f, i) => (
              <Item key={f.title + i} f={f} i={i + left.length} side="r" />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

const verdict = (avg) =>
  avg >= 4.5 ? 'Excellent' : avg >= 4 ? 'Very good' : avg >= 3 ? 'Good' : 'Rated';

/**
 * Approved customer reviews. Hidden entirely until there is at least one,
 * so the homepage never shows an empty or invented testimonial.
 */
export function Testimonials({ heading }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let live = true;
    api
      .get('/reviews?featured=1&limit=7')
      .then((d) => live && setData(d))
      .catch(() => live && setData({ reviews: [], summary: { count: 0 } }));
    return () => {
      live = false;
    };
  }, []);

  if (!data?.reviews?.length) return null;
  const [lead, ...rest] = data.reviews;
  const { average, count } = data.summary;

  return (
    <section className="section testi-sec" data-section="testimonials">
      <div className="wrap">
        <SectionTitle eyebrow={heading?.eyebrow} title={heading?.title || 'Testimonials'} />

        <figure className="testi-lead rv">
          <Quote size={30} />
          <blockquote>{lead.text}</blockquote>
          <figcaption>
            <strong>{lead.name}</strong>
            {lead.productName && <span>on {lead.productName}</span>}
            <Stars value={lead.rating} size={15} />
          </figcaption>
        </figure>

        <div className="testi-score rv">
          <strong>{verdict(average)}</strong>
          <Stars value={average} size={20} />
          <span>
            {average.toFixed(1)} out of 5 · based on {count} {count === 1 ? 'review' : 'reviews'}
          </span>
        </div>

        {rest.length > 0 && (
          <div className="testi-grid">
            {rest.slice(0, 6).map((r, i) => (
              <article key={r.id} className="testi-card rv" style={{ transitionDelay: `${(i % 3) * 90}ms` }}>
                <header>
                  <span className="testi-av" aria-hidden="true">
                    {r.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{r.name}</strong>
                    <small>{formatDate(r.createdAt, false)}</small>
                  </div>
                </header>
                <Stars value={r.rating} size={14} />
                <p>{r.text}</p>
                {r.productSlug && (
                  <Link to={`/product/${r.productSlug}`} className="testi-prod">
                    {r.productName}
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** A slowly scrolling band of short promises, repeated so it never ends. */
export function Ticker({ items }) {
  const words = (items || []).filter(Boolean);
  if (!words.length) return null;
  const row = Array.from({ length: Math.max(3, Math.ceil(10 / words.length)) }, () => words).flat();
  return (
    <div className="ticker" aria-hidden="true">
      <div className="ticker-track">
        {[0, 1].map((copy) => (
          <div className="ticker-row" key={copy}>
            {row.map((w, i) => (
              <span key={`${copy}-${i}`}>
                {w}
                <i>✦</i>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Email sign-up band. Saves to the dashboard's Subscribers list. */
export function NewsletterBand({ newsletter }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ busy: false, ok: null, msg: '' });

  if (newsletter && newsletter.enabled === false) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setState({ busy: false, ok: false, msg: 'Please enter a valid email address' });
      return;
    }
    setState({ busy: true, ok: null, msg: '' });
    try {
      const res = await api.post('/newsletter', { email: email.trim() });
      setState({ busy: false, ok: true, msg: res.message || 'You are on the list. Thank you!' });
      setEmail('');
    } catch (err) {
      setState({ busy: false, ok: false, msg: err.message });
    }
  };

  return (
    <section className="nl" aria-labelledby="nl-title" data-section="newsletter">
      <div className="wrap nl-in rv">
        <div className="nl-copy">
          <h2 id="nl-title">{newsletter?.title || 'Newsletter signup'}</h2>
          {newsletter?.text && <p>{newsletter.text}</p>}
        </div>
        <form className="nl-form" onSubmit={submit} noValidate>
          <label htmlFor="nl-email" className="sr">
            Email address
          </label>
          <input
            id="nl-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={state.ok === false || undefined}
            aria-describedby="nl-msg"
          />
          <button className="btn btn-primary" type="submit" disabled={state.busy}>
            {state.busy ? <span className="spin" /> : <Send size={15} />} Subscribe
          </button>
          <p id="nl-msg" className={`nl-msg${state.ok === true ? ' ok' : state.ok === false ? ' bad' : ''}`} role="status">
            {state.msg}
          </p>
        </form>
      </div>
    </section>
  );
}
