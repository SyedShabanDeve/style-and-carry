/**
 * Default store settings.
 *
 * These are merged UNDER whatever is already saved, so an upgrade picks up new
 * keys without overwriting anything the owner has set. Shared by the seeder and
 * by db.js, which applies the merge on every read.
 */
export const SETTINGS = {
  storeName: 'Style & Carry',
  tagline: 'Wallets that carry well',
  phone: '923079415512',
  phoneDisplay: '0307 9415512',
  email: 'syedshaban330@gmail.com',
  tiktok: 'https://www.tiktok.com/@foldandcarry1',
  instagram: '',
  currency: 'Rs',
  deliveryFee: 200,
  freeDeliveryOver: 2500,
  announcement: 'Cash on delivery all over Pakistan · Free delivery over Rs 2,500',
  returnDays: 7,

  /* Footer contact block and the header logo. The logo is optional: without
     one, the site shows the store name as a wordmark. */
  address: '',
  hours: 'Mon to Sat, 11am to 9pm',
  logo: '',

  /* Language and currency pickers in the header. Prices are stored and
     charged in Pakistani rupees; other currencies are shown for guidance,
     converted at these rates (1 PKR = rate). Rates from open.er-api.com,
     25 Sep 2026; refresh them from Dashboard -> Settings. */
  showLanguagePicker: true,
  showCurrencyPicker: true,
  ratesUpdatedAt: '2026-09-25T00:02:31.000Z',
  currencies: [
    { code: 'PKR', rate: 1, enabled: true },
    { code: 'USD', rate: 0.003605, enabled: true },
    { code: 'EUR', rate: 0.003168, enabled: true },
    { code: 'GBP', rate: 0.002726, enabled: true },
    { code: 'AED', rate: 0.01324, enabled: true },
    { code: 'SAR', rate: 0.013519, enabled: true },
    { code: 'CAD', rate: 0.005093, enabled: true },
    { code: 'AUD', rate: 0.005136, enabled: true },
    { code: 'QAR', rate: 0.013123, enabled: false },
    { code: 'KWD', rate: 0.001111, enabled: false },
    { code: 'OMR', rate: 0.001386, enabled: false },
    { code: 'BHD', rate: 0.001356, enabled: false },
    { code: 'INR', rate: 0.344929, enabled: false },
    { code: 'BDT', rate: 0.44316, enabled: false },
    { code: 'CNY', rate: 0.024223, enabled: false },
    { code: 'MYR', rate: 0.014709, enabled: false },
    { code: 'TRY', rate: 0.17598, enabled: false },
    { code: 'JPY', rate: 0.571876, enabled: false },
  ],

  /* Cash on delivery is the only one on by default. Fill in the account
     details from the dashboard, then switch the others on. */
  codEnabled: true,
  bankEnabled: false,
  bankName: '',
  bankAccountTitle: '',
  bankAccountNumber: '',
  bankIban: '',
  easypaisaEnabled: false,
  easypaisaNumber: '',
  easypaisaName: '',
  jazzcashEnabled: false,
  jazzcashNumber: '',
  jazzcashName: '',
};

/** Text shown in each product's "Material" section unless the owner changes it. */
export const DEFAULT_MATERIAL =
  'PU leather, not genuine leather. We would rather tell you now than have you find out later. It looks close to leather and holds up well to daily use.';

/**
 * Starting categories. The owner can rename them, change their photos, hide
 * them, or add new ones (watches, ladies suits, anything) from the dashboard.
 */
export const CATEGORIES = [
  { key: 'bifold', name: 'Bifold', description: 'Classic and slim' },
  { key: 'trifold', name: 'Trifold', description: 'More card space' },
  { key: 'long', name: 'Long wallets', description: 'Notes lie flat' },
  { key: 'card', name: 'Card wallets', description: 'Smallest of all' },
  { key: 'watches', name: 'Watches', description: 'Everyday and dress watches' },
  { key: 'ladies-suits', name: 'Ladies suits', description: 'Stitched and unstitched' },
];

/**
 * Homepage content, all editable from Dashboard -> Homepage. Images point at
 * files already in the site so the page looks complete on day one; the owner
 * replaces them with properly sized banners from the dashboard.
 */
