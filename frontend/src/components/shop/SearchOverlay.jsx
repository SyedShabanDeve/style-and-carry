import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import Modal from '../ui/Modal';
import ProductImage from '../ui/ProductImage';
import EmptyState from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { closeSearch } from '../../store/uiSlice';
import { selectLiveProducts, selectCategories } from '../../store/productsSlice';
import { selectSettings } from '../../store/settingsSlice';
import { useCategoryName } from '../../store/contentSlice';
import { money, categoryLabel } from '../../lib/format';
import { Search, ArrowRight, Alert, X } from '../ui/Icons';
import { useMoney } from '../../lib/currency';

const MAX_RESULTS = 6;

/** Same matching as the shop page, so "see all" shows the same products. */
const matches = (p, q) =>
  [p.name, p.description, p.category, categoryLabel(p.category), ...(p.specs || [])]
    .join(' ')
    .toLowerCase()
    .includes(q);

/** Site-wide search, opened from the header. Results update as you type. */
export default function SearchOverlay() {
  const open = useSelector((s) => s.ui.searchOpen);
  const products = useSelector(selectLiveProducts);
  const categories = useSelector(selectCategories);
  const status = useSelector((s) => s.products.status);
  const settings = useSelector(selectSettings);
  const cur = settings.currency || 'Rs';
  const fmt = useMoney();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const catName = useCategoryName();
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!open) setQ('');
  }, [open]);

  const term = q.trim().toLowerCase();
  const results = useMemo(
    () => (term ? products.filter((p) => matches(p, term)) : []),
    [products, term]
  );

  const close = () => dispatch(closeSearch());

  const submit = (e) => {
    e.preventDefault();
    close();
    navigate(term ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
  };

  return (
    <Modal open={open} onClose={close} label="Search the shop" variant="top" showClose={false}>
      <form className="so-form" onSubmit={submit} role="search">
        <Search size={20} />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products, colours, features…"
          aria-label="Search products"
          autoComplete="off"
          enterKeyHint="search"
          data-autofocus
        />
        <button type="button" className="so-close" onClick={close} aria-label="Close search">
          <X size={18} />
        </button>
      </form>

      <div className="so-body">
        {status === 'loading' ? (
          <div className="so-list" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div className="so-item" key={i}>
                <Skeleton w={56} h={56} r="var(--r-sm)" />
                <div style={{ flex: 1, display: 'grid', gap: 8 }}>
                  <Skeleton w="55%" h={13} />
                  <Skeleton w="30%" h={11} />
                </div>
              </div>
            ))}
          </div>
        ) : status === 'error' ? (
          <EmptyState icon={Alert} tone="error" compact title="Search is unavailable">
            We could not load the catalogue. Check your connection and try again.
          </EmptyState>
        ) : !term ? (
          <div className="so-hint">
            <span className="eyebrow-sm">Browse by category</span>
            <div className="so-chips">
              {categories.map((c) => (
                <Link key={c.key} to={`/shop?category=${encodeURIComponent(c.key)}`} className="chip" onClick={close}>
                  {c.label}
                </Link>
              ))}
            </div>
          </div>
        ) : results.length === 0 ? (
          <EmptyState compact title={`No results for “${q.trim()}”`}>
            Check the spelling, or try a broader word like “bifold” or “black”.
          </EmptyState>
        ) : (
          <>
            <p className="so-count">
              {results.length} {results.length === 1 ? 'result' : 'results'}
            </p>
            <div className="so-list">
              {results.slice(0, MAX_RESULTS).map((p) => (
                <Link key={p.id || p.slug} to={`/product/${p.slug}`} className="so-item" onClick={close}>
                  <ProductImage name={p.images?.[0]} square width={56} height={56} alt="" />
                  <div className="so-item-b">
                    <strong>{p.name}</strong>
                    <span>{catName(p.category)}</span>
                  </div>
                  <b>{fmt(p.price)}</b>
                </Link>
              ))}
            </div>
            {results.length > MAX_RESULTS && (
              <button type="button" className="so-all" onClick={submit}>
                See all {results.length} results <ArrowRight size={15} />
              </button>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
