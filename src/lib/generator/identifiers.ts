/**
 * National identifier generation.
 *
 * Each function emits a value in the country's real document format. Where the
 * document has a published check-digit algorithm, the algorithm is implemented
 * so the value passes format validators — a common requirement when testing
 * signup flows.
 *
 * Identifiers are not independent of the rest of the record. Several schemes
 * encode the holder's date of birth and sex *inside the number*:
 *
 *   CN  resident ID   region(6) + YYYYMMDD + seq(3) + check
 *   KR  resident no.  YYMMDD + century/sex digit + seq
 *   SE  personnummer  YYMMDD + seq + check
 *   NO  fødselsnummer DDMMYY + seq + check
 *   PL  PESEL         YYMMDD(century-shifted) + seq + check
 *   ZA  ID number     YYMMDD + seq + check
 *   AE  Emirates ID   year of birth in field 2
 *
 * When each generator drew its own date, the ID contradicted the profile it was
 * part of — a Chinese record showed a birth date of 1991-08-06 beside an ID
 * reading 1978-07-02. Identifiers that need these values now receive them in
 * `IdContext` instead of inventing their own.
 *
 * The `demo` flag surfaced by the generator is `!hasRealChecksum` from the
 * registry, and drives a "format only" note in the UI. These values are
 * synthetic; they are not, and cannot be, issued identifiers.
 */

import type { Rng } from "./rng.js";

const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Facts about the record that some identifier schemes encode internally.
 * All fields are optional so that identifiers with no such dependency keep
 * their single-argument shape.
 */
export interface IdContext {
  /** ISO birth date, "YYYY-MM-DD". */
  birthDate?: string;
  gender?: "male" | "female";
  /**
   * Region prefix for schemes that require one (the 6-digit code at the start
   * of a Chinese resident ID). Taken from the chosen administrative division so
   * the ID agrees with the address on the same record.
   */
  regionCode?: string;
  /** 2-digit year of birth, used by schemes that store only the decade. */
  birthYear2?: string;
  /** 1-digit century/sex marker used by the Korean scheme. */
  century?: string;
}

/** Splits an ISO date into the numeric parts schemes need. */
function parts(ctx: IdContext): { yyyy: string; yy: string; mm: string; dd: string } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ctx.birthDate ?? "");
  if (!m) return null;
  return { yyyy: m[1], yy: m[1].slice(2), mm: m[2], dd: m[3] };
}

/** US SSN. Post-2011 rules: area 001-899 excluding 666; group 01-99; serial 0001-9999. */
function ssn(rng: Rng): string {
  let area = 0;
  do {
    area = rng.int(1, 899);
  } while (area === 666);
  const group = rng.int(1, 99);
  const serial = rng.int(1, 9999);
  return `${String(area).padStart(3, "0")}-${String(group).padStart(2, "0")}-${String(serial).padStart(4, "0")}`;
}

/** Canadian SIN: 9 digits with a Luhn check digit. */
function sin(rng: Rng): string {
  const base = rng.digits(8);
  const digits = base.split("").map(Number);
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    // Double every second digit counting from the right of the 8-digit prefix.
    let v = digits[7 - i];
    if (i % 2 === 0) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  const check = (10 - (sum % 10)) % 10;
  const full = base + String(check);
  return `${full.slice(0, 3)}-${full.slice(3, 6)}-${full.slice(6)}`;
}

/** UK National Insurance number: 2 letters (excluding some) + 6 digits + A-D. */
function nino(rng: Rng): string {
  const banned = new Set(["D", "F", "I", "Q", "U", "V"]);
  const allowed = L.split("").filter((c) => !banned.has(c));
  const p1 = allowed[rng.int(0, allowed.length - 1)];
  const p2 = allowed[rng.int(0, allowed.length - 1)];
  const suffix = "ABCD"[rng.int(0, 3)];
  return `${p1}${p2} ${rng.digits(2)} ${rng.digits(2)} ${rng.digits(2)} ${suffix}`;
}

/**
 * Australian TFN: 9 digits, mod-11 weighted check.
 *
 * Weights [1,4,3,7,5,8,6,9,10] over all nine digits must total ≡ 0 (mod 11).
 * Since the last weight is 10 ≡ −1, the ninth digit is simply the first eight
 * digits' weighted sum mod 11 — not 11 minus it, which is what this used to
 * compute and which produced numbers no TFN validator accepts.
 *
 * A weighted sum that lands on 10 has no single-digit check value, so such
 * prefixes are redrawn.
 */
