import { useEffect, useId, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';

import ImageField from '../../components/admin/ImageField';
import LivePreview from '../../components/admin/LivePreview';
import ReviewChanges from '../../components/admin/ReviewChanges';
import { Field, Area, Card, ItemTools, PairList, TokenTip, BeforeNote } from '../../components/admin/EditorParts';
import { fetchContent, saveContent, selectContent, selectAllCategories } from '../../store/contentSlice';
import { selectLiveProducts } from '../../store/productsSlice';
import { pushToast } from '../../store/uiSlice';
import { getIn, setIn, same, diffContent } from '../../lib/contentDiff';
import {
  Alert,
  Plus,
  Eye,
  Image as ImageIcon,
  Truck,
  Star,
  Layers,
  Shield,
  Package,
  Mail,
  Info,
  Tag,
  Home,
  Bag,
  Heart,
  Cart,
  Search,
  Grid,
} from '../../components/ui/Icons';

const TABS = [
  ['hero', 'Hero slides', ImageIcon],
  ['home', 'Homepage sections', Home],
  ['banners', 'Banners & logos', Tag],
  ['pages', 'Pages', Grid],
  ['frame', 'Header & footer', Layers],
];

const newId = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Link input with suggestions for pages on this site. */
function LinkField({ label = 'Link', value, onChange, was }) {
  const id = useId();
  return (
    <div className={`inp${was !== undefined && (was ?? '') !== (value ?? '') ? ' is-changed' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="/shop?category=watches" list="site-links" />
      <BeforeNote was={was} value={value} onUndo={onChange} />
    </div>
  );
}

export default function AdminHomepage() {
  const dispatch = useDispatch();
  const content = useSelector(selectContent);
  const categories = useSelector(selectAllCategories);
  const products = useSelector(selectLiveProducts);
  const saving = useSelector((s) => s.content.saving);
  const [tab, setTab] = useState(() => {
    try {
      return sessionStorage.getItem('sc_web_tab') || 'hero';
    } catch {
      return 'hero';
    }
  });
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [focus, setFocus] = useState({ route: '/', section: 'hero' });
  const [mode, setMode] = useState('after');
  const [review, setReview] = useState(false);
  const [showPreview, setShowPreview] = useState(() => window.innerWidth > 1180);

  useEffect(() => {
    dispatch(fetchContent());
  }, [dispatch]);

  useEffect(() => {
    try {
      sessionStorage.setItem('sc_web_tab', tab);
    } catch {}
  }, [tab]);

  useEffect(() => {
    if (content && Object.keys(content).length && !form) setForm(structuredClone(content));
  }, [content, form]);

  /* Warn before leaving with unpublished edits. */
  const dirty = Boolean(form) && !same(form, content);
  useEffect(() => {
    if (!dirty) return undefined;
    const onLeave = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  const changes = useMemo(() => (form ? diffContent(content, form) : []), [content, form]);

  const links = useMemo(
    () => [
      ['/shop', 'All products'],
      ['/shop?sale=1', 'Offers'],
      ['/shop?sort=newest', 'New arrivals'],
      ...categories.map((c) => [`/shop?category=${c.key}`, c.name]),
      ['/about', 'About'],
      ['/track', 'Track order'],
    ],
    [categories]
  );

  if (!form) {
    return (
      <div className="page-load" style={{ minHeight: 260 }}>
        <div className="spin" />
        <span>Loading your website…</span>
      </div>
    );
  }

  /* ---------- binding helpers ---------- */
  const update = (path, value) => setForm((f) => setIn(f, path, value));
  /** value + live value + setter for one field, by path like "topSellers.title". */
  const bind = (path) => ({ value: getIn(form, path), was: getIn(content, path) ?? '', onChange: (v) => update(path, v) });
  /** The same for a field of an item in a list with ids (slides, banners, logos). */
  const bindItem = (key, i, field) => {
    const item = form[key][i];
    const live = (content[key] || []).find((x) => x.id === item.id);
    return {
      value: item[field],
      was: live ? live[field] ?? '' : undefined,
      onChange: (v) => update([key, i, field], v),
    };
  };
  const isNewItem = (key, item) => !(content[key] || []).some((x) => x.id === item.id);
  const itemChanged = (key, item) => {
    const live = (content[key] || []).find((x) => x.id === item.id);
    return live ? !same(live, item) : false;
  };
  const changedAt = (...paths) => paths.some((p) => !same(getIn(form, p), getIn(content, p)));
  const on = (path) => getIn(form, path) !== false;
  const setList = (key, fn) => setForm((f) => ({ ...f, [key]: fn([...(f[key] || [])]) }));
  const move = (key) => (i, d) =>
    setList(key, (l) => {
      const j = i + d;
      if (j < 0 || j >= l.length) return l;
      [l[i], l[j]] = [l[j], l[i]];
      return l;
    });
  const remove = (key) => (i) => setList(key, (l) => l.filter((_, x) => x !== i));
  const look = (section, route = '/') => () => setFocus({ section, route });

  const openReview = () => {
    setError(null);
    const slides = form.heroSlides || [];
    if (slides.some((s) => !s.image)) return setError('Every hero slide needs a desktop image. Upload one or delete the slide.');
    if (!slides.some((s) => s.active !== false)) return setError('Keep at least one hero slide switched on.');
    if ((form.banners || []).some((b) => !b.image)) return setError('Every banner needs an image. Upload one or delete the banner.');
    if ((form.brands || []).some((b) => !b.image)) return setError('Every brand needs a logo image. Upload one or delete it.');
    setReview(true);
  };

  const publish = async () => {
    const result = await dispatch(saveContent(form));
    if (saveContent.fulfilled.match(result)) {
      setForm(structuredClone(result.payload));
      setReview(false);
      setMode('after');
      dispatch(pushToast({ message: 'Published. Your website is updated.', kind: 'ok' }));
    } else {
      setReview(false);
      setError(result.payload || 'Could not save');
    }
  };

  const features = form.features || {};
  const featureItems = [...(features.items || [])];
  while (featureItems.length < 6) featureItems.push({ title: '', text: '' });
  const liveFeatures = content.features?.items || [];

  const firstProduct = products[0]?.slug;
  const PAGE_LIST = [
    ['shop', 'Shop page', Bag, '/shop'],
    ['track', 'Track order page', Truck, '/track'],
    ['wishlist', 'Wishlist page', Heart, '/wishlist'],
    ['checkout', 'Checkout page', Cart, '/checkout'],
  ];

  return (
    <div className="a-form web">
      <datalist id="site-links">
        {links.map(([href, name]) => (
          <option key={href} value={href}>
            {name}
          </option>
        ))}
      </datalist>

      <div className="a-tabs" role="tablist">
        {TABS.map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={`a-tab${tab === key ? ' on' : ''}`}
            onClick={() => {
              setTab(key);
              setFocus(
                key === 'pages'
                  ? { route: '/about', section: 'pageHead' }
                  : key === 'frame'
                    ? { route: '/', section: 'announcement' }
                    : key === 'banners'
                      ? { route: '/', section: 'bannersTop' }
                      : { route: '/', section: key === 'hero' ? 'hero' : 'trust' }
              );
            }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
        <button type="button" className="btn btn-ghost btn-sm a-tabs-view" onClick={() => setShowPreview((s) => !s)}>
          <Eye size={15} /> {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>

      <div className={`web-split${showPreview ? ' with-pv' : ''}`}>
        <div className="a-scroll web-ed">
          <p className="web-help">
            <b>How it works:</b> open a section and edit it. Under anything you change you will see what is <b>live now</b>, with
            an Undo button. The preview on the right jumps to that section; switch between <b>Live now</b> and{' '}
            <b>Your changes</b> to compare. Nothing changes for customers until you press <b>Publish</b>.
          </p>

          {error && (
            <div className="alert alert-bad" role="alert">
              <Alert size={17} />
              <span>{error}</span>
            </div>
          )}

          {/* ================= HERO ================= */}
          {tab === 'hero' && (
            <>
              <div className="ed-intro">
                <div>
                  <h2>Hero slides</h2>
                  <p>The big rotating banner at the very top of your homepage. Up to 8 slides, shown in this order.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={(form.heroSlides || []).length >= 8}
                  onClick={() => {
                    setList('heroSlides', (l) => [
                      ...l,
                      { id: newId('hero'), image: '', mobileImage: '', eyebrow: '', title: '', text: '', ctaLabel: 'Shop now', ctaLink: '/shop', active: true },
                    ]);
                    setFocus({ route: '/', section: 'hero' });
                  }}
                >
                  <Plus size={15} /> Add slide
                </button>
              </div>

              {(form.heroSlides || []).map((s, i, all) => (
                <Card
                  key={s.id}
                  icon={ImageIcon}
                  title={`Slide ${i + 1}${s.title ? ` · ${s.title}` : ''}`}
                  desc={s.eyebrow || 'No small line yet'}
                  enabled={s.active !== false}
                  onToggle={(v) => update(['heroSlides', i, 'active'], v)}
                  defaultOpen={i === 0}
                  isNew={isNewItem('heroSlides', s)}
                  changed={itemChanged('heroSlides', s)}
                  onFocusSection={look('hero')}
                >
                  <div className="ed-row-end">
                    <ItemTools i={i} n={all.length} label={`slide ${i + 1}`} onMove={move('heroSlides')} onRemove={remove('heroSlides')} />
                  </div>
                  <div className="a-item-grid">
                    <div className="a-item-imgs">
                      <ImageField kind="heroDesktop" {...bindItem('heroSlides', i, 'image')} />
                      <ImageField kind="heroMobile" optional compact {...bindItem('heroSlides', i, 'mobileImage')} />
                    </div>
                    <div className="form-grid">
                      <Field label="Small line above (script)" max={60} placeholder="Discover a new" {...bindItem('heroSlides', i, 'eyebrow')} />
                      <Field label="Headline" max={80} placeholder="Luxury Watches" {...bindItem('heroSlides', i, 'title')} />
                      <Area label="Supporting text" max={220} rows={2} {...bindItem('heroSlides', i, 'text')} />
                      <Field label="Button text" max={40} placeholder="Explore the range" {...bindItem('heroSlides', i, 'ctaLabel')} />
                      <LinkField label="Button link" {...bindItem('heroSlides', i, 'ctaLink')} />
                    </div>
                  </div>
                </Card>
              ))}
              {(content.heroSlides || []).length > (form.heroSlides || []).length && (
                <p className="was was-gone">
                  {(content.heroSlides || []).length - (form.heroSlides || []).length} slide(s) removed. They stay live until you publish.
                  <button type="button" onClick={() => update('heroSlides', structuredClone(content.heroSlides))}>
                    Undo
                  </button>
                </p>
              )}
              {!(form.heroSlides || []).length && <p className="ed-empty">No slides yet. Add one to show the hero banner.</p>}
            </>
          )}

          {/* ================= HOMEPAGE SECTIONS ================= */}
          {tab === 'home' && (
            <>
              <div className="ed-intro">
                <div>
                  <h2>Homepage sections</h2>
                  <p>Listed in the order they appear. Open one to edit it, or use its switch to show or hide it.</p>
                </div>
              </div>
              <TokenTip />

              <Card
                icon={Shield}
                title="Trust strip"
                desc="Four short promises under the hero. Shown when you have no brand logos."
                enabled={on('trust.enabled')}
                onToggle={(v) => update('trust.enabled', v)}
                changed={changedAt('trust')}
                onFocusSection={look('trust')}
              >
                <PairList
                  items={form.trust?.items || []}
                  was={content.trust?.items || []}
                  max={4}
                  itemLabel="Promise"
                  addLabel="Add promise"
                  fields={[
                    ['title', 'Title', 60],
                    ['text', 'Small text', 80],
                  ]}
                  onChange={(items) => update('trust.items', items)}
                />
              </Card>

              <Card
                icon={Search}
                title="Hero search box"
                desc="One search bar on the lower edge of the hero, with shortcuts to your categories."
                enabled={on('heroSearch.enabled')}
                onToggle={(v) => update('heroSearch.enabled', v)}
                changed={changedAt('heroSearch')}
                onFocusSection={look('hero')}
              >
                <div className="form-grid">
                  <Field label="Button text" max={30} {...bind('heroSearch.button')} />
                </div>
                <p className="ed-note">The category shortcuts fill in by themselves from categories that have products.</p>
              </Card>

              <Card
                icon={Grid}
                title="Categories"
                desc="A row of category cards with a round photo each."
                enabled={on('categorySection.enabled')}
                onToggle={(v) => update('categorySection.enabled', v)}
                changed={changedAt('categorySection')}
                onFocusSection={look('categorySection')}
              >
                <div className="form-grid">
                  <Field label="Small italic line" max={80} {...bind('categorySection.eyebrow')} />
                  <Field label="Heading" max={100} {...bind('categorySection.title')} />
                  <Area label="Short text" max={300} rows={2} {...bind('categorySection.text')} />
                </div>
                <p className="ed-note">
                  Category photos, names and descriptions are set under <Link to="/admin/categories">Categories</Link>.
                </p>
              </Card>

              <Card
                icon={Star}
                title="Top sellers"
                desc="Products with a badge come first. Set badges on each product."
                enabled={on('topSellers.enabled')}
                onToggle={(v) => update('topSellers.enabled', v)}
                changed={changedAt('topSellers')}
                onFocusSection={look('topSellers')}
              >
                <div className="form-grid">
                  <Field label="Small italic line" max={80} {...bind('topSellers.eyebrow')} />
                  <Field label="Heading" max={100} {...bind('topSellers.title')} />
                  <Field label="Button text" max={40} {...bind('topSellers.button')} />
                </div>
              </Card>

              <Card icon={Tag} title="Promo banners" desc="Edited in the Banners & logos tab." badge={`${(form.banners || []).length}`} onFocusSection={look('bannersTop')}>
                <p className="ed-note">
                  Banners are managed in the{' '}
                  <button type="button" className="link-btn" onClick={() => setTab('banners')}>
                    Banners & logos
                  </button>{' '}
                  tab.
                </p>
              </Card>

              <Card
                icon={Layers}
                title="Featured band"
                desc="Coloured panel with three products and two large photos beside it."
                enabled={on('story.enabled')}
                onToggle={(v) => update('story.enabled', v)}
                changed={changedAt('story')}
                onFocusSection={look('story')}
              >
                <div className="form-grid">
                  <Field label="Small italic line" max={80} {...bind('story.eyebrow')} />
                  <Field label="Heading" max={100} {...bind('story.title')} />
                  <Area label="Paragraph" max={900} rows={3} {...bind('story.text')} />
                  <Field label="Button text" max={40} {...bind('story.button')} />
                </div>
                <p className="ed-note">The products shown are your Top sellers (products with a badge), then the rest.</p>
              </Card>

              <Card
                icon={Shield}
                title="Promise cards"
                desc="Cards with an icon, a title and one sentence each. Leave a title empty to hide that card."
                enabled={on('features.enabled')}
                onToggle={(v) => update('features.enabled', v)}
                changed={changedAt('features')}
                onFocusSection={look('features')}
              >
                <div>
                  <div className="form-grid">
                    <Field label="Small italic line" max={80} {...bind('features.eyebrow')} />
                    <Field label="Heading" max={100} {...bind('features.title')} />
                    {featureItems.map((it, i) => {
                      const live = liveFeatures[i] || { title: '', text: '' };
                      const setItem = (patch) => {
                        const items = featureItems.map((x, j) => (j === i ? { ...x, ...patch } : x));
                        update('features.items', items);
                      };
                      return (
                        <div className={`inp a-feature${live.title !== it.title || (live.text || '') !== (it.text || '') ? ' is-changed' : ''}`} key={i}>
                          <label>
                            Card {i + 1}
                          </label>
                          <input value={it.title} maxLength={60} placeholder="Title (leave empty to hide)" aria-label={`Promise ${i + 1} title`} onChange={(e) => setItem({ title: e.target.value })} />
                          <textarea rows={2} value={it.text} maxLength={200} placeholder="One short sentence" aria-label={`Promise ${i + 1} text`} onChange={(e) => setItem({ text: e.target.value })} />
                          <BeforeNote was={live.title + (live.text ? ` — ${live.text}` : '')} value={it.title + (it.text ? ` — ${it.text}` : '')} onUndo={() => setItem({ ...live })} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>

              <Card
                icon={Tag}
                title="Special offers"
                desc="Dark band with a sliding strip of products on sale. Hidden when nothing is on sale."
                enabled={on('offers.enabled')}
                onToggle={(v) => update('offers.enabled', v)}
                changed={changedAt('offers')}
                onFocusSection={look('offers')}
              >
                <div className="form-grid">
                  <Field label="Small italic line" max={80} {...bind('offers.eyebrow')} />
                  <Field label="Heading" max={100} {...bind('offers.title')} />
                  <Area label="Short text" max={300} rows={2} {...bind('offers.text')} />
                  <Field label="Button text" max={40} {...bind('offers.button')} />
                </div>
                <p className="ed-note">
                  A product is on sale when its "compare at" price is higher than its price. Set it under <Link to="/admin/products">Products</Link>.
                </p>
              </Card>

              <Card
                icon={Heart}
                title="Quote band"
                desc="A large quote over a darkened background photo."
                enabled={on('quote.enabled')}
                onToggle={(v) => update('quote.enabled', v)}
                changed={changedAt('quote')}
                onFocusSection={look('quote')}
              >
                <div className="a-item-grid">
                  <ImageField kind="quote" {...bind('quote.image')} />
                  <div className="form-grid">
                    <Area label="Quote" max={300} rows={3} {...bind('quote.text')} />
                    <Field label="Who said it" max={80} {...bind('quote.author')} />
                  </div>
                </div>
              </Card>

              <Card
                icon={Info}
                title="About us"
                desc="Text beside a tall photo. The button opens your About page."
                enabled={on('aboutSection.enabled')}
                onToggle={(v) => update('aboutSection.enabled', v)}
                changed={changedAt('aboutSection')}
                onFocusSection={look('aboutSection')}
              >
                <div className="a-item-grid">
                  <ImageField kind="about" {...bind('aboutSection.image')} />
                  <div className="form-grid">
                    <Field label="Small italic line" max={80} {...bind('aboutSection.eyebrow')} />
                    <Field label="Heading" max={100} {...bind('aboutSection.title')} />
                    <Area label="Text (leave an empty line between paragraphs)" max={1500} rows={5} {...bind('aboutSection.text')} />
                    <Field label="Button text" max={40} {...bind('aboutSection.button')} />
                  </div>
                </div>
              </Card>

              <Card
                icon={Package}
                title="New arrivals"
                desc="The newest products that are not already in Top sellers."
                enabled={on('newArrivals.enabled')}
                onToggle={(v) => update('newArrivals.enabled', v)}
                changed={changedAt('newArrivals')}
                onFocusSection={look('newArrivals')}
              >
                <div className="form-grid">
                  <Field label="Small italic line" max={80} {...bind('newArrivals.eyebrow')} />
                  <Field label="Heading" max={100} {...bind('newArrivals.title')} />
                  <Field label="Button text" max={40} {...bind('newArrivals.button')} />
                </div>
              </Card>

              <Card
                icon={ImageIcon}
                title="Gallery"
                desc="A mosaic of your product photos. Each photo opens its product."
                enabled={on('gallery.enabled')}
                onToggle={(v) => update('gallery.enabled', v)}
                changed={changedAt('gallery')}
                onFocusSection={look('gallery')}
              >
                <div className="form-grid">
                  <Field label="Small italic line" max={80} {...bind('gallery.eyebrow')} />
                  <Field label="Heading" max={100} {...bind('gallery.title')} />
                </div>
              </Card>

              <Card
                icon={Star}
                title="Testimonials"
                desc="Shows reviews you approve. Hidden until there is at least one."
                enabled={on('testimonials.enabled')}
                onToggle={(v) => update('testimonials.enabled', v)}
                changed={changedAt('testimonials')}
                onFocusSection={look('testimonials')}
              >
                <div className="form-grid">
                  <Field label="Small italic line" max={80} {...bind('testimonials.eyebrow')} />
                  <Field label="Heading" max={100} {...bind('testimonials.title')} />
                </div>
                <p className="ed-note">
                  Approve and feature reviews under <Link to="/admin/reviews">Reviews</Link>.
                </p>
              </Card>

              <Card
                icon={Info}
                title="Questions (FAQ)"
                desc={`${(form.faqs || []).length} questions on the homepage.`}
                enabled={on('faqSection.enabled')}
                onToggle={(v) => update('faqSection.enabled', v)}
                changed={changedAt('faqSection', 'faqs')}
                onFocusSection={look('faq')}
              >
                <div className="form-grid">
                  <Field label="Small italic line" max={80} {...bind('faqSection.eyebrow')} />
                  <Field label="Heading" max={100} {...bind('faqSection.title')} />
                </div>
                <PairList
                  items={form.faqs || []}
                  was={content.faqs || []}
                  max={20}
                  itemLabel="Question"
                  addLabel="Add question"
                  fields={[
                    ['q', 'Question', 200],
                    ['a', 'Answer', 1000, true],
                  ]}
                  onChange={(faqs) => update('faqs', faqs)}
                />
              </Card>

              <Card
                icon={Mail}
                title="Newsletter band"
                desc="Above the footer on every page. Sign-ups go to Subscribers."
                enabled={on('newsletter.enabled')}
                onToggle={(v) => update('newsletter.enabled', v)}
                changed={changedAt('newsletter')}
                onFocusSection={look('newsletter')}
              >
                <div className="form-grid">
                  <Field label="Heading" max={80} {...bind('newsletter.title')} />
                  <Field label="Text" max={200} {...bind('newsletter.text')} />
                </div>
              </Card>
            </>
          )}

          {/* ================= BANNERS & LOGOS ================= */}
          {tab === 'banners' && (
            <>
              <div className="ed-intro">
                <div>
                  <h2>Promo banners</h2>
                  <p>Large image links. "Top" banners sit under the hero, "Bottom" ones under the reviews.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={(form.banners || []).length >= 8}
                  onClick={() => setList('banners', (l) => [...l, { id: newId('ban'), image: '', eyebrow: '', title: '', link: '/shop', position: 'top' }])}
                >
                  <Plus size={15} /> Add banner
                </button>
              </div>
              {(form.banners || []).map((b, i, all) => (
                <Card
                  key={b.id}
                  icon={Tag}
                  title={b.title || `Banner ${i + 1}`}
                  desc={b.position === 'bottom' ? 'Bottom of the page' : 'Under the hero'}
                  isNew={isNewItem('banners', b)}
                  changed={itemChanged('banners', b)}
                  onFocusSection={look(b.position === 'bottom' ? 'bannersBottom' : 'bannersTop')}
                >
                  <div className="ed-row-end">
                    <ItemTools i={i} n={all.length} label={`banner ${i + 1}`} onMove={move('banners')} onRemove={remove('banners')} />
                  </div>
                  <div className="a-item-grid">
                    <ImageField kind="banner" {...bindItem('banners', i, 'image')} />
                    <div className="form-grid">
                      <Field label="Small line" max={60} placeholder="New in" {...bindItem('banners', i, 'eyebrow')} />
                      <Field label="Title" max={80} placeholder="Ladies suits" {...bindItem('banners', i, 'title')} />
                      <LinkField {...bindItem('banners', i, 'link')} />
                      <div className="inp">
                        <label htmlFor={`pos-${b.id}`}>Position</label>
                        <select id={`pos-${b.id}`} value={b.position || 'top'} onChange={(e) => update(['banners', i, 'position'], e.target.value)}>
                          <option value="top">Top, under the hero</option>
                          <option value="bottom">Bottom, under the reviews</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {!(form.banners || []).length && <p className="ed-empty">No banners. The section is hidden until you add one.</p>}

              <div className="ed-intro ed-intro-2">
                <div>
                  <h2>Brand logos</h2>
                  <p>A slowly scrolling strip of logos under the hero. With none, the trust strip shows instead.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={(form.brands || []).length >= 16}
                  onClick={() => setList('brands', (l) => [...l, { id: newId('brand'), image: '', name: '', link: '' }])}
                >
                  <Plus size={15} /> Add logo
                </button>
              </div>
              <div className="a-logos">
                {(form.brands || []).map((b, i, all) => (
                  <div className={`a-item${isNewItem('brands', b) ? ' is-new' : ''}`} key={b.id} onFocusCapture={look('trust')}>
                    <div className="a-item-head">
                      <strong>{b.name || `Logo ${i + 1}`}</strong>
                      <ItemTools i={i} n={all.length} label={`logo ${i + 1}`} onMove={move('brands')} onRemove={remove('brands')} />
                    </div>
                    <ImageField kind="brand" compact {...bindItem('brands', i, 'image')} />
                    <div className="form-grid">
                      <Field label="Name" max={60} {...bindItem('brands', i, 'name')} />
                      <LinkField label="Link (optional)" {...bindItem('brands', i, 'link')} />
                    </div>
                  </div>
                ))}
              </div>
              {!(form.brands || []).length && <p className="ed-empty">No logos yet.</p>}
            </>
          )}

          {/* ================= PAGES ================= */}
          {tab === 'pages' && (
            <>
              <div className="ed-intro">
                <div>
                  <h2>Pages</h2>
                  <p>The header band on each page, the full About page, and the delivery notes on every product page.</p>
                </div>
              </div>
              <TokenTip />

              <Card icon={Info} title="About page" desc="Header, story, four points, questions and the closing box." defaultOpen changed={changedAt('pages.about', 'about')} onFocusSection={look('pageHead', '/about')}>
                <h4 className="ed-sub">Header band</h4>
                <div className="form-grid" onFocusCapture={look('pageHead', '/about')}>
                  <Field label="Small italic line" max={80} {...bind('pages.about.eyebrow')} />
                  <Field label="Title" max={100} {...bind('pages.about.title')} />
                  <Area label="Intro" max={300} rows={2} {...bind('pages.about.text')} />
                </div>
                <h4 className="ed-sub">Story</h4>
                <div className="form-grid" onFocusCapture={look('aboutStory', '/about')}>
                  <Field label="Heading" max={100} full {...bind('about.heading')} />
                  <Area label="Text" max={3000} rows={6} hint="Leave an empty line between paragraphs." {...bind('about.body')} />
                </div>
                <h4 className="ed-sub">Four points</h4>
                <div onFocusCapture={look('aboutPoints', '/about')}>
                  <PairList
                    items={form.about?.points || []}
                    was={content.about?.points || []}
                    max={4}
                    itemLabel="Point"
                    addLabel="Add point"
                    fields={[
                      ['title', 'Title', 60],
                      ['text', 'Small text', 80],
                    ]}
                    onChange={(points) => update('about.points', points)}
                  />
                </div>
                <h4 className="ed-sub">Questions</h4>
                <div onFocusCapture={look('aboutFaq', '/about')}>
                  <div className="form-grid">
                    <Field label="Heading" max={100} full {...bind('about.faqTitle')} />
                  </div>
                  <PairList
                    items={form.about?.faqs || []}
                    was={content.about?.faqs || []}
                    max={20}
                    itemLabel="Question"
                    addLabel="Add question"
                    fields={[
                      ['q', 'Question', 200],
                      ['a', 'Answer', 1000, true],
                    ]}
                    onChange={(faqs) => update('about.faqs', faqs)}
                  />
                </div>
                <h4 className="ed-sub">Closing box</h4>
                <div className="form-grid" onFocusCapture={look('aboutCta', '/about')}>
                  <Field label="Heading" max={100} {...bind('about.ctaTitle')} />
                  <Field label="Button text" max={40} {...bind('about.ctaButton')} />
                  <Area label="Text" max={240} rows={2} {...bind('about.ctaText')} />
                </div>
              </Card>

              {PAGE_LIST.map(([key, label, Icon, route]) => (
                <Card key={key} icon={Icon} title={label} desc={form.pages?.[key]?.title || 'Header band'} changed={changedAt(`pages.${key}`)} onFocusSection={look('pageHead', route)}>
                  <div className="form-grid">
                    <Field label="Small italic line (optional)" max={80} {...bind(`pages.${key}.eyebrow`)} />
                    <Field label="Title" max={100} {...bind(`pages.${key}.title`)} />
                    <Area label="Text" max={300} rows={2} {...bind(`pages.${key}.text`)} />
                  </div>
                  {key === 'shop' && <p className="ed-note">On a category page the title becomes the category name automatically.</p>}
                  {key === 'checkout' && <p className="ed-note">The checkout preview shows this band only while something is in the cart.</p>}
                </Card>
              ))}

              <Card
                icon={Search}
                title="Product page"
                desc="Delivery and exchange notes under the buy buttons, on every product."
                changed={changedAt('product')}
                onFocusSection={look('productNotes', firstProduct ? `/product/${firstProduct}` : '/shop')}
              >
                <div className="form-grid">
                  <Field label="Delivery title" max={80} {...bind('product.deliveryTitle')} />
                  <Field label="Delivery text" max={200} {...bind('product.deliveryText')} />
                  <Field label="Exchange title" max={80} {...bind('product.exchangeTitle')} />
                  <Field label="Exchange text" max={200} {...bind('product.exchangeText')} />
                  <Area label={'"Delivery & exchange" section'} max={800} rows={3} {...bind('product.policyText')} />
                </div>
                <p className="ed-note">Each product's own "Material" note is set on the product itself.</p>
              </Card>
            </>
          )}

          {/* ================= HEADER & FOOTER ================= */}
          {tab === 'frame' && (
            <>
              <div className="ed-intro">
                <div>
                  <h2>Header & footer</h2>
                  <p>The thin bar above the menu, and the text in the footer. Logo, phone, email and social links are in Settings.</p>
                </div>
                <Link to="/admin/settings" className="btn btn-outline btn-sm">
                  Open Settings
                </Link>
              </div>
              <TokenTip />

              <Card
                icon={Truck}
                title="Announcement bar"
                desc="Up to three short messages. On phones only the first one shows."
                enabled={on('announcement.enabled')}
                onToggle={(v) => update('announcement.enabled', v)}
                changed={changedAt('announcement')}
                onFocusSection={look('announcement')}
                defaultOpen
              >
                <div className="form-grid">
                  {[0, 1, 2].map((i) => (
                    <Field
                      key={i}
                      full
                      label={`Message ${i + 1}${i ? ' (optional)' : ''}`}
                      max={90}
                      value={(form.announcement?.items || [])[i] || ''}
                      was={(content.announcement?.items || [])[i] || ''}
                      onChange={(v) => {
                        const items = [...(form.announcement?.items || [])];
                        while (items.length <= i) items.push('');
                        items[i] = v;
                        update('announcement.items', items);
                      }}
                    />
                  ))}
                </div>
              </Card>

              <Card icon={Layers} title="Footer" desc="Heading above your phone number in the footer." defaultOpen changed={changedAt('footer')} onFocusSection={look('footer')}>
                <div className="form-grid">
                  <Field label="Contact heading" max={60} placeholder="Got questions?" {...bind('footer.questionsTitle')} />
                </div>
              </Card>
            </>
          )}
        </div>

        {showPreview && <LivePreview draft={form} route={focus.route} section={focus.section} mode={mode} onMode={setMode} dirty={dirty} />}
      </div>

      <div className="form-actions">
        {dirty ? (
          <span className="a-dirty">
            {changes.length} unpublished change{changes.length === 1 ? '' : 's'}
          </span>
        ) : (
          <span className="a-saved">Everything is published</span>
        )}
        <button type="button" className="btn btn-outline" disabled={!dirty || saving} onClick={() => setForm(structuredClone(content))}>
          Discard all
        </button>
        <button type="button" className="btn btn-primary" disabled={!dirty || saving} onClick={openReview}>
          Review &amp; publish
        </button>
      </div>

      {review && <ReviewChanges changes={changes} busy={saving} onClose={() => setReview(false)} onPublish={publish} />}
    </div>
  );
}
