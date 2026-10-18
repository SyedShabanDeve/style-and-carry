# Style & Carry

Online store for Style & Carry wallets. Customers browse, add to a cart and
check out, paying by cash on delivery or by transfer. You manage products,
orders and store settings from a private admin dashboard.

Two parts, in two folders:

| Folder | What it is | Runs on |
|---|---|---|
| `frontend/` | The shop and the admin dashboard (React + Vite) | port 5174 |
| `backend/` | The API and the database (Node + Express) | port 4000 |

---

## Running it on your computer

You need [Node.js](https://nodejs.org) version 18 or newer. Check with `node -v`.

Open **two** terminals. Leave both running.

**Terminal 1 — the backend:**

```bash
cd backend
npm install
npm run seed     # only the first time: loads the 10 wallets and creates your login
npm start
```

**Terminal 2 — the frontend:**

```bash
cd frontend
npm install
npm run dev
```

Then open **http://localhost:5174**.

> **Important:** do not put this project in a folder whose name contains `&`.
> On Windows the `&` breaks `npm run`, and every command fails with
> "is not recognized as an internal or external command".

---

## Signing in to the dashboard

Go to **http://localhost:5174/admin** (there is also a "Store login" link at the
bottom of every page).

Sign in with the owner email and password set as `ADMIN_EMAIL` and
`ADMIN_PASSWORD` in `backend/.env` (used by `npm run seed` to create the owner).
You can change your name and password any time under **Settings**.

To add more admins, open **Team**, enter their name and email, and send the
invitation. They verify their email from the link, then receive their password
by email and are asked to change it on first sign-in. Only the owner can add or
remove admins.

### About the 10-minute session

For safety, a sign-in lasts **10 minutes** and then expires on its own. This
means a dashboard left open on a shared or lost phone stops working by itself.

- A countdown sits in the bottom-left corner of the dashboard.
- It turns amber at 2 minutes and red at 1 minute.
- At 1 minute a **"Still there?"** box appears. Press **Stay signed in** for a
  fresh 10 minutes.
- **Extend 10 min** in the sidebar does the same thing at any point.
- When it runs out you are returned to the login screen and told why.

To use a different length, open `backend/.env`, change `SESSION_MINUTES`, and
restart the backend.

---

## What you can do in the dashboard

**Dashboard** — revenue, order counts, the last 7 days of sales, best sellers
and recent orders.

**Orders** — every order, filtered by status or searched by order number, name,
phone or city. Change an order's status from the dropdown; the customer sees it
when they track their order. The WhatsApp button opens a chat with that customer
already addressed. Cancelling an order puts its stock back automatically.

**Products** — add, edit, hide and delete wallets. Upload photos by dragging
them in, set prices, a "was" price for a crossed-out discount, stock counts,
colours, specs and features. The switch in the Visible column takes a product
off the shop without deleting it. A live preview shows the card exactly as
customers will see it.

**Settings** — store name, WhatsApp number, email, social links, delivery fee,
the free-delivery threshold, the exchange window, and the payment methods. These
feed straight into what customers see at checkout.

**Categories** — add, rename, hide, reorder and delete categories, each with its
own photo. Watches and Ladies suits are already created. A category only shows
on the shop once it has at least one product. A category that still has
products cannot be deleted; switch it off instead.

**Reviews** — customers write reviews on any product page. Nothing appears on
the shop until you press **Approve**. **Feature** pins a review to the top of
the homepage testimonials. Approved reviews set each product's star rating.

**Subscribers** — emails from the newsletter band above the footer. Copy them
all, or download them as a spreadsheet (CSV).

**Edit website** — every picture and every piece of text on the shop, in five tabs:

- *Hero slides:* the rotating banner at the top. Up to 8 slides, each with its
  own image, phone image, headline, text and button.
- *Homepage sections:* every section in page order, each with a switch to show
  or hide it: trust strip, top sellers, story and categories, features, new
  arrivals, testimonials, questions and the newsletter band.
- *Banners & logos:* the large promo banners, and an optional scrolling strip
  of brand logos.
- *Pages:* the header band on Shop, About, Track order, Wishlist and Checkout,
  the whole About page, and the delivery notes on every product page.
- *Header & footer:* the announcement bar above the menu and the footer text.

Press **Save changes** when you are done. Changes go live straight away.

In any text you can type `{freeDelivery}`, `{deliveryFee}`, `{returnDays}`,
`{phone}` or `{storeName}`. The value from Settings is filled in, so the text
stays correct when you change the delivery fee or exchange days.

While you edit, each changed field shows what is **live now** with an Undo
button, and the preview on the right shows your website with a **Live now /
Your changes** switch. **Review & publish** lists every change, old and new,
before anything goes live.