function tfn(rng: Rng): string {
  const weights = [1, 4, 3, 7, 5, 8, 6, 9];
  for (;;) {
    const base = rng.digits(8);
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += Number(base[i]) * weights[i];
    const check = sum % 11;
    if (check >= 10) continue;
    const full = base + String(check);
    return `${full.slice(0, 3)} ${full.slice(3, 6)} ${full.slice(6)}`;
  }
}

/** German ID: 9 alphanumeric characters (format only). */
function deId(rng: Rng): string {
  return rng.letter() + rng.digits(8);
}

/**
 * French NIR (INSEE): 13 digits + a 2-digit control key.
 *
 *   S YY MM DDEPT CCC OOO   +   KK
 *   S     sex, 1 male / 2 female
 *   YY    year of birth
 *   MM    month of birth
 *   DDEPT department of birth (2 digits)
 *   CCC   commune of birth
 *   OOO   order within the commune
 *   KK    control key = 97 − (the 13-digit number mod 97)
 *
 * There is NO day-of-birth field: the 13 digits are sex + year + month +
 * department + commune + order (1+2+2+2+3+3). The date and sex come from the
 * record so the number agrees with the profile it belongs to. Corsica (2A/2B)
 * is excluded because its letter substitution needs separate handling and the
 * key formula here does not cover it.
 */
function frInsee(rng: Rng, ctx: IdContext): string {
  const d = parts(ctx);
  const sex = ctx.gender === "male" ? "1" : ctx.gender === "female" ? "2" : String(rng.int(1, 2));
  const yy = d ? d.yy : String(rng.int(50, 99)).padStart(2, "0");
  const mm = d ? d.mm : String(rng.int(1, 12)).padStart(2, "0");
  const dept = String(rng.int(1, 95)).padStart(2, "0");
  const commune = String(rng.int(1, 999)).padStart(3, "0");
  const order = String(rng.int(1, 999)).padStart(3, "0");

  const body = `${sex}${yy}${mm}${dept}${commune}${order}`; // 13 digits
  const key = 97 - (Number(body) % 97);
  return `${body}${String(key).padStart(2, "0")}`;
}

/**
 * Italian Codice Fiscale: 16 characters, the last a mod-26 check letter.
 *
 * Layout: 3 consonants of the surname, 3 of the given name, 2-digit year,
 * 1-letter month (ABCDEHLMPRST), 2-digit day, 4-character town code, and the
 * check letter — 3+3+2+1+2+4+1 = 16. The day is +40 for women, which is why the
 * day field is not simply 01-31.
 *
 * Over the first 15 characters, odd 1-based positions use the "dispari" table
 * and even 1-based positions use the "pari" table; the sum mod 26 indexes A–Z.
 * The previous version had no day field and drew the last letter at random, so
 * it was both the wrong length and never passed validation.
 */
function itFiscal(rng: Rng, ctx: IdContext): string {
  const cons = "BCDFGHJKLMNPQRSTVWXYZ";
  const vowel = "AEIOU";
  const pickC = () => cons[rng.int(0, cons.length - 1)];
  const pickV = () => vowel[rng.int(0, vowel.length - 1)];
  const surname = pickC() + pickC() + pickC();
  const name = pickC() + pickV() + pickC();

  const d = parts(ctx);
  const year = d ? d.yy : String(rng.int(0, 99)).padStart(2, "0");
  const month = "ABCDEHLMPRST"[d ? Number(d.mm) - 1 : rng.int(0, 11)];
  // Day is gender-shifted: +40 for women.
  const dayNum = d ? Number(d.dd) : rng.int(1, 28);
  const day = String(dayNum + (ctx.gender === "female" ? 40 : 0)).padStart(2, "0");
  const town = rng.letter() + rng.digits(3);

  const body = `${surname}${name}${year}${month}${day}${town}`;
  return body + itCheckChar(body);
}

/** The odd/even value tables and mod-26 check letter for a 15-char CF body. */
const CF_ODD: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};
const CF_EVEN = (c: string) => (/\d/.test(c) ? Number(c) : c.charCodeAt(0) - 65);

function itCheckChar(body: string): string {
  let sum = 0;
  for (let i = 0; i < 15; i++) sum += i % 2 === 0 ? CF_ODD[body[i]] ?? 0 : CF_EVEN(body[i]);
  return String.fromCharCode(65 + (sum % 26));
}

