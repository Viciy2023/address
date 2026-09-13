/**
 * Deterministic pseudo-random number generation.
 *
 * A seeded generator is used rather than `Math.random` so that a generated
 * identity can be reproduced from its seed. That makes the tool usable in
 * tests, lets users share a result via URL, and keeps SSR and client output
 * identical when the same seed is used.
 *
 * mulberry32 is chosen because it is small, fast, and has good distribution
 * for this purpose.
 */

export class Rng {
  private state: number;

  constructor(seed: number) {
    // Force into uint32 range so a bad seed cannot stall the generator.
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    if (max < min) [min, max] = [max, min];
    return min + Math.floor(this.next() * (max - min + 1));
  }

  /** Uniform float in [min, max). */
  float(min: number, max: number, decimals = 1): number {
    const v = min + this.next() * (max - min);
    const f = 10 ** decimals;
    return Math.round(v * f) / f;
  }

  /** Picks one element. Returns undefined only for an empty array. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Picks `n` distinct elements (or all, if fewer are available). */
  sample<T>(arr: readonly T[], n: number): T[] {
    if (n >= arr.length) return [...arr];
    const copy = [...arr];
    const out: T[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(this.next() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  /** True with probability `p`. */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /** Random digit '0'-'9'. */
  digit(): string {
    return String(this.int(0, 9));
  }

  /** `n` random digits. */
  digits(n: number): string {
    let s = "";
    for (let i = 0; i < n; i++) s += this.digit();
    return s;
  }

  /** Uppercase letter A-Z. */
  letter(): string {
    return String.fromCharCode(65 + this.int(0, 25));
  }

  /** `n` uppercase letters. */
  letters(n: number): string {
    let s = "";
    for (let i = 0; i < n; i++) s += this.letter();
    return s;
  }
}

/** Derives a uint32 seed from a string (FNV-1a). */
export function seedFromString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Fresh random 32-bit seed, used when the user asks for "another one". */
export function randomSeed(): number {
  const buf = new Uint32Array(1);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(buf);
    return buf[0];
  }
  return (Math.random() * 0xffffffff) >>> 0;
}

/** Formats a 32-bit seed as a short, shareable base36 string. */
export function seedToString(seed: number): string {
  return (seed >>> 0).toString(36);
}

/** Parses a seed produced by `seedToString`. Returns null when invalid. */
export function seedFromToken(token: string): number | null {
  if (!/^[0-9a-z]{1,7}$/i.test(token)) return null;
  const v = parseInt(token, 36);
  return Number.isFinite(v) ? v >>> 0 : null;
}
