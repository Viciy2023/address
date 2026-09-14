<script lang="ts">
  /**
   * Temporary mailbox.
   *
   * A disposable address the visitor can paste into a signup form, with the
   * verification code lifted out of the incoming mail so it can be copied in
   * one tap.
   *
   * Design notes
   *   - The address is the hero element: it is the one thing a visitor must
   *     copy, so it sits alone at the top with a single primary action.
   *   - Controls are on the left, the inbox on the right. Below 900px they
   *     stack with the address still first.
   *   - The inbox polls itself. Polling pauses while the tab is hidden, so a
   *     background tab does not keep hitting the mailbox server.
   *   - The address and its token are kept in sessionStorage so a reload does
   *     not silently discard a mailbox the visitor is mid-way through using.
   *     They are cleared when the tab closes.
   */
  import { onMount, onDestroy } from "svelte";
  import type { SiteLang } from "../config";
  import { mailStrings } from "../i18n/mail";
  import {
    fetchSettings, createAddress, listMails, clearInbox,
    extractCodes, sanitizeHtml, MailApiError,
    type MailSettings, type MailAddress, type Mail,
  } from "../lib/mail/api";

  export let lang: SiteLang;

  const m = mailStrings(lang);
  const STORAGE_KEY = "aimei.mailbox";
  const POLL_MS = 5000;

  let settings: MailSettings | null = null;
  let mailbox: MailAddress | null = null;
  let mails: Mail[] = [];
  let count = 0;

  let domain = "";
  let prefix = "";
  let busy = false;
  let loadingMail = true;
  let autoRefresh = true;
  let error = "";
  let copiedField: string | null = null;
  let openMailId: string | number | null = null;

  let pollTimer: ReturnType<typeof setInterval> | undefined;
  /** Seconds until the next automatic poll; drives the countdown line. */
  let secondsLeft = POLL_MS / 1000;

  function flash(key: string) {
    copiedField = key;
    setTimeout(() => { if (copiedField === key) copiedField = null; }, 1500);
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(key);
    } catch {
      // Clipboard API needs a secure context; fall back for http.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        flash(key);
      } catch { /* nothing more we can do */ }
    }
  }

  /** Turns an API failure into the right localized message. */
  function describe(e: unknown, fallback: string): string {
    if (e instanceof MailApiError) {
      if (e.status === 0) return m.errUnreachable;
      // The server's own message is more specific than a generic one; it is
      // shown when it is short enough to be a sentence rather than a stack.
      if (/invalid domain/i.test(e.message)) return m.errDomain;
      if (e.message.length > 0 && e.message.length <= 120) return e.message;
    }
    return fallback;
  }

  /** Creates a mailbox, optionally with the chosen prefix and domain. */
  async function newAddress() {
    if (busy) return;
    busy = true;
    error = "";
    try {
      const created = await createAddress({
        name: prefix.trim() || undefined,
        domain: domain || undefined,
      });
      mailbox = created;
      persist();
      mails = [];
      count = 0;
      openMailId = null;
      await refresh(true);
      restartPolling();
    } catch (e) {
      error = describe(e, m.errCreate);
    } finally {
      busy = false;
    }
  }

  /** Loads the inbox. `silent` avoids flicker during background polling. */
  async function refresh(silent = false) {
    if (!mailbox) return;
    if (!silent) loadingMail = true;
    try {
      const page = await listMails(mailbox.jwt, 25, 0);
      mails = page.results;
      count = page.count;
      /*
       * Only a user-initiated refresh clears the message. Background polling
       * must not, or a failed action (an unusable domain, say) reports its
       * error and then has it wiped by the next successful poll a few seconds
       * later — leaving the visitor with no explanation.
       */
      if (!silent) error = "";
    } catch (e) {
      // A polling failure should not wipe the list the visitor is reading.
      if (!silent) error = describe(e, m.errLoad);
    } finally {
      loadingMail = false;
    }
  }

  async function doClear() {
    if (!mailbox || busy) return;
    busy = true;
    error = "";
    try {
      await clearInbox(mailbox.jwt);
      mails = [];
      count = 0;
      openMailId = null;
    } catch (e) {
      error = describe(e, m.errClear);
    } finally {
      busy = false;
    }
  }

  function persist() {
    if (!mailbox) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(mailbox));
    } catch { /* storage disabled */ }
  }

  function restore(): MailAddress | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as MailAddress;
      return parsed?.jwt && parsed?.address ? parsed : null;
    } catch {
      return null;
    }
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = undefined;
  }

  /*
   * Poll only while the tab is visible. A mailbox left open in a background tab
   * would otherwise keep the visitor's device hitting the server indefinitely.
   *
   * A one-second ticker drives the countdown line above the inbox, so the
   * visitor can see that the page is waiting on purpose rather than stalled.
   */
  function restartPolling() {
    stopPolling();
    secondsLeft = POLL_MS / 1000;
    if (!autoRefresh || !mailbox) return;

    pollTimer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      secondsLeft -= 1;
      if (secondsLeft > 0) return;
      secondsLeft = POLL_MS / 1000;
      void refresh(true);
    }, 1000);
  }

  function onVisibility() {
    if (document.visibilityState === "visible") {
      secondsLeft = POLL_MS / 1000;
      void refresh(true);
    }
  }

  onMount(async () => {
    document.addEventListener("visibilitychange", onVisibility);
    try {
      settings = await fetchSettings();
      domain = settings.defaultDomains[0] ?? settings.domains[0] ?? "";
    } catch (e) {
      error = describe(e, m.errUnreachable);
      loadingMail = false;
      return;
    }

    // Reuse the mailbox from this session when there is one.
    const existing = restore();
    if (existing) {
      mailbox = existing;
      await refresh();
      restartPolling();
    } else {
      loadingMail = false;
      await newAddress();
    }
  });

  onDestroy(() => {
    stopPolling();
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", onVisibility);
    }
  });

  // Restart polling whenever the toggle changes.
  $: if (settings) restartPolling();

  /** True when the prefix contains only letters and digits. */
  $: prefixValid = prefix === "" || /^[a-zA-Z0-9]+$/.test(prefix);
  $: codes = mails.length && openMailId !== null
    ? extractCodes(mails.find((x) => x.id === openMailId) ?? { subject: "", text: "" })
    : [];

  function fmtTime(v?: string): string {
    if (!v) return "";
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString(lang === "zh" || lang === "zh-hant" ? "zh-CN" : lang, {
      month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
    });
  }
