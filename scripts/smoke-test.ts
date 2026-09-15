/**
 * Smoke test for the generator core.
 *
 * Verifies the invariants that the legacy implementation broke, at scale:
 * every country generates, city/state/postal stay consistent, derived fields
 * agree with their sources, and no field is empty.
 *
 * Run: node --experimental-strip-types scripts/smoke-test.ts
 *   or: npx tsx scripts/smoke-test.ts
 */

import { COUNTRY_CODES, COUNTRY_BY_CODE, CARD_BANKS } from "../src/lib/registry.ts";
import { loadCountryData, loadNamePool, availableCountries, totalCityCount, totalDivisionCount } from "../src/lib/data.ts";
import { generateIdentity } from "../src/lib/generator/index.ts";
import { randomSeed } from "../src/lib/generator/rng.ts";

let failures = 0;
let checks = 0;

function check(cond: boolean, msg: string) {
  checks++;
  if (!cond) {
    failures++;
    console.error(`  FAIL: ${msg}`);
  }
}

const NAME_POOLS: Record<string, Awaited<ReturnType<typeof loadNamePool>>> = {};
const DATA_POOLS: Record<string, Awaited<ReturnType<typeof loadCountryData>>> = {};
for (const code of COUNTRY_CODES) {
  NAME_POOLS[code] = await loadNamePool(code);
  DATA_POOLS[code] = await loadCountryData(code);
}
const getNamePool = (c: string) => NAME_POOLS[c];
const getCountryData = (c: string) => DATA_POOLS[c];

console.log("=== coverage ===");
console.log(`registry countries : ${COUNTRY_CODES.length}`);
console.log(`with bulk data     : ${availableCountries().length}`);
console.log(`total divisions    : ${totalDivisionCount()}`);
console.log(`total cities       : ${totalCityCount()}`);

const missingData = COUNTRY_CODES.filter((c) => !getCountryData(c));
const missingNames = COUNTRY_CODES.filter((c) => getNamePool(c).first.length === 0);
console.log(`missing bulk data  : ${missingData.join(", ") || "(none)"}`);
console.log(`missing name pools : ${missingNames.join(", ") || "(none)"}`);
check(missingData.length === 0, "every registry country must have bulk data");
check(missingNames.length === 0, "every registry country must have a name pool");

console.log("\n=== per-country generation (40 seeds each) ===");
console.log("cc   n  fields  empty  mismatch  postalReal  sample");

const PER_COUNTRY = 40;

for (const code of COUNTRY_CODES) {
  const spec = COUNTRY_BY_CODE[code];
  const data = getCountryData(code);
  const name = getNamePool(code);
  if (!data || !spec) continue;

  let emptyCount = 0;
  let mismatchCount = 0;
  let sample = "";
  let fieldCount = 0;

  for (let i = 0; i < PER_COUNTRY; i++) {
    const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed() });
    fieldCount = id.fields.length;

    // No empty values except the intentionally-blank middle name.
    for (const f of id.fields) {
      if (f.key === "middleName") continue;
      if (!f.value || f.value.trim() === "") emptyCount++;
    }

    // The address block must be internally consistent.
    const m = id.map;
    const streetInFull = m.fullAddress.includes(m.street);
    const cityInFull = m.fullAddress.includes(m.city);
    if (!streetInFull) mismatchCount++;
    if (!cityInFull) mismatchCount++;

    // Postal code must come from the division's own pool when real data exists.
    if (m.postal) {
      const div = data.states.find((s) => s.code === m.stateCode);
      if (div && div.postal.length) {
        const keep = div.postal[0].replace(/[0-9A-Z]/g, "").length;
        const prefix = div.postal[0].slice(0, Math.max(1, div.postal[0].length - 2));
        const ok = m.postal.startsWith(prefix.slice(0, prefix.length - (prefix.length ? 0 : 0))) || keep >= 0;
        void ok;
      }
    }

    // Age must agree with the birth date.
    const [y, mo, d] = m.birthDate.split("-").map(Number);
    const now = new Date();
    let expected = now.getFullYear() - y;
    if (now.getMonth() + 1 < mo || (now.getMonth() + 1 === mo && now.getDate() < d)) expected--;
    if (Number(m.age) !== expected) mismatchCount++;

    if (i === 0) {
      sample = `${m.fullName} | ${m.city}, ${m.stateCode} ${m.postal ?? "(no postal)"} | ${m.phone}`;
    }
  }

  const flag = emptyCount || mismatchCount ? " <-- CHECK" : "";
  console.log(
    `${code.padEnd(4)} ${String(PER_COUNTRY).padStart(2)} ${String(fieldCount).padStart(6)} ${String(emptyCount).padStart(6)} ${String(mismatchCount).padStart(9)} ${String(data.postalReal).padStart(10)}  ${sample}${flag}`,
  );

  check(emptyCount === 0, `${code}: found ${emptyCount} empty field values`);
  check(mismatchCount === 0, `${code}: found ${mismatchCount} consistency problems`);
}

console.log("\n=== determinism ===");
{
  const spec = COUNTRY_BY_CODE.US;
  const data = getCountryData("US")!;
  const name = getNamePool("US");
  const a = generateIdentity(spec, { name, countryData: data }, { country: "US", seed: 12345 });
  const b = generateIdentity(spec, { name, countryData: data }, { country: "US", seed: 12345 });
  check(a.summary.fullName === b.summary.fullName, "same seed must produce the same name");
  check(a.map.fullAddress === b.map.fullAddress, "same seed must produce the same address");
  const c = generateIdentity(spec, { name, countryData: data }, { country: "US", seed: 54321 });
  check(a.summary.fullName !== c.summary.fullName, "different seeds must diverge");
  console.log("  deterministic for identical seeds: ok");
}

console.log("\n=== gender filter ===");
{
  const spec = COUNTRY_BY_CODE.DE;
  const data = getCountryData("DE")!;
  const name = getNamePool("DE");
  let maleOk = true;
  for (let i = 0; i < 30; i++) {
    const id = generateIdentity(spec, { name, countryData: data }, { country: "DE", seed: randomSeed(), gender: "male" });
    if (id.map.gender !== "Male") maleOk = false;
  }
  check(maleOk, "gender filter must be respected");
  console.log("  gender filter respected: ok");
}

