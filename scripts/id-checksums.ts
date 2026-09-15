/**
 * National-ID check-digit algorithms, re-implemented from specification.
 *
 * This module exists so the algorithms can be checked two ways, and so a shared
 * mistake cannot hide:
 *
 *   1. smokes-test.ts runs `verifyAlgorithms()` — each implementation against
 *      PUBLISHED known-valid samples — and then runs every generator's output
 *      through the same implementation.
 *   2. format-audit.ts imports the same code for its fuller report.
 *
 * It is deliberately independent of `src/lib/generator/identifiers.ts`: these
 * are written from the published rules, not by calling the generator's own
 * helpers, so a bug in the generator cannot validate itself.
 *
 * Every `source` below names where the rule and the sample come from. Where a
 * scheme has NO published algorithm, that is stated rather than guessed at.
 */

const digitsOf = (s: string) => s.replace(/\D/g, "");

/** Standard Luhn: double every second digit counting from the right. */
export function luhn(s: string): boolean {
  const d = digitsOf(s).split("").map(Number).reverse();
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let v = d[i];
    if (i % 2 === 1) { v *= 2; if (v > 9) v -= 9; }
    sum += v;
  }
  return sum % 10 === 0;
}

/** Australia TFN: weights [1,4,3,7,5,8,6,9,10] over 9 digits, total ≡ 0 (mod 11). */
export const auTfn = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 9) return false;
  const w = [1, 4, 3, 7, 5, 8, 6, 9, 10];
  return d.split("").reduce((a, c, i) => a + Number(c) * w[i], 0) % 11 === 0;
};

/** Spain DNI: letter = "TRWAGMYFPDXBNJZSQVHLCKE"[number mod 23]. */
export const esDni = (s: string): boolean => {
  const m = /^(\d{8})([A-Z])$/.exec(s.trim());
  return m ? "TRWAGMYFPDXBNJZSQVHLCKE"[Number(m[1]) % 23] === m[2] : false;
};

/** Portugal NIF: weights 9..2 over the first 8, check = 0 if r<2 else 11-r. */
export const ptNif = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(d[i]) * (9 - i);
  const r = sum % 11;
  return Number(d[8]) === (r < 2 ? 0 : 11 - r);
};

/** Netherlands BSN: elfproef weights [9,8,7,6,5,4,3,2,-1], total ≡ 0 (mod 11). */
export const nlBsn = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 9) return false;
  const w = [9, 8, 7, 6, 5, 4, 3, 2, -1];
  return d.split("").reduce((a, c, i) => a + Number(c) * w[i], 0) % 11 === 0;
};

/** Poland PESEL: weights [1,3,7,9,1,3,7,9,1,3], check = (10 - sum%10)%10. */
export const plPesel = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 11) return false;
  const w = [1, 3, 7, 9, 1, 3, 7, 9, 1, 3];
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * w[i];
  return (10 - (sum % 10)) % 10 === Number(d[10]);
};

/** China resident ID: ISO 7064 MOD 11-2, check table "10X98765432". */
export const cnId = (s: string): boolean => {
  const v = s.trim().toUpperCase();
  if (!/^\d{17}[\dX]$/.test(v)) return false;
  const w = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += Number(v[i]) * w[i];
  return "10X98765432"[sum % 11] === v[17];
};

/** Taiwan ID: letter → two digits, weights [1,9,8,7,6,5,4,3,2,1,1], ≡ 0 (mod 10). */
export const twId = (s: string): boolean => {
  const m = /^([A-Z])(\d{9})$/.exec(s.trim().toUpperCase());
  if (!m) return false;
  const map: Record<string, number> = {
    A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18,
    K: 19, L: 20, M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27,
    U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33,
  };
  const code = map[m[1]];
  if (!code) return false;
  const d = [Math.floor(code / 10), code % 10, ...m[2].split("").map(Number)];
  const w = [1, 9, 8, 7, 6, 5, 4, 3, 2, 1, 1];
  return d.reduce((a, c, i) => a + c * w[i], 0) % 10 === 0;
};

