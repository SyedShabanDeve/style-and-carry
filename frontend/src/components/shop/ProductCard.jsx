import { memo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import { addItem } from '../../store/cartSlice';
import { pushToast, openCart, openQuickView } from '../../store/uiSlice';
import { money, pricing, stockState } from '../../lib/format';
import { useCategoryName } from '../../store/contentSlice';
import ProductImage from '../ui/ProductImage';
import Rating from '../ui/Rating';
import WishlistButton from './WishlistButton';
import { Plus, Eye, Cart } from '../ui/Icons';
import { useMoney } from '../../lib/currency';

/**
 * One product, as it appears in every grid on the site.
 *
 * Built for any catalogue: every field except name and price is optional, long
 * names clamp to two lines, and photos of any size crop into the same square.
 */
function ProductCard({ product: p, currency = 'Rs', index = 0 }) {
  const dispatch = useDispatch();
  const catName = useCategoryName();
  const fmt = useMoney();
  const { soldOut, low, left } = stockState(p);
  const { price, compareAt, off } = pricing(p);
  const url = `/product/${p.slug}`;

  /* Quick-add takes the first colour. Anyone who wants a different one uses
     quick view or the product page, where every colour is laid out. */
  const quickAdd = () => {
    const colour = p.colors?.[0]?.[0] || null;
    dispatch(addItem(p, { color: colour, qty: 1 }));
    dispatch(pushToast({ title: 'Added to cart', message: p.name, kind: 'ok' }));
    dispatch(openCart());
  };
  const quickView = () => dispatch(openQuickView(p.slug));

  return (
    <article className="card" style={{ animationDelay: `${Math.min(index % 12, 8) * 50}ms` }}>
      <div className="card-img">
        <Link to={url} className="card-img-link" aria-label={`View ${p.name}`} tabIndex={-1}>
          <ProductImage name={p.images?.[0]} square alt={p.name} priority={index < 3} />
          {/* Second photo fades in on hover, where there is one. */}
          {p.images?.[1] && <ProductImage name={p.images[1]} square className="alt" aria-hidden="true" />}
        </Link>

        <div className="card-tags">
          {p.badge && <span className="tag tag-dark">{p.badge}</span>}
          {off > 0 && !soldOut && <span className="tag tag-sale">-{off}%</span>}
        </div>

        <WishlistButton product={p} className="card-wish" size={17} />

        {soldOut ? (
          <span className="stock-flag out">Sold out</span>
        ) : low ? (
          <span className="stock-flag low">Only {left} left</span>
        ) : null}

        {/* Desktop: slides up on hover. */}
        <div className="card-actions">
          <button type="button" className="card-act card-act-add" onClick={quickAdd} disabled={soldOut}>
            <Cart size={15} /> {soldOut ? 'Sold out' : 'Add to cart'}
          </button>
          <button type="button" className="card-act card-act-eye" onClick={quickView} aria-label={`Quick view: ${p.name}`} title="Quick view">
            <Eye size={16} />
          </button>
        </div>

        {/* Touch screens: always-visible add button. */}
        <button
          type="button"
          className="add card-add-touch"
          onClick={quickAdd}
          disabled={soldOut}
          aria-label={soldOut ? `${p.name} is sold out` : `Add ${p.name} to cart`}
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="card-b">
        {p.category && <span className="card-cat">{catName(p.category)}</span>}
        <h3 className="card-t">
          <Link to={url}>{p.name}</Link>
        </h3>
        <Rating value={p.rating} count={p.reviewCount} />
        {p.colors?.length > 0 && (
          <div className="swatches" aria-label={`${p.colors.length} colours`}>
            {p.colors.slice(0, 5).map(([label, hex]) => (
              <i key={label + hex} className="sw" style={{ background: hex }} title={label} />
            ))}
            {p.colors.length > 5 && <small>+{p.colors.length - 5}</small>}
          </div>
        )}
        <div className="card-foot">
          <span className="price">
            <span className="price-now">{fmt(price)}</span>
            {compareAt > 0 && <s>{fmt(compareAt)}</s>}
          </span>
        </div>
      </div>
    </article>
  );
}

/* The grid re-renders on every filter keystroke; cards themselves rarely change. */
export default memo(ProductCard);
