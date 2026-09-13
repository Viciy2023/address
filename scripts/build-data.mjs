/**
 * Builds the country bulk-data files consumed by the generator.
 *
 * Sources (all free / commercially usable):
 *   - GeoNames cities5000   --https://download.geonames.org/export/dump   (CC-BY 4.0)
 *   - GeoNames admin1Codes  --https://download.geonames.org/export/dump   (CC-BY 4.0)
 *   - GeoNames postal codes --https://download.geonames.org/export/zip    (CC-BY 4.0)
 *
 * Design
 * ------
 * Structure (admin-1 divisions + cities, ranked by population) always comes
 * from cities5000, because it is the only source that consistently supplies
 * admin-1 codes for every country.
 *
 * Postal codes come from each country's postal dump and are aggregated **per
 * admin-1 division**, not per city. This is what keeps city / state / postal
 * mutually consistent --the defect that made the legacy implementation
 * unusable. Postal data is stored as a set of real example codes plus a
 * `postalKeep` offset; the client randomises only the trailing part, so the
 * generated code always stays inside its division's real prefix range.
 *
 * Where a postal dump is missing or unusable, a format-correct synthetic code
 * is produced instead and flagged with `postalReal: false`.
 *
 * Output: src/data/countries/<CC>.json
 *
 * GeoNames attribution is required (CC-BY 4.0) and is rendered in the site
 * footer --do not remove it.
 *
 * Usage:  node scripts/build-data.mjs [--force]
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, ".cache", "geonames");
const OUT = path.join(ROOT, "src", "data", "countries");
const FORCE = process.argv.includes("--force");

/**
 * cps  : cities kept per admin-1 division (upper bound)
 * max  : hard cap on total cities for the country
 * keep : leading characters of a postal code that must be preserved
 * style: postal flavour understood by the client
 * floor: minimum city population
 */
const TUNING = {
  US: { cps: 14, max: 620, keep: 3, style: "us" },
  CA: { cps: 14, max: 330, keep: 3, style: "ca" },
  GB: { cps: 14, max: 340, keep: -1, style: "gb" }, // keep = outward code (computed)
  AU: { cps: 14, max: 220, keep: 2, style: "numeric4" },
  NZ: { cps: 12, max: 170, keep: 2, style: "numeric4" },
  DE: { cps: 14, max: 380, keep: 2, style: "numeric5" },
  FR: { cps: 14, max: 340, keep: 2, style: "numeric5" },
  IT: { cps: 14, max: 360, keep: 2, style: "numeric5" },
  ES: { cps: 14, max: 360, keep: 2, style: "numeric5" },
  PT: { cps: 12, max: 280, keep: 2, style: "pt" },
  NL: { cps: 12, max: 240, keep: 4, style: "nl" },
  SE: { cps: 12, max: 240, keep: 2, style: "se" },
  NO: { cps: 12, max: 210, keep: 2, style: "numeric4" },
  PL: { cps: 12, max: 280, keep: 2, style: "pl" },
  RU: { cps: 12, max: 420, keep: 3, style: "numeric6" },
  CN: { cps: 14, max: 420, keep: 3, style: "numeric6" },
  JP: { cps: 14, max: 440, keep: 3, style: "jp" },
  KR: { cps: 12, max: 240, keep: 2, style: "numeric5" },
  IN: { cps: 14, max: 420, keep: 3, style: "numeric6" },
  ID: { cps: 12, max: 340, keep: 2, style: "numeric5" },
  MY: { cps: 12, max: 240, keep: 2, style: "numeric5" },
  SG: { cps: 60, max: 60, keep: 2, style: "numeric6", cityState: true, cityStateCode: "SG", cityStateName: "Singapore" },
  TH: { cps: 12, max: 320, keep: 2, style: "numeric5" },
  TR: { cps: 12, max: 340, keep: 2, style: "numeric5" },
  BR: { cps: 12, max: 340, keep: 2, style: "br" }, // keep: 2 digits before the dash
  MX: { cps: 12, max: 340, keep: 2, style: "numeric5" },
  ZA: { cps: 12, max: 210, keep: 2, style: "numeric4" },
  AE: { cps: 12, max: 150, keep: 0, style: "numeric5" },
  TW: { cps: 12, max: 210, keep: 3, style: "numeric3" },
  IL: { cps: 12, max: 190, keep: 2, style: "numeric5" },
  VN: { cps: 12, max: 300, keep: 2, style: "numeric6" },
  SA: { cps: 12, max: 190, keep: 2, style: "numeric5" },
  HK: { cps: 20, max: 180, keep: 0, style: "none" },
  MO: { cps: 12, max: 40, keep: 0, style: "none", cityState: true, cityStateCode: "MO", cityStateName: "Macao" },
};

