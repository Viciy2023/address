/**
 * Country landing-page copy, in four languages.
 *
 * Kept separate from `strings.ts` (interface labels) and `content.ts` (prose
 * pages) because these are long-form, template-bearing strings: each carries a
 * `{name}` / `{id}` placeholder that the view substitutes with country-specific
 * values. Mixing placeholders into the flat UI string table would make both
 * harder to keep consistent.
 *
 * Every string is written so the page reads as a real reference for the
 * country's address conventions, not as a doorway page. The generated sample
 * and the fact table below it are the substance; the copy only frames them.
 */

import type { SiteLang } from "./config.js";

export interface CountryCopy {
  /** H1. `{name}` is replaced with the localized country name. */
  h1: string;
  /** Intro paragraph. `{name}` and `{id}` are replaced. */
  intro: string;

  factsHeading: string;
  sampleHeading: string;
  sampleNote: string;
  generatorHeading: string;
  otherHeading: string;

  /* fact-table labels */
  lNationality: string;
  lLanguage: string;
  lCurrency: string;
  lPhone: string;
  lPostal: string;
  lPostalNone: string;
  /** Suffix shown when the postal pattern is not backed by real data. */
  lPostalSynthetic: string;
  lId: string;
  lIdFormat: string;
  /** Row label for the checksum fact. */
  lIdValid: string;
  /** Value when the generator emits an algorithmically valid number. */
  lIdChecksumYes: string;
  /** Value when only the format is guaranteed. */
  lIdFormatOnly: string;
  lAdmin: string;
  lDivisions: string;
  lCities: string;

  /* sample-record labels */
  fFullName: string;
  fGender: string;
  fBirthDate: string;
  fAddress: string;
  fPostal: string;
  fPhone: string;
  fNationalId: string;
  fEmail: string;
  fUsername: string;

  backToCountries: string;
}

