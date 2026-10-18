import { useSelector } from 'react-redux';
import { selectContent, useFill } from '../../store/contentSlice';

/**
 * The cream header band at the top of inner pages. Its text comes from
 * Dashboard -> Website -> Pages; `fallback` covers the first paint.
 * `title`/`text` props override the dashboard (the shop uses them for a
 * category name).
 */
export default function PageHead({ page, fallback = {}, title, text, narrow = false, children }) {
  const content = useSelector(selectContent);
  const fill = useFill();
  const saved = content.pages?.[page] || {};
  const eyebrow = fill(saved.eyebrow ?? fallback.eyebrow);
  const heading = title || fill(saved.title || fallback.title);
  const body = text || fill(saved.text ?? fallback.text);

  return (
    <div className="page-head" data-section="pageHead">
      <div className={`wrap${narrow ? ' wrap-narrow' : ''}`}>
        {children}
        {eyebrow && <span className="st-eyebrow">{eyebrow}</span>}
        <h1>{heading}</h1>
        {body && <p>{body}</p>}
      </div>
    </div>
  );
}
