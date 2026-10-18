import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';

import { sessionExpired, refreshSession } from '../../store/authSlice';
import { pushToast } from '../../store/uiSlice';
import { clock } from '../../lib/format';
import { Clock, Alert, Refresh, LogOut } from '../ui/Icons';

/** Below this many seconds the countdown turns amber. */
const WARN_AT = 120;
/** Below this, it turns red and the "still there?" dialog appears. */
const DANGER_AT = 60;

/**
 * Counts an admin session down to zero and signs the owner out when it ends.
 *
 * The expiry time comes from the server (the token's own `exp`), so the clock
 * here is only a display: even if someone edits it, the API still refuses a
 * token past its expiry.
 */
export default function SessionTimer({ onLogout }) {
  const expiresAt = useSelector((s) => s.auth.expiresAt);
  const sessionSeconds = useSelector((s) => s.auth.sessionSeconds);
  const dispatch = useDispatch();
  const [left, setLeft] = useState(() => Math.max(0, (expiresAt || 0) - Date.now()));
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const remaining = Math.max(0, expiresAt - Date.now());
      setLeft(remaining);
      if (remaining === 0) dispatch(sessionExpired());
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, dispatch]);

  const extend = useCallback(async () => {
    setExtending(true);
    const result = await dispatch(refreshSession());
    setExtending(false);
    if (refreshSession.fulfilled.match(result)) {
      dispatch(pushToast({ message: 'Session extended', kind: 'ok' }));
    }
  }, [dispatch]);

  if (!expiresAt) return null;

  const secs = Math.floor(left / 1000);
  const total = (sessionSeconds || 600) * 1000; // full window, for the bar
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const minutes = Math.round((sessionSeconds || 600) / 60);
  const level = secs <= DANGER_AT ? 'danger' : secs <= WARN_AT ? 'warn' : '';

  return (
    <>
      <div className="timer-bar">
        <i className={level} style={{ width: `${pct}%` }} />
      </div>

      <div className={`timer ${level}`} title="Your sign-in expires when this reaches zero">
        {level === 'danger' ? <Alert size={15} /> : <Clock size={15} />}
        <span>Session</span>
        <b>{clock(left)}</b>
      </div>

      <button
        className="btn btn-outline btn-sm btn-block"
        onClick={extend}
        disabled={extending}
        style={{ marginBottom: 8 }}
      >
        {extending ? <span className="spin" /> : <Refresh size={14} />}
        Extend {minutes} min
      </button>

      {/*
        Last-minute warning, so nobody loses a half-typed product.
        It goes through a portal because the sidebar is `position: sticky`,
        which creates a stacking context that a fixed child cannot escape —
        without this the dashboard's chart paints over the dialog.
      */}
      {secs > 0 &&
        secs <= DANGER_AT &&
        createPortal(
          <div className="expiry-modal" role="alertdialog" aria-modal="true">
          <div className="expiry-box">
            <div className="ring">
              <Clock size={32} />
            </div>
            <h3>Still there?</h3>
            <p>Your sign-in is about to expire. Anything unsaved will be lost.</p>
            <div className="expiry-count">{clock(left)}</div>
            <div className="expiry-act">
              <button className="btn btn-primary btn-lg" onClick={extend} disabled={extending}>
                {extending ? (
                  <>
                    <span className="spin" /> Extending…
                  </>
                ) : (
                  <>
                    <Refresh size={16} /> Stay signed in
                  </>
                )}
              </button>
              <button className="btn btn-outline" onClick={onLogout}>
                <LogOut size={15} /> Sign out now
              </button>
            </div>
          </div>
          </div>,
          document.body
        )}
    </>
  );
}
