import { useId, useState } from 'react';
import { ArrowUp, ArrowDown, Trash, Plus, ChevronDown, Refresh } from '../ui/Icons';

/**
 * "Before: …  Undo" under a field whose value differs from what is live now.
 * `was` undefined means there is nothing to compare with (a brand-new item).
 */
export function BeforeNote({ was, value, onUndo }) {
  if (was === undefined) return null;
  const a = was ?? '';
  const b = value ?? '';
  if (a === b) return null;
  return (
    <div className="was">
      <span className="was-k">Live now</span>
      <span className="was-v">{a === '' ? <em>empty</em> : String(a)}</span>
      {onUndo && (
        <button type="button" onClick={() => onUndo(was ?? '')} title="Put back what is live now">
          <Refresh size={12} /> Undo
        </button>
      )}
    </div>
  );
}

/** One-line text input with a label. */
export function Field({ label, value, onChange, max = 120, placeholder, hint, full = false, type = 'text', was }) {
  const id = useId();
  const changed = was !== undefined && (was ?? '') !== (value ?? '');
  return (
    <div className={`inp${full ? ' full' : ''}${changed ? ' is-changed' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value ?? ''} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <BeforeNote was={was} value={value} onUndo={onChange} />
      {hint && !changed && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Multi-line text with a label and a live character count. */
export function Area({ label, value, onChange, max = 400, rows = 3, placeholder, hint, full = true, was }) {
  const id = useId();
  const n = (value || '').length;
  const changed = was !== undefined && (was ?? '') !== (value ?? '');
  return (
    <div className={`inp${full ? ' full' : ''}${changed ? ' is-changed' : ''}`}>
      <label htmlFor={id}>
        {label}
        <small className="inp-count">
          {n}/{max}
        </small>
      </label>
      <textarea id={id} rows={rows} value={value ?? ''} maxLength={max} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <BeforeNote was={was} value={value} onUndo={onChange} />
      {hint && !changed && <span className="hint">{hint}</span>}
    </div>
  );
}

/** On/off switch. */
export function Toggle({ on, onChange, label }) {
  return (
    <label className="switch" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <i />
      <span className={on ? 'sw-on' : 'sw-off'}>{label ?? (on ? 'Showing' : 'Hidden')}</span>
    </label>
  );
}

/**
 * A collapsible card for one section of the website. The switch in the
 * header shows or hides the section on the storefront.
 */
export function Card({ title, desc, icon: Icon, enabled, onToggle, defaultOpen = false, badge, changed, isNew, onFocusSection, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const off = enabled === false;
  return (
    <section
      className={`ed-card${open ? ' open' : ''}${off ? ' off' : ''}${changed ? ' changed' : ''}`}
      onFocusCapture={() => onFocusSection?.()}
    >
      <header className="ed-card-head">
        <button
          type="button"
          className="ed-card-toggle"
          onClick={() => {
            setOpen((o) => !o);
            onFocusSection?.();
          }}
          aria-expanded={open}
        >
          {Icon && (
            <i className="ed-ico">
              <Icon size={16} />
            </i>
          )}
          <span className="ed-card-t">
            <strong>
              {title}
              {badge && <em>{badge}</em>}
              {isNew ? <b className="ed-flag new">New</b> : changed ? <b className="ed-flag">Edited</b> : null}
            </strong>
            {desc && <small>{desc}</small>}
          </span>
          <ChevronDown size={16} />
        </button>
        {onToggle && <Toggle on={!off} onChange={onToggle} />}
      </header>
      {open && <div className="ed-card-body">{children}</div>}
    </section>
  );
}

/** Up / down / delete buttons for a list row. */
export function ItemTools({ i, n, onMove, onRemove, label = 'item' }) {
  return (
    <div className="row-act">
      <button type="button" className="mini" onClick={() => onMove(i, -1)} disabled={i === 0} aria-label={`Move ${label} up`}>
        <ArrowUp size={13} />
      </button>
      <button type="button" className="mini" onClick={() => onMove(i, 1)} disabled={i === n - 1} aria-label={`Move ${label} down`}>
        <ArrowDown size={13} />
      </button>
      <button type="button" className="mini danger" onClick={() => onRemove(i)} aria-label={`Delete ${label}`}>
        <Trash size={13} />
      </button>
    </div>
  );
}

/**
 * Editable list of two-field rows: promises, questions, points.
 * `fields` is [[key, label, maxLength, multiline?], [key, label, max, multiline?]].
 */
export function PairList({ items = [], onChange, fields, max = 10, addLabel = 'Add', itemLabel = 'Item', was }) {
  const [a, b] = fields;
  const set = (i, key, v) => onChange(items.map((it, x) => (x === i ? { ...it, [key]: v } : it)));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const remove = (i) => onChange(items.filter((_, x) => x !== i));

  return (
    <div className="pair-list">
      {items.map((it, i) => {
        const before = Array.isArray(was) ? was[i] : undefined;
        const isNew = Array.isArray(was) && !before;
        const edited = before && ((before[a[0]] ?? '') !== (it[a[0]] ?? '') || (before[b[0]] ?? '') !== (it[b[0]] ?? ''));
        return (
        <div className={`pair${isNew ? ' is-new' : edited ? ' is-changed' : ''}`} key={i}>
          <span className="pair-n">{i + 1}</span>
          <div className="pair-f">
            <input value={it[a[0]] ?? ''} maxLength={a[2]} placeholder={a[1]} aria-label={`${itemLabel} ${i + 1} ${a[1]}`} onChange={(e) => set(i, a[0], e.target.value)} />
            {b[3] ? (
              <textarea rows={2} value={it[b[0]] ?? ''} maxLength={b[2]} placeholder={b[1]} aria-label={`${itemLabel} ${i + 1} ${b[1]}`} onChange={(e) => set(i, b[0], e.target.value)} />
            ) : (
              <input value={it[b[0]] ?? ''} maxLength={b[2]} placeholder={b[1]} aria-label={`${itemLabel} ${i + 1} ${b[1]}`} onChange={(e) => set(i, b[0], e.target.value)} />
            )}
            {isNew && <span className="was was-new">New, not live yet</span>}
            {edited && (
              <div className="was">
                <span className="was-k">Live now</span>
                <span className="was-v">
                  {before[a[0]] || <em>empty</em>}
                  {before[b[0]] ? ` — ${before[b[0]]}` : ''}
                </span>
                <button type="button" onClick={() => onChange(items.map((x, j) => (j === i ? { ...before } : x)))}>
                  <Refresh size={12} /> Undo
                </button>
              </div>
            )}
          </div>
          <ItemTools i={i} n={items.length} onMove={move} onRemove={remove} label={`${itemLabel.toLowerCase()} ${i + 1}`} />
        </div>
        );
      })}
      {Array.isArray(was) && was.length > items.length && (
        <p className="was was-gone">
          {was.length - items.length} removed, still live until you save.{' '}
          <button type="button" onClick={() => onChange(was.map((x) => ({ ...x })))}>
            <Refresh size={12} /> Undo all
          </button>
        </p>
      )}
      {items.length < max && (
        <button type="button" className="btn btn-outline btn-sm" onClick={() => onChange([...items, { [a[0]]: '', [b[0]]: '' }])}>
          <Plus size={14} /> {addLabel}
        </button>
      )}
    </div>
  );
}

/** Small reminder of the tokens that can be typed into any text. */
export function TokenTip() {
  return (
    <p className="token-tip">
      Tip: type <code>{'{freeDelivery}'}</code> <code>{'{deliveryFee}'}</code> <code>{'{returnDays}'}</code>{' '}
      <code>{'{phone}'}</code> or <code>{'{storeName}'}</code> anywhere and the value from Settings is filled in, so it stays
      right when you change it there.
    </p>
  );
}
