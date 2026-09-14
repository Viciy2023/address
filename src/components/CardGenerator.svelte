<script lang="ts">
  /**
   * Virtual credit card generator.
   *
   * Two modes, matching the two things people actually want:
   *
   *   Generate  — fresh numbers for a chosen network, or random.
   *   Complete  — paste a BIN or a masked fragment and fill it to a full,
   *               Luhn-valid number.
   *
   * Results render as plastic card faces, not rows in a table: the number is
   * what the visitor came for, and a card face puts it where the eye already
   * expects it. Each network gets its own gradient (the chosen visual
   * direction) so the brand is legible at a glance.
   *
   * Everything is computed in the browser from a seed; the page makes no
   * network requests, so nothing the visitor types leaves the device.
   */
  import { onMount } from "svelte";
  import type { SiteLang } from "../config";
  import { cardStrings } from "../i18n/card";
  import { NETWORKS, NETWORK_ORDER, type NetworkId } from "../lib/card/networks";
  import { generateCards, completeCard, seedForInput } from "../lib/card/generate";
  import { randomSeed } from "../lib/generator/rng";

  export let lang: SiteLang;

  const m = cardStrings(lang);
  const COUNTS = [1, 3, 5, 10, 20];

  let mode: "generate" | "complete" = "generate";
  let choice: NetworkId | "random" = "random";
  let count = 5;
  let partial = "";
  let cards: import("../lib/card/generate").Card[] = [];
  let error = "";
  let copied: string | null = null;

  /** Network options: random first, then each network in display order. */
  const options = [
    { value: "random" as const, label: m.networkRandom },
    ...NETWORK_ORDER.map((id) => ({ value: id, label: NETWORKS[id].label })),
  ];

  function flash(key: string) {
    copied = key;
    setTimeout(() => { if (copied === key) copied = null; }, 1500);
  }

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(key);
    } catch {
      // Clipboard API needs a secure context; fall back for plain http.
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

  function run() {
    error = "";
    if (mode === "generate") {
      cards = generateCards(choice, count, randomSeed());
    } else {
      const res = completeCard(partial, seedForInput(partial));
      if (res.card) {
        cards = [res.card];
      } else {
        cards = [];
        error = errorText(res.error);
      }
    }
  }

  function errorText(kind: string | null): string {
    switch (kind) {
      case "empty": return m.errEmpty;
      case "tooShort": return m.errTooShort;
      case "tooLong": return m.errTooLong;
      case "unknownPrefix": return m.errUnknownPrefix;
      case "badChars": return m.errBadChars;
      default: return m.errEmpty;
    }
  }

  /** The pipe-delimited line, matching the common bulk format. */
  function line(c: { formatted: string; expiry: string; cvv: string; holder: string }): string {
    return `${c.formatted} | ${c.expiry} | ${c.cvv} | ${c.holder}`;
  }

  /** Inline style for a card face, from the network theme. */
  function faceStyle(network: NetworkId): string {
    const t = NETWORKS[network].theme;
    return `background: linear-gradient(135deg, ${t.from} 0%, ${t.via} 55%, ${t.to} 100%); color: ${t.ink};`;
  }

  function mutedStyle(network: NetworkId): string {
    return `color: ${NETWORKS[network].theme.inkMuted};`;
  }

  // Show one sample card immediately so the page is never empty on arrival.
  onMount(() => {
    cards = generateCards("random", count, randomSeed());
  });
</script>

<div class="app">
  <!-- Mode switch -->
  <div class="modes" role="tablist" aria-label={m.title}>
    <button
      class="mode"
      class:on={mode === "generate"}
      type="button"
      role="tab"
      aria-selected={mode === "generate"}
      on:click={() => { mode = "generate"; error = ""; }}
    >
      {m.modeGenerate}
    </button>
    <button
      class="mode"
      class:on={mode === "complete"}
      type="button"
      role="tab"
      aria-selected={mode === "complete"}
      on:click={() => { mode = "complete"; error = ""; }}
    >
      {m.modeComplete}
    </button>
  </div>

  <section class="card controls" aria-label={m.title}>
    {#if mode === "generate"}
      <div class="row">
        <div class="field">
          <label class="field-label" for="card-network">{m.networkLabel}</label>
          <select id="card-network" class="select" bind:value={choice}>
            {#each options as o (o.value)}
              <option value={o.value}>{o.label}</option>
            {/each}
          </select>
        </div>

        <div class="field field-count">
          <label class="field-label" for="card-count">{m.countLabel}</label>
          <select id="card-count" class="select" bind:value={count}>
            {#each COUNTS as c (c)}
              <option value={c}>{c}</option>
            {/each}
          </select>
        </div>

        <button class="btn btn-primary" type="button" on:click={run}>
          {cards.length ? m.regenerate : m.generate}
        </button>
      </div>
      <p class="hint faint note">{m.holderNote}</p>
    {:else}
      <div class="row">
        <div class="field field-partial">
          <label class="field-label" for="card-partial">{m.partialLabel}</label>
          <input
            id="card-partial"
            class="input mono"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder={m.partialPlaceholder}
            bind:value={partial}
            on:keydown={(e) => { if (e.key === "Enter") run(); }}
          />
        </div>
        <button class="btn btn-primary" type="button" on:click={run}>{m.complete}</button>
      </div>
      <p class="hint faint note">{m.partialHint}</p>
    {/if}
  </section>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  <!-- Results -->
  <section class="card results" aria-label={m.resultsTitle}>
    <header class="results-head">
      <h2>{m.resultsTitle}</h2>
      {#if cards.length > 1}
        <button class="btn btn-secondary" type="button" on:click={() => copy(cards.map(line).join("\n"), "all")}>
          {copied === "all" ? m.allCopied : m.copyAll}
        </button>
      {/if}
    </header>

    {#if cards.length === 0}
      <p class="state faint">{m.empty}</p>
    {:else}
      <div class="deck">
        {#each cards as c, i (c.number)}
          <div class="slot">
            <div class="ccard" style={faceStyle(c.network)}>
              <div class="cc-top">
                <span class="chip" aria-hidden="true"></span>
                <span class="brand">{NETWORKS[c.network].label}</span>
              </div>

              <div class="cc-num">{c.formatted}</div>

              <div class="cc-meta">
                <div>
                  <div class="cc-k" style={mutedStyle(c.network)}>{m.holder}</div>
                  <div class="cc-v">{c.holder}</div>
                </div>
                <div>
                  <div class="cc-k" style={mutedStyle(c.network)}>{m.expiry}</div>
                  <div class="cc-v">{c.expiry}</div>
                </div>
                <div>
                  <div class="cc-k" style={mutedStyle(c.network)}>{m.cvv}</div>
                  <div class="cc-v">{c.cvv}</div>
                </div>
              </div>

              <div class="cc-bank" style={mutedStyle(c.network)}>{c.bank}</div>
            </div>

            <button class="btn btn-secondary copy-line" type="button" on:click={() => copy(c.number, "num:" + c.number)}>
              {copied === "num:" + c.number ? m.numberCopied : m.copyNumber}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- Guide -->
  <section class="card guide" aria-labelledby="card-guide-h">
    <h2 id="card-guide-h">{m.guideTitle}</h2>
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
    <p class="hint faint disclaimer">{m.disclaimer}</p>
  </section>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* --------------------------------------------------------- mode switch */

  .modes {
    display: inline-flex;
    gap: 0.25rem;
    padding: 0.25rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    align-self: flex-start;
  }

  .mode {
    border: 0;
    background: transparent;
    color: var(--text-muted);
    font: inherit;
    font-size: 0.875rem;
    padding: 0.5rem 1rem;
    min-height: 40px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    transition: background-color 160ms ease, color 160ms ease;
  }

  .mode:hover { color: var(--text); }

  .mode.on {
    background: var(--surface);
    color: var(--accent);
    font-weight: 500;
    box-shadow: var(--shadow-xs);
  }

  /* ------------------------------------------------------------ controls */

  .controls { padding: 1.25rem; }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem;
  }

  .field { display: block; min-width: 0; flex: 0 1 auto; }
  .field-count { flex-basis: 6rem; }
  .field-partial { flex: 1 1 18rem; }

  .select { width: 100%; }
  .input { width: 100%; }

  .note { margin: 0.875rem 0 0; }

  /* ------------------------------------------------------------- results */

  .results { padding: 1.25rem; }

  .results-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 1.25rem;
  }

  .results-head h2 {
    margin: 0;
    font-size: 0.9375rem;
  }

  .results-head .btn { margin-inline-start: auto; }

  .deck {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }

  .slot {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  /* --------------------------------------------------------- card face */

  /*
   * The plastic card. Aspect ratio 1.586:1 is the ISO/IEC 7810 ID-1 shape, so
   * the proportions read as a real card rather than a generic rectangle.
   */
  .ccard {
    position: relative;
    aspect-ratio: 1.586 / 1;
    border-radius: var(--radius-lg);
    padding: 1.125rem 1.25rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }

  /* A soft sheen across the top-left, for a plastic feel. */
  .ccard::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(115deg, rgba(255,255,255,.22) 0%, rgba(255,255,255,0) 42%);
    pointer-events: none;
  }

  .cc-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }

  /* Gold chip, drawn rather than an image. */
  .chip {
    width: 42px;
    height: 30px;
    border-radius: 6px;
    background: linear-gradient(135deg, #f5d67e, #d4a72c 45%, #f2e2a8 70%, #c8971f);
    box-shadow: inset 0 0 0 1px rgba(0,0,0,.18);
    flex-shrink: 0;
  }

  .brand {
    font-family: var(--font-sans, Inter, sans-serif);
    font-weight: 700;
    font-size: 1rem;
    letter-spacing: 0.03em;
    font-style: italic;
    text-align: right;
    line-height: 1.15;
    max-width: 60%;
  }

  .cc-num {
    font-size: 1.1875rem;
    letter-spacing: 0.1em;
    text-shadow: 0 1px 2px rgba(0,0,0,.28);
    white-space: nowrap;
    /* Shrink on narrow cards rather than wrapping or overflowing. */
    overflow: hidden;
  }

  .cc-meta {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .cc-k {
    font-family: var(--font-sans, Inter, sans-serif);
    font-size: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .cc-v { font-size: 0.8125rem; }

  .cc-bank {
    font-family: var(--font-sans, Inter, sans-serif);
    font-size: 0.6875rem;
    letter-spacing: 0.02em;
    margin-top: 0.375rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .copy-line { width: 100%; }

  /* --------------------------------------------------------- guide card */

  .guide { padding: 1.5rem; }

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

  .step-body { margin: 0; font-size: 0.8125rem; line-height: 1.7; }

  .disclaimer {
    margin: 1.25rem 0 0;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
    color: var(--color-danger-600);
  }

  /* ---------------------------------------------------------------- misc */

  .state { padding: 2rem 1.25rem; text-align: center; font-size: 0.875rem; margin: 0; }

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
