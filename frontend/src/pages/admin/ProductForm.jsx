import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';

import { saveProduct } from '../../store/productsSlice';
import { pushToast } from '../../store/uiSlice';
import { selectSettings } from '../../store/settingsSlice';
import api from '../../api/client';
import { money, imageUrl } from '../../lib/format';
import { selectAllCategories } from '../../store/contentSlice';
import { sizeText, checkFit, IMAGE_SIZES } from '../../lib/imageSizes';
import { X, Plus, Upload, Image, Alert, ArrowRight } from '../../components/ui/Icons';

const BLANK = {
  name: '',
  slug: '',
  category: '',
  price: '',
  compareAt: '',
  stock: 0,
  badge: '',
  description: '',
  images: [],
  colors: [],
  specs: [],
  features: [],
  material: '',
  active: true,
};

const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

/** Adds and removes items from a list of plain strings. */
function TagEditor({ label, items, onChange, placeholder }) {
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setDraft('');
  };

  return (
    <div className="field">
      <label>{label}</label>
      {items.length > 0 && (
        <div className="tag-list">
          {items.map((t, i) => (
            <span className="tag" key={t + i}>
              {t}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, x) => x !== i))}
                aria-label={`Remove ${t}`}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="add-row">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" className="btn btn-outline btn-sm" onClick={add}>
          <Plus size={15} /> Add
        </button>
      </div>
    </div>
  );
}

