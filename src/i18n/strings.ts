/**
 * UI strings for the four supported languages.
 *
 * These are interface labels only. Generated *values* are localized separately
 * (see src/lib/registry.ts) so that a Chinese-speaking user generating a
 * German identity still sees German field values with Chinese labels.
 */

import type { SiteLang } from "../config";

export interface Strings {
  // header
  brand: string;
  navGenerate: string;
  navCountries: string;
  navCredits: string;
  langLabel: string;

  // hero
  heroTitle: string;
  heroSub: string;
  badgeNoSignup: string;
  badgeCountries: string;
  badgeOffline: string;

  // controls
  selectCountry: string;
  selectDivision: string;
  selectGender: string;
  genderAny: string;
  genderMale: string;
  genderFemale: string;
  divisionAny: string;
  generate: string;
  regenerate: string;

  // result card
  resultTitle: string;
  copyAll: string;
  copyJson: string;
  downloadCsv: string;
  copy: string;
  copied: string;

  // groups
  groupIdentity: string;
  groupAddress: string;
  groupCredit: string;
  groupEducation: string;
  groupEmployment: string;
  groupLifestyle: string;
  groupPersonal: string;
  groupOnline: string;
  groupSocial: string;

  // notices
  disclaimerTitle: string;
  disclaimerBody: string;
  formatOnly: string;
  syntheticPostal: string;
  seedLabel: string;
  seedHint: string;
  /** Summary card meta labels. */
  summaryAge: string;
  summaryDob: string;
  emptyState: string;

  // keyboard
  shortcutHint: string;

  // pages
  aboutTitle: string;
  contactTitle: string;
  privacyTitle: string;
  termsTitle: string;
  creditsTitle: string;
  countriesTitle: string;
  countriesSub: string;

  // footer
  footerNote: string;
  footerRights: string;
  linkAbout: string;
  linkContact: string;
  linkPrivacy: string;
  linkTerms: string;
  linkCredits: string;
  linkCountries: string;

  // errors
  errNoData: string;
  errCopyFailed: string;
}

const zh: Strings = {
  brand: "Aimei",
  navGenerate: "生成器",
  navCountries: "国家",
  navCredits: "数据来源",
  langLabel: "语言",

  heroTitle: "身份与地址生成器",
  heroSub: "生成 34 个国家和地区的真实格式身份信息，涵盖姓名、地址、证件号、职业与在线资料，全部字段保持内部一致。",
  badgeNoSignup: "无需注册",
  badgeCountries: "34 个国家和地区",
  badgeOffline: "本地生成",

  selectCountry: "国家 / 地区",
  selectDivision: "行政区",
  selectGender: "性别",
  genderAny: "随机",
  genderMale: "男",
  genderFemale: "女",
  divisionAny: "随机",
  generate: "生成",
  regenerate: "换一个",

  resultTitle: "生成结果",
  copyAll: "复制全部",
  copyJson: "复制 JSON",
  downloadCsv: "导出 CSV",

  copy: "复制",
  copied: "已复制",

  groupIdentity: "身份信息",
  groupAddress: "地址与联系方式",
  groupCredit: "信用卡信息",
  groupEducation: "教育信息",
  groupEmployment: "职业信息",
  groupLifestyle: "生活方式",
  groupPersonal: "个人信息",
  groupOnline: "在线资料",
  groupSocial: "社交媒体",

  disclaimerTitle: "使用说明",
  disclaimerBody: "本工具生成的全部信息均为程序合成的虚拟数据，不对应任何真实个人、住址或账户。仅用于软件测试、表单演示与数据填充。",
  formatOnly: "仅格式",
  syntheticPostal: "无权威数据，按格式生成",
  seedLabel: "种子",
  seedHint: "相同种子可复现同一结果",
  summaryAge: "年龄",
  summaryDob: "出生日期",
  emptyState: "选择国家与行政区后点击「生成」",

  shortcutHint: "按 R 重新生成，按 C 复制全部",

  aboutTitle: "关于我们",
  contactTitle: "联系我们",
  privacyTitle: "隐私政策",
  termsTitle: "服务条款",
  creditsTitle: "数据来源",
  countriesTitle: "支持的国家和地区",
  countriesSub: "共 34 个国家和地区，覆盖北美、欧洲、亚太、中东与拉美。",

  footerNote: "全部数据由程序合成，仅供测试使用。",
  footerRights: "保留所有权利。",
  linkAbout: "关于我们",
  linkContact: "联系我们",
  linkPrivacy: "隐私政策",
  linkTerms: "服务条款",
  linkCredits: "数据来源",
  linkCountries: "国家列表",

  errNoData: "暂无数据，请先生成",
  errCopyFailed: "复制失败，请手动选择文本",
};

