import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import { fetchStats } from '../../store/statsSlice';
import { selectSettings } from '../../store/settingsSlice';
import { money, imageUrl, statusMeta, timeAgo, formatDate } from '../../lib/format';
import { Coins, Bag, Package, Trend, Alert, ArrowRight, Mail, Grid } from '../../components/ui/Icons';

/* ---------- revenue area chart ---------- */

/** Smooth line through the points (Catmull-Rom turned into cubic Béziers). */
function smooth(pts) {
  if (pts.length < 2) return '';
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function RevenueChart({ series, cur }) {
  /* Drawn at the real size of its card, so it always fills the space. */
  const box = useRef(null);
  const [size, setSize] = useState({ w: 640, h: 210 });
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 50 && height > 50) setSize({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = size.w;
  const H = size.h;
  const pad = { l: 44, r: 16, t: 28, b: 26 };
  const max = Math.max(...series.map((d) => d.revenue), 0);
  const top = max > 0 ? Math.ceil((max * 1.15) / 100) * 100 : 1000;
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, series.length - 1);
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const pts = series.map((d, i) => [x(i), y(d.revenue)]);
  const peak = series.reduce((best, d, i) => (d.revenue > series[best].revenue ? i : best), 0);
  const [hover, setHover] = useState(null);
  const at = hover ?? peak;
  const line = smooth(pts);
  const area = `${line} L${pts[pts.length - 1][0]},${H - pad.b} L${pts[0][0]},${H - pad.b} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(top * t));
  const short = (v) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v));

  return (
    <div className="rev-box" ref={box}>
    <svg className="rev-chart" width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Revenue for the last 7 days" onMouseLeave={() => setHover(null)}>
      <defs>
        <linearGradient id="revFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="rev-grid" />
          <text x={pad.l - 10} y={y(t) + 4} className="rev-axis" textAnchor="end">
            {short(t)}
          </text>
        </g>
      ))}
      <path d={area} fill="url(#revFill)" />
      <path d={line} className="rev-line" />
      <line x1={pts[at][0]} x2={pts[at][0]} y1={pts[at][1]} y2={H - pad.b} className="rev-guide" />
      <circle cx={pts[at][0]} cy={pts[at][1]} r="5.5" className="rev-dot" />
      <g transform={`translate(${Math.min(Math.max(pts[at][0], pad.l + 40), W - pad.r - 40)},${Math.max(pts[at][1] - 16, 14)})`}>
        <rect x="-42" y="-17" width="84" height="24" rx="7" className="rev-tip" />
        <text y="0" textAnchor="middle" className="rev-tip-t">
          {money(series[at].revenue, cur)}
        </text>
      </g>
      {series.map((d, i) => (
        <g key={d.date}>
          <text x={x(i)} y={H - 6} textAnchor="middle" className={`rev-axis${i === at ? ' on' : ''}`}>
            {d.label}
          </text>
          <rect
            x={x(i) - (W - pad.l - pad.r) / series.length / 2}
            y={pad.t}
            width={(W - pad.l - pad.r) / series.length}
            height={H - pad.t - pad.b}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          >
            <title>{`${d.label}: ${money(d.revenue, cur)} from ${d.orders} order${d.orders === 1 ? '' : 's'}`}</title>
          </rect>
        </g>
      ))}
    </svg>
    </div>
  );
}

/* ---------- donut ---------- */

function Donut({ parts, center, sub }) {
  const total = parts.reduce((n, p) => n + p.value, 0) || 1;
  const R = 52;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(', ')}>
        <circle cx="70" cy="70" r={R} className="donut-track" />
        {parts.filter((p) => p.value > 0).map((p) => {
          const len = (p.value / total) * C;
          const el = (
            <circle
              key={p.label}
              cx="70"
              cy="70"
              r={R}
              className="donut-seg"
              style={{ stroke: p.color, strokeDasharray: `${Math.max(0, len - 3)} ${C}`, strokeDashoffset: -offset }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="donut-c">
        <strong>{center}</strong>
        <span>{sub}</span>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

/**
 * One screen on a laptop or desktop: the four headline numbers, revenue
 * beside orders by status, and products beside stock health. Long lists
 * scroll inside their own card, never the page.
 */
export default function Dashboard() {
  const dispatch = useDispatch();
  const { data: stats, status, error } = useSelector((s) => s.stats);
  const products = useSelector((s) => s.products.items);
  const settings = useSelector(selectSettings);
  const cur = settings.currency || 'Rs';
  const [tab, setTab] = useState('products');

  useEffect(() => {
    dispatch(fetchStats());
  }, [dispatch]);

  /* Every product with what it has earned, best first; unsold ones follow. */
  const ranked = useMemo(() => {
    const sold = new Map((stats?.topProducts || []).map((t) => [t.id, t]));
    return products
      .map((p) => ({ ...p, units: sold.get(p.id)?.units || 0, earned: sold.get(p.id)?.revenue || 0 }))
      .sort((a, b) => b.units - a.units || (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .slice(0, 8);
  }, [products, stats]);

  const stock = useMemo(() => {
    const out = products.filter((p) => (p.stock ?? 0) <= 0).length;
    const low = products.filter((p) => (p.stock ?? 0) > 0 && p.stock <= 5).length;
    return { ok: products.length - out - low, low, out, total: products.length };
  }, [products]);

  if (status === 'loading' && !stats) {
    return (
      <div className="page-load">
        <div className="spin" />
        <span>Loading your numbers…</span>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="alert alert-bad" role="alert">
        <Alert size={17} />
        <span>{error}</span>
      </div>
    );
  }
  if (!stats) return null;

  const totalOrders = stats.orders || 0;
  const bars = [
    ['Pending', stats.pending, '#c9a24a'],
    ['Confirmed', stats.confirmed, '#3b6fb6'],
    ['Shipped', stats.shipped, '#7c5cc4'],
    ['Delivered', stats.delivered, '#1f8a5b'],
    ['Cancelled', stats.cancelled, '#c2414b'],
  ];
  const healthy = stock.total ? Math.round((stock.ok / stock.total) * 100) : 0;

  return (
    <div className="dash2">
      {/* ---------- headline numbers ---------- */}
      <div className="kpis">
        <Link to="/admin/orders" className="kpi">
          <i className="kpi-i orange">
            <Coins size={18} />
          </i>
          <div>
            <span>Total revenue</span>
            <strong className="orange">{money(stats.revenue, cur)}</strong>
            <small>{money(stats.revenueToday, cur)} today</small>
          </div>
        </Link>
        <Link to="/admin/orders" className="kpi">
          <i className="kpi-i violet">
            <Bag size={18} />
          </i>
          <div>
            <span>Orders</span>
            <strong className="violet">{stats.orders}</strong>
            <small>
              {stats.ordersToday} today · {stats.pending} to confirm
            </small>
          </div>
        </Link>
        <Link to="/admin/products" className="kpi">
          <i className="kpi-i teal">
            <Package size={18} />
          </i>
          <div>
            <span>Products live</span>
            <strong className="teal">{stats.activeProducts}</strong>
            <small>
              {stats.lowStock} low · {stats.outOfStock} sold out
            </small>
          </div>
        </Link>
        <Link to="/admin/subscribers" className="kpi">
          <i className="kpi-i pink">
            <Mail size={18} />
          </i>
          <div>
            <span>Subscribers</span>
            <strong className="pink">{stats.subscribers ?? 0}</strong>
            <small>{stats.pendingReviews ? `${stats.pendingReviews} reviews waiting` : 'Newsletter sign-ups'}</small>
          </div>
        </Link>
      </div>

      {/* ---------- revenue + order status ---------- */}
      <div className="dash2-row">
        <section className="card2 rev-card">
          <header className="card2-head">
            <div>
              <span className="card2-k">Revenue this week</span>
              <strong className="card2-big">{money(stats.revenueWeek, cur)}</strong>
            </div>
            <span className="card2-tag">
              <Trend size={14} /> Last 7 days
            </span>
          </header>
          <RevenueChart series={stats.series} cur={cur} />
        </section>

        <section className="card2">
          <header className="card2-head">
            <div>
              <h2>Orders by status</h2>
              <p>
                {totalOrders} order{totalOrders === 1 ? '' : 's'} in total
              </p>
            </div>
            <Link to="/admin/orders" className="mini" aria-label="Open orders">
              <ArrowRight size={14} />
            </Link>
          </header>
          <Link to="/admin/orders?status=pending" className="focus-tile">
            <i>
              <Bag size={16} />
            </i>
            <div>
              <strong>{stats.pending} waiting for you</strong>
              <span>Confirm them on WhatsApp</span>
            </div>
            <ArrowRight size={14} />
          </Link>
          <ul className="bars">
            {bars.map(([label, n, color]) => {
              const pct = totalOrders ? Math.round((n / totalOrders) * 100) : 0;
              return (
                <li key={label}>
                  <div>
                    <span>{label}</span>
                    <b>
                      {n} · {pct}%
                    </b>
                  </div>
                  <i>
                    <em style={{ width: `${pct}%`, background: color }} />
                  </i>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* ---------- products + stock ---------- */}
      <div className="dash2-row dash2-last">
        <section className="card2 tbl-card">
          <header className="card2-head">
            <div className="seg">
              <button type="button" className={tab === 'products' ? 'on' : undefined} onClick={() => setTab('products')}>
                Top products
              </button>
              <button type="button" className={tab === 'orders' ? 'on' : undefined} onClick={() => setTab('orders')}>
                Recent orders
              </button>
            </div>
            <Link to={tab === 'products' ? '/admin/products' : '/admin/orders'} className="btn btn-ghost btn-sm">
              View all <ArrowRight size={13} />
            </Link>
          </header>

          <div className="t-wrap">
            {tab === 'products' ? (
              <table className="t t-soft">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Date added</th>
                    <th>Price</th>
                    <th>Sold</th>
                    <th className="num">Total earned</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link to={`/admin/products/${p.id}`} className="t-prod">
                          <img src={imageUrl(p.images?.[0], true)} alt="" width="36" height="36" loading="lazy" />
                          <div>
                            <strong>{p.name}</strong>
                            <span>{p.stock ?? 0} in stock</span>
                          </div>
                        </Link>
                      </td>
                      <td className="t-dim">{formatDate(p.createdAt, false)}</td>
                      <td>
                        <span className="chip-pill orange">{money(p.price, cur)}</span>
                      </td>
                      <td className="t-dim">{p.units}</td>
                      <td className="num">
                        <span className="chip-pill blue">{money(p.earned, cur)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : stats.recentOrders.length === 0 ? (
              <div className="a-empty a-empty-sm">
                <i>
                  <Bag size={20} />
                </i>
                <h3>No orders yet</h3>
                <p>When someone checks out, the order lands here.</p>
              </div>
            ) : (
              <table className="t t-soft">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th className="num">Total</th>
                    <th className="num">Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((o) => {
                    const [, label, tone] = statusMeta(o.status);
                    return (
                      <tr key={o.id}>
                        <td>
                          <Link to={`/admin/orders?q=${o.orderNo}`} className="a-link">
                            {o.orderNo}
                          </Link>
                        </td>
                        <td>
                          <strong style={{ fontWeight: 650 }}>{o.customer.name}</strong>
                          <div className="t-dim">{o.customer.city}</div>
                        </td>
                        <td>
                          <span className={`pill ${tone}`}>{label}</span>
                        </td>
                        <td className="num">
                          <b>{money(o.total, cur)}</b>
                        </td>
                        <td className="num t-dim">{timeAgo(o.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="card2">
          <header className="card2-head">
            <div>
              <h2>Stock health</h2>
              <p>How much of your range is ready to sell</p>
            </div>
            <Link to="/admin/products" className="mini" aria-label="Open products">
              <Grid size={14} />
            </Link>
          </header>
          <div className="stock-wrap">
            <ul className="legend">
              <li>
                <i style={{ background: '#1f8a5b' }} />
                <div>
                  <span>In stock</span>
                  <b>{stock.ok}</b>
                </div>
              </li>
              <li>
                <i style={{ background: '#c9a24a' }} />
                <div>
                  <span>Running low</span>
                  <b>{stock.low}</b>
                </div>
              </li>
              <li>
                <i style={{ background: '#c2414b' }} />
                <div>
                  <span>Sold out</span>
                  <b>{stock.out}</b>
                </div>
              </li>
            </ul>
            <Donut
              center={`${healthy}%`}
              sub="In stock"
              parts={[
                { label: 'In stock', value: stock.ok, color: '#1f8a5b' },
                { label: 'Running low', value: stock.low, color: '#c9a24a' },
                { label: 'Sold out', value: stock.out, color: '#c2414b' },
              ]}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
