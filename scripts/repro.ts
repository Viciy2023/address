/**
 * Ad-hoc reproduction harness for inspecting generated records.
 *
 * Run: npx tsx scripts/repro.ts [COUNTRY] [LANG]
 */
import { COUNTRY_BY_CODE } from "../src/lib/registry.ts";
import { generateIdentity } from "../src/lib/generator/index.ts";
import { loadCountryData, loadNamePool } from "../src/lib/data.ts";
import type { Lang } from "../src/lib/registry.ts";

const code = (process.argv[2] ?? "CN").toUpperCase();
const lang = (process.argv[3] ?? "zh") as Lang;

const spec = COUNTRY_BY_CODE[code];
if (!spec) throw new Error("unknown country " + code);

const [cd, np] = await Promise.all([loadCountryData(code), loadNamePool(code)]);

for (const seed of [1000, 1001, 1002, 1003, 1004]) {
  const id = generateIdentity(spec, { name: np, countryData: cd }, {
    country: code, seed, gender: "female", lang,
  });
  const m = id.map;
  console.log("--- seed " + seed + " ---");
  console.log("  fullName :", m.fullName);
  console.log("  parts    :", JSON.stringify({ first: m.firstName, middle: m.middleName, last: m.lastName }));
  console.log("  birth    :", m.birthDate, "age:", m.age);
  console.log("  idNumber :", m.idNumber);
  console.log("  email    :", m.email);
  console.log("  address  :", JSON.stringify(m.fullAddress));
  console.log("  stateCode:", m.stateCode, "city:", m.city, "postal:", m.postal);
}
