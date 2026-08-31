/* ============================================================
   FOLD&CARRY — storefront logic
   ------------------------------------------------------------
   EDIT PRICES AND CONTACT DETAILS IN THE `CONFIG` AND `PRODUCTS`
   OBJECTS BELOW. Nothing else needs touching.

   >>> IMPORTANT <<<
   The `price` values are PLACEHOLDERS chosen from typical
   Pakistani market rates for imported PU wallets. They are NOT
   your real prices. Replace every one before sharing the site.
   ============================================================ */

const CONFIG = {
  phone: '923079415512',            // WhatsApp, international format, no +
  phoneDisplay: '0307 9415512',
  email: 'syedshaban330@gmail.com',
  tiktok: 'https://www.tiktok.com/@foldandcarry1',
  freeDeliveryOver: 2500,           // Rs
  currency: 'Rs'
};

/* Colour swatch hexes are approximations of the actual stock colours. */
const PRODUCTS = [
  {
    slug: 'metro-trifold',
    name: 'Metro Trifold',
    cat: 'trifold',
    badge: 'Bestseller',
    price: 1490,
    imgs: ['metro-trifold-1', 'metro-trifold-4', 'metro-trifold-3', 'metro-trifold-2'],
    desc: 'Compact trifold with a steel snap closure. Opens flat, stays slim in the back pocket.',
    colors: [['Tan', '#a9713f'], ['Dark Brown', '#5b3b28'], ['Black', '#1b1b1b'], ['Olive', '#4a4429']],
    specs: ['Snap close', '6 card slots', 'Coin pocket'],
    feats: [
      'Steel press-stud closure — holds shut even when full',
      '6 card slots, 2 note compartments, zipped coin pocket',
      'Soft PU leather with contrast stitching',
      'Approx. 11 x 9 x 2.5 cm folded',
      'Available in 4 colours'
    ]
  },
  {
    slug: 'voyager-long',
    name: 'Voyager Long Zip',
    cat: 'long',
    badge: 'Big capacity',
    price: 1690,
    imgs: ['voyager-long-3', 'voyager-long-1', 'voyager-long-2'],
    desc: 'Full-length zip clutch with a detachable wrist strap. Fits notes flat — no folding.',
    colors: [['Brown', '#4a352a'], ['Black', '#17171a']],
    specs: ['Zip close', '12+ card slots', 'Wrist strap'],
    feats: [
      'Long zip closure — nothing falls out',
      '12 card slots, 2 full-length note sleeves, SIM pockets',
      'Detachable leather wrist strap included',
      'Approx. 19.5 x 10 x 3.5 cm',
      'Textured PU leather with metal corner trim'
    ]
  },
  {
    slug: 'executive-long',
    name: 'Executive Long Wallet',
    cat: 'long',
    badge: null,
    price: 1590,
    imgs: ['executive-long-1'],
    desc: 'Slim long-fold for those who carry more cards than cash. Slips into a jacket pocket.',
    colors: [['Brown', '#5b4034'], ['Black', '#1a1a1c']],
    specs: ['Bi-fold long', 'Card-heavy', 'Wrist strap'],
    feats: [
      'Slim long-fold profile — thinner than a zip clutch',
      'Deep card column plus full-length note sleeve',
      'Detachable wrist strap',
      'Cross-hatch textured PU leather',
      'Approx. 18.5 x 9.5 x 2 cm'
    ]
  },
  {
    slug: 'safari-trifold',
    name: 'Safari Trifold',
    cat: 'trifold',
    badge: null,
    price: 1390,
    imgs: ['safari-trifold-1'],
    desc: 'Two-tone trifold with a croc-textured side panel. Snap closure, generous card space.',
    colors: [['Dark Brown', '#4e3a2e'], ['Tan', '#a56b3c'], ['Navy', '#2c3340']],
    specs: ['Snap close', 'Croc panel', '3 colours'],
    feats: [
      'Contrast croc-embossed panel on the front',
      'Press-stud closure keeps the fold tight',
      'Multi-layer card slots with centre note sleeve',
      'Approx. 11.5 x 9.5 x 3 cm folded',
      'Available in 3 colours'
    ]
  },
  {
    slug: 'heritage-trifold',
    name: 'Heritage Trifold',
    cat: 'trifold',
    badge: null,
    price: 1390,
    imgs: ['heritage-trifold-1'],
    desc: 'Clean trifold with a tan leather header tab. Deep fold, holds a thick stack of notes.',
    colors: [['Tan', '#a3653a'], ['Navy', '#2b3242'], ['Brown', '#5d4436']],
    specs: ['Snap close', 'Deep fold', '3 colours'],
    feats: [
      'Contrast tan header tab across the top',
      'Extra-deep fold — takes a full stack of notes',
      'Press-stud closure',
      'Smooth matte PU leather, tan contrast stitch',
      'Available in 3 colours'
    ]
  },
  {
    slug: 'crest-bifold',
    name: 'Crest Bifold',
    cat: 'bifold',
    badge: null,
    price: 1290,
    imgs: ['crest-bifold-1'],
    desc: 'Bifold with a croc-textured crest patch and a red woven tag. Everyday size.',
    colors: [['Navy', '#2a3140'], ['Tan', '#a5683a'], ['Brown', '#54423a']],
    specs: ['Snap close', 'Croc patch', '3 colours'],
    feats: [
      'Croc-embossed crest patch with red woven tag',
      'Snap-stud closure on the fold',
      'Card slots on both wings plus note sleeve',
      'Approx. 11.5 x 9.5 cm folded',
      'Available in 3 colours'
    ]
  },
  {
    slug: 'pillar-bifold',
    name: 'Pillar Bifold',
    cat: 'bifold',
    badge: null,
    price: 1290,
    imgs: ['pillar-bifold-1'],
    desc: 'Bifold with a tall croc-textured column inlay. Understated, holds its shape.',
    colors: [['Black', '#1e1e20'], ['Tan', '#a76c3f'], ['Brown', '#584438']],
    specs: ['Snap close', 'Croc inlay', '3 colours'],
    feats: [
      'Vertical croc-embossed inlay panel',
      'Press-stud closure',
      'Layered card slots with full note sleeve',
      'Structured build — keeps its shape when empty',
      'Available in 3 colours'
    ]
  },
  {
    slug: 'monogram-bifold',
    name: 'Monogram Bifold',
    cat: 'bifold',
    badge: 'Slimmest',
    price: 1190,
    imgs: ['monogram-bifold-1'],
    desc: 'Soft suede-finish bifold with a debossed laurel monogram. The slimmest one we carry.',
    colors: [['Taupe', '#6b5952'], ['Camel', '#b98a5c'], ['Grey', '#93999b']],
    specs: ['Slim', 'Suede finish', '3 colours'],
    feats: [
      'Soft suede-touch finish — no bulk in the pocket',
      'Debossed laurel monogram on the front',
      'Classic horizontal bifold, card slots both sides',
      'Approx. 11 x 9.5 x 1.5 cm folded',
      'Available in 3 colours'
    ]
  },
  {
    slug: 'monogram-trifold',
    name: 'Monogram Trifold',
    cat: 'trifold',
    badge: null,
    price: 1290,
    imgs: ['monogram-trifold-1'],
    desc: 'The Monogram in a taller vertical cut. More card space, same suede finish.',
    colors: [['Taupe', '#6d5b54'], ['Camel', '#bb8d5f'], ['Grey', '#959b9d']],
    specs: ['Vertical', 'Suede finish', '3 colours'],
    feats: [
      'Vertical trifold — more card slots than the bifold',
      'Same soft suede-touch finish and laurel monogram',
      'Fits comfortably in a jacket or front pocket',
      'Approx. 9.5 x 12 x 2 cm folded',
      'Available in 3 colours'
    ]
  },
  {
    slug: 'essential-bifold',
    name: 'Essential Bifold',
    cat: 'bifold',
    badge: 'Best value',
    price: 1190,
    imgs: ['essential-bifold-1'],
    desc: 'No patches, no logos, no fuss. A plain bifold that does exactly one job well.',
    colors: [['Black', '#181818'], ['Dark Brown', '#3d2b22'], ['Tan', '#9e6134']],
    specs: ['Plain', 'ID window', '3 colours'],
    feats: [
      'Completely plain front — no visible branding',
      'Clear ID window plus 6 card slots',
      'Two full-length note compartments',
      'Smooth finish with tan contrast stitching',
      'Available in 3 colours'
    ]
  },
  {
    slug: 'bloom-card',
    name: 'Bloom Card Wallet',
    cat: 'card',
    badge: 'Gift pick',
    price: 690,
    imgs: ['bloom-card-1'],
    desc: 'Small zip-around card wallet with a printed character front. Popular as a gift.',
    colors: [['Print', '#e6b9c8']],
    specs: ['Zip around', 'Compact', 'Gift'],
    feats: [
      'Zip-around closure — nothing slips out',
      'Concertina card slots plus a coin section',
      'Gold-tone zip pull',
      'Approx. 11 x 8 x 2.5 cm',
      'Printed design, wipe-clean finish'
    ]
  }
];

