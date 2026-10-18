import { imageUrl } from '../../lib/format';
import { X, Check, ArrowRight } from '../ui/Icons';

const short = (v) => {
  const s = String(v ?? '');
  return s.length > 140 ? `${s.slice(0, 140)}…` : s;
};

function Value({ v, image }) {
  if (v === '' || v == null) return <em className="rc-empty">empty</em>;
  if (image) return <img src={imageUrl(v)} alt="" className="rc-img" />;
  return <span>{short(v)}</span>;
}

/**
 * Shown when the owner presses Publish: every change, live version on the
 * left, new version on the right, so nothing goes live by surprise.
 */
export default function ReviewChanges({ changes, onClose, onPublish, busy }) {
  return (
    <div className="confirm" role="dialog" aria-modal="true" aria-labelledby="rc-t">
      <div className="confirm-box rc">
        <header className="rc-head">
          <div>
            <h3 id="rc-t">Review your changes</h3>
            <p>
              {changes.length} change{changes.length === 1 ? '' : 's'}. Nothing is live until you press Publish.
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="rc-cols" aria-hidden="true">
          <span>What</span>
          <span>Live now</span>
          <span />
          <span>After publishing</span>
        </div>
        <ol className="rc-list">
          {changes.map((c, i) => (
            <li key={i} className={`rc-row rc-${c.kind}`}>
              <strong>
                {c.label}
                {c.kind !== 'changed' && <b>{c.kind === 'added' ? 'Added' : 'Removed'}</b>}
              </strong>
              <div className="rc-before">
                <Value v={c.before} image={c.image} />
              </div>
              <ArrowRight size={14} />
              <div className="rc-after">
                <Value v={c.after} image={c.image} />
              </div>
            </li>
          ))}
        </ol>

        <div className="confirm-act rc-act">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Keep editing
          </button>
          <button type="button" className="btn btn-primary" onClick={onPublish} disabled={busy}>
            {busy ? <span className="spin" /> : <Check size={15} />} Publish {changes.length} change{changes.length === 1 ? '' : 's'}
          </button>
        </div>
      </div>
    </div>
  );
}