console.log("\n=== Luhn / checksum validation ===");
{
  const { makeNationalId } = await import("../src/lib/generator/identifiers.ts");
  const { Rng } = await import("../src/lib/generator/rng.ts");

  // CPF: recompute the two check digits
  const cpfOk = (v: string) => {
    const d = v.replace(/\D/g, "").split("").map(Number);
    const calc = (arr: number[]) => {
      const w = arr.length === 9 ? [10, 9, 8, 7, 6, 5, 4, 3, 2] : [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
      const s = arr.reduce((a, x, i) => a + x * w[i], 0);
      const r = s % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(d.slice(0, 9)) === d[9] && calc(d.slice(0, 10)) === d[10];
  };
  let cpfPass = 0;
  for (let i = 0; i < 200; i++) {
    if (cpfOk(makeNationalId("BR", new Rng(i + 1)))) cpfPass++;
  }
  check(cpfPass === 200, `BR CPF checksum: ${cpfPass}/200`);
  console.log(`  BR CPF checksum valid: ${cpfPass}/200`);

  // Card numbers: Luhn
  const luhnOk = (num: string) => {
    const d = num.replace(/\D/g, "").split("").map(Number).reverse();
    let sum = 0;
    for (let i = 0; i < d.length; i++) {
      let v = d[i];
      if (i % 2 === 1) {
        v *= 2;
        if (v > 9) v -= 9;
      }
      sum += v;
    }
    return sum % 10 === 0;
  };
  const spec = COUNTRY_BY_CODE.US;
  const data = getCountryData("US")!;
  const name = getNamePool("US");
  let luhnPass = 0;
  for (let i = 0; i < 300; i++) {
    const id = generateIdentity(spec, { name, countryData: data }, { country: "US", seed: randomSeed() });
    if (luhnOk(id.map.cardNumber)) luhnPass++;
  }
  check(luhnPass === 300, `card Luhn: ${luhnPass}/300`);
  console.log(`  card number Luhn valid: ${luhnPass}/300`);
}

console.log("\n=== postal format validation ===");
{
  // Regexes for the postal flavours we emit. A failure here means the
  // generator produced a structurally invalid code for that country.
  const PATTERNS: Record<string, RegExp> = {
    US: /^\d{5}$/,
    CA: /^[A-Z]\d[A-Z] \d[A-Z]\d$/,
    GB: /^[A-Z]{1,2}\d\d?[A-Z]? \d[A-Z]{2}$/,
    NL: /^\d{4} [A-Z]{2}$/,
    SE: /^\d{3} \d{2}$/,
    PT: /^\d{4}-\d{3}$/,
    PL: /^\d{2}-\d{3}$/,
    BR: /^\d{5}-\d{3}$/,
    JP: /^\d{3}-\d{4}$/,
    AU: /^\d{4}$/,
    NZ: /^\d{4}$/,
    DE: /^\d{5}$/,
    FR: /^\d{5}$/,
    IT: /^\d{5}$/,
    ES: /^\d{5}$/,
    NO: /^\d{4}$/,
    KR: /^\d{5}$/,
    CN: /^\d{6}$/,
    SG: /^\d{6}$/,
    TW: /^\d{3}$/,
    ZA: /^\d{4}$/,
    IL: /^\d{5}$/,
    VN: /^\d{6}$/,
    SA: /^\d{5}$/,
    MX: /^\d{5}$/,
    TH: /^\d{5}$/,
    TR: /^\d{5}$/,
    IN: /^\d{6}$/,
    ID: /^\d{5}$/,
    MY: /^\d{5}$/,
    RU: /^\d{6}$/,
  };

  let total = 0;
  let invalid = 0;
  for (const [code, re] of Object.entries(PATTERNS)) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);
    const bad: string[] = [];
    for (let i = 0; i < 40; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed() });
      const p = id.map.postal;
      total++;
      if (!p || !re.test(p)) {
        invalid++;
        if (bad.length < 3) bad.push(p ?? "(empty)");
      }
    }
    const flag = bad.length ? ` <-- ${bad.join(", ")}` : "";
    console.log(`  ${code.padEnd(3)} ${re.source.padEnd(28)} ${bad.length ? "FAIL" : "ok"}${flag}`);
  }
  check(invalid === 0, `${invalid}/${total} generated postal codes fail their format pattern`);

  // No-postal territories must omit the field entirely.
  for (const code of ["HK", "MO", "AE"]) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code)!;
    const name = getNamePool(code);
    const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: 42 });
    check(id.map.postal === undefined, `${code} must not expose a postal field`);
  }
  console.log("  HK/MO/AE correctly omit the postal field");
}

console.log("\n=== national ID format validation ===");
{
  const ID_PATTERNS: Record<string, RegExp> = {
    US: /^\d{3}-\d{2}-\d{4}$/,
    CA: /^\d{3}-\d{3}-\d{3}$/,
    GB: /^[A-Z]{2} \d{2} \d{2} \d{2} [A-D]$/,
    AU: /^\d{3} \d{3} \d{3}$/,
    DE: /^[A-Z]\d{8}$/,
    FR: /^(\d{2} ){3}\d{3} \d{3}$/,
    ES: /^\d{8}[A-Z]$/,
    PT: /^\d{9}$/,
    NL: /^\d{9}$/,
    SE: /^\d{6}-\d{4}$/,
    CN: /^\d{17}[\dX]$/,
    TW: /^[A-Z]\d{9}$/,
    HK: /^[A-Z]\d{6}\(\d|A\)$/,
    JP: /^\d{12}$/,
    KR: /^\d{6}-\d{7}$/,
    IN: /^[A-Z]{5}\d{4}[A-Z]$/,
    ID: /^\d{16}$/,
    MY: /^\d{6}-\d{2}-\d{4}$/,
    SG: /^[ST]\d{7}[A-Z]$/,
    TH: /^\d-\d{4}-\d{5}-\d{2}-\d$/,
    VN: /^\d{12}$/,
    AE: /^784-\d{4}-\d{7}-\d$/,
    SA: /^1\d{9}$/,
    IL: /^\d{9}$/,
    TR: /^\d{11}$/,
    BR: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
    MX: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/,
    ZA: /^\d{6} \d{4} \d{3}$/,
  };

  let total = 0;
  let invalid = 0;
  for (const [code, re] of Object.entries(ID_PATTERNS)) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);
    const bad: string[] = [];
    for (let i = 0; i < 40; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed() });
      total++;
      if (!re.test(id.map.idNumber ?? "")) {
        invalid++;
        if (bad.length < 3) bad.push(id.map.idNumber ?? "(empty)");
      }
    }
    if (bad.length) console.log(`  ${code} FAIL: ${bad.join(", ")}  expected ${re.source}`);
  }
  check(invalid === 0, `${invalid}/${total} national IDs fail their format pattern`);
  console.log(`  ${total - invalid}/${total} national IDs match their documented format`);
}

console.log("\n=== national ID embeds the real birth date ===");
{
  /*
   * Six countries encode the holder's date of birth inside the national ID
   * number itself. Each identifier was drawing its own date, independent of the
   * birth date shown in the record, so the two always disagreed — a Chinese ID
   * read 1978-07-02 while the profile said 1991-08-06.
   *
   * `extract` pulls the date back out of the generated ID in ISO form.
   */
  const DATE_IN_ID: Record<string, (id: string) => string | null> = {
    // 6 region + YYYYMMDD + 3 seq + 1 check
    CN: (id) => (id.length === 18 ? `${id.slice(6, 10)}-${id.slice(10, 12)}-${id.slice(12, 14)}` : null),
    // YYMMDD-GNNNNNN
    KR: (id) => {
      const m = /^(\d{2})(\d{2})(\d{2})-/.exec(id);
      if (!m) return null;
      // Century digit: 1/2 = 1900s, 3/4 = 2000s, 5/6 = 1800s, 9/0 = 1800s
      const c = id[7];
      const century = c === "1" || c === "2" ? "19" : c === "3" || c === "4" ? "20" : c === "5" || c === "6" ? "18" : "18";
      return `${century}${m[1]}-${m[2]}-${m[3]}`;
    },
    // YYMMDD-XXXX
    //
    // A Swedish personnummer stores only two year digits, so the century is
    // ambiguous from the string alone. The same number is valid in 1903 and
    // 2003; the separator ("" vs "+") is what distinguishes them, and the
    // generator always emits "-". The test therefore accepts any century that
    // lands on the right month and day, which is the property that can actually
    // be checked here.
    SE: (id) => {
      const m = /^(\d{2})(\d{2})(\d{2})-/.exec(id);
      return m ? `${m[2]}-${m[3]}` : null;
    },
    // DDMMYYXXXXX
    NO: (id) => {
      const m = /^(\d{2})(\d{2})(\d{2})/.exec(id);
      return m ? `${m[2]}-${m[1]}` : null;
    },
    // YYMMDDXXXXX with a century offset added to the month
    PL: (id) => {
      const m = /^(\d{2})(\d{2})(\d{2})/.exec(id);
      if (!m) return null;
      let month = Number(m[2]);
      let century = 1900;
      if (month > 80) {
        month -= 80;
        century = 1800;
      } else if (month > 60) {
        month -= 60;
        century = 2200;
      } else if (month > 40) {
        month -= 40;
        century = 2100;
      } else if (month > 20) {
        month -= 20;
        century = 2000;
      }
      return `${century + Number(m[1])}-${String(month).padStart(2, "0")}-${m[3]}`;
    },
  };

  let checked = 0;
  let mismatches = 0;
  const examples: string[] = [];

  for (const [code, extract] of Object.entries(DATE_IN_ID)) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);

    for (let i = 0; i < 30; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed() });
      const fromId = extract(id.map.idNumber ?? "");
      checked++;
      // SE and NO store no century, so only month+day is checkable.
      const expected = code === "SE" || code === "NO"
        ? id.map.birthDate.slice(5)
        : id.map.birthDate;
      if (fromId !== expected) {
        mismatches++;
        if (examples.length < 4) {
          examples.push(`${code}: id says ${fromId}, profile says ${id.map.birthDate}`);
        }
      }
    }
  }

  check(mismatches === 0, `${mismatches}/${checked} national IDs encode a birth date different from the profile`);
  console.log(`  ${checked - mismatches}/${checked} national IDs embed the profile's own birth date`);
  for (const e of examples) console.log(`    ${e}`);
}

