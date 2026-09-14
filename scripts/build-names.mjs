/**
 * Extracts person-name pools from @faker-js/faker into a compact JSON file
 * that ships to the browser.
 *
 * Why sampling instead of reading locale data directly: faker stores pools
 * across many partial locale files, and the raw locale definitions are
 * incomplete for non-Latin locales (zh_CN, ko). The only reliable way to learn
 * what a locale can actually produce is to ask the runtime, which resolves the
 * whole fallback chain internally. We therefore draw a large sample per locale
 * and de-duplicate it.
 *
 * Shipping faker itself is not an option: the package is ~2.8 MB even though
 * only name lists are needed.
 *
 * Licensing: @faker-js/faker is MIT. Attribution is written to
 * src/data/ATTRIBUTION.md and rendered on the site's credits page.
 *
 * Usage:  node scripts/build-names.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { allFakers } from "@faker-js/faker";
import { JOB_TITLES } from "./data/job-titles.mjs";

/**
 * Countries that use a middle name. Mirrors FAMILY_NAME_FIRST / USES_MIDDLE_NAME
 * in src/lib/registry.ts; duplicated here because this script runs under plain
 * node and cannot import TypeScript.
 */
const USES_MIDDLE_NAME_SET = new Set([
  "US", "CA", "GB", "AU", "NZ", "IE",
  "DE", "FR", "IT", "ES", "PT", "NL", "SE", "NO", "PL",
  "RU", "BR", "MX", "ZA", "IN", "PH",
]);

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "src", "data", "names");
const LEGACY_OUT = path.join(ROOT, "src", "data", "names.json");

/** ISO country code -> faker locale chain (first match wins per draw). */
const LOCALE_MAP = {
  US: ["en_US"],
  CA: ["en_CA", "fr_CA"],
  GB: ["en_GB"],
  AU: ["en_AU"],
  NZ: ["en_AU"],
  DE: ["de"],
  FR: ["fr"],
  IT: ["it"],
  ES: ["es"],
  PT: ["pt_PT"],
  NL: ["nl"],
  SE: ["sv"],
  NO: ["nb_NO"],
  PL: ["pl"],
  RU: ["ru"],
  CN: ["zh_CN"],
  TW: ["zh_TW"],
  // Hong Kong names are Chinese (陳大文) with a romanised surname. faker's
  // en_HK locale supplies English given names, which produced "羅Marilou" —
  // an English first name glued to a Chinese surname. zh_TW supplies the
  // Chinese given names and the romanised surnames both fit.
  HK: ["zh_TW"],
  // Macau uses Chinese surnames with Portuguese-influenced romanisation; the
  // Chinese pool is the safer base.
  MO: ["zh_TW"],
  JP: ["ja"],
  KR: ["ko"],
  IN: ["en_IN"],
  ID: ["id_ID"],
  MY: ["en", "en_IN"],
  SG: ["en", "zh_CN", "en_IN"],
  TH: ["th"],
  VN: ["vi"],
  AE: ["ar"],
  SA: ["ar"],
  IL: ["he"],
  TR: ["tr"],
  BR: ["pt_BR"],
  MX: ["es_MX"],
  ZA: ["en_ZA"],
};

/** Pool sizes kept per country. Bigger pools cost bytes, so keep them lean. */
const LIMITS = { first: 120, last: 120, middle: 40, prefix: 8, suffix: 8, job: 40 };

/** Draws attempted per pool before de-duplication. */
const DRAWS = { first: 900, last: 900, middle: 300, prefix: 80, suffix: 80, job: 300 };

/**
 * Script each country's names must be written in.
 *
 * faker resolves a locale chain by falling back to `en` whenever the primary
 * locale lacks a field. For Arabic that injected Latin names, producing records
 * like "Jeromy العواني" — a Latin given name on an Arabic surname. Filtering by
 * script after collection removes the fallback contamination for every country
 * at once rather than by tinkering with individual chains.
 *
 * `null` means Latin script is acceptable (the default).
 */
const SCRIPT_FOR = {
  CN: /[\u4E00-\u9FFF]/, TW: /[\u4E00-\u9FFF]/, HK: /[\u4E00-\u9FFF]/, MO: /[\u4E00-\u9FFF]/,
  JP: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
  KR: /[\uAC00-\uD7AF]/,
  RU: /[\u0400-\u04FF]/,
  SA: /[\u0600-\u06FF]/, AE: /[\u0600-\u06FF]/,
  IL: /[\u0590-\u05FF]/,
  TH: /[\u0E00-\u0E7F]/,
  VN: /[\u0100-\u01FF\u1EA0-\u1EF9]/, // Vietnamese diacritics
};

/** Samples a faker method many times and returns unique non-empty strings. */
function collect(faker, method, draws, limit, script) {
  const seen = new Set();
  for (let i = 0; i < draws && seen.size < limit * 3; i++) {
    try {
      const v = faker.person[method]();
      if (typeof v !== "string" || !v.trim()) continue;
      const name = v.trim();
      // Reject anything not written in the country's script, which is how the
      // English fallback leaks in.
      if (script && !script.test(name)) continue;
      seen.add(name);
    } catch {
      break; // locale cannot supply this field at all
    }
  }
  return [...seen];
}

