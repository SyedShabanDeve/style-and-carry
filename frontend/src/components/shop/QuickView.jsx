import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import ProductImage from '../ui/ProductImage';
import Rating from '../ui/Rating';
import WishlistButton from './WishlistButton';
import { ColourPicker, QtyStepper } from './ProductOptions';
import { closeQuickView, openCart, pushToast } from '../../store/uiSlice';
import { addItem } from '../../store/cartSlice';
import { selectLiveProducts } from '../../store/productsSlice';
import { selectSettings } from '../../store/settingsSlice';
import { money, pricing, stockState } from '../../lib/format';
import { useCategoryName } from '../../store/contentSlice';
import { Cart, ArrowRight } from '../ui/Icons';
import { useMoney } from '../../lib/currency';

/** A product's essentials in a dialog, without leaving the grid. */
export default function QuickView() {
  const dispatch = useDispatch();
  const catName = useCategoryName();
  const slug = useSelector((s) => s.ui.quickView);
  const products = useSelector(selectLiveProducts);
  const settings = useSelector(selectSettings);
  const cur = settings.currency || 'Rs';
  const fmt = useMoney();
  const p = slug ? products.find((x) => x.slug === slug) : null;

  const [colour, setColour] = useState(null);
  const [qty, setQty] = useState(1);
  const [shot, setShot] = useState(0);

  useEffect(() => {
    setColour(p?.colors?.[0]?.[0] || null);
    setQty(1);
    setShot(0);
  }, [p?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => dispatch(closeQuickView());
  if (!p) return null;

  const { soldOut, low, left } = stockState(p);
  const { price, compareAt, off } = pricing(p);
  const images = p.images?.length ? p.images : [null];

  const add = () => {
    dispatch(addItem(p, { color: colour, qty }));
    dispatch(pushToast({ title: 'Added to cart', message: p.name, kind: 'ok' }));
    dispatch(openCart());
  };

  return (
    <Modal open onClose={close} label={`Quick view: ${p.name}`} size="lg" className="qv">
      <div className="qv-grid">
        <div className="qv-gal">
          <div className="qv-main">
            <ProductImage name={images[shot]} alt={p.name} width={800} height={800} loading="eager" />
          </div>
          {images.length > 1 && (
            <div className="pd-thumbs">
              {images.map((img, i) => (
                <button
                  type="button"
                  key={`${img}-${i}`}
                  className={i === shot ? 'on' : undefined}
                  onClick={() => setShot(i)}
                  aria-label={`View photo ${i + 1}`}
                >
                  <ProductImage name={img} square width={72} height={72} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="qv-b">
          {p.category && <span className="eyebrow-sm">{catName(p.category)}</span>}
          <h2>{p.name}</h2>
          <Rating value={p.rating} count={p.reviewCount} />

          <div className="pd-price">
            <span>{fmt(price)}</span>
            {compareAt > 0 && <s>{fmt(compareAt)}</s>}
            {off > 0 && <span className="tag tag-sale">Save {off}%</span>}
          </div>

          {p.description && <p className="pd-desc">{p.description}</p>}

          <ColourPicker colors={p.colors} value={colour} onChange={setColour} />

          {!soldOut && (
            <div className="field">
              <span className="field-label">Quantity</span>
              <QtyStepper value={qty} onChange={setQty} max={Math.min(20, left)} />
              {low && <p className="stock-note">Only {left} left in stock</p>}
            </div>
          )}

          <div className="pd-act">
            <Button size="lg" onClick={add} disabled={soldOut} data-autofocus>
              <Cart size={18} /> {soldOut ? 'Sold out' : 'Add to cart'}
            </Button>
            <WishlistButton product={p} className="wish-lg" />
          </div>

          <Link to={`/product/${p.slug}`} className="link-arrow" onClick={close}>
            See full details <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </Modal>
  );
}
