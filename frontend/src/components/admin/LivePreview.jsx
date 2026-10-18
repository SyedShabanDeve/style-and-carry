import { useEffect, useRef, useState } from 'react';
import { Eye, Refresh } from '../ui/Icons';

const DEVICES = {
  desktop: { w: 1280, label: 'Desktop' },
  phone: { w: 390, label: 'Phone' },
};

/**
 * The shop, running inside the dashboard, showing the unsaved draft.
 *
 * "Live now" shows exactly what customers see today; "Your changes" shows the
 * draft. The frame follows whichever section is being edited, and scales the
 * real page down to fit the panel.
 */
export default function LivePreview({ draft, route = '/', section, mode, onMode, dirty }) {
  const frame = useRef(null);
  const box = useRef(null);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState('desktop');
  const [size, setSize] = useState({ w: 400, h: 600 });
  const [key, setKey] = useState(0);

  /* Fit the frame to the panel. */
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* The frame says hello once the shop has loaded. */
  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      if (e.data?.type === 'sc-preview-ready') setReady(true);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  /* Send the draft whenever it, the view, the page or the section changes. */
  useEffect(() => {
    if (!ready) return undefined;
    const t = setTimeout(() => {
      frame.current?.contentWindow?.postMessage({ type: 'sc-preview', draft, mode, route, section }, window.location.origin);
    }, 120);
    return () => clearTimeout(t);
  }, [ready, draft, mode, route, section]);

  const dev = DEVICES[device];
  const scale = Math.min(1, size.w / dev.w);
  const frameH = scale ? size.h / scale : size.h;

  return (
    <aside className="pv" aria-label="Live preview">
      <div className="pv-bar">
        <div className="pv-seg" role="group" aria-label="Which version to show">
          <button type="button" className={mode === 'before' ? 'on' : undefined} onClick={() => onMode('before')}>
            Live now
          </button>
          <button type="button" className={mode !== 'before' ? 'on' : undefined} onClick={() => onMode('after')}>
            Your changes {dirty && <i className="pv-dot" />}
          </button>
        </div>
        <div className="pv-seg pv-dev" role="group" aria-label="Screen size">
          {Object.entries(DEVICES).map(([k, d]) => (
            <button key={k} type="button" className={device === k ? 'on' : undefined} onClick={() => setDevice(k)}>
              {d.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mini"
          title="Reload preview"
          aria-label="Reload preview"
          onClick={() => {
            setReady(false);
            setKey((k) => k + 1);
          }}
        >
          <Refresh size={13} />
        </button>
      </div>

      <p className={`pv-note${mode === 'before' ? ' before' : ''}`}>
        {mode === 'before'
          ? 'This is your website as customers see it right now.'
          : dirty
            ? 'Preview of your changes. Customers will see this after you publish.'
            : 'No changes yet. Edit something on the left to see it here.'}
      </p>

      <div className="pv-box" ref={box}>
        <div className="pv-stage" style={{ width: dev.w * scale, height: size.h }}>
          <iframe
            key={key}
            ref={frame}
            title="Website preview"
            src={`${route}?sc-preview=1`}
            style={{ width: dev.w, height: frameH, transform: `scale(${scale})` }}
            onLoad={() => {
              // If the shop was already loaded, it will not say hello again.
              setTimeout(() => setReady(true), 600);
            }}
          />
          {!ready && (
            <span className="pv-loading">
              <span className="spin" /> Loading preview…
            </span>
          )}
        </div>
      </div>

      <a className="pv-open" href={route} target="_blank" rel="noopener noreferrer">
        <Eye size={13} /> Open the live page in a new tab
      </a>
    </aside>
  );
}
