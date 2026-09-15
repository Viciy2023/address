/**
 * UI strings for the virtual address generator, in all five languages.
 *
 * Its own module, like `i18n/mail.ts` and `i18n/card.ts`: the feature is
 * self-contained and its copy — especially the format explainer, which is
 * written per country at render time — does not belong in the general table.
 *
 * The explanatory text is original prose describing how addresses work in the
 * countries this tool covers. It is not a translation of any reference site.
 */

import type { SiteLang } from "../config.js";

export interface AddressStrings {
  /** Navigation label. */
  nav: string;
  title: string;
  intro: string;

  /* controls */
  countryLabel: string;
  countryRandom: string;
  generate: string;
  regenerate: string;

  /* result card */
  resultTitle: string;
  holderLabel: string;
  fullAddress: string;
  copyAll: string;
  allCopied: string;
  copy: string;
  copied: string;

  /* field labels */
  street: string;
  city: string;
  state: string;
  postal: string;
  country: string;
  phone: string;
  noPostal: string;

  /* feature intro */
  featuresTitle: string;
  features: { title: string; body: string }[];

  /* format explainer */
  formatTitle: string;
  formatAdmin: string;
  formatTemplate: string;
  formatPostal: string;
  formatPhone: string;
  formatIntl: string;
  formatLocal: string;
  postalNone: string;
  /** Appended after a mask, e.g. "（# 为数字，A 为字母）". */
  maskLegend: string;

  /* example */
  exampleTitle: string;
  exampleNote: string;

  /* notes */
  notesTitle: string;
  notes: string[];
  disclaimer: string;
}

