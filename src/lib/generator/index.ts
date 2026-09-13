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
import type { CountrySpec, LocalizedText, Lang } from "../registry.js";
import {
  COUNTRY_BY_CODE,
  COUNTRY_CODES,
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
}

/* ------------------------------------------------------------------ */
/* Static pools                                                        */
/* ------------------------------------------------------------------ */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

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

  /* ---- country-level context ---- */
  const division =
    (opts.division && countryData.states.find((s) => s.code === opts.division)) ||
    rng.pick(countryData.states);

  const city = division.cities.length ? rng.pick(division.cities) : null;
  const cityName = city?.n ?? division.name;

  const postal = makePostal(division.postal, countryData.postalStyle, rng);

  const gender: "male" | "female" =
    opts.gender === "male" || opts.gender === "female"
      ? opts.gender
      : rng.chance(0.5) ? "male" : "female";

  /* ---- identity ---- */
  const firstName = rng.pick(name.first) || "Alex";
  const lastName = rng.pick(name.last) || "Morgan";
  const middleName = name.middle.length && rng.chance(0.45) ? rng.pick(name.middle) : "";

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

  const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");

  const idNumber = makeNationalId(spec.code, rng);

  /* ---- address ---- */
  const streetNumber = rng.int(1, 9899);
  const streetNames = [
    "Main", "Oak", "Park", "Elm", "Maple", "Cedar", "Pine", "Lake", "Hill",
    "Walnut", "Sunset", "Church", "Market", "Highland", "Victoria", "Station",
    "Kings", "Queens", "Mill", "School",
  ];
  const streetSuffix = ["St", "Ave", "Rd", "Dr", "Ln", "Blvd", "Way", "Ct"];
  const street = `${streetNumber} ${rng.pick(streetNames)} ${rng.pick(streetSuffix)}`;

  const phoneNational = rng.digits(spec.phone.nationalDigits);
  const grouped: string[] = [];
  let cursor = 0;
  for (const g of spec.phone.groups) {
    grouped.push(phoneNational.slice(cursor, cursor + g));
    cursor += g;
  }
  if (cursor < phoneNational.length) grouped.push(phoneNational.slice(cursor));
  const phone = `+${spec.phone.code} ${grouped.join(" ")}`.trim();

  // Address lines follow the country's own ordering.
  const addressLines = spec.address.template.map((line) =>
    line
      .replace("{street}", street)
      .replace("{city}", cityName)
      .replace("{stateCode}", division.code)
      .replace("{state}", division.name)
      .replace("{postal}", postal.value)
      .replace("{country}", spec.name.en),
  );
  const fullAddress = addressLines
    .filter((l) => l.replace(/[\s,]/g, "").length > 0)
    .join("\n");

  /* ---- contact ---- */
  const localPart =
    firstName.toLowerCase().replace(/[^a-z]/g, "") +
    "." +
    lastName.toLowerCase().replace(/[^a-z]/g, "") +
    rng.int(1, 99);
  const email = `${localPart || "user"}@${rng.pick(EMAIL_DOMAINS)}`;

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
  const issuer = rng.pick(["Visa", "Mastercard", "Amex", "Discover", "JCB", "UnionPay", "Diners"]);
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
  const company = `${rng.pick(["Northwind", "Acme", "Vertex", "Lumen", "Nimbus", "Orbit", "Keystone", "Meridian"])} ${rng.pick(["Systems", "Labs", "Group", "Partners", "Digital", "Solutions"])} ${rng.pick(["Inc", "Ltd", "LLC", "GmbH", "S.A."])}`;
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
  const username = (firstName + lastName + rng.int(10, 99))
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);
  const nickname = `${firstName} ${rng.pick(["Builds", "Codes", "Writes", "Explores", "Designs"])}`;
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
    `${jobTitle} · ${industry.en}`,
    `${major?.en ?? "Curious"} graduate · ${cityName}`,
    `Building things in ${division.name}`,
  ]);

  /* ---- assemble ---- */
  const fields: IdentityField[] = [
    // identity
    { key: "firstName", group: "identity", label: l10n("名", "First Name", "名", "이름"), value: firstName },
    { key: "middleName", group: "identity", label: l10n("中间名", "Middle Name", "ミドルネーム", "중간 이름"), value: middleName || "—" },
    { key: "lastName", group: "identity", label: l10n("姓", "Last Name", "姓", "성"), value: lastName },
    { key: "fullName", group: "identity", label: l10n("全名", "Full Name", "氏名", "전체 이름"), value: fullName },
    { key: "gender", group: "identity", label: l10n("性别", "Gender", "性別", "성별"), value: genderLabel(gender).en },
    { key: "birthDate", group: "identity", label: l10n("出生日期", "Birth Date", "生年月日", "생년월일"), value: birthDate },
    { key: "age", group: "identity", label: l10n("年龄", "Age", "年齢", "나이"), value: String(age) },
    { key: "nationality", group: "identity", label: l10n("国籍", "Nationality", "国籍", "국적"), value: spec.nationality.en },
    { key: "language", group: "identity", label: l10n("语言", "Language", "言語", "언어"), value: spec.language.en },
    { key: "idNumber", group: "identity", label: spec.id.name, value: idNumber, sensitive: true, real: spec.id.hasRealChecksum },

    // address
    { key: "street", group: "address", label: l10n("街道地址", "Street Address", "住所", "도로명 주소"), value: street },
    { key: "city", group: "address", label: l10n("城市", "City", "市区町村", "도시"), value: cityName },
    { key: "state", group: "address", label: spec.address.adminLabel, value: division.name },
    { key: "stateCode", group: "address", label: l10n("行政区代码", "Division Code", "行政コード", "행정구역 코드"), value: division.code },
    ...(spec.postalDisabled
      ? []
      : [{ key: "postal", group: "address" as GroupKey, label: l10n("邮政编码", "Postal Code", "郵便番号", "우편번호"), value: postal.value, real: postal.real }]),
    { key: "country", group: "address", label: l10n("国家", "Country", "国", "국가"), value: spec.name.en },
    { key: "phone", group: "address", label: l10n("电话", "Phone", "電話", "전화"), value: phone },
    { key: "email", group: "address", label: l10n("电子邮箱", "Email", "メール", "이메일"), value: email },
    { key: "fullAddress", group: "address", label: l10n("完整地址", "Full Address", "完全な住所", "전체 주소"), value: fullAddress },

    // credit
    { key: "cardIssuer", group: "credit", label: l10n("卡组织", "Card Network", "カードブランド", "카드 브랜드"), value: issuer },
    { key: "cardNumber", group: "credit", label: l10n("卡号", "Card Number", "カード番号", "카드 번호"), value: cardNumber, sensitive: true, real: true },
    { key: "cardExpiry", group: "credit", label: l10n("有效期", "Expiry", "有効期限", "유효기간"), value: `${pad(expMonth)}/${String(expYear).slice(2)}` },
    { key: "cardCvv", group: "credit", label: l10n("安全码", "CVV", "セキュリティコード", "CVV"), value: cvv, sensitive: true },
    { key: "cardHolder", group: "credit", label: l10n("持卡人", "Cardholder", "カード名義", "카드 소유자"), value: fullName },
    { key: "cardBank", group: "credit", label: l10n("发卡行", "Issuing Bank", "発行銀行", "발급 은행"), value: rng.pick(CREDIT_ISSUERS[issuer] ?? ["BANK"]) },
    { key: "currency", group: "credit", label: l10n("货币", "Currency", "通貨", "통화"), value: spec.currency },

    // education
    { key: "school", group: "education", label: l10n("毕业院校", "School", "学校", "학교"), value: school },
    { key: "major", group: "education", label: l10n("专业", "Major", "専攻", "전공"), value: major ? major.en : "—" },
    { key: "degree", group: "education", label: l10n("学历", "Degree", "学位", "학위"), value: degree.en },
    { key: "schoolType", group: "education", label: l10n("院校类型", "School Type", "学校種別", "학교 유형"), value: schoolType.en },

    // employment
    { key: "jobTitle", group: "employment", label: l10n("职位", "Job Title", "職種", "직책"), value: jobTitle },
    { key: "company", group: "employment", label: l10n("公司", "Company", "会社", "회사"), value: company },
    { key: "industry", group: "employment", label: l10n("行业", "Industry", "業界", "산업"), value: industry.en },
    { key: "experience", group: "employment", label: l10n("经验", "Experience", "経験", "경력"), value: experience.en },
    { key: "employmentType", group: "employment", label: l10n("雇佣类型", "Employment Type", "雇用形態", "고용 형태"), value: employment.en },
    { key: "workMode", group: "employment", label: l10n("工作方式", "Work Mode", "勤務形態", "근무 방식"), value: workMode.en },
    { key: "income", group: "employment", label: l10n("收入等级", "Income Band", "収入帯", "소득 구간"), value: income },
    { key: "companyType", group: "employment", label: l10n("公司类型", "Company Type", "会社種別", "회사 유형"), value: companyType.en },
    { key: "companySize", group: "employment", label: l10n("公司规模", "Company Size", "従業員数", "회사 규모"), value: companySize },
    { key: "skills", group: "employment", label: l10n("技能", "Skills", "スキル", "기술"), value: skills.map((s) => s.en).join(", ") },

    // lifestyle
    { key: "traits", group: "lifestyle", label: l10n("人格特征", "Personality Traits", "性格特性", "성격 특성"), value: traits.map((t) => t.en).join(", ") },
    { key: "relationship", group: "lifestyle", label: l10n("关系状态", "Relationship", "婚姻状況", "관계 상태"), value: relationship.en },
    { key: "pet", group: "lifestyle", label: l10n("宠物", "Pet", "ペット", "반려동물"), value: pet.en },
    { key: "foods", group: "lifestyle", label: l10n("偏好食物", "Favorite Foods", "好きな食べ物", "선호 음식"), value: foods.map((f) => f.en).join(", ") },
    { key: "travel", group: "lifestyle", label: l10n("旅行风格", "Travel Style", "旅行スタイル", "여행 스타일"), value: travel.map((t) => t.en).join(", ") },
    { key: "interests", group: "lifestyle", label: l10n("兴趣", "Interests", "興味", "관심사"), value: interests.map((i) => i.en).join(", ") },

    // personal
    { key: "height", group: "personal", label: l10n("身高", "Height", "身長", "키"), value: `${heightCm} cm`, alt: `${feet}'${inches}"` },
    { key: "weight", group: "personal", label: l10n("体重", "Weight", "体重", "몸무게"), value: `${weightKg} kg`, alt: `${weightLb} lb` },
    { key: "hairColor", group: "personal", label: l10n("发色", "Hair Color", "髪の色", "머리색"), value: rng.pick(HAIR_COLORS).en },
    { key: "eyeColor", group: "personal", label: l10n("瞳色", "Eye Color", "目の色", "눈동자 색"), value: rng.pick(EYE_COLORS).en },
    { key: "skinTone", group: "personal", label: l10n("肤色", "Skin Tone", "肌の色", "피부톤"), value: rng.pick(SKIN_TONES).en },
    { key: "bodyType", group: "personal", label: l10n("体型", "Body Type", "体型", "체형"), value: rng.pick(BODY_TYPES).en },
    ...(bloodType
      ? [{ key: "bloodType", group: "personal" as GroupKey, label: l10n("血型", "Blood Type", "血液型", "혈액형"), value: bloodType }]
      : []),
    ...(ethnicity
      ? [{ key: "ethnicity", group: "personal" as GroupKey, label: l10n("族裔", "Ethnicity", "民族", "민족"), value: ethnicity.en }]
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
    { key: "onlineStatus", group: "online", label: l10n("在线状态", "Online Status", "オンライン状態", "접속 상태"), value: status.en },
    { key: "securityQuestion", group: "online", label: l10n("安全问题", "Security Question", "秘密の質問", "보안 질문"), value: securityQuestion.en },
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
      gender: genderLabel(gender).en,
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
