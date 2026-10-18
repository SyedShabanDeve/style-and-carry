/**
 * Helpers for the website editor: read and write nested values by path, and
 * list every difference between the live content and the unsaved draft in
 * plain words ("Hero slide 2 › Headline").
 */

const toPath = (p) => (Array.isArray(p) ? p : String(p).split('.').filter((x) => x !== ''));

export function getIn(obj, path) {
  return toPath(path).reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

/** Returns a copy of `obj` with the value at `path` replaced. */
export function setIn(obj, path, value) {
  const [k, ...rest] = toPath(path);
  if (k === undefined) return value;
  const base = obj == null ? (/^\d+$/.test(k) ? [] : {}) : obj;
  const copy = Array.isArray(base) ? [...base] : { ...base };
  copy[k] = rest.length ? setIn(base[k], rest, value) : value;
  return copy;
}

export const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const GROUPS = {
  heroSlides: 'Hero slide',
  banners: 'Banner',
  brands: 'Brand logo',
  story: 'Featured band',
  features: 'Promise cards',
  heroSearch: 'Hero search box',
  categorySection: 'Categories section',
  offers: 'Special offers',
  quote: 'Quote band',
  aboutSection: 'About us section',
  gallery: 'Gallery',
  testimonials: 'Testimonials',
  newsletter: 'Newsletter band',
  faqs: 'Homepage question',
  announcement: 'Announcement bar',
  trust: 'Trust strip',
  topSellers: 'Top sellers',
  newArrivals: 'New arrivals',
  faqSection: 'Questions section',
  pages: 'Page header',
  about: 'About page',
  product: 'Product page',
  footer: 'Footer',
};

const FIELDS = {
  image: 'Image',
  mobileImage: 'Phone image',
  eyebrow: 'Small line',
  title: 'Heading',
  text: 'Text',
  ctaLabel: 'Button text',
  ctaLink: 'Button link',
  active: 'Showing',
  enabled: 'Showing',
  link: 'Link',
  position: 'Position',
  name: 'Name',
  button: 'Button text',
  author: 'Who said it',
  items: 'Item',
  q: 'Question',
  a: 'Answer',
  heading: 'Heading',
  body: 'Text',
  points: 'Point',
  faqs: 'Question',
  faqTitle: 'Questions heading',
  ctaTitle: 'Closing heading',
  ctaText: 'Closing text',
  ctaButton: 'Closing button',
  deliveryTitle: 'Delivery title',
  deliveryText: 'Delivery text',
  exchangeTitle: 'Exchange title',
  exchangeText: 'Exchange text',
  policyText: 'Delivery & exchange text',
  questionsTitle: 'Contact heading',
  shop: 'Shop page',
  track: 'Track order page',
  wishlist: 'Wishlist page',
  checkout: 'Checkout page',
};

const SKIP = new Set(['id', 'updatedAt']);
const isImageKey = (k) => k === 'image' || k === 'mobileImage';

/** A short name for a list item, so "Hero slide 2" can read "Hero slide 2 (Watches)". */
const nameOf = (it) => (it && typeof it === 'object' ? it.title || it.name || it.q || it.eyebrow || '' : String(it || ''));

/**
 * Every difference between `before` and `after`, as
 * { label, before, after, kind: 'changed' | 'added' | 'removed', image }.
 */
export function diffContent(before = {}, after = {}) {
  const out = [];

  const walk = (a, b, labels, key) => {
    if (same(a, b)) return;
    const label = labels.join(' › ');

    if (Array.isArray(a) || Array.isArray(b)) {
      const la = a || [];
      const lb = b || [];
      const head = labels.slice(0, -1);
      const noun = labels[labels.length - 1] || 'Item';
      for (let i = 0; i < Math.max(la.length, lb.length); i++) {
        const itemLabel = [...head, `${noun} ${i + 1}`];
        const text = itemLabel.join(' › ');
        if (la[i] === undefined) out.push({ label: text, before: '', after: nameOf(lb[i]) || 'New item', kind: 'added' });
        else if (lb[i] === undefined) out.push({ label: text, before: nameOf(la[i]) || 'Item', after: '', kind: 'removed' });
        else if (la[i] && typeof la[i] === 'object') walk(la[i], lb[i], itemLabel, null);
        else if (!same(la[i], lb[i])) out.push({ label: text, before: la[i], after: lb[i], kind: 'changed' });
      }
      return;
    }

    if (a && b && typeof a === 'object' && typeof b === 'object') {
      for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (SKIP.has(k)) continue;
        const name = labels.length ? FIELDS[k] || k : GROUPS[k] || FIELDS[k] || k;
        walk(a[k], b[k], [...labels, name], k);
      }
      return;
    }

    out.push({
      label,
      before: typeof a === 'boolean' ? (a ? 'On' : 'Off') : a ?? '',
      after: typeof b === 'boolean' ? (b ? 'On' : 'Off') : b ?? '',
      kind: 'changed',
      image: isImageKey(key),
    });
  };

  walk(before, after, [], null);
  return out;
}
