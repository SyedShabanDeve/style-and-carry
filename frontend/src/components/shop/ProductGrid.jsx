import ProductCard from './ProductCard';
import EmptyState from '../ui/EmptyState';
import { ProductCardSkeleton } from '../ui/Skeleton';
import { Search } from '../ui/Icons';

/**
 * Responsive product grid with its own loading and empty states.
 *
 * `cols` caps the columns on wide screens (4 by default); the grid steps down
 * to three on tablets and two on phones by itself.
 */
export default function ProductGrid({
  products,
  loading,
  currency = 'Rs',
  skeletonCount = 8,
  cols = 4,
  emptyTitle = 'Nothing matches that',
  emptyText = 'Try a different word, or clear the filters to see everything.',
  emptyAction,
}) {
  const cls = `grid cols-${cols}`;

  if (loading) {
    return (
      <div className={cls} aria-busy="true" aria-label="Loading products">
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!products.length) {
    return (
      <EmptyState icon={Search} title={emptyTitle} action={emptyAction}>
        {emptyText}
      </EmptyState>
    );
  }

  return (
    <div className={cls}>
      {products.map((p, i) => (
        <ProductCard key={p.id || p.slug} product={p} currency={currency} index={i} />
      ))}
    </div>
  );
}
