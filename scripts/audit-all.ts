/**
 * Comprehensive conformance audit across every country and every card.
 *
 * Run: npx tsx scripts/audit-all.ts
 *
 * This is a diagnostic tool, not a test. It prints every value that looks wrong
 * for its country so the defects can be fixed together rather than one at a
 * time. The corresponding assertions live in smoke-test.ts once each class of
 * defect is understood.
 */
import { COUNTRY_CODES, COUNTRY_BY_CODE } from "../src/lib/registry.ts";
import { loadCountryData, loadNamePool } from "../src/lib/data.ts";
import { generateIdentity, type Identity } from "../src/lib/generator/index.ts";

const SECTIONS: { key: string; label: string }[] = [
  { key: "identity", label: "身份" },
  { key: "address", label: "地址" },
  { key: "credit", label: "信用卡" },
  { key: "education", label: "教育" },
  { key: "employment", label: "职业" },
  { key: "lifestyle", label: "生活" },
  { key: "personal", label: "个人" },
  { key: "online", label: "在线" },
  { key: "social", label: "社交" },
];

/* Script detectors. */
const KANA = /[\u3040-\u309F\u30A0-\u30FF]/;
const HAN = /[\u4E00-\u9FFF]/;
const HANGUL = /[\uAC00-\uD7AF]/;
const CYRILLIC = /[\u0400-\u04FF]/;
const ARABIC = /[\u0600-\u06FF]/;
const HEBREW = /[\u0590-\u05FF]/;
const THAI = /[\u0E00-\u0E7F]/;
const LATIN = /[A-Za-z]/;

/** Expected script for each data language. */
const SCRIPT_FOR: Record<string, RegExp> = {
  zh: HAN,
  ja: KANA,
  ko: HANGUL,
  en: LATIN,
};

/** Countries whose record language is not English but whose script matters. */
const NON_LATIN = ["CN", "TW", "HK", "MO", "JP", "KR", "RU", "TH", "SA", "AE", "IL"];

interface Finding {
  cc: string;
  group: string;
  field: string;
  value: string;
  why: string;
}

const findings: Finding[] = [];

function checkScript(cc: string, group: string, field: string, value: string, lang: string) {
  if (!value) return;
  const want = SCRIPT_FOR[lang];
  if (!want) return;

  // A value must not mix the country's script with a foreign one.
  const hasForeign =
    (lang === "zh" && KANA.test(value)) ||
    (lang === "ja" && HANGUL.test(value)) ||
    (lang === "ko" && KANA.test(value)) ||
    (lang === "zh" && /[A-Za-z]{3,}/.test(value)) ||
    (lang === "ja" && /[A-Za-z]{3,}/.test(value)) ||
    (lang === "ko" && /[A-Za-z]{3,}/.test(value));

  if (hasForeign) {
    findings.push({ cc, group, field, value, why: `mixes a foreign script (dataLang=${lang})` });
  }
}

for (const cc of COUNTRY_CODES) {
  const spec = COUNTRY_BY_CODE[cc];
  const data = await loadCountryData(cc);
  const name = await loadNamePool(cc);
  const lang = spec.dataLang;

  // Draw several records to surface intermittent problems.
  for (const seed of [101, 202, 303, 404, 505]) {
    const id: Identity = generateIdentity(spec, { name, countryData: data }, { country: cc, seed, lang: "zh" });

    for (const g of id.groups) {
      for (const f of g.fields) {
        const v = f.value ?? "";
        // Only script-check the fields whose language is the country's.
        if (["state", "city", "country", "fullAddress", "street", "jobTitle", "company", "school", "major", "ethnicity"].includes(f.key)) {
          checkScript(cc, g.key, f.key, v, lang);
        }
      }
    }

    // Address-specific structural checks.
    const addr = id.map.fullAddress ?? "";
    if (addr.includes("\n")) findings.push({ cc, group: "address", field: "fullAddress", value: addr, why: "multi-line" });
    if (addr.includes("  ")) findings.push({ cc, group: "address", field: "fullAddress", value: addr, why: "double space" });
    if (/,\s*,/.test(addr)) findings.push({ cc, group: "address", field: "fullAddress", value: addr, why: "empty segment" });
    if (/\d{1,3}\s*$/.test(addr) === false && addr.length > 0) { /* informational only */ }

    // Pinyin leaking into a CJK name.
    const full = id.map.fullName ?? "";
    if (NON_LATIN.includes(cc) || ["zh", "ja", "ko"].includes(lang)) {
      if (LATIN.test(full)) findings.push({ cc, group: "identity", field: "fullName", value: full, why: "Latin letters in a non-Latin name" });
    }

    // Username must be a usable handle.
    if (!/^[a-z][a-z0-9]{2,}$/.test(id.map.username ?? "")) {
      findings.push({ cc, group: "online", field: "username", value: id.map.username ?? "", why: "not a usable handle" });
    }

    // Phone must not contain a doubled space or a leading zero after +CC.
    const phone = id.map.phone ?? "";
    if (/\+\d+ 0/.test(phone)) findings.push({ cc, group: "address", field: "phone", value: phone, why: "trunk 0 after country code" });

    // Company/school must not be empty.
    for (const k of ["company", "school", "jobTitle"]) {
      if (!id.map[k]) findings.push({ cc, group: "employment", field: k, value: "(empty)", why: "empty value" });
    }
  }
}

/* --------------------------------------------------------------- report */

console.log(`countries audited : ${COUNTRY_CODES.length}`);
console.log(`findings          : ${findings.length}\n`);

if (findings.length === 0) {
  console.log("No structural defects found.");
} else {
  const byCountry = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!byCountry.has(f.cc)) byCountry.set(f.cc, []);
    byCountry.get(f.cc)!.push(f);
  }
  for (const [cc, list] of [...byCountry.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`### ${cc} (${COUNTRY_BY_CODE[cc].dataLang}) — ${list.length}`);
    const seen = new Set<string>();
    for (const f of list) {
      const key = `${f.group}.${f.field}.${f.why}`;
      if (seen.has(key)) continue;
      seen.add(key);
      console.log(`    [${f.group}] ${f.field} = ${JSON.stringify(f.value).slice(0, 80)}`);
      console.log(`        -> ${f.why}`);
    }
    console.log("");
  }
}
