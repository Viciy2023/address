/**
 * UI strings for the virtual card generator, in all five languages.
 *
 * Kept in its own module for the same reason as `i18n/mail.ts`: the feature is
 * self-contained, and the main string table is already large.
 */

import type { SiteLang } from "../config.js";

export interface CardStrings {
  /** Navigation label. */
  nav: string;
  title: string;
  intro: string;

  /* mode switch */
  modeGenerate: string;
  modeComplete: string;

  /* generate controls */
  networkLabel: string;
  networkRandom: string;
  countLabel: string;
  holderNote: string;
  generate: string;
  regenerate: string;

  /* complete controls */
  partialLabel: string;
  partialPlaceholder: string;
  partialHint: string;
  complete: string;

  /* results */
  resultsTitle: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
  holder: string;
  bank: string;
  copyNumber: string;
  numberCopied: string;
  copyHolder: string;
  copyExpiry: string;
  copyCvv: string;
  copyAll: string;
  allCopied: string;
  empty: string;

  /* guide card */
  guideTitle: string;
  guideSteps: { title: string; body: string }[];

  /* notices */
  disclaimer: string;

  /* errors */
  errEmpty: string;
  errTooShort: string;
  errTooLong: string;
  errUnknownPrefix: string;
  errBadChars: string;
}

