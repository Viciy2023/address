/**
 * Identity generator — assembles a complete synthetic person record.
 *
 * Design rules that the legacy implementation violated and that this version
 * enforces by construction:
 *
 *   1. Derived fields are computed, never drawn independently. Age comes from
 *      the birth date; BMI-adjacent fields stay inside a plausible range for
 *      the height; the email local-part comes from the person's own name.
 *   2. City, administrative division and postal code are chosen as one unit,
 *      so a result can never be internally inconsistent.
 *   3. Locale-sensitive fields (blood type, ethnicity, income currency) are
 *      driven by the country, not hard-coded.
 *   4. Everything is a pure function of (country, gender, seed), so results
 *      are reproducible and testable.
 */

import { Rng } from "./rng.js";
import { makePostal } from "./postal.js";
import { makeNationalId } from "./identifiers.js";
import type { CountrySpec, DataLang, LocalizedText, Lang } from "../registry.js";
import {
  AU_STATE,
  BR_UF,
  CA_PROVINCE,
  STREET_STYLES,
  CARD_BANKS,
  CARD_NETWORKS,
  CN_GB2260_PREFIX,
  COMPANY_WORDS,
  COUNTRY_BY_CODE,
  COUNTRY_CODES,
  FAMILY_NAME_FIRST,
  MOBILE_PREFIXES,
  NAME_NO_SPACE,
  USES_MIDDLE_NAME,
} from "../registry.js";
import type { CountryData, NamePool } from "../data.js";

/** A localized value resolved for the active UI language. */
export type L10n = LocalizedText;

export interface IdentityField {
  /** Stable key, used by the UI and by CSV export. */
  key: string;
  /** Grouping used by the progressive-disclosure UI. */
  group: GroupKey;
  /** Localized label. */
  label: L10n;
  value: string;
  /**
   * Secondary representation, e.g. imperial units beside metric, or a
   * derived quantity beside its source.
   */
  alt?: string;
  /** True when the value is a real-format identifier rather than derived. */
  sensitive?: boolean;
  /** False when the value could not be generated from authoritative data. */
  real?: boolean;
}

export type GroupKey =
  | "identity"
  | "address"
  | "credit"
  | "education"
  | "employment"
  | "lifestyle"
  | "personal"
  | "online"
  | "social";

export const GROUP_ORDER: GroupKey[] = [
  "identity",
  "address",
  "credit",
  "education",
  "employment",
  "lifestyle",
  "personal",
  "online",
  "social",
];

export interface Identity {
  country: string;
  countryName: L10n;
  seed: number;
  fields: IdentityField[];
  /** Grouped view, ready for rendering. */
  groups: { key: GroupKey; fields: IdentityField[] }[];
  /** Flat map for copy/export. */
  map: Record<string, string>;
  /** Headline values used by the summary card. */
  summary: {
    fullName: string;
    avatarSeed: string;
    country: L10n;
    birthDate: string;
    age: number;
    gender: string;
  };
}

export interface GenerateOptions {
  country: string;
  gender?: "male" | "female" | "any";
  division?: string | null;
  seed: number;
  /**
   * UI language, used to pick the localized administrative-division name.
   * Without it a Chinese interface showed a Chinese address with an English
   * province name, because GeoNames' ASCII table has no local names.
   */
  lang?: DataLang;
}

/* ------------------------------------------------------------------ */
/* Static pools                                                        */
/* ------------------------------------------------------------------ */

/**
 * True when `name` is written in the script that `lang` uses.
 *
 * GeoNames occasionally supplies a romanisation where a native name belongs —
 * Nagoya's Japanese name is stored as "Nagoya-shi". Gluing that into a Japanese
 * address gives "愛知県Nagoya-shi本町通り" , which is malformed rather than
 * merely untranslated, so such names are rejected for concatenated templates.
 *
 * Latin-script languages accept anything, since their addresses separate the
 * parts with spaces.
 */
/** Membership test with the argument order that reads better at call sites. */
function inSet(value: string, set: readonly string[]): boolean {
  return set.includes(value);
}

function isNativeScript(name: string | undefined, lang: string): boolean {
  if (!name) return false;
  switch (lang) {
    case "zh":
      // Han characters. Japanese kanji are also Han, so a kanji-only name is
      // acceptable Chinese (慶尚北道 is valid Chinese for the Korean province).
      return /[\u4E00-\u9FFF]/.test(name) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(name);
    case "ja":
      // Kana or Han; a romanisation contains neither.
      return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(name);
    case "ko":
      return /[\uAC00-\uD7AF]/.test(name) || /[\u4E00-\u9FFF]/.test(name) && !/[A-Za-z]/.test(name);
    default:
      return true;
  }
}

const EYE_COLORS: L10n[] = [
  { zh: "棕色", en: "Brown", ja: "茶色", ko: "갈색" },
  { zh: "蓝色", en: "Blue", ja: "青", ko: "파란색" },
  { zh: "绿色", en: "Green", ja: "緑", ko: "녹색" },
  { zh: "灰色", en: "Grey", ja: "灰色", ko: "회색" },
  { zh: "淡褐色", en: "Hazel", ja: "ヘーゼル", ko: "헤이즐" },
];

const HAIR_COLORS: L10n[] = [
  { zh: "黑色", en: "Black", ja: "黒", ko: "검은색" },
  { zh: "深棕色", en: "Dark Brown", ja: "ダークブラウン", ko: "진한 갈색" },
  { zh: "棕色", en: "Brown", ja: "茶色", ko: "갈색" },
  { zh: "金色", en: "Blonde", ja: "金髪", ko: "금발" },
  { zh: "红棕色", en: "Auburn", ja: "赤褐色", ko: "적갈색" },
  { zh: "灰色", en: "Grey", ja: "白髪", ko: "회색" },
];

