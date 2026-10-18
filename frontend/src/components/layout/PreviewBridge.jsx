import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import { setPreview } from '../../store/contentSlice';

/** True when this page runs inside the dashboard's live-preview frame. */
export const inPreviewFrame = () => {
  try {
    if (window.self === window.top) return false;
    const url = new URLSearchParams(window.location.search);
    if (url.has('sc-preview')) sessionStorage.setItem('sc_preview', '1');
    return sessionStorage.getItem('sc_preview') === '1';
  } catch {
    return false;
  }
};

/**
 * Talks to the dashboard when the shop is shown inside its preview frame.
 *
 * The dashboard posts the unsaved draft, which view to show ("before" is the
 * live site, "after" is the draft), the page to open and the section being
 * edited. This scrolls to that section and outlines it briefly. Messages from
 * any other origin are ignored.
 */
export default function PreviewBridge() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!inPreviewFrame()) return undefined;
    document.documentElement.classList.add('is-preview');

    const onMessage = (e) => {
      if (e.origin !== window.location.origin) return;
      const m = e.data;
      if (!m || m.type !== 'sc-preview') return;

      dispatch(setPreview({ draft: m.draft ?? null, mode: m.mode || 'after' }));

      if (m.route && m.route !== window.location.pathname) {
        navigate(m.route);
      }
      if (m.section) {
        // Wait a frame so a route change or re-render has painted.
        setTimeout(() => {
          const el = m.section === 'footer' ? document.querySelector('footer') : document.querySelector(`[data-section="${m.section}"]`);
          if (!el) return;
          el.scrollIntoView({ behavior: 'smooth', block: m.section === 'footer' ? 'end' : 'start' });
          el.classList.remove('pv-flash');
          void el.offsetWidth;
          el.classList.add('pv-flash');
        }, m.route && m.route !== window.location.pathname ? 450 : 60);
      }
    };

    window.addEventListener('message', onMessage);
    window.parent.postMessage({ type: 'sc-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, [dispatch, navigate]);

  /* Tell the dashboard where the frame is, so it can follow clicks inside. */
  useEffect(() => {
    if (!inPreviewFrame()) return;
    window.parent.postMessage({ type: 'sc-preview-route', route: location.pathname }, window.location.origin);
  }, [location.pathname]);

  return null;
}
