/**
 * Builds a lightweight index of every country's administrative divisions.
 *
 * The index is small enough to load eagerly and is all the UI needs to render
 * the country and division selectors. The heavy per-division data (city lists
 * and real postal codes, ~600 KB in total) is fetched on demand by
 * `loadCountryData`, so a visitor who never switches country never downloads it.
 *
 * Output: src/data/index.json
 *
 * Run after build-data.mjs:  node scripts/build-index.mjs
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const SRC = path.join(ROOT, "src", "data", "countries");
const OUT = path.join(ROOT, "src", "data", "index.json");
const STATS_OUT = path.join(ROOT, "src", "data", "stats.json");

const index = {};
const cityCounts = {};
let totalCities = 0;
let totalDivisions = 0;

/**
 * Languages kept in the eager index.
 *
 * The index is imported statically by `data.ts`, so every byte ships on every
 * page load. It only drives the division SELECTORS, which are shown in the
 * interface language — so only the UI languages belong here.
 *
 * The record languages (ar, he, th, ru, …) are needed only when actually
 * generating a record for that country, and they live in the lazily-loaded
 * per-country files. Carrying them here too added ~117 KB gzip-inflating weight
 * to every page for data most visits never read.
 */
const UI_LANGS = ["zh", "zh-hant", "en", "ja", "ko"];

for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(fs.readFileSync(path.join(SRC, file), "utf8"));
  index[data.code] = {
    code: data.code,
    postalStyle: data.postalStyle,
    postalReal: data.postalReal,
    // Division codes and UI-language names — enough to populate the selectors.
    states: data.states.map((s) => {
      const names = s.nameL10n
        ? Object.fromEntries(Object.entries(s.nameL10n).filter(([l]) => UI_LANGS.includes(l)))
        : undefined;
      return {
        code: s.code,
        name: s.name,
        nameL10n: names && Object.keys(names).length ? names : undefined,
      };
    }),
  };
  totalDivisions += data.states.length;
  const n = data.states.reduce((m, s) => m + s.cities.length, 0);
  cityCounts[data.code] = n;
  totalCities += n;
}

const countries = Object.keys(index).length;

fs.writeFileSync(OUT, JSON.stringify(index));
fs.writeFileSync(path.join(ROOT, "src", "data", "city-counts.json"), JSON.stringify(cityCounts));
fs.writeFileSync(STATS_OUT, JSON.stringify({ divisions: totalDivisions, cities: totalCities, countries }));

const kb = fs.statSync(OUT).size / 1024;
console.log(`index: ${countries} countries, ${totalDivisions} divisions, ${totalCities} cities, ${kb.toFixed(1)} KB`);
