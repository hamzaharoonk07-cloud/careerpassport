/**
 * favicon.svg → the raster sizes browsers still ask for.
 *
 *   node tools/make-favicons.mjs
 *
 * The SVG is the real icon and covers Chrome, Edge, Firefox and Safari 16+.
 * These are for what is left: older browsers that ignore an SVG favicon, and
 * iOS, which wants a square PNG for a home-screen bookmark and will otherwise
 * screenshot the page.
 *
 * Regenerate whenever favicon.svg changes — nothing does it automatically,
 * because a favicon changes about once a year and a build step that runs on
 * every install to produce two files nobody edited is not worth the cost.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'client/public/favicon.svg');
const OUT = path.join(ROOT, 'client/public');

const svg = await readFile(SRC);

/** density scales the SVG render so the raster is sharp, not upscaled. */
const render = (size) =>
  sharp(svg, { density: Math.ceil((size / 100) * 96 * 4) })
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

for (const [name, size] of [['favicon-32.png', 32], ['apple-touch-icon.png', 180]]) {
  const buf = await render(size);
  await writeFile(path.join(OUT, name), buf);
  console.log(`  ${name.padEnd(22)} ${size}x${size}  ${Math.round(buf.length / 1024)} KB`);
}
