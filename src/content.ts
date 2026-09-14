/**
 * Static page copy for the four languages.
 *
 * Kept as data rather than markup so the wording lives in one place per
 * language and the view components stay structural.
 *
 * IMPORTANT — the privacy policy must describe what the site actually does.
 * The legacy implementation declared Google Analytics and AdSense while
 * shipping neither, which is a disclosure problem in its own right. Here the
 * policy is generated from the same config flags that decide whether those
 * integrations render at all.
 */

import type { SiteLang } from "./config.js";

export interface Section {
  heading: string;
  /** Paragraphs; a leading "- " marks a list item. */
  body: string[];
}

export interface PageCopy {
  title: string;
  intro: string;
  sections: Section[];
}

type Copy = Record<SiteLang, PageCopy>;

export const ABOUT: Copy = {
  zh: {
    title: "关于我们",
    intro: "本站提供一个完全在浏览器本地运行的身份与地址生成工具，面向软件开发、测试和数据填充场景。",
    sections: [
      {
        heading: "我们做什么",
        body: [
          "我们把分散在各国的地址格式规则、行政区划数据、邮编规则和证件号码格式整理成一份结构化的数据集，让开发者可以在一个地方生成格式正确、内部一致的测试数据。",
          "所有生成过程都在你的浏览器中完成。没有请求发送到服务器，没有账号，没有使用记录。",
        ],
      },
      {
        heading: "数据从哪来",
        body: [
          "行政区划、城市、人口与邮编来自 GeoNames，采用 CC-BY 4.0 许可。姓名库来自 @faker-js/faker，采用 MIT 许可。",
          "我们在此向这些项目的维护者致谢。完整的来源清单与许可条款见「数据来源」页面。",
        ],
      },
      {
        heading: "我们的原则",
        body: [
          "- 数据与代码分离：各国规则以 JSON 维护，改一个国家的格式不需要改动生成逻辑。",
          "- 一致性优先：城市、行政区与邮编始终来自同一条记录，绝不会互相矛盾。",
          "- 可复现：相同的种子必然产生相同的结果，便于自动化测试。",
          "- 诚实标注：无法获取权威数据的字段会明确标注，不假装数据是真实的。",
        ],
      },
    ],
  },
  en: {
    title: "About",
    intro: "This site provides an identity and address generator that runs entirely in your browser, built for software development, testing and data seeding.",
    sections: [
      {
        heading: "What we do",
        body: [
          "We collect the address-format rules, administrative division data, postal-code conventions and national identifier formats of many countries into one structured dataset, so developers can generate correct, internally consistent test data in a single place.",
          "Every generation happens in your browser. No request is sent to a server, there is no account, and no usage is recorded.",
        ],
      },
      {
        heading: "Where the data comes from",
        body: [
          "Administrative divisions, cities, population ranks and postal codes come from GeoNames under the CC-BY 4.0 licence. Name pools come from @faker-js/faker under the MIT licence.",
          "We are grateful to the maintainers of both projects. The complete list of sources and their terms is on the Data Sources page.",
        ],
      },
      {
        heading: "Our principles",
        body: [
          "- Data separated from code: country rules live in JSON, so changing one country's format never touches the generation logic.",
          "- Consistency first: city, division and postal code always come from the same record and can never contradict each other.",
          "- Reproducible: the same seed always produces the same result, which is what makes it usable in automated tests.",
          "- Honest labelling: fields without authoritative data are marked as such rather than passed off as real.",
        ],
      },
    ],
  },
  ja: {
    title: "運営者情報",
    intro: "本サイトは、ブラウザ内だけで動作する身元・住所生成ツールです。ソフトウェア開発、テスト、データ投入を目的としています。",
    sections: [
      {
        heading: "提供しているもの",
        body: [
          "各国の住所形式の規則、行政区画データ、郵便番号の慣例、公的番号の形式を 1 つの構造化データセットにまとめ、開発者が正しく内部的に整合したテストデータを 1 か所で生成できるようにしています。",
          "生成処理はすべてお使いのブラウザ内で完結します。サーバーへの送信はなく、アカウントも不要で、利用履歴も記録しません。",
        ],
      },
      {
        heading: "データの出典",
        body: [
          "行政区画、都市、人口、郵便番号は GeoNames（CC-BY 4.0）から取得しています。姓名データは @faker-js/faker（MIT）によるものです。",
          "両プロジェクトのメンテナに感謝します。出典とライセンスの全文は「データ出典」ページに掲載しています。",
        ],
      },
      {
        heading: "設計方針",
        body: [
          "- データとコードの分離：各国の規則は JSON で管理し、1 か国の形式変更が生成ロジックに影響しません。",
          "- 整合性の優先：市区町村・行政区・郵便番号は常に同一レコード由来で、矛盾しません。",
          "- 再現性：同じシードなら常に同じ結果が得られ、自動テストに利用できます。",
          "- 正直な表示：正式なデータが無い項目はその旨を明示し、実データであるかのように見せません。",
        ],
      },
    ],
  },
  ko: {
    title: "사이트 소개",
    intro: "이 사이트는 브라우저 안에서만 동작하는 신원·주소 생성 도구로, 소프트웨어 개발·테스트·데이터 입력을 목적으로 합니다.",
    sections: [
      {
        heading: "무엇을 하는가",
        body: [
          "각국의 주소 형식 규칙, 행정 구역 데이터, 우편번호 관례, 공적 번호 형식을 하나의 구조화된 데이터셋으로 정리하여, 개발자가 정확하고 내부적으로 일관된 테스트 데이터를 한 곳에서 생성할 수 있게 합니다.",
          "모든 생성 과정은 사용자의 브라우저에서 완결됩니다. 서버로 전송되는 요청이 없고, 계정도 필요 없으며, 이용 기록도 남지 않습니다.",
        ],
      },
      {
        heading: "데이터 출처",
        body: [
          "행정 구역, 도시, 인구, 우편번호는 GeoNames(CC-BY 4.0)에서 가져왔습니다. 이름 데이터는 @faker-js/faker(MIT)에서 추출했습니다.",
          "두 프로젝트의 유지보수자에게 감사드립니다. 전체 출처와 라이선스는 '데이터 출처' 페이지에 있습니다.",
        ],
      },
      {
        heading: "설계 원칙",
        body: [
          "- 데이터와 코드의 분리: 각국 규칙은 JSON으로 관리하므로 한 국가의 형식을 바꿔도 생성 로직은 건드리지 않습니다.",
          "- 일관성 우선: 도시·행정구역·우편번호는 항상 같은 레코드에서 나오므로 서로 모순되지 않습니다.",
          "- 재현 가능: 같은 시드는 항상 같은 결과를 만들며, 이는 자동화 테스트에 필수적입니다.",
          "- 정직한 표기: 권위 있는 데이터가 없는 필드는 그 사실을 명시하고 실제 데이터인 척하지 않습니다.",
        ],
      },
    ],
  },
  "zh-hant": {
    title: "關於我們",
    intro: "本站提供一個完全在瀏覽器本機執行的身份與地址產生工具，面向軟體開發、測試與資料填充情境。",
    sections: [
      {
        heading: "我們做什麼",
        body: [
          "我們把分散在各國的地址格式規則、行政區劃資料、郵遞區號規則與證件號碼格式整理成一份結構化資料集，讓開發者可以在同一個地方產生格式正確、內部一致的測試資料。",
          "所有產生過程都在你的瀏覽器中完成。不會有請求傳送到伺服器，沒有帳號，也沒有使用紀錄。",
        ],
      },
      {
        heading: "資料從何而來",
        body: [
          "行政區劃、城市、人口與郵遞區號來自 GeoNames，採用 CC-BY 4.0 授權。姓名資料庫來自 @faker-js/faker，採用 MIT 授權。",
          "我們在此向這些專案的維護者致謝。完整的來源清單與授權條款請見「資料來源」頁面。",
        ],
      },
      {
        heading: "我們的原則",
        body: [
          "- 資料與程式分離：各國規則以 JSON 維護，調整一個國家的格式不需要更動產生邏輯。",
          "- 一致性優先：城市、行政區與郵遞區號始終來自同一筆紀錄，絕不會互相矛盾。",
          "- 可重現：相同的種子必然產生相同的結果，便於自動化測試。",
          "- 誠實標註：無法取得權威資料的欄位會明確標註，不會假裝資料是真實的。",
        ],
      },
    ],
  },
};