const CATS = [
  ['all', 'All wallets'], ['bifold', 'Bifold'], ['trifold', 'Trifold'],
  ['long', 'Long wallets'], ['card', 'Card wallets']
];

/* ---------------- helpers ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => CONFIG.currency + ' ' + n.toLocaleString('en-PK');
const img = (slug, sq) => 'assets/img/' + slug + (sq ? '-sq' : '') + '.webp';

function waLink(p) {
  const msg = p
    ? `Assalam o Alaikum! Mujhe ye wallet order karna hai:\n\n*${p.name}* — ${money(p.price)}\n\nColour: \nAddress: \nName: \n\n(FOLD&CARRY website se)`
    : 'Assalam o Alaikum! Mujhe FOLD&CARRY ke wallets ke baare mein maloomat chahiye.';
  return `https://wa.me/${CONFIG.phone}?text=${encodeURIComponent(msg)}`;
}

const WA_ICON = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.14c-.25.69-1.44 1.32-1.99 1.36-.53.05-1.02.23-3.44-.72-2.9-1.14-4.74-4.11-4.88-4.3-.14-.19-1.16-1.55-1.16-2.96 0-1.4.73-2.09.99-2.38.26-.29.57-.36.76-.36h.55c.18 0 .41-.03.64.49.25.58.83 2 .9 2.15.07.14.12.31.02.5-.09.19-.14.31-.28.48-.14.17-.3.37-.42.5-.14.14-.29.29-.12.57.16.29.73 1.2 1.57 1.95 1.08.96 1.98 1.26 2.27 1.4.29.14.45.12.62-.07.17-.19.71-.83.9-1.12.19-.29.38-.24.64-.14.26.09 1.66.78 1.94.93.29.14.48.21.55.33.07.12.07.69-.18 1.38Z"/></svg>';

/* ---------------- render grid ---------------- */
function card(p) {
  const sw = p.colors.map(c => `<i class="sw" style="background:${c[1]}" title="${c[0]}"></i>`).join('');
  return `
  <article class="card" data-cat="${p.cat}">
    <div class="card-img" data-open="${p.slug}">
      ${p.badge ? `<span class="badge">${p.badge}</span>` : ''}
      <img src="${img(p.imgs[0], true)}" alt="${p.name} — FOLD&amp;CARRY" loading="lazy" width="700" height="700">
    </div>
    <div class="card-b">
      <h3>${p.name}</h3>
      <p class="desc">${p.desc}</p>
      <div class="specs">${p.specs.map(s => `<span>${s}</span>`).join('')}</div>
      <div class="swatches">${sw}<small>${p.colors.length} colour${p.colors.length > 1 ? 's' : ''}</small></div>
      <div class="price-row">
        <span class="price">${money(p.price)}<br><small>Cash on delivery</small></span>
        <a class="order" href="${waLink(p)}" target="_blank" rel="noopener">${WA_ICON} Order</a>
      </div>
    </div>
  </article>`;
}

