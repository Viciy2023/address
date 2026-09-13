/**
 * Generates the Open Graph share image.
 *
 * An og:image is not optional: without one, sharing the site on social media
 * or in chat apps produces a bare link with no preview, which measurably
 * reduces click-through. The legacy site declared
 * `twitter:card: summary_large_image` while shipping no image at all.
 *
 * Output: public/og.png (1200x630, the size all major platforms expect)
 *
 * Run: node scripts/build-og.mjs
 */

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public", "og.png");

const siteUrl = process.env.SITE_URL ?? "https://example.com";
const host = siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

const W = 1200;
const H = 630;

// Inline SVG keeps the build dependency-free (no headless browser needed).
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fafafa"/>
      <stop offset="100%" stop-color="#f4f4f5"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>

  <!-- Swiss grid: a single hairline column, nothing decorative. -->
  <rect x="80" y="80" width="6" height="470" fill="#2563eb"/>
  <line x1="80" y1="470" x2="1120" y2="470" stroke="#d4d4d8" stroke-width="1"/>

  <g font-family="Inter, 'Segoe UI', system-ui, sans-serif" fill="#18181b">
    <text x="130" y="200" font-size="26" letter-spacing="6" fill="#71717a">AIMEI</text>

    <text x="130" y="290" font-size="72" font-weight="700" letter-spacing="-2">Identity &amp; Address</text>
    <text x="130" y="372" font-size="72" font-weight="700" letter-spacing="-2">Generator</text>

    <text x="130" y="430" font-size="27" fill="#52525b">34 countries and regions · realistic formats</text>
    <text x="130" y="464" font-size="27" fill="#52525b">names, addresses, national IDs, online profiles</text>
  </g>

  <g font-family="Inter, 'Segoe UI', system-ui, sans-serif" font-size="22" fill="#71717a">
    <text x="130" y="530">${host}</text>
  </g>

  <!-- Country codes as a quiet texture, not decoration. -->
  <g font-family="ui-monospace, Menlo, monospace" font-size="17" fill="#d4d4d8">
    <text x="700" y="150">US  CA  GB  AU  NZ  DE</text>
    <text x="700" y="182">FR  IT  ES  PT  NL  SE</text>
    <text x="700" y="214">NO  PL  RU  CN  TW  HK</text>
    <text x="700" y="246">MO  JP  KR  IN  ID  MY</text>
    <text x="700" y="278">SG  TH  VN  AE  SA  IL</text>
    <text x="700" y="310">TR  BR  MX  ZA</text>
  </g>
</svg>`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });

await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(OUT);

const kb = fs.statSync(OUT).size / 1024;
console.log(`og.png: ${W}x${H}, ${kb.toFixed(1)} KB -> ${path.relative(ROOT, OUT)}`);
