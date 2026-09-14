/**
 * Privacy policy copy.
 *
 * This is generated rather than hand-written, and it reflects the *actual*
 * configuration: if no analytics or advertising is configured, the policy says
 * so. The legacy implementation hard-coded claims about Google Analytics and
 * AdSense while shipping neither, which is a disclosure defect in its own
 * right — declaring data collection you do not perform is still inaccurate.
 *
 * `SITE.analyticsToken` and `SITE.adsenseClient` are read at build time.
 */

import { SITE, type SiteLang } from "./config.js";
import type { PageCopy } from "./content.js";

/** Builds the privacy policy for one language, based on live config. */
export function buildPrivacy(lang: SiteLang): PageCopy {
  const hasAds = SITE.adsenseClient.length > 0;
  const hasAnalytics = SITE.analyticsToken.length > 0;
  const email = SITE.email;

  const thirdParties: string[] = [];
  if (hasAnalytics) {
    thirdParties.push(
      lang === "zh-hant"
        ? "Cloudflare Web Analytics：用於統計造訪量。它不設定 Cookie，不蒐集個人資訊，也不進行跨站追蹤。"
        : lang === "zh"
        ? "Cloudflare Web Analytics：用于统计访问量。它不设置 Cookie，不采集个人信息，不跨站追踪。"
        : lang === "ja"
          ? "Cloudflare Web Analytics：アクセス解析に使用します。Cookie を設定せず、個人情報を収集せず、クロスサイト追跡も行いません。"
          : lang === "ko"
            ? "Cloudflare Web Analytics: 방문 통계에 사용합니다. 쿠키를 설정하지 않고 개인정보를 수집하지 않으며 교차 사이트 추적도 하지 않습니다."
            : "Cloudflare Web Analytics, used for traffic statistics. It sets no cookies, collects no personal information and performs no cross-site tracking.",
    );
  }
  if (hasAds) {
    thirdParties.push(
      lang === "zh-hant"
        ? "Google AdSense：用於顯示廣告。Google 及其合作夥伴可能使用 Cookie，依據你先前造訪本站或其他網站的記錄投放廣告。你可以透過 Google 廣告設定選擇停用個人化廣告。"
        : lang === "zh"
        ? "Google AdSense：用于展示广告。Google 及其合作伙伴可能使用 Cookie 基于你此前访问本站或其他网站的记录投放广告。你可以通过 Google 广告设置选择停用个性化广告。"
        : lang === "ja"
          ? "Google AdSense：広告配信に使用します。Google とそのパートナーは Cookie を使用し、本サイトや他サイトへの過去のアクセスに基づいて広告を配信する場合があります。Google の広告設定でパーソナライズ広告を無効にできます。"
          : lang === "ko"
            ? "Google AdSense: 광고 게재에 사용합니다. Google과 파트너는 쿠키를 사용하여 본 사이트 또는 다른 사이트의 이전 방문 기록을 기반으로 광고를 게재할 수 있습니다. Google 광고 설정에서 맞춤 광고를 해제할 수 있습니다."
            : "Google AdSense, used to display advertising. Google and its partners may use cookies to serve ads based on your prior visits to this or other websites. You can opt out of personalised advertising in Google Ads Settings.",
    );
  }
  if (thirdParties.length === 0) {
    thirdParties.push(
      lang === "zh-hant"
        ? "本站目前未接入任何第三方分析或廣告服務，因此不會向任何第三方傳輸資料。"
        : lang === "zh"
        ? "本站当前未接入任何第三方分析或广告服务，因此不向任何第三方传输数据。"
        : lang === "ja"
          ? "現在、第三者による解析サービスや広告サービスは一切導入していないため、第三者へのデータ送信はありません。"
          : lang === "ko"
            ? "현재 제3자 분석 또는 광고 서비스를 사용하지 않으므로 제3자에게 데이터를 전송하지 않습니다."
            : "No third-party analytics or advertising service is currently integrated, so no data is transmitted to any third party.",
    );
  }

  if (lang === "zh-hant") {
    return {
      title: "隱私政策",
      intro: "本政策說明本站如何處理你的資訊。核心事實很簡單：產生過程完全在你的瀏覽器內完成。",
      sections: [
        {
          heading: "1. 我們不蒐集什麼",
          body: [
            "這是最重要的一節：",
            "- 你產生的所有身份與地址資料都只存在於你的瀏覽器中，從不上傳到任何伺服器。",
            "- 本站沒有帳號系統，不要求你註冊或登入。",
            "- 我們不記錄你產生了哪些資料，也不保存產生歷史。",
          ],
        },
        {
          heading: "2. 本機儲存",
          body: [
            "本站使用瀏覽器本機儲存（localStorage）保存兩項設定：你的深色／淺色主題偏好，以及語言偏好。這些資料只存在於你的裝置上，你可以隨時清除瀏覽器資料將其刪除。",
          ],
        },
        {
          heading: "3. 臨時信箱功能",
          body: [
                    "臨時信箱是本站唯一需要連網的功能。當你使用它時：",
                    "- 瀏覽器會向信箱伺服器（mail.yiscience.cn）發送請求，用於建立信箱地址與取得郵件。",
                    "- 你建立的信箱地址、收到的郵件內容保存在該伺服器上，本站在伺服器端不讀取、不記錄。",
                    "- 信箱地址與存取憑證僅保存在你瀏覽器的工作階段儲存中，關閉分頁即清除。",
                    "如果你不使用臨時信箱功能，本站不會向任何伺服器發送請求。"
          ],
        },
        {
          heading: "4. 第三方服務",
          body: thirdParties,
        },
        {
          heading: "4. 伺服器日誌",
          body: [
            "本站以靜態檔案形式代管。代管服務商可能會記錄標準的存取日誌（IP 位址、時間、請求路徑、User-Agent），用於安全防護與流量統計。這些日誌由代管商依其自身隱私政策處理，我們無法將其與特定個人關聯。",
          ],
        },
        {
          heading: "5. 兒童隱私",
          body: ["本站不面向 13 歲以下兒童，也不會有意識地蒐集兒童的任何資訊。"],
        },
        {
          heading: "6. 你的權利",
          body: [
            "由於我們不蒐集可辨識你個人身份的資料，通常不存在需要匯出或刪除的個人資料。若你對本政策有疑問，可透過下方信箱與我們聯絡。",
          ],
        },
        {
          heading: "7. 政策變更",
          body: ["若本政策發生實質性變更，我們會在本頁更新內容並修改頁面頂部的日期。"],
        },
        {
          heading: "8. 聯絡方式",
          body: [`如有隱私相關問題，請聯絡：${email}`],
        },
      ],
    };
  }

  if (lang === "zh") {
    return {
      title: "隐私政策",
      intro: "本政策说明本站如何处理你的信息。核心事实很简单：生成过程完全在你的浏览器内完成。",
      sections: [
        {
          heading: "1. 我们不收集什么",
          body: [
            "这是最重要的一节：",
            "- 你生成的所有身份与地址数据都只存在于你的浏览器中，从不上传到任何服务器。",
            "- 本站没有账号系统，不要求你注册或登录。",
            "- 我们不记录你生成了哪些数据，也不保存生成历史。",
          ],
        },
        {
          heading: "2. 本地存储",
          body: [
            "本站使用浏览器本地存储（localStorage）保存两项设置：你的深色/浅色主题偏好，以及语言偏好。这些数据只存在于你的设备上，你可以随时清除浏览器数据将其删除。",
          ],
        },
        {
          heading: "3. 临时邮箱功能",
          body: [
                    "临时邮箱是本站唯一需要联网的功能。当你使用它时：",
                    "- 浏览器会向邮箱服务器（mail.yiscience.cn）发送请求，用于创建邮箱地址和拉取邮件。",
                    "- 你创建的邮箱地址、收到的邮件内容保存在该服务器上，本站在服务器端不读取、不记录。",
                    "- 邮箱地址与访问凭据仅保存在你浏览器的会话存储中，关闭标签页即清除。",
                    "如果你不使用临时邮箱功能，本站不会向任何服务器发送请求。"
          ],
        },
        {
          heading: "4. 第三方服务",
          body: thirdParties,
        },
        {
          heading: "4. 服务器日志",
          body: [
            "本站以静态文件形式托管。托管服务商可能会记录标准的访问日志（IP 地址、时间、请求路径、User-Agent），用于安全防护和流量统计。这些日志由托管商按其自身隐私政策处理，我们无法将其与特定个人关联。",
          ],
        },
        {
          heading: "5. 儿童隐私",
          body: ["本站不面向 13 岁以下儿童，也不会有意收集儿童的任何信息。"],
        },
        {
          heading: "6. 你的权利",
          body: [
            "由于我们不收集可识别你个人身份的数据，通常不存在需要导出或删除的个人数据。若你对本政策有疑问，可通过下方邮箱与我们联系。",
          ],
        },
        {
          heading: "7. 政策变更",
          body: ["若本政策发生实质性变更，我们会在本页更新内容并修改页面顶部的日期。"],
        },
        {
          heading: "8. 联系方式",
          body: [`如有隐私相关问题，请联系：${email}`],
        },
      ],
    };
  }

  if (lang === "ja") {
    return {
      title: "プライバシーポリシー",
      intro: "本ポリシーは、本サイトがお客様の情報をどのように扱うかを説明します。要点はシンプルです。生成処理はすべてお使いのブラウザ内で完結します。",
      sections: [
        {
          heading: "1. 収集しないもの",
          body: [
            "これが最も重要な項目です。",
            "- 生成された身元・住所データはブラウザ内にのみ存在し、サーバーへ送信されることはありません。",
            "- 本サイトにアカウント機能はなく、登録やログインは不要です。",
            "- どのようなデータを生成したかを記録せず、生成履歴も保存しません。",
          ],
        },
        {
          heading: "2. ローカルストレージ",
          body: [
            "本サイトはブラウザの localStorage に 2 つの設定（ダーク／ライトテーマの好み、言語の選択）を保存します。これらはお使いの端末内にのみ存在し、ブラウザのデータを消去すればいつでも削除できます。",
          ],
        },
        {
          heading: "3. 使い捨てメール機能",
          body: [
                    "使い捨てメールは、本サイトで唯一ネットワーク接続を必要とする機能です。ご利用の際は：",
                    "- アドレスの作成とメール取得のため、ブラウザからメールサーバー（mail.yiscience.cn）へリクエストを送信します。",
                    "- 作成したアドレスと受信したメール本文はそのサーバーに保存されます。当サイトがサーバー側で読み取りや記録を行うことはありません。",
                    "- アドレスとアクセス用トークンはブラウザのセッションストレージにのみ保存され、タブを閉じると消去されます。",
                    "使い捨てメールを利用しない場合、本サイトはどのサーバーへもリクエストを送信しません。"
          ],
        },
        {
          heading: "4. 第三者サービス",
          body: thirdParties,
        },
        {
          heading: "4. サーバーログ",
          body: [
            "本サイトは静的ファイルとして配信されています。ホスティング事業者は、セキュリティとトラフィック統計のために標準的なアクセスログ（IP アドレス、時刻、リクエストパス、User-Agent）を記録する場合があります。これらのログは事業者のプライバシーポリシーに従って処理され、当方が特定の個人と結び付けることはできません。",
          ],
        },
        {
          heading: "5. 児童のプライバシー",
          body: ["本サイトは 13 歳未満の児童を対象としておらず、児童の情報を意図的に収集することはありません。"],
        },
        {
          heading: "6. お客様の権利",
          body: [
            "個人を特定できるデータを収集していないため、通常、開示や削除の対象となる個人データは存在しません。本ポリシーについてご不明な点は、下記のメールアドレスまでご連絡ください。",
          ],
        },
        {
          heading: "7. ポリシーの変更",
          body: ["本ポリシーに重要な変更を加える場合は、本ページを更新し、上部の日付を変更します。"],
        },
        {
          heading: "8. お問い合わせ",
          body: [`プライバシーに関するお問い合わせ：${email}`],
        },
      ],
    };
  }

  if (lang === "ko") {
    return {
      title: "개인정보 처리방침",
      intro: "본 방침은 이 사이트가 이용자의 정보를 어떻게 처리하는지 설명합니다. 핵심은 단순합니다. 생성 과정은 전적으로 브라우저 안에서 완결됩니다.",
      sections: [
        {
          heading: "1. 수집하지 않는 것",
          body: [
            "가장 중요한 항목입니다.",
            "- 생성된 신원·주소 데이터는 브라우저 안에만 존재하며 서버로 전송되지 않습니다.",
            "- 계정 시스템이 없으며 가입이나 로그인이 필요하지 않습니다.",
            "- 어떤 데이터를 생성했는지 기록하지 않고 생성 이력도 저장하지 않습니다.",
          ],
        },
        {
          heading: "2. 로컬 저장소",
          body: [
            "이 사이트는 브라우저 localStorage에 두 가지 설정(다크/라이트 테마 선호, 언어 선택)을 저장합니다. 이 데이터는 이용자 기기에만 존재하며 브라우저 데이터를 삭제하면 언제든지 제거됩니다.",
          ],
        },
        {
          heading: "3. 임시 메일 기능",
          body: [
                    "임시 메일은 이 사이트에서 유일하게 네트워크 연결이 필요한 기능입니다. 사용할 경우:",
                    "- 주소 생성과 메일 수신을 위해 브라우저가 메일 서버(mail.yiscience.cn)로 요청을 보냅니다.",
                    "- 생성한 주소와 수신한 메일 내용은 해당 서버에 저장됩니다. 이 사이트는 서버 측에서 이를 읽거나 기록하지 않습니다.",
                    "- 주소와 접근 토큰은 브라우저 세션 저장소에만 보관되며 탭을 닫으면 삭제됩니다.",
                    "임시 메일을 사용하지 않으면 이 사이트는 어떤 서버로도 요청을 보내지 않습니다."
          ],
        },
        {
          heading: "4. 제3자 서비스",
          body: thirdParties,
        },
        {
          heading: "4. 서버 로그",
          body: [
            "이 사이트는 정적 파일로 호스팅됩니다. 호스팅 사업자는 보안과 트래픽 통계를 위해 표준 접속 로그(IP 주소, 시각, 요청 경로, User-Agent)를 기록할 수 있습니다. 이 로그는 사업자의 개인정보 처리방침에 따라 처리되며, 당사가 특정 개인과 연결할 수 없습니다.",
          ],
        },
        {
          heading: "5. 아동의 개인정보",
          body: ["이 사이트는 만 13세 미만 아동을 대상으로 하지 않으며 아동의 정보를 의도적으로 수집하지 않습니다."],
        },
        {
          heading: "6. 이용자의 권리",
          body: [
            "개인을 식별할 수 있는 데이터를 수집하지 않으므로 일반적으로 내보내거나 삭제할 개인정보가 존재하지 않습니다. 본 방침에 대해 궁금한 점은 아래 이메일로 문의해 주세요.",
          ],
        },
        {
          heading: "7. 방침의 변경",
          body: ["본 방침에 중대한 변경이 있는 경우 이 페이지를 갱신하고 상단의 날짜를 수정합니다."],
        },
        {
          heading: "8. 문의",
          body: [`개인정보 관련 문의: ${email}`],
        },
      ],
    };
  }

  return {
    title: "Privacy Policy",
    intro: "This policy explains how this site handles your information. The core fact is simple: generation happens entirely inside your browser.",
    sections: [
      {
        heading: "1. What we do not collect",
        body: [
          "This is the most important section:",
          "- Every identity and address you generate exists only in your browser and is never uploaded to a server.",
          "- There is no account system; you are never asked to register or log in.",
          "- We do not record what you generated, and no generation history is kept.",
        ],
      },
      {
        heading: "2. Local storage",
        body: [
          "The site uses browser localStorage to remember two preferences: your light/dark theme choice and your language choice. This data exists only on your device and is removed whenever you clear your browser data.",
        ],
      },
      {
        heading: "3. Third-party services",
        body: thirdParties,
      },
      {
        heading: "4. Server logs",
        body: [
          "This site is hosted as static files. The hosting provider may record standard access logs (IP address, time, request path, User-Agent) for security and traffic measurement. Those logs are handled under the provider's own privacy policy, and we have no way to associate them with a particular individual.",
        ],
      },
      {
        heading: "5. Children's privacy",
        body: ["This site is not directed at children under 13, and we do not knowingly collect information from them."],
      },
      {
        heading: "6. Your rights",
        body: [
          "Because we do not collect data that identifies you, there is normally no personal data to export or erase. If you have a question about this policy, contact us at the address below.",
        ],
      },
      {
        heading: "7. Changes to this policy",
        body: ["If this policy changes materially, we will update this page and revise the date shown at the top."],
      },
      {
        heading: "8. Contact",
        body: [`For privacy questions, contact: ${email}`],
      },
    ],
  };
}
