import { useSelector } from 'react-redux';

import HeroSlider from '../components/home/HeroSlider';
import {
  SectionTitle,
  BrandStrip,
  PromoBanners,
  Testimonials,
} from '../components/home/Sections';
import {
  HeroSearch,
  CategoryRow,
  FeaturedBand,
  FeatureCards,
  OffersBand,
  QuoteBand,
  AboutSplit,
  Gallery,
} from '../components/home/SalonSections';
import ProductGrid from '../components/shop/ProductGrid';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import {
  selectFeatured,
  selectLiveProducts,
  selectCategories,
  selectNewest,
  selectOnSale,
} from '../store/productsSlice';
import { selectContent, selectContentStatus, useFill, isOn } from '../store/contentSlice';
import { selectSettings } from '../store/settingsSlice';
import { ArrowRight, Truck, Shield, Refresh, Package, Alert } from '../components/ui/Icons';

const TRUST_ICONS = [Truck, Package, Refresh, Shield];

/** Four short promises under the hero, shown when there are no brand logos. */
function TrustStrip({ trust, fill }) {
  const items = trust?.items || [];
  if (!isOn(trust) || !items.length) return null;
  return (
    <section className="trust" aria-label="Why shop with us" data-section="trust">
      <div className="wrap trust-in" style={{ '--cols': Math.min(items.length, 4) }}>
        {items.map((it, i) => {
          const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
          return (
            <div key={i}>
              <Icon size={20} />
              <span>
                <strong>{fill(it.title)}</strong>
                {it.text && <small>{fill(it.text)}</small>}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Home() {
  const featured = useSelector(selectFeatured);
  const all = useSelector(selectLiveProducts);
  const categories = useSelector(selectCategories);
  const newest = useSelector(selectNewest);
  const onSale = useSelector(selectOnSale);
  const status = useSelector((s) => s.products.status);
  const content = useSelector(selectContent);
  const contentStatus = useSelector(selectContentStatus);
  const settings = useSelector(selectSettings);
  const cur = settings.currency || 'Rs';
  const fill = useFill();
  const top = content.topSellers || {};
  const fresh_ = content.newArrivals || {};
  const faqHead = content.faqSection || {};
  const loading = status === 'loading' || status === 'idle';

  const slides = (content.heroSlides || []).filter((s) => s.active !== false && s.image);
  const banners = content.banners || [];
  const topBanners = banners.filter((b) => b.position !== 'bottom');
  const bottomBanners = banners.filter((b) => b.position === 'bottom');
  const story = content.story || {};
  const faqs = content.faqs || [];

  const featuredIds = new Set(featured.map((p) => p.id));
  const fresh = newest.filter((p) => !featuredIds.has(p.id)).slice(0, 4);

  return (
    <>
      {/* ---------- hero, with the search panel on its lower edge ---------- */}
      <div className="hero-zone">
        {slides.length ? (
          <HeroSlider slides={slides} />
        ) : contentStatus === 'loading' || contentStatus === 'idle' ? (
          <div className="hs hs-skel" aria-busy="true">
            <Skeleton h="100%" r={0} />
          </div>
        ) : null}
        {isOn(content.heroSearch) && categories.length > 0 && (
          <HeroSearch categories={categories} button={fill(content.heroSearch?.button) || 'Search'} />
        )}
      </div>

      {content.brands?.length ? <BrandStrip brands={content.brands} /> : <TrustStrip trust={content.trust} fill={fill} />}

      {status === 'error' && (
        <div className="wrap section-sm">
          <EmptyState
            icon={Alert}
            tone="error"
            title="We could not load the collection"
            action={
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try again
              </Button>
            }
          >
            Check your connection and refresh the page. You can still order on WhatsApp.
          </EmptyState>
        </div>
      )}

      {/* ---------- categories ---------- */}
      {isOn(content.categorySection) && <CategoryRow categories={categories} heading={content.categorySection || {}} />}

      {/* ---------- top sellers ---------- */}
      {isOn(top) && (loading || featured.length > 0) && (
        <section className="section" data-section="topSellers">
          <div className="wrap">
            <SectionTitle eyebrow={fill(top.eyebrow ?? 'Loved by our customers')} title={fill(top.title || 'Top Sellers')} />
            <div className="rv rv-stagger">
              <ProductGrid products={featured} loading={loading} currency={cur} skeletonCount={6} cols={3} />
            </div>
            <div className="center-act rv">
              <Button to="/shop" variant="outline">
                {fill(top.button || 'Explore all products')} <ArrowRight />
              </Button>
            </div>
          </div>
        </section>
      )}

      <PromoBanners banners={topBanners} section="bannersTop" />

      {/* ---------- featured band ---------- */}
      {isOn(story) && <FeaturedBand story={story} products={featured.length ? featured : all} />}

      {/* ---------- promise cards ---------- */}
      {isOn(content.features) && <FeatureCards features={content.features} />}

      {/* ---------- special offers ---------- */}
      {isOn(content.offers) && <OffersBand offers={content.offers || {}} products={onSale.slice(0, 10)} />}

      {/* ---------- quote ---------- */}
      {isOn(content.quote) && <QuoteBand quote={content.quote} />}

      {/* ---------- about us ---------- */}
      {isOn(content.aboutSection) && <AboutSplit about={content.aboutSection || {}} />}

      {/* ---------- new arrivals ---------- */}
      {isOn(fresh_) && fresh.length > 0 && (
        <section className="section section-alt" data-section="newArrivals">
          <div className="wrap">
            <SectionTitle eyebrow={fill(fresh_.eyebrow ?? 'Just in')} title={fill(fresh_.title || 'New Arrivals')} />
            <div className="rv rv-stagger">
              <ProductGrid products={fresh} currency={cur} />
            </div>
            <div className="center-act rv">
              <Button to="/shop?sort=newest" variant="outline">
                {fill(fresh_.button || 'Shop new in')} <ArrowRight />
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ---------- gallery ---------- */}
      {isOn(content.gallery) && <Gallery gallery={content.gallery || {}} products={all} />}

      {isOn(content.testimonials) && <Testimonials heading={content.testimonials} />}

      <PromoBanners banners={bottomBanners} section="bannersBottom" />

      {/* ---------- faq ---------- */}
      {isOn(faqHead) && faqs.length > 0 && (
        <section className="section" id="faq" data-section="faq">
          <div className="wrap wrap-narrow">
            <SectionTitle eyebrow={fill(faqHead.eyebrow ?? 'Good to know')} title={fill(faqHead.title || 'Questions People Ask')} />
            <div className="faq rv">
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{fill(f.q)}</summary>
                  <p>{fill(f.a)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
