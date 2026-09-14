/**
 * Card network definitions.
 *
 * Each network carries everything needed to build a plausible number for it and
 * to render it on a card face:
 *
 *   prefixes  issuer identification number ranges, as strings, so a number can
 *             start the way a real one of that network does — this is what makes
 *             a payment form recognise the brand instead of falling back to
 *             "unknown card". Several are generated from ranges (Mastercard's
 *             2221-2720 block, JCB's 3528-3589) rather than listed by hand.
 *   lengths   card number lengths in use, before adding the check digit's slot.
 *             A 16-digit number is the norm but Visa and UnionPay also issue 19.
 *   gaps      digit positions where the grouping changes, so the number renders
 *             the way it is printed on a card (Amex 4-6-5, Diners 4-6-4, the
 *             rest in fours).
 *   cvv      3, or 4 for American Express.
 *   theme     the card-face gradient, per the chosen visual direction: each
 *             network gets its own colour so the brand is readable at a glance.
 *
 * Prefixes are *not* real issuer BINs tied to a bank; they are the public
 * network ranges, which is exactly what a test number should mimic.
 */

export type NetworkId =
  | "Visa"
  | "Mastercard"
  | "Amex"
  | "Discover"
  | "JCB"
  | "UnionPay"
  | "Diners";

export interface CardTheme {
  /** CSS gradient for the front face. */
  from: string;
  via: string;
  to: string;
  /** Foreground; light cards use ink. */
  ink: string;
  /** Muted foreground for labels. */
  inkMuted: string;
}

export interface Network {
  id: NetworkId;
  /** Display name, ASCII, used as the card-face wordmark. */
  label: string;
  prefixes: string[];
  /**
   * Prefixes used when *generating* a number, when they differ from the
   * detectable set. UnionPay is the case that needs this: it is detected from
   * "62", but the 622126-622925 sub-block belongs to Discover (ISO assigned it
   * there), so a generated UnionPay number must avoid it or it would be
   * identified as a Discover card.
   */
  genPrefixes?: string[];
  lengths: number[];
  /** Grouping segments; their sum must equal the chosen length. */
  gaps: number[];
  cvv: 3 | 4;
  theme: CardTheme;
}

/** Builds every prefix string in an inclusive numeric range at a fixed width. */
function range(from: number, to: number, width: number): string[] {
  const out: string[] = [];
  for (let n = from; n <= to; n++) out.push(String(n).padStart(width, "0"));
  return out;
}

/** Expands a list that may contain `[from, to, width]` ranges and literals. */
type PrefixSpec = string | [number, number, number];
function expand(specs: PrefixSpec[]): string[] {
  const out: string[] = [];
  for (const s of specs) {
    if (typeof s === "string") out.push(s);
    else out.push(...range(s[0], s[1], s[2]));
  }
  return out;
}

