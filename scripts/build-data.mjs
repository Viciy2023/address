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

/**
 * Builds the localized name record for a place, omitting redundant entries.
 *
 * GeoNames does not carry a Chinese name for every division — South Korean
 * provinces, for example, have `ko`, `en` and `ja` entries but no `zh`. Falling
 * back to the ASCII name there would print "Gyeongsangbuk-do" on a Chinese
 * interface, next to Chinese city names.
 *
 * Japanese is a legitimate source for those gaps: the Japanese names for these
 * divisions are written in kanji (慶尚北道), and kanji is largely shared with
 * Chinese. The substitution is only made when the Japanese string is purely
 * ideographic — a name containing kana (バーデン＝ヴュルテンベルク州) is a
 * phonetic rendering and must not be passed off as Chinese.
 *
 * Any language whose name equals the ASCII name is dropped. The ASCII name is
 * already stored, so repeating it costs ~70% of the data file for nothing and
 * the client falls back to `name` when `nameL10n` is null.
 *
 * @param loc   names collected from the alternateNames dump, by language
 * @param ascii the GeoNames ASCII name
 * @returns object of differing names, or null when none differ
 */

/**
 * Chinese names for Hong Kong and Macau districts and localities.
 *
 * GeoNames stores these with English suffixes ("Wong Tai Sin District") and
 * supplies a Chinese alias for only about half. Left as-is, a Chinese address
 * mixes scripts: "Sai Kung District, 小赤沙".
 *
 * The mapping is explicit rather than generated, because transliterating
 * Cantonese place names by rule produces wrong characters.
 */
const HK_MO_NAMES = {
  "Central and Western District": "中西區",
  "Wan Chai District": "灣仔區",
  "Eastern District": "東區",
  "Southern District": "南區",
  "Yau Tsim Mong District": "油尖旺區",
  "Sham Shui Po District": "深水埗區",
  "Kowloon City District": "九龍城區",
  "Wong Tai Sin District": "黃大仙區",
  "Kwun Tong District": "觀塘區",
  "Kwai Tsing District": "葵青區",
  "Tsuen Wan District": "荃灣區",
  "Tuen Mun District": "屯門區",
  "Yuen Long District": "元朗區",
  "North District": "北區",
  "Tai Po District": "大埔區",
  "Sha Tin District": "沙田區",
  "Sai Kung District": "西貢區",
  "Islands District": "離島區",
  "Macao": "澳門",
  "Nossa Senhora de Fatima": "花地瑪堂區",
  "Santo Antonio": "聖安東尼堂區",
  "Sao Lazaro": "望德堂區",
  "Se": "大堂區",
  "Nossa Senhora do Carmo": "嘉模堂區",
  "Cotai": "路氹城",
  "Sao Francisco Xavier": "聖方濟各堂區",
  // These three carry no zh alias in GeoNames at all.
  "Yuen Long": "元朗區",
  "Tsuen Wan": "荃灣區",
  "Tai Po": "大埔區",
};

function buildNameL10n(loc, ascii) {
  const KANA = /[\u3040-\u309F\u30A0-\u30FF]/;

  const candidates = {
    zh: loc?.zh,
    en: loc?.en,
    ja: loc?.ja,
    ko: loc?.ko,
    ru: loc?.ru,
  };

  if (!candidates.zh && candidates.ja && !KANA.test(candidates.ja)) {
    candidates.zh = candidates.ja;
  }

  const out = {};
  for (const [lang, value] of Object.entries(candidates)) {
    if (value && value !== ascii) out[lang] = value;
  }

  /*
   * GeoNames' English aliases are unreliable for administrative divisions: New
   * York's is "Empire State", Kentucky's "Blue Grass State", Idaho's "State of
   * Idaho". Those are nicknames and legal formalities, not the name that appears
   * on an address. For English the ASCII name is already the correct form
   * ("New York", "Idaho"), so the alias is discarded and the ASCII name used.
   */
  if (out.en) delete out.en;

  // Hong Kong and Macau districts: prefer the curated Chinese name.
  if (HK_MO_NAMES[ascii]) out.zh = HK_MO_NAMES[ascii];

  return Object.keys(out).length ? out : null;
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
      // Kept so the localized-name pass can join on it.
      id: c[0],
      name: c[1],
      admin1: c[10],
      pop: Number(c[14]) || 0,
      tz: c[17] || "",
    });
  }
  return byCC;
}

/**
 * "CC.ADM1" -> geonameid, so the localized-name map (keyed by geonameid) can be
 * looked up from a division's country and code.
 */