export const COUNTRY_PAGE: Record<SiteLang, CountryCopy> = {
  zh: {
    h1: "{name}地址与身份生成器",
    intro:
      "在浏览器本地生成 {name} 的地址与身份信息：真实格式的邮编、电话号码与 {id}，行政区和城市始终来自同一条数据记录，不会互相矛盾。全部内容由算法合成，不对应任何真实个人、住址或账户。",
    factsHeading: "{name}基本信息",
    sampleHeading: "示例地址",
    sampleNote: "以下为程序合成的示例数据，仅用于演示字段格式，并非真实信息。",
    generatorHeading: "立即生成 {name} 数据",
    otherHeading: "其他国家",
    lNationality: "国籍",
    lLanguage: "官方语言",
    lCurrency: "货币",
    lPhone: "国际区号",
    lPostal: "邮政编码",
    lPostalNone: "该国无邮政编码体系",
    lPostalSynthetic: "无权威数据，按格式生成",
    lId: "证件号码",
    lIdFormat: "号码格式",
    lIdValid: "校验位",
    lIdChecksumYes: "含官方校验位",
    lIdFormatOnly: "仅保证格式",
    lAdmin: "一级行政区",
    lDivisions: "行政区数量",
    lCities: "收录城市",
    fFullName: "姓名",
    fGender: "性别",
    fBirthDate: "出生日期",
    fAddress: "完整地址",
    fPostal: "邮编",
    fPhone: "电话",
    fNationalId: "证件号码",
    fEmail: "电子邮箱",
    fUsername: "用户名",
    backToCountries: "查看全部支持的国家和地区",
  },
  en: {
    h1: "{name} Address & Identity Generator",
    intro:
      "Generate {name} addresses and identities in your browser: correctly formatted postal codes, phone numbers and {id}, with the administrative division and city always taken from the same data record so they can never disagree. Every value is synthesised by algorithm and corresponds to no real person, address or account.",
    factsHeading: "{name} at a glance",
    sampleHeading: "Example address",
    sampleNote: "The record below is synthesised to show field formats. It is not real information.",
    generatorHeading: "Generate {name} data now",
    otherHeading: "Other countries",
    lNationality: "Nationality",
    lLanguage: "Official language",
    lCurrency: "Currency",
    lPhone: "Calling code",
    lPostal: "Postal code",
    lPostalNone: "No postal code system",
    lPostalSynthetic: "Generated to format (no authoritative source)",
    lId: "National ID",
    lIdFormat: "Format",
    lIdValid: "Check digit",
    lIdChecksumYes: "Official check digit",
    lIdFormatOnly: "Format only",
    lAdmin: "Top-level division",
    lDivisions: "Divisions",
    lCities: "Cities covered",
    fFullName: "Full name",
    fGender: "Gender",
    fBirthDate: "Date of birth",
    fAddress: "Full address",
    fPostal: "Postal code",
    fPhone: "Phone",
    fNationalId: "National ID",
    fEmail: "Email",
    fUsername: "Username",
    backToCountries: "See all supported countries and regions",
  },
  ja: {
    h1: "{name}の住所・身元ジェネレーター",
    intro:
      "ブラウザ内で {name} の住所と身元情報を生成します。実際の形式に沿った郵便番号・電話番号・{id} を出力し、行政区と都市は常に同一のデータ行から取得するため矛盾しません。すべてアルゴリズムによる合成データで、実在の人物・住所・アカウントとは関係ありません。",
    factsHeading: "{name}の基本情報",
    sampleHeading: "住所の例",
    sampleNote: "以下は項目の形式を示すための合成データです。実在の情報ではありません。",
    generatorHeading: "{name}のデータを生成する",
    otherHeading: "その他の国",
    lNationality: "国籍",
    lLanguage: "公用語",
    lCurrency: "通貨",
    lPhone: "国番号",
    lPostal: "郵便番号",
    lPostalNone: "郵便番号制度なし",
    lPostalSynthetic: "正式データなし・形式に沿って生成",
    lId: "公的番号",
    lIdFormat: "番号形式",
    lIdValid: "チェックディジット",
    lIdChecksumYes: "公式チェックディジットあり",
    lIdFormatOnly: "形式のみ",
    lAdmin: "第一級行政区",
    lDivisions: "行政区数",
    lCities: "収録都市",
    fFullName: "氏名",
    fGender: "性別",
    fBirthDate: "生年月日",
    fAddress: "住所",
    fPostal: "郵便番号",
    fPhone: "電話",
    fNationalId: "公的番号",
    fEmail: "メール",
    fUsername: "ユーザー名",
    backToCountries: "対応している国・地域をすべて見る",
  },
  ko: {
    h1: "{name} 주소 및 신원 생성기",
    intro:
      "브라우저에서 {name}의 주소와 신원 정보를 생성합니다. 실제 형식에 맞는 우편번호·전화번호·{id}를 출력하며, 행정 구역과 도시는 항상 같은 데이터 행에서 가져오므로 서로 어긋나지 않습니다. 모든 값은 알고리즘이 합성한 데이터로 실존 인물·주소·계정과 무관합니다.",
    factsHeading: "{name} 기본 정보",
    sampleHeading: "주소 예시",
    sampleNote: "아래 레코드는 필드 형식을 보여주기 위한 합성 데이터이며 실제 정보가 아닙니다.",
    generatorHeading: "{name} 데이터 생성하기",
    otherHeading: "다른 국가",
    lNationality: "국적",
    lLanguage: "공용어",
    lCurrency: "통화",
    lPhone: "국가 번호",
    lPostal: "우편번호",
    lPostalNone: "우편번호 제도 없음",
    lPostalSynthetic: "공식 데이터 없음 · 형식에 맞춰 생성",
    lId: "공적 번호",
    lIdFormat: "번호 형식",
    lIdValid: "체크디지트",
    lIdChecksumYes: "공식 체크디지트 포함",
    lIdFormatOnly: "형식만 보장",
    lAdmin: "최상위 행정 구역",
    lDivisions: "행정 구역 수",
    lCities: "수록 도시",
    fFullName: "이름",
    fGender: "성별",
    fBirthDate: "생년월일",
    fAddress: "전체 주소",
    fPostal: "우편번호",
    fPhone: "전화",
    fNationalId: "공적 번호",
    fEmail: "이메일",
    fUsername: "사용자 이름",
    backToCountries: "지원하는 모든 국가·지역 보기",
  },
  "zh-hant": {
    h1: "{name}地址與身份產生器",
    intro:
      "在瀏覽器本機產生 {name} 的地址與身份資訊：真實格式的郵遞區號、電話號碼與 {id}，行政區與城市始終來自同一筆資料紀錄，不會互相矛盾。所有內容均由演算法合成，不對應任何真實個人、住址或帳戶。",
    factsHeading: "{name}基本資訊",
    sampleHeading: "地址範例",
    sampleNote: "以下為程式合成的範例資料，僅用於示範欄位格式，並非真實資訊。",
    generatorHeading: "立即產生 {name} 資料",
    otherHeading: "其他國家",
    lNationality: "國籍",
    lLanguage: "官方語言",
    lCurrency: "貨幣",
    lPhone: "國際區號",
    lPostal: "郵遞區號",
    lPostalNone: "該國無郵遞區號制度",
    lPostalSynthetic: "無權威資料，依格式產生",
    lId: "證件號碼",
    lIdFormat: "號碼格式",
    lIdValid: "檢查碼",
    lIdChecksumYes: "含官方檢查碼",
    lIdFormatOnly: "僅保證格式",
    lAdmin: "一級行政區",
    lDivisions: "行政區數量",
    lCities: "收錄城市",
    fFullName: "姓名",
    fGender: "性別",
    fBirthDate: "出生日期",
    fAddress: "完整地址",
    fPostal: "郵遞區號",
    fPhone: "電話",
    fNationalId: "證件號碼",
    fEmail: "電子郵件",
    fUsername: "使用者名稱",
    backToCountries: "查看全部支援的國家與地區",
  },
};
