/**
 * Internal link checker.
 *
 * Walks the built HTML and verifies that every internal link resolves to a
 * file that exists, and that every fragment (#anchor) resolves to an id on the
 * target page. External links are ignored: they are checked by the attribution
 * review, not by CI, and network calls make the build non-deterministic.
 *
 * Why this exists instead of linkinator: linkinator v8 scans zero links when
 * pointed at a directory or a glob, and only works against a live server, which
 * is not something the build should depend on. This checker is offline,
 * deterministic, and understands the site's directory-style URLs
 * (`trailingSlash: "always"`, `build.format: "directory"`).
 *
 * Run: node scripts/check-links.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const DIST = path.join(ROOT, "dist");

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
const htmlFiles = files.filter((f) => f.endsWith(".html"));

/** Resolves a site-absolute path to a file in dist, mirroring host behaviour. */
function resolveTarget(urlPath) {
  const clean = urlPath.replace(/^\//, "");
  const candidates = [
    path.join(DIST, clean),
    path.join(DIST, clean, "index.html"),
    path.join(DIST, `${clean}.html`),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    if (fs.existsSync(c) && fs.statSync(c).isDirectory()) {
      const idx = path.join(c, "index.html");
      if (fs.existsSync(idx)) return idx;
    }
  }
  return null;
}

/** Collects the set of ids present in an HTML document. */
function idsOf(html) {
  const ids = new Set();
  for (const m of html.matchAll(/\sid="([^"]+)"/g)) ids.add(m[1]);
  return ids;
}

const idCache = new Map();
function idsFor(file) {
  if (!idCache.has(file)) idCache.set(file, idsOf(fs.readFileSync(file, "utf8")));
  return idCache.get(file);
}

const problems = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, "utf8");
  const rel = path.relative(DIST, file);

  // href on <a>, <link>; src on <script>, <img>.
  const refs = [
    ...html.matchAll(/<a[^>]+href="([^"]+)"/g),
    ...html.matchAll(/<link[^>]+href="([^"]+)"/g),
    ...html.matchAll(/<script[^>]+src="([^"]+)"/g),
    ...html.matchAll(/<img[^>]+src="([^"]+)"/g),
  ].map((m) => m[1]);

  for (const raw of refs) {
    // Skip external, protocol-relative, mailto, data: and pure fragments.
    if (/^(https?:)?\/\//i.test(raw) || /^(mailto:|tel:|data:|javascript:)/i.test(raw)) continue;
    if (raw.startsWith("#")) continue;

    checked++;
    // Strip the fragment and query string; neither affects which file is served.
    const [beforeFragment, fragment] = raw.split("#");
    const urlPath = beforeFragment.split("?")[0];

    // A bare fragment target or empty path means "same page".
    const targetFile = urlPath === "" ? file : resolveTarget(urlPath);

    if (!targetFile) {
      problems.push(`${rel}: broken link -> ${raw}`);
      continue;
    }

    if (fragment) {
      const ids = idsFor(targetFile);
      if (!ids.has(fragment)) {
        problems.push(`${rel}: unresolved anchor -> ${raw}`);
      }
    }
  }
}

/* --------------------------------------------------------------- report */

console.log("internal links");
console.log(`  html files      ${String(htmlFiles.length).padStart(6)}`);
console.log(`  links checked   ${String(checked).padStart(6)}`);

if (problems.length) {
  const unique = [...new Set(problems)];
  console.error(`\n${unique.length} problem(s):`);
  for (const p of unique.slice(0, 40)) console.error(`  - ${p}`);
  if (unique.length > 40) console.error(`  ... and ${unique.length - 40} more`);
  process.exit(1);
}

console.log("\nlinks: OK");
