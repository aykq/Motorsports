import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

function makeSvg(size) {
  const r = size * 0.14;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const fontSize = size * 0.38;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0a0a0a" rx="${r}"/>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#e11d48"/>
  <text
    x="${cx}"
    y="${cy + fontSize * 0.36}"
    text-anchor="middle"
    font-family="Arial Black, Arial, sans-serif"
    font-weight="900"
    font-size="${fontSize}"
    fill="white"
    letter-spacing="-2"
  >M</text>
</svg>`;
}

for (const size of SIZES) {
  const svg = Buffer.from(makeSvg(size));
  const outPath = path.join(OUT_DIR, `icon-${size}x${size}.png`);
  await sharp(svg).png().toFile(outPath);
  console.log(`✓ icon-${size}x${size}.png`);
}

console.log("\nTüm ikonlar public/icons/ klasörüne yazıldı.");
