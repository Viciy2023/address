/**
 * Deterministic illustrated avatars, drawn as inline SVG.
 *
 * Why not a photo avatar service: the previous implementation loaded a
 * photorealistic portrait from a CDN. Those images are AI-generated rather than
 * of real people, but they are photographically realistic, and a synthetic
 * identity tool is the wrong place for a face that looks like a real person.
 * It also required a third-party request, contradicting the site's own
 * statement that generation happens entirely in the browser.
 *
 * These avatars are flat geometric illustrations, drawn from the record's own
 * seed so the same seed always yields the same picture. Nothing is fetched.
 */

import type { Identity } from "./index.js";

/** Deterministic 32-bit hash so the same seed always gives the same avatar. */
function hash(seed: number, salt: number): number {
  let h = (seed ^ (salt * 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** Picks from a list using a hash slot. */
function pick<T>(arr: readonly T[], seed: number, salt: number): T {
  return arr[hash(seed, salt) % arr.length];
}

/* Background and feature palettes. Chosen to stay legible in light and dark. */
const BACKGROUNDS = [
  "#dbeafe", "#e0e7ff", "#fce7f3", "#dcfce7", "#fef3c7",
  "#ffe4e6", "#cffafe", "#ede9fe", "#d1fae5", "#fee2e2",
];
const HAIR_COLORS = ["#2f2a26", "#4a3520", "#6b4423", "#935116", "#c88c3c", "#1f2a44", "#5b3a29", "#8b5e3c"];
const SKIN_TONES = ["#f2d3b8", "#e8c39e", "#d9a877", "#b87f52", "#8d5a3b", "#6b4226"];
const SHIRT_COLORS = ["#2563eb", "#0ea5e9", "#059669", "#7c3aed", "#db2777", "#ea580c", "#475569", "#0d9488"];
const GLASSES = ["none", "none", "none", "round", "square"];

/**
 * Builds an SVG avatar for a record.
 *
 * The drawing is a simple flat portrait: background, shoulders, head, hair and
 * optional glasses. Every choice is derived from the seed, so the output is
 * stable and reproducible.
 */
export function avatarSvg(identity: Identity): string {
  const seed = identity.seed;
  const female = identity.summary.gender !== "Male";

  const bg = pick(BACKGROUNDS, seed, 1);
  const skin = pick(SKIN_TONES, seed, 2);
  const hair = pick(HAIR_COLORS, seed, 3);
  const shirt = pick(SHIRT_COLORS, seed, 4);
  const glasses = pick(GLASSES, seed, 5);
  const longHair = female ? hash(seed, 6) % 10 < 7 : hash(seed, 6) % 10 < 2;

  const parts: string[] = [];

  // Background.
  parts.push(`<rect width="128" height="128" fill="${bg}"/>`);

  // Shoulders.
  parts.push(
    `<path d="M14 128c0-24 22-38 50-38s50 14 50 38z" fill="${shirt}"/>`,
  );

  // Hair behind the head when long.
  if (longHair) {
    parts.push(`<ellipse cx="64" cy="62" rx="34" ry="40" fill="${hair}"/>`);
  }

  // Head and ears.
  parts.push(`<circle cx="64" cy="58" r="28" fill="${skin}"/>`);
  parts.push(`<circle cx="36" cy="60" r="6" fill="${skin}"/>`);
  parts.push(`<circle cx="92" cy="60" r="6" fill="${skin}"/>`);

  // Hair on top.
  parts.push(`<path d="M36 52a28 28 0 0 1 56 0c0-16-12-24-28-24s-28 8-28 24z" fill="${hair}"/>`);

  // Eyes.
  parts.push(`<circle cx="54" cy="58" r="3.2" fill="#1f2937"/>`);
  parts.push(`<circle cx="74" cy="58" r="3.2" fill="#1f2937"/>`);

  // Brows.
  parts.push(`<rect x="49" y="50" width="10" height="2.4" rx="1.2" fill="${hair}"/>`);
  parts.push(`<rect x="69" y="50" width="10" height="2.4" rx="1.2" fill="${hair}"/>`);

  // Mouth.
  parts.push(`<path d="M57 72q7 5 14 0" stroke="#9a5b4a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`);

  // Glasses.
  if (glasses === "round") {
    parts.push(
      `<circle cx="54" cy="58" r="9" fill="none" stroke="#334155" stroke-width="2"/>` +
        `<circle cx="74" cy="58" r="9" fill="none" stroke="#334155" stroke-width="2"/>` +
        `<path d="M63 58h2" stroke="#334155" stroke-width="2"/>`,
    );
  } else if (glasses === "square") {
    parts.push(
      `<rect x="45" y="51" width="18" height="14" rx="3" fill="none" stroke="#334155" stroke-width="2"/>` +
        `<rect x="65" y="51" width="18" height="14" rx="3" fill="none" stroke="#334155" stroke-width="2"/>` +
        `<path d="M63 58h2" stroke="#334155" stroke-width="2"/>`,
    );
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="">${parts.join("")}</svg>`;
}