const NO_POSTAL = new Set(["HK", "MO", "AE"]);
const CODES = Object.keys(TUNING);

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

function unzip(zipPath, destDir) {
  execSync(
    `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${zipPath}' -DestinationPath '${destDir}' -Force"`,
    { stdio: "ignore" },
  );
}

function psDownload(url, file, timeout = 600) {
  execSync(
    `powershell -NoProfile -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${file}' -TimeoutSec ${timeout}"`,
    { stdio: "ignore" },
  );
}

function ensureDump(name) {
  const txt = path.join(CACHE, `${name}.txt`);
  if (fs.existsSync(txt) && !FORCE) return true;
  const zip = path.join(CACHE, `${name}.zip`);
  if (!fs.existsSync(zip)) psDownload(`https://download.geonames.org/export/dump/${name}.zip`, zip, 900);
  unzip(zip, path.join(CACHE, name));
  const src = path.join(CACHE, name, `${name}.txt`);
  if (!fs.existsSync(src)) return false;
  fs.copyFileSync(src, txt);
  return true;
}

/** geonameid|name|asciiname|altnames|lat|lon|class|code|cc|cc2|admin1|...|pop|...|tz */
function loadCities() {
  if (!ensureDump("cities5000")) throw new Error("cities5000 unavailable");
  const byCC = new Map();
  for (const line of fs.readFileSync(path.join(CACHE, "cities5000.txt"), "utf8").split("\n")) {
    if (!line) continue;
    const c = line.split("\t");
    const cc = c[8];
    if (!byCC.has(cc)) byCC.set(cc, []);
    byCC.get(cc).push({
      name: c[1],
      admin1: c[10],
      pop: Number(c[14]) || 0,
      tz: c[17] || "",
    });
  }
  return byCC;
}

/** "CC.ADM1" -> English admin-1 name. */
function loadAdmin1() {
  const file = path.join(CACHE, "admin1CodesASCII.txt");
  if (!fs.existsSync(file)) {
    psDownload("https://download.geonames.org/export/dump/admin1CodesASCII.txt", file, 180);
  }
  const map = new Map();
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    const [k, name] = line.split("\t");
    map.set(k, name);
  }
  return map;
}

/**
 * Normalises an admin-1 name so it can be matched across GeoNames datasets,
 * which disagree on both language and punctuation:
 *   "Baden-Württemberg" (postal dump) vs "Baden-Wurttemberg" (admin1Codes)
 *   "Andalucia"         (postal dump) vs "Andalusia"         (admin1Codes)
 *   "Castilla - La Mancha" vs "Castille-La Mancha"
 */
function normalizeDivision(name) {
  if (!name) return "";
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // drop spaces, dashes, punctuation
}

/**
 * Reads a country's postal dump and returns two indexes:
 *   byName     --normalised admin-1 name  -> Set<postal>   (preferred)
 *   byCity     --normalised city name     -> Set<postal>   (fallback)
 *
 * The admin-1 name column is empty in several dumps (ID, ZA, AE), and the
 * admin-1 *code* column uses a scheme incompatible with cities5000. The city
 * index sidesteps both problems, because cities5000 already tells us which
 * division each city belongs to.
 *
 * Column layout: postal | city | admin1Name | admin1Code | ...
 */
