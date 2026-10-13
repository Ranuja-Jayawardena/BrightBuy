const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(path.resolve(__dirname, '../backend/db/seed/04_products.sql'), 'utf8');
const sections = sql.split(/-- [123]\. /);
if (sections.length !== 4) throw new Error('Expected product, variant, and image seed sections');

const products = [...sections[1].matchAll(/'([A-Z]{3}-\d{3})', true\)/g)].map((match) => match[1]);
const variants = [...sections[2].matchAll(/base_sku = '([^']+)'\), '([^']+)'/g)].map((match) => ({ product: match[1], sku: match[2] }));
const images = [...sections[3].matchAll(/base_sku = '([^']+)'\), 'https:\/\/brightbuy-media-storage-695945476492\.s3\.us-east-1\.amazonaws\.com\/products\/(\d+)\/(primary|secondary)\.webp', ([01]), (true|false)/g)].map((match) => ({ product: match[1], id: Number(match[2]), view: match[3], order: Number(match[4]), primary: match[5] === 'true' }));

if (products.length !== 40 || new Set(products).size !== 40) throw new Error(`Expected 40 unique products; found ${products.length}`);
if (variants.length !== 65 || new Set(variants.map((variant) => variant.sku)).size !== 65) throw new Error(`Expected 65 unique variants; found ${variants.length}`);
if (images.length !== 80) throw new Error(`Expected 80 image rows; found ${images.length}`);

for (const variant of variants) {
  if (!products.includes(variant.product) || !variant.sku.startsWith(`${variant.product}-`)) throw new Error(`Invalid variant ${variant.sku}`);
}
for (const [index, product] of products.entries()) {
  const rows = images.filter((image) => image.product === product);
  if (rows.length !== 2) throw new Error(`Expected two images for ${product}`);
  for (const view of ['primary', 'secondary']) {
    const row = rows.find((image) => image.view === view);
    if (!row || row.id !== index + 1 || row.order !== (view === 'primary' ? 0 : 1) || row.primary !== (view === 'primary')) {
      throw new Error(`Invalid ${view} image for ${product}`);
    }
  }
}

console.log('Fix 7.2 seed verified: 40 products, 65 variants, 80 correctly mapped image URLs');
