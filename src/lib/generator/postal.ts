/**
 * Postal-code generation.
 *
 * The hard part is that GeoNames' postal dumps store different *portions* of a
 * postcode depending on the country:
 *
 *   US  "94501"      full 5-digit code          -> can randomise the tail
 *   GB  "BN91"       outward code only          -> inward code must be added
 *   CA  "P0R"        FSA only (first 3 chars)   -> LDU must be added
 *   NL  "2951"       4 digits only              -> 2 letters must be added
 *   SE  "132"        3 digits only              -> 2 digits must be added
 *   JP  "103-8686"   full code                  -> randomise the tail
 *
 * Naively preserving the stored value and overwriting its tail therefore emits
 * invalid postcodes. Instead each style declares:
 *
 *   head  how many leading alphanumeric characters to trust verbatim
 *   tail  the remaining shape, expressed as a mask (# = digit, A = letter)
 *   sep   separator inserted between head and tail, if any
 *
 * The head always comes from real data, so the code stays inside its genuine
 * prefix range and remains consistent with the chosen city and division.
 */

import type { Rng } from "./rng.js";
import type { PostalStyle } from "../registry.js";

interface Shape {
  /** Alphanumeric characters copied verbatim from an example. `"all"` = all of them. */
  head: number | "all";
  /** Mask for the characters that follow: `#` digit, `A` letter. */
  tail: string;
  /** Separator inserted before the tail. */
  sep?: string;
}

/**
 * Shapes are derived from what the GeoNames dumps actually store, verified
 * per country:
 *
 *   US  "94501"      full          -> keep 3, randomise 2
 *   CA  "P0R"        FSA only      -> keep FSA, append " " + #A#
 *   GB  "BN91"/"M9"  outward only  -> keep outward, append " " + #AA
 *   NL  "2951"       4 digits      -> keep 4, append " " + AA
 *   SE  "132 20"     3+2 digits    -> keep 3, append " " + ##
 *   PT  "4600-000"   4+3 digits    -> keep 4, append "-" + ###
 *   PL  "59-700"     2+3 digits    -> keep 2, append "-" + ###
 *   BR  "38540-000"  5+3 digits    -> keep 5, append "-" + ###
 *   JP  "103-8686"   3+4 digits    -> keep 3, append "-" + ####
 */
const SHAPES: Record<PostalStyle, Shape | null> = {
  us: { head: 3, tail: "##" },
  ca: { head: "all", tail: "#A#", sep: " " },
  gb: { head: "all", tail: "#AA", sep: " " },
  nl: { head: "all", tail: "AA", sep: " " },
  se: { head: 3, tail: "##", sep: " " },
  pt: { head: 4, tail: "###", sep: "-" },
  pl: { head: 2, tail: "###", sep: "-" },
  br: { head: 5, tail: "###", sep: "-" },
  jp: { head: 3, tail: "####", sep: "-" },
  "numeric3": { head: 2, tail: "#" },
  "numeric4": { head: 2, tail: "##" },
  "numeric5": { head: 3, tail: "##" },
  "numeric6": { head: 4, tail: "##" },
  none: null,
};

const LETTERS = "ABCDEFGHJKLMNPRSTUVWXYZ"; // no I, O, Q, U, V — matches postal conventions

/** Strips separators so a stored example can be counted in alphanumerics. */
function alnum(s: string): string {
  return s.replace(/[^0-9A-Za-z]/g, "");
}

/** Renders a mask, substituting digits and letters from the generator. */
function renderMask(mask: string, rng: Rng): string {
  let out = "";
  for (const ch of mask) {
    if (ch === "#") out += rng.digit();
    else if (ch === "A") out += LETTERS[rng.int(0, LETTERS.length - 1)];
    else out += ch;
  }
  return out;
}

export interface PostalResult {
  value: string;
  /** False when no authoritative example existed for this division. */
  real: boolean;
}

/**
 * Builds a postcode for a division.
 *
 * @param examples real codes recorded for the division (may be empty)
 * @param style    the country's postal flavour
 * @param rng      seeded generator
 */
export function makePostal(examples: readonly string[], style: PostalStyle, rng: Rng): PostalResult {
  const shape = SHAPES[style] ?? null;
  if (!shape) return { value: "", real: false };

  if (examples.length === 0) {
    // No data source for this division: emit a format-correct placeholder.
    return { value: synthetic(shape, rng), real: false };
  }

  // Prefer an example long enough to fill the head; otherwise fall back to any.
  const needed = shape.head === "all" ? 1 : shape.head;
  const usable = examples.filter((e) => alnum(e).length >= needed);
  const example = rng.pick(usable.length ? usable : examples);

  const body = alnum(example);

  // Country-specific handling of the head.
  let head: string;
  if (style === "gb") {
    // GeoNames stores the outward code only for the UK ("HU1", "M9", "BN91"),
    // except for a few rows that carry the full postcode. So: cut at the space
    // when one is present, otherwise the whole value is the outward code.
    const spaced = example.indexOf(" ");
    head = spaced > 0 ? alnum(example.slice(0, spaced)) : body;
  } else if (style === "ca") {
    // Canadian FSA: letter-digit-letter.
    head = body.slice(0, 3);
  } else if (shape.head === "all") {
    head = body;
  } else {
    head = body.slice(0, shape.head);
  }

  const tail = renderMask(shape.tail, rng);

  // Letter case matches the source data (some countries use lowercase).
  return { value: `${head}${shape.sep ?? ""}${tail}`, real: true };
}

/** Format-correct placeholder used when a country has no data source. */
function synthetic(shape: Shape, rng: Rng): string {
  // A short head keeps the placeholder from looking like a real district.
  const head = shape.head === "all" ? 2 : Math.min(shape.head, 2);
  let headStr = "";
  for (let i = 0; i < head; i++) headStr += rng.digit();
  return `${headStr}${shape.sep ?? ""}${renderMask(shape.tail, rng)}`;
}

/**
 * Human-readable format mask for a postal style, e.g. "#####" for the US or
 * "… #AA" for the UK. `#` is a digit, `A` a letter, `…` the part carried over
 * verbatim from real data.
 *
 * The mask characters are kept rather than substituted with sample digits: a
 * rendered "00000" reads as a real postal code, whereas "#####" reads as the
 * pattern it actually is.
 */
export function postalHint(style: PostalStyle): string {
  const shape = SHAPES[style];
  if (!shape) return "";
  const head = shape.head === "all" ? "…" : "#".repeat(shape.head);
  return `${head}${shape.sep ?? ""}${shape.tail}`;
}

export { SHAPES };
