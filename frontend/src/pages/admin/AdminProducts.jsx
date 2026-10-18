import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import { deleteProduct, saveProduct, fetchProducts } from '../../store/productsSlice';
import { pushToast } from '../../store/uiSlice';
import { selectSettings } from '../../store/settingsSlice';
import { money, imageUrl, categoryLabel } from '../../lib/format';
import { selectAllCategories } from '../../store/contentSlice';
import {
  Search,
  X,
  Package,
  Trash,
  Edit,
  Plus,
  Eye,
  Refresh,
} from '../../components/ui/Icons';

export default function AdminProducts() {
  const dispatch = useDispatch();
  const products = useSelector((s) => s.products.items);
  const status = useSelector((s) => s.products.status);
  const settings = useSelector(selectSettings);
  const categories = useSelector(selectAllCategories);
  const cur = settings.currency || 'Rs';

  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const visible = useMemo(() => {
    let list = products;
    if (cat !== 'all') list = list.filter((p) => p.category === cat);
    const needle = q.trim().toLowerCase();
    if (needle) {
      list = list.filter((p) =>
        [p.name, p.description, p.category].join(' ').toLowerCase().includes(needle)
      );
    }
    return [...list].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [products, cat, q]);

  /** The visibility switch writes straight through, no form needed. */
  const toggleActive = async (product) => {
    setBusyId(product.id);
    const result = await dispatch(
      saveProduct({ id: product.id, values: { ...product, active: !product.active } })
    );
    setBusyId(null);

    if (saveProduct.fulfilled.match(result)) {
      dispatch(
        pushToast({
          message: `${product.name} is now ${product.active ? 'hidden' : 'visible'}`,
          kind: 'ok',
        })
      );
    } else {
      dispatch(pushToast({ message: result.payload || 'Could not update', kind: 'bad' }));
    }
  };

  const doDelete = async () => {
    const product = confirmDelete;
    setConfirmDelete(null);
    const result = await dispatch(deleteProduct(product.id));

    dispatch(
      pushToast(
        deleteProduct.fulfilled.match(result)
          ? { message: `${product.name} deleted`, kind: 'ok' }
          : { message: result.payload || 'Could not delete', kind: 'bad' }
      )
    );
  };

  return (
    <>
      <div className="a-tools">
        <div className="chips">
          {[['all', 'All'], ...categories.map((c) => [c.key, c.name])].map(([key, label]) => (
            <button
              key={key}
              className={`chip${cat === key ? ' on' : ''}`}
              onClick={() => setCat(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="search">
          <Search />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products…"
            aria-label="Search products"
          />
          {q && (
            <button className="search-x" onClick={() => setQ('')} aria-label="Clear">
              <X size={15} />
            </button>
          )}
        </div>

        <button
          className="btn btn-outline btn-sm"
          onClick={() => dispatch(fetchProducts({ includeInactive: true }))}
        >
          <Refresh size={14} /> Refresh
        </button>

        <Link to="/admin/products/new" className="btn btn-primary btn-sm">
          <Plus size={16} /> Add product
        </Link>
      </div>

      <div className="a-panel fill">
        {status === 'loading' ? (
          <div className="page-load" style={{ minHeight: 260 }}>
            <div className="spin" />
            <span>Loading products…</span>
          </div>
        ) : visible.length === 0 ? (
          <div className="a-empty">
            <i>
              <Package size={26} />
            </i>
            <h3>{products.length === 0 ? 'No products yet' : 'Nothing matches that'}</h3>
            <p>
              {products.length === 0
                ? 'Add your first wallet and it will appear on the storefront.'
                : 'Try a different search or category.'}
            </p>
            <Link to="/admin/products/new" className="btn btn-primary btn-sm">
              <Plus size={16} /> Add product
            </Link>
          </div>
        ) : (
          <div className="t-wrap">
            <table className="t t-products">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th className="num">Price</th>
                  <th className="num">Stock</th>
                  <th>Visible</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const out = (p.stock ?? 0) <= 0;
                  const low = !out && (p.stock ?? 0) <= 5;
                  return (
                    <tr key={p.id} style={{ opacity: p.active === false ? 0.55 : 1 }}>
                      <td>
                        <div className="t-prod">
                          <img
                            src={imageUrl(p.images?.[0], true)}
                            alt=""
                            width="42"
                            height="42"
                            loading="lazy"
                          />
                          <div>
                            <strong>{p.name}</strong>
                            <span>
                              {p.colors?.length || 0} colour
                              {p.colors?.length === 1 ? '' : 's'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                        {categoryLabel(p.category)}
                      </td>

                      <td className="num">
                        <b>{money(p.price, cur)}</b>
                        {p.compareAt > p.price && (
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--ink-3)',
                              textDecoration: 'line-through',
                            }}
                          >
                            {money(p.compareAt, cur)}
                          </div>
                        )}
                      </td>

                      <td className="num">
                        <span className={`pill ${out ? 'bad' : low ? 'warn' : 'ok'}`}>
                          {out ? 'Sold out' : p.stock}
                        </span>
                      </td>

                      <td>
                        <label className="switch" title="Show on the storefront">
                          <input
                            type="checkbox"
                            checked={p.active !== false}
                            disabled={busyId === p.id}
                            onChange={() => toggleActive(p)}
                          />
                          <i />
                        </label>
                      </td>

                      <td>
                        <div className="row-act">
                          <a
                            className="mini"
                            href={`/product/${p.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="View on storefront"
                          >
                            <Eye size={15} />
                          </a>
                          <Link className="mini" to={`/admin/products/${p.id}`} title="Edit">
                            <Edit size={15} />
                          </Link>
                          <button
                            className="mini danger"
                            onClick={() => setConfirmDelete(p)}
                            title="Delete"
                          >
                            <Trash size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="confirm">
          <div className="confirm-box" role="alertdialog" aria-modal="true">
            <div className="ring">
              <Trash size={26} />
            </div>
            <h3>Delete {confirmDelete.name}?</h3>
            <p>
              It disappears from the storefront straight away and cannot be brought back. To
              take it off sale temporarily, switch it to hidden instead.
            </p>
            <div className="confirm-act">
              <button className="btn btn-outline" onClick={() => setConfirmDelete(null)}>
                Cancel
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
