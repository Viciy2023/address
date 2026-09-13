/**
 * Country registry — the single source of truth for every country the
 * generator supports.
 *
 * Everything that is country-specific but *not* bulk data (city lists, postal
 * codes) lives here. Bulk data is produced by `scripts/build-data.mjs` into
 * `src/data/countries/*.json` and referenced by `code`.
 *
 * Design notes
 * ------------
 * - `locale` lists the faker locale chain used for person names; later entries
 *   fill gaps in earlier ones.
 * - `address.template` is an ordered list of lines. Tokens in braces map to
 *   generated field values.
 * - `id.hasRealChecksum` records whether the generated value is
 *   algorithmically valid. This only drives the "format only" badge in the UI;
 *   it never changes the emitted format.
 *
 * NOTE: this file contains non-ASCII text in several scripts. It must be saved
 * as UTF-8 without BOM. Do not round-trip it through tools that assume a
 * legacy Windows code page.
 */

export type Lang = "zh" | "en" | "ja" | "ko";

export interface LocalizedText {
  zh: string;
  en: string;
  ja: string;
  ko: string;
}

export type PostalStyle =
  | "us" // 12345
  | "ca" // A1A 1A1
  | "gb" // SW1A 1AA
  | "nl" // 1234 AB
  | "br" // 12345-678
  | "jp" // 103-8686
  | "pt" // 4600-000
  | "se" // 132 45
  | "pl" // 59-700
  | "numeric5" // 12345
  | "numeric4" // 1234
  | "numeric6" // 123456
  | "numeric3" // 123 (TW)
  | "none"; // HK / MO / AE: no postal code system

export interface PhoneFormat {
  /** Country calling code without '+', e.g. "1", "44", "86". */
  code: string;
  /** Digit count of the national significant number, excluding trunk prefix. */
  nationalDigits: number;
  /** Digit grouping for the national part, e.g. [3, 4] => XXX-XXXX. */
  groups: number[];
  /** Trunk prefix that must not be preceded by '+CC'. */
  trunkPrefix?: string;
}

export interface IdDocument {
  /** Localized document name, e.g. SSN. */
  name: LocalizedText;
  /** Human-readable format hint shown in the UI. */
  format: string;
  /** Whether the generator produces an algorithmically valid value. */
  hasRealChecksum: boolean;
}

export interface AddressSpec {
  /**
   * Ordered lines. Supported tokens:
   *   {street} {city} {state} {stateCode} {postal} {country}
   */
  template: string[];
  /** Label for the first-level administrative division. */
  adminLabel: LocalizedText;
}

export interface CountrySpec {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: LocalizedText;
  nationality: LocalizedText;
  language: LocalizedText;
  currency: string;
  currencyLabel: LocalizedText;
  locale: string[];
  phone: PhoneFormat;
  postalStyle: PostalStyle;
  /** True when the country has no postal code system at all. */
  postalDisabled: boolean;
  address: AddressSpec;
  id: IdDocument;
  ethnicities: LocalizedText[];
  skills: LocalizedText[];
  interests: LocalizedText[];
  traits: LocalizedText[];
  foods: LocalizedText[];
  travels: LocalizedText[];
  heightCm: { male: [number, number]; female: [number, number] };
  weightKg: { male: [number, number]; female: [number, number] };
  incomeBands: string[];
  /** Whether blood type is conventionally recorded in this country. */
  usesBloodType: boolean;
  /** Whether race/ethnicity is conventionally collected. */
  usesEthnicity: boolean;
  schools: string[];
  majors: LocalizedText[];
}

const L = (zh: string, en: string, ja: string, ko: string): LocalizedText => ({ zh, en, ja, ko });

/* ------------------------------------------------------------------ */
/* Shared pools, reused across countries to keep the registry compact.  */
/* ------------------------------------------------------------------ */

const EN_TRAITS: LocalizedText[] = [
  L("耐心", "Patient", "忍耐強い", "인내심 있는"),
  L("好奇", "Curious", "好奇心旺盛", "호기심 많은"),
  L("乐于支持", "Supportive", "協力的", "협조적인"),
  L("有条理", "Organized", "整理整頓", "체계적인"),
  L("独立", "Independent-Minded", "独立心", "독립적인"),
  L("适应力强", "Adaptable", "適応力", "적응력 있는"),
  L("注重细节", "Detail-Oriented", "細部重視", "세심한"),
  L("冷静", "Calm", "冷静", "침착한"),
];

const EN_INTERESTS: LocalizedText[] = [
  L("效率工具", "Productivity", "生産性", "생산성"),
  L("写作", "Writing", "執筆", "글쓰기"),
  L("在线学习", "Online Learning", "オンライン学習", "온라인 학습"),
  L("用户体验设计", "UX Design", "UXデザイン", "UX 디자인"),
  L("语言学习", "Languages", "言語学習", "언어 학습"),
  L("数据分析", "Data Analysis", "データ分析", "데이터 분석"),
  L("摄影", "Photography", "写真", "사진"),
  L("开源社区", "Open Source", "オープンソース", "오픈소스"),
];

const EN_SKILLS: LocalizedText[] = [
  L("课程设计", "Curriculum Design", "カリキュラム設計", "교육과정 설계"),
  L("评估", "Assessment", "評価", "평가"),
  L("引导技巧", "Facilitation", "ファシリテーション", "퍼실리테이션"),
  L("沟通", "Communication", "コミュニケーション", "커뮤니케이션"),
  L("教练辅导", "Coaching", "コーチング", "코칭"),
  L("SQL", "SQL", "SQL", "SQL"),
  L("项目管理", "Project Management", "プロジェクト管理", "프로젝트 관리"),
  L("用户研究", "User Research", "ユーザーリサーチ", "사용자 조사"),
];

const EN_MAJORS: LocalizedText[] = [
  L("计算机科学", "Computer Science", "情報科学", "컴퓨터과학"),
  L("工商管理", "Business Administration", "経営学", "경영학"),
  L("经济学", "Economics", "経済学", "경제학"),
];

/* ------------------------------------------------------------------ */

