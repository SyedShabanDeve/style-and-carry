import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import {
  fetchOrders,
  updateOrderStatus,
  deleteOrder,
  markPayment,
  setFilter,
  setQuery,
  selectVisibleOrders,
} from '../../store/ordersSlice';
import { fetchStats } from '../../store/statsSlice';
import { pushToast } from '../../store/uiSlice';
import { selectSettings } from '../../store/settingsSlice';
import {
  money,
  imageUrl,
  statusMeta,
  formatDate,
  ORDER_STATUSES,
} from '../../lib/format';
import {
  Search,
  X,
  Bag,
  Trash,
  Eye,
  Whatsapp,
  Alert,
  Refresh,
  Phone,
  Coins,
  Check,
} from '../../components/ui/Icons';

const FILTERS = [['all', 'All'], ...ORDER_STATUSES.map(([k, l]) => [k, l])];

/** How an order's payment reads in the table. */
function paymentPill(order) {
  const label = order.paymentLabel || 'Cash on delivery';
  const state = order.paymentStatus || 'on_delivery';
  if (state === 'paid') return { tone: 'ok', text: `${label} · paid` };
  if (state === 'awaiting') return { tone: 'warn', text: `${label} · awaiting` };
  return { tone: 'mute', text: label };
}

function OrderRow({ order, currency, onOpen, onStatus, onPaid, onDelete, busy }) {
  const [, label, tone] = statusMeta(order.status);
  const units = order.items.reduce((n, i) => n + i.qty, 0);
  const pay = paymentPill(order);
  const settings = useSelector(selectSettings);

  return (
    <tr>
      <td>
        <strong style={{ color: 'var(--gold)', fontSize: 14 }}>{order.orderNo}</strong>
        <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{formatDate(order.createdAt)}</div>
      </td>

      <td>
        <div className="t-prod">
          <img
            src={imageUrl(order.items[0]?.image, true)}
            alt=""
            width="42"
            height="42"
            loading="lazy"
          />
          <div>
            <strong>{order.customer.name}</strong>
            <span>
              {order.customer.city} · {units} item{units === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </td>

      <td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
        <a href={`tel:+${order.customer.phone}`} style={{ color: 'var(--ink-2)' }}>
          0{order.customer.phone.slice(2)}
        </a>
      </td>

      <td>
        <span className={`pill ${pay.tone}`}>{pay.text}</span>
      </td>

      <td>
        <select
          className="status-select"
          value={order.status}
          disabled={busy}
          onChange={(e) => onStatus(order, e.target.value)}
          aria-label={`Status for ${order.orderNo}`}
        >
          {ORDER_STATUSES.map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </td>

      <td className="num">
        <b>{money(order.total, currency)}</b>
        <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>
          <span className={`pill ${tone}`} style={{ padding: '1px 8px' }}>
            {label}
          </span>
        </div>
      </td>

      <td>
        <div className="row-act">
          <button className="mini" onClick={() => onOpen(order)} title="View details">
            <Eye size={15} />
          </button>
          {order.paymentStatus === 'awaiting' && (
            <button
              className="mini"
              onClick={() => onPaid(order)}
              disabled={busy}
              title="Mark the transfer as received"
            >
              <Coins size={15} />
            </button>
          )}
          <a
            className="mini"
            href={`https://wa.me/${order.customer.phone}?text=${encodeURIComponent(
              `Hello ${order.customer.name}, thank you for your order ${order.orderNo} from ${settings.storeName || 'Style & Carry'}. We are confirming it now and will update you when it ships.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Message on WhatsApp"
          >
            <Whatsapp size={15} />
          </a>
          <button
            className="mini danger"
            onClick={() => onDelete(order)}
            title="Delete order"
          >
            <Trash size={15} />
          </button>
        </div>
      </td>
    </tr>
  );
}

function OrderDetail({ order, currency, onClose }) {
  const [, label, tone] = statusMeta(order.status);
  return (
    <div className="confirm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="confirm-box"
        style={{ maxWidth: 620, textAlign: 'left', padding: 26 }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 18,
          }}
        >
          <div>
            <h3 style={{ fontSize: 22, marginBottom: 4 }}>{order.orderNo}</h3>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>
              {formatDate(order.createdAt)}
            </p>
          </div>
          <span className={`pill ${tone}`}>{label}</span>
        </div>

        <div className="ord-detail" style={{ marginBottom: 18 }}>
          <div>
            <h4
              style={{
                fontFamily: 'var(--body)',
                fontSize: 11.5,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: 10,
              }}
            >
              Customer
            </h4>
            <dl className="kv">
              <div>
                <dt>Name</dt>
                <dd>{order.customer.name}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>0{order.customer.phone.slice(2)}</dd>
              </div>
              <div>
                <dt>City</dt>
                <dd>{order.customer.city}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>{order.paymentLabel || 'Cash on delivery'}</dd>
              </div>
            </dl>
            <p style={{ marginTop: 10, fontSize: 13.5, color: 'var(--ink-2)' }}>
              {order.customer.address}
            </p>
            {order.customer.notes && (
              <p
                style={{
                  marginTop: 10,
                  padding: 10,
                  background: 'var(--warn-soft)',
                  borderRadius: 8,
                  fontSize: 13,
                  color: 'var(--ink-2)',
                }}
              >
                <b>Note:</b> {order.customer.notes}
              </p>
            )}
          </div>

          <div>
            <h4
              style={{
                fontFamily: 'var(--body)',
                fontSize: 11.5,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: 10,
              }}
            >
              Items
            </h4>
            <div className="co-lines" style={{ maxHeight: 200 }}>
              {order.items.map((i, idx) => (
                <div className="co-line" key={idx}>
                  <img src={imageUrl(i.image, true)} alt="" width="52" height="52" />
                  <div>
                    <strong>{i.name}</strong>
                    <span>
                      {i.color ? `${i.color} · ` : ''}Qty {i.qty}
                    </span>
                  </div>
                  <b>{money(i.price * i.qty, currency)}</b>
                </div>
              ))}
            </div>
            <div className="co-sum">
              <div>
                <span>Subtotal</span>
                <span>{money(order.subtotal, currency)}</span>
              </div>
              <div>
                <span>Delivery</span>
                <span>{order.delivery === 0 ? 'Free' : money(order.delivery, currency)}</span>
              </div>
              <div className="total">
                <span>Total</span>
                <span>{money(order.total, currency)}</span>
              </div>
            </div>
          </div>
        </div>

        {order.statusHistory?.length > 1 && (
          <div style={{ marginBottom: 18 }}>
            <h4
              style={{
                fontFamily: 'var(--body)',
                fontSize: 11.5,
                letterSpacing: '.06em',
                textTransform: 'uppercase',
                color: 'var(--ink-3)',
                marginBottom: 10,
              }}
            >
              History
            </h4>
            <div style={{ display: 'grid', gap: 6, fontSize: 13 }}>
              {order.statusHistory.map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ textTransform: 'capitalize' }}>
                    {h.status} <span style={{ color: 'var(--ink-3)' }}>by {h.by}</span>
                  </span>
                  <span style={{ color: 'var(--ink-3)' }}>{formatDate(h.at)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="confirm-act">
          <a
            className="btn btn-wa"
            href={`https://wa.me/${order.customer.phone}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Whatsapp size={15} /> WhatsApp
          </a>
          <a className="btn btn-outline" href={`tel:+${order.customer.phone}`}>
            <Phone size={15} /> Call
          </a>
          <button className="btn btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const dispatch = useDispatch();
  const [params, setParams] = useSearchParams();

  const orders = useSelector(selectVisibleOrders);
  const all = useSelector((s) => s.orders.list);
  const status = useSelector((s) => s.orders.listStatus);
  const error = useSelector((s) => s.orders.listError);
  const filter = useSelector((s) => s.orders.filter);
  const query = useSelector((s) => s.orders.query);
  const settings = useSelector(selectSettings);
  const cur = settings.currency || 'Rs';

  const [detail, setDetail] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  /* Deep links like /admin/orders?status=pending come from the dashboard. */
  useEffect(() => {
    dispatch(setFilter(params.get('status') || 'all'));
    dispatch(setQuery(params.get('q') || ''));
  }, [params, dispatch]);

  const patch = (next) => {
    const p = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === 'all') p.delete(k);
      else p.set(k, v);
    }
    setParams(p, { replace: true });
  };

  const changeStatus = async (order, next) => {
    setBusyId(order.id);
    const result = await dispatch(updateOrderStatus({ id: order.id, status: next }));
    setBusyId(null);

    if (updateOrderStatus.fulfilled.match(result)) {
      dispatch(pushToast({ message: `${order.orderNo} marked ${next}`, kind: 'ok' }));
      dispatch(fetchStats());
    } else {
      dispatch(pushToast({ message: result.payload || 'Could not update', kind: 'bad' }));
    }
  };

  const confirmPaid = async (order) => {
    setBusyId(order.id);
    const result = await dispatch(markPayment({ id: order.id, paymentStatus: 'paid' }));
    setBusyId(null);
    dispatch(
      pushToast(
        markPayment.fulfilled.match(result)
          ? { message: `${order.orderNo} marked paid`, kind: 'ok' }
          : { message: result.payload || 'Could not update the payment', kind: 'bad' }
      )
    );
  };

  const doDelete = async () => {
    const order = confirmDelete;
    setConfirmDelete(null);
    const result = await dispatch(deleteOrder(order.id));

    if (deleteOrder.fulfilled.match(result)) {
      dispatch(pushToast({ message: `${order.orderNo} deleted`, kind: 'ok' }));
      dispatch(fetchStats());
    } else {
      dispatch(pushToast({ message: result.payload || 'Could not delete', kind: 'bad' }));
    }
  };

  const counts = all.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <>
      <div className="a-tools">
        <div className="chips">
          {FILTERS.map(([key, label]) => (
            <button
              key={key}
              className={`chip${filter === key ? ' on' : ''}`}
              onClick={() => patch({ status: key })}
            >
              {label}
              {key !== 'all' && counts[key] ? ` (${counts[key]})` : ''}
              {key === 'all' ? ` (${all.length})` : ''}
            </button>
          ))}
        </div>

        <div className="search">
          <Search />
          <input
            type="search"
            value={query}
            placeholder="Order number, name, phone…"
            aria-label="Search orders"
            onChange={(e) => patch({ q: e.target.value })}
          />
          {query && (
            <button className="search-x" onClick={() => patch({ q: '' })} aria-label="Clear">
              <X size={15} />
            </button>
          )}
        </div>

        <button
          className="btn btn-outline btn-sm"
          onClick={() => {
            dispatch(fetchOrders());
            dispatch(fetchStats());
          }}
        >
          <Refresh size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert alert-bad" role="alert">
          <Alert size={17} />
          <span>{error}</span>
        </div>
      )}

      <div className="a-panel fill">
        {status === 'loading' ? (
          <div className="page-load" style={{ minHeight: 260 }}>
            <div className="spin" />
            <span>Loading orders…</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="a-empty">
            <i>
              <Bag size={26} />
            </i>
            <h3>{all.length === 0 ? 'No orders yet' : 'Nothing matches that'}</h3>
            <p>
              {all.length === 0
                ? 'When a customer checks out, the order appears here.'
                : 'Try a different search or filter.'}
            </p>
            {all.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={() => setParams({}, { replace: true })}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="t-wrap">
            <table className="t t-orders">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Phone</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th className="num">Total</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <OrderRow
                    key={o.id}
                    order={o}
                    currency={cur}
                    busy={busyId === o.id}
                    onOpen={setDetail}
                    onStatus={changeStatus}
                    onPaid={confirmPaid}
                    onDelete={setConfirmDelete}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {detail && <OrderDetail order={detail} currency={cur} onClose={() => setDetail(null)} />}

      {confirmDelete && (
        <div className="confirm">
          <div className="confirm-box" role="alertdialog" aria-modal="true">
            <div className="ring">
              <Trash size={26} />
            </div>
            <h3>Delete {confirmDelete.orderNo}?</h3>
            <p>
              This removes the order for good and puts its stock back. There is no undo.
            </p>
            <div className="confirm-act">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>
                Keep it
              </button>
              <button className="btn btn-danger" onClick={doDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
