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

for (const file of fs.readdirSync(SRC).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(fs.readFileSync(path.join(SRC, file), "utf8"));
  index[data.code] = {
    code: data.code,
    postalStyle: data.postalStyle,
    postalReal: data.postalReal,
    // Division codes and names only — enough to populate the selectors.
    states: data.states.map((s) => ({ code: s.code, name: s.name })),
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
