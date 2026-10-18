import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectSettings } from '../../store/settingsSlice';
import { imageUrl } from '../../lib/format';
import { useLogoArt } from '../../lib/logoArt';

/**
 * Just the uploaded logo, trimmed of empty background and set on a plate
 * that contrasts with it, so it reads on light pages, dark pages and photos.
 * Shows the image as uploaded until the trimmed version is ready.
 */
export function LogoImage({ logo, alt, onError }) {
  const art = useLogoArt(logo);
  const style = art ? { '--plate': art.plate, '--ratio': art.ratio } : undefined;
  const cls = art ? (art.opaque ? ' is-opaque' : ` is-${art.tone}`) : ' is-loading';
  return (
    <span className={`logo-plate${cls}`} style={style}>
      <img className="logo-img" src={art?.src || imageUrl(logo)} alt={alt} onError={onError} />
    </span>
  );
}

/**
 * The store logo. Uses the image uploaded in Dashboard -> Settings when there
 * is one, and falls back to a typeset wordmark otherwise (or if it fails).
 */
export default function Logo({ onClick, light = false }) {
  const settings = useSelector(selectSettings);
  const [broken, setBroken] = useState(false);
  const name = settings.storeName || 'Style & Carry';
  const [first, ...restParts] = name.split('&');
  const rest = restParts.join('&');

  return (
    <Link to="/" className={`logo notranslate${light ? ' logo-light' : ''}`} translate="no" aria-label={`${name} home`} onClick={onClick}>
      {settings.logo && !broken ? (
        <LogoImage logo={settings.logo} alt={name} onError={() => setBroken(true)} />
      ) : (
        <>
          <span className="logo-mark" aria-hidden="true">
            S<i>&amp;</i>C
          </span>
          <span className="logo-word">
            {rest ? (
              <>
                {first.trim()} <em>&amp;</em> {rest.trim()}
              </>
            ) : (
              name
            )}
          </span>
        </>
      )}
    </Link>
  );
}
