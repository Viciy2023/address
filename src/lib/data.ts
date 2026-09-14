/**
 * Data access layer.
 *
 * Loading strategy — three tiers, matched to access patterns:
 *
 *   1. Country index (division codes + names, ~50 KB) is imported eagerly. The
 *      country and division selectors need it the instant the island mounts,
 *      and lazy-loading it would only add latency.
 *
 *   2. Country detail (city lists and real postal codes, ~600 KB total) is
 *      lazy-loaded per country. Only the selected country is ever needed, so a
 *      visitor who never switches country never downloads the rest.
 *
 *   3. Name pools (~140 KB total) are also lazy per country, for the same
 *      reason.
 *
 * This module is the only place that knows how data is fetched, which keeps the
 * generator core free of bundler-specific import syntax and lets the same code
 * run on a server.
 */

import type { PostalStyle } from "./registry.js";
import INDEX from "../data/index.json";

export interface CityEntry {
  /** ASCII name, always present. */
  n: string;
  /** Localized name per UI language; null when it matches `n`. */
  nL10n?: Record<string, string> | null;
  /** Population, used only for ordering. */
  pop: number;
  /** IANA time zone. */
  tz: string;
}

export interface DivisionEntry {
  code: string;
  name: string;
  /** Localized name per data language; falls back to `name` when missing. */
  nameL10n?: Record<string, string>;
  /** Real postal codes recorded for this division (may be empty). */
  postal: string[];
  cities: CityEntry[];
}

export interface CountryData {
  code: string;
  postalStyle: PostalStyle;
  /** True when at least one division was backed by real postal data. */
  postalReal: boolean;
  states: DivisionEntry[];
}

export interface DivisionSummary {
  code: string;
  name: string;
  /** Localized name per UI language; absent on older data. */
  nameL10n?: Record<string, string>;
}

export interface CountrySummary {
  code: string;
  postalStyle: PostalStyle;
  postalReal: boolean;
  states: DivisionSummary[];
}

export interface NamePool {
  first: string[];
  last: string[];
  middle: string[];
  prefix: string[];
  suffix: string[];
  job: string[];
}

const COUNTRY_INDEX = INDEX as unknown as Record<string, CountrySummary>;

/** Country codes that have bundled data, in registry order. */
const CODES = Object.keys(COUNTRY_INDEX);

export function availableCountries(): string[] {
  return CODES;
}

/** Lightweight summary: divisions only, no cities. Available synchronously. */
export function getCountrySummary(code: string): CountrySummary | null {
  return COUNTRY_INDEX[code.toUpperCase()] ?? null;
}

/**
 * Divisions for a country, for populating the selector.
 *
 * `lang` selects the localized name when the data carries one. Without it a
 * Chinese interface listing China showed every province in GeoNames' ASCII
 * spelling ("Chongqing" instead of 重庆), which reads as a broken translation.
 */
