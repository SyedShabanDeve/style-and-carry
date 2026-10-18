import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';

import api from '../../api/client';
import { Stars } from '../../components/shop/Reviews';
import { pushToast } from '../../store/uiSlice';
import { fetchProducts } from '../../store/productsSlice';
import { formatDate } from '../../lib/format';
import { Check, X, Trash, Star, Search } from '../../components/ui/Icons';

const FILTERS = [
  ['pending', 'Waiting'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['all', 'All'],
];

/**
 * Every review customers have written. Nothing shows on the shop until it is
 * approved here; "Feature" pins a review to the top of the homepage.
 */
export default function AdminReviews() {
  const dispatch = useDispatch();
  const [list, setList] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [q, setQ] = useState('');

  const load = async () => {
    try {
      const d = await api.get('/reviews/admin', { auth: true });
      setList(d.reviews);
    } catch (err) {
      setList([]);
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0, all: list?.length || 0 };
    for (const r of list || []) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [list]);

  const shown = (list || []).filter(
    (r) =>
      (filter === 'all' || r.status === filter) &&
      (!q.trim() || [r.name, r.text, r.productName, r.city].join(' ').toLowerCase().includes(q.trim().toLowerCase()))
  );

  const patch = async (r, body, message) => {
    try {
      const d = await api.patch(`/reviews/${r.id}`, body, { auth: true });
      setList((l) => l.map((x) => (x.id === r.id ? d.review : x)));
      dispatch(pushToast({ message, kind: 'ok' }));
      // Star ratings on products change when a review is approved or removed.
      dispatch(fetchProducts({ includeInactive: true }));
    } catch (err) {
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete the review by ${r.name}? This cannot be undone.`)) return;
    try {
      await api.del(`/reviews/${r.id}`, { auth: true });
      setList((l) => l.filter((x) => x.id !== r.id));
      dispatch(pushToast({ message: 'Review deleted', kind: 'ok' }));
      dispatch(fetchProducts({ includeInactive: true }));
    } catch (err) {
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    }
  };

  return (
    <>
      <div className="a-tools">
        <div className="chips">
          {FILTERS.map(([key, label]) => (
            <button key={key} type="button" className={`chip${filter === key ? ' on' : ''}`} onClick={() => setFilter(key)}>
              {label} <small>{counts[key] || 0}</small>
            </button>
          ))}
        </div>
        <div className="search">
          <Search size={16} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search reviews…" aria-label="Search reviews" />
        </div>
      </div>

      <div className="a-panel fill">
        {!list ? (
          <div className="page-load" style={{ minHeight: 260 }}>
            <div className="spin" />
          </div>
        ) : shown.length === 0 ? (
          <div className="a-empty">
            <i>
              <Star size={26} />
            </i>
            <h3>{filter === 'pending' ? 'Nothing waiting' : 'No reviews here'}</h3>
            <p>
              {list.length
                ? 'Try another filter.'
                : 'Customers can write reviews on any product page. They land here for you to approve.'}
            </p>
          </div>
        ) : (
          <div className="a-panel-body scroll">
            <ul className="a-reviews">
              {shown.map((r) => (
                <li key={r.id} className={`a-review st-${r.status}`}>
                  <div className="a-review-head">
                    <div>
                      <strong>{r.name}</strong>
                      <span>
                        {r.city ? `${r.city} · ` : ''}
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                    <Stars value={r.rating} size={15} />
                    <span className={`pill ${r.status === 'approved' ? 'ok' : r.status === 'rejected' ? 'bad' : 'warn'}`}>
                      {r.status === 'pending' ? 'waiting' : r.status}
                    </span>
                    {r.featured && <span className="pill info">featured</span>}
                  </div>
                  <p>{r.text}</p>
                  <div className="a-review-foot">
                    <Link to={`/product/${r.productSlug}`} target="_blank" className="a-link">
                      {r.productName}
                    </Link>
                    <div className="row-act">
                      {r.status !== 'approved' && (
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => patch(r, { status: 'approved' }, 'Approved. It is live on the shop.')}>
                          <Check size={14} /> Approve
                        </button>
                      )}
                      {r.status !== 'rejected' && (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => patch(r, { status: 'rejected', featured: false }, 'Rejected. It stays hidden.')}>
                          <X size={14} /> Reject
                        </button>
                      )}
                      {r.status === 'approved' && (
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => patch(r, { featured: !r.featured }, r.featured ? 'No longer featured' : 'Featured on the homepage')}
                        >
                          <Star size={13} /> {r.featured ? 'Unfeature' : 'Feature'}
                        </button>
                      )}
                      <button type="button" className="mini danger" onClick={() => remove(r)} aria-label="Delete review">
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
