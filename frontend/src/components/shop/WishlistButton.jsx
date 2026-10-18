import { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleWish, makeSelectIsWished } from '../../store/wishlistSlice';
import { pushToast } from '../../store/uiSlice';
import { Heart } from '../ui/Icons';

/** Heart toggle for saving a product. `withLabel` shows text beside it. */
export default function WishlistButton({ product, className = '', withLabel = false, size = 18 }) {
  const dispatch = useDispatch();
  const select = useMemo(() => makeSelectIsWished(product.slug), [product.slug]);
  const on = useSelector(select);

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch(toggleWish(product.slug));
    dispatch(
      pushToast(
        on
          ? { title: 'Removed from your wishlist', message: product.name, kind: 'info', ms: 3000 }
          : { title: 'Saved to your wishlist', message: product.name, kind: 'ok', action: { label: 'View wishlist', to: '/wishlist' } }
      )
    );
  };

  return (
    <button
      type="button"
      className={`wish${on ? ' on' : ''}${withLabel ? ' btn btn-outline' : ''} ${className}`.trim()}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
      title={on ? 'Saved' : 'Save for later'}
    >
      <Heart size={size} filled={on} />
      {withLabel && <span>{on ? 'Saved' : 'Save'}</span>}
    </button>
  );
}
