import { useSelector } from 'react-redux';

import Button from '../components/ui/Button';
import PageHead from '../components/layout/PageHead';
import { selectSettings } from '../store/settingsSlice';
import { selectContent, useFill } from '../store/contentSlice';
import { whatsappLink } from '../lib/format';
import { Whatsapp, Truck, Refresh, Shield, ArrowRight } from '../components/ui/Icons';

const POINT_ICONS = [Truck, Shield, Refresh, Whatsapp];

/** Every word on this page is edited in Dashboard -> Website -> Pages. */
export default function About() {
  const s = useSelector(selectSettings);
  const content = useSelector(selectContent);
  const fill = useFill();
  const about = content.about || {};
  const paragraphs = fill(about.body || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const points = about.points || [];
  const faqs = about.faqs || [];

  return (
    <>
      <PageHead page="about" narrow fallback={{ title: `About ${s.storeName || 'Style & Carry'}` }} />

      <div className="wrap wrap-narrow shop">
        {(about.heading || paragraphs.length > 0) && (
          <div className="prose rv" data-section="aboutStory">
            {about.heading && <h2>{fill(about.heading)}</h2>}
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}

        {points.length > 0 && (
          <ul className="about-points rv" data-section="aboutPoints" style={{ '--cols': Math.min(points.length, 4) }}>
            {points.map((pt, i) => {
              const Icon = POINT_ICONS[i % POINT_ICONS.length];
              return (
                <li key={i}>
                  <Icon size={20} />
                  <strong>{fill(pt.title)}</strong>
                  {pt.text && <span>{fill(pt.text)}</span>}
                </li>
              );
            })}
          </ul>
        )}

        {faqs.length > 0 && (
          <>
            <h2 className="about-h2 rv" id="faq" data-section="aboutFaq">
              {fill(about.faqTitle) || 'Questions and answers'}
            </h2>
            <div className="faq rv">
              {faqs.map((f) => (
                <details key={f.q}>
                  <summary>{fill(f.q)}</summary>
                  <p>{fill(f.a)}</p>
                </details>
              ))}
            </div>
          </>
        )}
      </div>

      {(about.ctaTitle || about.ctaText) && (
        <section className="section-end">
          <div className="wrap">
            <div className="band rv" data-section="aboutCta">
              {about.ctaTitle && <h2>{fill(about.ctaTitle)}</h2>}
              {about.ctaText && <p>{fill(about.ctaText)}</p>}
              <div className="band-act">
                <Button to="/shop" variant="accent" size="lg">
                  {about.ctaButton || 'Shop now'} <ArrowRight />
                </Button>
                <Button href={whatsappLink(s)} external variant="outline" size="lg" className="on-dark">
                  <Whatsapp /> WhatsApp us
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
