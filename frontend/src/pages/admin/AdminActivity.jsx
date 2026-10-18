import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, Link } from 'react-router-dom';

import api from '../../api/client';
import { formatDate } from '../../lib/format';
import { Package, Layers, Home, Cog, Bag, Star, Mail, Users, Database, User, ArrowRight, Check } from '../../components/ui/Icons';

/* Tells the frame (the bell) that notifications were read. */
export const announceActivity = (detail) => window.dispatchEvent(new CustomEvent('sc:activity', { detail }));

export const KIND_ICON = {
  product: Package,
  category: Layers,
  website: Home,
  settings: Cog,
  order: Bag,
  review: Star,
  subscriber: Mail,
  team: Users,
  backup: Database,
  account: User,
};

export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} d ago`;
  return formatDate(iso, false);
}

/** One line: who did what, when. */
export function ActivityItem({ a, unread, onClick }) {
  const Icon = KIND_ICON[a.kind] || Check;
  const body = (
    <>
      <span className={`act-i k-${a.kind}`}>
        <Icon size={15} />
      </span>
      <span className="act-t">
        <span>
          <b>{a.by?.name || a.by?.email}</b> <em>{a.by?.email}</em> {a.text}
        </span>
        <small>
          {timeAgo(a.at)} · {formatDate(a.at)}
        </small>
      </span>
      {unread && <i className="act-dot" aria-label="New" />}
    </>
  );
  return a.link ? (
    <Link to={a.link} className={`act${unread ? ' is-new' : ''}`} onClick={onClick}>
      {body}
    </Link>
  ) : (
    <div className={`act${unread ? ' is-new' : ''}`}>{body}</div>
  );
}

export default function AdminActivity() {
  const me = useSelector((s) => s.auth.user);
  const [data, setData] = useState(null);
  const [who, setWho] = useState('all');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (me?.role !== 'owner') return;
    api
      .get('/activity?limit=300', { auth: true })
      .then(async (d) => {
        setData(d);
        if (d.unread) {
          const r = await api.post('/activity/seen', {}, { auth: true });
          announceActivity({ unread: 0, seenAt: r.seenAt });
        }
      })
      .catch((err) => setError(err.message));
  }, [me?.role]);

  const people = useMemo(() => {
    const m = new Map();
    for (const a of data?.items || []) if (a.by?.email) m.set(a.by.email, a.by.name || a.by.email);
    return [...m.entries()];
  }, [data]);

  if (me && me.role !== 'owner') return <Navigate to="/admin" replace />;

  const seen = data?.seenAt ? Date.parse(data.seenAt) : 0;
  const items = (data?.items || []).filter((a) => who === 'all' || a.by?.email === who);

  return (
    <div className="a-scroll">
      <div className="act-page">
        <div className="a-panel">
          <div className="a-panel-head">
            <div>
              <h2>What your team changed</h2>
              <p>Every product, website, order and team change made in the dashboard, with who did it. The newest 300 are kept.</p>
            </div>
            {people.length > 1 && (
              <select className="act-filter" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Show changes by">
                <option value="all">Everyone</option>
                {people.map(([email, name]) => (
                  <option key={email} value={email}>
                    {name} ({email})
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="a-panel-body">
            {error && <p className="bk-empty">{error}</p>}
            {!data && !error && (
              <div className="page-load" style={{ minHeight: 160 }}>
                <div className="spin" />
              </div>
            )}
            {data && items.length === 0 && <p className="bk-empty">Nothing yet. Changes made by admins will appear here.</p>}
            {items.length > 0 && (
              <div className="act-list">
                {items.map((a) => (
                  <ActivityItem key={a.id} a={a} unread={a.by?.id !== me?.id && Date.parse(a.at) > seen} />
                ))}
              </div>
            )}
          </div>
        </div>
        <Link to="/admin/team" className="act-more">
          Manage your team <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}