const SKIN_TONES: L10n[] = [
  { zh: "白皙", en: "Fair", ja: "色白", ko: "밝은 편" },
  { zh: "自然", en: "Medium", ja: "普通", ko: "보통" },
  { zh: "小麦色", en: "Olive", ja: "オリーブ", ko: "올리브" },
  { zh: "深色", en: "Dark", ja: "濃い", ko: "어두운 편" },
];

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

const BODY_TYPES: L10n[] = [
  { zh: "运动型", en: "Athletic", ja: "スポーティ", ko: "운동형" },
  { zh: "匀称", en: "Average", ja: "標準", ko: "표준형" },
  { zh: "偏瘦", en: "Slim", ja: "細身", ko: "마른 편" },
  { zh: "结实", en: "Stocky", ja: "がっしり", ko: "단단한 체형" },
  { zh: "微胖", en: "Heavyset", ja: "恰幅が良い", ko: "체격이 좋은" },
];

const RELATIONSHIPS: L10n[] = [
  { zh: "单身", en: "Single", ja: "独身", ko: "미혼" },
  { zh: "恋爱中", en: "In a Relationship", ja: "交際中", ko: "연애 중" },
  { zh: "已婚", en: "Married", ja: "既婚", ko: "기혼" },
  { zh: "已婚有子女", en: "Married with Children", ja: "既婚・子供あり", ko: "기혼·자녀 있음" },
];

const PETS: L10n[] = [
  { zh: "无宠物", en: "No Pet", ja: "ペットなし", ko: "반려동물 없음" },
  { zh: "养猫", en: "Cat", ja: "猫", ko: "고양이" },
  { zh: "养狗", en: "Dog", ja: "犬", ko: "개" },
  { zh: "养鱼", en: "Fish", ja: "魚", ko: "물고기" },
];

const DEGREES: L10n[] = [
  { zh: "学士", en: "Bachelor", ja: "学士", ko: "학사" },
  { zh: "硕士", en: "Master", ja: "修士", ko: "석사" },
  { zh: "博士", en: "Doctorate", ja: "博士", ko: "박사" },
  { zh: "副学士", en: "Associate", ja: "短期大学士", ko: "준학사" },
];

const SCHOOL_TYPES: L10n[] = [
  { zh: "综合性大学", en: "Comprehensive University", ja: "総合大学", ko: "종합대학" },
  { zh: "理工大学", en: "Technical University", ja: "工科大学", ko: "공과대학" },
  { zh: "商学院", en: "Business School", ja: "ビジネススクール", ko: "경영대학" },
  { zh: "文理学院", en: "Liberal Arts College", ja: "リベラルアーツ", ko: "리버럴 아츠" },
];

const INDUSTRIES: L10n[] = [
  { zh: "信息技术", en: "Information Technology", ja: "情報技術", ko: "정보기술" },
  { zh: "教育", en: "Education", ja: "教育", ko: "교육" },
  { zh: "金融", en: "Finance", ja: "金融", ko: "금융" },
  { zh: "医疗健康", en: "Healthcare", ja: "医療", ko: "의료" },
  { zh: "制造业", en: "Manufacturing", ja: "製造業", ko: "제조업" },
  { zh: "零售", en: "Retail", ja: "小売", ko: "소매" },
  { zh: "媒体与设计", en: "Media & Design", ja: "メディア・デザイン", ko: "미디어·디자인" },
  { zh: "物流", en: "Logistics", ja: "物流", ko: "물류" },
];

const EXPERIENCE: L10n[] = [
  { zh: "初级", en: "Entry Level", ja: "初級", ko: "신입" },
  { zh: "中级", en: "Mid Level", ja: "中級", ko: "중급" },
  { zh: "高级", en: "Senior Level", ja: "上級", ko: "고급" },
  { zh: "管理岗", en: "Management", ja: "管理職", ko: "관리직" },
];

const EMPLOYMENT: L10n[] = [
  { zh: "全职", en: "Full-time", ja: "正社員", ko: "정규직" },
  { zh: "兼职", en: "Part-time", ja: "パートタイム", ko: "파트타임" },
  { zh: "合同制", en: "Contract", ja: "契約社員", ko: "계약직" },
  { zh: "自由职业", en: "Freelance", ja: "フリーランス", ko: "프리랜서" },
];

const WORK_MODES: L10n[] = [
  { zh: "坐班", en: "On-site", ja: "出社", ko: "사무실 근무" },
  { zh: "混合", en: "Hybrid", ja: "ハイブリッド", ko: "하이브리드" },
  { zh: "远程", en: "Remote", ja: "リモート", ko: "재택근무" },
];

const COMPANY_TYPES: L10n[] = [
  { zh: "私营企业", en: "Private Company", ja: "民間企業", ko: "민간기업" },
  { zh: "上市公司", en: "Public Company", ja: "上場企業", ko: "상장기업" },
  { zh: "初创公司", en: "Startup", ja: "スタートアップ", ko: "스타트업" },
  { zh: "教育机构", en: "Education Institution", ja: "教育機関", ko: "교육기관" },
  { zh: "非营利组织", en: "Non-Profit", ja: "非営利団体", ko: "비영리단체" },
];

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "501-1000", "1000+"];

const BROWSERS = [
  "Chrome 141.0.7390.55",
  "Safari 18.6",
  "Firefox 144.0",
  "Edge 141.0.3537.57",
];

const OSES = [
  "Windows 11 (Build 26100)",
  "macOS 15.7 (MacBook Pro, Apple M3)",
  "iOS 18.6.2 (iPhone 16, Build 22G100)",
  "Android 16 (Pixel 9 Pro)",
  "Ubuntu 24.04.3 LTS",
];

const ONLINE_STATUS: L10n[] = [
  { zh: "在线", en: "Online", ja: "オンライン", ko: "온라인" },
  { zh: "有空", en: "Available", ja: "対応可能", ko: "응답 가능" },
  { zh: "忙碌", en: "Busy", ja: "取り込み中", ko: "바쁨" },
  { zh: "离开", en: "Away", ja: "離席中", ko: "자리 비움" },
];

