import { useState, useEffect } from 'react';
import { imageUrl, PLACEHOLDER_IMG } from '../../lib/format';

/**
 * A product photo that never shows a broken-image icon.
 *
 * Missing names and failed loads both fall back to the neutral placeholder,
 * and the frame keeps its aspect ratio whatever size the source file is.
 */
export default function ProductImage({
  name,
  square = false,
  alt = '',
  className = '',
  width = 600,
  height = 600,
  loading = 'lazy',
  priority = false,
  ...rest
}) {
  const src = imageUrl(name, square);
  const [failed, setFailed] = useState(false);

  // A different product reuses the element; give its photo a fresh chance.
  useEffect(() => setFailed(false), [src]);

  return (
    <img
      src={failed ? PLACEHOLDER_IMG : src}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading={priority ? 'eager' : loading}
      decoding="async"
      {...(priority ? { fetchpriority: 'high' } : {})}
      onError={() => !failed && setFailed(true)}
      {...rest}
    />
  );
}