function loadPostal(cc) {
  const cached = path.join(CACHE, `${cc}.postal.txt`);
  if (!fs.existsSync(cached)) {
    const zip = path.join(CACHE, `${cc}.zip`);
    try {
      if (!fs.existsSync(zip)) {
        psDownload(`https://download.geonames.org/export/zip/${cc}.zip`, zip, 300);
      }
      unzip(zip, path.join(CACHE, cc));
    } catch {
      return null;
    }
    const src = path.join(CACHE, cc, `${cc}.txt`);
    if (!fs.existsSync(src)) return null;
    fs.copyFileSync(src, cached);
  }

  const byName = new Map();
  const byCity = new Map();
  const add = (map, key, code) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(code);
  };

  for (const line of fs.readFileSync(cached, "utf8").split("\n")) {
    if (!line) continue;
    const c = line.split("\t");
    const rawPostal = (c[1] ?? "").trim();
    const cityName = (c[2] ?? "").trim();
    const adminName = (c[3] ?? "").trim();
    const adminCode = (c[4] ?? "").trim();
    if (!rawPostal || rawPostal.length > 12) continue; // reject company names
    // Keep the code verbatim, including any internal space or hyphen: the
    // inward code (GB), LDU (CA), letter pair (NL) and the second group (SE)
    // are all part of the code and must not be truncated. Only the UAE dump
    // packs two codes into one field, so collapse runs of whitespace there.
    const code = cc === "AE" ? rawPostal.split(/\s+/)[0] : rawPostal.replace(/\s+/g, " ");

    // Resolve the division to the canonical English name used by cities5000.
    // The postal dump's own name column is unreliable: several countries write
    // it in the local script (RU, KR) or omit it entirely (ID, ZA, AE).
    // The code column, when present, maps cleanly through admin1CodesASCII.
    let division = "";
    if (adminCode) division = admin1Map.get(`${cc}.${adminCode}`) ?? "";
    if (!division) division = adminName;
    add(byName, normalizeDivision(division), code);
    add(byCity, normalizeDivision(cityName), code);
  }

  if (!byName.size && !byCity.size) return null;
  return { byName, byCity };
}

/**
 * Picks the postal examples for one division. Prefers a division-name match,
 * then a token-overlap match, then aggregates the postals of every city that
 * cities5000 assigns to the division.
 */
function pickPostalExamples(postal, divisionName, cityNames) {
  if (!postal) return null;
  const key = normalizeDivision(divisionName);
  if (postal.byName.has(key) && postal.byName.get(key).size) return [...postal.byName.get(key)];

  // Token-overlap: "Castille-La Mancha" ~ "Castilla - La Mancha".
  const tokens = divisionName.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 3);
  if (tokens.length) {
    let best = null;
    let bestScore = 0;
    for (const [k, set] of postal.byName) {
      let score = 0;
      for (const t of tokens) if (k.includes(t)) score++;
      if (score > bestScore) {
        bestScore = score;
        best = set;
      }
    }
    if (best && bestScore >= Math.ceil(tokens.length / 2)) return [...best];
  }

  // City-level aggregation --the workhorse for dumps with no division column.
  const out = new Set();
  for (const name of cityNames) {
    const hit = postal.byCity.get(normalizeDivision(name));
    if (hit) for (const v of hit) out.add(v);
  }
  return out.size ? [...out] : null;
}

/** Format-correct placeholder used when a division has no recorded postal codes. */
function syntheticPostal(style, seed) {
  const d = (i) => String((seed >> (i * 3)) % 10);
  const L = (i) => "ABCDEFGHJKLMNPRSTUVWXYZ"[(seed >> (i * 2)) % 21];
  const n = () => String(Math.floor(Math.random() * 9) + 1);
  const r = () => String(Math.floor(Math.random() * 10));
  switch (style) {
    case "us": return `${n()}${r()}${r()}${r()}${r()}`;
    case "ca": return `${L(0)}${d(0)}${L(1)} ${r()}${L(2)}${r()}`;
    case "gb": return `${L(0)}${L(1)}${r()} ${r()}${L(3)}${L(4)}`;
    case "nl": return `${r()}${r()}${r()}${r()} ${L(0)}${L(1)}`;
    case "br": return `${r()}${r()}${r()}${r()}${r()}-${r()}${r()}${r()}`;
    case "numeric3": return `${n()}${r()}${r()}`;
    case "numeric4": return `${n()}${r()}${r()}${r()}`;
    case "numeric5": return `${n()}${r()}${r()}${r()}${r()}`;
    case "numeric6": return `${n()}${r()}${r()}${r()}${r()}${r()}`;
    case "numeric3plus": return `${n()}${r()}${r()}-${n()}${r()}${r()}${r()}`;
    default: return "";
  }
}

const citiesByCC = loadCities();
const admin1Map = loadAdmin1();
const report = [];