export const NETWORKS: Record<NetworkId, Network> = {
  Visa: {
    id: "Visa",
    label: "VISA",
    prefixes: ["4"],
    lengths: [16, 19],
    gaps: [4, 8, 12, 16],
    cvv: 3,
    theme: {
      from: "#1a1f71",
      via: "#2b3a8f",
      to: "#0b1150",
      ink: "#ffffff",
      inkMuted: "rgba(255,255,255,.72)",
    },
  },
  Mastercard: {
    id: "Mastercard",
    label: "mastercard",
    // 51-55 plus the 2221-2720 block Mastercard has issued since 2017.
    prefixes: expand([[51, 55, 0], [2221, 2720, 0]]),
    lengths: [16],
    gaps: [4, 8, 12, 16],
    cvv: 3,
    theme: {
      from: "#b02a37",
      via: "#e4572e",
      to: "#7a1622",
      ink: "#ffffff",
      inkMuted: "rgba(255,255,255,.78)",
    },
  },
  Amex: {
    id: "Amex",
    label: "AMERICAN EXPRESS",
    prefixes: ["34", "37"],
    lengths: [15],
    gaps: [4, 10, 15],
    cvv: 4,
    theme: {
      from: "#0f7b8a",
      via: "#12a4b8",
      to: "#0a5661",
      ink: "#ffffff",
      inkMuted: "rgba(255,255,255,.78)",
    },
  },
  Discover: {
    id: "Discover",
    label: "DISCOVER",
    // 6011, 644-649, 65, and the 622126-622925 block.
    prefixes: expand(["6011", [644, 649, 0], "65", [622126, 622925, 0]]),
    lengths: [16, 19],
    gaps: [4, 8, 12, 16],
    cvv: 3,
    theme: {
      from: "#c2410c",
      via: "#f59e0b",
      to: "#7c2d12",
      ink: "#ffffff",
      inkMuted: "rgba(255,255,255,.8)",
    },
  },
  JCB: {
    id: "JCB",
    label: "JCB",
    prefixes: expand([[3528, 3589, 0]]),
    lengths: [16, 19],
    gaps: [4, 8, 12, 16],
    cvv: 3,
    theme: {
      from: "#0b5d3b",
      via: "#12a15f",
      to: "#063d27",
      ink: "#ffffff",
      inkMuted: "rgba(255,255,255,.78)",
    },
  },
  UnionPay: {
    id: "UnionPay",
    label: "UnionPay 银联",
    // UnionPay is 62xxxx; the 622126-622925 slice is shared with Discover.
    prefixes: ["62"],
    /*
     * Generation deliberately avoids the 622xxx sub-block. ISO assigned
     * 622126-622925 to Discover, so a UnionPay number drawn from there would be
     * detected as Discover — which the test suite caught. These three-digit
     * prefixes all fall outside it and still leave the rest of the number free.
     */
    genPrefixes: ["620", "621", "623", "624", "625", "626", "627", "628"],
    lengths: [16, 19],
    gaps: [4, 8, 12, 16],
    cvv: 3,
    theme: {
      from: "#a51c30",
      via: "#d42a3c",
      to: "#1e3a8a",
      ink: "#ffffff",
      inkMuted: "rgba(255,255,255,.8)",
    },
  },
  Diners: {
    id: "Diners",
    label: "Diners Club",
    // 300-305, 3095, 36, 38-39.
    prefixes: expand([[3000, 3059, 0], "3095", "36", "38", "39"]),
    lengths: [14, 16],
    gaps: [4, 10, 14],
    cvv: 3,
    theme: {
      from: "#334155",
      via: "#475569",
      to: "#1e293b",
      ink: "#ffffff",
      inkMuted: "rgba(255,255,255,.72)",
    },
  },
};

/** Networks in display order: domestic-first for a Chinese-language audience. */
export const NETWORK_ORDER: NetworkId[] = [
  "UnionPay",
  "Visa",
  "Mastercard",
  "Amex",
  "Discover",
  "JCB",
  "Diners",
];

/**
 * Guesses the network from a (possibly partial) number.
 *
 * Longest-prefix wins, so "6011" resolves to Discover before "6" could resolve
 * to UnionPay. Returns null when nothing matches yet, which the caller treats as
 * "keep letting the visitor type".
 */
export function detectNetwork(digits: string): NetworkId | null {
  const d = digits.replace(/\D+/g, "");
  if (!d) return null;

  let best: { id: NetworkId; len: number } | null = null;
  for (const id of NETWORK_ORDER) {
    for (const p of NETWORKS[id].prefixes) {
      if (p.length > d.length) continue;
      if (!d.startsWith(p)) continue;
      if (!best || p.length > best.len) best = { id, len: p.length };
    }
  }
  return best?.id ?? null;
}

/**
 * True when every prefix of the network that could still match `digits` is
 * consistent — used to keep the length/grouping hint sensible while typing.
 * A network is "possible" when some prefix either is a prefix of `digits` or
 * has `digits` as a prefix.
 */
export function networkPossible(id: NetworkId, digits: string): boolean {
  const d = digits.replace(/\D+/g, "");
  if (!d) return true;
  return NETWORKS[id].prefixes.some((p) => p.startsWith(d) || d.startsWith(p));
}

/**
 * The grouping segments that apply to a given length.
 *
 * A network's own `gaps` are used when they end on `length`; otherwise the
 * number falls back to fours. That covers the lengths a network lists but does
 * not print with its main grouping (Visa 19, UnionPay 19, JCB 19, Diners 16).
 */
export function gapsFor(id: NetworkId, length: number): number[] {
  const network = NETWORKS[id];
  if (network.gaps[network.gaps.length - 1] === length) return network.gaps;
  const out: number[] = [];
  for (let g = 4; g < length; g += 4) out.push(g);
  out.push(length);
  return out;
}

/** Formats a digit string on the network's print grouping. */
export function formatNumber(digits: string, id: NetworkId): string {
  const groups: string[] = [];
  let prev = 0;
  for (const gap of gapsFor(id, digits.length)) {
    if (gap > digits.length) break;
    groups.push(digits.slice(prev, gap));
    prev = gap;
  }
  if (prev < digits.length) groups.push(digits.slice(prev));
  return groups.filter(Boolean).join(" ");
}
