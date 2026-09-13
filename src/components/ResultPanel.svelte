<script lang="ts">
  /**
   * Result panel.
   *
   * This is where the "minimal + 65 fields" tension is resolved:
   *
   *   - A summary block shows only the highest-value fields at full size.
   *   - All nine groups are rendered, but only the first two start open.
   *   - Each group header carries its field count, so nothing feels hidden.
   *   - "Expand all" exists for QA/seed users who want everything at once.
   *   - A sticky action bar keeps copy/export reachable without scrolling
   *     back to the top.
   *
   * Copying is per-field, per-group and whole-record, because in practice
   * users need one value far more often than all of them.
   */
  import type { Identity, GroupKey } from "../lib/generator";
  import type { Strings } from "../i18n/strings";
  import type { SiteLang } from "../config";

  export let s: Strings;
  export let lang: SiteLang;
  export let identity: Identity | null = null;
  export let avatarUrl = "";

  let openGroups = new Set<GroupKey>(["identity", "address"]);
  let copiedKey: string | null = null;
  let allOpen = false;

  // Reset disclosure state whenever a new identity arrives, so the panel
  // always opens in its intended compact form.
  $: if (identity) {
    if (allOpen) {
      openGroups = new Set(identity.groups.map((g) => g.key));
    } else {
      openGroups = new Set<GroupKey>(["identity", "address"]);
    }
  }

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

  function toggle(key: GroupKey) {
    const next = new Set(openGroups);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    openGroups = next;
  }

  function setAll(open: boolean) {
    if (!identity) return;
    allOpen = open;
    openGroups = open ? new Set(identity.groups.map((g) => g.key)) : new Set<GroupKey>(["identity", "address"]);
    if (!open) allOpen = false;
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

  async function copyField(key: string, value: string) {
    if (await copyText(value)) {
      copiedKey = key;
      setTimeout(() => {
        if (copiedKey === key) copiedKey = null;
      }, 1400);
    }
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
    if (await copyText(lines.join("\n").trim())) {
      copiedKey = "__all__";
      setTimeout(() => (copiedKey = null), 1400);
    }
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
    if (await copyText(json)) {
      copiedKey = "__json__";
      setTimeout(() => (copiedKey = null), 1400);
    }
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

  // Keyboard shortcuts, active only when the result panel is on screen and the
  // user is not typing into a control.
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
    <!-- Summary: only the highest-value fields, at a size that earns the space. -->
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
          <div><dt>{s.groupIdentity}</dt><dd>{identity.summary.gender}</dd></div>
          <div><dt>Age</dt><dd>{identity.summary.age}</dd></div>
          <div><dt>DOB</dt><dd class="mono">{identity.summary.birthDate}</dd></div>
        </dl>
      </div>
      <div class="summary-seed">
        <span class="eyebrow">{s.seedLabel}</span>
        <code title={s.seedHint}>{identity.seed.toString(36).toUpperCase()}</code>
      </div>
    </section>

    <!-- Sticky action bar: reachable while scrolling the long field list. -->
    <div class="actionbar">
      <div class="actionbar-inner">
        <button class="btn btn-secondary" on:click={copyAll}>
          {copiedKey === "__all__" ? s.copied : s.copyAll}
        </button>
        <button class="btn btn-secondary" on:click={copyJson}>
          {copiedKey === "__json__" ? s.copied : s.copyJson}
        </button>
        <button class="btn btn-secondary" on:click={downloadCsv}>{s.downloadCsv}</button>
        <button class="btn btn-ghost" on:click={() => setAll(!allOpen)}>
          {allOpen ? s.collapseAll : s.expandAll}
        </button>
      </div>
    </div>

    <!-- Field groups -->
    <div class="groups">
      {#each identity.groups as g (g.key)}
        <section class="card group">
          <button
            class="group-head"
            aria-expanded={openGroups.has(g.key)}
            aria-controls={"grp-" + g.key}
            on:click={() => toggle(g.key)}
          >
            <span class="group-title">{groupTitle(g.key)}</span>
            <span class="group-count">{g.fields.length}</span>
            <svg class="chev" class:open={openGroups.has(g.key)} width="14" height="14" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="square" aria-hidden="true">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>

          {#if openGroups.has(g.key)}
            <div class="group-body" id={"grp-" + g.key}>
              <dl class="fields">
                {#each g.fields as f (f.key)}
                  <div class="field">
                    <dt>
                      <span class="field-name">{f.label[lang]}</span>
                      {#if f.real === false}
                        <span class="pill pill-warn" title={s.syntheticPostal}>{s.formatOnly}</span>
                      {/if}
                    </dt>
                    <dd>
                      <span class="value" class:sensitive={f.sensitive}>{f.value}</span>
                      {#if f.alt}
                        <span class="alt">{f.alt}</span>
                      {/if}
                    </dd>
                    <button
                      class="copybtn"
                      title={s.copy}
                      aria-label="{s.copy}: {f.label[lang]}"
                      on:click={() => copyField(f.key, f.value)}
                    >
                      {#if copiedKey === f.key}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="2.5" stroke-linecap="square" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      {:else}
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             stroke-width="1.8" aria-hidden="true">
                          <rect x="9" y="9" width="11" height="11" />
                          <path d="M5 15V5a2 2 0 0 1 2-2h8" />
                        </svg>
                      {/if}
                    </button>
                  </div>
                {/each}
              </dl>
            </div>
          {/if}
        </section>
      {/each}
    </div>

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

  /* --------------------------------------------------------------- groups */

  .groups {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .group-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    /* 52px keeps the header above the 44px touch minimum. */
    min-height: 52px;
    padding: 0 1.25rem;
    background: transparent;
    border: 0;
    cursor: pointer;
    text-align: left;
    color: inherit;
    transition: background-color 160ms ease;
  }

  .group-head:hover { background: var(--surface-2); }

  .group-title {
    font-size: 0.9375rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    flex: 1;
  }

  .group-count {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-faint);
    padding: 0.0625rem 0.4375rem;
    border: 1px solid var(--border);
  }

  .chev {
    color: var(--text-faint);
    transition: transform 180ms ease;
    flex-shrink: 0;
  }
  .chev.open { transform: rotate(180deg); }

  .group-body {
    border-top: 1px solid var(--border);
    padding: 0.5rem 1.25rem 1rem;
  }

  /* ---------------------------------------------------------------- fields */

  .fields { margin: 0; }

  .field {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: baseline;
    gap: 0.25rem 0.75rem;
    padding: 0.6875rem 0;
    border-bottom: 1px solid var(--border);
  }
  .field:last-child { border-bottom: 0; }

  .field dt {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8125rem;
    color: var(--text-muted);
    min-width: 0;
  }

  .field-name { overflow-wrap: anywhere; }

  .field dd {
    margin: 0;
    text-align: right;
    grid-column: 2;
    min-width: 0;
  }

  .value {
    display: block;
    font-size: 0.875rem;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
    /* Values like full addresses and User-Agents must wrap rather than clip. */
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  .value.sensitive {
    /* Identifiers are visually distinct so they are hard to mistake. */
    color: var(--accent);
    font-weight: 500;
  }

  .alt {
    display: block;
    font-size: 0.75rem;
    color: var(--text-faint);
    margin-top: 0.125rem;
  }

  .copybtn {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text-faint);
    cursor: pointer;
    transition: color 160ms ease, border-color 160ms ease, background-color 160ms ease;
  }

  .copybtn:hover {
    color: var(--text);
    border-color: var(--border-strong);
    background: var(--surface-2);
  }

  .hint {
    font-size: 0.75rem;
    text-align: center;
    padding-top: 0.25rem;
  }

  /* On narrow screens the value moves below its label so long strings have
     the full width to wrap into. */
  @media (max-width: 560px) {
    .field {
      grid-template-columns: 1fr auto;
    }
    .field dd {
      grid-column: 1 / -1;
      text-align: left;
    }
    .copybtn {
      grid-column: 2;
      grid-row: 1;
    }
  }
</style>