export const CONTENT = {
  heroSlides: [
    {
      id: 'hero_1',
      image: '/img/metro-trifold-1.webp',
      mobileImage: '',
      eyebrow: 'Discover a new',
      title: 'Everyday Wallets',
      text: 'Slim, structured wallets with cash on delivery anywhere in Pakistan.',
      ctaLabel: 'Explore the range',
      ctaLink: '/shop',
      active: true,
    },
    {
      id: 'hero_2',
      image: '/img/voyager-long-3.webp',
      mobileImage: '',
      eyebrow: 'Made to carry more',
      title: 'Long Wallets',
      text: 'Notes lie flat, cards stay organised, and everything zips shut.',
      ctaLabel: 'Shop long wallets',
      ctaLink: '/shop?category=long',
      active: true,
    },
    {
      id: 'hero_3',
      image: '/img/monogram-bifold-1.webp',
      mobileImage: '',
      eyebrow: 'Gifts they will use',
      title: 'Bifold Classics',
      text: 'Clean, slim designs that fit any pocket and any budget.',
      ctaLabel: 'Shop bifold',
      ctaLink: '/shop?category=bifold',
      active: true,
    },
  ],
  brands: [],
  banners: [
    {
      id: 'ban_1',
      image: '/img/essential-bifold-1.webp',
      eyebrow: 'Everyday essentials',
      title: 'Bifold wallets',
      link: '/shop?category=bifold',
      position: 'top',
    },
    {
      id: 'ban_2',
      image: '/img/voyager-long-2.webp',
      eyebrow: 'Gift ready',
      title: 'Long wallets',
      link: '/shop?category=long',
      position: 'top',
    },
  ],
  story: {
    eyebrow: 'Made with care in Pakistan',
    title: 'The Style & Carry Collection',
    text: 'A small Pakistani store selling things we would carry ourselves. Every order is checked by hand before it leaves us, and delivered anywhere in the country with cash on delivery.',
  },
  features: {
    eyebrow: 'Why shop with us',
    title: 'Our Promise',
    image: '/img/essential-bifold-2.webp',
    items: [
      { title: 'Cash on delivery', text: 'Pay the courier when your parcel arrives. Nothing to pay online.' },
      { title: 'Delivered nationwide', text: 'Three to five working days to most cities in Pakistan.' },
      { title: 'Checked by hand', text: 'Every order is inspected before it is packed and sent.' },
      { title: 'Easy exchange', text: 'Unused and in its packaging? Message us and we will swap it.' },
      { title: 'Honest descriptions', text: 'Materials are clearly labelled, so there are no surprises.' },
      { title: 'Real support', text: 'A real person answers on WhatsApp, usually within hours.' },
    ],
  },
  testimonials: {
    eyebrow: 'What our customers say',
    title: 'Testimonials',
  },
  newsletter: {
    enabled: true,
    title: 'Newsletter signup',
    text: 'New arrivals and offers, once in a while. No spam.',
  },
  /* Text anywhere below may use these tokens, filled in from Settings:
     {freeDelivery} {deliveryFee} {returnDays} {phone} {storeName} */
  announcement: {
    enabled: true,
    items: ['Cash on delivery all over Pakistan', 'Free delivery over {freeDelivery}', '{returnDays}-day exchange'],
  },
  trust: {
    enabled: true,
    items: [
      { title: 'Cash on delivery', text: 'Pay the courier at your door' },
      { title: 'Free over {freeDelivery}', text: 'Flat {deliveryFee} below that' },
      { title: '{returnDays}-day exchange', text: 'If it is unused' },
      { title: 'Checked before dispatch', text: 'Every single order' },
    ],
  },
  topSellers: {
    enabled: true,
    eyebrow: 'Loved by our customers',
    title: 'Top Sellers',
    button: 'Explore all products',
  },
  newArrivals: {
    enabled: true,
    eyebrow: 'Just in',
    title: 'New Arrivals',
    button: 'Shop new in',
  },
  faqSection: {
    enabled: true,
    eyebrow: 'Good to know',
    title: 'Questions People Ask',
  },
  pages: {
    shop: {
      eyebrow: '',
      title: 'Shop all',
      text: 'Everything we carry, in one place. No hidden costs, and you pay on delivery.',
    },
    about: {
      eyebrow: 'Our story',
      title: 'About {storeName}',
      text: 'A small Pakistani store selling things we would carry and wear ourselves, at prices that make sense.',
    },
    track: {
      eyebrow: '',
      title: 'Track your order',
      text: 'Enter the order number we gave you and the mobile number you ordered with.',
    },
    wishlist: {
      eyebrow: '',
      title: 'Your wishlist',
      text: 'Products you have saved on this device. Add them to your cart whenever you are ready.',
    },
    checkout: {
      eyebrow: 'Almost there',
      title: 'Checkout',
      text: 'Fill in where it should go, then choose how you would like to pay. Nothing is charged on this website.',
    },
  },
  about: {
    heading: 'What we do',
    body: 'We source everyday wallets, accessories and clothing, check each order before it goes out, and deliver across Pakistan with cash on delivery. That is the whole business. We are not a factory and we do not pretend to be one.\n\nYou can see everything we carry on the shop page, with the colours we actually have in stock.\n\nIf something is wrong with your order, message us on WhatsApp. One person reads those messages and that person will fix it.',
    points: [
      { title: 'Nationwide delivery', text: '3 to 5 working days' },
      { title: 'Cash on delivery', text: 'Pay when it arrives' },
      { title: '{returnDays}-day exchange', text: 'Unused, in packaging' },
      { title: 'Real support', text: '{phone}' },
    ],
    faqTitle: 'Questions and answers',
    faqs: [
      {
        q: 'Are the wallets genuine leather?',
        a: 'No. Every wallet we sell is PU leather, which is a synthetic material. It looks close to leather and wears well, but it is not the real thing, and we would rather say so here than have you find out after it arrives.',
      },
      {
        q: 'How do I pay?',
        a: 'Cash on delivery: the courier collects the money when the parcel reaches you. Where offered, you can also pay by bank transfer, Easypaisa or JazzCash at checkout. We never ask for a card number, PIN or OTP.',
      },
      {
        q: 'What does delivery cost?',
        a: 'Free on orders over {freeDelivery}. Below that it is a flat {deliveryFee}, added on the order summary before you confirm.',
      },
      {
        q: 'How long will it take?',
        a: 'Three to five working days to most cities in Pakistan. Smaller towns can take a little longer. We confirm every order on WhatsApp before it goes out.',
      },
      {
        q: 'Can I exchange it?',
        a: 'Yes, within {returnDays} days of delivery, as long as the item is unused and still in its original packaging. Message us on WhatsApp and we will arrange it.',
      },
      {
        q: 'Do the photos show the actual product?',
        a: 'Some photos come from our suppliers and carry other brands’ markings. What arrives is the same product in the same colour. As we photograph our own stock we are replacing these.',
      },
      { q: 'Do you deliver outside Pakistan?', a: 'Not yet. Right now we ship within Pakistan only.' },
    ],
    ctaTitle: 'Ready when you are',
    ctaText: 'Pick something you like, or ask us anything first. Both are fine.',
    ctaButton: 'Shop now',
  },
  product: {
    deliveryTitle: 'Delivery in 3 to 5 working days',
    deliveryText: 'Anywhere in Pakistan. You pay the courier when it arrives.',
    exchangeTitle: '{returnDays}-day exchange',
    exchangeText: 'If it is unused and still in its packaging.',
    policyText:
      'Delivered in 3 to 5 working days to most cities. Free delivery on orders over {freeDelivery}, otherwise a flat {deliveryFee}. Message us within {returnDays} days of delivery to exchange an unused item.',
  },
  footer: {
    questionsTitle: 'Got questions?',
  },
  heroSearch: {
    enabled: true,
    button: 'Search',
  },
  categorySection: {
    enabled: true,
    eyebrow: 'Shop by category',
    title: 'Category',
    text: 'Find the right piece for the way you carry, every day.',
  },
  offers: {
    enabled: true,
    eyebrow: 'Limited time',
    title: 'Special Offers',
    text: 'Our best prices on selected styles, while stock lasts.',
    button: 'Shop all offers',
  },
  quote: {
    enabled: true,
    text: 'Carry less. Carry better.',
    author: 'The {storeName} promise',
    image: '/img/voyager-long-1.webp',
  },
  aboutSection: {
    enabled: true,
    eyebrow: 'Who we are',
    title: 'About Us',
    text: 'We are a small Pakistani store that checks every order by hand before it leaves us. We keep prices honest, label materials clearly, and deliver anywhere in the country with cash on delivery.\n\nIf anything is not right, a real person answers on WhatsApp and puts it right.',
    button: 'Read our story',
    image: '/img/monogram-trifold-1.webp',
  },
  gallery: {
    enabled: true,
    eyebrow: 'From the collection',
    title: 'Images Gallery',
  },
  faqs: [
    {
      q: 'Is this real leather?',
      a: 'Our wallets are PU leather (synthetic), and we would rather say so up front. They look and feel close to leather, hold up well to daily use, and cost a fraction of the price.',
    },
    {
      q: 'How does payment work?',
      a: 'Cash on delivery. You pay the courier when the parcel reaches you. There is nothing to pay online and no card details to enter.',
    },
    {
      q: 'How long does delivery take?',
      a: 'Three to five working days for most cities in Pakistan. We send a confirmation on WhatsApp once your order is on its way.',
    },
    {
      q: 'What if it is not what I expected?',
      a: 'Message us within 7 days of delivery and we will exchange it, as long as it is unused and still in its packaging.',
    },
  ],
};

export default SETTINGS;
