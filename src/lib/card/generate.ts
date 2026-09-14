/**
 * Card generation.
 *
 * Two ways in, matching the two reference tools:
 *
 *   1. `generateCard` builds a fresh number for a network (or any network).
 *   2. `completeCard` takes a partial number the visitor typed — a BIN, or a
 *      mask with `x`/`*` for the unknown positions — and fills it to a full,
 *      Luhn-valid number. The digits the visitor typed are always preserved
 *      verbatim; only the gaps and the check digit are filled.
 *
 * Both are pure functions of their seed, so a card can be reproduced from its
 * seed the same way an identity can.
 */

import { Rng, seedFromString } from "../generator/rng.js";
import { luhnCheckDigit, digitsOnly } from "./luhn.js";
import {
  NETWORKS,
  NETWORK_ORDER,
  detectNetwork,
  formatNumber,
  type NetworkId,
} from "./networks.js";

export interface Card {
  network: NetworkId;
  /** Digits only, no separators. This is what the clipboard gets. */
  number: string;
  /** Print-grouped, e.g. "4539 1488 0343 6467". */
  formatted: string;
  /** "07/28". */
  expiry: string;
  expMonth: number;
  expYear: number;
  cvv: string;
  holder: string;
  bank: string;
  /** Seed that reproduces this card, as a base36 token. */
  seed: string;
}

/** Issuer names per network, for the card face's issuing-bank line. */
const BANKS: Record<NetworkId, string[]> = {
  UnionPay: ["中国工商银行", "中国建设银行", "招商银行", "中国银行", "交通银行"],
  Visa: ["Chase Bank", "Bank of America", "HSBC", "Barclays", "DBS Bank"],
  Mastercard: ["Citibank", "Standard Chartered", "Santander", "BNP Paribas"],
  Amex: ["American Express"],
  Discover: ["Discover Bank"],
  JCB: ["JCB Co., Ltd."],
  Diners: ["Diners Club International"],
};

/**
 * Cardholder names.
 *
 * Deliberately generic and international rather than drawn from the
 * country registry: a test card is issued by a global network, so the name on
 * it is not tied to a billing country.
 */
const GIVEN = [
  "ALEX", "JORDAN", "TAYLOR", "MORGAN", "CASEY", "RILEY", "JAMIE", "AVERY",
  "ROBIN", "QUINN", "DREW", "SKYLER", "REESE", "PARKER", "ROWAN", "SAGE",
  "MARIA", "ANNA", "SOFIA", "ELENA", "CLARA", "NINA", "LAURA", "IRENE",
  "KENJI", "HARUTO", "YUKI", "REN", "MINJUN", "JIWOO", "SEOYEON", "HAEUN",
  "WEI", "MING", "JING", "LEI", "NA", "XIU", "YAN", "FANG",
];

const FAMILY = [
  "SMITH", "JOHNSON", "WILLIAMS", "BROWN", "JONES", "MILLER", "DAVIS",
  "GARCIA", "MARTINEZ", "RODRIGUEZ", "WILSON", "ANDERSON", "THOMAS",
  "TAYLOR", "MOORE", "JACKSON", "MARTIN", "LEE", "PEREZ", "THOMPSON",
  "TANAKA", "SUZUKI", "TAKAHASHI", "SATO", "KIM", "PARK", "CHOI", "JUNG",
  "WANG", "LI", "ZHANG", "LIU", "CHEN", "YANG", "HUANG", "ZHAO",
];

/** Networks whose IIN the number should start with, resolved from the choice. */
function resolveNetworks(choice: NetworkId | "random"): NetworkId[] {
  return choice === "random" ? NETWORK_ORDER : [choice];
}

/**
 * Builds one number for `id`: a real network prefix, random body, check digit.
 *
 * The length is drawn from the network's supported lengths so a 19-digit Visa
 * appears sometimes, as it does in life.
 */
function buildNumber(id: NetworkId, rng: Rng, forcedLength?: number): string {
  const net = NETWORKS[id];
  // Prefer the generation-safe prefixes when a network defines them (UnionPay
  // avoids the block that ISO assigns to Discover).
  const prefix = rng.pick(net.genPrefixes ?? net.prefixes);
  const length = forcedLength ?? rng.pick(net.lengths);
  // Body = prefix + random digits, leaving one slot for the check digit.
  const bodyLen = Math.max(length - prefix.length - 1, 1);
  const body = prefix + rng.digits(bodyLen);
  return body + String(luhnCheckDigit(body));
}

function expiry(rng: Rng): { month: number; year: number; text: string } {
  const now = new Date();
  const year = now.getFullYear() + rng.int(1, 5);
  const month = rng.int(1, 12);
  const text = `${String(month).padStart(2, "0")}/${String(year).slice(2)}`;
  return { month, year, text };
}

function makeHolder(rng: Rng): string {
  return `${rng.pick(GIVEN)} ${rng.pick(FAMILY)}`;
}

/** Assembles the descriptive fields that are not the number itself. */
function decorate(network: NetworkId, number: string, rng: Rng, seedStr: string): Card {
  const net = NETWORKS[network];
  const exp = expiry(rng);
  const cvv = net.cvv === 4 ? rng.digits(4) : rng.digits(3);
  return {
    network,
    number,
    formatted: formatNumber(number, network),
    expiry: exp.text,
    expMonth: exp.month,
    expYear: exp.year,
    cvv,
    holder: makeHolder(rng),
    bank: rng.pick(BANKS[network]),
    seed: seedStr,
  };
}

