import { useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

import { selectSettings } from '../store/settingsSlice';
import { money, whatsappLink, formatDate, paymentDetails } from '../lib/format';
import { CheckCircle, Whatsapp, ArrowRight, Package } from '../components/ui/Icons';
import { useMoney } from '../lib/currency';

export default function OrderSuccess() {
  const { orderNo } = useParams();
  const location = useLocation();
  const settings = useSelector(selectSettings);
  const fromStore = useSelector((s) => s.orders.lastOrder);
  const cur = settings.currency || 'Rs';
  const fmt = useMoney();

  /* The order arrives via navigation state; the store copy is the fallback
     for a refresh on this page. */
  const order = location.state?.order || (fromStore?.orderNo === orderNo ? fromStore : null);

  useEffect(() => {
    document.title = `Order ${orderNo} placed — Style & Carry`;
    return () => {
      document.title = 'Style & Carry';
    };
  }, [orderNo]);

  const onDelivery = !order || (order.payment || 'cod') === 'cod';
  const details = order ? paymentDetails(order.payment, settings) : [];

  const waMessage = order
    ? `https://wa.me/${settings.phone}?text=${encodeURIComponent(
        `Hello ${settings.storeName || 'Style & Carry'}, I have just placed an order on your website.\n\nOrder number: *${order.orderNo}*\nName: ${order.customer.name}\nTotal: ${money(order.total, cur)}\n\nPlease confirm my order. Thank you.`
      )}`
    : whatsappLink(settings);

  return (
    <div className="wrap">
      <div className="done">
        <div className="done-mark">
          <CheckCircle size={38} />
        </div>

        <h1>Order placed</h1>
        <p>
          Thank you{order ? `, ${order.customer.name.split(' ')[0]}` : ''}. We have your order
          and will confirm it on WhatsApp shortly.
        </p>

        <div className="ord-no">{orderNo}</div>

        <p className="done-note">
          Save this number. You can use it to track your order any time.
        </p>

        {order && (
          <div className="done-sum">
            <h4>Order summary</h4>
            {order.items.map((i, idx) => (
              <div key={idx}>
                <span>
                  {i.name}
                  {i.color ? ` · ${i.color}` : ''} × {i.qty}
                </span>
                <span>{fmt(i.price * i.qty)}</span>
              </div>
            ))}
            <div className="done-gap">
              <span>Delivery</span>
              <span>{order.delivery === 0 ? 'Free' : fmt(order.delivery)}</span>
            </div>
            <div>
              <span>Paying by</span>
              <span>{order.paymentLabel || 'Cash on delivery'}</span>
            </div>
            <div className="total">
              <span>{onDelivery ? 'Pay on delivery' : 'To transfer'}</span>
              <span>{fmt.both(order.total)}</span>
            </div>

            <div className="done-sep">
              <span>Delivering to</span>
              <span className="done-addr">
                {order.customer.address}, {order.customer.city}
              </span>
            </div>
            <div>
              <span>Placed</span>
              <span>{formatDate(order.createdAt)}</span>
            </div>
          </div>
        )}

        {/* A transfer order needs the account details right here, while the
            customer still has the page open. */}
        {order && onDelivery === false && details.length > 0 && (
          <div className="pay-detail done-pay">
            <h5>Now send {fmt.pkr(order.total)} to</h5>
            <dl>
              {details.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <p>
              Then send the receipt to <b>{settings.phoneDisplay}</b> on WhatsApp along with
              order number <b>{order.orderNo}</b>. We dispatch as soon as it shows up.
            </p>
          </div>
        )}

        <div className="alert alert-ok done-alert">
          <Package size={18} />
          <span>
            {onDelivery ? (
              <>
                <b>What happens next.</b> We confirm on WhatsApp, then dispatch. Most
                parcels arrive within 3 to 5 working days. Keep{' '}
                {order ? fmt.pkr(order.total) : 'the total'} in cash ready for the
                courier.
              </>
            ) : (
              <>
                <b>What happens next.</b> Once your transfer reaches us we confirm on
                WhatsApp and dispatch. Most parcels arrive within 3 to 5 working days of
                the payment clearing.
              </>
            )}
          </span>
        </div>

        <div className="done-act">
          <a className="btn btn-wa btn-lg" href={waMessage} target="_blank" rel="noopener noreferrer">
            <Whatsapp /> Confirm on WhatsApp
          </a>
          <Link to={`/track?order=${orderNo}`} className="btn btn-outline">
            Track this order
          </Link>
          <Link to="/shop" className="btn btn-ghost">
            Keep shopping <ArrowRight />
          </Link>
        </div>
      </div>
    </div>
  );
}
