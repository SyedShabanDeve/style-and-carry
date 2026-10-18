import { useEffect, useState } from 'react';
import api from '../../api/client';
import Button from '../ui/Button';
import { formatDate } from '../../lib/format';
import { Star, Check } from '../ui/Icons';

/** Read-only stars, filled to any fraction. */
export function Stars({ value = 0, size = 14 }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / 5) * 100));
  const row = Array.from({ length: 5 }, (_, i) => <Star key={i} size={size} />);
  return (
    <span className="stars" role="img" aria-label={`${Number(value).toFixed(1)} out of 5 stars`}>
      <span className="stars-bg">{row}</span>
      <span className="stars-fg" style={{ width: `${pct}%` }}>
        {row}
      </span>
    </span>
  );
}

/** Five buttons for choosing a rating. */
function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  const words = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
  return (
    <div className="star-input" role="radiogroup" aria-label="Your rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={n <= shown ? 'on' : undefined}
          onMouseEnter={() => setHover(n)}
          onClick={() => onChange(n)}
        >
          <Star size={24} />
        </button>
      ))}
      <span className="star-word">{words[shown]}</span>
    </div>
  );
}

/** Rating summary, review list and a form to write one, for a product page. */
export default function ProductReviews({ product }) {
  const [data, setData] = useState({ reviews: [], summary: { average: 0, count: 0 } });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', rating: 0, text: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    api
      .get(`/reviews?product=${encodeURIComponent(product.slug)}&limit=30`)
      .then((d) => live && setData(d))
      .catch(() => {})
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [product.slug]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 2) return setError('Please enter your name');
    if (!form.rating) return setError('Please choose a star rating');
    if (form.text.trim().length < 10) return setError('Please write at least a sentence');
    setBusy(true);
    try {
      const res = await api.post('/reviews', { ...form, product: product.slug });
      setSent(res.message);
      setForm({ name: '', city: '', rating: 0, text: '' });
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const { average, count } = data.summary;
  const bars = [5, 4, 3, 2, 1].map((n) => ({
    n,
    c: data.reviews.filter((r) => r.rating === n).length,
  }));

  return (
    <section className="section rev-sec" id="reviews" aria-labelledby="rev-title">
      <div className="wrap rev">
        <div className="rev-side rv">
          <span className="st-eyebrow">Customer reviews</span>
          <h2 id="rev-title" className="st-title">
            {count ? `${average.toFixed(1)} out of 5` : 'No reviews yet'}
          </h2>
          {count > 0 ? (
            <>
              <div className="rev-avg">
                <Stars value={average} size={18} />
                <span>
                  Based on {count} {count === 1 ? 'review' : 'reviews'}
                </span>
              </div>
              <ul className="rev-bars">
                {bars.map((b) => (
                  <li key={b.n}>
                    <span>{b.n} star</span>
                    <i>
                      <b style={{ width: `${data.reviews.length ? (b.c / data.reviews.length) * 100 : 0}%` }} />
                    </i>
                    <span>{b.c}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="rev-none">Bought this? Tell other shoppers what you think.</p>
          )}

          {sent ? (
            <p className="rev-sent" role="status">
              <Check size={16} /> {sent}
            </p>
          ) : (
            <Button variant={open ? 'ghost' : 'outline'} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? 'Cancel' : 'Write a review'}
            </Button>
          )}
        </div>

        <div className="rev-main">
          {open && (
            <form className="rev-form rv in" onSubmit={submit} noValidate>
              <h3>Review {product.name}</h3>
              <StarInput value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} />
              <div className="form-grid">
                <div className="inp">
                  <label htmlFor="rv-name">Your name</label>
                  <input
                    id="rv-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    autoComplete="name"
                    maxLength={60}
                  />
                </div>
                <div className="inp">
                  <label htmlFor="rv-city">City (optional)</label>
                  <input
                    id="rv-city"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    autoComplete="address-level2"
                    maxLength={40}
                  />
                </div>
                <div className="inp full">
                  <label htmlFor="rv-text">Your review</label>
                  <textarea
                    id="rv-text"
                    value={form.text}
                    onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                    placeholder="How is the quality? How did it arrive?"
                    maxLength={1000}
                  />
                  <span className="hint">Reviews appear once we have checked them.</span>
                </div>
              </div>
              {error && (
                <p className="rev-err" role="alert">
                  {error}
                </p>
              )}
              <Button type="submit" loading={busy}>
                Submit review
              </Button>
            </form>
          )}

          {loading ? null : data.reviews.length > 0 ? (
            <ul className="rev-list">
              {data.reviews.map((r) => (
                <li key={r.id} className="rev-item rv">
                  <header>
                    <span className="testi-av" aria-hidden="true">
                      {r.name.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <strong>{r.name}</strong>
                      <small>
                        {r.city ? `${r.city} · ` : ''}
                        {formatDate(r.createdAt, false)}
                      </small>
                    </div>
                    <Stars value={r.rating} size={14} />
                  </header>
                  <p>{r.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            !open && <div className="rev-empty rv">Be the first to review this product.</div>
          )}
        </div>
      </div>
    </section>
  );
}
