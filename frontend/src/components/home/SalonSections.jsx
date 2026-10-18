import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import ProductImage from '../ui/ProductImage';
import Button from '../ui/Button';
import { SectionTitle } from './Sections';
import { imageUrl } from '../../lib/format';
import { useMoney } from '../../lib/currency';
import { useFill } from '../../store/contentSlice';
import { Search, ArrowRight, ChevronLeft, ChevronRight, Truck, Shield, Check, Refresh, Heart, Whatsapp, Quote } from '../ui/Icons';

/* ---------- hero search panel ---------- */

/** One search box and a row of category shortcuts: nothing to figure out. */
export function HeroSearch({ categories, button = 'Search' }) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const shortcuts = categories.filter((c) => c.count > 0).slice(0, 6);

  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
  };

  return (
    <div className="wrap hsx-wrap">
      <div className="hsx">
        <form className="hsx-row" onSubmit={submit} role="search" aria-label="Find a product">
          <label className="hsx-in">
            <Search size={18} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search, e.g. black wallet"
              aria-label="Search the shop"
              enterKeyHint="search"
            />
          </label>
          <button type="submit" className="btn btn-accent hsx-btn">
            {button}
          </button>
        </form>
        {shortcuts.length > 0 && (
          <div className="hsx-chips">
            <span>Popular:</span>
            {shortcuts.map((c) => (
              <Link key={c.key} to={`/shop?category=${encodeURIComponent(c.key)}`}>
                {c.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- category row ---------- */

export function CategoryRow({ categories, heading }) {
  const fill = useFill();
  if (!categories.length) return null;
  return (
    <section className="section cat-sec" data-section="categorySection">
      <div className="wrap">
        <SectionTitle eyebrow={fill(heading.eyebrow)} title={fill(heading.title || 'Category')} text={fill(heading.text)} />
        <div className="catrow" style={{ '--n': Math.min(categories.length, 6) }}>
          {categories.map((c, i) => (
            <Link
              key={c.key}
              to={`/shop?category=${encodeURIComponent(c.key)}`}
              className="catrow-card rv"
              style={{ transitionDelay: `${(i % 6) * 70}ms` }}
            >
              <span className="catrow-img">
                <ProductImage name={c.image} square alt="" width={160} height={160} />
              </span>
              <strong>{c.label}</strong>
              {c.description && <small>{c.description}</small>}
              <em>
                See {c.count} {c.count === 1 ? 'style' : 'styles'} <ArrowRight size={12} />
              </em>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- featured band (taupe panel + collage) ---------- */

export function FeaturedBand({ story, products }) {
  const fill = useFill();
  const fmt = useMoney();
  const picks = products.slice(0, 3);
  const collage = products.filter((p) => p.images?.[0]).slice(3, 5);
  if (!picks.length) return null;
  return (
    <section className="fband" data-section="story">
      <div className="fband-panel">
        <div className="fband-in rv rv-left">
          {story.eyebrow && <span className="fband-eyebrow">{fill(story.eyebrow)}</span>}
          <h2>{fill(story.title)}</h2>
          {story.text && <p>{fill(story.text)}</p>}
          <Button to="/shop" variant="outline" size="sm" className="on-dark fband-btn">
            {fill(story.button) || 'See all products'} <ArrowRight size={14} />
          </Button>
          <div className="fband-cards">
            {picks.map((p) => (
              <Link key={p.id} to={`/product/${p.slug}`} className="fband-card">
                <ProductImage name={p.images?.[0]} square alt="" width={200} height={200} />
                <strong>{p.name}</strong>
                <small translate="no">{fmt(p.price)}</small>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <div className="fband-art rv rv-right" aria-hidden="true">
        {collage[0] && (
          <span className="fband-a">
            <ProductImage name={collage[0].images[0]} alt="" width={700} height={900} />
          </span>
        )}
        {collage[1] && (
          <span className="fband-b">
            <ProductImage name={collage[1].images[0]} alt="" width={500} height={620} />
          </span>
        )}
      </div>
    </section>
  );
}

/* ---------- promise cards ---------- */

const CARD_ICONS = [Truck, Shield, Check, Refresh, Heart, Whatsapp];

export function FeatureCards({ features }) {
  const fill = useFill();
  const items = (features?.items || []).filter((i) => i.title);
  if (!items.length) return null;
  return (
    <section className="section fcards-sec" data-section="features">
      <div className="wrap">
        <SectionTitle eyebrow={fill(features.eyebrow)} title={fill(features.title)} />
        <div className="fcards">
          {items.map((it, i) => {
            const Icon = CARD_ICONS[i % CARD_ICONS.length];
            return (
              <article key={it.title + i} className="fcard rv" style={{ transitionDelay: `${(i % 3) * 90}ms` }}>
                <span className="fcard-i">
                  <Icon size={22} />
                </span>
                <h3>{fill(it.title)}</h3>
                {it.text && <p>{fill(it.text)}</p>}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------- dark offers band with a sliding strip ---------- */

export function OffersBand({ offers, products }) {
  const fill = useFill();
  const fmt = useMoney();
  const strip = useRef(null);
  const [at, setAt] = useState(0);
  if (!products.length) return null;

  const slide = (d) => {
    const el = strip.current;
    if (!el) return;
    el.scrollBy({ left: d * (el.clientWidth * 0.8), behavior: 'smooth' });
  };
  const onScroll = () => {
    const el = strip.current;
    if (el) setAt(el.scrollLeft / Math.max(1, el.scrollWidth - el.clientWidth));
  };

  return (
    <section className="oband" data-section="offers">
      <div className="wrap oband-in">
        <div className="oband-copy rv rv-left">
          {offers.eyebrow && <span className="fband-eyebrow">{fill(offers.eyebrow)}</span>}
          <h2>{fill(offers.title) || 'Special Offers'}</h2>
          {offers.text && <p>{fill(offers.text)}</p>}
          <Button to="/shop?sale=1" variant="accent" size="sm">
            {fill(offers.button) || 'Shop all offers'} <ArrowRight size={14} />
          </Button>
        </div>
        <div className="oband-strip-wrap rv rv-right">
          <div className="oband-strip" ref={strip} onScroll={onScroll}>
            {products.map((p) => {
              const off = p.compareAt > p.price ? Math.round(((p.compareAt - p.price) / p.compareAt) * 100) : 0;
              return (
                <Link key={p.id} to={`/product/${p.slug}`} className="oband-item">
                  <ProductImage name={p.images?.[0]} square alt={p.name} width={400} height={400} />
                  {off > 0 && <span className="tag tag-sale">-{off}%</span>}
                  <span className="oband-meta">
                    <strong>{p.name}</strong>
                    <small translate="no">
                      {fmt(p.price)} {off > 0 && <s>{fmt(p.compareAt)}</s>}
                    </small>
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="oband-ui">
            <span className="oband-track" aria-hidden="true">
              <i style={{ width: `${20 + at * 80}%` }} />
            </span>
            <div>
              <button type="button" onClick={() => slide(-1)} aria-label="Previous offers">
                <ChevronLeft size={18} />
              </button>
              <button type="button" onClick={() => slide(1)} aria-label="More offers">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- quote over a picture ---------- */

export function QuoteBand({ quote }) {
  const fill = useFill();
  if (!quote?.text) return null;
  return (
    <section
      className="qband"
      data-section="quote"
      style={quote.image ? { '--qimg': `url("${imageUrl(quote.image)}")` } : undefined}
    >
      <div className="wrap qband-in rv">
        <Quote size={40} />
        <blockquote>{fill(quote.text)}</blockquote>
        {quote.author && <cite>{fill(quote.author)}</cite>}
        <Quote size={40} />
      </div>
    </section>
  );
}

/* ---------- about us split ---------- */

export function AboutSplit({ about }) {
  const fill = useFill();
  const paras = fill(about?.text || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (!about?.title && !paras.length) return null;
  return (
    <section className="section asplit-sec" data-section="aboutSection">
      <div className="wrap asplit">
        <div className="asplit-copy rv rv-left">
          {about.eyebrow && <span className="st-eyebrow">{fill(about.eyebrow)}</span>}
          <h2 className="st-title">{fill(about.title)}</h2>
          {paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <Button to="/about" variant="primary" size="sm">
            {fill(about.button) || 'Read our story'} <ArrowRight size={14} />
          </Button>
        </div>
        {about.image && (
          <div className="asplit-art rv rv-zoom">
            <img src={imageUrl(about.image)} alt="" loading="lazy" width="900" height="1100" />
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------- gallery (masonry of product photos) ---------- */

export function Gallery({ gallery, products }) {
  const fill = useFill();
  const items = useMemo(() => {
    const out = [];
    for (const p of products) {
      for (const img of p.images || []) {
        out.push({ img, p });
        if (out.length >= 7) return out;
      }
    }
    return out;
  }, [products]);
  if (items.length < 4) return null;
  return (
    <section className="section gal-sec" data-section="gallery">
      <div className="wrap">
        <SectionTitle eyebrow={fill(gallery.eyebrow)} title={fill(gallery.title) || 'Gallery'} />
        <div className="gal">
          {items.map(({ img, p }, i) => (
            <Link key={`${p.id}-${img}`} to={`/product/${p.slug}`} className={`gal-i g${i + 1} rv rv-clip`} style={{ transitionDelay: `${(i % 4) * 80}ms` }}>
              <ProductImage name={img} alt={p.name} width={700} height={700} />
              <span>
                {p.name} <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
