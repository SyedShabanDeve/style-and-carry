import { Star } from './Icons';

/**
 * Star rating. Renders nothing unless the product actually carries a rating,
 * so the shop never shows made-up scores.
 */
export default function Rating({ value, count, size = 13, className = '' }) {
  const v = Number(value);
  if (!v || v <= 0) return null;
  const pct = Math.max(0, Math.min(100, (v / 5) * 100));
  const stars = Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} />);

  return (
    <span className={`rating ${className}`} aria-label={`Rated ${v.toFixed(1)} out of 5`}>
      <span className="rating-stars" aria-hidden="true">
        <span className="rating-bg">{stars}</span>
        <span className="rating-fg" style={{ width: `${pct}%` }}>
          {stars}
        </span>
      </span>
      <span className="rating-n">
        {v.toFixed(1)}
        {count ? <small> ({count})</small> : null}
      </span>
    </span>
  );
}
