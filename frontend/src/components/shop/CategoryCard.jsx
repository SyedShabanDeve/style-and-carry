import { Link } from 'react-router-dom';
import ProductImage from '../ui/ProductImage';
import { ArrowRight } from '../ui/Icons';
import { money } from '../../lib/format';
import { useMoney } from '../../lib/currency';

/** A category tile: photo, name, product count and starting price. */
export default function CategoryCard({ category: c, currency = 'Rs' }) {
  const fmt = useMoney();
  return (
    <Link to={`/shop?category=${encodeURIComponent(c.key)}`} className="cat-card">
      <div className="cat-img">
        <ProductImage name={c.image} square alt="" />
      </div>
      <div className="cat-b">
        <div>
          <h3>{c.label}</h3>
          <span>
            {c.count} {c.count === 1 ? 'style' : 'styles'}
            {Number.isFinite(c.from) && c.from > 0 ? ` · from ${fmt(c.from)}` : ''}
          </span>
        </div>
        <i className="cat-go" aria-hidden="true">
          <ArrowRight size={16} />
        </i>
      </div>
    </Link>
  );
}
