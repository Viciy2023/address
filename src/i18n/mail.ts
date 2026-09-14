/**
 * UI strings for the temporary mailbox, in all five languages.
 *
 * Kept separate from `i18n/strings.ts` because the mailbox is a self-contained
 * feature: its labels, empty states, status line and guide belong together, and
 * the main string table is already large enough that adding these keys to five
 * language blocks there would bury them.
 */

import type { SiteLang } from "../config.js";

export interface MailStrings {
  /** Navigation label. */
  nav: string;
  title: string;
  intro: string;

  /* controls */
  domainLabel: string;
  prefixLabel: string;
  prefixPlaceholder: string;
  newAddress: string;

  /* current address */
  yourAddress: string;
  copyAddress: string;
  addressCopied: string;
  refresh: string;
  /** Label beside the auto-refresh checkbox. */
  autoRefresh: string;
  clearInbox: string;
  clearing: string;

  /* inbox */
  inbox: string;
  empty: string;
  emptyHint: string;
  loading: string;
  unread: string;
  from: string;
  attachments: string;

  /* live status line above the inbox */
  receiving: string;
  /** Appended directly after the seconds count, e.g. "3" + " 秒后自动刷新". */
  secondsUntilRefresh: string;
  autoRefreshOff: string;

  /* explanatory card below the inbox */
  guideTitle: string;
  guideSteps: { title: string; body: string }[];

  /* verification codes */
  detectedCodes: string;
  copyCode: string;
  codeCopied: string;
  noCode: string;

  /* notices */
  privacyNote: string;
  disclaimer: string;

  /* errors */
  errUnreachable: string;
  errCreate: string;
  errLoad: string;
  errClear: string;
  errPrefixTooShort: string;
  errPrefixTooLong: string;
  errPrefixChars: string;
  errDomain: string;
}