/** Spanish DNI: 8 digits + control letter (mod-23 table). */
function esDni(rng: Rng): string {
  const table = "TRWAGMYFPDXBNJZSQVHLCKE";
  const n = rng.int(10000000, 99999999);
  return `${n}${table[n % 23]}`;
}

/** Portuguese NIF: 9 digits with modulus-11 check digit. */
function ptNif(rng: Rng): string {
  const base = String(rng.int(1, 3)) + rng.digits(7);
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(base[i]) * (9 - i);
  const r = sum % 11;
  const check = r < 2 ? 0 : 11 - r;
  return `${base}${check}`;
}

/**
 * Dutch BSN: 9 digits passing the "11-test" (elfproef).
 *
 * Weights are [9,8,7,6,5,4,3,2,−1] and the total must be ≡ 0 (mod 11). Rather
 * than draw nine digits and hope, the last digit is SOLVED for: with the first
 * eight fixed, the ninth must equal their weighted sum mod 11.
 *
 * The previous version drew random digits and retried up to 40 times, then gave
 * up and returned the random digits unchanged — so a small share of output
 * (measured: 8 in 500) failed the elfproef outright. It also ignored that 10
 * has no single-digit solution, which is why retries were needed at all.
 */
function nlBsn(rng: Rng): string {
  for (;;) {
    const base = rng.digits(8);
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += Number(base[i]) * (9 - i);
    const check = sum % 11;
    // 10 is not a digit; redraw the prefix when it occurs.
    if (check === 10) continue;
    return base + String(check);
  }
}

/**
 * Swedish personnummer: YYMMDD-XXXX with a Luhn check digit.
 *
 * The third digit of the serial (the ninth digit overall) is odd for male and
 * even for female.
 */
function sePersonnummer(rng: Rng, ctx: IdContext): string {
  const d = parts(ctx);
  const year = d ? d.yy : String(rng.int(50, 99));
  const month = d ? d.mm : String(rng.int(1, 12)).padStart(2, "0");
  const day = d ? d.dd : String(rng.int(1, 28)).padStart(2, "0");

  const serial2 = String(rng.int(0, 99)).padStart(2, "0");
  const wantOdd = ctx.gender === "male" ? true : ctx.gender === "female" ? false : rng.chance(0.5);
  const lastDigit = rng.int(0, 9);
  const serial3 = String(Number(lastDigit) % 2 === (wantOdd ? 1 : 0) ? lastDigit : (lastDigit + 1) % 10);

  const payload = year + month + day + serial2 + serial3;
  let sum = 0;
  for (let i = 0; i < payload.length; i++) {
    let v = Number(payload[i]);
    if (i % 2 === 0) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  const check = (10 - (sum % 10)) % 10;
  return `${payload.slice(0, 6)}-${payload.slice(6)}${check}`;
}

/**
 * Norwegian fødselsnummer: DDMMYY + 5 digits, of which the last two are mod-11
 * check digits.
 *
 *   K1 (10th digit): weights [3,7,6,1,8,9,4,5,2] over the first nine.
 *   K2 (11th digit): weights [5,4,3,2,7,6,5,4,3,2] over the first ten.
 *
 * For each, k = 11 − (sum mod 11); k of 11 becomes 0, and k of 10 has no valid
 * digit so the serial is redrawn. The previous version emitted five random
 * digits with no check at all, while the registry claimed hasRealChecksum.
 */
function noFnr(rng: Rng, ctx: IdContext): string {
  const d = parts(ctx);
  const day = d ? d.dd : String(rng.int(1, 28)).padStart(2, "0");
  const month = d ? d.mm : String(rng.int(1, 12)).padStart(2, "0");
  const year = d ? d.yy : String(rng.int(50, 99)).padStart(2, "0");

  const w1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  const w2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];

  for (;;) {
    const serial = rng.digits(3); // digits 7-9
    const head = day + month + year + serial; // 9 digits

    let s1 = 0;
    for (let i = 0; i < 9; i++) s1 += Number(head[i]) * w1[i];
    const k1 = 11 - (s1 % 11);
    if (k1 === 10) continue;
    const k1d = k1 === 11 ? 0 : k1;

    const withK1 = head + k1d; // 10 digits
    let s2 = 0;
    for (let i = 0; i < 10; i++) s2 += Number(withK1[i]) * w2[i];
    const k2 = 11 - (s2 % 11);
    if (k2 === 10) continue;
    const k2d = k2 === 11 ? 0 : k2;

    return `${head}${k1d}${k2d}`;
  }
}

