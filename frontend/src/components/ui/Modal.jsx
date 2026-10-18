import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from './Icons';

let openCount = 0;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal: portals to <body>, locks page scroll, closes on Escape or
 * a click on the backdrop, keeps Tab inside, and returns focus on close.
 *
 * variant: "center" (dialog) | "right" / "left" (side sheets) | "top" (search)
 */
export default function Modal({
  open,
  onClose,
  label,
  variant = 'center',
  size = 'md',
  className = '',
  showClose = true,
  children,
}) {
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    openCount += 1;
    document.body.classList.add('locked');

    const onKey = (e) => {
      if (e.key === 'Escape') {
        closeRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const f = panelRef.current.querySelectorAll(FOCUSABLE);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);

    // Focus the marked field if there is one, otherwise the panel itself.
    const t = setTimeout(() => {
      const target = panelRef.current?.querySelector('[data-autofocus]') || panelRef.current;
      target?.focus({ preventScroll: true });
    }, 30);

    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      openCount = Math.max(0, openCount - 1);
      if (!openCount) document.body.classList.remove('locked');
      if (previous && document.contains(previous)) previous.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div className={`modal modal-${variant}`} role="dialog" aria-modal="true" aria-label={label}>
      <div className="modal-bg" onClick={onClose} />
      <div className={`modal-panel size-${size} ${className}`.trim()} ref={panelRef} tabIndex={-1}>
        {showClose && (
          <button className="icon-btn modal-x" onClick={onClose} aria-label="Close">
            <X />
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