export function getDivisions(code: string, lang?: string): DivisionSummary[] {
  const states = COUNTRY_INDEX[code.toUpperCase()]?.states ?? [];
  return states
    .map((s) => ({
      code: s.code,
      name: (lang && s.nameL10n?.[lang]) || s.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/* ------------------------------------------------------------------ */
/* Country detail: lazy, one chunk per country.                        */
/* ------------------------------------------------------------------ */

/* JSON module types widen `postalStyle` to string; the cast below restores the
   narrow union declared by the registry. */
type CountryModule = () => Promise<unknown>;

const COUNTRY_LOADERS_RAW: Record<string, CountryModule> = {
  AE: () => import("../data/countries/AE.json"),
  AU: () => import("../data/countries/AU.json"),
  BR: () => import("../data/countries/BR.json"),
  CA: () => import("../data/countries/CA.json"),
  CN: () => import("../data/countries/CN.json"),
  DE: () => import("../data/countries/DE.json"),
  ES: () => import("../data/countries/ES.json"),
  FR: () => import("../data/countries/FR.json"),
  GB: () => import("../data/countries/GB.json"),
  HK: () => import("../data/countries/HK.json"),
  ID: () => import("../data/countries/ID.json"),
  IL: () => import("../data/countries/IL.json"),
  IN: () => import("../data/countries/IN.json"),
  IT: () => import("../data/countries/IT.json"),
  JP: () => import("../data/countries/JP.json"),
  KR: () => import("../data/countries/KR.json"),
  MO: () => import("../data/countries/MO.json"),
  MX: () => import("../data/countries/MX.json"),
  MY: () => import("../data/countries/MY.json"),
  NL: () => import("../data/countries/NL.json"),
  NO: () => import("../data/countries/NO.json"),
  NZ: () => import("../data/countries/NZ.json"),
  PL: () => import("../data/countries/PL.json"),
  PT: () => import("../data/countries/PT.json"),
  RU: () => import("../data/countries/RU.json"),
  SA: () => import("../data/countries/SA.json"),
  SE: () => import("../data/countries/SE.json"),
  SG: () => import("../data/countries/SG.json"),
  TH: () => import("../data/countries/TH.json"),
  TR: () => import("../data/countries/TR.json"),
  TW: () => import("../data/countries/TW.json"),
  US: () => import("../data/countries/US.json"),
  VN: () => import("../data/countries/VN.json"),
  ZA: () => import("../data/countries/ZA.json"),
};

const COUNTRY_LOADERS = COUNTRY_LOADERS_RAW as Record<string, () => Promise<{ default: CountryData }>>;

const countryCache = new Map<string, CountryData>();

/** Loads a country's full detail (cities + postal codes), caching it. */
export async function loadCountryData(code: string): Promise<CountryData> {
  const key = code.toUpperCase();
  const cached = countryCache.get(key);
  if (cached) return cached;

  const loader = COUNTRY_LOADERS[key];
  if (!loader) throw new Error(`no country data for ${key}`);

  const mod = await loader();
  const data = mod.default as CountryData;
  countryCache.set(key, data);
  return data;
}

/* ------------------------------------------------------------------ */
/* Name pools: lazy, one chunk per country.                            */
/* ------------------------------------------------------------------ */

const NAME_LOADERS: Record<string, () => Promise<{ default: NamePool }>> = {
  AE: () => import("../data/names/AE.json"),
  AU: () => import("../data/names/AU.json"),
  BR: () => import("../data/names/BR.json"),
  CA: () => import("../data/names/CA.json"),
  CN: () => import("../data/names/CN.json"),
  DE: () => import("../data/names/DE.json"),
  ES: () => import("../data/names/ES.json"),
  FR: () => import("../data/names/FR.json"),
  GB: () => import("../data/names/GB.json"),
  HK: () => import("../data/names/HK.json"),
  ID: () => import("../data/names/ID.json"),
  IL: () => import("../data/names/IL.json"),
  IN: () => import("../data/names/IN.json"),
  IT: () => import("../data/names/IT.json"),
  JP: () => import("../data/names/JP.json"),
  KR: () => import("../data/names/KR.json"),
  MO: () => import("../data/names/MO.json"),
  MX: () => import("../data/names/MX.json"),
  MY: () => import("../data/names/MY.json"),
  NL: () => import("../data/names/NL.json"),
  NO: () => import("../data/names/NO.json"),
  NZ: () => import("../data/names/NZ.json"),
  PL: () => import("../data/names/PL.json"),
  PT: () => import("../data/names/PT.json"),
  RU: () => import("../data/names/RU.json"),
  SA: () => import("../data/names/SA.json"),
  SE: () => import("../data/names/SE.json"),
  SG: () => import("../data/names/SG.json"),
  TH: () => import("../data/names/TH.json"),
  TR: () => import("../data/names/TR.json"),
  TW: () => import("../data/names/TW.json"),
  US: () => import("../data/names/US.json"),
  VN: () => import("../data/names/VN.json"),
  ZA: () => import("../data/names/ZA.json"),
};

const nameCache = new Map<string, NamePool>();

/** Loads a country's name pool, caching it. */
export async function loadNamePool(code: string): Promise<NamePool> {
  const key = code.toUpperCase();
  const cached = nameCache.get(key);
  if (cached) return cached;

  const loader = NAME_LOADERS[key];
  if (!loader) throw new Error(`no name pool for ${key}`);

  const mod = await loader();
  const pool = mod.default as NamePool;
  nameCache.set(key, pool);
  return pool;
}

/* ------------------------------------------------------------------ */
/* Aggregate statistics, used on the credits page.                     */
/* ------------------------------------------------------------------ */

/**
 * City and division totals are baked into the index at build time so the
 * credits page does not need to load every country's detail just to count.
 * See scripts/build-index.mjs.
 */
import STATS from "../data/stats.json";

export function totalCityCount(): number {
  return (STATS as { cities: number }).cities;
}

export function totalDivisionCount(): number {
  return (STATS as { divisions: number }).divisions;
}

/** True when real postal data exists for the country. */
export function hasRealPostalData(code: string): boolean {
  return COUNTRY_INDEX[code.toUpperCase()]?.postalReal ?? false;
}
