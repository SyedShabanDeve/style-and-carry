import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import ProductGrid from '../components/shop/ProductGrid';
import Pagination from '../components/ui/Pagination';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import {
  selectVisibleProducts,
  selectLiveProducts,
  selectCategories,
  setCategory,
  setQuery,
  setSort,
  clearFilters,
} from '../store/productsSlice';
import { selectSettings } from '../store/settingsSlice';
import { SORTS } from '../lib/format';
import { useCategoryName } from '../store/contentSlice';
import { Search, X, Alert, ChevronRight } from '../components/ui/Icons';
import PageHead from '../components/layout/PageHead';
import { useMoney } from '../lib/currency';

const PAGE_SIZE = 12;

export default function Shop() {
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();
  const topRef = useRef(null);
  const categoryLabel = useCategoryName();
  const fmt = useMoney();

  const visible = useSelector(selectVisibleProducts);
  const all = useSelector(selectLiveProducts);
  const categories = useSelector(selectCategories);
  const status = useSelector((s) => s.products.status);
  const { category, query, sort } = useSelector((s) => s.products);
  const settings = useSelector(selectSettings);
  const cur = settings.currency || 'Rs';

  const saleOnly = params.get('sale') === '1';
  const stockOnly = params.get('stock') === '1';
  const minPrice = Number(params.get('min')) || 0;
  const maxPrice = Number(params.get('max')) || 0;
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);

  /**
   * The URL is the source of truth for filters, so a filtered shop page can be
   * shared, bookmarked, and reached from the footer links.
   */
  useEffect(() => {
    dispatch(setCategory(params.get('category') || 'all'));
    dispatch(setQuery(params.get('q') || ''));
    dispatch(setSort(params.get('sort') || 'featured'));
  }, [params, dispatch]);

  /* Sale and stock filters sit on top of the store's category/search/sort. */
  const products = useMemo(
    () =>
      visible.filter(
        (p) =>
          (!saleOnly || Number(p.compareAt) > Number(p.price)) &&
          (!stockOnly || (p.stock ?? 0) > 0) &&
          (!minPrice || Number(p.price) >= minPrice) &&
          (!maxPrice || Number(p.price) <= maxPrice)
      ),
    [visible, saleOnly, stockOnly, minPrice, maxPrice]
  );

  const pages = Math.max(1, Math.ceil(products.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const shown = products.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const patchParams = (patch, { keepPage = false } = {}) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (!v || v === 'all' || v === 'featured') next.delete(k);
      else next.set(k, v);
    }
    // Any change to what is shown starts again at page one.
    if (!keepPage) next.delete('page');
    setParams(next, { replace: true });
  };

  const goToPage = (n) => {
    patchParams({ page: n > 1 ? String(n) : '' }, { keepPage: true });
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const reset = () => {
    dispatch(clearFilters());
    setParams({}, { replace: true });
  };

  const filtered = category !== 'all' || query.trim() !== '' || saleOnly || stockOnly || Boolean(minPrice || maxPrice);
  const activeCat = category !== 'all' ? categories.find((c) => c.key === category) : null;
  const title = activeCat ? activeCat.label : category !== 'all' ? categoryLabel(category) : 'Shop all';
  const loading = status === 'loading' || status === 'idle';

  return (
    <>
      <PageHead
        page="shop"
        fallback={{ title: 'Shop all' }}
        title={category !== 'all' ? title : undefined}
        text={
          activeCat
            ? `${activeCat.count} ${activeCat.count === 1 ? 'style' : 'styles'} in ${activeCat.label.toLowerCase()}. Cash on delivery on every order.`
            : undefined
        }
      >
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight />
          {category !== 'all' ? (
            <>
              <Link to="/shop">Shop</Link>
              <ChevronRight />
              <span aria-current="page">{title}</span>
            </>
          ) : (
            <span aria-current="page">Shop</span>
          )}
        </nav>
      </PageHead>

      <div className="wrap shop" ref={topRef}>
        <div className="toolbar">
          <div className="chips" role="group" aria-label="Filter by category">
            <button
              type="button"
              aria-pressed={category === 'all'}
              className={`chip${category === 'all' ? ' on' : ''}`}
              onClick={() => patchParams({ category: 'all' })}
            >
              All <small>{all.length}</small>
            </button>
            {categories.map((c) => (
              <button
                type="button"
                key={c.key}
                aria-pressed={category === c.key}
                className={`chip${category === c.key ? ' on' : ''}`}
                onClick={() => patchParams({ category: c.key })}
              >
                {c.label} <small>{c.count}</small>
              </button>
            ))}
          </div>

          <div className="toolbar-row">
            <div className="search">
              <Search size={17} />
              <input
                type="search"
                value={query}
                placeholder="Search products…"
                aria-label="Search products"
                onChange={(e) => patchParams({ q: e.target.value })}
              />
              {query && (
                <button className="search-x" onClick={() => patchParams({ q: '' })} aria-label="Clear search">
                  <X size={15} />
                </button>
              )}
            </div>

            <label className={`toggle${saleOnly ? ' on' : ''}`}>
              <input
                type="checkbox"
                checked={saleOnly}
                onChange={(e) => patchParams({ sale: e.target.checked ? '1' : '' })}
              />
              On sale
            </label>
            <label className={`toggle${stockOnly ? ' on' : ''}`}>
              <input
                type="checkbox"
                checked={stockOnly}
                onChange={(e) => patchParams({ stock: e.target.checked ? '1' : '' })}
              />
              In stock
            </label>

            <label className="sort-wrap">
              <span className="sr">Sort by</span>
              <select className="sort" value={sort} onChange={(e) => patchParams({ sort: e.target.value })}>
                {SORTS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {status === 'ready' && (
          <div className="result-note">
            <span>
              {products.length === all.length
                ? `${all.length} ${all.length === 1 ? 'product' : 'products'}`
                : `${products.length} of ${all.length} products`}
              {pages > 1 && ` · page ${current} of ${pages}`}
            </span>
            {(minPrice > 0 || maxPrice > 0) && (
              <button type="button" className="chip on price-chip" onClick={() => patchParams({ min: '', max: '' })} aria-label="Remove the price filter">
                {minPrice && maxPrice ? `${fmt(minPrice)} to ${fmt(maxPrice)}` : maxPrice ? `Under ${fmt(maxPrice)}` : `${fmt(minPrice)} and over`} <X size={12} />
              </button>
            )}
            {filtered && (
              <button type="button" className="link-btn" onClick={reset}>
                Clear all filters
              </button>
            )}
          </div>
        )}

        {status === 'error' ? (
          <EmptyState
            icon={Alert}
            tone="error"
            title="We could not load the catalogue"
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try again
              </Button>
            }
          >
            Check your connection and refresh the page.
          </EmptyState>
        ) : (
          <ProductGrid
            products={shown}
            loading={loading}
            currency={cur}
            emptyTitle={query.trim() ? `No results for “${query.trim()}”` : 'Nothing matches those filters'}
            emptyText={
              filtered
                ? 'Try a different word, or clear the filters to see everything.'
                : 'New products are on their way. Check back soon.'
            }
            emptyAction={filtered ? <Button onClick={reset}>Clear filters</Button> : null}
          />
        )}

        <Pagination page={current} total={pages} onChange={goToPage} />
      </div>
    </>
  );
}
