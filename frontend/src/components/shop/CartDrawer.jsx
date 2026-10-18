import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import Modal from '../ui/Modal';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import ProductImage from '../ui/ProductImage';
import { QtyStepper } from './ProductOptions';
import { closeCart } from '../../store/uiSlice';
import {
  selectCartItems,
  selectCartCount,
  selectTotals,
  setQty,
  removeItem,
} from '../../store/cartSlice';
import { selectSettings } from '../../store/settingsSlice';
import { money } from '../../lib/format';
import { Trash, Cart, ArrowRight, Truck, Check } from '../ui/Icons';
import { useMoney } from '../../lib/currency';

export default function CartDrawer() {
  const open = useSelector((s) => s.ui.cartOpen);
  const items = useSelector(selectCartItems);
  const count = useSelector(selectCartCount);
  const totals = useSelector(selectTotals);
  const settings = useSelector(selectSettings);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const cur = settings.currency || 'Rs';
  const fmt = useMoney();

  const close = () => dispatch(closeCart());

  const checkout = () => {
    close();
    navigate('/checkout');
  };

  return (
    <Modal open={open} onClose={close} label="Shopping cart" variant="right" className="drawer-panel">
      <div className="drawer-head">
        <h3>
          Your cart{' '}
          <span>
            {count} item{count === 1 ? '' : 's'}
          </span>
        </h3>
      </div>

      {items.length === 0 ? (
        <div className="drawer-body drawer-empty">
          <EmptyState
            icon={Cart}
            title="Your cart is empty"
            action={
              <Button to="/shop" onClick={close}>
                Start shopping <ArrowRight />
              </Button>
            }
          >
            Pick something you like and it will show up here.
          </EmptyState>
        </div>
      ) : (
        <>
          {/* Free-delivery progress sits on top, where it nudges. */}
          <div className="drawer-ship">
            {totals.qualifies ? (
              <p className="ship-note ok">
                <Check size={15} /> Your order ships free
              </p>
            ) : (
              totals.remaining > 0 && (
                <>
                  <p className="ship-note">
                    <Truck size={15} /> Add <b>{fmt(totals.remaining)}</b> more for free delivery
                  </p>
                  <div className="ship-bar" aria-hidden="true">
                    <i style={{ width: `${totals.progress}%` }} />
                  </div>
                </>
              )
            )}
          </div>

          <div className="drawer-body">
            {items.map((item) => {
              const max = item.stock != null ? Math.min(20, item.stock) : 20;
              return (
                <div className="ci" key={item.key}>
                  <Link to={`/product/${item.slug}`} onClick={close} className="ci-img" tabIndex={-1}>
                    <ProductImage name={item.image} square alt={item.name} width={80} height={80} />
                  </Link>
                  <div className="ci-main">
                    <div className="ci-t">
                      <div>
                        <h4>
                          <Link to={`/product/${item.slug}`} onClick={close}>
                            {item.name}
                          </Link>
                        </h4>
                        {item.color && <div className="ci-col">{item.color}</div>}
                      </div>
                      <button
                        type="button"
                        className="ci-rm"
                        onClick={() => dispatch(removeItem(item.key))}
                        aria-label={`Remove ${item.name}`}
                        title="Remove"
                      >
                        <Trash size={16} />
                      </button>
                    </div>

                    <div className="ci-b">
                      <QtyStepper
                        small
                        value={item.qty}
                        min={0}
                        max={max}
                        onChange={(qty) => dispatch(setQty({ key: item.key, qty }))}
                      />
                      <span className="ci-p">{fmt(item.price * item.qty)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="drawer-foot">
            <div className="sum">
              <div>
                <span>Subtotal</span>
                <span>{fmt(totals.subtotal)}</span>
              </div>
              <div className={totals.delivery === 0 ? 'free' : undefined}>
                <span>Delivery</span>
                {totals.delivery === 0 ? <b>Free</b> : <span>{fmt(totals.delivery)}</span>}
              </div>
              <div className="total">
                <span>Total</span>
                <span>{fmt(totals.total)}</span>
              </div>
            </div>

            <Button size="lg" block onClick={checkout}>
              Checkout <ArrowRight />
            </Button>
            <button type="button" className="drawer-cont" onClick={close}>
              Continue shopping
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