/**
 * Polish PESEL: 11 digits, checksum = (10 - (weighted sum % 10)) % 10.
 *
 * The month field carries a century offset: 1800s +80, 1900s +0, 2000s +20,
 * so the encoded year is unambiguous across centuries.
 */
function plPesel(rng: Rng, ctx: IdContext): string {
  const d = parts(ctx);
  const yy = d ? d.yy : String(rng.int(0, 99)).padStart(2, "0");
  const birthYear = d ? Number(d.yyyy) : 1900 + Number(yy);

  let mm = d ? Number(d.mm) : rng.int(1, 12);
  const day = d ? d.dd : String(rng.int(1, 28)).padStart(2, "0");

  const centuryOffset = birthYear >= 2000 ? 20 : birthYear >= 1900 ? 0 : birthYear >= 1800 ? 80 : 0;
  mm += centuryOffset;

  const serial = rng.digits(4);
  const payload = yy + String(mm).padStart(2, "0") + day + serial;
  const weights = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(payload[i]) * weights[i];
  const check = (10 - (sum % 10)) % 10;
  return payload + check;
}

/**
 * Russian SNILS: 9 digits, then a 2-digit check number.
 *
 * Weights 9,8,…,1 over the nine digits: check = (Σ dᵢ·(9−i)) mod 101, with 100
 * written as 00. The previous version appended two random digits.
 */
function ruSnils(rng: Rng): string {
  const base = rng.digits(9);
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(base[i]) * (9 - i);
  let check = sum % 101;
  if (check === 100) check = 0;
  const padded = String(check).padStart(2, "0");
  return `${base.slice(0, 3)}-${base.slice(3, 6)}-${base.slice(6)} ${padded}`;
}

/**
 * Chinese resident ID (居民身份证号): 18 digits.
 *
 *   1-6    administrative division code (GB/T 2260)
 *   7-14   date of birth, YYYYMMDD
 *   15-17  sequence; the 17th digit is odd for male, even for female
 *   18     ISO 7064 MOD 11-2 check character
 *
 * The birth date and sex must match the rest of the record: a resident ID whose
 * embedded date disagrees with the profile is the kind of inconsistency that
 * makes test data useless.
 */
function cnResidentId(rng: Rng, ctx: IdContext): string {
  const d = parts(ctx);

  // Region: a real division prefix when the caller supplied one, otherwise a
  // plausible 6-digit code. Using the division keeps the ID consistent with the
  // address on the same record.
  const region = ctx.regionCode && /^\d{6}$/.test(ctx.regionCode)
    ? ctx.regionCode
    : String(rng.int(110000, 659000)).slice(0, 6);

  const year = d ? d.yyyy : String(rng.int(1950, 2005));
  const month = d ? d.mm : String(rng.int(1, 12)).padStart(2, "0");
  const day = d ? d.dd : String(rng.int(1, 28)).padStart(2, "0");

  // Sequence: two random digits, then a third whose parity encodes sex.
  const seq2 = String(rng.int(0, 99)).padStart(2, "0");
  const wantOdd = ctx.gender === "male" ? true : ctx.gender === "female" ? false : rng.chance(0.5);
  const last = String(rng.int(0, 9));
  const seq3 = seq2 + (Number(last) % 2 === (wantOdd ? 1 : 0) ? last : String((Number(last) + 1) % 10));

  const payload = `${region}${year}${month}${day}${seq3}`;
  const weights = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  const table = "10X98765432";
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(payload[i]) * weights[i];
  return payload + table[sum % 11];
}

/** Taiwan ID: 1 letter + 9 digits with a modulus-10 check. */
function twId(rng: Rng): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVXYWZIO";
  const letter = letters[rng.int(0, letters.length - 1)];
  const digitStr = rng.digits(8);
  const letterCode = letters.indexOf(letter) + 10;
  let sum = Math.floor(letterCode / 10) + (letterCode % 10) * 9;
  const weights = [8, 7, 6, 5, 4, 3, 2, 1];
  for (let i = 0; i < 8; i++) sum += Number(digitStr[i]) * weights[i];
  const check = (10 - (sum % 10)) % 10;
  return `${letter}${digitStr}${check}`;
}

