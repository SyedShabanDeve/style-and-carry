const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const SRC = path.join(__dirname, '..', 'wallet images');
const OUT = path.join(__dirname, 'assets', 'img');
fs.mkdirSync(OUT, {recursive:true});

const MAP = [
  ['WhatsApp Image 2026-08-31 at 3.20.27 PM.jpeg',     'metro-trifold-1'],
  ['WhatsApp Image 2026-08-31 at 3.20.27 PM (1).jpeg', 'metro-trifold-2'],
  ['WhatsApp Image 2026-08-31 at 3.20.28 PM.jpeg',     'metro-trifold-3'],
  ['WhatsApp Image 2026-08-31 at 3.20.28 PM (1).jpeg', 'metro-trifold-4'],
  ['WhatsApp Image 2026-08-31 at 3.20.27 PM (2).jpeg', 'bloom-card-1'],
  ['WhatsApp Image 2026-08-31 at 3.20.28 PM (2).jpeg', 'voyager-long-1'],
  ['WhatsApp Image 2026-08-31 at 3.20.29 PM.jpeg',     'voyager-long-2'],
  ['WhatsApp Image 2026-08-31 at 3.20.30 PM.jpeg',     'voyager-long-3'],
  ['WhatsApp Image 2026-08-31 at 3.20.29 PM (1).jpeg', 'executive-long-1'],
  ['WhatsApp Image 2026-08-31 at 3.20.30 PM (1).jpeg', 'safari-trifold-1'],
  ['WhatsApp Image 2026-08-31 at 3.20.31 PM.jpeg',     'heritage-trifold-1'],
  ['WhatsApp Image 2026-08-31 at 3.20.31 PM (1).jpeg', 'crest-bifold-1'],
  ['WhatsApp Image 2026-08-31 at 3.20.31 PM (2).jpeg', 'pillar-bifold-1'],
  ['WhatsApp Image 2026-08-31 at 3.20.32 PM.jpeg',     'monogram-bifold-1'],
  ['WhatsApp Image 2026-08-31 at 3.20.32 PM (1).jpeg', 'monogram-trifold-1'],
  ['WhatsApp Image 2026-08-31 at 3.20.33 PM.jpeg',     'essential-bifold-1'],
  ['a5fdd738a73e73a3e7f8bb8e8b86f511.jpg',             'essential-bifold-2'],
];

(async () => {
  for (const [src, slug] of MAP) {
    const p = path.join(SRC, src);
    if (!fs.existsSync(p)) { console.log('MISSING ' + src); continue; }
    const meta = await sharp(p).metadata();
    await sharp(p).resize({width:1400, withoutEnlargement:true})
      .webp({quality:82}).toFile(path.join(OUT, slug + '.webp'));
    await sharp(p).resize({width:700, height:700, fit:'cover', position:'centre'})
      .webp({quality:80}).toFile(path.join(OUT, slug + '-sq.webp'));
    const big = fs.statSync(path.join(OUT, slug+'.webp')).size;
    console.log(`${slug.padEnd(22)} ${meta.width}x${meta.height} -> ${(big/1024).toFixed(0)}KB`);
  }
  // logo
  const logo = path.join(__dirname, '..', 'profile logo.jfif');
  if (fs.existsSync(logo)) {
    await sharp(logo).resize({width:512}).webp({quality:88}).toFile(path.join(OUT,'logo.webp'));
    await sharp(logo).resize({width:64}).png().toFile(path.join(OUT,'favicon.png'));
    console.log('logo + favicon ok');
  }
  console.log('IMAGES_DONE');
})().catch(e=>{console.error('FATAL', e.message); process.exit(1);});
