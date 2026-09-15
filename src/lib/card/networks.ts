/**
 * Card network definitions.
 *
 * Every field here is taken from the public ISO/IEC 7812 issuer ranges as
 * documented for each scheme (Wikipedia "Payment card number", BIN databases;
 * see the per-network comments). The point of a test card number is that a real
 * payment form recognises it, so the length and prefix must be the ones the
 * network actually issues — not a convenient round number.
 *
 *   network    IIN ranges                     length   CVV
 *   Visa       4                              16, 19   3
 *   Mastercard 51-55, 2221-2720               16       3
 *   Amex       34, 37                         15       4
 *   Discover   6011, 622126-622925, 644-649, 65   16, 19   3
 *   JCB        3528-3589                      16       3
 *   UnionPay   62                             16-19    3
 *   Diners     30 (300-305, 3095), 36, 38, 39 14, 16   3
 *
 * Grouping is how the number is printed on a card: fours for most, 4-6-5 for
 * Amex, 4-6-4 for a 14-digit Diners, and 4-4-4-4-3 for a 19-digit number.
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
  /**
   * Issuer identification prefixes, used for detection and default for
   * generation. Longest match wins in `detectNetwork`.
   */
  prefixes: string[];
  /**
   * Prefixes used when *generating*, when they differ from the detectable set.
   * UnionPay needs this: it is detected from "62", but the 622126-622925
   * sub-block belongs to Discover (ISO assigned it there), so a generated
   * UnionPay number must avoid it or it would be read as a Discover card.
   */
  genPrefixes?: string[];
  /** Card number lengths the network actually issues. */
  lengths: number[];
  /** Print grouping; the last segment is the full length. */
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
    // Visa issues 13, 16 and 19; 13-digit cards are legacy and no longer
    // issued, so only the two lengths in circulation are generated.
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
    // Amex is the one major network that is not 16 digits.
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
    // 6011, 644-649, 65, and the 622126-622925 block (co-branded with UnionPay).
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
    // JCB is 3528-3589 and only ever 16 digits. An earlier version generated
    // 19-digit JCB numbers, which no real JCB card uses.
    prefixes: expand([[3528, 3589, 0]]),
    lengths: [16],
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
    // UnionPay is 62xxxx; the 622126-622925 slice is co-branded with Discover.
    prefixes: ["62"],
    /*
     * Generation avoids the 622xxx sub-block. ISO assigned 622126-622925 to
     * Discover, so a UnionPay number drawn from there would be read as a
     * Discover card. These three-digit prefixes are real UnionPay ranges and
     * all fall outside that block.
     */
    genPrefixes: ["620", "621", "623", "624", "625", "626", "627", "628"],
    // UnionPay is 16-19 digits, the widest range of any network.
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
    // 300-305 (Carte Blanche), 3095, 36, 38, 39. Kept as 3/4-digit prefixes so
    // a partially typed "30" or "309" is still recognised.
    prefixes: ["300", "301", "302", "303", "304", "305", "3095", "36", "38", "39"],
    // 14 is the classic Diners length; 16 also exists.
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

function clean(digits: string): string {
  return digits.replace(/\D+/g, "");
}

/**
 * The network a *finished* number belongs to.
 *
 * Definitive: some issuer prefix must be a prefix of the number. The longest
 * matching prefix wins, so 6011 resolves to Discover rather than a bare "6".
 * Returns null when nothing matches, which the caller treats as "still typing".
 */
export function detectNetwork(digits: string): NetworkId | null {
  const d = clean(digits);
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
 * The network a *partial* number most likely belongs to.
 *
 * Unlike `detectNetwork`, this also accepts the case where the typed digits are
 * a prefix of a known issuer range — "309" is not a complete Diners IIN but is
 * a prefix of "3095", and a visitor halfway through typing expects the form to
 * keep up. The longest overlap wins; ties fall back to display order, which
 * puts UnionPay before Discover so a bare "62" reads as UnionPay.
 *
 * Used by the completion flow, where the input is by definition partial.
 */
export function guessNetwork(digits: string): NetworkId | null {
  const d = clean(digits);
  if (!d) return null;

  let best: { id: NetworkId; overlap: number } | null = null;
  for (const id of NETWORK_ORDER) {
    for (const p of NETWORKS[id].prefixes) {
      // Either the number has reached the IIN, or the IIN is still ahead of it.
      const overlap = d.startsWith(p) ? p.length : p.startsWith(d) ? d.length : 0;
      if (overlap === 0) continue;
      if (!best || overlap > best.overlap) best = { id, overlap };
    }
  }
  return best?.id ?? null;
}

/**
 * The grouping segments that apply to a given length.
 *
 * A network's own `gaps` are used when they end on `length`; otherwise the
 * number falls back to fours. That covers the lengths a network lists but does
 * not print with its main grouping (Visa 19, UnionPay 19): those print as
 * 4-4-4-4-3, which is exactly what "fours, then the remainder" produces.
 */
export function gapsFor(id: NetworkId, length: number): number[] {
  const network = NETWORKS[id];
  if (network.gaps[network.gaps.length - 1] === length) return [...network.gaps];
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
