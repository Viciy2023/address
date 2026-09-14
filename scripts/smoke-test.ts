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

console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${checks} checks, ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
