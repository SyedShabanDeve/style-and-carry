import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { dismissToast, openCart } from '../../store/uiSlice';
import { CheckCircle, Alert, Info, X } from './Icons';

const ICON = { ok: CheckCircle, bad: Alert, warn: Alert, info: Info };
const DEFAULT_TITLE = { ok: 'Done', bad: 'Something went wrong', warn: 'Please check', info: 'Notice' };

/**
 * One notification. With a title it reads "Title / message"; with only a
 * message, the message becomes the title. Pauses while hovered or focused.
 */
function Toast({ toast }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const Icon = ICON[toast.kind] || Info;
  const [paused, setPaused] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const left = useRef(toast.ms);
  const started = useRef(Date.now());

  const close = () => {
    setLeaving(true);
    setTimeout(() => dispatch(dismissToast(toast.id)), 220);
  };

  useEffect(() => {
    if (paused) return undefined;
    started.current = Date.now();
    const t = setTimeout(close, left.current);
    return () => {
      clearTimeout(t);
      left.current -= Date.now() - started.current;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paused]);

  const title = toast.title || toast.message || DEFAULT_TITLE[toast.kind];
  const body = toast.title ? toast.message : '';

  const act = () => {
    if (toast.action?.cart) dispatch(openCart());
    else if (toast.action?.to) navigate(toast.action.to);
    close();
  };

  return (
    <div
      className={`toast t-${toast.kind}${leaving ? ' leaving' : ''}`}
      role={toast.kind === 'bad' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span className="toast-ico">
        <Icon size={18} />
      </span>
      <div className="toast-b">
        <strong>{title}</strong>
        {body && <p>{body}</p>}
        {toast.action && (
          <button type="button" className="toast-act" onClick={act}>
            {toast.action.label}
          </button>
        )}
      </div>
      <button type="button" className="toast-x" onClick={close} aria-label="Dismiss notification">
        <X size={15} />
      </button>
      <i
        className="toast-bar"
        style={{ animationDuration: `${toast.ms}ms`, animationPlayState: paused ? 'paused' : 'running' }}
        aria-hidden="true"
      />
    </div>
  );
}

export default function Toasts() {
  const toasts = useSelector((s) => s.ui.toasts);
  if (!toasts.length) return null;

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} />
      ))}
    </div>
  );
}
