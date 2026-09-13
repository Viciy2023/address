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

/** Australian TFN: 9 digits with a weighted modulus-11 check digit. */
function tfn(rng: Rng): string {
  const base = rng.digits(8);
  const weights = [1, 4, 3, 7, 5, 8, 6, 9];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(base[i]) * weights[i];
  const check = (11 - (sum % 11)) % 11;
  const checkDigit = check === 10 ? 0 : check;
  const full = base + String(checkDigit);
  return `${full.slice(0, 3)} ${full.slice(3, 6)} ${full.slice(6)}`;
}

/** German ID: 9 alphanumeric characters (format only). */
function deId(rng: Rng): string {
  return rng.letter() + rng.digits(8);
}

/** French INSEE: 13 digits + 2-digit key (format only). */
function frInsee(rng: Rng): string {
  return `${rng.digits(2)} ${rng.digits(2)} ${rng.digits(2)} ${rng.digits(3)} ${rng.digits(3)}`;
}

/** Italian Codice Fiscale: 6 letters, 2 digits, letter, 2 digits, letter, 3 digits, letter. */
function itFiscal(rng: Rng): string {
  const cons = "BCDFGHJKLMNPQRSTVWXYZ";
  const vowel = "AEIOU";
  const pickC = () => cons[rng.int(0, cons.length - 1)];
  const pickV = () => vowel[rng.int(0, vowel.length - 1)];
  const surname = pickC() + pickC() + pickC();
  const name = pickC() + pickV() + pickC();
  const month = "ABCDEHLMPRST"[rng.int(0, 11)];
  const town = rng.letter() + rng.digits(3);
  const check = rng.letter();
  return `${surname}${name}${String(rng.int(0, 99)).padStart(2, "0")}${month}${town}${check}`;
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

/** Dutch BSN: 9 digits passing the "11-test". */
function nlBsn(rng: Rng): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    const d = rng.digits(9).split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 8; i++) sum += d[i] * (9 - i);
    sum -= d[8];
    if (sum % 11 === 0) return d.join("");
  }
  return rng.digits(9);
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

/** Norwegian fødselsnummer: DDMMYY + 5 digits (format only). */
function noFnr(rng: Rng, ctx: IdContext): string {
  const d = parts(ctx);
  const day = d ? d.dd : String(rng.int(1, 28)).padStart(2, "0");
  const month = d ? d.mm : String(rng.int(1, 12)).padStart(2, "0");
  const year = d ? d.yy : String(rng.int(50, 99));
  return `${day}${month}${year}${rng.digits(5)}`;
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

/** Russian SNILS: 9 digits + 2-digit check (format only). */
function ruSnils(rng: Rng): string {
  const base = rng.digits(9);
  return `${base.slice(0, 3)}-${base.slice(3, 6)}-${base.slice(6)} ${rng.digits(2)}`;
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

/** Hong Kong ID: 1-2 letters + 6 digits + check digit in parentheses. */
function hkId(rng: Rng): string {
  const letter = L[rng.int(0, 25)];
  const digits = rng.digits(6);
  // Weighted sum with A=10; weights 9,8,7,6,5,4,3,2
  let sum = 36 * 9 + (letter.charCodeAt(0) - 64) * 8;
  const weights = [7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 6; i++) sum += Number(digits[i]) * weights[i];
  const r = sum % 11;
  const check = r === 0 ? 0 : 11 - r;
  return `${letter}${digits}(${check === 10 ? "A" : check})`;
}

/** Macao ID: 7 digits + check in parentheses (format only). */
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

  return `${yy}${mm}${dd}-${centuryGender}${rng.digits(6)}`;
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

/** Singapore NRIC: letter + 7 digits + checksum letter. */
function sgNric(rng: Rng): string {
  const prefix = rng.pick(["S", "T"]);
  const digits = rng.digits(7);
  const weights = [2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(digits[i]) * weights[i];
  if (prefix === "T") sum += 4;
  const table = prefix === "S" ? "JZIHGFEDCBA" : "XWUTRQPNMLK";
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
 * UAE Emirates ID: 784-YYYY-NNNNNNN-N. Field 2 is the year of birth, so it must
 * match the record's own birth date.
 */
function aeEmiratesId(rng: Rng, ctx: IdContext): string {
  const d = parts(ctx);
  const year = d ? d.yyyy : String(rng.int(1960, 2005));
  return `784-${year}-${rng.digits(7)}-${rng.digits(1)}`;
}

/** Saudi national ID: 10 digits starting with 1 (format only). */
function saNationalId(rng: Rng): string {
  return "1" + rng.digits(9);
}

/** Israeli ID: 9 digits with a Luhn-style check digit. */
function ilId(rng: Rng): string {
  const base = rng.digits(8);
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    let v = Number(base[i]);
    if (i % 2 === 0) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  const check = (10 - (sum % 10)) % 10;
  return base + check;
}

/** Turkish T.C. Kimlik: 11 digits with two check digits. */
function trKimlik(rng: Rng): string {
  const d = rng.int(1, 9);
  const rest = rng.digits(8).split("").map(Number);
  const oddSum = d + rest[0] + rest[2] + rest[4] + rest[6];
  const evenSum = rest[1] + rest[3] + rest[5] + rest[7];
  const tenth = (oddSum * 7 - evenSum) % 10;
  const t = ((oddSum + evenSum + tenth) % 10);
  return `${d}${rest.join("")}${tenth}${t}`;
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
  const check = rng.digit();
  return (
    c() + v() + c() + c() +
    yy + mm + dd +
    sex +
    rng.pick(states) +
    c() + c() + c() +
    homoclave +
    check
  );
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

/** Dispatches on ISO country code. Unknown codes fall back to a numeric ID. */
export function makeNationalId(code: string, rng: Rng, ctx: IdContext = {}): string {
  switch (code) {
    case "US": return ssn(rng);
    case "CA": return sin(rng);
    case "GB": return nino(rng);
    case "AU": return tfn(rng);
    case "NZ": return `${rng.digits(3)}-${rng.digits(3)}-${rng.digits(3)}`;
    case "DE": return deId(rng);
    case "FR": return frInsee(rng);
    case "IT": return itFiscal(rng);
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
