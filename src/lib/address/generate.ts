/**
 * Virtual address records.
 *
 * The address itself is not generated here. `generateIdentity` already builds a
 * complete, internally consistent address — street in the country's own word
 * order, city drawn from the chosen division, postal code from that same
 * division's real prefixes, and a phone number in the country's real format.
 * Re-implementing any of that would create a second source of truth that could
 * drift from the tested one, so this module *projects* the address group out of
 * a generated identity and re-shapes it for the address page.
 *
 * What it adds on top:
 *   - `sortedCountries()` — the country list ordered by English name, labelled
 *     in the interface language, for the picker.
 *   - `addressFormat()` — the country's address and phone conventions described
 *     from the registry (template, postal scheme, dialling plan) rather than
 *     from prose, so the explainer cannot contradict what is generated.
 */

import {
  generateIdentity,
  type GenerateDeps,
  type Identity,
} from "../generator/index.js";
import { COUNTRIES, COUNTRY_BY_CODE, type CountrySpec } from "../registry.js";
import { postalHint } from "../generator/postal.js";
import type { SiteLang } from "../../config.js";

/** One row of the address card: a value and the key used to label it. */
export interface AddressField {
  key: string;
  value: string;
}

export interface AddressRecord {
  country: string;
  seed: number;
  /** Person the address belongs to, so it reads as a real record. */
  fullName: string;
  fields: AddressField[];
  /** Authoritative single-line address, as generated. */
  fullAddress: string;
  /** The same address split into printed lines, for the example card. */
  lines: string[];
}

/**
 * Address-group keys, in the order they are shown.
 *
 * `stateCode` is deliberately absent: it carries a GeoNames/Gb2260 code that is
 * meaningful to the data pipeline but not something a person writes on a form.
 * The localized division name (`state`) is what belongs on the card.
 */
const ADDRESS_KEYS = ["street", "city", "state", "postal", "country", "phone"] as const;

/** Projects a generated identity down to its address record. */
function toRecord(id: Identity, spec: CountrySpec): AddressRecord {
  const fields: AddressField[] = [];
  for (const key of ADDRESS_KEYS) {
    const value = id.map[key];
    // `postal` is absent for the countries that have no postal system.
    if (value) fields.push({ key, value });
  }

  const fullAddress = id.map.fullAddress ?? "";
  return {
    country: spec.code,
    seed: id.seed,
    fullName: id.summary.fullName,
    fields,
    fullAddress,
    /*
     * Split the authoritative one-line address on the separator the generator
     * joined it with, so the example card shows the same string laid out over
     * several lines. This is presentation only — the value is never rewritten.
     */
    lines: fullAddress.split(/,\s*/).filter(Boolean),
  };
}

/** Builds one address record for a country from a seed. */
export function generateAddress(
  spec: CountrySpec,
  deps: GenerateDeps,
  seed: number,
): AddressRecord {
  const id = generateIdentity(spec, deps, {
    country: spec.code,
    seed,
    // The record is written in the country's own language; the interface
    // language only affects labels, which the page supplies from its own table.
    lang: spec.dataLang,
  });
  return toRecord(id, spec);
}

/* ------------------------------------------------------------------ */
/* Country list                                                        */
/* ------------------------------------------------------------------ */

export interface CountryOption {
  code: string;
  /** Localized name, for the picker. */
  name: string;
  /** Stable English name, used for ordering. */
  english: string;
  /** "美国·US" */
  label: string;
}

/**
 * Every country that has address data, ordered by English name.
 *
 * The registry order is editorial (US first, then by region), which is right
 * for the countries index but wrong for a long picker a visitor scans by name.
 * English is the sort key because it is the only name every country is
 * guaranteed to have.
 */
export function sortedCountries(lang: SiteLang): CountryOption[] {
  return COUNTRIES.filter((c) => COUNTRY_BY_CODE[c.code])
    .map((c) => ({
      code: c.code,
      name: c.name[lang] ?? c.name.en,
      english: c.name.en,
      label: `${c.name[lang] ?? c.name.en}·${c.code}`,
    }))
    .sort((a, b) => a.english.localeCompare(b.english, "en"));
}

/* ------------------------------------------------------------------ */
/* Format explainer                                                    */
/* ------------------------------------------------------------------ */

export interface AddressFormat {
  /** Localized name of the first-level division, e.g. "州" / "State". */
  adminLabel: string;
  /** The country's address template, token names intact. */
  template: string[];
  /**
   * Postal scheme. `mask` is a pattern like "#####" or "… #AA"; empty when the
   * country has no postal codes.
   */
  postalDisabled: boolean;
  postalMask: string;
  /** Dialling code without the plus, e.g. "1", "852". */
  dialCode: string;
  /** Digits in the national number, excluding any trunk prefix. */
  nationalDigits: number;
  /** Display grouping of the national number. */
  groups: number[];
  /** Trunk prefix that is dropped in the international form, when one exists. */
  trunkPrefix?: string;
}

/** Describes a country's address and phone conventions from the registry. */
export function addressFormat(spec: CountrySpec, lang: SiteLang): AddressFormat {
  return {
    adminLabel: spec.address.adminLabel[lang] ?? spec.address.adminLabel.en,
    template: [...spec.address.template],
    postalDisabled: spec.postalDisabled,
    postalMask: spec.postalDisabled ? "" : postalHint(spec.postalStyle),
    dialCode: spec.phone.code,
    nationalDigits: spec.phone.nationalDigits,
    groups: [...spec.phone.groups],
    trunkPrefix: spec.phone.trunkPrefix,
  };
}

/** The country spec for a code, or null. */
export function addressCountry(code: string): CountrySpec | null {
  return COUNTRY_BY_CODE[code.toUpperCase()] ?? null;
}
