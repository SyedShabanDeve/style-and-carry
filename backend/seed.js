/**
 * Seeds the store with the launch catalogue, the default admin user and the
 * store settings. Safe to re-run: it only writes collections that are empty,
 * unless you pass --force, which wipes products and settings back to these
 * values (orders are never touched).
 */
import bcrypt from 'bcryptjs';
import { read, write, uid } from './db.js';
import { SETTINGS } from './defaults.js';
import 'dotenv/config';

const force = process.argv.includes('--force');

/* Colour hexes approximate the actual stock colours. */
export const PRODUCTS = [
  {
    slug: 'metro-trifold',
    name: 'Metro Trifold',
    category: 'trifold',
    price: 1190,
    compareAt: 1590,
    stock: 24,
    badge: 'Bestseller',
    description:
      'Compact trifold with a steel snap closure. Opens flat, stays slim in the back pocket.',
    images: ['metro-trifold-1', 'metro-trifold-4', 'metro-trifold-3', 'metro-trifold-2'],
    colors: [['Tan', '#a9713f'], ['Dark Brown', '#5b3b28'], ['Black', '#1b1b1b'], ['Olive', '#4a4429']],
    specs: ['Snap close', '6 card slots', 'Coin pocket'],
    features: [
      'Steel press-stud closure that holds shut even when full',
      '6 card slots, 2 note compartments and a zipped coin pocket',
      'Soft PU leather with contrast stitching',
      'Approx. 11 x 9 x 2.5 cm folded',
      'Available in 4 colours',
    ],
  },
  {
    slug: 'voyager-long',
    name: 'Voyager Long Wallet',
    category: 'long',
    price: 1390,
    compareAt: 1890,
    stock: 15,
    badge: 'Big capacity',
    description:
      'Full-length wallet with a detachable wrist strap. Notes go in flat, so no folding and no creases.',
    images: ['voyager-long-3', 'voyager-long-1', 'voyager-long-2', 'executive-long-1'],
    colors: [['Brown', '#4a352a'], ['Black', '#17171a']],
    specs: ['Zip close', '12+ card slots', 'Wrist strap'],
    features: [
      'Zip closure runs the full length so nothing falls out',
      '12 card slots, 2 full-length note sleeves and SIM pockets',
      'Detachable leather wrist strap included',
      'Approx. 19.5 x 10 x 3.5 cm',
      'Textured PU leather with metal corner trim',
      'Available in brown and black',
    ],
  },
  {
    slug: 'safari-trifold',
    name: 'Safari Trifold',
    category: 'trifold',
    price: 1090,
    compareAt: 1450,
    stock: 18,
    badge: null,
    description:
      'Two-tone trifold with a croc-textured side panel. Snap closure and generous card space.',
    images: ['safari-trifold-1'],
    colors: [['Dark Brown', '#4e3a2e'], ['Tan', '#a56b3c'], ['Navy', '#2c3340']],
    specs: ['Snap close', 'Croc panel', '3 colours'],
    features: [
      'Contrast croc-embossed panel across the front',
      'Press-stud closure keeps the fold tight',
      'Multi-layer card slots with a centre note sleeve',
      'Approx. 11.5 x 9.5 x 3 cm folded',
      'Available in 3 colours',
    ],
  },
  {
    slug: 'heritage-trifold',
    name: 'Heritage Trifold',
    category: 'trifold',
    price: 1090,
    compareAt: 1450,
    stock: 12,
    badge: null,
    description:
      'Clean trifold with a tan leather header tab. Deep fold, holds a thick stack of notes.',
    images: ['heritage-trifold-1'],
    colors: [['Tan', '#a3653a'], ['Navy', '#2b3242'], ['Brown', '#5d4436']],
    specs: ['Snap close', 'Deep fold', '3 colours'],
    features: [
      'Contrast tan header tab across the top',
      'Extra-deep fold that takes a full stack of notes',
      'Press-stud closure',
      'Smooth matte PU leather with tan contrast stitch',
      'Available in 3 colours',
    ],
  },
  {
    slug: 'crest-bifold',
    name: 'Crest Bifold',
    category: 'bifold',
    price: 990,
    compareAt: 1350,
    stock: 20,
    badge: null,
    description:
      'Bifold with a croc-textured crest patch and a red woven tag. Everyday size.',
    images: ['crest-bifold-1'],
    colors: [['Navy', '#2a3140'], ['Tan', '#a5683a'], ['Brown', '#54423a']],
    specs: ['Snap close', 'Croc patch', '3 colours'],
    features: [
      'Croc-embossed crest patch with a red woven tag',
      'Snap-stud closure on the fold',
      'Card slots on both wings plus a note sleeve',
      'Approx. 11.5 x 9.5 cm folded',
      'Available in 3 colours',
    ],
  },
  {
    slug: 'pillar-bifold',
    name: 'Pillar Bifold',
    category: 'bifold',
    price: 990,
    compareAt: 1350,
    stock: 16,
    badge: null,
    description:
      'Bifold with a tall croc-textured column inlay. Understated, and it holds its shape.',
    images: ['pillar-bifold-1'],
    colors: [['Black', '#1e1e20'], ['Tan', '#a76c3f'], ['Brown', '#584438']],
    specs: ['Snap close', 'Croc inlay', '3 colours'],
    features: [
      'Vertical croc-embossed inlay panel',
      'Press-stud closure',
      'Layered card slots with a full note sleeve',
      'Structured build that keeps its shape when empty',
      'Available in 3 colours',
    ],
  },
  {
    slug: 'monogram-bifold',
    name: 'Monogram Bifold',
    category: 'bifold',
    price: 890,
    compareAt: 1200,
    stock: 22,
    badge: 'Slimmest',
    description:
      'Soft suede-finish bifold with a debossed laurel monogram. The slimmest one we carry.',
    images: ['monogram-bifold-1'],
    colors: [['Taupe', '#6b5952'], ['Camel', '#b98a5c'], ['Grey', '#93999b']],
    specs: ['Slim', 'Suede finish', '3 colours'],
    features: [
      'Soft suede-touch finish with no bulk in the pocket',
      'Debossed laurel monogram on the front',
      'Classic horizontal bifold with card slots both sides',
      'Approx. 11 x 9.5 x 1.5 cm folded',
      'Available in 3 colours',
    ],
  },
  {
    slug: 'monogram-trifold',
    name: 'Monogram Trifold',
    category: 'trifold',
    price: 990,
    compareAt: 1320,
    stock: 14,
    badge: null,
    description:
      'The Monogram in a taller vertical cut. More card space, same suede finish.',
    images: ['monogram-trifold-1'],
    colors: [['Taupe', '#6d5b54'], ['Camel', '#bb8d5f'], ['Grey', '#959b9d']],
    specs: ['Vertical', 'Suede finish', '3 colours'],
    features: [
      'Vertical trifold with more card slots than the bifold',
      'Same soft suede-touch finish and laurel monogram',
      'Fits comfortably in a jacket or front pocket',
      'Approx. 9.5 x 12 x 2 cm folded',
      'Available in 3 colours',
    ],
  },
  {
    slug: 'essential-bifold',
    name: 'Essential Bifold',
    category: 'bifold',
    price: 890,
    compareAt: 1250,
    stock: 30,
    badge: 'Best value',
    description:
      'No patches, no logos, no fuss. A plain bifold that does exactly one job well, and it arrives in a gift box.',
    images: ['essential-bifold-1', 'essential-bifold-2'],
    colors: [['Black', '#181818'], ['Dark Brown', '#3d2b22'], ['Tan', '#9e6134']],
    specs: ['Plain', 'Gift box', '3 colours'],
    features: [
      'Completely plain front with no visible branding',
      'Arrives in a black gift box, ready to give',
      'Clear ID window plus 6 card slots',
      'Two full-length note compartments',
      'Smooth finish with tan contrast stitching',
      'Available in black, dark brown and tan',
    ],
  },
  {
    slug: 'bloom-card',
    name: 'Bloom Card Wallet',
    category: 'card',
    price: 570,
    compareAt: 790,
    stock: 26,
    badge: 'Gift pick',
    description:
      'Small zip-around card wallet with a printed character front. Popular as a gift.',
    images: ['bloom-card-1'],
    colors: [['Print', '#e6b9c8']],
    specs: ['Zip around', 'Compact', 'Gift'],
    features: [
      'Zip-around closure so nothing slips out',
      'Concertina card slots plus a coin section',
      'Gold-tone zip pull',
      'Approx. 11 x 8 x 2.5 cm',
      'Printed design with a wipe-clean finish',
    ],
  },
];

