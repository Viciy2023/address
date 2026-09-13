/**
 * Repository hygiene checks.
 *
 * These guard against two classes of damage that are easy to introduce and
 * hard to notice:
 *
 *   1. Encoding corruption. PowerShell's `Set-Content -Encoding UTF8` writes a
 *      BOM on Windows PowerShell 5.1, and a CP1252 round-trip silently replaces
 *      every non-ASCII character with U+FFFD. Both have already destroyed
 *      Cyrillic and CJK content in this project once.
 *
 *   2. Stale generated data. If `src/data/*.json` drifts from the registry or
 *      from the build scripts, the site ships wrong data without any error.
 *
 * Exit code is non-zero when anything is wrong, so CI fails loudly.
 *
 * Run: node scripts/check-repo.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const TEXT_EXT = new Set([".ts", ".mts", ".tsx", ".js", ".mjs", ".astro", ".svelte", ".json", ".css", ".md", ".txt", ".xml"]);
const SKIP_DIRS = new Set(["node_modules", ".cache", "dist", ".astro", ".git"]);

const problems = [];

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const files = walk(ROOT);

/* ---------------------------------------------------- encoding */

let bomFiles = [];
let mojibakeFiles = [];

for (const f of files) {
  const ext = path.extname(f);
  if (!TEXT_EXT.has(ext)) continue;
  const buf = fs.readFileSync(f);

  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    bomFiles.push(path.relative(ROOT, f));
    continue;
  }

  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    mojibakeFiles.push(path.relative(ROOT, f));
    continue;
  }

  // U+FFFD means a lossy decode happened somewhere upstream.
  if (text.includes("\uFFFD") && ext !== ".md") {
    mojibakeFiles.push(path.relative(ROOT, f));
  }
}

if (bomFiles.length) problems.push(`UTF-8 BOM present (breaks JSON.parse and pollutes diffs):\n  ${bomFiles.join("\n  ")}`);
if (mojibakeFiles.length) problems.push(`encoding corruption (U+FFFD or invalid UTF-8):\n  ${mojibakeFiles.join("\n  ")}`);

/* ------------------------------------------- data completeness */

const registryPath = path.join(ROOT, "src", "lib", "registry.ts");
const registrySrc = fs.readFileSync(registryPath, "utf8");
// Country entries look like:  code: "US",
const registryCodes = [...registrySrc.matchAll(/^\s{4}code: "([A-Z]{2})",$/gm)].map((m) => m[1]);

const dataDir = path.join(ROOT, "src", "data", "countries");
const dataCodes = fs.existsSync(dataDir)
  ? fs.readdirSync(dataDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""))
  : [];

const namesDir = path.join(ROOT, "src", "data", "names");
const nameCodes = fs.existsSync(namesDir)
  ? fs.readdirSync(namesDir).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""))
  : [];

const indexFile = path.join(ROOT, "src", "data", "index.json");
const indexCodes = fs.existsSync(indexFile)
  ? Object.keys(JSON.parse(fs.readFileSync(indexFile, "utf8")))
  : [];

if (registryCodes.length === 0) {
  problems.push("could not read any country codes from src/lib/registry.ts — did the file format change?");
}

for (const [label, list] of [["src/data/countries", dataCodes], ["src/data/names", nameCodes], ["src/data/index.json", indexCodes]]) {
  const missing = registryCodes.filter((c) => !list.includes(c));
  const extra = list.filter((c) => !registryCodes.includes(c));
  if (missing.length) problems.push(`${label} is missing: ${missing.join(", ")}`);
  if (extra.length) problems.push(`${label} has entries not in the registry: ${extra.join(", ")}`);
}

/* ------------------------------------------------------ licenses */

const attribution = path.join(ROOT, "src", "data", "ATTRIBUTION.md");
if (!fs.existsSync(attribution)) {
  problems.push("src/data/ATTRIBUTION.md is missing — CC-BY 4.0 requires attribution to be recorded");
} else {
  const text = fs.readFileSync(attribution, "utf8");
  for (const needed of ["GeoNames", "CC-BY", "Faker", "MIT"]) {
    if (!text.includes(needed)) problems.push(`ATTRIBUTION.md does not mention ${needed}`);
  }
}

/* --------------------------------------------------------- config */

const configSrc = fs.readFileSync(path.join(ROOT, "src", "config.ts"), "utf8");
if (!configSrc.includes("SITE_URL")) {
  problems.push("src/config.ts no longer reads SITE_URL — the domain must stay configurable");
}

// A hard-coded domain anywhere except config.ts would defeat the point.
// Attribution links and vendor CDNs are exempt: they are not site URLs.
const ALLOWED_HOSTS = [
  "localhost",
  "127.0.0.1",
  // schema / specification references
  "schema.org",
  "www.w3.org",
  "creativecommons",
  "www.unicode",
  "cldr.unicode",
  // upstream project links (required attribution)
  "github.com",
  "fakerjs",
  "www.geonames",
  "download.geonames",
  "www.ssa.gov",
  // vendor CDNs used for fonts, avatars, analytics and ads
  "developers.cloudflare",
  "static.cloudflareinsights",
  "cdn.jsdelivr",
  "pagead2.googlesyndication",
  "fonts.googleapis",
  "fonts.gstatic",
];

const escaped = ALLOWED_HOSTS.map((h) => h.replace(/\./g, "\\.")).join("|");
const domainRe = new RegExp(`https?://(?!${escaped})[a-z0-9.-]+\\.[a-z]{2,}`, "gi");
const hardcoded = [];
for (const f of files) {
  const rel = path.relative(ROOT, f);
  if (rel === path.join("src", "config.ts")) continue;
  if (!/\.(ts|mts|astro|svelte|mjs|js)$/.test(f)) continue;
  if (rel.includes("scripts")) continue;
  const text = fs.readFileSync(f, "utf8");
  for (const m of text.matchAll(domainRe)) hardcoded.push(`${rel}: ${m[0]}`);
}
if (hardcoded.length) problems.push(`hard-coded domains outside src/config.ts:\n  ${hardcoded.join("\n  ")}`);

/* --------------------------------------------------------- report */

const counts = [
  `${registryCodes.length} countries in registry`,
  `${dataCodes.length} country data files`,
  `${nameCodes.length} name pools`,
  `${files.length} files scanned`,
];

if (problems.length === 0) {
  console.log(`repo check: OK  (${counts.join(", ")})`);
  process.exit(0);
}

console.error(`repo check: ${problems.length} problem(s)\n`);
for (const p of problems) console.error(`- ${p}\n`);
process.exit(1);