/** Hong Kong ID: A=10…Z=35, space=36, weights 9..2, check 10 → "A". */
export const hkId = (s: string): boolean => {
  const m = /^(?:([A-Z])|([A-Z]{2}))(\d{6})\(([0-9A])\)$/.exec(s.trim().toUpperCase());
  if (!m) return false;
  const chars = m[1] ? [" ", m[1], ...m[3]] : [m[2][0], m[2][1], ...m[3]];
  const value = (c: string) => (c === " " ? 36 : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55);
  const w = [9, 8, 7, 6, 5, 4, 3, 2];
  const sum = chars.reduce((a, c, i) => a + value(c) * w[i], 0);
  const check = (11 - (sum % 11)) % 11;
  return (check === 10 ? "A" : String(check)) === m[4];
};

/** Japan My Number: weights [6,5,4,3,2,7,6,5,4,3,2], check ≥ 10 → 0. */
export const jpMyNumber = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 12) return false;
  const w = [6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 11; i++) sum += Number(d[i]) * w[i];
  let check = 11 - (sum % 11);
  if (check >= 10) check = 0;
  return check === Number(d[11]);
};

/** Singapore NRIC/FIN: weights [2,7,6,5,4,3,2], +4 for T/G, two letter tables. */
export const sgNric = (s: string): boolean => {
  const m = /^([STFG])(\d{7})([A-Z])$/.exec(s.trim().toUpperCase());
  if (!m) return false;
  const w = [2, 7, 6, 5, 4, 3, 2];
  let sum = m[2].split("").reduce((a, c, i) => a + Number(c) * w[i], 0);
  if (m[1] === "T" || m[1] === "G") sum += 4;
  const table = m[1] === "S" || m[1] === "T" ? "JZIHGFEDCBA" : "XWUTRQPNMLK";
  return table[sum % 11] === m[3];
};

/** Thailand citizen ID: weights 13..2 over 12 digits, check = (11 - sum%11)%10. */
export const thCitizen = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * (13 - i);
  return (11 - (sum % 11)) % 10 === Number(d[12]);
};

/** Turkey T.C. Kimlik: D10 and D11 formulas. */
export const trKimlik = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 11) return false;
  const n = d.split("").map(Number);
  const odd = n[0] + n[2] + n[4] + n[6] + n[8];
  const even = n[1] + n[3] + n[5] + n[7];
  const d10 = (((odd * 7 - even) % 10) + 10) % 10;
  const d11 = n.slice(0, 10).reduce((a, c) => a + c, 0) % 10;
  return d10 === n[9] && d11 === n[10];
};

/** Brazil CPF: two mod-11 check digits. */
export const brCpf = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 11) return false;
  const n = d.split("").map(Number);
  const calc = (arr: number[]) => {
    const w = arr.length === 9 ? [10, 9, 8, 7, 6, 5, 4, 3, 2] : [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = arr.reduce((a, c, i) => a + c * w[i], 0);
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(n.slice(0, 9)) === n[9] && calc(n.slice(0, 10)) === n[10];
};

/** South Korea RRN: weights [2,3,4,5,6,7,8,9,2,3,4,5], check (11 - sum%11)%10. */
export const krRrn = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 13) return false;
  const w = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d[i]) * w[i];
  return (11 - (sum % 11)) % 10 === Number(d[12]);
};

/** Italy Codice Fiscale: mod-26 check letter over the first 15 characters. */
export const itFiscal = (s: string): boolean => {
  const v = s.trim().toUpperCase();
  if (!/^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/.test(v)) return false;
  const odd: Record<string, number> = {
    "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
    A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
    N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
  };
  const even = (c: string) => (/\d/.test(c) ? Number(c) : c.charCodeAt(0) - 65);
  let sum = 0;
  for (let i = 0; i < 15; i++) sum += i % 2 === 0 ? odd[v[i]] ?? 0 : even(v[i]);
  return String.fromCharCode(65 + (sum % 26)) === v[15];
};

/** Israel ID: Luhn doubling 0-based ODD indices (1,3,5,7). */
export const ilId = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 9) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    let v = Number(d[i]);
    if (i % 2 === 1) { v *= 2; if (v > 9) v -= 9; }
    sum += v;
  }
  return sum % 10 === 0;
};

/** Norway fødselsnummer: two mod-11 check digits, 10 never valid. */
export const noFnr = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 11) return false;
  const w1 = [3, 7, 6, 1, 8, 9, 4, 5, 2];
  const w2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let s1 = 0;
  for (let i = 0; i < 9; i++) s1 += Number(d[i]) * w1[i];
  let k1 = 11 - (s1 % 11);
  if (k1 === 11) k1 = 0;
  if (k1 === 10 || k1 !== Number(d[9])) return false;
  let s2 = 0;
  for (let i = 0; i < 10; i++) s2 += Number(d[i]) * w2[i];
  let k2 = 11 - (s2 % 11);
  if (k2 === 11) k2 = 0;
  if (k2 === 10 || k2 !== Number(d[10])) return false;
  return true;
};

