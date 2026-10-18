import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import { trackOrder, clearTracked } from '../store/ordersSlice';
import { selectSettings } from '../store/settingsSlice';
import ProductImage from '../components/ui/ProductImage';
import { money, formatDate, whatsappLink, statusMeta } from '../lib/format';
import { Search, Alert, Check, Package, Truck, Whatsapp, X } from '../components/ui/Icons';
import PageHead from '../components/layout/PageHead';
import { useMoney } from '../lib/currency';

const STEPS = [
  ['pending', 'Order received', 'We have your order and are confirming it'],
  ['confirmed', 'Confirmed', 'Your order is packed and ready to go'],
  ['shipped', 'On the way', 'The courier has your parcel'],
  ['delivered', 'Delivered', 'Handed over and paid'],
];

export default function TrackOrder() {
  const [params] = useSearchParams();
  const dispatch = useDispatch();
  const settings = useSelector(selectSettings);
  const { tracking, trackError, tracked } = useSelector((s) => s.orders);
  const cur = settings.currency || 'Rs';
  const fmt = useMoney();

  const [orderNo, setOrderNo] = useState(params.get('order') || '');
  const [phone, setPhone] = useState('');

  useEffect(() => () => dispatch(clearTracked()), [dispatch]);

  const submit = (e) => {
    e.preventDefault();
    if (!orderNo.trim() || !phone.trim()) return;
    dispatch(trackOrder({ orderNo: orderNo.trim(), phone: phone.trim() }));
  };

  const cancelled = tracked?.status === 'cancelled';
  const currentIndex = tracked ? STEPS.findIndex(([k]) => k === tracked.status) : -1;

  return (
    <>
      <PageHead page="track" narrow fallback={{ title: 'Track your order' }} />

      <div className="wrap wrap-narrow shop">
        <form className="panel" onSubmit={submit}>
          <div className="form-grid">
            <div className="inp">
              <label htmlFor="orderNo">Order number</label>
              <input
                id="orderNo"
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="SC-1001"
                autoComplete="off"
              />
            </div>
            <div className="inp">
              <label htmlFor="trackPhone">Mobile number</label>
              <input
                id="trackPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0307 9415512"
                inputMode="tel"
                autoComplete="tel"
              />
            </div>
          </div>

          <button
            className="btn btn-primary btn-block btn-lg mt"
            type="submit"
            disabled={tracking || !orderNo.trim() || !phone.trim()}
          >
            {tracking ? (
              <>
                <span className="spin" /> Looking…
              </>
            ) : (
              <>
                <Search size={17} /> Find my order
              </>
            )}
          </button>
        </form>

        {trackError && (
          <div className="alert alert-bad mt" role="alert">
            <Alert size={17} />
            <span>{trackError}</span>
          </div>
        )}

        {tracked && (
          <div className="panel mt">
            <div className="track-head">
              <div>
                <h2>{tracked.orderNo}</h2>
                <p className="sub">
                  Placed {formatDate(tracked.createdAt)} · {tracked.city}
                </p>
              </div>
              <span className={`tag tag-${statusMeta(tracked.status)[2]}`}>
                {statusMeta(tracked.status)[1]}
              </span>
            </div>

            {cancelled ? (
              <div className="alert alert-bad mt">
                <X size={17} />
                <span>
                  This order was cancelled. If that is not right, message us on WhatsApp and
                  we will sort it out.
                </span>
              </div>
            ) : (
              <div className="timeline">
                {STEPS.map(([key, label, note], i) => {
                  const history = tracked.statusHistory?.find((h) => h.status === key);
                  const state =
                    i < currentIndex ? 'done-step' : i === currentIndex ? 'now' : 'pending-step';
                  return (
                    <div className={`tl-step ${state}`} key={key}>
                      <div className="tl-dot">
                        {i < currentIndex ? (
                          <Check size={15} />
                        ) : i === currentIndex ? (
                          <Truck size={15} />
                        ) : (
                          <Package size={14} />
                        )}
                      </div>
                      <div>
                        <strong>{label}</strong>
                        <span>{history ? formatDate(history.at) : note}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="co-lines mt">
              {tracked.items.map((i, idx) => (
                <div className="co-line" key={idx}>
                  <ProductImage name={i.image} square alt="" width={56} height={56} />
                  <div>
                    <strong>{i.name}</strong>
                    <span>
                      {i.color ? `${i.color} · ` : ''}Qty {i.qty}
                    </span>
                  </div>
                  <b>{fmt(i.price * i.qty)}</b>
                </div>
              ))}
            </div>

            <div className="co-sum">
              <div>
                <span>Subtotal</span>
                <span>{fmt(tracked.subtotal)}</span>
              </div>
              <div className={tracked.delivery === 0 ? 'free' : undefined}>
                <span>Delivery</span>
                {tracked.delivery === 0 ? <b>Free</b> : <span>{fmt(tracked.delivery)}</span>}
              </div>
              <div>
                <span>Paying by</span>
                <span>{tracked.paymentLabel || 'Cash on delivery'}</span>
              </div>
              <div className="total">
                <span>
                  {tracked.status === 'delivered' || tracked.paymentStatus === 'paid'
                    ? 'Paid'
                    : (tracked.payment || 'cod') === 'cod'
                      ? 'To pay on delivery'
                      : 'To transfer'}
                </span>
                <span>{fmt.both(tracked.total)}</span>
              </div>
            </div>

            <a
              className="btn btn-wa btn-block mt"
              href={whatsappLink(settings)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Whatsapp /> Ask about this order
            </a>
          </div>
        )}

        {!tracked && !trackError && (
          <p className="form-foot">
            Lost your order number?{' '}
            <a href={whatsappLink(settings)} target="_blank" rel="noopener noreferrer">
              Message us on WhatsApp
            </a>{' '}
            and we will look it up.
          </p>
        )}
      </div>
    </>
  );
}
