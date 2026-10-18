import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

import api from '../../api/client';
import ImageField from '../../components/admin/ImageField';
import { fetchContent } from '../../store/contentSlice';
import { pushToast } from '../../store/uiSlice';
import { imageUrl, PLACEHOLDER_IMG } from '../../lib/format';
import { Plus, Edit, Trash, ArrowUp, ArrowDown, Alert, Layers, X } from '../../components/ui/Icons';

const BLANK = { name: '', key: '', description: '', image: '', active: true };

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

export default function AdminCategories() {
  const dispatch = useDispatch();
  const [categories, setCategories] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(null); // null | 'new' | category id
  const [form, setForm] = useState(BLANK);
  const [keyTouched, setKeyTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const refresh = async () => {
    try {
      const d = await api.get('/categories', { auth: true });
      setCategories(d.categories);
    } catch (err) {
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    }
    dispatch(fetchContent()); // keep the storefront's copy in step
    setLoaded(true);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const open = (cat) => {
    setError(null);
    if (cat) {
      setEditing(cat.id);
      setForm({ name: cat.name, key: cat.key, description: cat.description || '', image: cat.image || '', active: cat.active !== false });
      setKeyTouched(true);
    } else {
      setEditing('new');
      setForm(BLANK);
      setKeyTouched(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError('Give the category a name');
    const values = { ...form, key: slugify(form.key || form.name) };
    if (!values.key) return setError('The web address needs letters or numbers');
    setBusy(true);
    try {
      if (editing === 'new') await api.post('/categories', values, { auth: true });
      else await api.put(`/categories/${editing}`, values, { auth: true });
      dispatch(pushToast({ message: editing === 'new' ? 'Category added' : 'Category saved', kind: 'ok' }));
      setEditing(null);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (cat) => {
    try {
      await api.put(`/categories/${cat.id}`, { active: !(cat.active !== false) }, { auth: true });
      await refresh();
    } catch (err) {
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    }
  };

  const move = async (i, d) => {
    const order = categories.map((c) => c.id);
    const j = i + d;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    try {
      await api.put('/categories', { order }, { auth: true });
      await refresh();
    } catch (err) {
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    }
  };

  const doDelete = async () => {
    const cat = confirm;
    setConfirm(null);
    try {
      await api.del(`/categories/${cat.id}`, { auth: true });
      dispatch(pushToast({ message: `${cat.name} deleted`, kind: 'ok' }));
      if (editing === cat.id) setEditing(null);
      await refresh();
    } catch (err) {
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    }
  };

  return (
    <div className="a-scroll">
      <div className={`a-split${editing ? ' editing' : ''}`}>
        <div className="a-panel">
          <div className="a-panel-head">
            <div>
              <h2>Categories</h2>
              <p>Shown on the homepage tiles, the shop filters and the menu. Empty categories stay hidden on the shop.</p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={() => open(null)}>
              <Plus size={15} /> Add category
            </button>
          </div>

          {!loaded ? (
            <div className="page-load" style={{ minHeight: 200 }}>
              <div className="spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="a-empty">
              <i>
                <Layers size={26} />
              </i>
              <h3>No categories yet</h3>
              <p>Add one, then pick it when you add a product.</p>
            </div>
          ) : (
            <div className="t-wrap">
              <table className="t t-cats">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th className="num">Products</th>
                    <th>Visible</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c, i) => (
                    <tr key={c.id}>
                      <td>
                        <div className="t-prod">
                          <img
                            src={c.image ? imageUrl(c.image) : PLACEHOLDER_IMG}
                            alt=""
                            width="44"
                            height="44"
                            onError={(e) => {
                              e.currentTarget.src = PLACEHOLDER_IMG;
                            }}
                          />
                          <div>
                            <strong>{c.name}</strong>
                            <span>/shop?category={c.key}</span>
                          </div>
                        </div>
                      </td>
                      <td className="num">
                        <span className={`pill ${c.productCount ? 'ok' : 'warn'}`}>{c.productCount ?? 0}</span>
                      </td>
                      <td>
                        <label className="switch" title="Show on the storefront">
                          <input type="checkbox" checked={c.active !== false} onChange={() => toggle(c)} />
                          <i />
                        </label>
                      </td>
                      <td>
                        <div className="row-act">
                          <button type="button" className="mini" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${c.name} up`}>
                            <ArrowUp size={14} />
                          </button>
                          <button type="button" className="mini" onClick={() => move(i, 1)} disabled={i === categories.length - 1} aria-label={`Move ${c.name} down`}>
                            <ArrowDown size={14} />
                          </button>
                          <button type="button" className="mini" onClick={() => open(c)} aria-label={`Edit ${c.name}`}>
                            <Edit size={14} />
                          </button>
                          <button type="button" className="mini danger" onClick={() => setConfirm(c)} aria-label={`Delete ${c.name}`}>
                            <Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {editing && (
          <form className="a-panel" onSubmit={save}>
            <div className="a-panel-head">
              <h2>{editing === 'new' ? 'New category' : 'Edit category'}</h2>
              <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="a-panel-body">
              {error && (
                <div className="alert alert-bad" role="alert">
                  <Alert size={17} />
                  <span>{error}</span>
                </div>
              )}
              <div className="form-grid">
                <div className="inp full">
                  <label htmlFor="cat-name">Name</label>
                  <input
                    id="cat-name"
                    value={form.name}
                    maxLength={60}
                    placeholder="Watches"
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value, key: keyTouched ? f.key : slugify(e.target.value) }))
                    }
                    required
                  />
                </div>
                <div className="inp full">
                  <label htmlFor="cat-key">Web address</label>
                  <input
                    id="cat-key"
                    value={form.key}
                    maxLength={60}
                    onChange={(e) => {
                      setKeyTouched(true);
                      setForm((f) => ({ ...f, key: e.target.value }));
                    }}
                  />
                  <span className="hint">/shop?category={slugify(form.key || form.name) || 'your-category'}</span>
                </div>
                <div className="inp full">
                  <label htmlFor="cat-desc">Short description (optional)</label>
                  <input id="cat-desc" value={form.description} maxLength={160} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="inp full">
                  <ImageField kind="category" value={form.image} onChange={(image) => setForm((f) => ({ ...f, image }))} />
                  <span className="hint">Without a photo, the first product's photo is used.</span>
                </div>
                <div className="inp full">
                  <label className="switch">
                    <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
                    <i />
                    Visible on the storefront
                  </label>
                </div>
              </div>
            </div>
            <div className="a-panel-foot">
              <button type="button" className="btn btn-outline" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? <span className="spin" /> : null} {editing === 'new' ? 'Add category' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </div>

      {confirm && (
        <div className="confirm">
          <div className="confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="cat-del-t">
            <div className="ring">
              <Trash size={22} />
            </div>
            <h3 id="cat-del-t">Delete {confirm.name}?</h3>
            <p>
              {confirm.productCount
                ? `${confirm.productCount} product(s) use it, so it cannot be deleted. Move them first, or switch it off instead.`
                : 'This cannot be undone.'}
            </p>
            <div className="confirm-act">
              <button className="btn btn-outline" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={doDelete} disabled={!!confirm.productCount}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
