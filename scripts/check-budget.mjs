/**
 * Build size budget.
 *
 * Two limits matter in practice and are easy to breach without noticing:
 *
 *   - Cloudflare Pages rejects a deployment above 20,000 files on the free
 *     plan. Prerendering city- or division-level pages would blow past that
 *     instantly (34 countries x ~24 divisions x 4 languages = 3,264 routes
 *     before cities), so the budget fails the build rather than letting a
 *     routing change quietly break deployment.
 *
 *   - The initial JavaScript payload directly affects Core Web Vitals. The
 *     generator island must stay small enough to hydrate quickly on a mid-range
 *     phone over 4G.
 *
 * Run: node scripts/check-budget.mjs
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

const LIMITS = {
  /** Cloudflare Pages free plan hard limit. */
  files: 19_500,
  /** Total initial (home page) JavaScript, gzipped. */
  initialJsGzip: 120 * 1024,
  /** Total initial (home page) CSS, gzipped. */
  initialCssGzip: 20 * 1024,
  /** Any single asset, raw. Cloudflare's own cap is 25 MiB. */
  singleAsset: 5 * 1024 * 1024,
};

if (!fs.existsSync(DIST)) {
  console.error("dist/ not found — run `npm run build` first");
  process.exit(1);
}

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = walk(DIST);
const gzip = (b) => zlib.gzipSync(b, { level: 9 }).length;
const failures = [];

/* ------------------------------------------------------- file count */

if (files.length > LIMITS.files) {
  failures.push(
    `file count ${files.length} exceeds the ${LIMITS.files} budget (Cloudflare Pages free plan caps a site at 20,000 files)`,
  );
}

/* --------------------------------------------------- single asset cap */

for (const f of files) {
  const size = fs.statSync(f).size;
  if (size > LIMITS.singleAsset) {
    failures.push(`${path.relative(DIST, f)} is ${(size / 1024 / 1024).toFixed(1)} MB, above the 5 MB budget`);
  }
}

/* ------------------------------------- initial payload on the home page */

const home = path.join(DIST, "index.html");
const html = fs.readFileSync(home, "utf8");

const referenced = (ext) =>
  [...new Set([...html.matchAll(/["'`]([^"'`]*_astro\/[^"'`]+\.(?:js|css))["'`]/g)].map((m) => m[1]))].filter((u) =>
    u.endsWith(ext),
  );

let jsGzip = 0;
let cssGzip = 0;

for (const url of referenced(".js")) {
  const f = path.join(DIST, url.replace(/^\//, ""));
  if (fs.existsSync(f)) jsGzip += gzip(fs.readFileSync(f));
}
for (const url of referenced(".css")) {
  const f = path.join(DIST, url.replace(/^\//, ""));
  if (fs.existsSync(f)) cssGzip += gzip(fs.readFileSync(f));
}

if (jsGzip > LIMITS.initialJsGzip) {
  failures.push(
    `initial JS is ${(jsGzip / 1024).toFixed(1)} KB gzipped, above the ${(LIMITS.initialJsGzip / 1024).toFixed(0)} KB budget`,
  );
}
if (cssGzip > LIMITS.initialCssGzip) {
  failures.push(
    `initial CSS is ${(cssGzip / 1024).toFixed(1)} KB gzipped, above the ${(LIMITS.initialCssGzip / 1024).toFixed(0)} KB budget`,
  );
}

/* ----------------------------------------------------- page coverage */

/**
 * Every country in the registry must have a landing page in every language,
 * and every one of those must appear in the sitemap. This is the regression
 * that matters most here: a country silently dropped from routing still builds
 * green and still passes the generator tests, but quietly loses its page.
 */
const registrySrc = fs.readFileSync(path.join(ROOT, "src", "lib", "registry.ts"), "utf8");
const countryCodes = [...registrySrc.matchAll(/^\s{4}code: "([A-Z]{2})",$/gm)].map((m) => m[1]);
const LANGS = ["zh", "en", "ja", "ko"];

const sitemapPath = path.join(DIST, "sitemap-0.xml");
const sitemap = fs.existsSync(sitemapPath) ? fs.readFileSync(sitemapPath, "utf8") : "";

const missingPages = [];
for (const code of countryCodes) {
  for (const lang of LANGS) {
    const prefix = lang === "zh" ? "" : `${lang}/`;
    const rel = path.join(prefix, "countries", code.toLowerCase(), "index.html");
    if (!fs.existsSync(path.join(DIST, rel))) {
      missingPages.push(rel);
    }
    if (!sitemap.includes(`/countries/${code.toLowerCase()}/`)) {
      missingPages.push(`sitemap missing /countries/${code.toLowerCase()}/`);
    }
  }
}
if (missingPages.length) {
  failures.push(`country pages incomplete (${missingPages.length}):\n    ${[...new Set(missingPages)].slice(0, 10).join("\n    ")}`);
}

/* --------------------------------------------------------------- report */

const totalRaw = files.reduce((n, f) => n + fs.statSync(f).size, 0);
const lazyChunks = files.filter((f) => f.endsWith(".js") && !referenced(".js").some((u) => f.endsWith(u.replace(/^\//, "")))).length;
const htmlCount = files.filter((f) => f.endsWith(".html")).length;

console.log("build budget");
console.log(`  files            ${String(files.length).padStart(6)} / ${LIMITS.files}`);
console.log(`  html pages       ${String(htmlCount).padStart(6)} (${countryCodes.length} countries x ${LANGS.length} languages + fixed)`);
console.log(`  total raw        ${(totalRaw / 1024 / 1024).toFixed(2).padStart(6)} MB`);
console.log(`  initial JS       ${(jsGzip / 1024).toFixed(1).padStart(6)} KB gzip / ${(LIMITS.initialJsGzip / 1024).toFixed(0)} KB`);
console.log(`  initial CSS      ${(cssGzip / 1024).toFixed(1).padStart(6)} KB gzip / ${(LIMITS.initialCssGzip / 1024).toFixed(0)} KB`);
console.log(`  lazy JS chunks   ${String(lazyChunks).padStart(6)} (loaded on demand per country)`);

if (failures.length) {
  console.error("\nbudget exceeded:");
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log("\nbudget: OK");
