import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import { selectCartItems, selectTotals, clearCart } from '../store/cartSlice';
import { placeOrder, clearPlaceError } from '../store/ordersSlice';
import { selectSettings } from '../store/settingsSlice';
import { pushToast } from '../store/uiSlice';
import ProductImage from '../components/ui/ProductImage';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import {
  money,
  whatsappLink,
  enabledPayments,
  paymentDetails,
  paymentMeta,
} from '../lib/format';
import { Alert, Shield, Whatsapp, ArrowRight, Cart, Check } from '../components/ui/Icons';
import PageHead from '../components/layout/PageHead';
import { useMoney } from '../lib/currency';

const CITIES = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan',
  'Peshawar', 'Quetta', 'Hyderabad', 'Gujranwala', 'Sialkot', 'Bahawalpur',
  'Sargodha', 'Sukkur', 'Larkana', 'Abbottabad', 'Mardan', 'Mirpur',
];

/** Accepts 03xx-xxxxxxx in the shapes people actually type. */
const phoneOk = (v) => {
  const d = String(v).replace(/\D/g, '');
  return /^03\d{9}$/.test(d) || /^923\d{9}$/.test(d) || /^3\d{9}$/.test(d);
};

const EMPTY = { name: '', phone: '', address: '', city: '', notes: '' };