function loadAdmin1Ids() {
  const file = path.join(CACHE, "admin1CodesASCII.txt");
  if (!fs.existsSync(file)) {
    psDownload("https://download.geonames.org/export/dump/admin1CodesASCII.txt", file, 180);
  }
  const map = new Map();
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line) continue;
    const c = line.split("\t");
    if (c[0] && c[3]) map.set(c[0], c[3]);
  }
  return map;
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
 * Reads GeoNames' `alternateNames` dump once and extracts both admin-1 and city
 * names, keyed by geonameid.
 *
 * This is needed because neither `admin1CodesASCII.txt` nor `cities5000.txt`
 * carries local-language names: a Chinese interface showing China rendered
 * every province and city in ASCII ("Chongqing", "Guangzhou") next to Chinese
 * labels, which reads as a broken translation.
 *
 * The dump is ~193 MB compressed and ~710 MB extracted, which exceeds Node's
 * maximum string length, so it is read as a stream. It is optional: if it is
 * absent the build still succeeds and the site falls back to ASCII names, so a
 * fresh clone without the cache produces a working site rather than failing.
 *
 * @returns {{ admin1: Map<string, object>, cities: Map<string, object> }}
 */
function loadAlternateNames() {
  const zip = path.join(CACHE, "alternateNames.zip");
  const dir = path.join(CACHE, "altnames");
  const file = path.join(dir, "alternateNames.txt");

  const empty = { admin1: new Map(), cities: new Map() };

  if (!fs.existsSync(file)) {
    if (!fs.existsSync(zip)) {
      process.stdout.write("  alternateNames.zip absent; admin and city names stay ASCII\n");
      return empty;
    }
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    try {
      unzip(zip, dir);
    } catch {
      process.stdout.write("  could not extract alternateNames.zip; names stay ASCII\n");
      return empty;
    }
  }
  if (!fs.existsSync(file)) return empty;

  // Only the ids we actually ship are of interest, which keeps memory bounded
  // (the dump holds ~12 million rows across every country).
  const adminFile = path.join(CACHE, "admin1CodesASCII.txt");
  const adminIds = new Set();
  for (const line of fs.readFileSync(adminFile, "utf8").split("\n")) {
    if (!line) continue;
    const c = line.split("\t");
    if (c[3]) adminIds.add(c[3]);
  }

  const cityIds = new Set();
  for (const line of fs.readFileSync(path.join(CACHE, "cities5000.txt"), "utf8").split("\n")) {
    if (!line) continue;
    const c = line.split("\t");
    if (c[0] && CODES.includes(c[8])) cityIds.add(c[0]);
  }

  const WANTED = new Set(["zh", "en", "ja", "ko", "ru"]);
  const admin1 = new Map();
  const cities = new Map();

  const fd = fs.openSync(file, "r");
  const buf = Buffer.alloc(1 << 22);
  let carry = "";
  let bytes;
  while ((bytes = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
    const chunk = carry + buf.toString("utf8", 0, bytes);
    const lines = chunk.split("\n");
    carry = lines.pop() ?? "";
    for (const line of lines) {
      const c = line.split("\t");
      const id = c[1];
      const isAdmin = adminIds.has(id);
      const isCity = cityIds.has(id);
      if (!isAdmin && !isCity) continue;

      const lang = c[2];
      if (!WANTED.has(lang)) continue;
      const name = c[3];
      if (!name || name.length > 48) continue;

      const bucket = isAdmin ? admin1 : cities;
      if (!bucket.has(id)) bucket.set(id, {});
      const rec = bucket.get(id);
      // GeoNames orders preferred names first, so the first hit per language wins.
      if (!rec[lang]) rec[lang] = name;
    }
  }
  fs.closeSync(fd);

  return { admin1, cities };
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
const admin1Ids = loadAdmin1Ids();
const localized = loadAlternateNames();
const admin1Localized = localized.admin1;
const cityLocalized = localized.cities;
if (admin1Localized.size || cityLocalized.size) {
  console.log(
    `localized names: ${admin1Localized.size} divisions, ${cityLocalized.size} cities`,
  );
}
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
      // Localized names for the UI. A missing translation degrades to the ASCII
      // name rather than rendering an empty option.
      nameL10n: buildNameL10n(admin1Localized.get(admin1Ids.get(`${cc}.${st.code}`)), st.name),
      postal: examples,
      cities: chosen.map((c) => {
        const loc = cityLocalized.get(c.id);
        return {
          n: c.name,
          // Localized city name, same reasoning as the division name: the CJK
          // address templates concatenate it directly onto the street address.
          nL10n: loc ? buildNameL10n(loc, c.name) : null,
          pop: c.pop,
          tz: c.tz,
        };
      }),
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