/**
 * Hong Kong ID: 1-2 letters + 6 digits + a check digit in parentheses.
 *
 * The check is mod 11 over eight weighted positions. The character values are
 * the crux: a letter is worth its alphabet position plus 9 (A=10 … Z=35), and a
 * *single-letter* ID is left-padded with a space worth 36. The previous version
 * used A=1 and ignored the pad, so every check digit it printed was rejected.
 *
 * Weights are 9,8,7,6,5,4,3,2 and the check is (11 − sum mod 11) mod 11, with
 * 10 written as "A".
 */
function hkId(rng: Rng): string {
  const letter = L[rng.int(0, 25)];
  const letter2 = rng.chance(0.5) ? L[rng.int(0, 25)] : "";
  const digits = rng.digits(6);

  const chars = letter2 ? [letter, letter2, ...digits] : [" ", letter, ...digits];
  const weights = [9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const ch = chars[i];
    const value = ch === " " ? 36 : Number(ch);
    sum += (Number.isNaN(value) ? ch.charCodeAt(0) - 55 : value) * weights[i];
  }
  const check = (11 - (sum % 11)) % 11;
  return `${letter}${letter2}${digits}(${check === 10 ? "A" : check})`;
}

/**
 * Macao Resident Identity Card: 7 digits with an eighth in parentheses.
 *
 * There is NO published check-digit algorithm for the Macao BIR. The trailing
 * parenthesised digit is presentation, not a documented checksum, so this emits
 * a plausible digit and the registry marks the value format-only
 * (`hasRealChecksum: false`). Inventing a checksum here would be fabricating a
 * rule the issuing authority has not stated.
 */
function moId(rng: Rng): string {
  return `${rng.digits(7)}(${rng.digits(1)})`;
}

/** Japanese My Number: 12 digits with a weighted check digit. */
function jpMyNumber(rng: Rng): string {
  const base = rng.digits(11);
  // Weights: for the 11-digit body, positions 1-11 get 11,10,...,1 (with a
  // correction for the 12th position per the official algorithm).
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const p = 11 - i;
    const w = p <= 6 ? p + 1 : p - 5;
    sum += Number(base[i]) * w;
  }
  const r = sum % 11;
  const check = r <= 1 ? 0 : 11 - r;
  return base + check;
}

/** Korean RRN: 6 digits + hyphen + 7 digits (format only). */
/**
 * Korean resident registration number (주민등록번호): YYMMDD-GNNNNNN.
 *
 * The digit after the hyphen encodes both century and sex: 1/2 for the 1900s,
 * 3/4 for the 2000s, 5/6 for the 1800s, with the odd values male and the even
 * values female. The birth date and sex come from the record.
 *
 * The 13th digit is a mod-11 check over the first twelve (weights
 * [2,3,4,5,6,7,8,9,2,3,4,5], check = (11 − sum mod 11) mod 10). It was
 * previously left random.
 *
 * Caveat worth stating: since October 2020 the last six digits of a real RRN are
 * randomised, and a substantial minority of issued numbers fail this checksum.
 * The check digit is therefore the format the scheme was designed around, not a
 * guarantee that a number is a real person's.
 */
function krRrn(rng: Rng, ctx: IdContext): string {
  const d = parts(ctx);
  const yy = d ? d.yy : String(rng.int(50, 99)).padStart(2, "0");
  const mm = d ? d.mm : String(rng.int(1, 12)).padStart(2, "0");
  const dd = d ? d.dd : String(rng.int(1, 28)).padStart(2, "0");

  const fullYear = d ? Number(d.yyyy) : 1900 + Number(yy);
  const male = ctx.gender === "male";
  // Century + sex: 1900s -> 1/2, 2000s -> 3/4, 1800s -> 9/0.
  const centuryGender =
    fullYear >= 2000 ? (male ? "3" : "4") : fullYear >= 1900 ? (male ? "1" : "2") : male ? "9" : "0";

  const seq = rng.digits(5);
  const body = `${yy}${mm}${dd}${centuryGender}${seq}`; // 12 digits
  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(body[i]) * weights[i];
  const check = (11 - (sum % 11)) % 10;
  return `${yy}${mm}${dd}-${centuryGender}${seq}${check}`;
}

/** Indian PAN: 5 letters + 4 digits + 1 letter. */
function inPan(rng: Rng): string {
  return rng.letters(5) + rng.digits(4) + L[rng.int(0, 25)];
}