export default function Checkout() {
  const items = useSelector(selectCartItems);
  const totals = useSelector(selectTotals);
  const settings = useSelector(selectSettings);
  const placing = useSelector((s) => s.orders.placing);
  const placeError = useSelector((s) => s.orders.placeError);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cur = settings.currency || 'Rs';
  const fmt = useMoney();

  const [form, setForm] = useState(() => {
    // Remember the last address so repeat customers do not retype it.
    try {
      const saved = localStorage.getItem('sc_customer');
      return saved ? { ...EMPTY, ...JSON.parse(saved), notes: '' } : EMPTY;
    } catch {
      return EMPTY;
    }
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  /* Memoised: a fresh array every render would re-run the effect below. */
  const methods = useMemo(() => enabledPayments(settings), [settings]);
  const [payment, setPayment] = useState('cod');

  /* Settings arrive after the first paint, so once they do, make sure the
     selected method is one that is actually switched on. */
  useEffect(() => {
    if (methods.length && !methods.some((m) => m.key === payment)) {
      setPayment(methods[0].key);
    }
  }, [methods, payment]);

  useEffect(() => () => dispatch(clearPlaceError()), [dispatch]);

  const validate = (f) => {
    const e = {};
    if (f.name.trim().length < 3) e.name = 'Please enter your full name';
    if (!phoneOk(f.phone)) e.phone = 'Please enter a valid mobile number, like 0307 9415512';
    if (f.address.trim().length < 10) e.address = 'Please give the full address, with house and street';
    if (!f.city.trim()) e.city = 'Please choose or type your city';
    return e;
  };

  const set = (key) => (ev) => {
    const next = { ...form, [key]: ev.target.value };
    setForm(next);
    if (touched[key]) setErrors(validate(next));
  };

  const blur = (key) => () => {
    setTouched((t) => ({ ...t, [key]: true }));
    setErrors(validate(form));
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const found = validate(form);
    setErrors(found);
    setTouched({ name: true, phone: true, address: true, city: true });

    if (Object.keys(found).length) {
      document.querySelector('.inp input.bad, .inp textarea.bad')?.focus();
      return;
    }

    const result = await dispatch(placeOrder({ customer: form, items, payment, shownCurrency: fmt.code }));

    if (placeOrder.fulfilled.match(result)) {
      try {
        const { notes, ...keep } = form;
        localStorage.setItem('sc_customer', JSON.stringify(keep));
      } catch {}
      dispatch(clearCart());
      navigate(`/order/${result.payload.orderNo}`, { state: { order: result.payload } });
    } else {
      dispatch(
        pushToast({
          title: 'We could not place your order',
          message: result.payload || 'Please try again, or order on WhatsApp.',
          kind: 'bad',
        })
      );
    }
  };

  const chosen = paymentMeta(payment);
  const details = paymentDetails(payment, settings);

  if (items.length === 0) {
    return (
      <div className="wrap section">
        <EmptyState
          icon={Cart}
          heading="h1"
          title="Your cart is empty"
          action={
            <Button to="/shop" size="lg">
              Browse the shop <ArrowRight />
            </Button>
          }
        >
          Add something you like and come back to check out.
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <PageHead page="checkout" fallback={{ title: 'Checkout' }} />

      <div className="wrap co">
        {/* ---------- form ---------- */}
        <form className="panel" onSubmit={submit} noValidate>
          <h2>Delivery details</h2>
          <p className="sub">We only use these to get the parcel to you.</p>

          {placeError && (
            <div className="alert alert-bad" role="alert">
              <Alert size={17} />
              <span>{placeError}</span>
            </div>
          )}

          <div className="form-grid">
            <div className="inp full">
              <label htmlFor="name">
                Full name <b>*</b>
              </label>
              <input
                id="name"
                value={form.name}
                onChange={set('name')}
                onBlur={blur('name')}
                className={errors.name && touched.name ? 'bad' : undefined}
                placeholder="Ali Raza"
                autoComplete="name"
              />
              {errors.name && touched.name && <span className="err">{errors.name}</span>}
            </div>

            <div className="inp">
              <label htmlFor="phone">
                Mobile number <b>*</b>
              </label>
              <input
                id="phone"
                value={form.phone}
                onChange={set('phone')}
                onBlur={blur('phone')}
                className={errors.phone && touched.phone ? 'bad' : undefined}
                placeholder="0307 9415512"
                inputMode="tel"
                autoComplete="tel"
              />
              {errors.phone && touched.phone ? (
                <span className="err">{errors.phone}</span>
              ) : (
                <span className="hint">The courier will call this number</span>
              )}
            </div>

            <div className="inp">
              <label htmlFor="city">
                City <b>*</b>
              </label>
              <input
                id="city"
                list="cities"
                value={form.city}
                onChange={set('city')}
                onBlur={blur('city')}
                className={errors.city && touched.city ? 'bad' : undefined}
                placeholder="Lahore"
                autoComplete="address-level2"
              />
              <datalist id="cities">
                {CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              {errors.city && touched.city && <span className="err">{errors.city}</span>}
            </div>

            <div className="inp full">
              <label htmlFor="address">
                Full address <b>*</b>
              </label>
              <textarea
                id="address"
                value={form.address}
                onChange={set('address')}
                onBlur={blur('address')}
                className={errors.address && touched.address ? 'bad' : undefined}
                placeholder="House 12, Street 4, Gulberg III, near Main Market"
                autoComplete="street-address"
              />
              {errors.address && touched.address ? (
                <span className="err">{errors.address}</span>
              ) : (
                <span className="hint">House and street number, plus a nearby landmark</span>
              )}
            </div>

            <div className="inp full">
              <label htmlFor="notes">Anything we should know? (optional)</label>
              <textarea
                id="notes"
                value={form.notes}
                onChange={set('notes')}
                placeholder="Call before delivery, gift wrap, preferred colour…"
                rows={2}
              />
            </div>
          </div>

          <h2 className="panel-h2-sm mt">How would you like to pay?</h2>
          <p className="sub">
            Nothing is charged on this website.
          </p>

          <div className="pay-list">
            {methods.map((m) => (
              <button
                type="button"
                key={m.key}
                className={`pay-opt${payment === m.key ? ' on' : ''}`}
                onClick={() => setPayment(m.key)}
                aria-pressed={payment === m.key}
              >
                <span className="tick">
                  <Check size={13} />
                </span>
                <span className="pay-b">
                  <strong>{m.label}</strong>
                  <span>{m.note}</span>
                </span>
                {m.tag && <span className="pay-tag">{m.tag}</span>}
              </button>
            ))}
          </div>

          {/* Account details for whichever transfer method is selected. */}
          {details.length > 0 && (
            <div className="pay-detail">
              <h5>Send {fmt.pkr(totals.total)} to</h5>
              <dl>
                {details.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <p>
                Place the order first, then send the receipt to{' '}
                <b>{settings.phoneDisplay}</b> on WhatsApp with your order number. We
                dispatch once the payment shows up.
              </p>
            </div>
          )}

          {!fmt.isPkr && (
            <div className="cur-note" role="note">
              <b>Prices are shown in {fmt.code}.</b> Your order is charged in Pakistani rupees:{' '}
              <b translate="no">{fmt.pkr(totals.total)}</b>. The {fmt.code} amount is a guide, using a recent exchange rate.
            </div>
          )}

          <div className="pay-note">
            <Shield size={18} />
            <span>
              {chosen.onDelivery ? (
                <>
                  <b>Cash on delivery.</b> Nothing is charged now. You pay{' '}
                  {fmt.pkr(totals.total)} to the courier when the parcel reaches you.
                </>
              ) : (
                <>
                  <b>{chosen.label}.</b> We never ask for a card number, a PIN or an OTP.
                  Send only to the account shown above.
                </>
              )}
            </span>
          </div>

          <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={placing}>
            {placing ? (
              <>
                <span className="spin" /> Placing your order…
              </>
            ) : (
              <>Place order · {fmt.both(totals.total)}</>
            )}
          </button>

          <a
            className="btn btn-wa btn-block mt-sm"
            href={whatsappLink(settings, { items })}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Whatsapp /> Order on WhatsApp instead
          </a>
        </form>

        {/* ---------- summary ---------- */}
        <aside className="co-side">
          <div className="panel">
            <h2 className="panel-h2-sm">Your order</h2>

            <div className="co-lines">
              {items.map((i) => (
                <div className="co-line" key={i.key}>
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
                <span>{fmt(totals.subtotal)}</span>
              </div>
              <div className={totals.delivery === 0 ? 'free' : undefined}>
                <span>Delivery</span>
                {totals.delivery === 0 ? <b>Free</b> : <span>{fmt(totals.delivery)}</span>}
              </div>
              <div className="total">
                <span>{chosen.onDelivery ? 'To pay on delivery' : 'To transfer'}</span>
                <span translate="no">{fmt(totals.total)}</span>
              </div>
            </div>

            {!totals.qualifies && totals.remaining > 0 && (
              <p className="ship-note mt-sm">
                Add <b>{fmt(totals.remaining)}</b> more and delivery is free
              </p>
            )}

            <Link
              to="/shop"
              className="btn btn-outline btn-block btn-sm mt-sm"
            >
              Keep shopping
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}