export const CONTACT: Copy = {
  zh: {
    title: "联系我们",
    intro: "如果你发现问题、有功能建议，或希望补充某个国家的数据，欢迎写信给我们。",
    sections: [
      {
        heading: "联系方式",
        body: ["请通过以下任一方式与我们联系。若是邮件，请在标题中简要说明来意，以便我们更快处理。", "- 电子邮箱：cyuan52@gmail.com", "- Telegram：@cyuan52"],
      },
      {
        heading: "我们最想收到的反馈",
        body: [
          "- 某个国家的行政区、城市或邮编有误或缺失。",
          "- 某类证件号码的格式与实际不符。",
          "- 生成结果中出现明显不合理的数据组合。",
          "- 希望新增某个国家或地区。",
        ],
      },
      {
        heading: "回复时间",
        body: ["通常会在 2 至 3 个工作日内回复。由于本站为个人项目，若回复较慢还请谅解。"],
      },
    ],
  },
  en: {
    title: "Contact",
    intro: "If you have found a problem, have a feature request, or want to contribute data for a country, please get in touch.",
    sections: [
      {
        heading: "How to reach us",
        body: ["Reach us through either channel below. If you write, a concise subject line telling us what the message is about helps us respond faster.", "- Email: cyuan52@gmail.com", "- Telegram: @cyuan52"],
      },
      {
        heading: "Feedback we are most interested in",
        body: [
          "- An administrative division, city or postal code that is wrong or missing.",
          "- A national identifier format that does not match the real document.",
          "- A generated record containing an implausible combination of values.",
          "- A country or region you would like us to add.",
        ],
      },
      {
        heading: "Response time",
        body: ["We typically reply within two to three business days. This is a small project, so please bear with us if it takes longer."],
      },
    ],
  },
  ja: {
    title: "お問い合わせ",
    intro: "不具合のご報告、機能のご要望、特定の国のデータ提供などがありましたら、お気軽にご連絡ください。",
    sections: [
      {
        heading: "連絡方法",
        body: ["以下のいずれかの方法でご連絡ください。メールの場合、件名に用件を簡潔にご記入いただけると迅速に対応できます。", "- メール：cyuan52@gmail.com", "- Telegram：@cyuan52"],
      },
      {
        heading: "特にお待ちしているご報告",
        body: [
          "- 行政区画・都市・郵便番号の誤り、または欠落。",
          "- 公的番号の形式が実際の書類と異なる。",
          "- 生成結果に明らかに不自然な値の組み合わせがある。",
          "- 追加してほしい国や地域。",
        ],
      },
      {
        heading: "返信について",
        body: ["通常 2〜3 営業日以内に返信いたします。小規模な個人プロジェクトのため、遅れる場合がございますことをご了承ください。"],
      },
    ],
  },
  ko: {
    title: "문의하기",
    intro: "문제를 발견하셨거나 기능 제안, 특정 국가 데이터 제공 의사가 있으시면 연락해 주세요.",
    sections: [
      {
        heading: "연락 방법",
        body: ["아래 두 가지 방법 중 편한 쪽으로 연락해 주세요. 이메일인 경우 제목에 용건을 간단히 적어 주시면 더 빠르게 답변드립니다.", "- 이메일: cyuan52@gmail.com", "- Telegram: @cyuan52"],
      },
      {
        heading: "특히 환영하는 제보",
        body: [
          "- 행정 구역·도시·우편번호의 오류 또는 누락.",
          "- 공적 번호 형식이 실제 문서와 다른 경우.",
          "- 생성 결과에 명백히 부자연스러운 값 조합이 있는 경우.",
          "- 추가를 원하시는 국가나 지역.",
        ],
      },
      {
        heading: "답변 시간",
        body: ["보통 2~3 영업일 내에 답변드립니다. 소규모 개인 프로젝트이므로 늦어질 수 있는 점 양해 부탁드립니다."],
      },
    ],
  },
  "zh-hant": {
    title: "聯絡我們",
    intro: "若你對本站的資料、授權或使用方式有任何疑問，歡迎與我們聯絡。",
    sections: [
      {
        heading: "電子郵件",
        body: [
          "請透過以下任一方式與我們聯絡。若是郵件，請在標題中簡要說明來意，以便我們更快處理。",
          "- 電子郵件：cyuan52@gmail.com",
          "- Telegram：@cyuan52",
        ],
      },
      {
        heading: "Telegram",
        body: [
          "若你偏好即時通訊，也可以透過 Telegram 與我們聯絡：@cyuan52。",
        ],
      },
      {
        heading: "授權與轉載",
        body: [
          "本站程式碼採用 MIT 授權，內含的資料集各自採用其原始授權。轉載或再使用前請先確認對應的授權條款。",
        ],
      },
      {
        heading: "問題回報",
        body: [
          "若你發現某個國家或地區的產生結果有誤，請附上該筆紀錄的種子與國家代碼，這能讓我們精確重現問題。",
        ],
      },
    ],
  },
};

