import { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import ProductGrid from '../components/shop/ProductGrid';
import WishlistButton from '../components/shop/WishlistButton';
import { ColourPicker, QtyStepper } from '../components/shop/ProductOptions';
import ProductImage from '../components/ui/ProductImage';
import Button from '../components/ui/Button';
import Rating from '../components/ui/Rating';
import EmptyState from '../components/ui/EmptyState';
import { ProductDetailSkeleton } from '../components/ui/Skeleton';
import { fetchProduct, clearCurrent, selectLiveProducts } from '../store/productsSlice';
import { addItem } from '../store/cartSlice';
import { pushToast, openCart } from '../store/uiSlice';
import { selectSettings } from '../store/settingsSlice';
import { money, whatsappLink, pricing, stockState, imageUrl } from '../lib/format';
import { useCategoryName, selectContent, useFill } from '../store/contentSlice';
import ProductReviews from '../components/shop/Reviews';
import {
  Cart,
  Whatsapp,
  Truck,
  Refresh,
  Shield,
  ChevronRight,
  ChevronLeft,
  Wallet,
  ArrowRight,
  Play,
} from '../components/ui/Icons';
import { useMoney } from '../lib/currency';

export default function ProductDetail() {
  const { slug } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const categoryLabel = useCategoryName();
  const pc = useSelector(selectContent).product || {};
  const fill = useFill();

  const listed = useSelector(selectLiveProducts);
  const listStatus = useSelector((s) => s.products.status);
  const fetched = useSelector((s) => s.products.current);
  const status = useSelector((s) => s.products.currentStatus);
  const settings = useSelector(selectSettings);
  const cur = settings.currency || 'Rs';
  const fmt = useMoney();

  /* Prefer the copy already in the catalogue so the page paints instantly. */
  const product = useMemo(
    () => listed.find((p) => p.slug === slug) || (fetched?.slug === slug ? fetched : null),
    [listed, fetched, slug]
  );

  const [colour, setColour] = useState(null);
  const [qty, setQty] = useState(1);
  const [shot, setShot] = useState(0);

  useEffect(() => {
    dispatch(fetchProduct(slug));
    return () => dispatch(clearCurrent());
  }, [slug, dispatch]);

  /* Reset the picker whenever we land on a different product. */
  useEffect(() => {
    setColour(product?.colors?.[0]?.[0] || null);
    setQty(1);
    setShot(0);
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Tab title follows the product. */
  useEffect(() => {
    if (!product) return undefined;
    const prev = document.title;
    document.title = `${product.name} — ${settings.storeName || 'Style & Carry'}`;
    return () => {
      document.title = prev;
    };
  }, [product, settings.storeName]);

  if (!product) {
    if (status === 'loading' || status === 'idle' || listStatus === 'loading') {
      return <ProductDetailSkeleton />;
    }
    return (
      <div className="wrap section">
        <EmptyState
          icon={Wallet}
          title="We could not find that product"
          action={
            <Button to="/shop">
              Back to the shop <ArrowRight />
            </Button>
          }
        >
          It may have sold out and been taken down, or the link may be old.
        </EmptyState>
      </div>
    );
  }

  const { soldOut, low, left } = stockState(product);
  const { price, compareAt, saving, off } = pricing(product);
  const max = Math.min(20, left || 20);
  const images = product.images?.length ? product.images : [null];
  /* The clip, when there is one, comes right after the first photo. */
  const media = images.map((img) => ({ img }));
  if (product.video) media.splice(1, 0, { video: product.video, poster: images[0] });
  const freeOver = settings.freeDeliveryOver || 2500;

  /* Same category first, then anything else, so there is always something. */
  const related = listed
    .filter((p) => p.id !== product.id && p.category === product.category)
    .slice(0, 4);
  const relatedIds = new Set(related.map((p) => p.id));
  const similar = listed
    .filter((p) => p.id !== product.id && !relatedIds.has(p.id))
    .sort((a, b) => Math.abs(a.price - price) - Math.abs(b.price - price))
    .slice(0, 4);

  const add = (goToCheckout = false) => {
    dispatch(addItem(product, { color: colour, qty }));
    if (goToCheckout) {
      navigate('/checkout');
    } else {
      dispatch(pushToast({ title: 'Added to cart', message: `${product.name}${colour ? ` · ${colour}` : ''} × ${qty}`, kind: 'ok' }));
      dispatch(openCart());
    }
  };

  const step = (d) => setShot((s) => (s + d + media.length) % media.length);
  const slide = media[Math.min(shot, media.length - 1)];

  return (
    <>
      <div className="wrap">
        <nav className="crumbs crumbs-pd" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight />
          <Link to="/shop">Shop</Link>
          {product.category && (
            <>
              <ChevronRight />
              <Link to={`/shop?category=${encodeURIComponent(product.category)}`}>
                {categoryLabel(product.category)}
              </Link>
            </>
          )}
          <ChevronRight />
          <span aria-current="page">{product.name}</span>
        </nav>
      </div>

      <div className="wrap pd">
        {/* ---------- gallery ---------- */}
        <div className={`pd-gal${media.length > 1 ? ' has-thumbs' : ''}`}>
          <div className="pd-main">
            {slide.video ? (
              <video
                key={slide.video}
                className="pd-video"
                src={slide.video}
                poster={slide.poster ? imageUrl(slide.poster) : undefined}
                autoPlay
                muted
                loop
                playsInline
                controls
                aria-label={`${product.name} video`}
              />
            ) : (
              <ProductImage key={slide.img} name={slide.img} alt={product.name} width={900} height={900} priority />
            )}
            {off > 0 && !soldOut && <span className="tag tag-sale pd-off">-{off}%</span>}
            {media.length > 1 && (
              <>
                <button type="button" className="pd-nav prev" onClick={() => step(-1)} aria-label="Previous photo">
                  <ChevronLeft size={18} />
                </button>
                <button type="button" className="pd-nav next" onClick={() => step(1)} aria-label="Next photo">
                  <ChevronRight size={18} />
                </button>
                <span className="pd-count">
                  {shot + 1} / {media.length}
                </span>
              </>
            )}
          </div>
          {media.length > 1 && (
            <div className="pd-thumbs">
              {media.map((m, i) => (
                <button
                  type="button"
                  key={`${m.video || m.img}-${i}`}
                  className={[i === shot && 'on', m.video && 'is-video'].filter(Boolean).join(' ') || undefined}
                  onClick={() => setShot(i)}
                  aria-label={m.video ? 'Play the video' : `View photo ${i + 1}`}
                  aria-current={i === shot || undefined}
                >
                  <ProductImage name={m.video ? m.poster : m.img} square width={80} height={80} />
                  {m.video && (
                    <span className="pd-play" aria-hidden="true">
                      <Play size={14} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ---------- detail ---------- */}
        <div className="pd-b">
          <div className="pd-top">
            {product.category && <span className="eyebrow-sm">{categoryLabel(product.category)}</span>}
            {product.badge && <span className="tag tag-dark">{product.badge}</span>}
          </div>
          <h1>{product.name}</h1>
          {product.reviewCount > 0 && (
            <a href="#reviews" className="pd-rating">
              <Rating value={product.rating} count={product.reviewCount} size={15} />
            </a>
          )}

          <div className="pd-price">
            <span>{fmt(price)}</span>
            {compareAt > 0 && <s>{fmt(compareAt)}</s>}
            {saving > 0 && <span className="tag tag-sale">You save {fmt(saving)}</span>}
          </div>
          <p className="pd-cod">
            Cash on delivery ·{' '}
            {price >= freeOver
              ? 'Free delivery on this item'
              : `${fmt(settings.deliveryFee || 200)} delivery, free over ${fmt(freeOver)}`}
          </p>

          {product.description && <p className="pd-desc">{product.description}</p>}

          {product.specs?.length > 0 && (
            <ul className="specs-row" aria-label="Key features">
              {product.specs.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}

          <ColourPicker colors={product.colors} value={colour} onChange={setColour} />

          {soldOut ? (
            <div className="alert alert-warn" role="status">
              <Shield size={17} />
              <span>
                This one is sold out right now. Message us on WhatsApp and we will tell you when
                it is back.
              </span>
            </div>
          ) : (
            <>
              <div className="field">
                <span className="field-label">Quantity</span>
                <div className="pd-buy">
                  <QtyStepper value={qty} onChange={setQty} max={max} />
                  <Button size="lg" className="pd-add" onClick={() => add(false)}>
                    <Cart size={18} /> Add to cart
                  </Button>
                  <WishlistButton product={product} className="wish-lg" />
                </div>
                {low && <p className="stock-note">Only {left} left in stock</p>}
              </div>

              <Button variant="outline" size="lg" block onClick={() => add(true)} className="pd-buynow">
                Buy it now
              </Button>
            </>
          )}

          <Button
            href={whatsappLink(settings, { product })}
            external
            variant="wa"
            block
            className="pd-wa"
          >
            <Whatsapp /> Order on WhatsApp instead
          </Button>

          <div className="pd-notes" data-section="productNotes">
            <div>
              <Truck size={18} />
              <span>
                <strong>{fill(pc.deliveryTitle || 'Delivery in 3 to 5 working days')}</strong>
                {fill(pc.deliveryText ?? 'Anywhere in Pakistan. You pay the courier when it arrives.')}
              </span>
            </div>
            <div>
              <Refresh size={18} />
              <span>
                <strong>{fill(pc.exchangeTitle || '{returnDays}-day exchange')}</strong>
                {fill(pc.exchangeText ?? 'If it is unused and still in its packaging.')}
              </span>
            </div>
          </div>

          <div className="pd-acc">
            {product.features?.length > 0 && (
              <details open>
                <summary>What you get</summary>
                <ul className="feat">
                  {product.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </details>
            )}
            {product.material && (
              <details>
                <summary>Material</summary>
                <p>{product.material}</p>
              </details>
            )}
            <details>
              <summary>Delivery &amp; exchange</summary>
              <p>
                {fill(
                  pc.policyText ||
                    'Delivered in 3 to 5 working days to most cities. Free delivery on orders over {freeDelivery}, otherwise a flat {deliveryFee}. Message us within {returnDays} days of delivery to exchange an unused item.'
                )}
              </p>
            </details>
          </div>
        </div>
      </div>

      <ProductReviews product={product} />

      {related.length > 0 && (
        <section className="section section-alt">
          <div className="wrap">
            <div className="sec-head">
              <div>
                <span className="eyebrow-sm">More {categoryLabel(product.category).toLowerCase()}</span>
                <h2>You might also like</h2>
              </div>
              <Link to={`/shop?category=${encodeURIComponent(product.category)}`} className="link-arrow">
                View all <ArrowRight size={15} />
              </Link>
            </div>
            <ProductGrid products={related} currency={cur} />
          </div>
        </section>
      )}

      {similar.length > 0 && (
        <section className="section">
          <div className="wrap">
            <div className="sec-head">
              <div>
                <span className="eyebrow-sm">Similar price</span>
                <h2>More to explore</h2>
              </div>
              <Link to="/shop" className="link-arrow">
                Shop all <ArrowRight size={15} />
              </Link>
            </div>
            <ProductGrid products={similar} currency={cur} />
          </div>
        </section>
      )}
    </>
  );
}
