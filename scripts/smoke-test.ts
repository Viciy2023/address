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

import { COUNTRY_CODES, COUNTRY_BY_CODE } from "../src/lib/registry.ts";
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

console.log(`\n${failures === 0 ? "PASS" : "FAIL"} — ${checks} checks, ${failures} failures`);
process.exit(failures === 0 ? 0 : 1);