const SECURITY_QUESTIONS: L10n[] = [
  { zh: "你最喜欢的科目是什么？", en: "What was your favorite subject in school?", ja: "学校で一番好きだった科目は？", ko: "학교에서 가장 좋아했던 과목은?" },
  { zh: "你第一辆车的型号是？", en: "What was the model of your first car?", ja: "初めての車の車種は？", ko: "첫 차의 모델은?" },
  { zh: "你母亲的名字是？", en: "What is your mother's maiden name?", ja: "母の旧姓は？", ko: "어머니의 성함은?" },
  { zh: "你童年最要好的朋友是？", en: "Who was your childhood best friend?", ja: "子供時代の親友は？", ko: "어린 시절 가장 친한 친구는?" },
];

const CREDIT_ISSUERS: Record<string, string[]> = {
  Visa: ["CHASE BANK", "BANK OF AMERICA", "WELLS FARGO", "CAPITAL ONE"],
  Mastercard: ["CITIBANK", "HSBC", "BARCLAYS", "SYNCHRONY BANK"],
  Amex: ["AMERICAN EXPRESS"],
  Discover: ["DISCOVER BANK"],
  JCB: ["JCB CO., LTD."],
  UnionPay: ["CHINA UNIONPAY"],
  Diners: ["DINERS CLUB INTERNATIONAL"],
};

const EMAIL_DOMAINS = [
  "gmail.com", "outlook.com", "yahoo.com", "icloud.com",
  "protonmail.com", "hotmail.com", "mail.com",
];