export const ADDRESS: Record<SiteLang, AddressStrings> = {
  zh: {
    nav: "虚拟地址",
    title: "虚拟地址生成器",
    intro: "按所选国家的真实地址格式生成完整地址：街道、城市、行政区、邮政编码与电话号码，各字段取自同一地区，彼此一致。适用于注册联调、表单校验与国际化地址展示。",
    countryLabel: "国家 / 地区",
    countryRandom: "随机国家",
    generate: "生成地址",
    regenerate: "换一个地址",
    resultTitle: "生成的虚拟地址",
    holderLabel: "收件人",
    fullAddress: "完整地址",
    copyAll: "复制完整地址",
    allCopied: "已复制完整地址",
    copy: "复制",
    copied: "已复制",
    street: "街道地址",
    city: "城市",
    state: "行政区",
    postal: "邮政编码",
    country: "国家 / 地区",
    phone: "电话号码",
    noPostal: "该国不使用邮政编码",
    featuresTitle: "这个工具能做什么",
    features: [
      { title: "地址字段彼此一致", body: "先选定行政区，再从该行政区的城市中取名，最后按同一行政区的真实邮编规则生成邮编。三者出自同一条数据，因此不会出现「城市与省份对不上」的情况。" },
      { title: "按当地书写习惯排版", body: "街道名称的语序、门牌号位置、邮编所在行都随国家变化。德语、荷兰语等把路名与通名连写（Hauptstraße），法语、西班牙语把通名前置（Rue Victor Hugo），中文与日文地址不加分隔符。" },
      { title: "电话符合当地号段", body: "号码长度、分组方式与国际区号取自该国的真实拨号规则，移动号段使用当地实际启用的前缀。" },
      { title: "一键复制每个字段", body: "地址的每一行都能单独复制，也可以复制拼好的完整地址，直接粘进注册表单或测试脚本。" },
    ],
    formatTitle: "地址与电话格式",
    formatAdmin: "一级行政区名称",
    formatTemplate: "地址书写顺序",
    formatPostal: "邮政编码",
    formatPhone: "电话号码",
    formatIntl: "国际格式",
    formatLocal: "本地格式",
    postalNone: "该国没有邮政编码体系，网站若强制要求，通常填写 0000 之类的占位数字。",
    maskLegend: "（# 代表数字，A 代表字母，… 为沿用真实数据的前缀）",
    exampleTitle: "示例",
    exampleNote: "示例展示该国地址在信封或表单上的典型排列方式。",
    notesTitle: "使用说明",
    notes: [
      "生成的地址由算法合成，不对应任何真实住址、楼盘或收件人。",
      "街道名称取自该国的公开地名库，门牌号与楼层均为随机值，因此现实中不会指向具体门牌。",
      "电话号码按当地正确格式生成，每次都会变化，并非在用号码。",
      "本工具仅供软件测试、表单演示与隐私保护使用，请勿用于任何违法用途。",
    ],
    disclaimer: "仅供软件测试使用。",
  },
  "zh-hant": {
    nav: "虛擬地址",
    title: "虛擬地址產生器",
    intro: "依所選國家的真實地址格式產生完整地址：街道、城市、行政區、郵遞區號與電話號碼，各欄位取自同一地區，彼此一致。適用於註冊聯調、表單驗證與國際化地址展示。",
    countryLabel: "國家 / 地區",
    countryRandom: "隨機國家",
    generate: "產生地址",
    regenerate: "換一個地址",
    resultTitle: "產生的虛擬地址",
    holderLabel: "收件人",
    fullAddress: "完整地址",
    copyAll: "複製完整地址",
    allCopied: "已複製完整地址",
    copy: "複製",
    copied: "已複製",
    street: "街道地址",
    city: "城市",
    state: "行政區",
    postal: "郵遞區號",
    country: "國家 / 地區",
    phone: "電話號碼",
    noPostal: "該國不使用郵遞區號",
    featuresTitle: "這個工具能做什麼",
    features: [
      { title: "地址欄位彼此一致", body: "先選定行政區，再從該行政區的城市中取名，最後依同一行政區的真實郵遞區號規則產生。三者出自同一筆資料，因此不會出現「城市與省份對不上」的情況。" },
      { title: "依當地書寫習慣排版", body: "街道名稱的語序、門牌號位置、郵遞區號所在行都隨國家而異。德語、荷蘭語把路名與通名連寫（Hauptstraße），法語、西班牙語把通名前置（Rue Victor Hugo），中文與日文地址不加分隔符。" },
      { title: "電話符合當地號段", body: "號碼長度、分組方式與國際區號取自該國的真實撥號規則，行動號段使用當地實際啟用的前綴。" },
      { title: "一键複製每個欄位", body: "地址的每一行都能單獨複製，也能複製拼好的完整地址，直接貼進註冊表單或測試指令碼。" },
    ],
    formatTitle: "地址與電話格式",
    formatAdmin: "一級行政區名稱",
    formatTemplate: "地址書寫順序",
    formatPostal: "郵遞區號",
    formatPhone: "電話號碼",
    formatIntl: "國際格式",
    formatLocal: "本地格式",
    postalNone: "該國沒有郵遞區號體系，網站若強制要求，通常填寫 0000 之類的佔位數字。",
    maskLegend: "（# 代表數字，A 代表字母，… 為沿用真實資料的前綴）",
    exampleTitle: "範例",
    exampleNote: "範例展示該國地址在信封或表單上的典型排列方式。",
    notesTitle: "使用說明",
    notes: [
      "產生的地址由演算法合成，不對應任何真實住址、建案或收件人。",
      "街道名稱取自該國的公開地名庫，門牌號與樓層均為隨機值，因此現實中不會指向具體門牌。",
      "電話號碼依當地正確格式產生，每次都會變化，並非使用中的號碼。",
      "本工具僅供軟體測試、表單示範與隱私保護使用，請勿用於任何違法用途。",
    ],
    disclaimer: "僅供軟體測試使用。",
  },
  en: {
    nav: "Virtual Address",
    title: "Virtual Address Generator",
    intro: "Generate a complete address in the real format of the country you pick: street, city, administrative division, postal code and phone number, all drawn from the same region so the fields agree with each other. Built for signup testing, form validation and international address display.",
    countryLabel: "Country / region",
    countryRandom: "Random country",
    generate: "Generate address",
    regenerate: "Another address",
    resultTitle: "Generated address",
    holderLabel: "Recipient",
    fullAddress: "Full address",
    copyAll: "Copy full address",
    allCopied: "Full address copied",
    copy: "Copy",
    copied: "Copied",
    street: "Street address",
    city: "City",
    state: "Division",
    postal: "Postal code",
    country: "Country / region",
    phone: "Phone number",
    noPostal: "This country does not use postal codes",
    featuresTitle: "What this tool does",
    features: [
      { title: "The fields agree with each other", body: "A division is chosen first, then a city within it, then a postal code built from that same division's real prefix rules. All three come from one record, so a city can never sit under the wrong province." },
      { title: "Laid out the way the country writes addresses", body: "Street word order, where the house number goes and which line carries the postal code all vary by country. German and Dutch join the road type to the name (Hauptstraße); French and Spanish put it first (Rue Victor Hugo); Chinese and Japanese use no separators at all." },
      { title: "Phone numbers match the local plan", body: "Length, grouping and the international dialling code come from the country's real numbering rules, and mobile numbers use prefixes actually in use there." },
      { title: "Every field copies on its own", body: "Each line of the address copies separately, and the assembled full address can be copied in one click straight into a form or a test script." },
    ],
    formatTitle: "Address and phone format",
    formatAdmin: "First-level division",
    formatTemplate: "Address order",
    formatPostal: "Postal code",
    formatPhone: "Phone number",
    formatIntl: "International",
    formatLocal: "Local",
    postalNone: "This country has no postal code system. If a site insists on one, a placeholder such as 0000 is normally used.",
    maskLegend: "(# is a digit, A a letter, … the prefix taken from real data)",
    exampleTitle: "Example",
    exampleNote: "The example shows how an address of this country is typically laid out on an envelope or a form.",
    notesTitle: "Good to know",
    notes: [
      "The addresses are synthesised by an algorithm and correspond to no real residence, building or recipient.",
      "Street names come from the country's public gazetteer; house numbers and floors are random, so nothing resolves to a real door.",
      "Phone numbers follow the correct local format, change on every generation, and are not numbers in service.",
      "Intended for software testing, form demos and privacy protection only. Do not use it for anything unlawful.",
    ],
    disclaimer: "For software testing only.",
  },
  ja: {
    nav: "バーチャル住所",
    title: "バーチャル住所生成",
    intro: "選んだ国の実際の書式に沿った住所を生成します。番地・市区町村・行政区・郵便番号・電話番号を、同一の地域データから取り出すため、各項目が互いに矛盾しません。登録の結合テスト、フォーム検証、国際住所の表示にどうぞ。",
    countryLabel: "国・地域",
    countryRandom: "ランダムな国",
    generate: "住所を生成",
    regenerate: "別の住所",
    resultTitle: "生成された住所",
    holderLabel: "宛名",
    fullAddress: "完全な住所",
    copyAll: "住所をまとめてコピー",
    allCopied: "コピーしました",
    copy: "コピー",
    copied: "コピー済み",
    street: "番地",
    city: "市区町村",
    state: "行政区",
    postal: "郵便番号",
    country: "国・地域",
    phone: "電話番号",
    noPostal: "この国は郵便番号を使用しません",
    featuresTitle: "このツールでできること",
    features: [
      { title: "各項目が整合している", body: "まず行政区を選び、その中の市区町村を選び、同じ行政区の実際の郵便番号規則で番号を生成します。三つは同一の記録に由来するため、市と州が食い違うことはありません。" },
      { title: "現地の書き方に沿って整える", body: "通りの語順、番地の位置、郵便番号を書く行は国ごとに異なります。ドイツ語やオランダ語は通り名と種別を続け書き（Hauptstraße）、フランス語やスペイン語は種別を前に置き（Rue Victor Hugo）、中国語や日本語の住所は区切り記号を使いません。" },
      { title: "電話番号が現地の番号計画に合う", body: "桁数・区切り方・国際電話コードはその国の実際の番号規則に従い、携帯番号には現地で実際に使われている接頭辞を用います。" },
      { title: "項目ごとに個別コピー", body: "住所の各行を個別にコピーでき、組み立て済みの完全な住所もワンクリックでフォームやテストスクリプトへ貼り付けられます。" },
    ],
    formatTitle: "住所と電話番号の書式",
    formatAdmin: "第一級行政区",
    formatTemplate: "住所の記載順",
    formatPostal: "郵便番号",
    formatPhone: "電話番号",
    formatIntl: "国際表記",
    formatLocal: "国内表記",
    postalNone: "この国には郵便番号の体系がありません。入力が必須の場合は 0000 などのプレースホルダーを用いるのが一般的です。",
    maskLegend: "（# は数字、A は英字、… は実データに由来する接頭部）",
    exampleTitle: "例",
    exampleNote: "封筒やフォームでの典型的な配置を示します。",
    notesTitle: "ご利用にあたって",
    notes: [
      "住所はアルゴリズムによる合成で、実在の住居・建物・受取人とは関係ありません。",
      "通り名はその国の公開地名データに基づきますが、番地や階数は乱数であり、実在の住居を指すことはありません。",
      "電話番号は現地の正しい書式で生成され、毎回変化します。実際に使われている番号ではありません。",
      "本ツールはソフトウェアテスト、フォームのデモ、プライバシー保護のためのものです。違法な用途には使用しないでください。",
    ],
    disclaimer: "ソフトウェアテスト専用です。",
  },
  ko: {
    nav: "가상 주소",
    title: "가상 주소 생성기",
    intro: "선택한 국가의 실제 주소 형식으로 완전한 주소를 생성합니다. 도로명·도시·행정구역·우편번호·전화번호를 같은 지역 데이터에서 함께 가져오므로 항목끼리 서로 어긋나지 않습니다. 가입 연동 테스트, 양식 검증, 국제 주소 표시에 적합합니다.",
    countryLabel: "국가 / 지역",
    countryRandom: "무작위 국가",
    generate: "주소 생성",
    regenerate: "다른 주소",
    resultTitle: "생성된 주소",
    holderLabel: "수취인",
    fullAddress: "전체 주소",
    copyAll: "전체 주소 복사",
    allCopied: "전체 주소 복사됨",
    copy: "복사",
    copied: "복사됨",
    street: "도로명 주소",
    city: "도시",
    state: "행정구역",
    postal: "우편번호",
    country: "국가 / 지역",
    phone: "전화번호",
    noPostal: "이 국가는 우편번호를 사용하지 않습니다",
    featuresTitle: "이 도구가 하는 일",
    features: [
      { title: "항목끼리 서로 일치합니다", body: "먼저 행정구역을 고르고, 그 안의 도시를 고른 뒤, 같은 행정구역의 실제 우편번호 규칙으로 번호를 만듭니다. 세 값이 하나의 기록에서 나오므로 도시가 엉뚱한 주에 놓이는 일이 없습니다." },
      { title: "현지 표기 방식으로 배치합니다", body: "도로명 어순, 번지 위치, 우편번호가 들어가는 줄은 국가마다 다릅니다. 독일어와 네덜란드어는 도로 유형을 붙여 쓰고(Hauptstraße), 프랑스어와 스페인어는 앞에 두며(Rue Victor Hugo), 중국어와 일본어 주소는 구분자를 쓰지 않습니다." },
      { title: "전화번호가 현지 번호 체계와 맞습니다", body: "자릿수, 묶음 방식, 국제 국가 코드는 해당 국가의 실제 번호 규칙을 따르며, 휴대폰 번호는 현지에서 실제로 쓰이는 접두사를 사용합니다." },
      { title: "항목별로 따로 복사합니다", body: "주소의 각 줄을 따로 복사할 수 있고, 조합된 전체 주소도 한 번에 복사해 양식이나 테스트 스크립트에 붙여넣을 수 있습니다." },
    ],
    formatTitle: "주소 및 전화번호 형식",
    formatAdmin: "1급 행정구역",
    formatTemplate: "주소 기재 순서",
    formatPostal: "우편번호",
    formatPhone: "전화번호",
    formatIntl: "국제 형식",
    formatLocal: "현지 형식",
    postalNone: "이 국가에는 우편번호 체계가 없습니다. 입력이 필수라면 보통 0000 같은 자리 표시자를 사용합니다.",
    maskLegend: "(# 은 숫자, A 는 영문자, … 는 실제 데이터에서 가져온 접두부)",
    exampleTitle: "예시",
    exampleNote: "봉투나 양식에서 이 국가의 주소가 전형적으로 배치되는 방식을 보여 줍니다.",
    notesTitle: "알아 두세요",
    notes: [
      "주소는 알고리즘이 합성한 것이며 실존하는 거주지·건물·수취인과 무관합니다.",
      "도로명은 해당 국가의 공개 지명 데이터를 따르지만 번지와 층수는 무작위이므로 실제 주소를 가리키지 않습니다.",
      "전화번호는 현지의 올바른 형식으로 생성되며 매번 바뀌고, 실제 사용 중인 번호가 아닙니다.",
      "소프트웨어 테스트, 양식 시연, 개인정보 보호 목적으로만 사용하세요. 불법적인 용도로 사용하지 마세요.",
    ],
    disclaimer: "소프트웨어 테스트 전용입니다.",
  },
};

export function addressStrings(lang: SiteLang): AddressStrings {
  return ADDRESS[lang] ?? ADDRESS.en;
}
