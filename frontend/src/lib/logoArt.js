import { useEffect, useState } from 'react';
import { imageUrl } from './format';

/**
 * Makes an uploaded logo look good wherever it is shown.
 *
 * Logos often arrive with a lot of empty background around the mark (a
 * 1024 × 304 image whose emblem fills the middle third), which leaves the
 * mark tiny at header size. This trims that background away in the browser,
 * so nothing has to be re-uploaded, and also reports:
 *   - tone: 'light' or 'dark' artwork, so a transparent logo can sit on a
 *     plate that contrasts with it (a light logo vanishes on a light page),
 *   - opaque: whether the logo brings its own background,
 *   - icon: a square version for the browser tab (favicon).
 *
 * Results are cached per image, so this runs once per page load.
 */

const cache = new Map();

function load(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

const median = (arr) => {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] || 0;
};

async function analyse(url) {
  const img = await load(url);
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  if (!W || !H) throw new Error('empty image');

  // Work on a small copy: enough to find edges, and fast.
  const scale = Math.min(1, 400 / Math.max(W, H));
  const w = Math.max(1, Math.round(W * scale));
  const h = Math.max(1, Math.round(H * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const at = (x, y) => (y * w + x) * 4;

  // The background is whatever the border of the image mostly is.
  const border = { r: [], g: [], b: [], a: [] };
  const sample = (x, y) => {
    const i = at(x, y);
    border.r.push(px[i]);
    border.g.push(px[i + 1]);
    border.b.push(px[i + 2]);
    border.a.push(px[i + 3]);
  };
  for (let x = 0; x < w; x++) {
    sample(x, 0);
    sample(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    sample(0, y);
    sample(w - 1, y);
  }
  const transparent = median(border.a) < 40;
  const bg = { r: median(border.r), g: median(border.g), b: median(border.b) };

  // Which pixels are artwork rather than background.
  const isArt = (i) => {
    if (px[i + 3] < 40) return false;
    if (transparent) return true;
    const d = Math.max(Math.abs(px[i] - bg.r), Math.abs(px[i + 1] - bg.g), Math.abs(px[i + 2] - bg.b));
    return d > 52;
  };

  const cols = new Array(w).fill(0);
  const rows = new Array(h).fill(0);
  let lum = 0;
  let n = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = at(x, y);
      if (!isArt(i)) continue;
      cols[x]++;
      rows[y]++;
      lum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
      n++;
    }
  }
  if (!n) throw new Error('no artwork found');

  // Ignore specks of texture: a column or row needs a few art pixels.
  const minCol = Math.max(1, Math.round(h * 0.01));
  const minRow = Math.max(1, Math.round(w * 0.004));
  let x0 = cols.findIndex((v) => v >= minCol);
  let x1 = w - 1 - [...cols].reverse().findIndex((v) => v >= minCol);
  let y0 = rows.findIndex((v) => v >= minRow);
  let y1 = h - 1 - [...rows].reverse().findIndex((v) => v >= minRow);
  if (x0 < 0 || y0 < 0 || x1 <= x0 || y1 <= y0) {
    x0 = 0;
    y0 = 0;
    x1 = w - 1;
    y1 = h - 1;
  }

  // A little breathing room around the mark, then crop the full-size image.
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.07);
  const sx = Math.max(0, x0 - pad) / scale;
  const sy = Math.max(0, y0 - pad) / scale;
  const sw = Math.min(W, (x1 + pad + 1) / scale) - sx;
  const sh = Math.min(H, (y1 + pad + 1) / scale) - sy;

  const outH = Math.min(240, Math.round(sh));
  const outW = Math.round((sw / sh) * outH);
  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  out.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

  const tone = lum / n > 140 ? 'light' : 'dark';
  const plate = transparent
    ? tone === 'light'
      ? '#16130f'
      : '#ffffff'
    : `rgb(${bg.r}, ${bg.g}, ${bg.b})`;

  /* Square icon for the browser tab. At 16–32 px a full logo with its name
     underneath turns into a smudge, so when the artwork is stacked (a mark
     above, words below, with a gap between) the icon uses the tallest of
     those bands: the mark itself. */
  const bands = [];
  const gapAllowed = Math.max(1, Math.round(h * 0.015));
  let start = -1;
  let lastArt = -1;
  for (let y = y0; y <= y1; y++) {
    if (rows[y] >= minRow) {
      if (start < 0) start = y;
      lastArt = y;
    } else if (start >= 0 && y - lastArt > gapAllowed) {
      bands.push([start, lastArt]);
      start = -1;
    }
  }
  if (start >= 0) bands.push([start, lastArt]);
  let iy0 = y0;
  let iy1 = y1;
  let ix0 = x0;
  let ix1 = x1;
  if (bands.length > 1) {
    const [b0, b1] = bands.reduce((a, b) => (b[1] - b[0] > a[1] - a[0] ? b : a));
    if (b1 - b0 >= (y1 - y0) * 0.4) {
      iy0 = b0;
      iy1 = b1;
      // Narrow to the columns that hold art within that band.
      const bc = new Array(w).fill(0);
      for (let y = b0; y <= b1; y++) for (let x = 0; x < w; x++) if (isArt(at(x, y))) bc[x]++;
      const need = Math.max(1, Math.round((b1 - b0) * 0.02));
      const l = bc.findIndex((v) => v >= need);
      const r = w - 1 - [...bc].reverse().findIndex((v) => v >= need);
      if (l >= 0 && r > l) {
        ix0 = l;
        ix1 = r;
      }
      // A very wide mark (a crest with wings) keeps its centre, which is
      // what still reads at 16 px.
      const bw = ix1 - ix0;
      const bh = iy1 - iy0;
      if (bw > bh * 1.8) {
        const keep = Math.round(bh * 1.3);
        const mid = Math.round((ix0 + ix1) / 2);
        ix0 = mid - Math.round(keep / 2);
        ix1 = ix0 + keep;
      }
    }
  }
  const S = 128;
  const ic = document.createElement('canvas');
  ic.width = S;
  ic.height = S;
  const ix = ic.getContext('2d');
  ix.fillStyle = plate;
  ix.beginPath();
  if (ix.roundRect) ix.roundRect(0, 0, S, S, 26);
  else ix.rect(0, 0, S, S);
  ix.fill();
  const isx = ix0 / scale;
  const isy = iy0 / scale;
  const isw = (ix1 - ix0 + 1) / scale;
  const ish = (iy1 - iy0 + 1) / scale;
  const room = S * 0.84;
  const k = Math.min(room / isw, room / ish);
  ix.drawImage(img, isx, isy, isw, ish, (S - isw * k) / 2, (S - ish * k) / 2, isw * k, ish * k);

  return {
    src: out.toDataURL('image/png'),
    ratio: outW / outH,
    tone,
    opaque: !transparent,
    plate,
    icon: ic.toDataURL('image/png'),
  };
}

/** Trimmed logo details for a logo path from settings, or null while working. */
export function useLogoArt(logo) {
  const url = logo ? imageUrl(logo) : '';
  const [art, setArt] = useState(() => (url && cache.get(url)?.value) || null);

  useEffect(() => {
    if (!url) {
      setArt(null);
      return undefined;
    }
    let live = true;
    let entry = cache.get(url);
    if (!entry) {
      entry = { promise: analyse(url).catch(() => null) };
      entry.promise.then((v) => {
        entry.value = v;
      });
      cache.set(url, entry);
    }
    entry.promise.then((v) => {
      if (live) setArt(v);
    });
    return () => {
      live = false;
    };
  }, [url]);

  return art;
}

/** Points the browser tab icon at the store's logo (or back to the default). */
export function setFavicon(href) {
  const target = href || '/favicon.png';
  for (const rel of ['icon', 'apple-touch-icon']) {
    let link = document.querySelector(`link[rel="${rel}"]`);
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      document.head.appendChild(link);
    }
    if (link.getAttribute('href') !== target) {
      link.setAttribute('href', target);
      if (rel === 'icon') link.setAttribute('type', 'image/png');
    }
  }
}
