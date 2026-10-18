/**
 * The one list of image sizes.
 *
 * The dashboard shows these next to every upload box, and the storefront uses
 * the same ratios to frame each image, so a picture uploaded at the size
 * written here fits its slot exactly with nothing cropped.
 */
export const IMAGE_SIZES = {
  heroDesktop: {
    w: 1920,
    h: 800,
    label: 'Hero slide (desktop)',
    note: 'Wide landscape. Keep the main subject in the right half; the headline sits on the left.',
  },
  heroMobile: {
    w: 900,
    h: 1100,
    label: 'Hero slide (phone)',
    note: 'Optional portrait version for phones. Leave empty to reuse the desktop image.',
  },
  banner: {
    w: 1200,
    h: 600,
    label: 'Promo banner',
    note: 'Landscape, 2 : 1. The title is printed over the lower left.',
  },
  category: {
    w: 800,
    h: 800,
    label: 'Category photo',
    note: 'Square. The category name is printed across the top.',
  },
  brand: {
    w: 400,
    h: 200,
    label: 'Brand / partner logo',
    note: 'PNG with a transparent background works best.',
    contain: true,
  },
  feature: {
    w: 900,
    h: 900,
    label: 'Features centre image',
    note: 'Square. Shown inside a circle, so keep the product in the middle.',
  },
  quote: {
    w: 1920,
    h: 900,
    label: 'Quote background',
    note: 'Wide and calm, with space in the middle for the quote. It is darkened so the text stays readable.',
  },
  about: {
    w: 900,
    h: 1100,
    label: 'About us photo',
    note: 'Portrait. Shown beside the About us text on the homepage.',
  },
  product: {
    w: 1200,
    h: 1200,
    label: 'Product photo',
    note: 'Square. Product centred with a little space around it. First photo is the main one.',
  },
  logo: {
    w: 400,
    h: 120,
    label: 'Store logo',
    note: 'PNG with a transparent background. Shown about 40px tall in the header.',
    contain: true,
  },
};

/** "1920 × 800 px" */
export const sizeText = (k) => `${IMAGE_SIZES[k].w} × ${IMAGE_SIZES[k].h} px`;

/** CSS aspect-ratio value for a slot, e.g. "1920 / 800". */
export const ratio = (k) => `${IMAGE_SIZES[k].w} / ${IMAGE_SIZES[k].h}`;

/**
 * Compares an uploaded image with its slot. Returns null when it fits, or a
 * short warning when the shape or size is off enough to matter.
 */
export function checkFit(kind, width, height) {
  const want = IMAGE_SIZES[kind];
  if (!want || !width || !height) return null;
  const wantR = want.w / want.h;
  const gotR = width / height;
  const off = Math.abs(gotR - wantR) / wantR;
  if (off > 0.08) {
    return `This image is ${width} × ${height} px, a different shape from ${want.w} × ${want.h}. Parts of it will be cropped. Upload one at ${want.w} × ${want.h} px for a perfect fit.`;
  }
  if (width < want.w * 0.7) {
    return `This image is ${width} × ${height} px, smaller than ${want.w} × ${want.h}. It may look soft on large screens.`;
  }
  return null;
}