function renderGrid(cat = 'all') {
  const list = cat === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.cat === cat);
  $('#grid').innerHTML = list.map(card).join('');
}

function renderFilters() {
  $('#filters').innerHTML = CATS.map(([k, label], i) =>
    `<button class="chip${i === 0 ? ' on' : ''}" data-cat="${k}">${label}</button>`).join('');
}

/* ---------------- lightbox ---------------- */
let lbProduct = null;

function openLB(slug) {
  const p = PRODUCTS.find(x => x.slug === slug);
  if (!p) return;
  lbProduct = p;
  const thumbs = p.imgs.length > 1
    ? `<div class="lb-thumbs">${p.imgs.map((s, i) =>
        `<img src="${img(s, true)}" data-i="${i}" class="${i === 0 ? 'on' : ''}" alt="View ${i + 1}">`).join('')}</div>`
    : '';
  $('#lb-in').innerHTML = `
    <button class="lb-close" aria-label="Close">&times;</button>
    <div class="lb-img"><img id="lb-main" src="${img(p.imgs[0])}" alt="${p.name}">${thumbs}</div>
    <div class="lb-b">
      <h3>${p.name}</h3>
      <p class="lbdesc">${p.desc}</p>
      <ul class="feat">${p.feats.map(f => `<li>${f}</li>`).join('')}</ul>
      <div class="swatches" style="margin-bottom:18px">
        ${p.colors.map(c => `<i class="sw" style="background:${c[1]}" title="${c[0]}"></i>`).join('')}
        <small>${p.colors.map(c => c[0]).join(' · ')}</small>
      </div>
      <p class="lb-price">${money(p.price)}</p>
      <a class="order" href="${waLink(p)}" target="_blank" rel="noopener">${WA_ICON} Order on WhatsApp</a>
    </div>`;
  $('#lb').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeLB() {
  $('#lb').classList.remove('on');
  document.body.style.overflow = '';
}

/* ---------------- wire up ---------------- */
document.addEventListener('DOMContentLoaded', () => {
  renderFilters();
  renderGrid();

  $('#filters').addEventListener('click', e => {
    const b = e.target.closest('.chip');
    if (!b) return;
    $$('.chip').forEach(c => c.classList.toggle('on', c === b));
    renderGrid(b.dataset.cat);
  });

  $('#grid').addEventListener('click', e => {
    const t = e.target.closest('[data-open]');
    if (t) openLB(t.dataset.open);
  });

  $('#lb').addEventListener('click', e => {
    if (e.target.id === 'lb' || e.target.closest('.lb-close')) { closeLB(); return; }
    const th = e.target.closest('.lb-thumbs img');
    if (th && lbProduct) {
      $('#lb-main').src = img(lbProduct.imgs[+th.dataset.i]);
      $$('.lb-thumbs img').forEach(x => x.classList.toggle('on', x === th));
    }
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLB(); });

  $('.burger').addEventListener('click', () => $('.nav').classList.toggle('open'));
  $$('.nav a').forEach(a => a.addEventListener('click', () => $('.nav').classList.remove('open')));

  $$('[data-wa]').forEach(a => { a.href = waLink(null); });
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
});
