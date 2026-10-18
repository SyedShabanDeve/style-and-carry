import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { imageUrl } from '../../lib/format';
import { ChevronLeft, ChevronRight, Pause, Play } from '../ui/Icons';

const DELAY = 6500;

/** Internal links use the router; anything else opens as a normal link. */
function Cta({ to, children }) {
  if (!to) return null;
  if (/^https?:\/\//.test(to)) {
    return (
      <a className="btn hs-cta" href={to} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link className="btn hs-cta" to={to}>
      {children}
    </Link>
  );
}

/**
 * Full-width hero carousel, fed by Dashboard -> Homepage -> Hero slides.
 *
 * Crossfades with a slow zoom, staggers the text in on each slide, swipes on
 * touch screens, and pauses on hover, on keyboard focus, when the tab is in
 * the background, or when the visitor presses pause.
 */
export default function HeroSlider({ slides }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hidden, setHidden] = useState(false);
  const touch = useRef(null);
  const root = useRef(null);

  /* The picture drifts a little slower than the page, for depth. */
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, el.offsetHeight);
        el.style.setProperty('--hs-shift', `${y * 0.28}px`);
        el.style.setProperty('--hs-fade', `${1 - Math.min(0.6, y / el.offsetHeight)}`);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);
  const count = slides.length;
  const running = count > 1 && !paused && !hovering && !hidden;

  const go = useCallback((n) => setIndex((i) => (((typeof n === 'function' ? n(i) : n) % count) + count) % count), [count]);
  const next = useCallback(() => go((i) => i + 1), [go]);
  const prev = useCallback(() => go((i) => i - 1), [go]);

  useEffect(() => {
    if (index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(next, DELAY);
    return () => clearTimeout(t);
  }, [running, index, next]);

  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  /* Respect a reduced-motion preference: no automatic movement. */
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) setPaused(true);
  }, []);

  if (!count) return null;

  const onTouchStart = (e) => {
    touch.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e) => {
    if (touch.current == null) return;
    const dx = e.changedTouches[0].clientX - touch.current;
    touch.current = null;
    if (Math.abs(dx) > 45) (dx < 0 ? next : prev)();
  };

  return (
    <section
      className="hs"
      ref={root}
      data-section="hero"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setHovering(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
      }}
    >
      <div className="hs-track">
        {slides.map((s, i) => {
          const on = i === index;
          // Load the current, next and previous slides; the rest wait.
          const near = on || i === (index + 1) % count || i === (index - 1 + count) % count;
          return (
            <div
              key={s.id || i}
              className={`hs-slide${on ? ' is-active' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!on}
            >
              <picture className="hs-media">
                {s.mobileImage && <source media="(max-width: 640px)" srcSet={imageUrl(s.mobileImage)} />}
                {near && (
                  <img
                    src={imageUrl(s.image)}
                    alt=""
                    width="1920"
                    height="800"
                    loading="eager"
                    {...(i === 0 ? { fetchpriority: 'high' } : {})}
                    decoding="async"
                  />
                )}
              </picture>
              <div className="hs-shade" />

              <div className="wrap hs-copy">
                {s.eyebrow && <span className="hs-eyebrow hs-a">{s.eyebrow}</span>}
                {s.title && (i === 0 ? <h1 className="hs-title hs-a">{s.title}</h1> : <h2 className="hs-title hs-a">{s.title}</h2>)}
                {s.text && <p className="hs-text hs-a">{s.text}</p>}
                {s.ctaLabel && s.ctaLink && (
                  <div className="hs-a">
                    <Cta to={s.ctaLink}>{s.ctaLabel}</Cta>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="hs-ui">
          <div className="wrap hs-ui-in">
            <div className="hs-dots" role="tablist" aria-label="Choose a slide">
              {slides.map((s, i) => (
                <button
                  key={s.id || i}
                  type="button"
                  role="tab"
                  aria-selected={i === index}
                  aria-label={`Show slide ${i + 1}${s.title ? `: ${s.title}` : ''}`}
                  className={`hs-dot${i === index ? ' on' : ''}`}
                  onClick={() => go(i)}
                >
                  <i
                    style={{ animationDuration: `${DELAY}ms`, animationPlayState: running ? 'running' : 'paused' }}
                    key={i === index ? `on-${index}` : 'off'}
                  />
                </button>
              ))}
            </div>
            <div className="hs-arrows">
              <button type="button" className="hs-btn" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>
              <button type="button" className="hs-btn" onClick={prev} aria-label="Previous slide">
                <ChevronLeft size={18} />
              </button>
              <button type="button" className="hs-btn" onClick={next} aria-label="Next slide">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