/** One card for a specific network, or a random one when `choice` is "random". */
export function generateCard(
  choice: NetworkId | "random" = "random",
  seed: number,
): Card {
  const rng = new Rng(seed);
  const id = rng.pick(resolveNetworks(choice));
  const number = buildNumber(id, rng);
  return decorate(id, number, rng, (seed >>> 0).toString(36));
}

/** A batch of cards, each from its own derived seed. */
export function generateCards(
  choice: NetworkId | "random",
  count: number,
  seed: number,
): Card[] {
  const out: Card[] = [];
  for (let i = 0; i < count; i++) {
    // Derive each card's seed from the batch seed so the whole batch is
    // reproducible from a single token.
    out.push(generateCard(choice, (seed + i * 0x9e3779b1) >>> 0));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Partial completion                                                  */
/* ------------------------------------------------------------------ */

const PLACEHOLDER = /[x*]/gi;

export interface CompleteResult {
  card: Card | null;
  /** Why completion failed, for a localized message. */
  error: "empty" | "tooShort" | "tooLong" | "unknownPrefix" | "badChars" | null;
}

/** A card number is never shorter than this, whatever the mask says. */
const MIN_LENGTH = 12;
const MAX_LENGTH = 19;

/**
 * Fills a partial number to a full, Luhn-valid one.
 *
 * Accepts spaces and hyphens anywhere, `x` or `*` for the positions to fill,
 * and a leading run of digits. The visitor's digits are never changed: only
 * placeholders, any positions past the last typed digit, and the final check
 * digit are written.
 *
 * Length rule, which is the part worth stating plainly:
 *   - a mask (with placeholders) fixes the length at its character count;
 *   - a plain number of a length the network actually issues is kept, and its
 *     last digit is recomputed as the check digit;
 *   - any other plain number is treated as a prefix and padded to the network's
 *     common length (16, or 15 for Amex and 14 for Diners).
 *
 * Either way the result must land in [12, 19] digits; anything else is refused
 * rather than dressed up as a card.
 */
export function completeCard(raw: string, seed: number): CompleteResult {
  const stripped = raw.trim().toUpperCase();
  if (!stripped) return { card: null, error: "empty" };
  if (!/^[0-9X*\s-]+$/.test(stripped)) return { card: null, error: "badChars" };

  const mask = stripped.replace(/[\s-]+/g, "");
  const digitCount = mask.replace(PLACEHOLDER, "").length;
  if (digitCount < 1) return { card: null, error: "empty" };

  // Resolve the network from the typed digits, with placeholders treated as
  // zeros so a mask like "37xxx..." still identifies Amex from its "37".
  const known = mask.replace(PLACEHOLDER, "0");
  const network =
    detectNetwork(known.slice(0, 8)) ?? detectNetwork(known.slice(0, 4)) ?? detectNetwork(known);
  if (!network) return { card: null, error: "unknownPrefix" };

  const net = NETWORKS[network];
  const hasMask = PLACEHOLDER.test(mask);
  PLACEHOLDER.lastIndex = 0;

  let target: number;
  if (hasMask) {
    // The mask states the intended length.
    target = mask.length;
  } else if (net.lengths.includes(mask.length)) {
    target = mask.length;
  } else {
    // A bare prefix: pad to the network's common length. Never truncate.
    target = net.lengths[0];
    if (mask.length >= target) {
      // Typed digits already reach the common length but not a supported one
      // (e.g. 17 digits for Visa, which issues 16 and 19): round up.
      target = net.lengths.find((l) => l >= mask.length) ?? mask.length + 1;
    }
  }

  if (target < MIN_LENGTH) return { card: null, error: "tooShort" };
  if (target > MAX_LENGTH) return { card: null, error: "tooLong" };

  const rng = new Rng(seed);
  // Fill positions 0..target-2, honouring typed digits; position target-1 is
  // reserved for the check digit.
  const bodyChars: string[] = [];
  for (let i = 0; i < target - 1; i++) {
    const ch = mask[i];
    bodyChars.push(ch && /\d/.test(ch) ? ch : rng.digit());
  }
  const body = bodyChars.join("");
  const number = body + String(luhnCheckDigit(body));

  /*
   * Label the card by what the *finished* number detects as, not by what the
   * partial prefix suggested.
   *
   * A typed prefix can be ambiguous: "6222" is UnionPay by length-2 detection
   * but the full 6222xx range sits in the block ISO assigns to Discover. The
   * finished number is the authority, so re-detecting it keeps the label honest
   * rather than showing a Discover-shaped number under a UnionPay heading.
   */
  const finalNetwork = detectNetwork(number) ?? network;
  const seedStr = (seed >>> 0).toString(36);
  return { card: decorate(finalNetwork, number, rng, seedStr), error: null };
}

/** A seed from arbitrary text, so a typed mask reproduces the same filling. */
export function seedForInput(text: string, salt = 0): number {
  return (seedFromString(text) + salt) >>> 0;
}