const en: Strings = {
  brand: "Aimei",
  navGenerate: "Generator",
  navCountries: "Countries",
  navCredits: "Data",
  langLabel: "Language",

  heroTitle: "Identity & Address Generator",
  heroSub: "Generate realistic-format identity data for 34 countries and regions — names, addresses, national IDs, employment and online profiles, with every field internally consistent.",
  badgeNoSignup: "No sign-up",
  badgeCountries: "34 countries",
  badgeOffline: "Runs locally",

  selectCountry: "Country / Region",
  selectDivision: "Administrative division",
  selectGender: "Gender",
  genderAny: "Random",
  genderMale: "Male",
  genderFemale: "Female",
  divisionAny: "Random",
  generate: "Generate",
  regenerate: "Another one",

  resultTitle: "Generated identity",
  copyAll: "Copy all",
  copyJson: "Copy JSON",
  downloadCsv: "Download CSV",

  copy: "Copy",
  copied: "Copied",

  groupIdentity: "Identity",
  groupAddress: "Address & contact",
  groupCredit: "Credit card",
  groupEducation: "Education",
  groupEmployment: "Employment",
  groupLifestyle: "Lifestyle",
  groupPersonal: "Personal details",
  groupOnline: "Online profile",
  groupSocial: "Social media",

  disclaimerTitle: "How to use this",
  disclaimerBody: "Everything generated here is synthetic data produced by an algorithm. It does not correspond to any real person, address or account. Use it for software testing, form demos and data seeding.",
  formatOnly: "Format only",
  syntheticPostal: "No authoritative data; format-correct",
  seedLabel: "Seed",
  seedHint: "The same seed reproduces the same identity",
  summaryAge: "Age",
  summaryDob: "Date of birth",
  emptyState: "Choose a country and division, then select Generate",

  shortcutHint: "Press R to regenerate, C to copy everything",

  aboutTitle: "About",
  contactTitle: "Contact",
  privacyTitle: "Privacy Policy",
  termsTitle: "Terms of Service",
  creditsTitle: "Data sources",
  countriesTitle: "Supported countries and regions",
  countriesSub: "34 countries and regions across North America, Europe, Asia-Pacific, the Middle East and Latin America.",

  footerNote: "All data is synthesised by this tool and is for testing only.",
  footerRights: "All rights reserved.",
  linkAbout: "About",
  linkContact: "Contact",
  linkPrivacy: "Privacy",
  linkTerms: "Terms",
  linkCredits: "Data sources",
  linkCountries: "Countries",

  errNoData: "Nothing generated yet",
  errCopyFailed: "Copy failed — please select the text manually",
};

const ja: Strings = {
  brand: "Aimei",
  navGenerate: "ジェネレーター",
  navCountries: "国",
  navCredits: "データ",
  langLabel: "言語",

  heroTitle: "アイデンティティ・住所ジェネレーター",
  heroSub: "34 の国と地域の実際の形式に沿った身元情報を生成します。氏名、住所、公的番号、職業、オンラインプロフィールまで、すべての項目が内部的に整合しています。",
  badgeNoSignup: "登録不要",
  badgeCountries: "34 の国と地域",
  badgeOffline: "ローカル生成",

  selectCountry: "国 / 地域",
  selectDivision: "行政区",
  selectGender: "性別",
  genderAny: "ランダム",
  genderMale: "男性",
  genderFemale: "女性",
  divisionAny: "ランダム",
  generate: "生成",
  regenerate: "もう一つ",

  resultTitle: "生成結果",
  copyAll: "すべてコピー",
  copyJson: "JSON をコピー",
  downloadCsv: "CSV をダウンロード",

  copy: "コピー",
  copied: "コピーしました",

  groupIdentity: "身元情報",
  groupAddress: "住所と連絡先",
  groupCredit: "クレジットカード",
  groupEducation: "学歴",
  groupEmployment: "職歴",
  groupLifestyle: "ライフスタイル",
  groupPersonal: "個人情報",
  groupOnline: "オンラインプロフィール",
  groupSocial: "ソーシャルメディア",

  disclaimerTitle: "ご利用にあたって",
  disclaimerBody: "ここで生成される情報はすべてアルゴリズムによる仮想データであり、実在の人物・住所・アカウントとは一切関係ありません。ソフトウェアのテスト、フォームのデモ、データ投入にのみご利用ください。",
  formatOnly: "形式のみ",
  syntheticPostal: "正式データなし（形式準拠）",
  seedLabel: "シード",
  seedHint: "同じシードなら同じ結果を再現できます",
  summaryAge: "年齢",
  summaryDob: "生年月日",
  emptyState: "国と行政区を選び「生成」をクリックしてください",

  shortcutHint: "R で再生成、C ですべてコピー",

  aboutTitle: "運営者情報",
  contactTitle: "お問い合わせ",
  privacyTitle: "プライバシーポリシー",
  termsTitle: "利用規約",
  creditsTitle: "データ出典",
  countriesTitle: "対応している国と地域",
  countriesSub: "北米、ヨーロッパ、アジア太平洋、中東、ラテンアメリカの 34 の国と地域に対応しています。",

  footerNote: "すべてのデータはプログラムによる合成データであり、テスト専用です。",
  footerRights: "All rights reserved.",
  linkAbout: "運営者情報",
  linkContact: "お問い合わせ",
  linkPrivacy: "プライバシー",
  linkTerms: "利用規約",
  linkCredits: "データ出典",
  linkCountries: "国一覧",

  errNoData: "まだ生成されていません",
  errCopyFailed: "コピーに失敗しました。手動で選択してください",
};