for (const cc of CODES) {
  const cfg = TUNING[cc];
  const hasPostal = !NO_POSTAL.has(cc);
  const postal = hasPostal ? loadPostal(cc) : null;

  const cities = (citiesByCC.get(cc) ?? []).filter((c) => c.pop >= (cfg.floor ?? 0));

  // Drop cities whose admin-1 code is missing. A handful of entries in
  // cities5000 have a blank or "00" admin1, which would surface in the UI as a
  // district literally named "00".
  const withAdmin = cities.filter((c) => c.admin1 && c.admin1 !== "00");
  const usable = withAdmin.length >= 5 ? withAdmin : cities;

  const byAdmin = new Map();
  for (const c of usable) {
    const key = c.admin1 || "00";
    if (!byAdmin.has(key)) byAdmin.set(key, []);
    byAdmin.get(key).push(c);
  }

  // Resolve each division to a human name, preferring the admin1 lookup table.
  const resolveName = (key) => admin1Map.get(`${cc}.${key}`) ?? key;
  let states = [...byAdmin.entries()]
    .map(([key, list]) => {
      list.sort((a, b) => b.pop - a.pop);
      return { code: key, name: resolveName(key), cities: list };
    })
    .sort((a, b) => b.cities.length - a.cities.length);

  // City-states (SG) have no admin-1 rows in cities5000, so every city would
  // land in a meaningless numeric division. Collapse to a single division.
  if (cfg.cityState) {
    const all = [...(withAdmin.length ? withAdmin : cities)].sort((a, b) => b.pop - a.pop);
    states = [{ code: cfg.cityStateCode ?? cc, name: cfg.cityStateName ?? cc, cities: all }];
  } else if (states.length === 0 && cities.length) {
    states = [{ code: cc, name: cc, cities: [...cities].sort((a, b) => b.pop - a.pop) }];
  }

  // Fair budget: every division gets a base share, then larger ones top up.
  const nStates = states.length || 1;
  const base = Math.max(4, Math.floor(cfg.max / nStates));
  let budget = cfg.max - base * nStates;

  let realCount = 0;
  let synthCount = 0;
  let statesWithPostal = 0;

  const outStates = [];
  for (const st of states) {
    const take = Math.min(base + Math.max(0, Math.min(6, Math.floor(budget / nStates))), st.cities.length);
    budget -= Math.max(0, take - base);
    const chosen = st.cities.slice(0, take);

    // Postal examples for this division.
    const rawExamples = pickPostalExamples(postal, st.name, chosen.map((c) => c.name));
    let examples = [];
    if (rawExamples && rawExamples.length) {
      examples = rawExamples.slice(0, 24);
      statesWithPostal++;
      realCount += chosen.length;
    } else if (hasPostal) {
      examples = [syntheticPostal(cfg.style, outStates.length + 1)];
      synthCount += chosen.length;
    }

    outStates.push({
      code: st.code,
      name: st.name,
      postal: examples,
      cities: chosen.map((c) => ({ n: c.name, pop: c.pop, tz: c.tz })),
    });
  }

  const payload = {
    code: cc,
    postalStyle: cfg.style,
    postalKeep: cfg.keep < 0 ? 0 : cfg.keep,
    postalReal: Boolean(postal) && statesWithPostal > 0,
    states: outStates,
  };

  const file = path.join(OUT, `${cc}.json`);
  fs.writeFileSync(file, JSON.stringify(payload));

  const cityCount = outStates.reduce((n, s) => n + s.cities.length, 0);
  const kb = fs.statSync(file).size / 1024;
  report.push([cc, outStates.length, cityCount, statesWithPostal, realCount, synthCount, kb.toFixed(1)]);
}

console.log("\ncode  states  cities  st.postal  realP  synthP     KB");
for (const [cc, st, ci, sw, rp, sp, kb] of report) {
  console.log(
    `${cc.padEnd(5)} ${String(st).padStart(6)} ${String(ci).padStart(7)} ${String(sw).padStart(10)} ${String(rp).padStart(6)} ${String(sp).padStart(7)} ${kb.padStart(6)}`,
  );
}
const totalKB = report.reduce((n, r) => n + Number(r[6]), 0);
const totalCities = report.reduce((n, r) => n + r[2], 0);
const totalStates = report.reduce((n, r) => n + r[1], 0);
console.log(
  `\nTOTAL: ${report.length} countries, ${totalStates} divisions, ${totalCities} cities, ${totalKB.toFixed(1)} KB`,
);
