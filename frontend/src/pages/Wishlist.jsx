import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

import ProductGrid from '../components/shop/ProductGrid';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { selectWishProducts, clearWishlist } from '../store/wishlistSlice';
import { selectSettings } from '../store/settingsSlice';
import { Heart, ArrowRight, ChevronRight } from '../components/ui/Icons';
import PageHead from '../components/layout/PageHead';

export default function Wishlist() {
  const dispatch = useDispatch();
  const items = useSelector(selectWishProducts);
  const status = useSelector((s) => s.products.status);
  const settings = useSelector(selectSettings);
  const cur = settings.currency || 'Rs';
  const loading = status === 'loading' || status === 'idle';

  return (
    <>
      <PageHead page="wishlist" fallback={{ title: 'Your wishlist' }}>
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight />
          <span aria-current="page">Wishlist</span>
        </nav>
      </PageHead>

      <div className="wrap shop">
        {!loading && items.length === 0 ? (
          <EmptyState
            icon={Heart}
            title="Nothing saved yet"
            action={
              <Button to="/shop">
                Explore the shop <ArrowRight />
              </Button>
            }
          >
            Tap the heart on any product to keep it here for later.
          </EmptyState>
        ) : (
          <>
            {!loading && (
              <div className="result-note">
                <span>
                  {items.length} saved {items.length === 1 ? 'product' : 'products'}
                </span>
                <button type="button" className="link-btn" onClick={() => dispatch(clearWishlist())}>
                  Clear wishlist
                </button>
              </div>
            )}
            <ProductGrid products={items} loading={loading} currency={cur} skeletonCount={4} />
          </>
        )}
      </div>
    </>
  );
}