export const COUNTRIES: CountrySpec[] = [
  {
    code: "US",
    name: L("美国", "United States", "アメリカ", "미국"),
    nationality: L("美国", "American", "アメリカ人", "미국인"),
    language: L("英语", "English", "英語", "영어"),
    currency: "USD",
    currencyLabel: L("$", "$", "$", "$"),
    locale: ["en_US"],
    phone: { code: "1", nationalDigits: 10, groups: [3, 3, 4] },
    postalStyle: "us",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city}, {stateCode} {postal}", "{country}"],
      adminLabel: L("州", "State", "州", "주"),
    },
    id: {
      name: L("社会安全号 (SSN)", "Social Security Number", "社会保障番号", "사회보장번호"),
      format: "###-##-####",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("白人 / 欧洲裔", "White / European American", "白人", "백인"),
      L("非裔", "Black / African American", "アフリカ系", "흑인"),
      L("拉美裔", "Hispanic / Latino", "ヒスパニック", "히스패닉"),
      L("亚裔", "Asian American", "アジア系", "아시아계"),
      L("混血", "Two or More Races", "混血", "혼혈"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("汉堡", "Burger", "バーガー", "버거"),
      L("低糖零食", "Low-Sugar Snacks", "低糖スナック", "저당 간식"),
      L("烧烤", "BBQ", "バーベキュー", "바비큐"),
    ],
    travels: [
      L("城市短途", "City Break", "シティブレイク", "도시 여행"),
      L("滑雪", "Ski Trips", "スキー旅行", "스키 여행"),
      L("公路旅行", "Road Trip", "ロードトリップ", "로드트립"),
    ],
    heightCm: { male: [168, 194], female: [155, 180] },
    weightKg: { male: [62, 115], female: [48, 95] },
    incomeBands: ["$2,600-$4,900", "$4,900-$7,400", "$7,400-$11,000", "$11,000-$16,500"],
    usesBloodType: false,
    usesEthnicity: true,
    schools: ["Massachusetts Institute of Technology", "University of Michigan", "Boston University", "Purdue University", "University of Texas at Austin"],
    majors: [
      L("生物技术", "Biotechnology", "生物工学", "생명공학"),
      L("计算机科学", "Computer Science", "情報科学", "컴퓨터과학"),
      L("工商管理", "Business Administration", "経営学", "경영학"),
    ],
  },
  {
    code: "CA",
    name: L("加拿大", "Canada", "カナダ", "캐나다"),
    nationality: L("加拿大", "Canadian", "カナダ人", "캐나다인"),
    language: L("英语 / 法语", "English / French", "英語・フランス語", "영어 / 프랑스어"),
    currency: "CAD",
    currencyLabel: L("C$", "C$", "C$", "C$"),
    locale: ["en_CA", "fr_CA"],
    phone: { code: "1", nationalDigits: 10, groups: [3, 3, 4] },
    postalStyle: "ca",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city}, {stateCode} {postal}", "{country}"],
      adminLabel: L("省", "Province", "州", "주"),
    },
    id: {
      name: L("社会保险号 (SIN)", "Social Insurance Number", "社会保険番号", "사회보험번호"),
      format: "###-###-###",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("白人 / 欧洲裔", "White / European Canadian", "白人", "백인"),
      L("亚裔", "Asian Canadian", "アジア系", "아시아계"),
      L("原住民", "Indigenous", "先住民", "원주민"),
      L("混血", "Mixed Heritage", "混血", "혼혈"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("肉汁奶酪薯条", "Poutine", "プーティン", "푸틴"),
      L("枫糖制品", "Maple Treats", "メープル菓子", "메이플 간식"),
    ],
    travels: [
      L("国家公园", "National Parks", "国立公園", "국립공원"),
      L("滑雪", "Ski Trips", "スキー旅行", "스키 여행"),
    ],
    heightCm: { male: [168, 193], female: [155, 179] },
    weightKg: { male: [62, 112], female: [48, 92] },
    incomeBands: ["C$2,800-C$5,200", "C$5,200-C$7,800", "C$7,800-C$11,500", "C$11,500-C$17,000"],
    usesBloodType: false,
    usesEthnicity: true,
    schools: ["University of Toronto", "McGill University", "University of British Columbia", "University of Waterloo"],
    majors: [
      L("计算机科学", "Computer Science", "情報科学", "컴퓨터과학"),
      L("土木工程", "Civil Engineering", "土木工学", "토목공학"),
      L("商科", "Commerce", "商学", "상학"),
    ],
  },
  {
    code: "GB",
    name: L("英国", "United Kingdom", "イギリス", "영국"),
    nationality: L("英国", "British", "イギリス人", "영국인"),
    language: L("英语", "English", "英語", "영어"),
    currency: "GBP",
    currencyLabel: L("£", "£", "£", "£"),
    locale: ["en_GB"],
    phone: { code: "44", nationalDigits: 10, groups: [4, 6], trunkPrefix: "0" },
    postalStyle: "gb",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city}", "{postal}", "{country}"],
      adminLabel: L("地区", "Region", "地域", "지역"),
    },
    id: {
      name: L("国民保险号 (NINO)", "National Insurance Number", "国民保険番号", "국민보험번호"),
      format: "QQ ## ## ## Q",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("白人 / 英国裔", "White British", "白人英国系", "백인 영국계"),
      L("南亚裔", "South Asian", "南アジア系", "남아시아계"),
      L("非裔", "Black British", "アフリカ系", "흑인"),
      L("混血", "Mixed", "混血", "혼혈"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("炸鱼薯条", "Fish and Chips", "フィッシュ&チップス", "피시 앤 칩스"),
      L("英式早餐", "Full English Breakfast", "フルイングリッシュ", "풀 잉글리시"),
    ],
    travels: [
      L("城市短途", "City Break", "シティブレイク", "도시 여행"),
      L("乡村徒步", "Countryside Walks", "田園ハイキング", "시골 산책"),
    ],
    heightCm: { male: [168, 193], female: [155, 178] },
    weightKg: { male: [62, 112], female: [47, 92] },
    incomeBands: ["£1,900-£3,400", "£3,400-£5,400", "£5,400-£8,200", "£8,200-£12,500"],
    usesBloodType: false,
    usesEthnicity: true,
    schools: ["University of Oxford", "University of Manchester", "University of Edinburgh", "Imperial College London"],
    majors: [
      L("法律", "Law", "法学", "법학"),
      L("经济学", "Economics", "経済学", "경제학"),
      L("机械工程", "Mechanical Engineering", "機械工学", "기계공학"),
    ],
  },
  {
    code: "AU",
    name: L("澳大利亚", "Australia", "オーストラリア", "호주"),
    nationality: L("澳大利亚", "Australian", "オーストラリア人", "호주인"),
    language: L("英语", "English", "英語", "영어"),
    currency: "AUD",
    currencyLabel: L("A$", "A$", "A$", "A$"),
    locale: ["en_AU"],
    phone: { code: "61", nationalDigits: 9, groups: [3, 3, 3], trunkPrefix: "0" },
    postalStyle: "numeric4",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city} {stateCode} {postal}", "{country}"],
      adminLabel: L("州", "State", "州", "주"),
    },
    id: {
      name: L("税号 (TFN)", "Tax File Number", "税務番号", "세금번호"),
      format: "### ### ###",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("欧洲裔", "European Australian", "ヨーロッパ系", "유럽계"),
      L("亚裔", "Asian Australian", "アジア系", "아시아계"),
      L("原住民", "Aboriginal / Torres Strait", "先住民", "원주민"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("烧烤", "BBQ", "バーベキュー", "바비큐"),
      L("海鲜", "Seafood", "シーフード", "해산물"),
    ],
    travels: [
      L("海滩度假", "Beach Holiday", "ビーチ休暇", "해변 휴가"),
      L("公路旅行", "Road Trip", "ロードトリップ", "로드트립"),
    ],
    heightCm: { male: [170, 195], female: [157, 181] },
    weightKg: { male: [65, 115], female: [50, 95] },
    incomeBands: ["A$2,900-A$5,400", "A$5,400-A$8,200", "A$8,200-A$12,000", "A$12,000-A$18,000"],
    usesBloodType: false,
    usesEthnicity: true,
    schools: ["University of Melbourne", "University of Sydney", "Monash University", "University of Queensland"],
    majors: [
      L("会计", "Accounting", "会計学", "회계학"),
      L("环境科学", "Environmental Science", "環境科学", "환경과학"),
      L("护理", "Nursing", "看護学", "간호학"),
    ],
  },
  {
    code: "NZ",
    name: L("新西兰", "New Zealand", "ニュージーランド", "뉴질랜드"),
    nationality: L("新西兰", "New Zealander", "ニュージーランド人", "뉴질랜드인"),
    language: L("英语 / 毛利语", "English / Māori", "英語・マオリ語", "영어 / 마오리어"),
    currency: "NZD",
    currencyLabel: L("NZ$", "NZ$", "NZ$", "NZ$"),
    locale: ["en_AU"],
    phone: { code: "64", nationalDigits: 9, groups: [2, 3, 4], trunkPrefix: "0" },
    postalStyle: "numeric4",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city} {postal}", "{country}"],
      adminLabel: L("地区", "Region", "地域", "지역"),
    },
    id: {
      name: L("税号 (IRD)", "IRD Number", "税務番号", "세금번호"),
      format: "###-###-###",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("欧洲裔", "European New Zealander", "ヨーロッパ系", "유럽계"),
      L("毛利裔", "Māori", "マオリ", "마오리"),
      L("太平洋岛民", "Pacific Peoples", "太平洋諸島系", "태평양 섬계"),
      L("亚裔", "Asian New Zealander", "アジア系", "아시아계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("羊肉", "Lamb", "ラム", "양고기"),
      L("奇异果", "Kiwifruit", "キウイ", "키위"),
    ],
    travels: [
      L("徒步", "Tramping", "トレッキング", "트래킹"),
      L("露营", "Camping", "キャンプ", "캠핑"),
    ],
    heightCm: { male: [170, 194], female: [157, 180] },
    weightKg: { male: [66, 114], female: [50, 94] },
    incomeBands: ["NZ$2,600-NZ$4,800", "NZ$4,800-NZ$7,200", "NZ$7,200-NZ$10,500", "NZ$10,500-NZ$15,500"],
    usesBloodType: false,
    usesEthnicity: true,
    schools: ["University of Auckland", "Victoria University of Wellington", "University of Otago"],
    majors: [
      L("农业科学", "Agricultural Science", "農学", "농업과학"),
      L("旅游管理", "Tourism Management", "観光経営", "관광경영"),
    ],
  },
  {
    code: "DE",
    name: L("德国", "Germany", "ドイツ", "독일"),
    nationality: L("德国", "German", "ドイツ人", "독일인"),
    language: L("德语", "German", "ドイツ語", "독일어"),
    currency: "EUR",
    currencyLabel: L("€", "€", "€", "€"),
    locale: ["de"],
    phone: { code: "49", nationalDigits: 10, groups: [3, 7], trunkPrefix: "0" },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{country}"],
      adminLabel: L("州", "State", "州", "주"),
    },
    id: {
      name: L("身份证号", "National ID Number", "身分証番号", "신분증 번호"),
      format: "L#########",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("德国裔", "German", "ドイツ系", "독일계"),
      L("土耳其裔", "Turkish German", "トルコ系", "터키계"),
      L("波兰裔", "Polish German", "ポーランド系", "폴란드계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("香肠", "Bratwurst", "ソーセージ", "소시지"),
      L("面包", "Bread", "パン", "빵"),
    ],
    travels: [
      L("城市短途", "City Break", "シティブレイク", "도시 여행"),
      L("骑行", "Cycling Tour", "サイクリング", "자전거 여행"),
    ],
    heightCm: { male: [170, 196], female: [157, 181] },
    weightKg: { male: [64, 112], female: [48, 92] },
    incomeBands: ["2,000-3,500 €", "3,500-5,500 €", "5,500-8,400 €", "8,400-12,800 €"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Technische Universität München", "RWTH Aachen", "Universität Heidelberg", "Freie Universität Berlin"],
    majors: [
      L("机械工程", "Mechanical Engineering", "機械工学", "기계공학"),
      L("物理学", "Physics", "物理学", "물리학"),
      L("化学", "Chemistry", "化学", "화학"),
    ],
  },
  {
    code: "FR",
    name: L("法国", "France", "フランス", "프랑스"),
    nationality: L("法国", "French", "フランス人", "프랑스인"),
    language: L("法语", "French", "フランス語", "프랑스어"),
    currency: "EUR",
    currencyLabel: L("€", "€", "€", "€"),
    locale: ["fr"],
    phone: { code: "33", nationalDigits: 9, groups: [1, 2, 2, 2, 2], trunkPrefix: "0" },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{country}"],
      adminLabel: L("大区", "Region", "地域", "지역"),
    },
    id: {
      name: L("社会保障号 (INSEE)", "Social Security Number", "社会保障番号", "사회보장번호"),
      format: "## ## ## ### ###",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("法国裔", "French", "フランス系", "프랑스계"),
      L("北非裔", "North African", "北アフリカ系", "북아프리카계"),
      L("西非裔", "West African", "西アフリカ系", "서아프리카계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("可颂", "Croissant", "クロワッサン", "크루아상"),
      L("奶酪", "Cheese", "チーズ", "치즈"),
    ],
    travels: [
      L("城市漫步", "City Stroll", "街歩き", "도시 산책"),
      L("葡萄园之旅", "Vineyard Tour", "ワイナリー巡り", "와이너리 투어"),
    ],
    heightCm: { male: [168, 193], female: [155, 178] },
    weightKg: { male: [63, 108], female: [47, 88] },
    incomeBands: ["1,800-3,200 €", "3,200-5,100 €", "5,100-7,800 €", "7,800-12,000 €"],
    usesBloodType: false,
    usesEthnicity: true,
    schools: ["Sorbonne Université", "École Polytechnique", "Université Paris-Saclay", "HEC Paris"],
    majors: [
      L("文学", "Literature", "文学", "문학"),
      L("数学", "Mathematics", "数学", "수학"),
      L("艺术史", "Art History", "美術史", "미술사"),
    ],
  },
  {
    code: "IT",
    name: L("意大利", "Italy", "イタリア", "이탈리아"),
    nationality: L("意大利", "Italian", "イタリア人", "이탈리아인"),
    language: L("意大利语", "Italian", "イタリア語", "이탈리아어"),
    currency: "EUR",
    currencyLabel: L("€", "€", "€", "€"),
    locale: ["it"],
    phone: { code: "39", nationalDigits: 10, groups: [3, 7] },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{country}"],
      adminLabel: L("大区", "Region", "地域", "지역"),
    },
    id: {
      name: L("税务代码 (Codice Fiscale)", "Fiscal Code", "税務コード", "세무 코드"),
      format: "LLLLLL##L##L###L",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("意大利裔", "Italian", "イタリア系", "이탈리아계"),
      L("巴尔干裔", "Balkan", "バルカン系", "발칸계"),
      L("北非裔", "North African", "北アフリカ系", "북아프리카계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("意大利面", "Pasta", "パスタ", "파스타"),
      L("浓缩咖啡", "Espresso", "エスプレッソ", "에스프레소"),
    ],
    travels: [
      L("艺术之城", "Art Cities", "芸術都市", "예술 도시"),
      L("海岸度假", "Coastal Holiday", "海岸休暇", "해안 휴가"),
    ],
    heightCm: { male: [167, 191], female: [154, 176] },
    weightKg: { male: [62, 108], female: [47, 88] },
    incomeBands: ["1,600-2,900 €", "2,900-4,600 €", "4,600-7,000 €", "7,000-11,000 €"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Politecnico di Milano", "Università di Bologna", "Sapienza Università di Roma"],
    majors: [
      L("建筑学", "Architecture", "建築学", "건축학"),
      L("设计", "Design", "デザイン", "디자인"),
    ],
  },
  {
    code: "ES",
    name: L("西班牙", "Spain", "スペイン", "스페인"),
    nationality: L("西班牙", "Spanish", "スペイン人", "스페인인"),
    language: L("西班牙语", "Spanish", "スペイン語", "스페인어"),
    currency: "EUR",
    currencyLabel: L("€", "€", "€", "€"),
    locale: ["es"],
    phone: { code: "34", nationalDigits: 9, groups: [3, 3, 3] },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{country}"],
      adminLabel: L("自治区", "Region", "地域", "지역"),
    },
    id: {
      name: L("身份证号 (DNI)", "National ID (DNI)", "身分証番号", "신분증 번호"),
      format: "########L",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("西班牙裔", "Spanish", "スペイン系", "스페인계"),
      L("拉美裔", "Latin American", "ラテンアメリカ系", "라틴아메리카계"),
      L("罗姆裔", "Roma", "ロマ", "로마"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("海鲜饭", "Paella", "パエリア", "파에야"),
      L("火腿", "Jamón", "ハモン", "하몽"),
    ],
    travels: [
      L("海滩度假", "Beach Holiday", "ビーチ休暇", "해변 휴가"),
      L("城市短途", "City Break", "シティブレイク", "도시 여행"),
    ],
    heightCm: { male: [167, 191], female: [155, 176] },
    weightKg: { male: [63, 108], female: [48, 86] },
    incomeBands: ["1,500-2,700 €", "2,700-4,300 €", "4,300-6,600 €", "6,600-10,500 €"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Universidad Complutense de Madrid", "Universitat de Barcelona", "Universidad de Salamanca"],
    majors: [
      L("旅游学", "Tourism", "観光学", "관광학"),
      L("语言学", "Linguistics", "言語学", "언어학"),
    ],
  },
  {
    code: "PT",
    name: L("葡萄牙", "Portugal", "ポルトガル", "포르투갈"),
    nationality: L("葡萄牙", "Portuguese", "ポルトガル人", "포르투갈인"),
    language: L("葡萄牙语", "Portuguese", "ポルトガル語", "포르투갈어"),
    currency: "EUR",
    currencyLabel: L("€", "€", "€", "€"),
    locale: ["pt_PT"],
    phone: { code: "351", nationalDigits: 9, groups: [3, 3, 3] },
    postalStyle: "pt",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{country}"],
      adminLabel: L("区", "District", "県", "지구"),
    },
    id: {
      name: L("纳税人号 (NIF)", "Tax Number (NIF)", "納税者番号", "납세자 번호"),
      format: "#########",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("葡萄牙裔", "Portuguese", "ポルトガル系", "포르투갈계"),
      L("巴西裔", "Brazilian", "ブラジル系", "브라질계"),
      L("非洲裔", "African", "アフリカ系", "아프리카계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("蛋挞", "Pastel de Nata", "エッグタルト", "에그타르트"),
      L("鳕鱼", "Bacalhau", "バカリャウ", "바칼라우"),
    ],
    travels: [
      L("海岸度假", "Coastal Holiday", "海岸休暇", "해안 휴가"),
      L("历史古城", "Historic Towns", "歴史的な町", "역사 도시"),
    ],
    heightCm: { male: [166, 190], female: [154, 175] },
    weightKg: { male: [62, 106], female: [47, 86] },
    incomeBands: ["1,200-2,200 €", "2,200-3,600 €", "3,600-5,600 €", "5,600-9,000 €"],
    usesBloodType: false,
    usesEthnicity: true,
    schools: ["Universidade de Lisboa", "Universidade do Porto", "Universidade de Coimbra"],
    majors: [
      L("海洋科学", "Marine Science", "海洋科学", "해양과학"),
      L("土木工程", "Civil Engineering", "土木工学", "토목공학"),
    ],
  },
  {
    code: "NL",
    name: L("荷兰", "Netherlands", "オランダ", "네덜란드"),
    nationality: L("荷兰", "Dutch", "オランダ人", "네덜란드인"),
    language: L("荷兰语", "Dutch", "オランダ語", "네덜란드어"),
    currency: "EUR",
    currencyLabel: L("€", "€", "€", "€"),
    locale: ["nl"],
    phone: { code: "31", nationalDigits: 9, groups: [3, 6], trunkPrefix: "0" },
    postalStyle: "nl",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{country}"],
      adminLabel: L("省", "Province", "州", "주"),
    },
    id: {
      name: L("公民服务号 (BSN)", "Citizen Service Number", "市民サービス番号", "시민 서비스 번호"),
      format: "#########",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("荷兰裔", "Dutch", "オランダ系", "네덜란드계"),
      L("苏里南裔", "Surinamese", "スリナム系", "수리남계"),
      L("印尼裔", "Indonesian Dutch", "インドネシア系", "인도네시아계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("奶酪", "Cheese", "チーズ", "치즈"),
      L("华夫饼", "Stroopwafel", "ストロープワッフル", "스트룹와플"),
    ],
    travels: [
      L("骑行", "Cycling Tour", "サイクリング", "자전거 여행"),
      L("运河游船", "Canal Cruise", "運河クルーズ", "운하 크루즈"),
    ],
    heightCm: { male: [173, 198], female: [160, 183] },
    weightKg: { male: [66, 112], female: [50, 92] },
    incomeBands: ["2,100-3,700 €", "3,700-5,800 €", "5,800-8,800 €", "8,800-13,500 €"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Technische Universiteit Delft", "Universiteit van Amsterdam", "Universiteit Utrecht"],
    majors: [
      L("水利工程", "Hydraulic Engineering", "水工学", "수공학"),
      L("物流管理", "Logistics", "物流管理", "물류관리"),
    ],
  },
  {
    code: "SE",
    name: L("瑞典", "Sweden", "スウェーデン", "스웨덴"),
    nationality: L("瑞典", "Swedish", "スウェーデン人", "스웨덴인"),
    language: L("瑞典语", "Swedish", "スウェーデン語", "스웨덴어"),
    currency: "SEK",
    currencyLabel: L("kr", "kr", "kr", "kr"),
    locale: ["sv"],
    phone: { code: "46", nationalDigits: 9, groups: [3, 6], trunkPrefix: "0" },
    postalStyle: "se",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{country}"],
      adminLabel: L("省", "County", "県", "주"),
    },
    id: {
      name: L("个人身份号 (Personnummer)", "Personal Identity Number", "個人番号", "개인 식별 번호"),
      format: "######-####",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("瑞典裔", "Swedish", "スウェーデン系", "스웨덴계"),
      L("北欧裔", "Nordic", "北欧系", "북유럽계"),
      L("中东裔", "Middle Eastern", "中東系", "중동계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("肉丸", "Meatballs", "ミートボール", "미트볼"),
      L("肉桂卷", "Cinnamon Bun", "シナモンロール", "시나몬롤"),
    ],
    travels: [
      L("自然徒步", "Nature Hiking", "自然ハイキング", "자연 하이킹"),
      L("极光之旅", "Northern Lights", "オーロラ観賞", "오로라 여행"),
    ],
    heightCm: { male: [172, 197], female: [160, 182] },
    weightKg: { male: [67, 112], female: [52, 90] },
    incomeBands: ["22,000-34,000 kr", "34,000-48,000 kr", "48,000-68,000 kr", "68,000-95,000 kr"],
    usesBloodType: true,
    usesEthnicity: false,
    schools: ["KTH Royal Institute of Technology", "Lund University", "Uppsala University"],
    majors: [
      L("工业设计", "Industrial Design", "工業デザイン", "산업디자인"),
      L("环境工程", "Environmental Engineering", "環境工学", "환경공학"),
    ],
  },
  {
    code: "NO",
    name: L("挪威", "Norway", "ノルウェー", "노르웨이"),
    nationality: L("挪威", "Norwegian", "ノルウェー人", "노르웨이인"),
    language: L("挪威语", "Norwegian", "ノルウェー語", "노르웨이어"),
    currency: "NOK",
    currencyLabel: L("kr", "kr", "kr", "kr"),
    locale: ["nb_NO"],
    phone: { code: "47", nationalDigits: 8, groups: [3, 2, 3] },
    postalStyle: "numeric4",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{country}"],
      adminLabel: L("郡", "County", "県", "주"),
    },
    id: {
      name: L("出生号 (Fødselsnummer)", "National Identity Number", "個人番号", "주민번호"),
      format: "######-#####",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("挪威裔", "Norwegian", "ノルウェー系", "노르웨이계"),
      L("萨米裔", "Sámi", "サーミ", "사미"),
      L("北欧裔", "Nordic", "北欧系", "북유럽계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("三文鱼", "Salmon", "サーモン", "연어"),
      L("棕色奶酪", "Brown Cheese", "ブラウンチーズ", "브라운 치즈"),
    ],
    travels: [
      L("峡湾巡游", "Fjord Cruise", "フィヨルド観光", "피오르 크루즈"),
      L("越野滑雪", "Cross-Country Skiing", "クロスカントリースキー", "크로스컨트리 스키"),
    ],
    heightCm: { male: [173, 197], female: [160, 182] },
    weightKg: { male: [68, 112], female: [52, 90] },
    incomeBands: ["30,000-45,000 kr", "45,000-62,000 kr", "62,000-85,000 kr", "85,000-120,000 kr"],
    usesBloodType: true,
    usesEthnicity: false,
    schools: ["Norwegian University of Science and Technology", "University of Oslo", "University of Bergen"],
    majors: [
      L("海洋工程", "Marine Engineering", "海洋工学", "해양공학"),
      L("能源工程", "Energy Engineering", "エネルギー工学", "에너지공학"),
    ],
  },
  {
    code: "PL",
    name: L("波兰", "Poland", "ポーランド", "폴란드"),
    nationality: L("波兰", "Polish", "ポーランド人", "폴란드인"),
    language: L("波兰语", "Polish", "ポーランド語", "폴란드어"),
    currency: "PLN",
    currencyLabel: L("zł", "zł", "zł", "zł"),
    locale: ["pl"],
    phone: { code: "48", nationalDigits: 9, groups: [3, 3, 3] },
    postalStyle: "pl",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{country}"],
      adminLabel: L("省", "Voivodeship", "県", "주"),
    },
    id: {
      name: L("个人身份号 (PESEL)", "Personal ID (PESEL)", "個人番号", "개인 번호"),
      format: "###########",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("波兰裔", "Polish", "ポーランド系", "폴란드계"),
      L("西里西亚裔", "Silesian", "シレジア系", "실레지아계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("饺子", "Pierogi", "ピエロギ", "피에로기"),
      L("酸汤", "Żurek", "ジュレック", "주레크"),
    ],
    travels: [
      L("山地徒步", "Mountain Hiking", "山岳ハイキング", "산악 하이킹"),
      L("历史古城", "Historic Towns", "歴史的な町", "역사 도시"),
    ],
    heightCm: { male: [170, 195], female: [158, 180] },
    weightKg: { male: [66, 112], female: [50, 90] },
    incomeBands: ["4,500-7,000 zł", "7,000-11,000 zł", "11,000-16,000 zł", "16,000-24,000 zł"],
    usesBloodType: false,
    usesEthnicity: false,
    schools: ["University of Warsaw", "Warsaw University of Technology", "Jagiellonian University"],
    majors: [
      L("计算机科学", "Computer Science", "情報科学", "컴퓨터과학"),
      L("牙医学", "Dentistry", "歯学", "치의학"),
    ],
  },
  {
    code: "RU",
    name: L("俄罗斯", "Russia", "ロシア", "러시아"),
    nationality: L("俄罗斯", "Russian", "ロシア人", "러시아인"),
    language: L("俄语", "Russian", "ロシア語", "러시아어"),
    currency: "RUB",
    currencyLabel: L("₽", "₽", "₽", "₽"),
    locale: ["ru"],
    phone: { code: "7", nationalDigits: 10, groups: [3, 3, 2, 2], trunkPrefix: "8" },
    postalStyle: "numeric6",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city}", "{postal}", "{country}"],
      adminLabel: L("联邦主体", "Federal Subject", "連邦構成体", "연방주체"),
    },
    id: {
      name: L("个人保险账号 (СНИЛС)", "Insurance Number (SNILS)", "保険番号", "보험번호"),
      format: "###-###-### ##",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("俄罗斯裔", "Russian", "ロシア系", "러시아계"),
      L("鞑靼裔", "Tatar", "タタール系", "타타르계"),
      L("乌克兰裔", "Ukrainian", "ウクライナ系", "우크라이나계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("罗宋汤", "Borscht", "ボルシチ", "보르시"),
      L("饺子", "Pelmeni", "ペリメニ", "펠메니"),
    ],
    travels: [
      L("冬季运动", "Winter Sports", "ウィンタースポーツ", "겨울 스포츠"),
      L("温泉疗养", "Sanatorium Retreat", "サナトリウム滞在", "온천 요양"),
    ],
    heightCm: { male: [170, 195], female: [158, 180] },
    weightKg: { male: [66, 112], female: [51, 90] },
    incomeBands: ["60,000-95,000 ₽", "95,000-140,000 ₽", "140,000-200,000 ₽", "200,000-300,000 ₽"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Lomonosov Moscow State University", "Bauman Moscow State Technical University", "Saint Petersburg State University"],
    majors: [
      L("航空航天工程", "Aerospace Engineering", "航空宇宙工学", "항공우주공학"),
      L("核物理", "Nuclear Physics", "核物理学", "핵물리학"),
    ],
  },
  {
    code: "CN",
    name: L("中国", "China", "中国", "중국"),
    nationality: L("中国", "Chinese", "中国人", "중국인"),
    language: L("简体中文", "Simplified Chinese", "簡体字中国語", "중국어 간체"),
    currency: "CNY",
    currencyLabel: L("¥", "¥", "¥", "¥"),
    locale: ["zh_CN"],
    phone: { code: "86", nationalDigits: 11, groups: [3, 4, 4] },
    postalStyle: "numeric6",
    postalDisabled: false,
    address: {
      template: ["{state}{city}{street}", "{postal}", "{country}"],
      adminLabel: L("省 / 直辖市", "Province", "省", "성"),
    },
    id: {
      name: L("居民身份证号", "Resident ID Number", "住民身分証番号", "주민등록번호"),
      format: "18 位数字",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("汉族", "Han Chinese", "漢族", "한족"),
      L("壮族", "Zhuang", "チワン族", "좡족"),
      L("回族", "Hui", "回族", "후이족"),
      L("满族", "Manchu", "満族", "만주족"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("火锅", "Hot Pot", "火鍋", "훠궈"),
      L("面食", "Noodles", "麺類", "면 요리"),
    ],
    travels: [
      L("国内高铁游", "High-Speed Rail Trip", "高速鉄道旅行", "고속철도 여행"),
      L("周边自驾", "Weekend Road Trip", "週末ドライブ", "주말 드라이브"),
    ],
    heightCm: { male: [165, 186], female: [153, 172] },
    weightKg: { male: [58, 95], female: [44, 76] },
    incomeBands: ["6,000-9,500 元", "9,500-14,500 元", "14,500-21,000 元", "21,000-32,000 元"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["清华大学", "北京大学", "浙江大学", "上海交通大学"],
    majors: [
      L("计算机科学与技术", "Computer Science", "計算機科学", "컴퓨터과학"),
      L("金融学", "Finance", "ファイナンス", "금융학"),
    ],
  },
  {
    code: "TW",
    name: L("中国台湾", "Taiwan, China", "中国台湾", "중국 대만"),
    nationality: L("中国台湾", "Taiwanese", "台湾人", "대만인"),
    language: L("繁体中文", "Traditional Chinese", "繁体字中国語", "중국어 번체"),
    currency: "TWD",
    currencyLabel: L("NT$", "NT$", "NT$", "NT$"),
    locale: ["zh_TW"],
    phone: { code: "886", nationalDigits: 9, groups: [3, 3, 3], trunkPrefix: "0" },
    postalStyle: "numeric3",
    postalDisabled: false,
    address: {
      template: ["{state}{city}{street}", "{postal}", "{country}"],
      adminLabel: L("縣 / 市", "County / City", "県 / 市", "현 / 시"),
    },
    id: {
      name: L("身分證統一編號", "National ID Number", "身分証番号", "신분증 번호"),
      format: "L#########",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("閩南裔", "Hoklo", "閩南系", "민남계"),
      L("客家裔", "Hakka", "客家系", "객가계"),
      L("原住民族", "Indigenous Peoples", "先住民", "원주민"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("牛肉麵", "Beef Noodle Soup", "牛肉麺", "소고기 국수"),
      L("珍珠奶茶", "Bubble Tea", "タピオカミルクティー", "버블티"),
    ],
    travels: [
      L("環島旅行", "Island Round Trip", "島一周旅行", "섬 일주 여행"),
      L("夜市美食", "Night Market Tour", "夜市巡り", "야시장 투어"),
    ],
    heightCm: { male: [166, 185], female: [154, 172] },
    weightKg: { male: [60, 94], female: [45, 74] },
    incomeBands: ["30,000-45,000 NT$", "45,000-65,000 NT$", "65,000-95,000 NT$", "95,000-140,000 NT$"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["國立臺灣大學", "國立成功大學", "國立清華大學", "國立陽明交通大學"],
    majors: [
      L("電機工程", "Electrical Engineering", "電気工学", "전기공학"),
      L("資訊工程", "Information Engineering", "情報工学", "정보공학"),
    ],
  },
  {
    code: "HK",
    name: L("中国香港", "Hong Kong, China", "中国香港", "중국 홍콩"),
    nationality: L("中国香港", "Hong Konger", "香港人", "홍콩인"),
    language: L("繁体中文 / 英语", "Traditional Chinese / English", "繁体字中国語・英語", "중국어 번체 / 영어"),
    currency: "HKD",
    currencyLabel: L("HK$", "HK$", "HK$", "HK$"),
    locale: ["en_HK", "zh_TW"],
    phone: { code: "852", nationalDigits: 8, groups: [4, 4] },
    postalStyle: "none",
    postalDisabled: true,
    address: {
      template: ["{street}", "{state}", "{city}", "{country}"],
      adminLabel: L("區域", "District", "地区", "지역"),
    },
    id: {
      name: L("香港身份證號碼", "Hong Kong Identity Card Number", "香港身分証番号", "홍콩 신분증 번호"),
      format: "L#######(A)",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("華裔", "Chinese", "中国系", "중국계"),
      L("混血", "Mixed", "混血", "혼혈"),
      L("南亞裔", "South Asian", "南アジア系", "남아시아계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("點心", "Dim Sum", "飲茶", "딤섬"),
      L("雲吞麵", "Wonton Noodles", "ワンタン麺", "완탕면"),
    ],
    travels: [
      L("行山", "Hiking", "ハイキング", "하이킹"),
      L("離島遊", "Outlying Islands", "離島巡り", "외곽섬 여행"),
    ],
    heightCm: { male: [167, 184], female: [155, 172] },
    weightKg: { male: [60, 90], female: [45, 72] },
    incomeBands: ["HK$15,000-HK$24,000", "HK$24,000-HK$38,000", "HK$38,000-HK$60,000", "HK$60,000-HK$95,000"],
    usesBloodType: true,
    usesEthnicity: false,
    schools: ["The University of Hong Kong", "The Chinese University of Hong Kong", "Hong Kong University of Science and Technology"],
    majors: [
      L("工商管理", "Business Administration", "経営学", "경영학"),
      L("金融學", "Finance", "ファイナンス", "금융학"),
    ],
  },
  {
    code: "MO",
    name: L("中国澳门", "Macao, China", "中国マカオ", "중국 마카오"),
    nationality: L("中国澳门", "Macanese", "マカオ人", "마카오인"),
    language: L("繁体中文 / 葡萄牙语", "Traditional Chinese / Portuguese", "繁体字中国語・ポルトガル語", "중국어 번체 / 포르투갈어"),
    currency: "MOP",
    currencyLabel: L("MOP$", "MOP$", "MOP$", "MOP$"),
    locale: ["pt_PT", "zh_TW"],
    phone: { code: "853", nationalDigits: 8, groups: [4, 4] },
    postalStyle: "none",
    postalDisabled: true,
    address: {
      template: ["{street}", "{state}", "{city}", "{country}"],
      adminLabel: L("堂區", "Parish", "堂区", "교구"),
    },
    id: {
      name: L("澳門居民身份證號碼", "Macao Resident Identity Card Number", "マカオ身分証番号", "마카오 신분증 번호"),
      format: "#######(A)",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("華裔", "Chinese", "中国系", "중국계"),
      L("土生葡人", "Macanese", "マカエンセ", "마카넨세"),
      L("葡萄牙裔", "Portuguese", "ポルトガル系", "포르투갈계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("葡撻", "Portuguese Egg Tart", "ポルトガル風エッグタルト", "포르투갈식 에그타르트"),
      L("豬扒包", "Pork Chop Bun", "ポークチョップバーガー", "포크찹 번"),
    ],
    travels: [
      L("歷史城區", "Historic Centre", "歴史地区", "역사 지구"),
      L("美食之旅", "Food Tour", "グルメ旅", "미식 여행"),
    ],
    heightCm: { male: [166, 183], female: [154, 171] },
    weightKg: { male: [59, 88], female: [45, 71] },
    incomeBands: ["MOP$12,000-MOP$19,000", "MOP$19,000-MOP$30,000", "MOP$30,000-MOP$48,000", "MOP$48,000-MOP$75,000"],
    usesBloodType: true,
    usesEthnicity: false,
    schools: ["University of Macau", "Macao Polytechnic University", "Macau University of Science and Technology"],
    majors: [
      L("旅遊管理", "Tourism Management", "観光経営", "관광경영"),
      L("葡語研究", "Portuguese Studies", "ポルトガル語学", "포르투갈어학"),
    ],
  },
  {
    code: "JP",
    name: L("日本", "Japan", "日本", "일본"),
    nationality: L("日本", "Japanese", "日本人", "일본인"),
    language: L("日语", "Japanese", "日本語", "일본어"),
    currency: "JPY",
    currencyLabel: L("¥", "¥", "¥", "¥"),
    locale: ["ja"],
    phone: { code: "81", nationalDigits: 10, groups: [2, 4, 4], trunkPrefix: "0" },
    postalStyle: "jp",
    postalDisabled: false,
    address: {
      template: ["{postal}", "{state}{city}{street}", "{country}"],
      adminLabel: L("都道府県", "Prefecture", "都道府県", "도도부현"),
    },
    id: {
      name: L("个人编号 (マイナンバー)", "My Number", "マイナンバー", "마이넘버"),
      format: "12 桁",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("日本裔", "Japanese", "日本系", "일본계"),
      L("混血", "Mixed", "混血", "혼혈"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("寿司", "Sushi", "寿司", "초밥"),
      L("拉面", "Ramen", "ラーメン", "라면"),
    ],
    travels: [
      L("温泉旅行", "Onsen Trip", "温泉旅行", "온천 여행"),
      L("赏樱", "Cherry Blossom Viewing", "花見", "벚꽃 구경"),
    ],
    heightCm: { male: [165, 183], female: [152, 169] },
    weightKg: { male: [56, 88], female: [42, 68] },
    incomeBands: ["20万-32万円", "32万-48万円", "48万-70万円", "70万-105万円"],
    usesBloodType: true,
    usesEthnicity: false,
    schools: ["東京大学", "京都大学", "早稲田大学", "慶應義塾大学"],
    majors: [
      L("情報工学", "Information Engineering", "情報工学", "정보공학"),
      L("経済学", "Economics", "経済学", "경제학"),
    ],
  },
  {
    code: "KR",
    name: L("韩国", "South Korea", "韓国", "대한민국"),
    nationality: L("韩国", "Korean", "韓国人", "한국인"),
    language: L("韩语", "Korean", "韓国語", "한국어"),
    currency: "KRW",
    currencyLabel: L("₩", "₩", "₩", "₩"),
    locale: ["ko"],
    phone: { code: "82", nationalDigits: 10, groups: [2, 4, 4], trunkPrefix: "0" },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{state}{city}{street}", "{postal}", "{country}"],
      adminLabel: L("道 / 广域市", "Province", "道 / 広域市", "도 / 광역시"),
    },
    id: {
      name: L("居民登录号", "Resident Registration Number", "住民登録番号", "주민등록번호"),
      format: "######-#######",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("韩裔", "Korean", "韓国系", "한국계"),
      L("多元文化家庭", "Multicultural Family", "多文化家庭", "다문화 가정"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("泡菜", "Kimchi", "キムチ", "김치"),
      L("烤肉", "Korean BBQ", "韓国焼肉", "삼겹살"),
    ],
    travels: [
      L("周末露营", "Weekend Camping", "週末キャンプ", "주말 캠핑"),
      L("国内旅行", "Domestic Travel", "国内旅行", "국내 여행"),
    ],
    heightCm: { male: [168, 185], female: [155, 171] },
    weightKg: { male: [61, 92], female: [45, 72] },
    incomeBands: ["220만-320만원", "320만-450만원", "450만-650만원", "650만-950만원"],
    usesBloodType: true,
    usesEthnicity: false,
    schools: ["서울대학교", "연세대학교", "고려대학교", "한국과학기술원"],
    majors: [
      L("컴퓨터공학", "Computer Engineering", "コンピュータ工学", "컴퓨터공학"),
      L("경영학", "Business Administration", "経営学", "경영학"),
    ],
  },
  {
    code: "IN",
    name: L("印度", "India", "インド", "인도"),
    nationality: L("印度", "Indian", "インド人", "인도인"),
    language: L("英语 / 印地语", "English / Hindi", "英語・ヒンディー語", "영어 / 힌디어"),
    currency: "INR",
    currencyLabel: L("₹", "₹", "₹", "₹"),
    locale: ["en_IN"],
    phone: { code: "91", nationalDigits: 10, groups: [5, 5] },
    postalStyle: "numeric6",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city}, {state}", "{postal}", "{country}"],
      adminLabel: L("邦", "State", "州", "주"),
    },
    id: {
      name: L("永久账号 (PAN)", "Permanent Account Number", "永久口座番号", "영구 계좌 번호"),
      format: "LLLLL####L",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("印度-雅利安", "Indo-Aryan", "インド・アーリア系", "인도-아리아계"),
      L("达罗毗荼", "Dravidian", "ドラヴィダ系", "드라비다계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("咖喱", "Curry", "カレー", "카레"),
      L("印度饼", "Naan", "ナン", "난"),
    ],
    travels: [
      L("朝圣之旅", "Pilgrimage", "巡礼", "순례 여행"),
      L("山地避暑", "Hill Station", "ヒルステーション", "힐 스테이션"),
    ],
    heightCm: { male: [163, 182], female: [151, 168] },
    weightKg: { male: [55, 88], female: [43, 72] },
    incomeBands: ["25,000-45,000 ₹", "45,000-75,000 ₹", "75,000-125,000 ₹", "125,000-200,000 ₹"],
    usesBloodType: true,
    usesEthnicity: false,
    schools: ["Indian Institute of Technology Bombay", "University of Delhi", "Indian Institute of Science"],
    majors: [
      L("信息技术", "Information Technology", "情報技術", "정보기술"),
      L("药学", "Pharmacy", "薬学", "약학"),
    ],
  },
  {
    code: "ID",
    name: L("印度尼西亚", "Indonesia", "インドネシア", "인도네시아"),
    nationality: L("印度尼西亚", "Indonesian", "インドネシア人", "인도네시아인"),
    language: L("印尼语", "Indonesian", "インドネシア語", "인도네시아어"),
    currency: "IDR",
    currencyLabel: L("Rp", "Rp", "Rp", "Rp"),
    locale: ["id_ID"],
    phone: { code: "62", nationalDigits: 10, groups: [3, 3, 4], trunkPrefix: "0" },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city}, {state}", "{postal}", "{country}"],
      adminLabel: L("省", "Province", "州", "주"),
    },
    id: {
      name: L("身份证号 (NIK)", "National ID (NIK)", "国民ID番号", "국민 ID 번호"),
      format: "16 位数字",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("爪哇裔", "Javanese", "ジャワ系", "자바계"),
      L("巽他裔", "Sundanese", "スンダ系", "순다계"),
      L("华裔", "Chinese Indonesian", "中国系", "중국계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("炒饭", "Nasi Goreng", "ナシゴレン", "나시고렝"),
      L("沙嗲", "Satay", "サテ", "사테"),
    ],
    travels: [
      L("海岛度假", "Island Resort", "アイランドリゾート", "섬 휴양지"),
      L("火山徒步", "Volcano Trek", "火山トレッキング", "화산 트레킹"),
    ],
    heightCm: { male: [160, 179], female: [149, 166] },
    weightKg: { male: [54, 85], female: [43, 70] },
    incomeBands: ["Rp5.000.000-Rp8.500.000", "Rp8.500.000-Rp14.000.000", "Rp14.000.000-Rp22.000.000", "Rp22.000.000-Rp35.000.000"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Universitas Indonesia", "Institut Teknologi Bandung", "Universitas Gadjah Mada"],
    majors: [
      L("Teknik Informatika", "Informatics Engineering", "情報工学", "정보공학"),
      L("Manajemen", "Management", "経営学", "경영학"),
    ],
  },
  {
    code: "MY",
    name: L("马来西亚", "Malaysia", "マレーシア", "말레이시아"),
    nationality: L("马来西亚", "Malaysian", "マレーシア人", "말레이시아인"),
    language: L("马来语 / 英语", "Malay / English", "マレー語・英語", "말레이어 / 영어"),
    currency: "MYR",
    currencyLabel: L("RM", "RM", "RM", "RM"),
    locale: ["en", "en_IN"],
    phone: { code: "60", nationalDigits: 9, groups: [2, 4, 4], trunkPrefix: "0" },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{state}", "{country}"],
      adminLabel: L("州", "State", "州", "주"),
    },
    id: {
      name: L("身份证号 (MyKad)", "Identity Card Number", "身分証番号", "신분증 번호"),
      format: "######-##-####",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("马来裔", "Malay", "マレー系", "말레이계"),
      L("华裔", "Chinese Malaysian", "中国系", "중국계"),
      L("印度裔", "Indian Malaysian", "インド系", "인도계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("椰浆饭", "Nasi Lemak", "ナシレマ", "나시 르막"),
      L("叻沙", "Laksa", "ラクサ", "락사"),
    ],
    travels: [
      L("海岛度假", "Island Resort", "アイランドリゾート", "섬 휴양지"),
      L("美食之旅", "Food Tour", "グルメ旅", "미식 여행"),
    ],
    heightCm: { male: [161, 180], female: [150, 167] },
    weightKg: { male: [56, 88], female: [44, 72] },
    incomeBands: ["RM2,500-RM4,000", "RM4,000-RM6,500", "RM6,500-RM10,000", "RM10,000-RM16,000"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Universiti Malaya", "Universiti Teknologi Malaysia", "Universiti Sains Malaysia"],
    majors: [
      L("Kejuruteraan Perisian", "Software Engineering", "ソフトウェア工学", "소프트웨어공학"),
      L("Perakaunan", "Accounting", "会計学", "회계학"),
    ],
  },
  {
    code: "SG",
    name: L("新加坡", "Singapore", "シンガポール", "싱가포르"),
    nationality: L("新加坡", "Singaporean", "シンガポール人", "싱가포르인"),
    language: L("英语 / 华语", "English / Mandarin", "英語・中国語", "영어 / 중국어"),
    currency: "SGD",
    currencyLabel: L("S$", "S$", "S$", "S$"),
    locale: ["en", "en_IN", "zh_CN"],
    phone: { code: "65", nationalDigits: 8, groups: [4, 4] },
    postalStyle: "numeric6",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city} {postal}", "{country}"],
      adminLabel: L("区域", "Region", "地域", "지역"),
    },
    id: {
      name: L("身份证号 (NRIC)", "NRIC Number", "国民登録番号", "국민등록번호"),
      format: "L#######L",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("华裔", "Chinese Singaporean", "中国系", "중국계"),
      L("马来裔", "Malay Singaporean", "マレー系", "말레이계"),
      L("印度裔", "Indian Singaporean", "インド系", "인도계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("海南鸡饭", "Hainanese Chicken Rice", "海南鶏飯", "하이난 치킨 라이스"),
      L("辣椒螃蟹", "Chilli Crab", "チリクラブ", "칠리 크랩"),
    ],
    travels: [
      L("区域短途", "Regional Getaway", "近場旅行", "근거리 여행"),
      L("城市漫步", "City Stroll", "街歩き", "도시 산책"),
    ],
    heightCm: { male: [166, 182], female: [155, 170] },
    weightKg: { male: [60, 88], female: [46, 72] },
    incomeBands: ["S$3,000-S$4,800", "S$4,800-S$7,200", "S$7,200-S$11,000", "S$11,000-S$17,000"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["National University of Singapore", "Nanyang Technological University", "Singapore Management University"],
    majors: [
      L("金融学", "Finance", "ファイナンス", "금융학"),
      L("计算机科学", "Computer Science", "情報科学", "컴퓨터과학"),
    ],
  },
  {
    code: "TH",
    name: L("泰国", "Thailand", "タイ", "태국"),
    nationality: L("泰国", "Thai", "タイ人", "태국인"),
    language: L("泰语", "Thai", "タイ語", "태국어"),
    currency: "THB",
    currencyLabel: L("฿", "฿", "฿", "฿"),
    locale: ["th"],
    phone: { code: "66", nationalDigits: 9, groups: [2, 3, 4], trunkPrefix: "0" },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city}", "{state} {postal}", "{country}"],
      adminLabel: L("府", "Province", "県", "주"),
    },
    id: {
      name: L("公民身份证号", "Citizen ID Number", "国民ID番号", "시민 ID 번호"),
      format: "#-####-#####-##-#",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("泰裔", "Thai", "タイ系", "타이계"),
      L("华裔", "Thai Chinese", "中国系", "중국계"),
      L("高棉裔", "Khmer", "クメール系", "크메르계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("泰式炒河粉", "Pad Thai", "パッタイ", "팟타이"),
      L("冬阴功", "Tom Yum", "トムヤム", "똠얌"),
    ],
    travels: [
      L("海岛度假", "Island Resort", "アイランドリゾート", "섬 휴양지"),
      L("寺庙参访", "Temple Visit", "寺院巡り", "사원 방문"),
    ],
    heightCm: { male: [163, 180], female: [152, 168] },
    weightKg: { male: [56, 86], female: [44, 70] },
    incomeBands: ["20,000-32,000 ฿", "32,000-52,000 ฿", "52,000-85,000 ฿", "85,000-140,000 ฿"],
    usesBloodType: true,
    usesEthnicity: false,
    schools: ["Chulalongkorn University", "Mahidol University", "Kasetsart University"],
    majors: [
      L("วิศวกรรมคอมพิวเตอร์", "Computer Engineering", "コンピュータ工学", "컴퓨터공학"),
      L("การจัดการ", "Management", "経営学", "경영학"),
    ],
  },
  {
    code: "VN",
    name: L("越南", "Vietnam", "ベトナム", "베트남"),
    nationality: L("越南", "Vietnamese", "ベトナム人", "베트남인"),
    language: L("越南语", "Vietnamese", "ベトナム語", "베트남어"),
    currency: "VND",
    currencyLabel: L("₫", "₫", "₫", "₫"),
    locale: ["vi"],
    phone: { code: "84", nationalDigits: 9, groups: [3, 3, 3], trunkPrefix: "0" },
    postalStyle: "numeric6",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city}", "{state}", "{country}"],
      adminLabel: L("省 / 市", "Province", "省", "성"),
    },
    id: {
      name: L("公民身份证号", "Citizen Identity Card", "国民身分証番号", "시민 신분증 번호"),
      format: "12 位数字",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("京族", "Kinh", "キン族", "킨족"),
      L("岱依族", "Tày", "タイー族", "따이족"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("河粉", "Pho", "フォー", "퍼"),
      L("越式法包", "Banh Mi", "バインミー", "반미"),
    ],
    travels: [
      L("海湾巡游", "Bay Cruise", "湾クルーズ", "만 크루즈"),
      L("梯田徒步", "Terraced Field Trek", "棚田トレッキング", "계단식 논 트레킹"),
    ],
    heightCm: { male: [162, 179], female: [150, 166] },
    weightKg: { male: [54, 82], female: [42, 66] },
    incomeBands: ["8.000.000-13.000.000 ₫", "13.000.000-21.000.000 ₫", "21.000.000-34.000.000 ₫", "34.000.000-55.000.000 ₫"],
    usesBloodType: false,
    usesEthnicity: false,
    schools: ["Vietnam National University", "Hanoi University of Science and Technology", "RMIT Vietnam"],
    majors: [
      L("Khoa học máy tính", "Computer Science", "情報科学", "컴퓨터과학"),
      L("Quản trị kinh doanh", "Business Administration", "経営学", "경영학"),
    ],
  },
  {
    code: "AE",
    name: L("阿联酋", "United Arab Emirates", "アラブ首長国連邦", "아랍에미리트"),
    nationality: L("阿联酋", "Emirati", "アラブ首長国連邦人", "에미리트인"),
    language: L("阿拉伯语 / 英语", "Arabic / English", "アラビア語・英語", "아랍어 / 영어"),
    currency: "AED",
    currencyLabel: L("AED", "AED", "AED", "AED"),
    locale: ["ar", "en"],
    phone: { code: "971", nationalDigits: 9, groups: [2, 3, 4], trunkPrefix: "0" },
    postalStyle: "none",
    postalDisabled: true,
    address: {
      template: ["{street}", "{city}", "{state}", "{country}"],
      adminLabel: L("酋长国", "Emirate", "首長国", "에미리트"),
    },
    id: {
      name: L("身份证号 (Emirates ID)", "Emirates ID", "エミレーツID", "에미리트 ID"),
      format: "784-####-#######-#",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("阿联酋籍", "Emirati", "アラブ首長国連邦系", "에미리트계"),
      L("南亚裔", "South Asian", "南アジア系", "남아시아계"),
      L("阿拉伯裔", "Arab Expatriate", "アラブ系", "아랍계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("沙威玛", "Shawarma", "シャワルマ", "샤와르마"),
      L("烤肉拼盘", "Mixed Grill", "ミックスグリル", "믹스 그릴"),
    ],
    travels: [
      L("沙漠冲沙", "Desert Safari", "デザートサファリ", "사막 사파리"),
      L("购物中心", "Shopping Mall", "ショッピングモール", "쇼핑몰"),
    ],
    heightCm: { male: [168, 187], female: [155, 172] },
    weightKg: { male: [62, 95], female: [48, 78] },
    incomeBands: ["AED 8,000-AED 13,000", "AED 13,000-AED 21,000", "AED 21,000-AED 34,000", "AED 34,000-AED 55,000"],
    usesBloodType: false,
    usesEthnicity: true,
    schools: ["United Arab Emirates University", "American University of Sharjah", "Khalifa University"],
    majors: [
      L("石油工程", "Petroleum Engineering", "石油工学", "석유공학"),
      L("国际商务", "International Business", "国際ビジネス", "국제경영"),
    ],
  },
  {
    code: "SA",
    name: L("沙特阿拉伯", "Saudi Arabia", "サウジアラビア", "사우디아라비아"),
    nationality: L("沙特阿拉伯", "Saudi", "サウジアラビア人", "사우디인"),
    language: L("阿拉伯语", "Arabic", "アラビア語", "아랍어"),
    currency: "SAR",
    currencyLabel: L("SAR", "SAR", "SAR", "SAR"),
    locale: ["ar"],
    phone: { code: "966", nationalDigits: 9, groups: [2, 3, 4], trunkPrefix: "0" },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city} {postal}", "{state}", "{country}"],
      adminLabel: L("省", "Province", "州", "주"),
    },
    id: {
      name: L("国民身份证号", "National ID Number", "国民ID番号", "국민 ID 번호"),
      format: "##########",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("沙特籍", "Saudi", "サウジ系", "사우디계"),
      L("外籍居民", "Expatriate Resident", "外国人居住者", "외국인 거주자"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("手抓饭", "Kabsa", "カブサ", "캅사"),
      L("椰枣", "Dates", "ナツメヤシ", "대추야자"),
    ],
    travels: [
      L("沙漠露营", "Desert Camping", "砂漠キャンプ", "사막 캠핑"),
      L("朝觐", "Pilgrimage", "巡礼", "순례"),
    ],
    heightCm: { male: [166, 186], female: [153, 171] },
    weightKg: { male: [61, 96], female: [47, 80] },
    incomeBands: ["SAR 5,000-SAR 8,500", "SAR 8,500-SAR 14,000", "SAR 14,000-SAR 22,000", "SAR 22,000-SAR 36,000"],
    usesBloodType: false,
    usesEthnicity: false,
    schools: ["King Saud University", "King Abdullah University of Science and Technology", "King Fahd University of Petroleum and Minerals"],
    majors: [
      L("石油工程", "Petroleum Engineering", "石油工学", "석유공학"),
      L("伊斯兰金融", "Islamic Finance", "イスラム金融", "이슬람 금융"),
    ],
  },
  {
    code: "IL",
    name: L("以色列", "Israel", "イスラエル", "이스라엘"),
    nationality: L("以色列", "Israeli", "イスラエル人", "이스라엘인"),
    language: L("希伯来语", "Hebrew", "ヘブライ語", "히브리어"),
    currency: "ILS",
    currencyLabel: L("₪", "₪", "₪", "₪"),
    locale: ["he"],
    phone: { code: "972", nationalDigits: 9, groups: [2, 3, 4], trunkPrefix: "0" },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city} {postal}", "{country}"],
      adminLabel: L("区", "District", "地区", "지구"),
    },
    id: {
      name: L("国民身份证号", "National ID Number", "国民ID番号", "국민 ID 번호"),
      format: "#########",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("犹太裔", "Jewish", "ユダヤ系", "유대계"),
      L("阿拉伯裔", "Arab Israeli", "アラブ系", "아랍계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("鹰嘴豆泥", "Hummus", "フムス", "후무스"),
      L("法拉费", "Falafel", "ファラフェル", "팔라펠"),
    ],
    travels: [
      L("历史遗迹", "Heritage Sites", "史跡巡り", "유적지 여행"),
      L("死海度假", "Dead Sea Retreat", "死海リゾート", "사해 휴양"),
    ],
    heightCm: { male: [168, 187], female: [156, 173] },
    weightKg: { male: [63, 94], female: [49, 76] },
    incomeBands: ["7,000-11,000 ₪", "11,000-17,000 ₪", "17,000-26,000 ₪", "26,000-40,000 ₪"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Hebrew University of Jerusalem", "Tel Aviv University", "Technion – Israel Institute of Technology"],
    majors: [
      L("网络安全", "Cybersecurity", "サイバーセキュリティ", "사이버보안"),
      L("生物医学工程", "Biomedical Engineering", "生体医工学", "생체의공학"),
    ],
  },
  {
    code: "TR",
    name: L("土耳其", "Turkey", "トルコ", "튀르키예"),
    nationality: L("土耳其", "Turkish", "トルコ人", "터키인"),
    language: L("土耳其语", "Turkish", "トルコ語", "터키어"),
    currency: "TRY",
    currencyLabel: L("₺", "₺", "₺", "₺"),
    locale: ["tr"],
    phone: { code: "90", nationalDigits: 10, groups: [3, 3, 4], trunkPrefix: "0" },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{postal} {city}", "{state}", "{country}"],
      adminLabel: L("省", "Province", "県", "주"),
    },
    id: {
      name: L("国民身份证号 (T.C. Kimlik)", "National ID Number", "国民ID番号", "국민 ID 번호"),
      format: "###########",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("土耳其裔", "Turkish", "トルコ系", "터키계"),
      L("库尔德裔", "Kurdish", "クルド系", "쿠르드계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("烤肉", "Kebab", "ケバブ", "케밥"),
      L("土耳其软糖", "Turkish Delight", "トルコ菓子", "터키시 딜라이트"),
    ],
    travels: [
      L("热气球", "Hot Air Balloon", "熱気球", "열기구"),
      L("海岸度假", "Coastal Holiday", "海岸休暇", "해안 휴가"),
    ],
    heightCm: { male: [168, 187], female: [156, 173] },
    weightKg: { male: [66, 100], female: [51, 80] },
    incomeBands: ["18,000-28,000 ₺", "28,000-45,000 ₺", "45,000-72,000 ₺", "72,000-115,000 ₺"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Boğaziçi University", "Middle East Technical University", "Istanbul Technical University"],
    majors: [
      L("Bilgisayar Mühendisliği", "Computer Engineering", "コンピュータ工学", "컴퓨터공학"),
      L("İşletme", "Business Administration", "経営学", "경영학"),
    ],
  },
  {
    code: "BR",
    name: L("巴西", "Brazil", "ブラジル", "브라질"),
    nationality: L("巴西", "Brazilian", "ブラジル人", "브라질인"),
    language: L("葡萄牙语", "Portuguese", "ポルトガル語", "포르투갈어"),
    currency: "BRL",
    currencyLabel: L("R$", "R$", "R$", "R$"),
    locale: ["pt_BR"],
    phone: { code: "55", nationalDigits: 11, groups: [2, 5, 4] },
    postalStyle: "br",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city} - {stateCode}", "{postal}", "{country}"],
      adminLabel: L("州", "State", "州", "주"),
    },
    id: {
      name: L("个人税号 (CPF)", "Tax ID (CPF)", "個人税番号", "개인 세금 번호"),
      format: "###.###.###-##",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("白人", "White Brazilian", "白人", "백인"),
      L("混血", "Pardo / Mixed", "混血", "혼혈"),
      L("非裔", "Black Brazilian", "アフリカ系", "흑인"),
      L("日裔", "Japanese Brazilian", "日系", "일본계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("烤肉", "Churrasco", "シュラスコ", "슈하스코"),
      L("黑豆炖肉", "Feijoada", "フェジョアーダ", "페이조아다"),
    ],
    travels: [
      L("海滩度假", "Beach Holiday", "ビーチ休暇", "해변 휴가"),
      L("狂欢节", "Carnival", "カーニバル", "카니발"),
    ],
    heightCm: { male: [167, 187], female: [155, 172] },
    weightKg: { male: [64, 100], female: [50, 82] },
    incomeBands: ["R$3,000-R$5,000", "R$5,000-R$8,500", "R$8,500-R$14,000", "R$14,000-R$23,000"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Universidade de São Paulo", "Universidade Estadual de Campinas", "Universidade Federal do Rio de Janeiro"],
    majors: [
      L("Ciência da Computação", "Computer Science", "情報科学", "컴퓨터과학"),
      L("Engenharia Civil", "Civil Engineering", "土木工学", "토목공학"),
    ],
  },
  {
    code: "MX",
    name: L("墨西哥", "Mexico", "メキシコ", "멕시코"),
    nationality: L("墨西哥", "Mexican", "メキシコ人", "멕시코인"),
    language: L("西班牙语", "Spanish", "スペイン語", "스페인어"),
    currency: "MXN",
    currencyLabel: L("MX$", "MX$", "MX$", "MX$"),
    locale: ["es_MX"],
    phone: { code: "52", nationalDigits: 10, groups: [2, 4, 4] },
    postalStyle: "numeric5",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city}, {state}", "{postal}", "{country}"],
      adminLabel: L("州", "State", "州", "주"),
    },
    id: {
      name: L("人口登记码 (CURP)", "Population Registry Code", "人口登録コード", "인구 등록 코드"),
      format: "LLLL######LLLLL##",
      hasRealChecksum: false,
    },
    ethnicities: [
      L("混血", "Mestizo", "メスティソ", "메스티소"),
      L("原住民", "Indigenous", "先住民", "원주민"),
      L("欧洲裔", "White Mexican", "ヨーロッパ系", "유럽계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("塔可", "Tacos", "タコス", "타코"),
      L("玉米粽", "Tamales", "タマレス", "타말레"),
    ],
    travels: [
      L("海滩度假", "Beach Holiday", "ビーチ休暇", "해변 휴가"),
      L("玛雅遗址", "Mayan Ruins", "マヤ遺跡", "마야 유적"),
    ],
    heightCm: { male: [163, 181], female: [151, 167] },
    weightKg: { male: [60, 92], female: [47, 75] },
    incomeBands: ["MX$8,000-MX$13,000", "MX$13,000-MX$21,000", "MX$21,000-MX$34,000", "MX$34,000-MX$55,000"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["Universidad Nacional Autónoma de México", "Tecnológico de Monterrey", "Instituto Politécnico Nacional"],
    majors: [
      L("Ingeniería en Sistemas", "Systems Engineering", "システム工学", "시스템공학"),
      L("Administración", "Business Administration", "経営学", "경영학"),
    ],
  },
  {
    code: "ZA",
    name: L("南非", "South Africa", "南アフリカ", "남아프리카"),
    nationality: L("南非", "South African", "南アフリカ人", "남아프리카인"),
    language: L("英语 / 南非荷兰语", "English / Afrikaans", "英語・アフリカーンス語", "영어 / 아프리칸스어"),
    currency: "ZAR",
    currencyLabel: L("R", "R", "R", "R"),
    locale: ["en_ZA"],
    phone: { code: "27", nationalDigits: 9, groups: [2, 3, 4], trunkPrefix: "0" },
    postalStyle: "numeric4",
    postalDisabled: false,
    address: {
      template: ["{street}", "{city}", "{state} {postal}", "{country}"],
      adminLabel: L("省", "Province", "州", "주"),
    },
    id: {
      name: L("身份证号", "Identity Number", "身分証番号", "신분증 번호"),
      format: "######-####-###",
      hasRealChecksum: true,
    },
    ethnicities: [
      L("非洲裔", "Black African", "アフリカ系", "아프리카계"),
      L("有色人种", "Coloured", "カラード", "컬러드"),
      L("白人", "White South African", "白人", "백인"),
      L("印度裔", "Indian South African", "インド系", "인도계"),
    ],
    skills: EN_SKILLS,
    interests: EN_INTERESTS,
    traits: EN_TRAITS,
    foods: [
      L("烤肉", "Braai", "ブライ", "브라이"),
      L("香肠", "Boerewors", "ボーアボルス", "부어보르스"),
    ],
    travels: [
      L("野生动物园", "Safari", "サファリ", "사파리"),
      L("葡萄园", "Winelands", "ワインランド", "와인 지역"),
    ],
    heightCm: { male: [165, 186], female: [155, 173] },
    weightKg: { male: [60, 95], female: [50, 82] },
    incomeBands: ["R8,000-R14,000", "R14,000-R24,000", "R24,000-R40,000", "R40,000-R65,000"],
    usesBloodType: true,
    usesEthnicity: true,
    schools: ["University of Cape Town", "University of the Witwatersrand", "Stellenbosch University"],
    majors: [
      L("采矿工程", "Mining Engineering", "鉱山工学", "광산공학"),
      L("会计", "Accounting", "会計学", "회계학"),
    ],
  },
];

/** Fast lookup by ISO code. */
export const COUNTRY_BY_CODE: Record<string, CountrySpec> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c]),
);

/** ISO codes in registry order. */
export const COUNTRY_CODES: string[] = COUNTRIES.map((c) => c.code);