export { SETTINGS };

function run() {
  const db = read();
  const now = new Date().toISOString();

  if (force || db.products.length === 0) {
    db.products = PRODUCTS.map((p, i) => ({
      id: uid('prd'),
      ...p,
      active: true,
      sortOrder: i,
      createdAt: now,
      updatedAt: now,
    }));
    console.log(`  products  -> ${db.products.length} seeded`);
  } else {
    console.log(`  products  -> ${db.products.length} kept (use --force to reset)`);
  }

  if (force || !db.settings || Object.keys(db.settings).length === 0) {
    db.settings = { ...SETTINGS };
    console.log('  settings  -> reset to defaults');
  } else {
    console.log('  settings  -> kept');
  }

  if (db.users.length === 0) {
    const username = (process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || 'admin').toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'StyleCarry@2026';
    db.users = [
      {
        id: uid('usr'),
        username,
        email: username.includes('@') ? username : '',
        name: process.env.ADMIN_NAME || 'Store Owner',
        role: 'owner',
        status: 'active',
        passwordHash: bcrypt.hashSync(password, 10),
        createdAt: now,
      },
    ];
    console.log(`  admin     -> ${username} / ${password}`);
    console.log('               change this in backend/.env, then re-seed');
  } else {
    console.log(`  admin     -> ${db.users.length} user(s) kept`);
  }

  if (!db.counters) db.counters = { order: 1000 };

  write(db);
  console.log('\nSeed complete.\n');
}

run();