export const MAIL: Record<SiteLang, MailStrings> = {
  zh: {
    nav: "临时邮箱",
    title: "临时邮箱",
    intro: "无需注册即可使用的一次性邮箱地址。用它注册网站、接收验证码，邮件会自动出现在下方收件箱，复制验证码即可完成验证。",
    domainLabel: "邮箱域名",
    prefixLabel: "自定义前缀",
    prefixPlaceholder: "留空则随机生成",
    newAddress: "换一个新地址",
    yourAddress: "当前邮箱地址",
    copyAddress: "复制地址",
    addressCopied: "已复制地址",
    refresh: "刷新",
    autoRefresh: "每 5 秒自动刷新",
    clearInbox: "清空收件箱",
    clearing: "正在清空…",
    inbox: "收件箱",
    empty: "还没有收到邮件",
    emptyHint: "把上面的地址复制去注册网站，收到的邮件会自动显示在这里。",
    loading: "正在加载…",
    unread: "未读",
    from: "发件人",
    attachments: "附件",
    receiving: "正在接收邮件…",
    secondsUntilRefresh: " 秒后自动刷新",
    autoRefreshOff: "自动刷新已关闭",
    guideTitle: "临时邮箱怎么用",
    guideSteps: [
      { title: "复制上面的地址", body: "点一下「复制地址」，地址就进了剪贴板。无需注册，也不需要设置密码。" },
      { title: "填进你要注册的网站", body: "在网站的邮箱栏粘贴这个地址，然后照常提交注册表单。" },
      { title: "回来等验证码", body: "对方发来的邮件会自动出现在上方收件箱，不必手动刷新。页面每 5 秒自动检查一次。" },
      { title: "复制验证码", body: "展开邮件，页面会把其中的验证码单独提取出来，点一下即可复制，再填回注册页面。" },
      { title: "用完即弃", body: "地址可以随时点「换一个新地址」丢弃。邮箱只在本次会话内保留，关闭标签页即失效。" },
    ],
    detectedCodes: "检测到的验证码",
    copyCode: "复制验证码",
    codeCopied: "已复制验证码",
    noCode: "未检测到验证码，请查看邮件正文。",
    privacyNote: "邮件内容保存在邮箱服务器上，本站不会读取或记录。",
    disclaimer: "临时邮箱仅用于接收注册验证邮件，请勿用于任何违法用途。",
    errUnreachable: "无法连接邮箱服务，请检查网络后重试。",
    errCreate: "创建邮箱地址失败，请稍后重试或换一个前缀。",
    errLoad: "加载邮件失败，请稍后重试。",
    errClear: "清空收件箱失败，请稍后重试。",
    errPrefixTooShort: "前缀太短。",
    errPrefixTooLong: "前缀太长。",
    errPrefixChars: "前缀只能包含字母和数字。",
    errDomain: "该域名暂不可用，请换一个域名。",
  },
  "zh-hant": {
    nav: "臨時信箱",
    title: "臨時信箱",
    intro: "免註冊即可使用的一次性信箱地址。用它註冊網站、接收驗證碼，郵件會自動出現在下方收件匣，複製驗證碼即可完成驗證。",
    domainLabel: "信箱網域",
    prefixLabel: "自訂前綴",
    prefixPlaceholder: "留空則隨機產生",
    newAddress: "換一個新地址",
    yourAddress: "目前信箱地址",
    copyAddress: "複製地址",
    addressCopied: "已複製地址",
    refresh: "重新整理",
    autoRefresh: "每 5 秒自動重新整理",
    clearInbox: "清空收件匣",
    clearing: "正在清空…",
    inbox: "收件匣",
    empty: "尚未收到郵件",
    emptyHint: "把上面的地址複製去註冊網站，收到的郵件會自動顯示在這裡。",
    loading: "正在載入…",
    unread: "未讀",
    from: "寄件人",
    attachments: "附件",
    receiving: "正在接收郵件…",
    secondsUntilRefresh: " 秒後自動重新整理",
    autoRefreshOff: "自動重新整理已關閉",
    guideTitle: "臨時信箱怎麼用",
    guideSteps: [
      { title: "複製上面的地址", body: "點一下「複製地址」，地址就進了剪貼簿。無需註冊，也不必設定密碼。" },
      { title: "填進你要註冊的網站", body: "在網站的電子郵件欄位貼上這個地址，然後照常送出註冊表單。" },
      { title: "回來等驗證碼", body: "對方寄來的郵件會自動出現在上方收件匣，不必手動重新整理。頁面每 5 秒檢查一次。" },
      { title: "複製驗證碼", body: "展開郵件，頁面會把其中的驗證碼單獨擷取出來，點一下即可複製，再填回註冊頁面。" },
      { title: "用完即丟", body: "地址可以隨時點「換一個新地址」丟棄。信箱只在本次工作階段保留，關閉分頁即失效。" },
    ],
    detectedCodes: "偵測到的驗證碼",
    copyCode: "複製驗證碼",
    codeCopied: "已複製驗證碼",
    noCode: "未偵測到驗證碼，請查看郵件內容。",
    privacyNote: "郵件內容儲存在信箱伺服器上，本站不會讀取或記錄。",
    disclaimer: "臨時信箱僅用於接收註冊驗證郵件，請勿用於任何違法用途。",
    errUnreachable: "無法連線信箱服務，請檢查網路後重試。",
    errCreate: "建立信箱地址失敗，請稍後重試或換一個前綴。",
    errLoad: "載入郵件失敗，請稍後重試。",
    errClear: "清空收件匣失敗，請稍後重試。",
    errPrefixTooShort: "前綴太短。",
    errPrefixTooLong: "前綴太長。",
    errPrefixChars: "前綴只能包含字母與數字。",
    errDomain: "該網域暫不可用，請換一個網域。",
  },
  en: {
    nav: "Temp Mail",
    title: "Temporary Mailbox",
    intro: "A disposable email address with no sign-up. Use it to register on a site and receive the verification code; messages arrive in the inbox below automatically, ready to copy.",
    domainLabel: "Mail domain",
    prefixLabel: "Custom prefix",
    prefixPlaceholder: "Leave blank for a random one",
    newAddress: "New address",
    yourAddress: "Current address",
    copyAddress: "Copy address",
    addressCopied: "Address copied",
    refresh: "Refresh",
    autoRefresh: "Refresh every 5 seconds",
    clearInbox: "Clear inbox",
    clearing: "Clearing…",
    inbox: "Inbox",
    empty: "No messages yet",
    emptyHint: "Copy the address above and use it to register; incoming mail appears here on its own.",
    loading: "Loading…",
    unread: "Unread",
    from: "From",
    attachments: "Attachments",
    receiving: "Receiving mail…",
    secondsUntilRefresh: "s until refresh",
    autoRefreshOff: "Auto-refresh is off",
    guideTitle: "How to use this mailbox",
    guideSteps: [
      { title: "Copy the address above", body: "One click puts it on your clipboard. No sign-up, and no password to set." },
      { title: "Paste it into the site you are joining", body: "Drop the address into the email field and submit the form as usual." },
      { title: "Come back for the code", body: "The message appears in the inbox above on its own; nothing to refresh by hand. The page checks every 5 seconds." },
      { title: "Copy the verification code", body: "Open the message and the page lifts the code out separately, ready to copy straight back into the signup form." },
      { title: "Throw it away", body: "Use New address whenever you like. The mailbox lasts for this session only and is gone once the tab closes." },
    ],
    detectedCodes: "Detected codes",
    copyCode: "Copy code",
    codeCopied: "Code copied",
    noCode: "No code detected — see the message body.",
    privacyNote: "Message contents are stored on the mailbox server; this site does not read or record them.",
    disclaimer: "Use the mailbox only to receive registration mail. Do not use it for anything unlawful.",
    errUnreachable: "Cannot reach the mailbox service. Check your connection and try again.",
    errCreate: "Could not create an address. Try again in a moment, or use a different prefix.",
    errLoad: "Could not load messages. Try again in a moment.",
    errClear: "Could not clear the inbox. Try again in a moment.",
    errPrefixTooShort: "The prefix is too short.",
    errPrefixTooLong: "The prefix is too long.",
    errPrefixChars: "The prefix may contain letters and digits only.",
    errDomain: "That domain is unavailable right now. Try another one.",
  },
  ja: {
    nav: "使い捨てメール",
    title: "使い捨てメール",
    intro: "登録不要で使える一回限りのメールアドレスです。サイトの登録や確認コードの受信に使い、届いたメールは下の受信トレイに自動で表示されます。",
    domainLabel: "メールドメイン",
    prefixLabel: "カスタム接頭辞",
    prefixPlaceholder: "空欄ならランダム生成",
    newAddress: "新しいアドレス",
    yourAddress: "現在のアドレス",
    copyAddress: "アドレスをコピー",
    addressCopied: "コピーしました",
    refresh: "更新",
    autoRefresh: "5 秒ごとに自動更新",
    clearInbox: "受信トレイを空にする",
    clearing: "削除中…",
    inbox: "受信トレイ",
    empty: "まだメールがありません",
    emptyHint: "上のアドレスをコピーして登録に使い、届いたメールはここに自動表示されます。",
    loading: "読み込み中…",
    unread: "未読",
    from: "差出人",
    attachments: "添付ファイル",
    receiving: "メールを受信しています…",
    secondsUntilRefresh: " 秒後に自動更新",
    autoRefreshOff: "自動更新はオフです",
    guideTitle: "使い捨てメールの使い方",
    guideSteps: [
      { title: "上のアドレスをコピー", body: "「アドレスをコピー」を押すだけでクリップボードに入ります。登録もパスワード設定も不要です。" },
      { title: "登録するサイトに貼り付け", body: "サイトのメール欄にこのアドレスを貼り、そのまま登録フォームを送信します。" },
      { title: "戻って確認コードを待つ", body: "届いたメールは上の受信トレイに自動で表示されます。手動更新は不要で、5 秒ごとに確認します。" },
      { title: "確認コードをコピー", body: "メールを開くと本文からコードだけを取り出します。ワンタップでコピーして登録画面に戻せます。" },
      { title: "使い終わったら捨てる", body: "「新しいアドレス」でいつでも破棄できます。メールボックスはこのセッション限りで、タブを閉じると消えます。" },
    ],
    detectedCodes: "検出されたコード",
    copyCode: "コードをコピー",
    codeCopied: "コードをコピーしました",
    noCode: "コードを検出できませんでした。本文をご確認ください。",
    privacyNote: "メール本文はメールサーバー上に保存され、当サイトは読み取りも記録も行いません。",
    disclaimer: "使い捨てメールは登録確認メールの受信のみにご利用ください。違法な用途には使用しないでください。",
    errUnreachable: "メールサービスに接続できません。通信環境をご確認のうえ再試行してください。",
    errCreate: "アドレスの作成に失敗しました。しばらくしてから、別の接頭辞でお試しください。",
    errLoad: "メールの読み込みに失敗しました。しばらくしてから再試行してください。",
    errClear: "受信トレイの削除に失敗しました。しばらくしてから再試行してください。",
    errPrefixTooShort: "接頭辞が短すぎます。",
    errPrefixTooLong: "接頭辞が長すぎます。",
    errPrefixChars: "接頭辞は半角英数字のみ使用できます。",
    errDomain: "このドメインは現在ご利用いただけません。別のドメインをお試しください。",
  },
  ko: {
    nav: "임시 메일",
    title: "임시 메일함",
    intro: "가입 없이 쓰는 일회용 이메일 주소입니다. 사이트 가입과 인증 코드 수신에 사용하고, 도착한 메일은 아래 받은편지함에 자동으로 표시됩니다.",
    domainLabel: "메일 도메인",
    prefixLabel: "사용자 지정 접두사",
    prefixPlaceholder: "비우면 무작위 생성",
    newAddress: "새 주소",
    yourAddress: "현재 주소",
    copyAddress: "주소 복사",
    addressCopied: "복사됨",
    refresh: "새로 고침",
    autoRefresh: "5초마다 자동 새로 고침",
    clearInbox: "받은편지함 비우기",
    clearing: "비우는 중…",
    inbox: "받은편지함",
    empty: "아직 메일이 없습니다",
    emptyHint: "위 주소를 복사해 가입에 사용하세요. 도착한 메일이 여기에 자동으로 표시됩니다.",
    loading: "불러오는 중…",
    unread: "읽지 않음",
    from: "보낸 사람",
    attachments: "첨부 파일",
    receiving: "메일을 받는 중…",
    secondsUntilRefresh: "초 후 자동 새로 고침",
    autoRefreshOff: "자동 새로 고침이 꺼져 있습니다",
    guideTitle: "임시 메일 사용법",
    guideSteps: [
      { title: "위 주소를 복사하세요", body: "‘주소 복사’를 누르면 클립보드에 들어갑니다. 가입도, 비밀번호 설정도 필요 없습니다." },
      { title: "가입할 사이트에 붙여넣으세요", body: "사이트의 이메일 칸에 이 주소를 붙여넣고 평소처럼 가입 양식을 제출하세요." },
      { title: "돌아와서 코드를 기다리세요", body: "도착한 메일은 위 받은편지함에 저절로 나타납니다. 직접 새로 고칠 필요 없이 5초마다 확인합니다." },
      { title: "인증 코드를 복사하세요", body: "메일을 펼치면 본문에서 코드만 따로 뽑아 줍니다. 눌러서 복사한 뒤 가입 화면에 붙여넣으면 됩니다." },
      { title: "다 쓰면 버리세요", body: "‘새 주소’로 언제든 바꿀 수 있습니다. 메일함은 이 세션 동안만 유지되며 탭을 닫으면 사라집니다." },
    ],
    detectedCodes: "감지된 코드",
    copyCode: "코드 복사",
    codeCopied: "코드 복사됨",
    noCode: "코드를 찾지 못했습니다. 본문을 확인하세요.",
    privacyNote: "메일 내용은 메일 서버에 저장되며, 이 사이트는 이를 읽거나 기록하지 않습니다.",
    disclaimer: "임시 메일은 가입 인증 메일 수신 용도로만 사용하세요. 불법적인 용도로 사용하지 마세요.",
    errUnreachable: "메일 서비스에 연결할 수 없습니다. 네트워크를 확인한 뒤 다시 시도하세요.",
    errCreate: "주소 생성에 실패했습니다. 잠시 후 다른 접두사로 다시 시도하세요.",
    errLoad: "메일을 불러오지 못했습니다. 잠시 후 다시 시도하세요.",
    errClear: "받은편지함을 비우지 못했습니다. 잠시 후 다시 시도하세요.",
    errPrefixTooShort: "접두사가 너무 짧습니다.",
    errPrefixTooLong: "접두사가 너무 깁니다.",
    errPrefixChars: "접두사는 영문과 숫자만 사용할 수 있습니다.",
    errDomain: "이 도메인은 현재 사용할 수 없습니다. 다른 도메인을 선택하세요.",
  },
};

export function mailStrings(lang: SiteLang): MailStrings {
  return MAIL[lang] ?? MAIL.en;
}