const ko: Strings = {
  brand: "Aimei",
  navGenerate: "생성기",
  navCountries: "국가",
  navCredits: "데이터",
  langLabel: "언어",

  heroTitle: "신원 및 주소 생성기",
  heroSub: "34개 국가와 지역의 실제 형식에 맞는 신원 정보를 생성합니다. 이름, 주소, 공적 번호, 직업, 온라인 프로필까지 모든 필드가 내부적으로 일관됩니다.",
  badgeNoSignup: "가입 불필요",
  badgeCountries: "34개 국가·지역",
  badgeOffline: "로컬 생성",

  selectCountry: "국가 / 지역",
  selectDivision: "행정 구역",
  selectGender: "성별",
  genderAny: "무작위",
  genderMale: "남성",
  genderFemale: "여성",
  divisionAny: "무작위",
  generate: "생성",
  regenerate: "다시 생성",

  resultTitle: "생성 결과",
  copyAll: "전체 복사",
  copyJson: "JSON 복사",
  downloadCsv: "CSV 다운로드",

  copy: "복사",
  copied: "복사됨",

  groupIdentity: "신원 정보",
  groupAddress: "주소 및 연락처",
  groupCredit: "신용카드",
  groupEducation: "학력",
  groupEmployment: "경력",
  groupLifestyle: "라이프스타일",
  groupPersonal: "개인 정보",
  groupOnline: "온라인 프로필",
  groupSocial: "소셜 미디어",

  disclaimerTitle: "사용 안내",
  disclaimerBody: "여기서 생성되는 모든 정보는 알고리즘이 만든 가상 데이터이며, 실존하는 인물·주소·계정과 무관합니다. 소프트웨어 테스트, 양식 시연, 데이터 입력 용도로만 사용하세요.",
  formatOnly: "형식만",
  syntheticPostal: "공식 데이터 없음(형식 준수)",
  seedLabel: "시드",
  seedHint: "같은 시드는 같은 결과를 재현합니다",
  summaryAge: "나이",
  summaryDob: "생년월일",
  emptyState: "국가와 행정 구역을 선택한 뒤 '생성'을 누르세요",

  shortcutHint: "R 키로 다시 생성, C 키로 전체 복사",

  aboutTitle: "사이트 소개",
  contactTitle: "문의하기",
  privacyTitle: "개인정보 처리방침",
  termsTitle: "서비스 약관",
  creditsTitle: "데이터 출처",
  countriesTitle: "지원 국가 및 지역",
  countriesSub: "북미, 유럽, 아시아·태평양, 중동, 라틴아메리카의 34개 국가와 지역을 지원합니다.",

  footerNote: "모든 데이터는 프로그램이 합성한 것으로 테스트 전용입니다.",
  footerRights: "All rights reserved.",
  linkAbout: "사이트 소개",
  linkContact: "문의하기",
  linkPrivacy: "개인정보",
  linkTerms: "이용약관",
  linkCredits: "데이터 출처",
  linkCountries: "국가 목록",

  errNoData: "아직 생성된 데이터가 없습니다",
  errCopyFailed: "복사 실패 — 텍스트를 직접 선택하세요",
};

export const STRINGS: Record<SiteLang, Strings> = { zh, en, ja, ko };

export function t(lang: SiteLang): Strings {
  return STRINGS[lang] ?? STRINGS.en;
}
