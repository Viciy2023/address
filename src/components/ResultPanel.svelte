<script lang="ts">
  /**
   * Result panel.
   *
   * The record is ~65 heterogeneous fields. An earlier version listed one field
   * per row and hid most groups behind disclosure controls, which made the page
   * both very long and partly invisible — the fields people came for were the
   * ones collapsed away.
   *
   * This version shows everything, in the space a dense grid needs rather than
   * the space a row-per-field list needs:
   *
   *   - One card per group (nine in total: identity, address, credit, education,
   *     employment, lifestyle, personal, online, social).
   *   - Nothing collapses. Every value is present on load and on first paint, so
   *     the page works for printing, Ctrl+F and search/AI indexing.
   *   - Inside each card the fields flow into a responsive multi-column grid. A
   *     short value such as "Male" takes one cell; a full address or a
   *     User-Agent spans the row.
   *   - The whole cell is the copy target. With ~65 fields a dedicated button
   *     per field would be more chrome than content, so the cell itself is the
   *     button — denser, and a far larger touch target.
   */
  import type { Identity, GroupKey, IdentityField } from "../lib/generator";
  import type { Strings } from "../i18n/strings";
  import type { SiteLang } from "../config";

  export let s: Strings;
  export let lang: SiteLang;
  export let identity: Identity | null = null;
  export let avatarUrl = "";

  let copiedKey: string | null = null;

  const GROUP_LABEL: Record<GroupKey, keyof Strings> = {
    identity: "groupIdentity",
    address: "groupAddress",
    credit: "groupCredit",
    education: "groupEducation",
    employment: "groupEmployment",
    lifestyle: "groupLifestyle",
    personal: "groupPersonal",
    online: "groupOnline",
    social: "groupSocial",
  };

  function groupTitle(key: GroupKey): string {
    return s[GROUP_LABEL[key]] as string;
  }

  /**
   * A value this long, or one containing a line break, gets the full grid
   * width. The threshold is where a cell stops being comfortable beside its
   * label in a column.
   */
  function isWide(f: IdentityField): boolean {
    return f.value.includes("\n") || f.value.length > 44;
  }

  async function copyText(text: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Clipboard API needs a secure context; fall back for http/file.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
      } catch {
        return false;
      }
    }
  }

  function flash(key: string) {
    copiedKey = key;
    setTimeout(() => {
      if (copiedKey === key) copiedKey = null;
    }, 1400);
  }

  async function copyField(key: string, value: string) {
    if (await copyText(value)) flash(key);
  }

  async function copyAll() {
    if (!identity) return;
    // Human-readable block: label + value per line, grouped.
    const lines: string[] = [];
    for (const g of identity.groups) {
      lines.push(`## ${groupTitle(g.key)}`);
      for (const f of g.fields) lines.push(`${f.label[lang]}: ${f.value}`);
      lines.push("");
    }
    if (await copyText(lines.join("\n").trim())) flash("__all__");
  }

  async function copyJson() {
    if (!identity) return;
    const payload: Record<string, unknown> = {};
    for (const g of identity.groups) {
      payload[g.key] = Object.fromEntries(g.fields.map((f) => [f.key, f.value]));
    }
    const json = JSON.stringify(
      { country: identity.country, seed: identity.seed, data: payload },
      null,
      2,
    );
    if (await copyText(json)) flash("__json__");
  }

  function downloadCsv() {
    if (!identity) return;
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const header = ["group", "key", "label", "value"];
    const rows = identity.groups.flatMap((g) =>
      g.fields.map((f) => [g.key, f.key, f.label[lang], f.value].map(esc).join(",")),
    );
    // BOM so Excel detects UTF-8 for CJK and Cyrillic values.
    const csv = "\uFEFF" + [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `identity-${identity.country}-${identity.seed.toString(36)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Keyboard shortcut, active only while the panel is on screen and the user is
  // not typing into a control.
  function onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null;
    if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "c" || e.key === "C") {
      copyAll();
    }
  }
</script>

<svelte:window on:keydown={onKey} />

{#if !identity}
  <section class="card empty" aria-live="polite">
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" stroke-width="1.5"
         aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h10" stroke-linecap="square" />
    </svg>
    <p>{s.emptyState}</p>
  </section>
{:else}
  <div class="panel" aria-live="polite">
    <!-- Summary: identity at a size that earns the space. -->
    <section class="card summary">
      <div class="summary-media">
        {#if avatarUrl}
          <img src={avatarUrl} alt="" width="72" height="72" loading="eager" decoding="async" />
        {/if}
      </div>
      <div class="summary-body">
        <p class="eyebrow">{identity.summary.country[lang]}</p>
        <h2 class="summary-name">{identity.summary.fullName}</h2>
        <dl class="summary-meta">
          <div><dt>{s.selectGender}</dt><dd>{identity.summary.gender}</dd></div>
          <div><dt>{s.summaryAge}</dt><dd>{identity.summary.age}</dd></div>
          <div><dt>{s.summaryDob}</dt><dd class="mono">{identity.summary.birthDate}</dd></div>
        </dl>
      </div>
      <div class="summary-seed">
        <span class="eyebrow">{s.seedLabel}</span>
        <code title={s.seedHint}>{identity.seed.toString(36).toUpperCase()}</code>
      </div>
    </section>

    <!-- Action bar: reachable while scrolling the long field list. -->
    <div class="actionbar">
      <div class="actionbar-inner">
        <button class="btn btn-secondary" on:click={copyAll}>
          {copiedKey === "__all__" ? s.copied : s.copyAll}
        </button>
        <button class="btn btn-secondary" on:click={copyJson}>
          {copiedKey === "__json__" ? s.copied : s.copyJson}
        </button>
        <button class="btn btn-secondary" on:click={downloadCsv}>{s.downloadCsv}</button>
      </div>
    </div>

    <!-- One card per group, all expanded, dense grid inside. -->
    {#each identity.groups as g (g.key)}
      <section class="card dense">
        <header class="dense-head">
          <h3>{groupTitle(g.key)}</h3>
          <span class="dense-count">{g.fields.length}</span>
        </header>

        <div class="fields">
          {#each g.fields as f (f.key)}
            <button
              class="field"
              class:wide={isWide(f)}
              class:copied={copiedKey === f.key}
              title={s.copy}
              aria-label="{s.copy}: {f.label[lang]}"
              on:click={() => copyField(f.key, f.value)}
            >
              <span class="k">
                {f.label[lang]}
                {#if f.real === false}
                  <span class="pill pill-warn" title={s.syntheticPostal}>{s.formatOnly}</span>
                {/if}
              </span>
              <span class="v" class:sensitive={f.sensitive}>{f.value}</span>
              {#if f.alt}<span class="alt">{f.alt}</span>{/if}
            </button>
          {/each}
        </div>
      </section>
    {/each}

    <p class="hint faint">{s.shortcutHint}</p>
  </div>
{/if}

<style>
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 3.5rem 1.5rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.9375rem;
  }

  .panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* ------------------------------------------------------------- summary */

  .summary {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 1.25rem;
    padding: 1.5rem;
    align-items: start;
  }

  @media (min-width: 768px) {
    .summary {
      grid-template-columns: auto 1fr auto;
      align-items: center;
    }
  }

  .summary-media img {
    width: 72px;
    height: 72px;
    object-fit: cover;
    border: 1px solid var(--border);
    background: var(--surface-2);
    display: block;
  }

  .summary-name {
    font-size: clamp(1.5rem, 4vw, 2rem);
    margin: 0.125rem 0 0.5rem;
    letter-spacing: -0.03em;
  }

  .summary-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1.5rem;
    margin: 0;
  }

  .summary-meta div {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .summary-meta dt {
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-faint);
  }

  .summary-meta dd {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .summary-seed {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
  }

  .summary-seed code {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    padding: 0.25rem 0.5rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
  }

  /* ----------------------------------------------------------- action bar */

  .actionbar {
    position: sticky;
    top: 0;
    z-index: 20;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--border);
    margin-inline: -0.25rem;
    padding-inline: 0.25rem;
  }

  .actionbar-inner {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.625rem 0;
  }

  /* -------------------------------------------------------- dense cards */

  .dense {
    overflow: hidden;
  }

  .dense-head {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.8125rem 1.25rem;
    border-bottom: 1px solid var(--border);
    background: var(--surface-2);
  }

  .dense-head h3 {
    margin: 0;
    font-size: 0.9375rem;
    letter-spacing: -0.01em;
  }

  .dense-count {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    color: var(--text-faint);
    border: 1px solid var(--border-strong);
    padding: 0.0625rem 0.375rem;
  }

  /* --------------------------------------------------------------- grid */

  /*
   * The point of the redesign: fields flow into columns instead of each taking
   * its own row. Short values stay in one cell; long ones span the full width.
   */
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
    column-gap: 1.5rem;
    padding: 0.25rem 1.25rem 0.875rem;
  }

  @media (min-width: 1024px) {
    .fields {
      grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
    }
  }

  /* Each field is its own copy button: the whole cell is the touch target. */
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border);
    background: transparent;
    border-inline: 0;
    border-top: 0;
    text-align: left;
    cursor: pointer;
    font: inherit;
    color: inherit;
    transition: background-color 140ms ease;
  }

  .field:hover {
    background: var(--surface-2);
  }

  /* Span the row for values that would wrap awkwardly in a narrow column. */
  .field.wide {
    grid-column: 1 / -1;
  }

  .k {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.6875rem;
    font-weight: 500;
    letter-spacing: 0.045em;
    text-transform: uppercase;
    color: var(--text-faint);
    min-width: 0;
  }

  .v {
    font-size: 0.875rem;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    /* Full addresses and User-Agents wrap; nothing is ever clipped. */
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    color: var(--text);
  }

  .v.sensitive {
    /* Identifiers are visually distinct so they are hard to mistake. */
    color: var(--accent);
    font-weight: 500;
  }

  .alt {
    font-size: 0.75rem;
    color: var(--text-faint);
  }

  /* Copied confirmation, driven by the cell rather than a separate icon. */
  .field.copied {
    background: var(--accent-soft);
  }

  .field.copied .k::before {
    content: "";
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    background: var(--accent);
    -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='3.5' stroke-linecap='square'%3E%3Cpath d='M20 6L9 17l-5-5'/%3E%3C/svg%3E") center / contain no-repeat;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='3.5' stroke-linecap='square'%3E%3Cpath d='M20 6L9 17l-5-5'/%3E%3C/svg%3E") center / contain no-repeat;
  }

  .hint {
    font-size: 0.75rem;
    text-align: center;
    padding-top: 0.25rem;
  }
</style>
