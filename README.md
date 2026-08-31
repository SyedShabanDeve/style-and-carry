# FOLD&CARRY — storefront

Static storefront for FOLD&CARRY wallets. No build step, no backend, no database.
Orders come in over WhatsApp; payment is cash on delivery.

**Live:** https://syedshabandeve.github.io/foldandcarry/
**TikTok:** https://www.tiktok.com/@foldandcarry1

---

## ⚠️ Do this first: fix the prices

Every price on the site is a **placeholder**. They were picked from typical Pakistani
market rates for imported PU wallets — they are *not* your real prices.

Open `assets/js/app.js` and edit the `price` field on each product in the `PRODUCTS`
array. Prices are plain numbers in rupees, no commas:

```js
{
  slug: 'metro-trifold',
  name: 'Metro Trifold',
  price: 1490,        // <-- change this
  ...
}
```

Everything else on the page — the card, the lightbox, the WhatsApp message — reads
from that one number.

---

## Changing other things

| What | Where |
|---|---|
| Phone number, email, TikTok link | `CONFIG` at the top of `assets/js/app.js` |
| Product names, descriptions, specs | `PRODUCTS` array in `assets/js/app.js` |
| Colours shown as swatches | `colors` field — `['Label', '#hex']` |
| Headline, FAQ, delivery promises | `index.html` |
| Colours, spacing, fonts | `assets/css/style.css` (variables at the top) |

## Adding a new product

1. Drop the photo into `wallet images/` (the folder one level up).
2. Add a line to the `MAP` array in `build-images.js` mapping the filename to a slug.
3. Run `npm install && node build-images.js` — this writes optimised `.webp` files
   into `assets/img/` at two sizes (`slug.webp` full, `slug-sq.webp` square thumbnail).
4. Add an entry to `PRODUCTS` in `assets/js/app.js` using that slug in `imgs`.

## Deploying an update

```bash
git add -A
git commit -m "Update prices"
git push
```

GitHub Pages redeploys automatically, usually within a minute.

---

## Notes worth keeping in mind

- **Product photos are supplier images.** Several of them visibly carry other brands'
  logos (SAVFOX, Baellerry, Balebaily, Pibaosi). That is normal for reselling, but the
  site never claims FOLD&CARRY manufactures them. Once you have your own photos of
  actual stock, swap them in — your own photos convert better anyway.
- **The FAQ says these are PU leather, not genuine leather.** That is deliberate and
  it is what the products are. Don't change it to "genuine leather" — customers who
  find out will charge back and leave reviews saying so.
- **Delivery promises** (free over Rs 2,500, 3–5 days, 7-day exchange) are written into
  `index.html`. Make sure you can actually honour them, or edit them down.

## Structure

```
index.html              one page, all sections
assets/css/style.css    all styles
assets/js/app.js        product data + rendering + lightbox
assets/img/             optimised webp images
build-images.js         regenerates assets/img from the source photos
```
