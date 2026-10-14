const fs = require('node:fs');
const path = require('node:path');
const sharp = require('../frontend/node_modules/sharp');

const root = path.resolve(__dirname, '../backend/db/seed/assets');

(async () => {
  let count = 0;
  for (let id = 1; id <= 40; id++) {
    for (const name of ['primary', 'secondary']) {
      const file = path.join(root, String(id), `${name}.webp`);
      if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
      const metadata = await sharp(file).metadata();
      const size = fs.statSync(file).size;
      if (metadata.format !== 'webp' || metadata.width !== 800 || metadata.height !== 800 || size >= 150000) {
        throw new Error(`Invalid ${file}: ${metadata.format} ${metadata.width}x${metadata.height}, ${size} bytes`);
      }
      count++;
    }
  }
  console.log(`${count} seed images verified: WebP, 800x800, <150 KB`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