/** Russia SNILS: check = sum(dᵢ·(9−i)) mod 101, with 100 → 00. */
export const ruSnils = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 11) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (9 - i);
  let check = sum % 101;
  if (check === 100) check = 0;
  return String(check).padStart(2, "0") === d.slice(9);
};

/** Saudi national ID / Iqama: Luhn, first digit 1 (citizen) or 2 (resident). */
export const saId = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 10) return false;
  if (d[0] !== "1" && d[0] !== "2") return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let v = Number(d[i]);
    if (i % 2 === 0) { v *= 2; if (v > 9) v -= 9; }
    sum += v;
  }
  return sum % 10 === 0;
};

/** France NIR: 15 digits, key = 97 − (first 13 mod 97). */
export const frNir = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 15) return false;
  const key = 97 - (Number(d.slice(0, 13)) % 97);
  return String(key).padStart(2, "0") === d.slice(13);
};

/** Mexico CURP: 18 chars, mod-10 check over the dictionary (Ñ = 24). */
export const mxCurp = (s: string): boolean => {
  const v = s.trim().toUpperCase();
  if (!/^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/.test(v)) return false;
  const DICT = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ";
  let sum = 0;
  for (let i = 0; i < 17; i++) sum += DICT.indexOf(v[i]) * (18 - i);
  return String((10 - (sum % 10)) % 10) === v[17];
};

/** New Zealand IRD: mod-11 with a secondary weight pass when needed. */
export const nzIrd = (s: string): boolean => {
  const d = digitsOf(s);
  if (d.length !== 8 && d.length !== 9) return false;
  const base = d.slice(0, -1).padStart(8, "0");
  const w1 = [3, 2, 7, 6, 5, 4, 3, 2];
  const w2 = [7, 4, 3, 2, 5, 2, 7, 6];
  let sum = 0;
  for (let i = 0; i < 8; i++) sum += Number(base[i]) * w1[i];
  let c = 11 - (sum % 11);
  if (c === 11) c = 0;
  if (c === 10) {
    let s2 = 0;
    for (let i = 0; i < 8; i++) s2 += Number(base[i]) * w2[i];
    c = 11 - (s2 % 11);
    if (c === 11) c = 0;
  }
  return c === Number(d[d.length - 1]);
};

/* ------------------------------------------------------------------ */
/* The registry: which verifier applies to which country, plus the     */
/* published samples that prove each verifier is correct.              */
/* ------------------------------------------------------------------ */

export interface IdAlgorithm {
  code: string;
  label: string;
  fn: (s: string) => boolean;
  /** Published known-valid values (from the cited source). */
  valid: string[];
  /** Values that must be REJECTED (a perturbed check digit). */
  invalid: string[];
  source: string;
  /**
   * True when the scheme has no officially published algorithm, so the
   * generator's own label ("format only") must say so.
   */
  unofficial?: boolean;
}