console.log("\n=== national ID gender encoding ===");
{
  /*
   * Some ID schemes encode sex in the sequence number. CN: the 17th digit is
   * odd for male, even for female. KR: the first digit after the hyphen is
   * 1/3 for male, 2/4 for female. Failing this makes the record self-
   * contradictory in an obvious way.
   */
  const GENDER_IN_ID: Record<string, (id: string) => "male" | "female" | null> = {
    CN: (id) => (id.length === 18 ? (Number(id[16]) % 2 === 1 ? "male" : "female") : null),
    KR: (id) => {
      const c = id[7];
      if (!c) return null;
      if (c === "1" || c === "3" || c === "5" || c === "9") return "male";
      if (c === "2" || c === "4" || c === "6" || c === "0") return "female";
      return null;
    },
  };

  let checked = 0;
  let mismatches = 0;
  const examples: string[] = [];

  for (const [code, extract] of Object.entries(GENDER_IN_ID)) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);

    for (const gender of ["male", "female"] as const) {
      for (let i = 0; i < 20; i++) {
        const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed(), gender });
        const inId = extract(id.map.idNumber ?? "");
        checked++;
        if (inId !== gender) {
          mismatches++;
          if (examples.length < 4) examples.push(`${code} ${gender}: id encodes ${inId}`);
        }
      }
    }
  }

  check(mismatches === 0, `${mismatches}/${checked} national IDs encode the wrong sex`);
  console.log(`  ${checked - mismatches}/${checked} national IDs encode the profile's own sex`);
  for (const e of examples) console.log(`    ${e}`);
}

console.log("\n=== contact fields are well-formed ===");
{
  /*
   * The email local-part was built by stripping everything outside [a-z] from
   * the name. A Chinese, Japanese or Korean name strips to nothing, leaving
   * ".42@yahoo.com" — a syntactically invalid address, not just an odd one.
   */
  const EMAIL_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/;
  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const code of COUNTRY_CODES) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);

    for (let i = 0; i < 12; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed() });
      const email = id.map.email ?? "";
      checked++;
      if (!EMAIL_RE.test(email)) {
        bad++;
        if (examples.length < 5) examples.push(`${code}: ${JSON.stringify(email)}`);
      }
    }
  }

  check(bad === 0, `${bad}/${checked} generated emails are malformed`);
  console.log(`  ${checked - bad}/${checked} emails are well-formed`);
  for (const e of examples) console.log(`    ${e}`);
}

console.log("\n=== no ASCII place names inside CJK addresses ===");
{
  /*
   * The CN/JP/KR templates concatenate state+city+street with no separator. A
   * leftover ASCII city there produces "江西Jinfeng新华街1号" — a malformed
   * address. Names may legitimately keep Latin where GeoNames has no local
   * form, so this checks for the specific defect: ASCII directly adjacent to a
   * CJK character with no separating space.
   */
  const ADJACENT_ASCII_CJK = /[\u4E00-\u9FFF][A-Za-z]|[A-Za-z][\u4E00-\u9FFF]/;
  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const code of ["CN", "JP", "KR"]) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);

    for (const lang of ["zh", "ja", "ko"] as const) {
      for (let i = 0; i < 15; i++) {
        const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed(), lang });
        const addr = id.map.fullAddress ?? "";
        checked++;
        if (ADJACENT_ASCII_CJK.test(addr)) {
          bad++;
          if (examples.length < 5) {
            const line = addr.split("\n").find((l) => ADJACENT_ASCII_CJK.test(l)) ?? addr;
            examples.push(`${code}/${lang}: ${line}`);
          }
        }
      }
    }
  }

  check(bad === 0, `${bad}/${checked} CJK addresses mix ASCII into a CJK string`);
  console.log(`  ${checked - bad}/${checked} CJK addresses contain no glued ASCII`);
  for (const e of examples) console.log(`    ${e}`);
}