**Languages & currencies** (Settings) — the globe button in the shop's header
lets shoppers pick any of 98 languages (translated automatically by Google
Translate) and a display currency. Prices are stored, charged and delivered in
Pakistani rupees; other currencies are shown for guidance, and checkout always
states the rupee amount. Press **Update rates now** to fetch fresh exchange
rates, or type them yourself.

The dashboard is drawn slightly smaller on laptops and desktops so each screen
fits without scrolling. Long lists scroll inside their own card.

### Image sizes

Every upload box in the dashboard shows its size, and warns you when a picture
is a different shape or too small. Upload at these sizes and nothing is cropped:

| Image | Size | Where to change it |
|---|---|---|
| Hero slide (desktop) | 1920 × 800 px | Edit website → Hero slides |
| Hero slide (phone, optional) | 900 × 1100 px | Edit website → Hero slides |
| Promo banner | 1200 × 600 px | Edit website → Banners & logos |
| Brand logo | 400 × 200 px, transparent PNG | Edit website → Banners & logos |
| Features centre image | 900 × 900 px | Edit website → Homepage sections |
| Category photo | 800 × 800 px | Categories |
| Product photo | 1200 × 1200 px | Products |
| Store logo | 400 × 120 px, transparent PNG | Settings |

Every image can be JPG, PNG or WebP, up to 4 MB.

---

## Payment methods

Four are built in. Switch them on in **Settings → Payment methods**:

| Method | What the customer does | What you do |
|---|---|---|
| Cash on delivery | Pays the courier in cash | Nothing, the courier collects |
| Bank transfer | Transfers to your account, sends the receipt | Check the account, mark it paid |
| Easypaisa | Sends to your Easypaisa number | Check, mark it paid |
| JazzCash | Sends to your JazzCash number | Check, mark it paid |

Cash on delivery is the only one on to begin with. A transfer method will not
switch on until you have filled in the account it should go to, so a customer
can never be shown a blank account.

**Transfers are confirmed by you, not automatically.** Nothing is charged on the
website and there is no payment gateway. The customer transfers, sends the
receipt on WhatsApp, and you press the coin button on the Orders page to mark it
paid. Until then the order reads "awaiting", so it is obvious what is still
unpaid.

At least one method has to stay switched on, otherwise nobody could check out,
and the dashboard will refuse to save a setup where all four are off.

---

## What customers can do

- Browse all wallets, filter by shape, search and sort. The filters live in the
  web address, so a filtered page can be shared.
- Search the whole shop from the header, with results as they type.
- Filter to items on sale or in stock. Long lists split into pages of 12.
- Open a quick view from any product card without leaving the grid.
- Save products to a wishlist. It is kept in their browser, like the cart.
- Open a wallet to see every photo, pick a colour and a quantity.
- Add things to a cart that survives closing the browser.
- Check out with name, mobile, city and address. Nothing is charged on the site.
- Pay by cash on delivery, bank transfer, Easypaisa or JazzCash, whichever you
  have switched on.
- Track an order later with the order number and the mobile they ordered with.
- Order over WhatsApp instead, at any point.

Every page works on a phone, and the whole site has a dark mode that follows the
phone's own setting. The dashboard is built to fit the screen: the sidebar, the
top bar and the session countdown stay put, and long tables and forms scroll
inside their own panel rather than scrolling the page.

---

## Before you go live

1. **Change the admin password** (Settings, in the dashboard).
2. **Set a real `JWT_SECRET`** in `backend/.env`. Any long random string. This
   signs the admin logins, so leaving the default would let someone forge one.
3. **Check your delivery promises** in Settings. Free delivery over Rs 2,500,
   3 to 5 days, and a 7-day exchange are written into the site. Make sure you
   can honour them or change them.
4. **Fill in your real payment accounts** before switching bank transfer,
   Easypaisa or JazzCash on. Double-check every digit: a wrong account number
   sends your customers' money to someone else.
5. **Replace the product photos when you can.** The current ones come from the
   supplier and several carry other brands' logos (SAVFOX, Baellerry, Balebaily,
   Pibaosi). The site never claims we manufacture them, but your own photos of
   real stock will convert better.
6. **Leave the "PU leather, not genuine leather" wording alone.** It is accurate.
   Customers who discover otherwise leave bad reviews and charge back.

---

## Putting it online

Build the shop into plain files, then let the backend serve them:

```bash
cd frontend
npm run build      # writes frontend/dist

cd ../backend
npm start          # serves the API and the built shop together on port 4000
```

Visit **http://localhost:4000** to check it.

For a real host (Render, Railway, a VPS, Hostinger/cPanel with Node), upload the
whole project (both `frontend` and `backend`), run the same two commands there,
and set these in the host's environment settings:

