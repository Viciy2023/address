/**
 * Build-time sample generation for country landing pages.
 *
 * Each country page renders one worked example so the page has real content
 * rather than a paragraph of filler. The sample is produced by the same
 * generator the client uses, with a seed derived from the country code, so it
 * is stable across builds and identical in structure to what a visitor will get.
 *
 * This module exists separately from `data.ts` to avoid a circular import:
 * the generator imports types from `data.ts`, so `data.ts` must not import the
 * generator.
 */

import { COUNTRY_BY_CODE, type Lang } from "./registry.js";
import { generateIdentity, type Identity } from "./generator/index.js";
import { seedFromString } from "./generator/rng.js";
import { loadCountryData, loadNamePool } from "./data.js";

/**
 * Generates one deterministic example identity for a country.
 *
 * Returns null when the country has no bundled data, so the caller can skip the
 * sample block rather than render a broken one. Data loading is awaited here
 * because this runs at build time, not in the browser.
 */
export async function buildCountrySample(code: string, lang?: Lang): Promise<Identity | null> {
  const spec = COUNTRY_BY_CODE[code.toUpperCase()];
  if (!spec) return null;

  try {
    const [countryData, name] = await Promise.all([
      loadCountryData(spec.code),
      loadNamePool(spec.code),
    ]);
    return generateIdentity(
      spec,
      { name, countryData },
      {
        country: spec.code,
        seed: seedFromString(`country-page-sample:${spec.code}`),
        gender: "any",
        lang,
      },
    );
  } catch {
    // A country page without a sample is still useful; do not fail the build.
    return null;
  }
}