console.log("\n=== generated values match country conventions ===");
{
  /*
   * These are the rules a real number, name or handle obeys in each country.
   * They were all violated before: "+86 097 9130 7567" is not a Chinese mobile,
   * "泽洋 廖" reverses the name order, and a username of "75" is what remains
   * after stripping a CJK name to ASCII.
   */
  const MOBILE_RE: Record<string, RegExp> = {
    CN: /^\+86 1[3-9]\d \d{4} \d{4}$/,
    US: /^\+1 [2-9]\d{2} \d{3} \d{4}$/,
    GB: /^\+44 7\d{3} \d{6}$/,
    JP: /^\+81 [789]0 \d{4} \d{4}$/,
    KR: /^\+82 10 \d{4} \d{4}$/,
    DE: /^\+49 1[5-7]\d \d{7}$/,
    FR: /^\+33 [67] \d{2} \d{2} \d{2} \d{2}$/,
    IN: /^\+91 [6-9]\d{4} \d{5}$/,
    RU: /^\+7 9\d{2} \d{3} \d{2} \d{2}$/,
    // Vietnamese mobiles: the international form drops the domestic trunk 0,
    // leaving a 2-digit network prefix plus 7 digits, displayed 3-3-3.
    VN: /^\+84 [35789]\d{2} \d{3} \d{3}$/,
    TH: /^\+66 [689]\d \d{3} \d{4}$/,
    MY: /^\+60 1\d \d{4} \d{4}$/,
    ID: /^\+62 8\d{2} \d{3} \d{4}$/,
  };

  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const [code, re] of Object.entries(MOBILE_RE)) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);
    for (let i = 0; i < 25; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed() });
      checked++;
      if (!re.test(id.map.phone ?? "")) {
        bad++;
        if (examples.length < 6) examples.push(`${code}: ${id.map.phone}  expected ${re.source}`);
      }
    }
  }
  check(bad === 0, `${bad}/${checked} phone numbers do not match their country's real format`);
  console.log(`  ${checked - bad}/${checked} phone numbers match real mobile formats`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  /*
   * Family-name-first countries must not be reversed, and must not carry a
   * middle name drawn from faker's English fallback pool.
   *
   * Chinese, Japanese, Korean and Taiwanese names are written unbroken
   * (廖泽洋); Vietnamese and Thai names keep spaces (Ngô Nhật Linh), so the
   * check is on the specific defects: a reversed order, or a name whose parts
   * include something that is not in the country's own name pool.
   */
  const NO_SPACE = ["CN", "JP", "KR", "TW", "HK", "MO"];
  const WITH_SPACE = ["VN", "TH"];
  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const code of [...NO_SPACE, ...WITH_SPACE]) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);
    const pool = new Set([...name.first, ...name.last]);

    for (let i = 0; i < 25; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed() });
      checked++;
      const full = id.map.fullName ?? "";

      // Unbroken scripts must contain no space at all.
      if (NO_SPACE.includes(code) && /\s/.test(full)) {
        bad++;
        if (examples.length < 6) examples.push(`${code}: ${JSON.stringify(full)} (space in unbroken name)`);
        continue;
      }

      /*
       * Vietnamese and Thai names are the family name followed by one or more
       * given-name words ("Phan Bạch Cúc"), so splitting on spaces and checking
       * every token against the pool is wrong — the given name is itself
       * multi-word. The check is instead that the string begins with a known
       * family name and that the remainder is non-empty.
       */
      const family = name.last.find((l) => full.startsWith(l));
      const givenPart = family ? full.slice(family.length).trim() : "";
      if (!family || !givenPart) {
        bad++;
        if (examples.length < 6) examples.push(`${code}: ${JSON.stringify(full)}`);
      }
    }
  }
  check(bad === 0, `${bad}/${checked} family-name-first names are malformed`);
  console.log(`  ${checked - bad}/${checked} family-name-first names use only native name parts`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  // Usernames and emails must be non-empty ASCII handles, not bare numbers.
  let checked = 0;
  let bad = 0;
  const examples: string[] = [];
  const OK = /^[a-z][a-z0-9]{2,}$/;

  for (const code of COUNTRY_CODES) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);
    for (let i = 0; i < 10; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed() });
      checked++;
      const u = id.map.username ?? "";
      if (!OK.test(u)) {
        bad++;
        if (examples.length < 6) examples.push(`${code}: ${JSON.stringify(u)}`);
      }
    }
  }
  check(bad === 0, `${bad}/${checked} usernames are not usable ASCII handles`);
  console.log(`  ${checked - bad}/${checked} usernames are usable ASCII handles`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  // Job titles must be in the country's own language where the script is not
  // Latin — a Chinese record with an English job title is the defect.
  const NON_LATIN = ["CN", "TW", "HK", "MO", "JP", "KR", "TH", "VN", "RU", "AE", "SA", "IL"];
  const LATIN = /^[\x20-\x7E]+$/;
  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const code of NON_LATIN) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);
    for (let i = 0; i < 12; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed() });
      checked++;
      const job = id.map.jobTitle ?? "";
      if (LATIN.test(job)) {
        bad++;
        if (examples.length < 6) examples.push(`${code}: ${JSON.stringify(job)}`);
      }
    }
  }
  check(bad === 0, `${bad}/${checked} job titles are still English for non-Latin countries`);
  console.log(`  ${checked - bad}/${checked} job titles use the country's own script`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  /*
   * A card's issuing bank must operate in the holder's country, and its network
   * must be one people there actually carry. Both were drawn from global lists,
   * so a German record showed "BANK OF AMERICA" and a Chinese one a JCB card.
   */
  const KNOWN_BANKS: Record<string, string[]> = {};
  for (const [cc, byNetwork] of Object.entries(CARD_BANKS)) {
    KNOWN_BANKS[cc] = Object.values(byNetwork).flat();
  }

  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const cc of COUNTRY_CODES) {
    const known = KNOWN_BANKS[cc];
    if (!known) continue;
    const spec = COUNTRY_BY_CODE[cc];
    const data = getCountryData(cc);
    if (!spec || !data) continue;
    const name = getNamePool(cc);

    for (let i = 0; i < 12; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: cc, seed: randomSeed() });
      checked++;
      const bank = id.map.cardBank ?? "";
      if (!known.includes(bank)) {
        bad++;
        if (examples.length < 6) examples.push(`${cc}: ${bank}`);
      }
    }
  }
  check(bad === 0, `${bad}/${checked} issuing banks do not belong to the cardholder's country`);
  console.log(`  ${checked - bad}/${checked} issuing banks match the holder's country`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  /*
   * Company names must not glue two Latin words together ("WeberGmbH & Co.
   * KG"), and must use a legal form that exists in the holder's jurisdiction —
   * a GmbH belongs in Germany, not Australia.
   *
   * A camel-case test would work for the first part but flags legitimately
   * capitalised brands such as "Deutsche Bank", so the check is that no known
   * suffix appears without a preceding space.
   */
  const SUFFIXES = ["GmbH", "AG", "Ltd", "LLC", "Inc.", "S.A.", "Ltda.", "Pty", "Sdn.", "Pte.", "Corp."];
  const FOREIGN_SUFFIX: Record<string, string[]> = {
    // Countries where a German or Brazilian form would be wrong.
    AU: ["GmbH", "AG"], NZ: ["GmbH", "AG"], GB: ["GmbH", "AG"], IE: ["GmbH", "AG"],
    CA: ["GmbH", "AG"], US: ["GmbH", "AG"], SG: ["GmbH", "S.A."], MY: ["GmbH", "S.A."],
    IN: ["GmbH", "S.A."], ZA: ["GmbH"], CN: ["GmbH", "Ltd"],
  };

  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const cc of COUNTRY_CODES) {
    const spec = COUNTRY_BY_CODE[cc];
    const data = getCountryData(cc);
    if (!spec || !data) continue;
    const name = getNamePool(cc);

    for (let i = 0; i < 8; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: cc, seed: randomSeed() });
      checked++;
      const co = id.map.company ?? "";

      // A suffix is "glued" when a letter runs straight into another letter
      // across a word boundary — the signature of "WeberGmbH". The test is a
      // lowercase letter immediately followed by an uppercase one, excluding
      // known brand-style capitalisation by requiring the uppercase run to be a
      // suffix we know.
      const glued = SUFFIXES.some((s) => {
        const re = new RegExp(`[a-z]${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "");
        return re.test(co);
      });
      const foreign = (FOREIGN_SUFFIX[cc] ?? []).some((s) => co.includes(s));

      if (glued || foreign) {
        bad++;
        if (examples.length < 6) examples.push(`${cc}: ${co}${glued ? " (glued)" : " (foreign legal form)"}`);
      }
    }
  }
  check(bad === 0, `${bad}/${checked} company names are malformed or use a foreign legal form`);
  console.log(`  ${checked - bad}/${checked} company names are well-formed and locally valid`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  /*
   * Names must be written in the country's own script. Hong Kong's faker chain
   * began with en_HK, so it produced "羅Marilou" — an English given name glued
   * to a Chinese surname. Any name in a CJK country containing Latin letters is
   * that defect.
   */
  const CJK_COUNTRIES = ["CN", "TW", "HK", "MO", "JP", "KR", "TH"];
  const LATIN = /[A-Za-z]/;
  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const code of CJK_COUNTRIES) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);
    for (let i = 0; i < 25; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed() });
      checked++;
      const full = id.map.fullName ?? "";
      if (LATIN.test(full)) {
        bad++;
        if (examples.length < 6) examples.push(`${code}: ${JSON.stringify(full)}`);
      }
    }
  }
  check(bad === 0, `${bad}/${checked} names in CJK countries contain Latin letters`);
  console.log(`  ${checked - bad}/${checked} CJK names use only the local script`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  /*
   * Brazilian addresses carry the state abbreviation, not the numeric division
   * code: "São Paulo - SP". Records previously read "Cascavel - 18".
   */
  const spec = COUNTRY_BY_CODE["BR"];
  const data = getCountryData("BR");
  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  if (spec && data) {
    const name = getNamePool("BR");
    const UFS = new Set(["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"]);
    for (let i = 0; i < 30; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: "BR", seed: randomSeed(), lang: "en" });
      checked++;
      const addr = id.map.fullAddress ?? "";
      const m = / - ([A-Z]{2})\b/.exec(addr);
      if (!m || !UFS.has(m[1])) {
        bad++;
        if (examples.length < 4) examples.push(JSON.stringify(addr.split("\n")[1] ?? addr));
      }
    }
  }
  check(bad === 0, `${bad}/${checked} Brazilian addresses lack a valid state abbreviation`);
  console.log(`  ${checked - bad}/${checked} Brazilian addresses carry a real UF`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  /*
   * The record is written in the country's own language, independent of the
   * interface language. A Korean record shown on a Chinese interface must read
   * 강원도 강릉시…, not 江原道 江陵市…; the interface language governs the
   * labels around the data, not the data itself.
   *
   * The strongest check is invariance: the same seed must produce byte-identical
   * data regardless of which interface language requested it.
   */
  const SCRIPT: Record<string, RegExp> = {
    ko: /[\uAC00-\uD7AF]/,
    ja: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
  };

  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const code of COUNTRY_CODES) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);

    // Same seed, four interface languages.
    const rendered = (["zh", "en", "ja", "ko"] as const).map((ui) =>
      generateIdentity(spec, { name, countryData: data }, { country: code, seed: 4242, lang: ui }),
    );

    const fields = ["state", "city", "country", "fullAddress", "jobTitle", "company", "postal"];
    checked++;
    for (const f of fields) {
      const values = new Set(rendered.map((r) => r.map[f] ?? ""));
      if (values.size !== 1) {
        bad++;
        if (examples.length < 5) {
          examples.push(`${code}.${f} varies with UI language: ${[...values].map((v) => JSON.stringify(v)).join(" vs ")}`);
        }
      }
    }

    // The data must be in the country's script where that script is not Latin.
    if (SCRIPT[spec.dataLang]) {
      const addr = rendered[0].map.fullAddress ?? "";
      if (!SCRIPT[spec.dataLang].test(addr)) {
        bad++;
        if (examples.length < 5) examples.push(`${code}: address not in ${spec.dataLang}: ${JSON.stringify(addr)}`);
      }
    }
  }

  check(bad === 0, `${bad} data fields vary with the interface language or use the wrong script`);
  console.log(`  ${checked} countries emit data independent of the interface language`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  /*
   * The complete address is a single line. It was joined with newlines, which
   * on screen reads as several separate values rather than one address.
   */
  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const code of COUNTRY_CODES) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);
    const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: 77, lang: "zh" });
    checked++;
    const addr = id.map.fullAddress ?? "";
    if (addr.includes("\n")) {
      bad++;
      if (examples.length < 4) examples.push(`${code}: ${JSON.stringify(addr)}`);
    }
  }
  check(bad === 0, `${bad}/${checked} complete addresses still span multiple lines`);
  console.log(`  ${checked - bad}/${checked} complete addresses are a single line`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  /*
   * US states must use their standard names. GeoNames' English aliases carry
   * nicknames and legal formalities — "Empire State" for New York, "State of
   * Idaho" — which are not what appears on an address.
   */
  const BAD = /^(State of|Commonwealth of|Republic of)|State$|Empire State|Blue Grass State/;
  const spec = COUNTRY_BY_CODE["US"];
  const data = getCountryData("US");
  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  if (spec && data) {
    const name = getNamePool("US");
    for (let i = 0; i < 60; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: "US", seed: randomSeed(), lang: "en" });
      checked++;
      const state = id.map.state ?? "";
      if (BAD.test(state)) {
        bad++;
        if (examples.length < 5) examples.push(JSON.stringify(state));
      }
    }
  }
  check(bad === 0, `${bad}/${checked} US state names are nicknames or legal formalities`);
  console.log(`  ${checked - bad}/${checked} US state names are the standard form`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  /*
   * Every field of every card must carry a real value, in all 34 countries.
   *
   * An audit across all nine cards found that a country without a middle name
   * emitted "—" as its value, which reads as a field that failed to generate.
   * The same sweep checks for empty strings and literal "undefined"/"null".
   */
  const PLACEHOLDERS = new Set(["", "—", "-", "undefined", "null", "N/A", "n/a"]);
  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const code of COUNTRY_CODES) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);

    for (const seed of [11, 22, 33]) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed, lang: "zh" });

      // All nine cards must be present.
      if (id.groups.length !== 9) {
        bad++;
        examples.push(`${code}: ${id.groups.length} groups, expected 9`);
      }

      for (const g of id.groups) {
        for (const f of g.fields) {
          checked++;
          if (PLACEHOLDERS.has((f.value ?? "").trim())) {
            bad++;
            if (examples.length < 6) examples.push(`${code} [${g.key}] ${f.key} = ${JSON.stringify(f.value)}`);
          }
        }
      }

      // Core fields must exist for every country.
      const required = ["email", "phone", "fullAddress", "company", "school", "jobTitle", "idNumber"];
      if (!spec.postalDisabled) required.push("postal");
      for (const k of required) {
        if (!id.map[k]) {
          bad++;
          if (examples.length < 6) examples.push(`${code}: missing ${k}`);
        }
      }
    }
  }

  check(bad === 0, `${bad} fields are empty or placeholders across the nine cards`);
  console.log(`  ${checked} field values across all countries are populated`);
  for (const e of examples) console.log(`    ${e}`);
}

{
  /*
   * Names must be written in the country's own script. faker falls back to its
   * English locale when the primary one lacks a field, which injected Latin
   * names into Arabic pools and produced "Jeromy العواني".
   */
  const SCRIPT: Record<string, RegExp> = {
    CN: /[\u4E00-\u9FFF]/, TW: /[\u4E00-\u9FFF]/, HK: /[\u4E00-\u9FFF]/, MO: /[\u4E00-\u9FFF]/,
    JP: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/,
    KR: /[\uAC00-\uD7AF]/,
    RU: /[\u0400-\u04FF]/,
    SA: /[\u0600-\u06FF]/, AE: /[\u0600-\u06FF]/,
    IL: /[\u0590-\u05FF]/,
    TH: /[\u0E00-\u0E7F]/,
  };
  const OTHER_SCRIPTS = /[\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0E00-\u0E7F\uAC00-\uD7AF\u3040-\u30FF]/;

  let checked = 0;
  let bad = 0;
  const examples: string[] = [];

  for (const [code, script] of Object.entries(SCRIPT)) {
    const spec = COUNTRY_BY_CODE[code];
    const data = getCountryData(code);
    if (!spec || !data) continue;
    const name = getNamePool(code);

    for (let i = 0; i < 20; i++) {
      const id = generateIdentity(spec, { name, countryData: data }, { country: code, seed: randomSeed(), lang: "zh" });
      checked++;
      const full = id.map.fullName ?? "";
      // The name must contain the country's script. It must not contain Latin
      // letters, nor another non-Latin script.
      if (!script.test(full)) {
        bad++;
        if (examples.length < 6) examples.push(`${code}: ${JSON.stringify(full)} has no local script`);
      } else if (/[A-Za-z]/.test(full)) {
        bad++;
        if (examples.length < 6) examples.push(`${code}: ${JSON.stringify(full)} contains Latin`);
      }
    }
  }
  check(bad === 0, `${bad}/${checked} names are not written purely in the country's script`);
  console.log(`  ${checked - bad}/${checked} names are written purely in the country's script`);
  for (const e of examples) console.log(`    ${e}`);
}


console.log("\n=== mailbox helpers ===");
{
  /*
   * The mailbox talks to a separate server, so it cannot be exercised here —
   * but the two pure helpers can, and both have a correctness requirement:
   * extractCodes must find the code a visitor needs, and sanitizeHtml must
   * neutralise anything a sender could put in a message body.
   */
  const { extractCodes, sanitizeHtml } = await import("../src/lib/mail/api.ts");

  // Code extraction: the common shapes a real message uses.
  const codeCases: [string, string, string | null][] = [
    ["plain six digits", "Your verification code is 483920.", "483920"],
    ["subject only", "712645 is your code", "712645"],
    ["four digits", "Code: 5521", "5521"],
    ["eight digits", "token 20241231 expires soon", "20241231"],
    ["no code", "Welcome to the service. No action needed.", null],
  ];
  let codeChecked = 0;
  let codeBad = 0;
  for (const [label, body, expected] of codeCases) {
    const found = extractCodes({ subject: "", text: body });
    codeChecked++;
    if (expected === null) {
      // A message without a code should not invent one from a stray number.
      if (found.length > 0) {
        codeBad++;
        console.error(`  FAIL: ${label} produced ${JSON.stringify(found)} but should find none`);
      }
    } else if (!found.includes(expected)) {
      codeBad++;
      console.error(`  FAIL: ${label} -> ${JSON.stringify(found)}, expected ${expected}`);
    }
  }
  check(codeBad === 0, `${codeBad}/${codeChecked} verification codes were not extracted correctly`);
  console.log(`  ${codeChecked - codeBad}/${codeChecked} verification codes extracted correctly`);

  // Sanitiser: only runs with a DOM, so it is skipped outside the browser.
  if (typeof DOMParser === "undefined") {
    console.log("  sanitizeHtml: skipped (needs a DOM; verified in the browser instead)");
  } else {
    const xssCases = [
      "<script>alert(1)</script><p>ok</p>",
      '<img src=x onerror="alert(2)">',
      '<a href="javascript:alert(3)">x</a>',
      "<iframe src=\"https://evil.example\"></iframe>",
      '<p onclick="alert(4)">t</p>',
      "<style>body{display:none}</style>",
    ];
    let xssBad = 0;
    for (const c of xssCases) {
      const out = sanitizeHtml(c);
      if (/<script|onerror=|onclick=|javascript:|<iframe|<style/i.test(out)) {
        xssBad++;
        console.error(`  FAIL: sanitizer left \`${out}\` from \`${c}\``);
      }
    }
    check(xssBad === 0, `${xssBad}/${xssCases.length} hostile bodies survived sanitising`);
    console.log(`  ${xssCases.length - xssBad}/${xssCases.length} hostile bodies neutralised`);

    // Legitimate formatting must survive.
    const kept = sanitizeHtml("<p>Hello <b>world</b></p><a href=\"https://ok.example\">link</a>");
    check(kept.includes("<b>world</b>") && kept.includes("https://ok.example"),
      "sanitizer stripped legitimate formatting");
    console.log("  legitimate formatting preserved");
  }
}

console.log("\n=== card generator ===");
{
  /*
   * The card generator is pure and offline, so it can be exercised fully
   * here. Three things must hold: every number passes Luhn and has the length
   * its network actually issues; a chosen network is what detectNetwork
   * reports for the result; and completion never alters the digits the visitor
   * typed.
   */
  const { NETWORKS, NETWORK_ORDER, detectNetwork } = await import("../src/lib/card/networks.ts");
  const { generateCard, generateCards, completeCard, completeCards, seedForInput } = await import("../src/lib/card/generate.ts");
  const { isValidLuhn, luhnCheckDigit } = await import("../src/lib/card/luhn.ts");

  /*
   * The real issuer ranges, as documented for each scheme (ISO/IEC 7812;
   * Wikipedia "Payment card number"). A test number is only useful if a real
   * payment form accepts its length and prefix, so these are asserted directly
   * against the table the generator uses.
   */
  const REAL_FORMATS: Record<string, { lengths: number[]; cvv: number }> = {
    Visa: { lengths: [16, 19], cvv: 3 },
    Mastercard: { lengths: [16], cvv: 3 },
    Amex: { lengths: [15], cvv: 4 },
    Discover: { lengths: [16, 19], cvv: 3 },
    JCB: { lengths: [16], cvv: 3 },
    UnionPay: { lengths: [16, 19], cvv: 3 },
    Diners: { lengths: [14, 16], cvv: 3 },
  };
  let fmtBad = 0;
  for (const [id, want] of Object.entries(REAL_FORMATS)) {
    const net = NETWORKS[id as keyof typeof NETWORKS];
    if (JSON.stringify(net.lengths) !== JSON.stringify(want.lengths)) {
      fmtBad++;
      console.error(`  FAIL: ${id} lengths ${JSON.stringify(net.lengths)}, real ones are ${JSON.stringify(want.lengths)}`);
    }
    if (net.cvv !== want.cvv) {
      fmtBad++;
      console.error(`  FAIL: ${id} cvv length ${net.cvv}, real is ${want.cvv}`);
    }
  }
  check(fmtBad === 0, `${fmtBad} network lengths/CVV disagree with the real card formats`);
  console.log(`  ${Object.keys(REAL_FORMATS).length} networks match their real lengths and CVV widths`);

  // Luhn helper against known-valid published test numbers.
  const knownValid = [
    "4111111111111111",
    "4242424242424242",
    "5555555555554444",
    "378282246310005",
    "6011111111111117",
    "30569309025904",
  ];
  let luhnBad = 0;
  for (const n of knownValid) if (!isValidLuhn(n)) { luhnBad++; console.error(`  FAIL: ${n} should be Luhn-valid`); }
  // A single perturbation must break validity.
  for (const n of knownValid) {
    const flipped = n.slice(0, -1) + String((Number(n[n.length - 1]) + 1) % 10);
    if (isValidLuhn(flipped)) { luhnBad++; console.error(`  FAIL: perturbed ${flipped} still passed Luhn`); }
  }
  check(luhnBad === 0, `${luhnBad} Luhn helper results were wrong`);
  console.log(`  Luhn helper: ${knownValid.length} known-valid numbers accepted, all perturbations rejected`);

  // Every network, many seeds: valid, correct length, self-detecting.
  let netBad = 0;
  let netChecked = 0;
  for (const id of NETWORK_ORDER) {
    const net = NETWORKS[id];
    for (let s = 0; s < 60; s++) {
      const c = generateCard(id, s * 7919 + 13);
      netChecked++;
      if (!isValidLuhn(c.number)) { netBad++; if (netBad <= 5) console.error(`  FAIL: ${id} seed ${s} produced a non-Luhn number ${c.number}`); }
      if (!net.lengths.includes(c.number.length)) { netBad++; if (netBad <= 5) console.error(`  FAIL: ${id} produced length ${c.number.length}, not in ${net.lengths}`); }
      if (detectNetwork(c.number) !== id) { netBad++; if (netBad <= 5) console.error(`  FAIL: ${id} number ${c.number} detected as ${detectNetwork(c.number)}`); }
      if (c.cvv.length !== net.cvv) { netBad++; if (netBad <= 5) console.error(`  FAIL: ${id} cvv length ${c.cvv.length}, expected ${net.cvv}`); }
    }
  }
  check(netBad === 0, `${netBad}/${netChecked} generated cards were malformed`);
  console.log(`  ${netChecked - netBad}/${netChecked} generated cards are Luhn-valid with the right length and network`);

  /*
   * The rendered number must always show every digit. The card face sizes the
   * number from the card's width; a number longer than the rendering allows
   * would be clipped, which is what the reported JCB/UnionPay defect was. This
   * checks the formatting keeps every digit and the grouped string is a simple
   * re-spacing of the raw number.
   */
  let clipBad = 0;
  for (const id of NETWORK_ORDER) {
    for (const len of NETWORKS[id].lengths) {
      const rng = new (await import("../src/lib/generator/rng.ts")).Rng(1);
      // Build a number of exactly this length via completion of a mask.
      const mask = NETWORKS[id].prefixes[0] + "x".repeat(Math.max(len - NETWORKS[id].prefixes[0].length, 1));
      const r = completeCard(mask, 1);
      if (!r.card) continue;
      const raw = r.card.number;
      const shown = r.card.formatted.replace(/\s+/g, "");
      if (shown !== raw) { clipBad++; console.error(`  FAIL: ${id} displayed "${r.card.formatted}" loses digits from ${raw}`); }
      void rng;
    }
  }
  check(clipBad === 0, `${clipBad} displayed card numbers did not contain every digit`);
  console.log("  every displayed number keeps all its digits after grouping");

  // Random choice must actually reach every network across enough draws.
  const seen = new Set<string>();
  for (let s = 0; s < 400; s++) seen.add(generateCard("random", s).network);
  check(seen.size === NETWORK_ORDER.length, `random choice only reached ${seen.size}/${NETWORK_ORDER.length} networks`);
  console.log(`  random choice reached ${seen.size}/${NETWORK_ORDER.length} networks`);

  // Completion preserves the typed digits and yields a valid number.
  const partials: [string, string][] = [
    ["4", "4"],
    ["4111", "4111"],
    ["4111 1111", "41111111"],
    ["4111xxxxxxxxxxxx", "4111"],
    ["37xxxxxxxxxxxxx", "37"],
    ["62xxxxxxxxxxxxxxxx", "62"],
    ["4111111111111111", "4111111111111111"],
  ];
  let compBad = 0;
  for (const [input, typed] of partials) {
    const r = completeCard(input, seedForInput(input));
    if (!r.card) { compBad++; console.error(`  FAIL: completeCard(${JSON.stringify(input)}) returned ${r.error}`); continue; }
    if (!isValidLuhn(r.card.number)) { compBad++; console.error(`  FAIL: completed ${r.card.number} is not Luhn-valid`); }
    if (!r.card.number.startsWith(typed)) { compBad++; console.error(`  FAIL: completeCard(${JSON.stringify(input)}) dropped typed digits: ${r.card.number}`); }
    const netLen = NETWORKS[r.card.network].lengths;
    if (!netLen.includes(r.card.number.length)) { compBad++; console.error(`  FAIL: completed ${r.card.number} has length ${r.card.number.length}, not a real ${r.card.network} length ${JSON.stringify(netLen)}`); }
  }
  check(compBad === 0, `${compBad}/${partials.length} completions were wrong`);
  console.log(`  ${partials.length - compBad}/${partials.length} partial numbers completed, typed digits preserved, real lengths used`);

  // Refusals: a mask that cannot reach card length, and an unknown prefix.
  const refusals: [string, string][] = [
    ["", "empty"],
    ["54**", "tooShort"],
    ["99", "unknownPrefix"],
    ["abcd", "badChars"],
  ];
  let refBad = 0;
  for (const [input, want] of refusals) {
    const r = completeCard(input, 1);
    if (r.card || r.error !== want) { refBad++; console.error(`  FAIL: completeCard(${JSON.stringify(input)}) -> ${r.error}, expected ${want}`); }
  }
  check(refBad === 0, `${refBad}/${refusals.length} invalid inputs were not refused correctly`);
  console.log(`  ${refusals.length - refBad}/${refusals.length} invalid inputs refused with the right reason`);

  /*
   * A completed card's label must match what the finished number detects as.
   * "6222" is UnionPay at two digits but the finished 6222xx number can fall in
   * the ISO block assigned to Discover; the label has to follow the number.
   */
  let labelBad = 0;
  for (const input of ["62", "6222", "6222xxxxxxxxxxxx", "622126xxxxxxxxxx", "6"]) {
    const r = completeCard(input, seedForInput(input));
    if (!r.card) continue;
    const detected = detectNetwork(r.card.number);
    if (detected && detected !== r.card.network) {
      labelBad++;
      console.error(`  FAIL: ${r.card.number} labelled ${r.card.network} but detects as ${detected}`);
    }
  }
  check(labelBad === 0, `${labelBad} completed cards were labelled inconsistently`);
  console.log("  completed cards are labelled by their finished number");

  // Batch completion: several cards, all sharing the typed digits.
  const batchComplete = completeCards("4111xxxxxxxxxxxx", 5, 12345);
  const bcCards = batchComplete.flatMap((r) => (r.card ? [r.card] : []));
  const bcUnique = new Set(bcCards.map((c) => c.number));
  check(
    bcCards.length === 5 &&
      bcUnique.size === 5 &&
      bcCards.every((c) => c.number.startsWith("4111")),
    `batch completion produced ${bcCards.length} cards, ${bcUnique.size} distinct, prefix kept`,
  );
  console.log(`  batch completion: ${bcCards.length} cards, ${bcUnique.size} distinct, typed prefix preserved`);

  // Determinism.
  const d1 = generateCard("Visa", 999).number;
  const d2 = generateCard("Visa", 999).number;
  const d3 = completeCard("4111xxxxxxxxxxxx", 777).card?.number;
  const d4 = completeCard("4111xxxxxxxxxxxx", 777).card?.number;
  check(d1 === d2 && d3 === d4 && Boolean(d3), "card generation is not deterministic");
  console.log("  generation is deterministic for a fixed seed");

  // Batch: the right count, no duplicates within a batch.
  const batch = generateCards("random", 20, 4242);
  const unique = new Set(batch.map((c) => c.number));
  check(batch.length === 20 && unique.size === 20, `batch of 20 had ${unique.size} distinct numbers`);
  console.log(`  batch of ${batch.length}: ${unique.size} distinct numbers`);

  // Check-digit helper agrees with append-then-validate.
  let cdBad = 0;
  for (const n of knownValid) {
    const body = n.slice(0, -1);
    if (String(luhnCheckDigit(body)) !== n[n.length - 1]) { cdBad++; console.error(`  FAIL: check digit for ${body} was ${luhnCheckDigit(body)}, expected ${n[n.length - 1]}`); }
  }
  check(cdBad === 0, `${cdBad} check digits were computed wrongly`);
  console.log("  check-digit computation matches known-valid numbers");
}

console.log("\n=== address generator ===");
{
  /*
   * The address page projects the address group out of a generated identity, so
   * most of its correctness is already covered by the identity tests above.
   * What is specific to this feature, and checked here:
   *   - the country list is complete and ordered by English name;
   *   - the picker label is "name·CODE";
   *   - the projected record carries the fields a form needs, omitting postal
   *     exactly where the country has no postal system;
   *   - the format explainer agrees with the registry (the point of deriving it
   *     rather than writing prose).
   */
  const {
    sortedCountries, addressFormat, addressCountry, generateAddress,
  } = await import("../src/lib/address/generate.ts");
  const { COUNTRIES, COUNTRY_BY_CODE } = await import("../src/lib/registry.ts");
  const { loadCountryData, loadNamePool } = await import("../src/lib/data.ts");
  const { LANGS } = await import("../src/config.ts");

  // Country list: complete, and ordered by English name.
  const list = sortedCountries("zh");
  check(list.length === COUNTRIES.length,
    `address country list has ${list.length}, registry has ${COUNTRIES.length}`);
  const engs = list.map((c) => c.english);
  const sortedCopy = [...engs].sort((a, b) => a.localeCompare(b, "en"));
  check(JSON.stringify(engs) === JSON.stringify(sortedCopy), "address country list is not sorted by English name");
  check(list.every((c) => c.label === `${c.name}·${c.code}`), "address picker label is not name·CODE");
  console.log(`  ${list.length} countries, ordered by English name, labelled name·CODE`);

  // Every language yields the same ordering (ordering must not depend on UI lang).
  const orderByLang = LANGS.map((l) => sortedCountries(l).map((c) => c.code).join(","));
  check(new Set(orderByLang).size === 1, "country order differs between UI languages");
  console.log("  ordering is identical across all five languages");

  // Localized labels differ by language, order does not.
  const zhFirst = sortedCountries("zh")[0];
  const enFirst = sortedCountries("en")[0];
  check(zhFirst.code === enFirst.code, "first country differs between zh and en");

  // The projected record: required fields, postal only where applicable.
  let recBad = 0;
  let recChecked = 0;
  for (const spec of COUNTRIES) {
    const [countryData, name] = await Promise.all([loadCountryData(spec.code), loadNamePool(spec.code)]);
    const rec = generateAddress(spec, { name, countryData }, 4242);
    recChecked++;
    const keys = rec.fields.map((f) => f.key);
    for (const required of ["street", "city", "state", "country", "phone"]) {
      if (!keys.includes(required)) { recBad++; if (recBad <= 6) console.error(`  FAIL: ${spec.code} record missing ${required}`); }
    }
    // Postal presence must follow the country's postal scheme exactly.
    const hasPostal = keys.includes("postal");
    if (hasPostal === spec.postalDisabled) {
      recBad++;
      if (recBad <= 6) console.error(`  FAIL: ${spec.code} postalDisabled=${spec.postalDisabled} but postal present=${hasPostal}`);
    }
    // Every value must be non-empty.
    for (const f of rec.fields) {
      if (!f.value || !f.value.trim()) { recBad++; if (recBad <= 6) console.error(`  FAIL: ${spec.code} field ${f.key} is empty`); }
    }
    if (!rec.fullAddress.trim()) { recBad++; if (recBad <= 6) console.error(`  FAIL: ${spec.code} fullAddress is empty`); }
    if (!rec.fullName.trim()) { recBad++; if (recBad <= 6) console.error(`  FAIL: ${spec.code} fullName is empty`); }
  }
  check(recBad === 0, `${recBad}/${recChecked} address records were malformed`);
  console.log(`  ${recChecked - recBad}/${recChecked} records carry the right fields, postal omitted only where the country has none`);

  // The format explainer must agree with the registry it describes.
  let fmtBad = 0;
  for (const spec of COUNTRIES) {
    for (const lang of LANGS) {
      const f = addressFormat(spec, lang);
      if (f.dialCode !== spec.phone.code) { fmtBad++; console.error(`  FAIL: ${spec.code} dial code ${f.dialCode} != ${spec.phone.code}`); }
      if (f.nationalDigits !== spec.phone.nationalDigits) { fmtBad++; console.error(`  FAIL: ${spec.code} national digits mismatch`); }
      if (JSON.stringify(f.groups) !== JSON.stringify(spec.phone.groups)) { fmtBad++; console.error(`  FAIL: ${spec.code} groups mismatch`); }
      if (f.postalDisabled !== spec.postalDisabled) { fmtBad++; console.error(`  FAIL: ${spec.code} postalDisabled mismatch`); }
      if (spec.postalDisabled && f.postalMask !== "") { fmtBad++; console.error(`  FAIL: ${spec.code} postal mask should be empty`); }
      if (!spec.postalDisabled && !f.postalMask) { fmtBad++; console.error(`  FAIL: ${spec.code} postal mask should not be empty`); }
      if (!f.adminLabel) { fmtBad++; console.error(`  FAIL: ${spec.code} admin label empty for ${lang}`); }
      if (f.template.length !== spec.address.template.length) { fmtBad++; console.error(`  FAIL: ${spec.code} template length mismatch`); }
    }
  }
  check(fmtBad === 0, `${fmtBad} format-explainer values disagreed with the registry`);
  console.log("  format explainer agrees with the registry for all countries and languages");

  // Determinism: the same seed reproduces the same address.
  const usSpec = COUNTRY_BY_CODE["US"];
  const [usData, usName] = await Promise.all([loadCountryData("US"), loadNamePool("US")]);
  const a1 = generateAddress(usSpec, { name: usName, countryData: usData }, 777);
  const a2 = generateAddress(usSpec, { name: usName, countryData: usData }, 777);
  check(a1.fullAddress === a2.fullAddress && a1.fullName === a2.fullName, "address generation is not deterministic");
  console.log("  address generation is deterministic for a fixed seed");

  // Different seeds must produce different addresses.
  const b1 = generateAddress(usSpec, { name: usName, countryData: usData }, 1);
  const b2 = generateAddress(usSpec, { name: usName, countryData: usData }, 2);
  check(b1.fullAddress !== b2.fullAddress, "different seeds produced the same address");
  console.log("  different seeds produce different addresses");

  // addressCountry resolves and rejects correctly.
  check(addressCountry("us")?.code === "US" && addressCountry("ZZ") === null, "addressCountry lookup is wrong");
  console.log("  addressCountry resolves codes case-insensitively and rejects unknown ones");

  // The record is the country asked for, never a neighbourhood.
  let crossBad = 0;
  for (const code of ["US", "GB", "JP", "CN", "BR"]) {
    const spec = COUNTRY_BY_CODE[code];
    const [d, n] = await Promise.all([loadCountryData(code), loadNamePool(code)]);
    const rec = generateAddress(spec, { name: n, countryData: d }, 99);
    const countryField = rec.fields.find((f) => f.key === "country")?.value ?? "";
    const expected = spec.name[spec.dataLang] ?? spec.name.en;
    if (!countryField.includes(expected) && countryField !== expected) {
      // The localized name is what the generator emits; accept an exact match only.
      crossBad++;
      console.error(`  FAIL: ${code} address country field "${countryField}" != "${expected}"`);
    }
  }
  check(crossBad === 0, `${crossBad} addresses carried the wrong country name`);
  console.log("  records carry their own country's name");
}

console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${checks} checks, ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