export default function ProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const fileRef = useRef(null);

  const products = useSelector((s) => s.products.items);
  const categories = useSelector(selectAllCategories);
  const [dims, setDims] = useState({});
  const settings = useSelector(selectSettings);
  const cur = settings.currency || 'Rs';

  const isEdit = Boolean(id);
  const existing = isEdit ? products.find((p) => p.id === id) : null;

  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  /* A new product starts in the first category once the list has loaded. */
  useEffect(() => {
    if (!isEdit && !form.category && categories.length) {
      setForm((f) => ({ ...f, category: categories[0].key }));
    }
  }, [isEdit, categories, form.category]);

  /* Load the product being edited once the catalogue has arrived. */
  useEffect(() => {
    if (!isEdit) return;
    if (existing) {
      setForm({
        ...BLANK,
        ...existing,
        compareAt: existing.compareAt ?? '',
        badge: existing.badge ?? '',
      });
      setSlugTouched(true);
    }
  }, [isEdit, existing?.id]);

  if (isEdit && !existing && products.length > 0) {
    return (
      <div className="a-empty">
        <i>
          <Alert size={26} />
        </i>
        <h3>Product not found</h3>
        <p>It may have been deleted.</p>
        <Link to="/admin/products" className="btn btn-primary btn-sm">
          Back to products
        </Link>
      </div>
    );
  }

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setName = (value) => {
    setForm((f) => ({
      ...f,
      name: value,
      // Keep the web address in step with the name until it is edited by hand.
      slug: slugTouched ? f.slug : slugify(value),
    }));
  };

  const uploadFiles = async (files) => {
    const list = Array.from(files || []).slice(0, 6);
    if (!list.length) return;

    const data = new FormData();
    list.forEach((f) => data.append('images', f));

    setUploading(true);
    try {
      const res = await api.upload('/admin/upload', data);
      set('images', [...form.images, ...res.images]);
      dispatch(pushToast({ title: `${res.images.length} photo${res.images.length === 1 ? '' : 's'} uploaded`, message: 'Press Save to keep them on the product.', kind: 'ok' }));
    } catch (err) {
      dispatch(pushToast({ message: err.message, kind: 'bad' }));
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!form.name.trim()) return setError('Give the product a name');
    if (!Number(form.price)) return setError('Set a price above zero');
    if (form.compareAt && Number(form.compareAt) <= Number(form.price)) {
      return setError('The "was" price should be higher than the selling price');
    }
    if (form.images.length === 0) return setError('Add at least one photo');
    if (!form.category) return setError('Choose a category. Add one under Categories first if the list is empty.');

    const values = {
      ...form,
      price: Number(form.price),
      compareAt: form.compareAt === '' ? null : Number(form.compareAt),
      stock: Number(form.stock) || 0,
      badge: form.badge.trim() || null,
      slug: slugify(form.slug || form.name),
    };

    setSaving(true);
    const result = await dispatch(saveProduct({ id: isEdit ? id : undefined, values }));
    setSaving(false);

    if (saveProduct.fulfilled.match(result)) {
      dispatch(
        pushToast({ message: isEdit ? 'Product updated' : 'Product added', kind: 'ok' })
      );
      navigate('/admin/products');
    } else {
      setError(result.payload || 'Could not save the product');
    }
  };

  const saving_ = saving || uploading;

  return (
    /* Column layout: the fields scroll, the action bar stays pinned at the
       bottom so Save is always reachable without scrolling the page. */
    <form className="a-form" onSubmit={submit}>
      <div className="a-scroll">
        {error && (
          <div className="alert alert-bad" role="alert">
            <Alert size={17} />
            <span>{error}</span>
          </div>
        )}

        <div className="pf">
        {/* ---------- left: the details ---------- */}
        <div>
          <div className="a-panel">
            <div className="a-panel-head">
              <h2>Basics</h2>
            </div>
            <div className="a-panel-body">
              <div className="form-grid">
                <div className="inp full">
                  <label htmlFor="name">Product name</label>
                  <input
                    id="name"
                    value={form.name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Metro Trifold"
                    required
                  />
                </div>

                <div className="inp full">
                  <label htmlFor="slug">Web address</label>
                  <input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      set('slug', e.target.value);
                    }}
                    placeholder="metro-trifold"
                  />
                  <span className="hint">
                    /product/{slugify(form.slug || form.name) || 'your-product'}
                  </span>
                </div>

                <div className="inp">
                  <label htmlFor="category">Category</label>
                  <select
                    id="category"
                    value={form.category}
                    onChange={(e) => set('category', e.target.value)}
                  >
                    {!form.category && <option value="">Choose a category</option>}
                    {categories.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.name}
                        {c.active === false ? ' (hidden)' : ''}
                      </option>
                    ))}
                  </select>
                  <span className="hint">
                    Need a new one, like Watches? <Link to="/admin/categories">Manage categories</Link>
                  </span>
                </div>

                <div className="inp">
                  <label htmlFor="badge">Badge (optional)</label>
                  <input
                    id="badge"
                    value={form.badge}
                    onChange={(e) => set('badge', e.target.value)}
                    placeholder="Bestseller"
                  />
                  <span className="hint">Small label on the product card</span>
                </div>

                <div className="inp full">
                  <label htmlFor="description">Short description</label>
                  <textarea
                    id="description"
                    value={form.description}
                    onChange={(e) => set('description', e.target.value)}
                    placeholder="Compact trifold with a steel snap closure…"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="a-panel">
            <div className="a-panel-head">
              <h2>Price and stock</h2>
            </div>
            <div className="a-panel-body">
              <div className="form-grid">
                <div className="inp">
                  <label htmlFor="price">Selling price ({cur})</label>
                  <input
                    id="price"
                    type="number"
                    min="0"
                    step="10"
                    value={form.price}
                    onChange={(e) => set('price', e.target.value)}
                    placeholder="1190"
                    required
                  />
                </div>

                <div className="inp">
                  <label htmlFor="compareAt">Was price ({cur})</label>
                  <input
                    id="compareAt"
                    type="number"
                    min="0"
                    step="10"
                    value={form.compareAt}
                    onChange={(e) => set('compareAt', e.target.value)}
                    placeholder="1590"
                  />
                  <span className="hint">Shown crossed out. Leave blank for no discount.</span>
                </div>

                <div className="inp">
                  <label htmlFor="stock">Units in stock</label>
                  <input
                    id="stock"
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => set('stock', e.target.value)}
                  />
                  <span className="hint">At zero it shows as sold out</span>
                </div>

                <div className="inp" style={{ justifyContent: 'flex-end' }}>
                  <label className="switch" style={{ marginBottom: 10 }}>
                    <input
                      type="checkbox"
                      checked={form.active}
                      onChange={(e) => set('active', e.target.checked)}
                    />
                    <i />
                    Visible on the storefront
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="a-panel">
            <div className="a-panel-head">
              <h2>Details</h2>
              <p>Specs show as small pills; features become the bulleted list.</p>
            </div>
            <div className="a-panel-body">
              <TagEditor
                label="Specs"
                items={form.specs}
                onChange={(v) => set('specs', v)}
                placeholder="Snap close"
              />
              <TagEditor
                label="Features"
                items={form.features}
                onChange={(v) => set('features', v)}
                placeholder="6 card slots, 2 note compartments"
              />

              <div className="inp" style={{ marginBottom: 18 }}>
                <label htmlFor="material">Material note (optional)</label>
                <textarea
                  id="material"
                  rows={3}
                  value={form.material || ''}
                  maxLength={600}
                  onChange={(e) => set('material', e.target.value)}
                  placeholder="100% cotton lawn. Stainless steel case, leather strap. PU leather, not genuine leather…"
                />
                <span className="hint">Shown under "Material" on the product page. Leave empty to hide that section.</span>
              </div>

              {/* colours */}
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Colours</label>
                {form.colors.map(([label, hex], i) => (
                  <div className="colour-row" key={i}>
                    <input
                      value={label}
                      onChange={(e) => {
                        const next = [...form.colors];
                        next[i] = [e.target.value, hex];
                        set('colors', next);
                      }}
                      placeholder="Tan"
                      style={{
                        padding: '9px 13px',
                        border: '1.5px solid var(--line-2)',
                        borderRadius: 'var(--r-sm)',
                        background: 'var(--surface)',
                      }}
                    />
                    <input
                      type="color"
                      value={hex}
                      onChange={(e) => {
                        const next = [...form.colors];
                        next[i] = [label, e.target.value];
                        set('colors', next);
                      }}
                      aria-label={`Colour for ${label}`}
                    />
                    <button
                      type="button"
                      className="mini danger"
                      onClick={() => set('colors', form.colors.filter((_, x) => x !== i))}
                      aria-label="Remove colour"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => set('colors', [...form.colors, ['New colour', '#b07a45']])}
                >
                  <Plus size={15} /> Add colour
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- right: photos and preview ---------- */}
        <div>
          <div className="a-panel">
            <div className="a-panel-head">
              <h2>Photos</h2>
              <p>
                Size: <b className="imgf-size">{sizeText('product')}</b> square. The first one is the main image.
              </p>
            </div>
            <div className="a-panel-body">
              {form.images.length > 0 && (
                <div className="img-grid">
                  {form.images.map((img, i) => (
                    <div
                      className={`img-cell${i === 0 ? ' first' : ''}${dims[img] && checkFit('product', dims[img].w, dims[img].h) ? ' misfit' : ''}`}
                      key={img + i}
                      title={dims[img] ? checkFit('product', dims[img].w, dims[img].h) || `${dims[img].w} × ${dims[img].h} px` : undefined}
                    >
                      <img
                        src={imageUrl(img, true)}
                        alt=""
                        loading="lazy"
                        onLoad={(e) => {
                          const el = e.currentTarget;
                          // Measure the full-size file, not the square thumbnail.
                          const probe = new window.Image();
                          probe.onload = () => setDims((d) => ({ ...d, [img]: { w: probe.naturalWidth, h: probe.naturalHeight } }));
                          probe.src = imageUrl(img);
                          void el;
                        }}
                      />
                      {dims[img] && checkFit('product', dims[img].w, dims[img].h) && (
                        <span className="img-warn" aria-label="Wrong size">!</span>
                      )}
                      <button
                        type="button"
                        onClick={() => set('images', form.images.filter((_, x) => x !== i))}
                        aria-label="Remove photo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div
                className={`drop${dragOver ? ' over' : ''}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  uploadFiles(e.dataTransfer.files);
                }}
              >
                {uploading ? (
                  <>
                    <span className="spin" />
                    <span>Uploading…</span>
                  </>
                ) : (
                  <>
                    <Upload size={22} />
                    <span>
                      <b>Click to upload</b> or drag photos here
                    </span>
                    <span style={{ fontSize: 12 }}>
                      {IMAGE_SIZES.product.w} × {IMAGE_SIZES.product.h} px · JPG, PNG or WebP · up to 4 MB each
                    </span>
                  </>
                )}
              </div>

              {form.images.some((img) => dims[img] && checkFit('product', dims[img].w, dims[img].h)) && (
                <p className="imgf-fit warn" style={{ marginTop: 10 }}>
                  <Alert size={14} />
                  <span>
                    Photos marked ! are not {sizeText('product')} square, so they will be cropped on the shop. Hover one to see its size.
                  </span>
                </p>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                hidden
                onChange={(e) => {
                  uploadFiles(e.target.files);
                  e.target.value = '';
                }}
              />

              <div className="add-row" style={{ marginTop: 12 }}>
                <input
                  placeholder="Or type an existing name, e.g. metro-trifold-1"
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    const v = e.target.value.trim();
                    if (v && !form.images.includes(v)) {
                      set('images', [...form.images, v]);
                      e.target.value = '';
                    }
                  }}
                />
              </div>
              <span className="hint" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                Names refer to files already in the site's image folder. Press Enter to add.
              </span>
            </div>
          </div>

          {/* live preview */}
          <div className="a-panel">
            <div className="a-panel-head">
              <h2>Preview</h2>
            </div>
            <div className="a-panel-body">
              <article className="card" style={{ animation: 'none' }}>
                <div className="card-img">
                  {form.badge && <span className="badge">{form.badge}</span>}
                  {form.images[0] ? (
                    <img src={imageUrl(form.images[0], true)} alt="" />
                  ) : (
                    <div
                      style={{
                        display: 'grid',
                        placeItems: 'center',
                        height: '100%',
                        color: 'var(--line-2)',
                      }}
                    >
                      <Image size={30} />
                    </div>
                  )}
                </div>
                <div className="card-b">
                  <span className="card-cat">
                    {categories.find((c) => c.key === form.category)?.name}
                  </span>
                  <h3>{form.name || 'Product name'}</h3>
                  <p className="card-desc" style={{ display: 'block' }}>
                    {form.description || 'Your short description shows here.'}
                  </p>
                  {form.colors.length > 0 && (
                    <div className="swatches">
                      {form.colors.map(([l, h], i) => (
                        <i key={i} className="sw" style={{ background: h }} title={l} />
                      ))}
                    </div>
                  )}
                  <div className="card-foot">
                    <span className="price">
                      {money(Number(form.price) || 0, cur)}
                      {form.compareAt > form.price && <s>{money(Number(form.compareAt), cur)}</s>}
                      <small>Cash on delivery</small>
                    </span>
                    <span className="add">
                      <Plus />
                    </span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>

      </div>

      <div className="form-actions">
        <Link to="/admin/products" className="btn btn-outline">
          Cancel
        </Link>
        <button className="btn btn-primary btn-lg" type="submit" disabled={saving_}>
          {saving ? (
            <>
              <span className="spin" /> Saving…
            </>
          ) : (
            <>
              {isEdit ? 'Save changes' : 'Add product'} <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
