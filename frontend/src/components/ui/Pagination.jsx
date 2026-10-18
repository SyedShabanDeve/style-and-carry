import { ChevronLeft, ChevronRight } from './Icons';

/** Page numbers with gaps, for example 1 … 4 5 6 … 20 */
function pageList(current, total) {
  const wanted = [1, total, current - 1, current, current + 1];
  const list = [...new Set(wanted)].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) out.push(`gap-${n}`);
    out.push(n);
  });
  return out;
}

export default function Pagination({ page, total, onChange }) {
  if (total <= 1) return null;

  return (
    <nav className="pager" aria-label="Pagination">
      <button
        className="pager-btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>
      {pageList(page, total).map((n) =>
        typeof n === 'string' ? (
          <span key={n} className="pager-gap" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={n}
            className={`pager-btn${n === page ? ' on' : ''}`}
            onClick={() => onChange(n)}
            aria-current={n === page ? 'page' : undefined}
            aria-label={`Page ${n}`}
          >
            {n}
          </button>
        )
      )}
      <button
        className="pager-btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= total}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