/** Terms of service. */
export const TERMS: Copy = {
  zh: {
    title: "服务条款",
    intro: "使用本站即表示你同意以下条款。请在使用前完整阅读。",
    sections: [
      {
        heading: "1. 服务性质",
        body: [
          "本站提供一个生成虚拟身份与地址数据的工具。所有数据均由算法合成，不对应任何真实存在的个人、住址、电话号码或账户。",
        ],
      },
      {
        heading: "2. 允许的用途",
        body: [
          "- 软件与网站的测试、开发、联调。",
          "- 产品原型的界面演示与数据占位。",
          "- 数据库、表单的填充与压力测试。",
          "- 教学与教学演示。",
        ],
      },
      {
        heading: "3. 禁止的用途",
        body: [
          "你不得将本站生成的数据用于：",
          "- 冒充他人、实施欺诈或任何违法行为。",
          "- 注册需要真实身份的服务，或规避平台的身份验证与地区限制。",
          "- 骚扰、诽谤或侵害他人权益。",
          "用户须自行承担因使用生成数据而产生的一切后果与法律责任。",
        ],
      },
      {
        heading: "4. 免责声明",
        body: [
          "本站按「现状」提供，不对生成数据的准确性、完整性或适用性作任何明示或默示的保证。",
          "我们不保证生成的数据在任何特定平台或系统中能通过校验，也不保证服务不中断、无错误。",
        ],
      },
      {
        heading: "5. 责任限制",
        body: [
          "在法律允许的最大范围内，我们不对因使用或无法使用本站而产生的任何直接、间接、附带或后果性损害承担责任。",
        ],
      },
      {
        heading: "6. 条款变更",
        body: ["我们可能不时修订本条款。修订后继续使用本站，即视为接受修订后的条款。"],
      },
    ],
  },
  en: {
    title: "Terms of Service",
    intro: "By using this site you agree to the terms below. Please read them in full before use.",
    sections: [
      {
        heading: "1. What this service is",
        body: [
          "This site provides a tool that generates synthetic identity and address data. All output is produced by an algorithm and does not correspond to any real person, address, telephone number or account.",
        ],
      },
      {
        heading: "2. Permitted uses",
        body: [
          "- Software and website testing, development and integration.",
          "- UI prototyping, demos and placeholder content.",
          "- Database and form seeding, and load testing.",
          "- Teaching and instructional demonstrations.",
        ],
      },
      {
        heading: "3. Prohibited uses",
        body: [
          "You must not use data generated here to:",
          "- Impersonate any person, commit fraud, or engage in any unlawful activity.",
          "- Register for services that require real identity, or circumvent a platform's identity checks or regional restrictions.",
          "- Harass, defame or infringe the rights of others.",
          "You are solely responsible for any consequence and legal liability arising from your use of the generated data.",
        ],
      },
      {
        heading: "4. Disclaimer",
        body: [
          "This site is provided \"as is\", without any express or implied warranty as to the accuracy, completeness or fitness for purpose of the generated data.",
          "We do not guarantee that generated data will pass validation on any particular platform or system, nor that the service will be uninterrupted or error-free.",
        ],
      },
      {
        heading: "5. Limitation of liability",
        body: [
          "To the maximum extent permitted by law, we are not liable for any direct, indirect, incidental or consequential damages arising from your use of, or inability to use, this site.",
        ],
      },
      {
        heading: "6. Changes to these terms",
        body: ["We may revise these terms from time to time. Continued use of the site after a revision constitutes acceptance of the revised terms."],
      },
    ],
  },
  ja: {
    title: "利用規約",
    intro: "本サイトをご利用いただくことで、以下の規約に同意したものとみなします。ご利用前に全文をお読みください。",
    sections: [
      {
        heading: "1. サービスの性質",
        body: [
          "本サイトは、仮想的な身元情報および住所データを生成するツールを提供します。生成物はすべてアルゴリズムによるもので、実在する人物・住所・電話番号・アカウントとは一切関係ありません。",
        ],
      },
      {
        heading: "2. 許可される用途",
        body: [
          "- ソフトウェアおよびウェブサイトのテスト、開発、結合テスト。",
          "- UI プロトタイプのデモおよびプレースホルダー。",
          "- データベースやフォームへのデータ投入、負荷テスト。",
          "- 教育および教材での演示。",
        ],
      },
      {
        heading: "3. 禁止される用途",
        body: [
          "生成されたデータを以下の目的で使用してはなりません。",
          "- 他人へのなりすまし、詐欺、その他違法行為。",
          "- 実在の本人確認を要するサービスへの登録、またはプラットフォームの本人確認・地域制限の回避。",
          "- 嫌がらせ、名誉毀損、その他第三者の権利侵害。",
          "生成データの利用によって生じる一切の結果および法的責任は、利用者が負うものとします。",
        ],
      },
      {
        heading: "4. 免責事項",
        body: [
          "本サイトは「現状のまま」提供され、生成データの正確性、完全性、特定目的への適合性について、明示・黙示を問わずいかなる保証も行いません。",
          "特定のプラットフォームやシステムで生成データが検証を通過すること、およびサービスが中断なく動作することを保証しません。",
        ],
      },
      {
        heading: "5. 責任の制限",
        body: [
          "法律で許容される最大限の範囲において、本サイトの利用または利用不能により生じた直接的・間接的・付随的・結果的損害について、当方は責任を負いません。",
        ],
      },
      {
        heading: "6. 規約の変更",
        body: ["本規約は随時改定することがあります。改定後も本サイトの利用を継続した場合、改定後の規約に同意したものとみなします。"],
      },
    ],
  },
  ko: {
    title: "서비스 약관",
    intro: "본 사이트를 이용함으로써 아래 약관에 동의한 것으로 간주됩니다. 이용 전에 전문을 확인해 주세요.",
    sections: [
      {
        heading: "1. 서비스의 성격",
        body: [
          "본 사이트는 가상의 신원 정보와 주소 데이터를 생성하는 도구를 제공합니다. 모든 생성물은 알고리즘이 만든 것이며 실존하는 인물·주소·전화번호·계정과 무관합니다.",
        ],
      },
      {
        heading: "2. 허용되는 용도",
        body: [
          "- 소프트웨어 및 웹사이트 테스트, 개발, 통합.",
          "- UI 프로토타입 데모 및 임시 데이터.",
          "- 데이터베이스·양식 데이터 입력, 부하 테스트.",
          "- 교육 및 강의 시연.",
        ],
      },
      {
        heading: "3. 금지되는 용도",
        body: [
          "생성된 데이터를 다음 목적으로 사용해서는 안 됩니다.",
          "- 타인 사칭, 사기 또는 그 밖의 불법 행위.",
          "- 실명 확인이 필요한 서비스 가입, 또는 플랫폼의 본인 확인·지역 제한 우회.",
          "- 괴롭힘, 명예훼손, 제3자 권리 침해.",
          "생성 데이터 이용으로 발생하는 모든 결과와 법적 책임은 이용자에게 있습니다.",
        ],
      },
      {
        heading: "4. 면책 조항",
        body: [
          "본 사이트는 '있는 그대로' 제공되며, 생성 데이터의 정확성·완전성·특정 목적 적합성에 대해 명시적이든 묵시적이든 어떠한 보증도 하지 않습니다.",
          "특정 플랫폼이나 시스템에서 생성 데이터가 검증을 통과하는지, 서비스가 중단 없이 동작하는지는 보장하지 않습니다.",
        ],
      },
      {
        heading: "5. 책임의 제한",
        body: [
          "법이 허용하는 최대 범위에서, 본 사이트의 이용 또는 이용 불능으로 발생한 직접적·간접적·부수적·결과적 손해에 대해 책임지지 않습니다.",
        ],
      },
      {
        heading: "6. 약관의 변경",
        body: ["본 약관은 수시로 개정될 수 있습니다. 개정 후에도 사이트 이용을 계속하면 개정된 약관에 동의한 것으로 봅니다."],
      },
    ],
  },
  "zh-hant": {
    title: "服務條款",
    intro: "使用本站即表示你同意以下條款。",
    sections: [
      {
        heading: "服務說明",
        body: [
          "本站提供程式合成的虛擬身份與地址資料，供軟體開發、測試與表單示範使用。",
        ],
      },
      {
        heading: "使用限制",
        body: [
          "你不得將本站產生的資料用於任何違法目的，包括但不限於：",
          "- 冒充他人或從事身分詐欺。",
          "- 註冊需要真實身分驗證的服務。",
          "- 規避任何平台的身分查核機制。",
          "- 從事任何違反當地法律的行為。",
        ],
      },
      {
        heading: "資料性質",
        body: [
          "所有資料均由演算法合成，不對應任何真實個人、住址、電話或帳戶。證件號碼雖符合官方格式與檢查碼規則，但並非由任何政府機關核發。",
        ],
      },
      {
        heading: "免責聲明",
        body: [
          "本站依「現狀」提供，不對資料的適用性作任何保證。使用者須自行承擔使用本站資料的一切風險與責任。",
        ],
      },
    ],
  },
};