</script>

<div class="app">
  <!-- Address: the one thing a visitor must copy. -->
  <section class="card address-card">
    <p class="eyebrow">{m.yourAddress}</p>
    <div class="address-row">
      <code class="address" aria-live="polite">{mailbox?.address ?? "—"}</code>
      <button
        class="btn btn-primary"
        type="button"
        disabled={!mailbox}
        on:click={() => mailbox && copy(mailbox.address, "address")}
      >
        {copiedField === "address" ? m.addressCopied : m.copyAddress}
      </button>
    </div>
    <p class="hint faint">{m.privacyNote}</p>
  </section>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  <!--
    Controls: everything on one line.
    Domain, prefix, New address, the auto-refresh toggle, Refresh, Clear inbox
    and the disclaimer all share a single wrapping row. On a desktop the whole
    set fits on one line, as on haoweichi.com/mail; on narrow screens the row
    wraps instead of collapsing into a tall stack.
  -->
  <section class="card controls" aria-label={m.newAddress}>
    <div class="controls-row">
      <div class="field field-domain">
        <label class="field-label" for="mail-domain">{m.domainLabel}</label>
        <select id="mail-domain" class="select" bind:value={domain} disabled={busy}>
          {#each settings?.domains ?? [] as d (d)}
            <option value={d}>{d}</option>
          {/each}
        </select>
      </div>

      <div class="field field-prefix">
        <label class="field-label" for="mail-prefix">{m.prefixLabel}</label>
        <input
          id="mail-prefix"
          class="input"
          type="text"
          autocomplete="off"
          spellcheck="false"
          maxlength={settings?.maxAddressLen ?? 30}
          placeholder={m.prefixPlaceholder}
          bind:value={prefix}
        />
      </div>

      <button
        class="btn btn-secondary generate"
        type="button"
        disabled={busy || !settings || !prefixValid}
        on:click={newAddress}
      >
        {busy ? m.loading : m.newAddress}
      </button>

      <label class="toggle">
        <input type="checkbox" bind:checked={autoRefresh} />
        <span>{m.autoRefresh}</span>
      </label>

      <button class="btn btn-ghost" type="button" disabled={busy || !mailbox} on:click={() => refresh()}>
        {m.refresh}
      </button>
      <button
        class="btn btn-ghost"
        type="button"
        disabled={busy || !mailbox || !settings?.enableUserDeleteEmail}
        on:click={doClear}
      >
        {busy ? m.clearing : m.clearInbox}
      </button>

      <!-- The disclaimer trails the controls on the same line. -->
      <p class="hint faint controls-note">{m.disclaimer}</p>
    </div>

    {#if !prefixValid}
      <p class="hint faint controls-warn">{m.errPrefixChars}</p>
    {/if}
  </section>

  <!-- Inbox: full width, below the controls. -->
  <section class="card inbox" aria-label={m.inbox}>
    <header class="inbox-head">
      <h2>{m.inbox}</h2>
      {#if count > 0}<span class="pill">{count}</span>{/if}

      <!-- Live status: tells the visitor the page is waiting, not stalled. -->
      <p class="live faint" aria-live="polite">
        {#if !mailbox}
          {m.loading}
        {:else if autoRefresh}
          <span class="dot" aria-hidden="true"></span>
          {m.receiving} {secondsLeft}{m.secondsUntilRefresh}
        {:else}
          {m.autoRefreshOff}
        {/if}
      </p>
    </header>

    {#if loadingMail && mails.length === 0}
      <p class="state faint">{m.loading}</p>
    {:else if mails.length === 0}
      <div class="state">
        <p class="empty-title">{m.empty}</p>
        <p class="faint">{m.emptyHint}</p>
      </div>
    {:else}
      <ul class="mail-list">
        {#each mails as mail (mail.id)}
          <li class="mail" class:open={openMailId === mail.id}>
            <button
              class="mail-head"
              type="button"
              aria-expanded={openMailId === mail.id}
              on:click={() => (openMailId = openMailId === mail.id ? null : mail.id)}
            >
              <span class="mail-from">{mail.sender || m.from}</span>
              <span class="mail-subject">{mail.subject || "(no subject)"}</span>
              <span class="mail-time faint">{fmtTime(mail.created_at)}</span>
            </button>

              {#if openMailId === mail.id}
                <div class="mail-body">
                  {#if codes.length}
                    <div class="codes">
                      <p class="eyebrow">{m.detectedCodes}</p>
                      <div class="code-row">
                        {#each codes as c (c)}
                          <button class="code" type="button" on:click={() => copy(c, "code:" + c)}>
                            {copiedField === "code:" + c ? m.codeCopied : c}
                          </button>
                        {/each}
                      </div>
                    </div>
                  {:else}
                    <p class="hint faint">{m.noCode}</p>
                  {/if}

                  {#if mail.attachments?.length}
                    <p class="hint faint">
                      {m.attachments}: {mail.attachments.map((a) => a.filename).join(", ")}
                    </p>
                  {/if}

                  <div class="body-html">
                    {#if mail.html}
                      {@html sanitizeHtml(mail.html)}
                    {:else}
                      <pre>{mail.text}</pre>
                    {/if}
                  </div>
                </div>
              {/if}
            </li>
          {/each}
        </ul>
      {/if}
  </section>

  <!-- How it works, below the inbox. -->
  <section class="card guide" aria-labelledby="mail-guide-h">
    <h2 id="mail-guide-h">{m.guideTitle}</h2>
    <ol class="guide-steps">
      {#each m.guideSteps as step, i (step.title)}
        <li>
          <span class="step-no" aria-hidden="true">{i + 1}</span>
          <div>
            <p class="step-title">{step.title}</p>
            <p class="step-body faint">{step.body}</p>
          </div>
        </li>
      {/each}
    </ol>
  </section>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* ------------------------------------------------------- address card */

  .address-card {
    padding: 1.25rem;
  }

  .address-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
    margin: 0.5rem 0 0.75rem;
  }

  .address {
    flex: 1 1 16rem;
    min-width: 0;
    font-family: var(--font-mono);
    font-size: 1rem;
    padding: 0.75rem 1rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow-wrap: anywhere;
  }

  /* ------------------------------------------------------------ controls */

  /*
   * Everything on one line.
   *
   * The controls are a single wrapping flex row: domain, prefix, New address,
   * the auto-refresh toggle, Refresh, Clear inbox and the disclaimer. At desktop
   * widths they fit on one line, matching haoweichi.com/mail. The disclaimer
   * takes the remaining space (`flex: 1`) so it sits on that same line instead
   * of dropping to its own row; when the row wraps on narrow screens it simply
   * moves to the next line, which is unavoidable.
   */
  .controls {
    padding: 1.25rem;
  }

  .controls-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.625rem 0.75rem;
  }

  .field {
    display: block;
    min-width: 0;
    flex: 0 1 auto;
  }

  .field-domain { flex-basis: 10rem; }
  .field-prefix { flex-basis: 8rem; }

  .select,
  .input { width: 100%; }

  .generate { white-space: nowrap; }

  /*
   * The disclaimer trails the row as the last flex item. Its basis is 0 so it
   * claims only the space the six controls leave over, which keeps it on the
   * same visual line as them; the text wraps inside its own column rather than
   * pushing to a new row.
   */
  .controls-note {
    flex: 1 1 0;
    min-width: 7rem;
    margin: 0;
  }

  /* Prefix validation error, shown only when the prefix is invalid. */
  .controls-warn {
    margin: 0.625rem 0 0;
    color: var(--color-danger-600);
  }

  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.4375rem;
    font-size: 0.8125rem;
    color: var(--text-muted);
    min-height: 44px;
    cursor: pointer;
    white-space: nowrap;
  }

  .toggle input { width: 16px; height: 16px; accent-color: var(--accent); }

  /* --------------------------------------------------------------- inbox */

  .inbox { overflow: hidden; }

  .inbox-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.375rem 0.625rem;
    padding: 0.875rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface-2);
  }

  .inbox-head h2 {
    margin: 0;
    font-size: 0.9375rem;
  }

  /* Live status, pushed to the right of the header row. */
  .live {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    margin: 0 0 0 auto;
    font-size: 0.75rem;
    font-variant-numeric: tabular-nums;
  }

  /* Pulsing dot: signals the page is actively waiting rather than idle. */
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse 1.6s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }

  @media (prefers-reduced-motion: reduce) {
    .dot { animation: none; }
  }

  .mail-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .mail { border-bottom: 1px solid var(--border); }
  .mail:last-child { border-bottom: 0; }

  .mail-head {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.125rem 0.75rem;
    width: 100%;
    padding: 0.75rem 1.25rem;
    background: transparent;
    border: 0;
    text-align: left;
    cursor: pointer;
    color: inherit;
    font: inherit;
    min-height: 44px;
    transition: background-color 140ms ease;
  }

  .mail-head:hover { background: var(--surface-2); }
  .mail.open .mail-head { background: var(--accent-soft); }

  .mail-from {
    font-size: 0.75rem;
    color: var(--text-faint);
    overflow-wrap: anywhere;
  }

  .mail-subject {
    grid-column: 1;
    font-size: 0.875rem;
    font-weight: 500;
    overflow-wrap: anywhere;
  }

  .mail-time {
    grid-column: 2;
    grid-row: 1 / span 2;
    align-self: center;
    font-size: 0.6875rem;
    white-space: nowrap;
  }

  /* ----------------------------------------------------------- mail body */

  .mail-body {
    padding: 0.75rem 1.25rem 1.25rem;
    border-top: 1px solid var(--border);
  }

  .codes { margin-bottom: 0.75rem; }

  .code-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.375rem;
  }

  .code {
    font-family: var(--font-mono);
    font-size: 1rem;
    letter-spacing: 0.06em;
    padding: 0.5rem 0.875rem;
    min-height: 44px;
    background: var(--accent-soft);
    color: var(--accent);
    border: 1px solid var(--accent-border);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background-color 140ms ease;
  }

  .code:hover { background: var(--accent); color: var(--on-accent); }

  /* Sender HTML is sanitized before it reaches here; these rules keep it
     readable whatever markup arrived. */
  .body-html {
    margin-top: 0.5rem;
    font-size: 0.875rem;
    line-height: 1.7;
    color: var(--text-muted);
    overflow-wrap: anywhere;
    max-height: 26rem;
    overflow-y: auto;
  }

  .body-html :global(img) { max-width: 100%; height: auto; }
  .body-html :global(a) { color: var(--accent); }
  .body-html :global(table) { max-width: 100%; }
  .body-html :global(pre),
  .body-html pre {
    white-space: pre-wrap;
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
  }

  /* --------------------------------------------------------- guide card */

  /*
   * Explanatory card under the inbox.
   *
   * A numbered list rather than prose: the feature has a definite sequence
   * (copy, paste, wait, copy the code, discard) and a visitor scanning for
   * "how do I get the code" should find it without reading paragraphs.
   */
  .guide {
    padding: 1.5rem;
  }

  .guide h2 {
    margin: 0 0 1.25rem;
    font-size: 1.0625rem;
  }

  .guide-steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .guide-steps {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.25rem 2rem;
    }
  }

  .guide-steps li {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .step-no {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent);
    font-size: 0.6875rem;
    font-weight: 600;
    margin-top: 0.125rem;
  }

  .step-title {
    margin: 0 0 0.1875rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .step-body {
    margin: 0;
    font-size: 0.8125rem;
    line-height: 1.7;
  }

  /* --------------------------------------------------------------- misc */

  .state {
    padding: 2rem 1.25rem;
    text-align: center;
    font-size: 0.875rem;
  }

  .empty-title { margin: 0 0 0.25rem; font-weight: 500; }
  .state p { margin: 0; }

  .error {
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-danger-600);
    background: var(--color-danger-50);
    color: var(--color-danger-600);
    border-radius: var(--radius-md);
    font-size: 0.875rem;
    margin: 0;
  }

  .hint { font-size: 0.75rem; margin: 0; line-height: 1.6; }
</style>