/**
 * Evenly samples down to `n` items. Taking the first n would bias towards
 * whatever order faker's pool happens to have (often alphabetical).
 */
function sample(arr, n) {
  if (arr.length <= n) return arr;
  const step = arr.length / n;
  const out = [];
  for (let i = 0; i < n; i++) out.push(arr[Math.floor(i * step)]);
  return out;
}

const result = {};
const report = [];

for (const [cc, chain] of Object.entries(LOCALE_MAP)) {
  const pools = { first: [], last: [], middle: [], prefix: [], suffix: [], job: [] };

  // Merge draws from every locale in the chain, weighted towards the primary.
  for (let i = 0; i < chain.length; i++) {
    const id = chain[i];
    const faker = allFakers[id];
    if (!faker) continue;
    const weight = i === 0 ? 1 : 0.35;
    const script = SCRIPT_FOR[cc];
    pools.first.push(...collect(faker, "firstName", Math.round(DRAWS.first * weight), LIMITS.first, script));
    pools.last.push(...collect(faker, "lastName", Math.round(DRAWS.last * weight), LIMITS.last, script));
    pools.middle.push(...collect(faker, "middleName", Math.round(DRAWS.middle * weight), LIMITS.middle, script));
    pools.prefix.push(...collect(faker, "prefix", Math.round(DRAWS.prefix * weight), LIMITS.prefix, script));
    pools.suffix.push(...collect(faker, "suffix", Math.round(DRAWS.suffix * weight), LIMITS.suffix, script));
    pools.job.push(...collect(faker, "jobTitle", Math.round(DRAWS.job * weight), LIMITS.job, null));
  }

  const entry = {};
  for (const key of Object.keys(LIMITS)) {
    const unique = [...new Set(pools[key])];
    entry[key] = sample(unique, LIMITS[key]);
  }

  /*
   * Replace the job pool with the country's own titles wherever we have them.
   *
   * faker lacks job-title data for most non-English locales, so `jobTitle()`
   * returned its English fallback — "Human Branding Strategist" for a Chinese
   * record, and "Dynamic Factors تنفيذي" for an Emirati one. Those read as
   * broken, not merely untranslated.
   */
  if (JOB_TITLES[cc]) {
    entry.job = [...JOB_TITLES[cc]];
  }

  /*
   * `middleName` is an English-only concept in faker: the zh_CN, ja and ko
   * locales have no such field, so it fell back to the default locale and
   * produced English middle names inside Chinese, Japanese and Korean names.
   * The record no longer uses a middle name for those countries, so the pool is
   * emptied rather than shipping data that must never be drawn.
   */
  if (!USES_MIDDLE_NAME_SET.has(cc)) {
    entry.middle = [];
  }

  result[cc] = entry;
  report.push([cc, entry.first.length, entry.last.length, entry.middle.length, entry.job.length, entry.prefix.length]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
// One file per country so the client can lazy-load only what it needs.
for (const [cc, entry] of Object.entries(result)) {
  fs.writeFileSync(path.join(OUT_DIR, `${cc}.json`), JSON.stringify(entry));
}
// Remove the previous monolithic file if it is still around.
if (fs.existsSync(LEGACY_OUT)) fs.rmSync(LEGACY_OUT);

fs.writeFileSync(
  path.join(OUT_DIR, "ATTRIBUTION.md"),
  `# Data attribution

This site bundles data derived from the following free sources. Attribution is
required by their licences and is rendered on the site's credits page.

## GeoNames

- https://www.geonames.org/
- Licence: Creative Commons Attribution 4.0 (CC-BY 4.0)
- Used for: administrative divisions, city names, population ranks, time zones
  and postal codes (\`src/data/countries/*.json\`).

## Faker (@faker-js/faker)

- https://fakerjs.dev/
- Licence: MIT
- Used for: person name pools and job title patterns (\`src/data/names.json\`).

## Unicode CLDR

- https://cldr.unicode.org/
- Licence: Unicode License v3
- Used for: country, language and currency display names.
`,
);

console.log("\ncc   first  last  middle  prefix   job");
for (const [cc, f, l, m, j, p] of report) {
  console.log(
    `${cc.padEnd(4)} ${String(f).padStart(5)} ${String(l).padStart(5)} ${String(m).padStart(7)} ${String(p).padStart(7)} ${String(j).padStart(5)}`,
  );
}
const totalKB = Object.keys(result).reduce((n, cc) => n + fs.statSync(path.join(OUT_DIR, `${cc}.json`)).size, 0) / 1024;
console.log(`\nwritten: ${OUT_DIR}/*.json  (${totalKB.toFixed(1)} KB total, ${Object.keys(result).length} files)`);

const problems = report.filter(([, f, l]) => f < 20 || l < 20).map((r) => `${r[0]}(first=${r[1]},last=${r[2]})`);
if (problems.length) console.log(`WARNING thin pools: ${problems.join(", ")}`);