const WEBSITE_TLDS = ["com", "net", "io", "dev", "org"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const pad = (n: number, w = 2) => String(n).padStart(w, "0");

function l10n(zh: string, en: string, ja: string, ko: string): L10n {
  return { zh, en, ja, ko };
}

/** Localized boolean-ish label for the gender field. */
function genderLabel(gender: "male" | "female"): L10n {
  return gender === "male"
    ? l10n("男", "Male", "男性", "남성")
    : l10n("女", "Female", "女性", "여성");
}

/** Luhn-valid card number for the given issuer. */
function makeCardNumber(issuer: string, rng: Rng): string {
  const prefix = {
    Visa: "4",
    Mastercard: String(rng.int(51, 55)),
    Amex: rng.pick(["34", "37"]),
    Discover: rng.pick(["6011", "65"]),
    JCB: "35",
    UnionPay: "62",
    Diners: "36",
  }[issuer] ?? "4";

  const total = issuer === "Amex" ? 15 : 16;
  const body = prefix + rng.digits(total - prefix.length - 1);

  let sum = 0;
  const digits = body.split("").map(Number);
  for (let i = digits.length - 1; i >= 0; i--) {
    let v = digits[digits.length - 1 - i];
    // Double every second digit from the right.
    if (i % 2 === 0) {
      v *= 2;
      if (v > 9) v -= 9;
    }
    sum += v;
  }
  const check = (10 - (sum % 10)) % 10;
  const full = body + String(check);

  if (issuer === "Amex") return `${full.slice(0, 4)} ${full.slice(4, 10)} ${full.slice(10)}`;
  return full.replace(/(.{4})/g, "$1 ").trim();
}

/** Deterministic avatar seed that matches the generated person. */
function avatarSeed(name: string, seed: number): string {
  let h = seed;
  for (let i = 0; i < name.length; i++) h = (Math.imul(h, 31) + name.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

/* ------------------------------------------------------------------ */
/* Generator                                                           */
/* ------------------------------------------------------------------ */

export interface GenerateDeps {
  name: NamePool;
  countryData: CountryData;
}

/**
 * Builds a full identity.
 *
 * `deps` is injected so the same code runs in the browser (with bundled JSON)
 * and on a server (with data loaded however it likes).
 */
export function generateIdentity(
  spec: CountrySpec,
  deps: GenerateDeps,
  opts: GenerateOptions,
): Identity {
  const rng = new Rng(opts.seed);
  const { name, countryData } = deps;

  /*
   * Resolves a localized value for the active UI language. Every registry
   * value (hair colour, degree, industry, …) is translated into all four
   * languages; emitting `.en` unconditionally showed English values under
   * Chinese, Japanese and Korean labels.
   */
  /*
   * Two languages are in play, and conflating them was the source of the
   * mixed-language output:
   *
   *   spec.dataLang  - the language the RECORD is written in. A Korean record
   *                    reads 강원도 강릉시…, a Japanese one 岩手県…, an
   *                    American one "Beaverton, OR" — regardless of the
   *                    interface language, because the record represents a
   *                    resident of that country.
   *   opts.lang      - the INTERFACE language, used only for field labels.
   *
   * The labels are applied by the UI from the string table, so the generator
   * only needs the data language for values.
   */
  const L: DataLang = spec.dataLang;
  const lv = (v: L10n): string => v[L] ?? v.en;
  const pickL = (arr: readonly L10n[]): string => lv(rng.pick(arr));

  /* ---- country-level context ---- */
  const division =
    (opts.division && countryData.states.find((s) => s.code === opts.division)) ||
    rng.pick(countryData.states);

  /*
   * The CJK address templates are "{state}{city}{street}" with no separator, so
   * the division name is concatenated directly onto the city. Emitting
   * GeoNames' ASCII name there produced addresses like "Chongqing渝中区…",
   * which is not a cosmetic issue — the string is malformed. The localized name
   * is therefore required for those languages, not merely preferred.
   */
  const divisionName = division.nameL10n?.[L] || division.name;

  /*
   * Countries whose template concatenates state+city+street with no separator
   * cannot carry an ASCII city name: the result is the malformed string
   * "江西Jinfeng新华街1号". A city is used only when its name for this language
   * is actually written in that language's script — GeoNames sometimes supplies
   * a romanisation where a native name should be ("Nagoya-shi" as the Japanese
   * name for Nagoya), which would still be glued into a Japanese address.
   *
   * Where a division has no usable city name (Kochi's cities have no Korean
   * names at all) the city is omitted and the division name stands in, since
   * the division is always localized.
   *
   * Countries with Latin-script addresses are unaffected: they separate the
   * parts, so an untranslated name is merely untranslated.
   */
  /*
   * City selection.
   *
   * Two cases, both driven by whether the address concatenates its parts:
   *
   *   concatenated  The city is glued to the street with no separator, so a
   *                 name in the wrong script breaks the string ("愛知県Nagoya-shi
   *                 本町通り"). Only cities whose name is genuinely written in
   *                 the record's language may be used.
   *   separated     The parts are space- or comma-separated, so a foreign script
   *                 is merely untranslated. Any city is acceptable; the
   *                 localized name is used when the data has one.
   *
   * `concatenated` looks at both the spec's own street pool and the shared
   * STREET_STYLES table, because Russia and the other Latin-script countries
   * keep their pools in the latter.
   */
  const style = STREET_STYLES[spec.code];
  const concatenated = Boolean(spec.address.streets);
  const localizedCities = concatenated
    ? division.cities.filter((c) => isNativeScript(c.nL10n?.[L], L))
    : division.cities;

  // `null` means "no city available in this language"; the caller then uses the
  // division name alone.
  const city = localizedCities.length ? rng.pick(localizedCities) : null;

  /*
   * The city name prefers the record language's own form. For Russia this is
   * Cyrillic (Магадан), which the data carries but earlier code never reached
   * because the localization branch was gated on the spec's street pool rather
   * than on whether a localized name exists.
   */
  const cityName =
    city?.nL10n?.[L] ||
    city?.n ||
    // A concatenated address omits the city rather than inserting ASCII.
    (concatenated ? "" : divisionName);

  const postal = makePostal(division.postal, countryData.postalStyle, rng);

  const gender: "male" | "female" =
    opts.gender === "male" || opts.gender === "female"
      ? opts.gender
      : rng.chance(0.5) ? "male" : "female";

  /* ---- identity ---- */
  const firstName = rng.pick(name.first) || "Alex";
  const lastName = rng.pick(name.last) || "Morgan";

  /*
   * Name order and middle names follow the country's convention.
   *
   * "given family" is wrong for China, Japan, Korea, Taiwan, Hong Kong, Macau,
   * Vietnam and Thailand, where the family name comes first: the correct form
   * is 廖泽洋, not 泽洋廖.
   *
   * Most of those countries also have no middle-name slot. faker supplies no
   * `middleName` for zh_CN, ja or ko, so it fell back to its English default
   * and produced "泽洋 Charlie 廖" — an English middle name inside a Chinese
   * name. Countries without the concept simply get no middle name.
   */
  const familyFirst = FAMILY_NAME_FIRST.has(spec.code);
  const allowMiddle = USES_MIDDLE_NAME.has(spec.code) && name.middle.length > 0;
  const middleName = allowMiddle && rng.chance(0.45) ? rng.pick(name.middle) : "";

  const nameParts = familyFirst
    ? [lastName, firstName, middleName]
    : [firstName, middleName, lastName];

  // Birth date drives the age; never drawn independently.
  const year = rng.int(1955, 2006);
  const month = rng.int(1, 12);
  const maxDay = new Date(year, month, 0).getDate();
  const day = rng.int(1, maxDay);
  const birthDate = `${year}-${pad(month)}-${pad(day)}`;

  const today = new Date();
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) {
    age--;
  }

  const fullName = nameParts.filter(Boolean).join(NAME_NO_SPACE.has(spec.code) ? "" : " ");

  /*
   * Several national ID schemes encode the birth date and sex inside the number
   * itself (CN, KR, SE, NO, PL, ZA, MX, AE). Passing them in keeps the document
   * consistent with the rest of the record; without this the ID contradicted
   * the profile it belonged to.
   *
   * The Chinese scheme also needs a GB/T 2260 province prefix, which is derived
   * from the same division the address uses, so the two agree.
   */
  const cnPrefix = spec.code === "CN" ? CN_GB2260_PREFIX[division.code] : undefined;
  const idNumber = makeNationalId(spec.code, rng, {
    birthDate,
    gender,
    // Province-level GB/T 2260 code, e.g. 500000 for Chongqing, 440000 for
    // Guangdong. Using the province form rather than a guessed city/county tail
    // keeps the code one that genuinely exists.
    regionCode: cnPrefix ? `${cnPrefix}0000` : undefined,
  });

  /* ---- address ---- */
  const streetNumber = rng.int(1, 9899);

  /*
   * Street names come from the country's own pool. A shared English list meant
   * every Latin-script country carried names like "1734 Elm Ave" — a French
   * address reading "1734 Elm Ave, 21080 Valentigney" is as wrong as an English
   * street inside a Chinese address, just less obviously so.
   *
   * The per-country pool on the spec wins; otherwise the shared table is
   * consulted; otherwise the English default applies.
   */
  const streetNames = spec.address.streets ?? style?.streets ?? [
    "Main", "Oak", "Park", "Elm", "Maple", "Cedar", "Pine", "Lake", "Hill",
    "Walnut", "Sunset", "Church", "Market", "Highland", "Victoria", "Station",
  ];
  const streetSuffixes = spec.address.streetSuffixes ?? style?.suffixes ?? ["St", "Ave", "Rd", "Dr", "Ln", "Blvd", "Way"];

  const streetStem = rng.pick(streetNames);
  const roadType = rng.pick(streetSuffixes);

  /*
   * Word order and spacing are properties of the language:
   *
   *   suffixFirst  "Rue Victor Hugo" (French) vs "Main Street" (English).
   *                Emitting "Victor Hugo Rue" reads as nonsense to a speaker.
   *   attaches     "Hauptstraße" (German compounds) vs "Main St" (separate).
   *
   * CJK addresses attach and put the road type last, which the spec already
   * declares via `streets`.
   */
  const suffixFirst = spec.address.streets ? false : Boolean(style?.suffixFirst);
  const attaches = Boolean(spec.address.streets) || Boolean(style?.attaches);

  /*
   * Word order and spacing are independent properties:
   *
   *   suffixFirst  "Rue Victor Hugo" (French) vs "Main Street" (English).
   *   attaches     Whether the two are joined with no space. German and the
   *                Nordic languages compound with the type last (Hauptstraße);
   *                Thai puts the type first and also attaches (ถนนพหลโยธิน).
   *
   * Both flags were previously combined in one branch, so Thai — type first and
   * attached — came out as "ถนน พหลโยธิน" with a stray space.
   */
  const baseStreet = suffixFirst
    ? attaches
      ? `${roadType}${streetStem}`
      : `${roadType} ${streetStem}`
    : attaches
      ? `${streetStem}${roadType}`
      : `${streetStem} ${roadType}`;

  /*
   * Number placement follows the same logic. Latin addresses lead with the
   * house number ("120 Oak St"); CJK addresses put it last with a marker
   * (号 / 番地 / 번지).
   */
  const street = spec.address.streets
    ? `${baseStreet}${streetNumber}${spec.address.houseSuffix ?? ""}`
    : `${streetNumber} ${baseStreet}`;

  /*
   * Phone numbers are built from the country's real mobile prefixes rather than
   * from random digits. A random string cannot be issued: Chinese mobiles begin
   * with 1, UK mobiles with 7, Korean with 010. The previous output
   * "+86 097 9130 7567" is not a number any carrier would assign.
   */
  const mobilePrefixes = MOBILE_PREFIXES[spec.code] ?? [];
  const prefix = mobilePrefixes.length ? rng.pick(mobilePrefixes) : "";
  const remaining = Math.max(0, spec.phone.nationalDigits - prefix.length);
  const phoneNational = prefix + rng.digits(remaining);

  const grouped: string[] = [];
  let cursor = 0;
  for (const g of spec.phone.groups) {
    if (cursor >= phoneNational.length) break;
    grouped.push(phoneNational.slice(cursor, cursor + g));
    cursor += g;
  }
  if (cursor < phoneNational.length) grouped.push(phoneNational.slice(cursor));
  const phone = `+${spec.phone.code} ${grouped.join(" ")}`.trim();

  // Address lines follow the country's own ordering. The country name is
  // localized too: a Chinese address ending in "China" is inconsistent.
  const countryName = spec.name[L] || spec.name.en;
  /*
   * `{stateCode}` resolves to the locally correct abbreviation. Brazilian
   * addresses are written "City - UF" using the two-letter state abbreviation,
   * not the numeric division code the dataset carries — "Cascavel - 18" is not
   * a form that exists.
   */
  /*
   * The abbreviation that belongs in a local address. Each country uses a
   * different scheme: Brazil and Canada the postal abbreviation, Australia the
   * state code; the rest keep the division code the dataset carries.
   */
  const stateAbbr =
    spec.code === "BR"
      ? BR_UF[division.code] ?? division.code
      : spec.code === "CA"
        ? CA_PROVINCE[division.code] ?? division.code
        : spec.code === "AU"
          ? AU_STATE[division.name] ?? division.code
          : division.code;
  const addressLines = spec.address.template.map((line) =>
    line
      .replace("{street}", street)
      .replace("{city}", cityName)
      .replace("{stateCode}", stateAbbr)
      .replace("{state}", divisionName)
      .replace("{postal}", postal.value)
      .replace("{country}", countryName),
  );
  /*
   * The complete address is presented on one line. The multi-line form mirrored
   * how it would be written on an envelope, but on screen it wastes vertical
   * space and reads as several separate values rather than one address. The
   * parts are joined with the country's own separator so it still reads
   * naturally: "강원도 강릉시 충장로 12번지, 16216, 대한민국".
   */
  const fullAddress = addressLines
    .filter((l) => l.replace(/[\s,]/g, "").length > 0)
    .join(", ");

  /* ---- contact ---- */
  /*
   * The local-part must be valid ASCII. Stripping everything outside [a-z] from
   * a Chinese, Japanese or Korean name leaves an empty string, which produced
   * addresses like ".42@yahoo.com" — syntactically invalid, not merely odd.
   *
   * CJK name pools hold no romanized form to fall back on, so when neither name
   * yields ASCII the local-part is built from a stable word list seeded by the
   * record. That keeps the address plausible and reproducible instead of empty.
   */
  const ascii = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  const firstAscii = ascii(firstName);
  const lastAscii = ascii(lastName);

  let localPart = [firstAscii, lastAscii].filter(Boolean).join(".");
  if (!localPart) {
    // Deterministic from the seed, so the same record always gets the same mail.
    const words = [
      "aurora", "bluebird", "cedar", "delta", "ember", "flint", "harbor",
      "ivory", "juniper", "kestrel", "lumen", "meadow", "nimbus", "onyx",
      "pebble", "quartz", "river", "sable", "timber", "umber", "willow",
    ];
    localPart = `${rng.pick(words)}.${rng.pick(words)}`;
  }
  localPart = `${localPart}${rng.int(1, 99)}`;

  const email = `${localPart}@${rng.pick(EMAIL_DOMAINS)}`;

  /* ---- personal ---- */
  const heightRange = spec.heightCm[gender];
  const heightCm = rng.int(heightRange[0], heightRange[1]);
  const totalInches = Math.round(heightCm / 2.54);
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  // Weight is drawn from a plausible band for the chosen height, so the pair
  // never looks absurd.
  const bmi = rng.float(19.5, 27.5, 1);
  const weightKg = Math.round(bmi * (heightCm / 100) ** 2);
  const weightLb = Math.round(weightKg * 2.20462);

  const bloodType = spec.usesBloodType ? rng.pick(BLOOD_TYPES) : "";
  const ethnicity = spec.usesEthnicity && spec.ethnicities.length ? rng.pick(spec.ethnicities) : null;

  /* ---- credit ---- */
  /*
   * The card network and its issuing bank must both suit the country. Drawing
   * them globally produced a German record with "BANK OF AMERICA" and a Chinese
   * one with a JCB card the holder could not obtain locally.
   */
  const networksForCountry = CARD_NETWORKS[spec.code] ?? ["Visa", "Mastercard"];
  // Prefer a network we have banks for, so the issuer never falls back to a
  // foreign list.
  const availableNetworks = networksForCountry.filter((n) => CARD_BANKS[spec.code]?.[n]?.length);
  const issuer = rng.pick(availableNetworks.length ? availableNetworks : networksForCountry);
  const countryBankList: string[] | undefined = CARD_BANKS[spec.code]?.[issuer];
  const cardNumber = makeCardNumber(issuer, rng);
  const expYear = rng.int(today.getFullYear() + 1, today.getFullYear() + 5);
  const expMonth = rng.int(1, 12);
  const cvv = issuer === "Amex" ? rng.digits(4) : rng.digits(3);

  /* ---- education ---- */
  const school = spec.schools.length ? rng.pick(spec.schools) : "State University";
  const major = spec.majors.length ? rng.pick(spec.majors) : null;
  const degree = rng.pick(DEGREES);
  const schoolType = rng.pick(SCHOOL_TYPES);

  /* ---- employment ---- */
  const jobTitle = name.job.length ? rng.pick(name.job) : "Specialist";
  /*
   * Company names follow the country's own conventions. Building every name
   * from English components ("Nimbus Digital Ltd") is implausible on a Chinese
   * or Korean record, so countries with their own corporate naming get it.
   */
  const cw = COMPANY_WORDS[spec.code];
  /*
   * Legal suffixes are jurisdiction-specific: a GmbH exists in Germany and
   * Austria, not in Australia or Canada. Where a country has no entry of its
   * own the suffix is chosen from its own list rather than the German-heavy
   * shared default, which produced "Nimbus Group GmbH" for an Australian
   * record.
   */
  const LEGAL_SUFFIX: Record<string, string[]> = {
    US: ["Inc.", "LLC", "Corp.", "Co."],
    CA: ["Inc.", "Ltd.", "Corp."],
    GB: ["Ltd", "PLC", "LLP"],
    AU: ["Pty Ltd", "Ltd"],
    NZ: ["Ltd", "Limited"],
    IE: ["Ltd", "Teoranta"],
    IN: ["Pvt. Ltd.", "Limited"],
    ZA: ["(Pty) Ltd", "Ltd"],
    SG: ["Pte. Ltd.", "Ltd."],
    MY: ["Sdn. Bhd.", "Bhd."],
    PH: ["Inc.", "Corp."],
  };
  const suffix = LEGAL_SUFFIX[spec.code] ?? ["Ltd"];
  const company = cw
    ? /[\u3000-\u9FFF\uAC00-\uD7AF]/.test(cw.suffixes[0])
      ? `${rng.pick(cw.stems)}${rng.pick(cw.suffixes)}`
      : `${rng.pick(cw.stems)} ${rng.pick(cw.suffixes)}`
    : `${rng.pick(["Northwind", "Acme", "Vertex", "Lumen", "Nimbus", "Orbit", "Keystone", "Meridian"])} ${rng.pick(["Systems", "Labs", "Group", "Partners", "Digital", "Solutions"])}, ${rng.pick(suffix)}`;
  const industry = rng.pick(INDUSTRIES);
  const experience = rng.pick(EXPERIENCE);
  const employment = rng.pick(EMPLOYMENT);
  const workMode = rng.pick(WORK_MODES);
  const companyType = rng.pick(COMPANY_TYPES);
  const companySize = rng.pick(COMPANY_SIZES);
  const income = rng.pick(spec.incomeBands);
  const skills = rng.sample(spec.skills, rng.int(3, 5));

  /* ---- lifestyle ---- */
  const traits = rng.sample(spec.traits, rng.int(2, 3));
  const relationship = rng.pick(RELATIONSHIPS);
  const pet = rng.pick(PETS);
  const foods = rng.sample(spec.foods, Math.min(2, spec.foods.length));
  const travel = rng.sample(spec.travels, Math.min(2, spec.travels.length));
  const interests = rng.sample(spec.interests, rng.int(3, 5));

  /* ---- online ---- */
  /*
   * Usernames must be ASCII, and stripping a CJK name leaves nothing — which
   * produced usernames that were just a two-digit number ("75"). Where the name
   * yields no ASCII, a word pair seeded from the record is used instead, the
   * same approach as the email local-part.
   */
  const usernameAscii = (firstName + lastName).toLowerCase().replace(/[^a-z0-9]/g, "");
  const handleWords = [
    "aurora", "bluebird", "cedar", "delta", "ember", "flint", "harbor", "ivory",
    "juniper", "kestrel", "lumen", "meadow", "nimbus", "onyx", "pebble",
    "quartz", "river", "sable", "timber", "umber", "willow", "aspen", "birch",
  ];
  const username = (
    usernameAscii || `${rng.pick(handleWords)}${rng.pick(handleWords)}`
  )
    .slice(0, 14) + String(rng.int(10, 99));

  const nickname = `${firstName}${rng.chance(0.5) ? "" : " "}${rng.pick(["Builds", "Codes", "Writes", "Explores", "Designs"])}`;
  const website = `${username}.${rng.pick(WEBSITE_TLDS)}`;
  const browser = rng.pick(BROWSERS);
  const os = rng.pick(OSES);
  const timeZone = city?.tz || rng.pick(["UTC", "Europe/London", "America/New_York", "Asia/Tokyo"]);
  const ip = `${rng.int(1, 223)}.${rng.int(0, 255)}.${rng.int(0, 255)}.${rng.int(1, 254)}`;
  const status = rng.pick(ONLINE_STATUS);
  const userAgent = `Mozilla/5.0 (${os.split("(")[0].trim()}) AppleWebKit/537.36 (KHTML, like Gecko) ${browser.split(" ")[0]}/${browser.split(" ")[1] || "1.0"} Safari/537.36`;
  const securityQuestion = rng.pick(SECURITY_QUESTIONS);
  const securityAnswer = rng.pick(["desk", "sunrise", "blue", "riverside", "monarch", "willow"]);
  const signature = `${rng.pick(["Small updates from", "Notes by", "Occasional posts by"])} @${username}.`;

  /* ---- social ---- */
  const socialBio = rng.pick([
    `${jobTitle} · ${lv(industry)}`,
    `${major ? lv(major) : "Curious"} graduate · ${cityName}`,
    `Building things in ${divisionName}`,
  ]);

  /* ---- assemble ---- */
  const fields: IdentityField[] = [
    // identity
    { key: "firstName", group: "identity", label: l10n("名", "First Name", "名", "이름"), value: firstName },
    // Emitted only when the country uses a middle name; a dash placeholder
    // reads as a value that failed to generate.
    ...(middleName
      ? [{ key: "middleName", group: "identity" as GroupKey, label: l10n("中间名", "Middle Name", "ミドルネーム", "중간 이름"), value: middleName }]
      : []),
    { key: "lastName", group: "identity", label: l10n("姓", "Last Name", "姓", "성"), value: lastName },
    { key: "fullName", group: "identity", label: l10n("全名", "Full Name", "氏名", "전체 이름"), value: fullName },
    { key: "gender", group: "identity", label: l10n("性别", "Gender", "性別", "성별"), value: lv(genderLabel(gender)) },
    { key: "birthDate", group: "identity", label: l10n("出生日期", "Birth Date", "生年月日", "생년월일"), value: birthDate },
    { key: "age", group: "identity", label: l10n("年龄", "Age", "年齢", "나이"), value: String(age) },
    { key: "nationality", group: "identity", label: l10n("国籍", "Nationality", "国籍", "국적"), value: lv(spec.nationality) },
    { key: "language", group: "identity", label: l10n("语言", "Language", "言語", "언어"), value: lv(spec.language) },
    { key: "idNumber", group: "identity", label: spec.id.name, value: idNumber, sensitive: true, real: spec.id.hasRealChecksum },

    // address
    { key: "street", group: "address", label: l10n("街道地址", "Street Address", "住所", "도로명 주소"), value: street },
    { key: "city", group: "address", label: l10n("城市", "City", "市区町村", "도시"), value: cityName },
    { key: "state", group: "address", label: spec.address.adminLabel, value: divisionName },
    { key: "stateCode", group: "address", label: l10n("行政区代码", "Division Code", "行政コード", "행정구역 코드"), value: division.code },
    ...(spec.postalDisabled
      ? []
      : [{ key: "postal", group: "address" as GroupKey, label: l10n("邮政编码", "Postal Code", "郵便番号", "우편번호"), value: postal.value, real: postal.real }]),
    { key: "country", group: "address", label: l10n("国家", "Country", "国", "국가"), value: lv(spec.name) },
    { key: "phone", group: "address", label: l10n("电话", "Phone", "電話", "전화"), value: phone },
    { key: "email", group: "address", label: l10n("电子邮箱", "Email", "メール", "이메일"), value: email },
    { key: "fullAddress", group: "address", label: l10n("完整地址", "Full Address", "完全な住所", "전체 주소"), value: fullAddress },

    // credit
    { key: "cardIssuer", group: "credit", label: l10n("卡组织", "Card Network", "カードブランド", "카드 브랜드"), value: issuer },
    { key: "cardNumber", group: "credit", label: l10n("卡号", "Card Number", "カード番号", "카드 번호"), value: cardNumber, sensitive: true, real: true },
    { key: "cardExpiry", group: "credit", label: l10n("有效期", "Expiry", "有効期限", "유효기간"), value: `${pad(expMonth)}/${String(expYear).slice(2)}` },
    { key: "cardCvv", group: "credit", label: l10n("安全码", "CVV", "セキュリティコード", "CVV"), value: cvv, sensitive: true },
    { key: "cardHolder", group: "credit", label: l10n("持卡人", "Cardholder", "カード名義", "카드 소유자"), value: fullName },
    { key: "cardBank", group: "credit", label: l10n("发卡行", "Issuing Bank", "発行銀行", "발급 은행"), value: rng.pick(countryBankList ?? CREDIT_ISSUERS[issuer] ?? ["BANK"]) },
    { key: "currency", group: "credit", label: l10n("货币", "Currency", "通貨", "통화"), value: spec.currency },

    // education
    { key: "school", group: "education", label: l10n("毕业院校", "School", "学校", "학교"), value: school },
    { key: "major", group: "education", label: l10n("专业", "Major", "専攻", "전공"), value: major ? lv(major) : "—" },
    { key: "degree", group: "education", label: l10n("学历", "Degree", "学位", "학위"), value: lv(degree) },
    { key: "schoolType", group: "education", label: l10n("院校类型", "School Type", "学校種別", "학교 유형"), value: lv(schoolType) },

    // employment
    { key: "jobTitle", group: "employment", label: l10n("职位", "Job Title", "職種", "직책"), value: jobTitle },
    { key: "company", group: "employment", label: l10n("公司", "Company", "会社", "회사"), value: company },
    { key: "industry", group: "employment", label: l10n("行业", "Industry", "業界", "산업"), value: lv(industry) },
    { key: "experience", group: "employment", label: l10n("经验", "Experience", "経験", "경력"), value: lv(experience) },
    { key: "employmentType", group: "employment", label: l10n("雇佣类型", "Employment Type", "雇用形態", "고용 형태"), value: lv(employment) },
    { key: "workMode", group: "employment", label: l10n("工作方式", "Work Mode", "勤務形態", "근무 방식"), value: lv(workMode) },
    { key: "income", group: "employment", label: l10n("收入等级", "Income Band", "収入帯", "소득 구간"), value: income },
    { key: "companyType", group: "employment", label: l10n("公司类型", "Company Type", "会社種別", "회사 유형"), value: lv(companyType) },
    { key: "companySize", group: "employment", label: l10n("公司规模", "Company Size", "従業員数", "회사 규모"), value: companySize },
    { key: "skills", group: "employment", label: l10n("技能", "Skills", "スキル", "기술"), value: skills.map((s) => s[L]).join(", ") },

    // lifestyle
    { key: "traits", group: "lifestyle", label: l10n("人格特征", "Personality Traits", "性格特性", "성격 특성"), value: traits.map((t) => t[L]).join(", ") },
    { key: "relationship", group: "lifestyle", label: l10n("关系状态", "Relationship", "婚姻状況", "관계 상태"), value: lv(relationship) },
    { key: "pet", group: "lifestyle", label: l10n("宠物", "Pet", "ペット", "반려동물"), value: lv(pet) },
    { key: "foods", group: "lifestyle", label: l10n("偏好食物", "Favorite Foods", "好きな食べ物", "선호 음식"), value: foods.map((f) => f[L]).join(", ") },
    { key: "travel", group: "lifestyle", label: l10n("旅行风格", "Travel Style", "旅行スタイル", "여행 스타일"), value: travel.map((t) => t[L]).join(", ") },
    { key: "interests", group: "lifestyle", label: l10n("兴趣", "Interests", "興味", "관심사"), value: interests.map((i) => i[L]).join(", ") },

    // personal
    { key: "height", group: "personal", label: l10n("身高", "Height", "身長", "키"), value: `${heightCm} cm`, alt: `${feet}'${inches}"` },
    { key: "weight", group: "personal", label: l10n("体重", "Weight", "体重", "몸무게"), value: `${weightKg} kg`, alt: `${weightLb} lb` },
    { key: "hairColor", group: "personal", label: l10n("发色", "Hair Color", "髪の色", "머리색"), value: pickL(HAIR_COLORS) },
    { key: "eyeColor", group: "personal", label: l10n("瞳色", "Eye Color", "目の色", "눈동자 색"), value: pickL(EYE_COLORS) },
    { key: "skinTone", group: "personal", label: l10n("肤色", "Skin Tone", "肌の色", "피부톤"), value: pickL(SKIN_TONES) },
    { key: "bodyType", group: "personal", label: l10n("体型", "Body Type", "体型", "체형"), value: pickL(BODY_TYPES) },
    ...(bloodType
      ? [{ key: "bloodType", group: "personal" as GroupKey, label: l10n("血型", "Blood Type", "血液型", "혈액형"), value: bloodType }]
      : []),
    ...(ethnicity
      ? [{ key: "ethnicity", group: "personal" as GroupKey, label: l10n("族裔", "Ethnicity", "民族", "민족"), value: lv(ethnicity) }]
      : []),

    // online
    { key: "username", group: "online", label: l10n("用户名", "Username", "ユーザー名", "사용자 이름"), value: username },
    { key: "nickname", group: "online", label: l10n("昵称", "Nickname", "ニックネーム", "닉네임"), value: nickname },
    { key: "website", group: "online", label: l10n("网站", "Website", "ウェブサイト", "웹사이트"), value: website },
    { key: "browser", group: "online", label: l10n("浏览器", "Browser", "ブラウザ", "브라우저"), value: browser },
    { key: "os", group: "online", label: l10n("操作系统", "Operating System", "OS", "운영체제"), value: os },
    { key: "timeZone", group: "online", label: l10n("时区", "Time Zone", "タイムゾーン", "시간대"), value: timeZone },
    { key: "ip", group: "online", label: l10n("IP 地址", "IP Address", "IPアドレス", "IP 주소"), value: ip },
    { key: "userAgent", group: "online", label: l10n("User Agent", "User Agent", "User Agent", "User Agent"), value: userAgent },
    { key: "onlineStatus", group: "online", label: l10n("在线状态", "Online Status", "オンライン状態", "접속 상태"), value: lv(status) },
    { key: "securityQuestion", group: "online", label: l10n("安全问题", "Security Question", "秘密の質問", "보안 질문"), value: lv(securityQuestion) },
    { key: "securityAnswer", group: "online", label: l10n("安全答案", "Security Answer", "秘密の答え", "보안 답변"), value: securityAnswer },
    { key: "signature", group: "online", label: l10n("在线签名", "Bio Signature", "プロフィール文", "소개글"), value: signature },

    // social
    { key: "socialBio", group: "social", label: l10n("社交媒体简介", "Social Media Bio", "SNSプロフィール", "SNS 소개"), value: socialBio },
  ];

  const groups = GROUP_ORDER.map((key) => ({
    key,
    fields: fields.filter((f) => f.group === key),
  })).filter((g) => g.fields.length > 0);

  const map: Record<string, string> = {};
  for (const f of fields) map[f.key] = f.value;

  return {
    country: spec.code,
    countryName: spec.name,
    seed: opts.seed,
    fields,
    groups,
    map,
    summary: {
      fullName,
      avatarSeed: avatarSeed(fullName, opts.seed),
      country: spec.name,
      birthDate,
      age,
      gender: lv(genderLabel(gender)),
    },
  };
}

/** Convenience wrapper used by the UI and tests. */
export function generate(
  countryCode: string,
  deps: (code: string) => GenerateDeps | null,
  opts: Omit<GenerateOptions, "country"> & { country?: string },
): Identity | null {
  const code = (opts.country ?? countryCode).toUpperCase();
  const spec = COUNTRY_BY_CODE[code];
  if (!spec) return null;
  const d = deps(code);
  if (!d) return null;
  return generateIdentity(spec, d, { ...opts, country: code });
}

export { COUNTRY_CODES, COUNTRY_BY_CODE };