export const ID_ALGORITHMS: IdAlgorithm[] = [
  { code: "AU", label: "TFN", fn: auTfn, valid: ["123 456 782"], invalid: ["123 456 783"], source: "Wikipedia Tax file number; ANAO 1999" },
  { code: "CA", label: "SIN", fn: luhn, valid: ["046-454-286", "130-692-544"], invalid: ["046-454-287"], source: "Wikipedia Social insurance number" },
  { code: "ES", label: "DNI", fn: esDni, valid: ["12345678Z", "00000000T", "99999999R"], invalid: ["12345678A"], source: "Wikipedia DNI (es)" },
  { code: "PT", label: "NIF", fn: ptNif, valid: ["503504564"], invalid: ["503504565"], source: "safcheck.com/docs/rules/nif" },
  { code: "NL", label: "BSN", fn: nlBsn, valid: ["111222333", "123456782"], invalid: ["111222334"], source: "Wikipedia NL; elfproef" },
  { code: "SE", label: "personnummer", fn: luhn, valid: ["811228-9874", "670919-9530"], invalid: ["811228-9875"], source: "Wikipedia Swedish PID" },
  { code: "PL", label: "PESEL", fn: plPesel, valid: ["44051401359", "02070803628", "12345678903"], invalid: ["12345678901"], source: "Wikipedia PESEL" },
  { code: "CN", label: "resident ID", fn: cnId, valid: ["11010519491231002X", "460032197910193621"], invalid: ["110105194912310021"], source: "Wikipedia Resident Identity Card" },
  { code: "TW", label: "ID", fn: twId, valid: ["A123456789", "C130536598"], invalid: ["A123456788"], source: "Wikipedia ROC ID" },
  { code: "HK", label: "HKID", fn: hkId, valid: ["A123456(3)", "F543210(A)"], invalid: ["A123456(4)"], source: "HK Digital Policy Office schema" },
  { code: "JP", label: "My Number", fn: jpMyNumber, valid: ["123456789018"], invalid: ["123456789019"], source: "総務省令第85号" },
  { code: "SG", label: "NRIC", fn: sgNric, valid: ["S0000001I", "S0000002G", "S0000003E", "S1234567D", "T0123456G"], invalid: ["S0000001A"], source: "Wikipedia NRIC (real values)" },
  { code: "TH", label: "citizen ID", fn: thCitizen, valid: ["3100600445635", "4854701245289", "1234567890121"], invalid: ["1234567890120"], source: "Wikipedia Thai ID card" },
  { code: "TR", label: "Kimlik", fn: trKimlik, valid: ["10000000146", "21574521838"], invalid: ["10000000147"], source: "Wikipedia Turkish ID" },
  { code: "BR", label: "CPF", fn: brCpf, valid: ["11144477735", "52998224725", "26394653330"], invalid: ["11144477736"], source: "Wikipedia CPF" },
  { code: "ZA", label: "ID", fn: luhn, valid: ["9807055009087", "8001015009087"], invalid: ["9807055009088"], source: "Wikipedia SA ID" },
  { code: "KR", label: "RRN", fn: krRrn, valid: ["6405041024014"], invalid: ["6405041024015"], source: "Wikipedia RRN (checksum; real IDs may still fail it)" },
  { code: "IT", label: "Codice Fiscale", fn: itFiscal, valid: ["RSSMRA85T10A562S", "MRTMTT91D08F205J", "MLLSNT82P65Z404U"], invalid: ["RSSMRA85T10A562A"], source: "Wikipedia Italian fiscal code (Min. decree 23-12-1976)" },
  { code: "IL", label: "ID", fn: ilId, valid: ["123456782", "000000018", "053605416"], invalid: ["123456783"], source: "Wikipedia Israeli ID; SAP test value" },
  { code: "NO", label: "fødselsnummer", fn: noFnr, valid: ["11056027043", "01073703642", "15060238585"], invalid: ["11056027044"], source: "Wikipedia Norwegian national ID" },
  { code: "RU", label: "SNILS", fn: ruSnils, valid: ["112-233-445 95", "137-030-125 08"], invalid: ["112-233-445 96"], source: "FSS/СФР algorithm; SAP test value" },
  { code: "SA", label: "national ID", fn: saId, valid: ["1234567897", "1000000008", "2000000006"], invalid: ["1234567898"], source: "alhazmy13/Saudi-ID-Validator (DGA OSS)" },
  { code: "FR", label: "NIR", fn: frNir, valid: ["174033000705847"], invalid: ["174033000705848"], source: "French Wikipedia NIR (decree 82-103)" },
  { code: "MX", label: "CURP", fn: mxCurp, valid: ["HEGG560427MVZRRL04", "BEML920313HMCLNS09"], invalid: ["HEGG560427MVZRRL05"], source: "Instructivo Normativo CURP" },
  { code: "NZ", label: "IRD", fn: nzIrd, valid: ["49091850"], invalid: ["49091851"], source: "Inland Revenue payroll specification" },
];

/**
 * Schemes with NO published check-digit algorithm. The generator must emit a
 * format-correct value and the registry must not claim a checksum for these.
 */
export const NO_PUBLISHED_CHECKSUM: Record<string, string> = {
  MO: "Macao BIR: the parenthesised digit is presentation; no algorithm is published",
  AE: "Emirates ID: the ICP has never published the check algorithm; Luhn is de-facto only",
  MY: "MyKad: no published checksum",
  VN: "Vietnamese CCCD: no published checksum",
  IN: "PAN: no checksum; the 4th character encodes the holder type",
  ID: "NIK: no checksum",
  GB: "NINO: no checksum",
  DE: "German ID: no public checksum",
  US: "SSN: no checksum (range rules only)",
};