```
NODE_ENV=production
JWT_SECRET=<a long random string, 64+ characters>
SESSION_MINUTES=10
ADMIN_EMAIL=<your email>
ADMIN_PASSWORD=<your password>
APP_URL=https://yourdomain.com        # used in invitation emails and the sitemap
CORS_ORIGIN=https://yourdomain.com
```

Make a long random secret with:
`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

**The host must keep files between restarts** (a "persistent disk" or a normal
VPS). The store saves orders to `backend/data/db.json` and photos to
`backend/uploads/`; on hosts that wipe the disk on every deploy, these would be lost.

After going live:

1. Sign in at `https://yourdomain.com/admin` and open **Team → Email settings**.
   Enter your Gmail address and a Gmail **App password** (Google Account →
   Security → 2-Step Verification → App passwords), then press **Send test**.
2. Open `https://yourdomain.com/sitemap.xml` to check it, then add the site to
   Google Search Console and submit that sitemap.
3. Place one test order yourself, then delete it from **Orders**.

### Test site on Netlify

A test copy runs at **https://styleandcarry.netlify.app**. The shop is served as
static files and the API runs as one Netlify Function (`backend/netlify/api.mjs`,
which calls `backend/lambda.mjs`). Netlify has no lasting disk, so the database
and uploaded photos are kept in **Netlify Blobs** (stores `shop` and `uploads`).
The test copy has its own data, separate from `backend/data/db.json`.

To deploy an update from this folder (after `npx netlify login` once):

```bash
cd frontend && npm run build && cd ..
# The first deploy of a new site starts from a copy of your local database:
node -e "require('fs').writeFileSync('backend/netlify-seed.mjs','export default '+require('fs').readFileSync('backend/data/db.json','utf8'))"
npx netlify deploy --prod --no-build --dir frontend/dist --functions backend/netlify
```

`backend/netlify-seed.mjs` holds your password hash, so it is not in git. It is
only used while the `shop` blob store is empty; later deploys keep the test
site's own orders and settings. The site's environment variables (`NODE_ENV`,
`JWT_SECRET`, `SESSION_MINUTES`, `APP_URL`, `SITE_NOINDEX=1`) are set in the
Netlify dashboard under Project configuration → Environment variables.
`SITE_NOINDEX=1` keeps the test copy out of Google.

**The owner account cannot be lost.** With `OWNER_EMAIL`, `OWNER_NAME` and
`OWNER_PASSWORD_HASH` (a bcrypt hash, never the password itself) set on the
host, every time the data loads the server makes sure that account exists, is
active and is the owner, recreating it if it was ever deleted. The password
hash is only used when the account has to be recreated, so a password changed
in Settings stays changed. Make a hash with:
`node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" "your password"`
(run inside `backend`).

If you host the shop separately from the API (for example the shop on Netlify
and the API on Render), set `VITE_API_URL` to the API's address when building
the frontend, and list the shop's address in `CORS_ORIGIN`.

---

## Backups (Dashboard -> Backup, owner only)

- **Download full backup** saves a zip to your computer: `store-data.json`
  (products, categories, homepage, settings, admins, orders, reviews,
  subscribers) plus every uploaded photo. The saved email password is never
  in the file.
- **Reminder:** when no backup was downloaded in the last 7 days the dashboard
  shows "Backup needed" (top bar, bell, a "!" on Backup, a banner on phones).
- **Server copies:** a copy is kept automatically every week (the
  `weekly-backup` scheduled function on Netlify, and whenever the owner opens
  the dashboard), on request, and just before every restore. The newest 12 are
  kept, in the `backups` Blobs store (on a normal server: `backend/data/snapshots`).
- **Restore** from a downloaded zip or a server copy puts everything back,
  including missing photos under their original names. A copy of the store as
  it was is saved first, so a restore can be undone.

## Where things are kept

Orders, products, settings and your login live in **`backend/data/db.json`**.
Uploaded photos live in **`backend/uploads/`**.

**Back both up.** Copying those two is a complete backup of the store. Neither
is committed to git, so they will not be overwritten by an update.

To reset the catalogue back to the original 10 wallets:

```bash
cd backend
npm run seed -- --force     # replaces products and settings; orders are untouched
```

---

## Notes for whoever maintains this

- Prices and totals are recalculated on the server from the database. Whatever
  the browser sends for money is ignored, so a tampered cart cannot change what
  an order is worth.
- Stock is reduced when an order is placed and returned if it is cancelled or
  deleted, so two people cannot buy the same last item.
- The admin token is kept in `sessionStorage`, not `localStorage`, so closing
  the tab ends the session.
- Order tracking needs both the order number and the matching mobile number, so
  order numbers alone cannot be used to read someone else's address.
- Sign-in attempts are rate limited (12 per 10 minutes), as is order placing
  (20 per hour per connection).
- The frontend loads checkout and the whole admin area only when they are
  opened, so a first-time shopper never downloads the dashboard.
