/**
 * Format conformance audit — national ID check digits.
 *
 * A diagnostic report over the same algorithms `smoke-test.ts` gates on (both
 * import `id-checksums.ts`, so there is one implementation, not two).
 *
 * Phase A validates each verifier against published known-valid samples; only if
 * that passes does the Phase B result mean anything. A verifier that is wrong
 * would make the generator look wrong (or right) for the wrong reason.
 *
 * Run: npx tsx scripts/format-audit.ts
 */
import { COUNTRY_CODES, COUNTRY_BY_CODE } from "../src/lib/registry.ts";
import { loadCountryData, loadNamePool } from "../src/lib/data.ts";
import { generateIdentity } from "../src/lib/generator/index.ts";
import { ID_ALGORITHMS, NO_PUBLISHED_CHECKSUM } from "./id-checksums.ts";

console.log("=== PHASE A: validating the verifier against published samples ===\n");
let selfBad = 0;
for (const a of ID_ALGORITHMS) {
  const okV = a.valid.filter((v) => a.fn(v)).length;
  const okI = a.invalid.filter((v) => !a.fn(v)).length;
  const pass = okV === a.valid.length && okI === a.invalid.length && a.valid.length > 0;
  if (!pass) selfBad++;
  console.log(
    `  ${a.code} ${a.label.padEnd(16)} known-valid ${okV}/${a.valid.length}  known-invalid rejected ${okI}/${a.invalid.length}  ${pass ? "VERIFIER OK" : "VERIFIER WRONG"}`,
  );
}
console.log(`\n  verifier self-check: ${ID_ALGORITHMS.length - selfBad}/${ID_ALGORITHMS.length} algorithms reproduce their published samples`);

console.log("\n=== PHASE B: generator output vs the validated algorithms ===\n");
console.log("cc  algo             checked  valid  rate     sample");
const rows: { cc: string; label: string; n: number; ok: number }[] = [];

const N = 100;
for (const a of ID_ALGORITHMS) {
  const spec = COUNTRY_BY_CODE[a.code];
  const data = await loadCountryData(a.code);
  const name = await loadNamePool(a.code);
  let ok = 0;
  let sample = "";
  for (let i = 0; i < N; i++) {
    const id = generateIdentity(spec, { name, countryData: data }, { country: a.code, seed: 1000 + i * 7919 });
    const v = id.map.idNumber ?? "";
    if (i === 0) sample = v;
    if (a.fn(v)) ok++;
  }
  rows.push({ cc: a.code, label: a.label, n: N, ok });
  console.log(
    `${a.code.padEnd(3)} ${a.label.padEnd(16)} ${String(N).padStart(6)} ${String(ok).padStart(6)}  ${String(Math.round((ok / N) * 100)).padStart(3)}%     ${sample}${ok === N ? "" : "  <-- FAIL"}`,
  );
}

console.log("\n--- registry claims ---");
const implemented = new Set(ID_ALGORITHMS.map((a) => a.code));
const claimed = COUNTRY_CODES.filter((c) => COUNTRY_BY_CODE[c].id.hasRealChecksum);
console.log("  hasRealChecksum=true:", claimed.join(" "));
const wrongClaim = claimed.filter((c) => !implemented.has(c));
const missingClaim = [...implemented].filter((c) => !COUNTRY_BY_CODE[c].id.hasRealChecksum);
console.log("  claimed but not implemented:", wrongClaim.join(" ") || "(none)");
console.log("  implemented but not claimed:", missingClaim.join(" ") || "(none)");

console.log("\n--- schemes with NO published check-digit algorithm (format only) ---");
for (const [cc, why] of Object.entries(NO_PUBLISHED_CHECKSUM)) {
  const spec = COUNTRY_BY_CODE[cc];
  const data = await loadCountryData(cc);
  const name = await loadNamePool(cc);
  const id = generateIdentity(spec, { name, countryData: data }, { country: cc, seed: 42 });
  console.log(`  ${cc}  ${id.map.idNumber}   claimed=${spec.id.hasRealChecksum}  — ${why}`);
}

const bad = rows.filter((r) => r.ok !== r.n);
console.log(`\ngenerator failures: ${bad.length} of ${rows.length} algorithms`);
for (const b of bad) console.log(`   ${b.cc} ${b.label}: ${b.ok}/${b.n}`);
