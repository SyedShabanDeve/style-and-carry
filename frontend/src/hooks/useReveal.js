import { useEffect, useRef } from 'react';

/**
 * Scroll-reveal for the whole storefront.
 *
 * Any element with the class `rv` fades and rises into place the first time
 * it scrolls into view. Mounted once in the store layout: a MutationObserver
 * picks up sections that appear later (after the catalogue loads, or on the
 * next page), so pages do not need to wire anything up themselves.
 *
 * Progressive by design: the CSS only hides `.rv` under `html.js-reveal`,
 * which is added once the observer is confirmed to work, and a timer shows
 * anything still hidden, so a failure can never leave a blank page.
 */
export function useGlobalReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !('IntersectionObserver' in window)) return undefined;

    document.documentElement.classList.add('js-reveal');

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      },
      { threshold: 0.08, rootMargin: '0px 0px -40px' }
    );

    const timers = new Set();
    // Per run, so a re-run (React strict mode, hot reload) watches everything again.
    const seen = new WeakSet();
    const watch = (scope) => {
      const nodes = [];
      if (scope.nodeType === 1) {
        if (scope.classList.contains('rv')) nodes.push(scope);
        nodes.push(...scope.querySelectorAll('.rv'));
      }
      const fresh = nodes.filter((n) => !n.classList.contains('in') && !seen.has(n));
      fresh.forEach((n) => {
        seen.add(n);
        io.observe(n);
      });
      if (fresh.length) {
        // Safety net: never leave content hidden.
        const t = setTimeout(() => {
          // Only what should already be visible; the rest still waits to scroll in.
          fresh.forEach((n) => n.getBoundingClientRect().top < window.innerHeight && n.classList.add('in'));
          timers.delete(t);
        }, 3000);
        timers.add(t);
      }
    };

    watch(root);
    const mo = new MutationObserver((muts) => {
      for (const m of muts) m.addedNodes.forEach(watch);
    });
    mo.observe(root, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [rootRef]);
}

/** Kept for pages that still call it; the layout-level observer does the work. */
export default function useReveal() {
  return useRef(null);
}