/** Indonesian NIK: 16 digits (format only). */
function idNik(rng: Rng): string {
  return rng.digits(16);
}

/** Malaysian MyKad: YYMMDD-PB-###G. */
function myKad(rng: Rng): string {
  const yy = String(rng.int(50, 99)).padStart(2, "0");
  const mm = String(rng.int(1, 12)).padStart(2, "0");
  const dd = String(rng.int(1, 28)).padStart(2, "0");
  return `${yy}${mm}${dd}-${rng.digits(2)}-${rng.digits(4)}`;
}

/**
 * Singapore NRIC/FIN: prefix letter + 7 digits + check letter.
 *
 * Weights [2,7,6,5,4,3,2]; T and G add 4 to the sum. The check letter comes
 * from one of two tables, chosen by prefix GROUP: S/T share "JZIHGFEDCBA" and
 * F/G share "XWUTRQPNMLK".
 *
 * The previous version applied the T-only offset correctly but then indexed the
 * S table for a T prefix while adding the offset, which shifted every T number's
 * letter by four places (T9597817M instead of T9597817C).
 */
function sgNric(rng: Rng): string {
  const prefix = rng.pick(["S", "T"]);
  const digits = rng.digits(7);
  const weights = [2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(digits[i]) * weights[i];
  if (prefix === "T") sum += 4;
  const table = prefix === "S" || prefix === "T" ? "JZIHGFEDCBA" : "XWUTRQPNMLK";
  return `${prefix}${digits}${table[sum % 11]}`;
}

/** Thai citizen ID: 13 digits with a modulus-11 check digit. */
function thCitizen(rng: Rng): string {
  const base = rng.digits(12);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(base[i]) * (13 - i);
  const check = (11 - (sum % 11)) % 10;
  const full = base + check;
  return `${full[0]}-${full.slice(1, 5)}-${full.slice(5, 10)}-${full.slice(10, 12)}-${full[12]}`;
}

/** Vietnamese citizen ID: 12 digits (format only). */
function vnCitizen(rng: Rng): string {
  return rng.digits(12);
}

/** UAE Emirates ID: 784-YYYY-NNNNNNN-C. */
/**
 * UAE Emirates ID: 784-YYYY-NNNNNNN-C.
 *
 * Field 2 is the year of birth, so it must match the record's own birth date.
 * The final digit is a Luhn check over the first 15 digits — the widely used
 * public implementation. IMPORTANT: the UAE ICP has never published the official
 * algorithm, and there are credible reports of genuine IDs failing Luhn, so this
 * follows the de-facto rule rather than a confirmed specification. The registry
 * is marked accordingly.
 */
function aeEmiratesId(rng: Rng, ctx: IdContext): string {
  const d = parts(ctx);
  const year = d ? d.yyyy : String(rng.int(1960, 2005));
  /*
   * The number is 15 digits: 784 (3) + year (4) + 7 sequential + check (1).
   * The body before the check is therefore 14 digits, not 15 — reading a 15th
   * gave an undefined character and produced "...-NaN".
   *
   * Luhn runs over the full 15; the rightmost body digit (index 13) doubles
   * first, so the check is the complement of the doubled sum of the body at
   * odd distance from the right.
   */
  const body = `784${year}${rng.digits(7)}`; // 14 digits
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    let v = Number(body[i]);
    // Positions at odd distance from the right (of the 15-digit whole) double.
    const fromRight = 14 - i; // distance from the check digit, 1..14
    if (fromRight % 2 === 1) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  const check = (10 - (sum % 10)) % 10;
  return `784-${year}-${body.slice(7)}-${check}`;
}

/**
 * Saudi national ID / Iqama: 10 digits with a Luhn check digit.
 *
 * The first digit is 1 for a citizen and 2 for a resident. Luhn doubles the
 * digits at 0-based even indices (every second from the right); the tenth digit
 * is solved so the total is ≡ 0 (mod 10). Previously the first digit was correct
 * but the check digit was random.
 */
function saNationalId(rng: Rng): string {
  const first = rng.chance(0.8) ? "1" : "2";
  const body = first + rng.digits(8); // 9 digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let v = Number(body[i]);
    if (i % 2 === 0) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  const check = (10 - (sum % 10)) % 10;
  return body + check;
}

/**
 * Israeli ID: 9 digits with a Luhn check digit.
 *
 * The doubling starts on the SECOND digit (0-based index 1), i.e. every second
 * digit counting from the right of the nine. The previous version doubled the
 * even indices instead, which is Luhn mis-aligned by one: it validated against
 * neither the published samples (123456782, 000000018, 053605416) nor any
 * Israeli validator.
 */
function ilId(rng: Rng): string {
  const base = rng.digits(8);
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    let v = Number(base[i]);
    if (i % 2 === 1) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  // The ninth digit's weight is 1 in this alignment, so it carries the
  // complement of the running total.
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}

/**
 * Turkish T.C. Kimlik No: 11 digits with two check digits.
 *
 *   D10 = ((d1+d3+d5+d7+d9)·7 − (d2+d4+d6+d8)) mod 10
 *   D11 = (d1+…+d10) mod 10
 *
 * The first formula goes negative whenever the even-position sum outweighs the
 * odd one, and JavaScript's % keeps the sign (−233 % 10 === −3). The old code
 * used that raw value, so roughly half the numbers carried a negative check
 * digit and failed validation. The result is normalised into 0..9 here.
 */
function trKimlik(rng: Rng): string {
  const first = rng.int(1, 9); // a leading 0 is not issued
  const rest = rng.digits(8).split("").map(Number); // d2..d9
  // d1 + d3 + d5 + d7 + d9 — odd POSITIONS, which are rest[1], rest[3], ...
  const oddSum = first + rest[1] + rest[3] + rest[5] + rest[7];
  // d2 + d4 + d6 + d8
  const evenSum = rest[0] + rest[2] + rest[4] + rest[6];
  const tenth = (((oddSum * 7 - evenSum) % 10) + 10) % 10;
  const eleventh = (oddSum + evenSum + tenth) % 10;
  return `${first}${rest.join("")}${tenth}${eleventh}`;
}

/** Brazilian CPF: 11 digits with two check digits. */
function brCpf(rng: Rng): string {
  const base = rng.digits(9).split("").map(Number);
  const calc = (arr: number[]) => {
    const weights = arr.length === 9 ? [10, 9, 8, 7, 6, 5, 4, 3, 2] : [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = arr.reduce((s, v, i) => s + v * weights[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(base);
  const d2 = calc([...base, d1]);
  const full = [...base, d1, d2].join("");
  return `${full.slice(0, 3)}.${full.slice(3, 6)}.${full.slice(6, 9)}-${full.slice(9)}`;
}

/**
 * Mexican CURP: 4 initials + 6 date digits + sex + 2-letter state +
 * 3 internal consonants + homoclave + check digit = 18 characters.
 */
function mxCurp(rng: Rng, ctx: IdContext): string {
  const vowel = "AEIOU";
  const cons = "BCDFGHJKLMNPQRSTVWXYZ";
  const v = () => vowel[rng.int(0, 4)];
  const c = () => cons[rng.int(0, cons.length - 1)];
  const states = ["AS", "BC", "CM", "CS", "DF", "GT", "JC", "MC", "MN", "NL", "QR", "SL", "TC", "VZ", "YN", "ZS"];

  const d = parts(ctx);
  const yy = d ? d.yy : String(rng.int(50, 99));
  const mm = d ? d.mm : String(rng.int(1, 12)).padStart(2, "0");
  const dd = d ? d.dd : String(rng.int(1, 28)).padStart(2, "0");

  // Position 11 is the sex: H for male (hombre), M for female (mujer).
  const sex = ctx.gender === "male" ? "H" : ctx.gender === "female" ? "M" : rng.pick(["H", "M"]);

  const homoclave = rng.digit();
  const body =
    c() + v() + c() + c() +
    yy + mm + dd +
    sex +
    rng.pick(states) +
    c() + c() + c() +
    homoclave;
  // The 18th character is a mod-10 check digit over the dictionary
  // "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ" (Ñ = 24), weights 18..2.
  return body + curpCheck(body);
}

/** Check digit for a 17-character CURP body. */
function curpCheck(body17: string): string {
  const DICT = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += DICT.indexOf(body17[i]) * (18 - i);
  return String((10 - (sum % 10)) % 10);
}

/** South African ID: YYMMDD + 4 digits + C + A + Z (Luhn check). */
function zaId(rng: Rng, ctx: IdContext): string {
  const d = parts(ctx);
  const yy = d ? d.yy : String(rng.int(50, 99)).padStart(2, "0");
  const mm = d ? d.mm : String(rng.int(1, 12)).padStart(2, "0");
  const dd = d ? d.dd : String(rng.int(1, 28)).padStart(2, "0");
  const seq = rng.digits(3) + rng.pick(["0", "1"]); // citizenship digit last
  const body = `${yy}${mm}${dd}${seq}`; // 12 chars
  const full = body + "8" + "2"; // 14 chars before check
  let sum = 0;
  for (let i = 0; i < full.length; i++) {
    let v = Number(full[i]);
    if (i % 2 === 1) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  const check = (10 - (sum % 10)) % 10;
  const withCheck = full + check;
  return `${withCheck.slice(0, 6)} ${withCheck.slice(6, 10)} ${withCheck.slice(10)}`;
}

/**
 * New Zealand IRD number: 8 or 9 digits with a mod-11 check digit.
 *
 * Weights [3,2,7,6,5,4,3,2] over the base (padded to 8 digits), check =
 * 11 − (sum mod 11) with 0 when the remainder is 0. If that yields 10 the
 * secondary weights [7,4,3,2,5,2,7,6] are tried, and a second 10 means the base
 * is unsuitable and is redrawn.
 *
 * Inland Revenue publishes this; the registry labels the document "IRD Number",
 * so the checksum applies (unlike a New Zealand national ID, which does not
 * exist). The number is printed as NNN-NNN-NNN.
 */
function nzIrd(rng: Rng): string {
  const w1 = [3, 2, 7, 6, 5, 4, 3, 2];
  const w2 = [7, 4, 3, 2, 5, 2, 7, 6];

  for (;;) {
    // Base is 7 or 8 digits; padded to 8 for the weighted sum.
    const baseLen = rng.chance(0.5) ? 8 : 7;
    const base = rng.digits(baseLen).padStart(8, "0");
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += Number(base[i]) * w1[i];
    let check = 11 - (sum % 11);
    if (check === 11) check = 0;

    if (check === 10) {
      let sum2 = 0;
      for (let i = 0; i < 8; i++) sum2 += Number(base[i]) * w2[i];
      check = 11 - (sum2 % 11);
      if (check === 11) check = 0;
      if (check === 10) continue;
    }

    // 8-digit numbers present as NNN-NNN-NNN; a 7-digit base drops a leading 0.
    const full = (baseLen === 7 ? base.slice(1) : base) + String(check);
    const padded = full.padStart(9, "0");
    return `${padded.slice(0, 3)}-${padded.slice(3, 6)}-${padded.slice(6)}`;
  }
}

/** Dispatches on ISO country code. Unknown codes fall back to a numeric ID. */
export function makeNationalId(code: string, rng: Rng, ctx: IdContext = {}): string {
  switch (code) {
    case "US": return ssn(rng);
    case "CA": return sin(rng);
    case "GB": return nino(rng);
    case "AU": return tfn(rng);
    case "NZ": return nzIrd(rng);
    case "DE": return deId(rng);
    case "FR": return frInsee(rng, ctx);
    case "IT": return itFiscal(rng, ctx);
    case "ES": return esDni(rng);
    case "PT": return ptNif(rng);
    case "NL": return nlBsn(rng);
    case "SE": return sePersonnummer(rng, ctx);
    case "NO": return noFnr(rng, ctx);
    case "PL": return plPesel(rng, ctx);
    case "RU": return ruSnils(rng);
    case "CN": return cnResidentId(rng, ctx);
    case "TW": return twId(rng);
    case "HK": return hkId(rng);
    case "MO": return moId(rng);
    case "JP": return jpMyNumber(rng);
    case "KR": return krRrn(rng, ctx);
    case "IN": return inPan(rng);
    case "ID": return idNik(rng);
    case "MY": return myKad(rng);
    case "SG": return sgNric(rng);
    case "TH": return thCitizen(rng);
    case "VN": return vnCitizen(rng);
    case "AE": return aeEmiratesId(rng, ctx);
    case "SA": return saNationalId(rng);
    case "IL": return ilId(rng);
    case "TR": return trKimlik(rng);
    case "BR": return brCpf(rng);
    case "MX": return mxCurp(rng, ctx);
    case "ZA": return zaId(rng, ctx);
    default: return rng.digits(10);
  }
}

export {
  ssn, sin, nino, tfn, cnResidentId, ptNif, nlBsn, sePersonnummer,
  plPesel, trKimlik, brCpf, sgNric, thCitizen, ilId, twId, hkId,
};