export const CARD: Record<SiteLang, CardStrings> = {
  zh: {
    nav: "虚拟信用卡",
    title: "虚拟信用卡生成器",
    intro: "生成格式正确、可通过 Luhn 校验的测试卡号，覆盖 Visa、Mastercard、银联等国际与国内卡组织。也可输入已知的卡号片段，补全为完整卡号。仅用于软件测试。",
    modeGenerate: "随机生成",
    modeComplete: "卡号补全",
    networkLabel: "卡组织",
    networkRandom: "随机",
    countLabel: "数量",
    holderNote: "持卡人姓名与发卡行为示例数据。",
    generate: "生成",
    regenerate: "换一批",
    partialLabel: "卡号片段",
    partialPlaceholder: "例如 6222 或 4111xxxxxxxxxxxx",
    partialHint: "用 x 或 * 代表待补全的位；只填前缀则按该卡组织的真实位数补足。",
    complete: "生成",
    resultsTitle: "生成的测试卡",
    cardNumber: "卡号",
    expiry: "有效期",
    cvv: "安全码",
    holder: "持卡人",
    bank: "发卡行",
    copyNumber: "复制卡号",
    numberCopied: "已复制",
    copyHolder: "复制持卡人",
    copyExpiry: "复制有效期",
    copyCvv: "复制安全码",
    copyAll: "批量复制全部",
    allCopied: "已全部复制",
    empty: "尚未生成卡号",
    guideTitle: "虚拟信用卡怎么用",
    guideSteps: [
      { title: "选择卡组织", body: "默认随机，会自动在各卡组织间轮换；也可以指定 Visa、Mastercard、银联等。卡号前缀会按该卡组织的真实号段生成，这样结账页通常能正确识别品牌。" },
      { title: "需要时就用卡号补全", body: "如果手上已有部分卡号或已知 BIN，切到「卡号补全」，把已知部分粘进去，用 x 或 * 占位，即可得到完整卡号。也可以选数量、点「换一批」生成多张。" },
      { title: "复制到表单或脚本", body: "每张卡都可单独复制卡号，也可以用「批量复制全部」一次性拿走全部卡号、有效期与安全码。" },
      { title: "注意：卡号是虚构的", body: "所有卡号都由算法合成，不绑定任何真实账户，无法完成任何实际支付，仅供联调与表单测试。" },
    ],
    disclaimer: "仅供软件测试使用，请勿用于欺诈或任何真实交易。",
    errEmpty: "请输入卡号片段。",
    errTooShort: "位数太短，无法构成有效卡号。",
    errTooLong: "位数过长，超出卡号范围。",
    errUnknownPrefix: "无法识别卡组织，请检查前缀。",
    errBadChars: "只能包含数字、x、* 和分隔符。",
  },
  "zh-hant": {
    nav: "虛擬信用卡",
    title: "虛擬信用卡產生器",
    intro: "產生格式正確、可通過 Luhn 驗證的測試卡號，涵蓋 Visa、Mastercard、銀聯等國際與國內卡組織。也可輸入已知的卡號片段，補全為完整卡號。僅供軟體測試。",
    modeGenerate: "隨機產生",
    modeComplete: "卡號補全",
    networkLabel: "卡組織",
    networkRandom: "隨機",
    countLabel: "數量",
    holderNote: "持卡人姓名與發卡行為範例資料。",
    generate: "產生",
    regenerate: "換一批",
    partialLabel: "卡號片段",
    partialPlaceholder: "例如 6222 或 4111xxxxxxxxxxxx",
    partialHint: "用 x 或 * 代表待補全的位；只填前綴會依該卡組織的真實位數補足。",
    complete: "產生",
    resultsTitle: "產生的測試卡",
    cardNumber: "卡號",
    expiry: "有效期限",
    cvv: "安全碼",
    holder: "持卡人",
    bank: "發卡行",
    copyNumber: "複製卡號",
    numberCopied: "已複製",
    copyHolder: "複製持卡人",
    copyExpiry: "複製有效期限",
    copyCvv: "複製安全碼",
    copyAll: "批次複製全部",
    allCopied: "已全部複製",
    empty: "尚未產生卡號",
    guideTitle: "虛擬信用卡怎麼用",
    guideSteps: [
      { title: "選擇卡組織", body: "預設隨機，會自動在各卡組織間輪換；也可指定 Visa、Mastercard、銀聯等。卡號前綴會依該卡組織的真實號段產生，結帳頁通常能正確辨識品牌。" },
      { title: "需要時用卡號補全", body: "若手上已有部分卡號或已知 BIN，切到「卡號補全」，把已知部分貼進去，用 x 或 * 佔位，即可得到完整卡號。也可以選數量、點「換一批」產生多張。" },
      { title: "複製到表單或腳本", body: "每張卡都能單獨複製卡號，也能用「批次複製全部」一次取得全部卡號、有效期限與安全碼。" },
      { title: "注意：卡號是虛構的", body: "所有卡號皆由演算法合成，不綁定任何真實帳戶，無法完成任何實際付款，僅供聯調與表單測試。" },
    ],
    disclaimer: "僅供軟體測試使用，請勿用於詐欺或任何真實交易。",
    errEmpty: "請輸入卡號片段。",
    errTooShort: "位數太短，無法構成有效卡號。",
    errTooLong: "位數過長，超出卡號範圍。",
    errUnknownPrefix: "無法辨識卡組織，請檢查前綴。",
    errBadChars: "只能包含數字、x、* 與分隔符號。",
  },
  en: {
    nav: "Virtual Card",
    title: "Virtual Credit Card Generator",
    intro: "Generate format-correct, Luhn-valid test card numbers for Visa, Mastercard, UnionPay and other networks. You can also paste a partial number and complete it. For software testing only.",
    modeGenerate: "Random",
    modeComplete: "Complete a number",
    networkLabel: "Network",
    networkRandom: "Random",
    countLabel: "How many",
    holderNote: "Cardholder name and issuing bank are sample data.",
    generate: "Generate",
    regenerate: "Generate again",
    partialLabel: "Partial number",
    partialPlaceholder: "e.g. 6222 or 4111xxxxxxxxxxxx",
    partialHint: "Use x or * for the digits to fill; a bare prefix is padded to the network's real length.",
    complete: "Complete",
    resultsTitle: "Generated test cards",
    cardNumber: "Card number",
    expiry: "Expiry",
    cvv: "CVV",
    holder: "Cardholder",
    bank: "Issuing bank",
    copyNumber: "Copy number",
    numberCopied: "Copied",
    copyHolder: "Copy cardholder",
    copyExpiry: "Copy expiry",
    copyCvv: "Copy CVV",
    copyAll: "Copy all",
    allCopied: "All copied",
    empty: "No cards yet",
    guideTitle: "How to use this generator",
    guideSteps: [
      { title: "Pick a network", body: "Random is the default and rotates through the networks; you can also pin Visa, Mastercard, UnionPay and the rest. The prefix comes from the network's real issuer range, so a checkout page usually recognises the brand." },
      { title: "Complete a partial number", body: "If you already have part of a number or a known BIN, switch to Complete, paste what you have with x or * for the gaps, and get full numbers back. You can pick a count and generate again for more." },
      { title: "Copy into a form or a script", body: "Copy any single number, or use Copy all to take every number, expiry and CVV at once." },
      { title: "Note: the numbers are fictional", body: "Every number is synthesised by an algorithm and is tied to no real account, so it cannot complete a payment. It is for integration testing and form demos only." },
    ],
    disclaimer: "For software testing only. Do not use for fraud or any real transaction.",
    errEmpty: "Enter a partial card number.",
    errTooShort: "Too few digits to form a card number.",
    errTooLong: "Too many digits for a card number.",
    errUnknownPrefix: "Could not recognise the network. Check the prefix.",
    errBadChars: "Only digits, x, * and separators are allowed.",
  },
  ja: {
    nav: "バーチャルカード",
    title: "バーチャルクレジットカード生成",
    intro: "Visa・Mastercard・銀聯などに対応した、形式が正しく Luhn 検証を通るテストカード番号を生成します。番号の一部を入力して補完することもできます。ソフトウェアテスト専用です。",
    modeGenerate: "ランダム生成",
    modeComplete: "カード番号の補完",
    networkLabel: "カードブランド",
    networkRandom: "ランダム",
    countLabel: "枚数",
    holderNote: "カード名義と発行銀行はサンプルデータです。",
    generate: "生成",
    regenerate: "もう一度生成",
    partialLabel: "カード番号の一部",
    partialPlaceholder: "例: 6222 または 4111xxxxxxxxxxxx",
    partialHint: "補完する桁は x か * で指定します。接頭辞だけの場合は実際の桁数まで補います。",
    complete: "生成",
    resultsTitle: "生成されたテストカード",
    cardNumber: "カード番号",
    expiry: "有効期限",
    cvv: "セキュリティコード",
    holder: "カード名義",
    bank: "発行銀行",
    copyNumber: "番号をコピー",
    numberCopied: "コピーしました",
    copyHolder: "名義をコピー",
    copyExpiry: "有効期限をコピー",
    copyCvv: "コードをコピー",
    copyAll: "まとめてコピー",
    allCopied: "全てコピーしました",
    empty: "まだ生成されていません",
    guideTitle: "バーチャルカードの使い方",
    guideSteps: [
      { title: "カードブランドを選ぶ", body: "既定はランダムで各ブランドを巡回します。Visa、Mastercard、銀聯などを固定することもできます。接頭辞は実際の号段に従うため、決済ページでもブランドが正しく認識されやすくなります。" },
      { title: "必要ならカード番号の補完", body: "すでに番号の一部や BIN がある場合は「カード番号の補完」に切り替え、既知の部分を貼り付け、不明な桁を x か * にすれば完全な番号が得られます。枚数を選んで「もう一度生成」すれば複数枚作れます。" },
      { title: "フォームやスクリプトへコピー", body: "1 枚ずつコピーすることも、「まとめてコピー」で全番号・有効期限・セキュリティコードを一度に取得することもできます。" },
      { title: "注意: 番号は架空です", body: "すべての番号はアルゴリズムによる合成で、実在の口座とは無関係です。実際の決済には使えず、結合テストやフォームのデモ専用です。" },
    ],
    disclaimer: "ソフトウェアテスト専用です。不正利用や実際の取引には使用しないでください。",
    errEmpty: "カード番号の一部を入力してください。",
    errTooShort: "桁数が不足しており、有効なカード番号になりません。",
    errTooLong: "桁数が多すぎます。",
    errUnknownPrefix: "カードブランドを判別できません。接頭辞をご確認ください。",
    errBadChars: "数字・x・*・区切り記号のみ使用できます。",
  },
  ko: {
    nav: "가상 카드",
    title: "가상 신용카드 생성기",
    intro: "Visa, Mastercard, 유니온페이 등 국제·국내 카드사에 맞는 형식이 올바르고 Luhn 검증을 통과하는 테스트 카드 번호를 생성합니다. 번호 일부를 입력해 완성할 수도 있습니다. 소프트웨어 테스트 전용입니다.",
    modeGenerate: "무작위 생성",
    modeComplete: "카드 번호 완성",
    networkLabel: "카드사",
    networkRandom: "무작위",
    countLabel: "개수",
    holderNote: "카드 소유자 이름과 발급 은행은 예시 데이터입니다.",
    generate: "생성",
    regenerate: "다시 생성",
    partialLabel: "카드 번호 일부",
    partialPlaceholder: "예: 6222 또는 4111xxxxxxxxxxxx",
    partialHint: "채울 자리는 x 또는 * 로 표시하세요. 접두사만 입력하면 실제 자릿수까지 채웁니다.",
    complete: "생성",
    resultsTitle: "생성된 테스트 카드",
    cardNumber: "카드 번호",
    expiry: "유효기간",
    cvv: "보안 코드",
    holder: "카드 소유자",
    bank: "발급 은행",
    copyNumber: "번호 복사",
    numberCopied: "복사됨",
    copyHolder: "소유자 복사",
    copyExpiry: "유효기간 복사",
    copyCvv: "보안 코드 복사",
    copyAll: "전체 복사",
    allCopied: "전체 복사됨",
    empty: "아직 생성된 카드가 없습니다",
    guideTitle: "가상 카드 사용법",
    guideSteps: [
      { title: "카드사 선택", body: "기본값은 무작위로 여러 카드사를 순환합니다. Visa, Mastercard, 유니온페이 등을 고정할 수도 있습니다. 접두사가 실제 번호 대역을 따르므로 결제 페이지에서 브랜드가 올바르게 인식됩니다." },
      { title: "필요하면 카드 번호 완성", body: "이미 번호 일부나 BIN 이 있다면 ‘카드 번호 완성’으로 전환해 아는 부분을 붙여넣고 모르는 자리를 x 또는 * 로 두면 완전한 번호를 얻습니다. 개수를 고르고 ‘다시 생성’하면 여러 장을 만들 수 있습니다." },
      { title: "양식이나 스크립트로 복사", body: "카드 한 장씩 복사하거나 ‘전체 복사’로 모든 번호·유효기간·보안 코드를 한 번에 가져갈 수 있습니다." },
      { title: "주의: 번호는 가상입니다", body: "모든 번호는 알고리즘이 합성한 것이며 실제 계정과 무관합니다. 실제 결제는 불가능하고 연동 테스트와 양식 시연 전용입니다." },
    ],
    disclaimer: "소프트웨어 테스트 전용입니다. 사기나 실제 거래에 사용하지 마세요.",
    errEmpty: "카드 번호 일부를 입력하세요.",
    errTooShort: "자릿수가 너무 적어 유효한 카드 번호가 될 수 없습니다.",
    errTooLong: "자릿수가 너무 많습니다.",
    errUnknownPrefix: "카드사를 인식할 수 없습니다. 접두사를 확인하세요.",
    errBadChars: "숫자, x, * 와 구분 기호만 사용할 수 있습니다.",
  },
};

export function cardStrings(lang: SiteLang): CardStrings {
  return CARD[lang] ?? CARD.en;
}
