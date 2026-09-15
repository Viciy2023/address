<script lang="ts">
  /**
   * Virtual address generator.
   *
   * One country picker, one result card, and below it the explainer sections.
   *
   * The address itself comes from `generateAddress`, which projects the address
   * group out of the identity generator — so the street word order, the city /
   * division / postal consistency and the phone format are exactly the ones the
   * identity feature already produces and tests, not a second implementation
   * that could drift from them.
   *
   * Nothing is fetched: all data is bundled and the record is computed in the
   * browser from a seed, so nothing the visitor types leaves the device.
   */
  import { onMount } from "svelte";
  import type { SiteLang } from "../config";
  import { addressStrings } from "../i18n/address";
  import { loadCountryData, loadNamePool } from "../lib/data";
  import { COUNTRY_BY_CODE } from "../lib/registry";
  import { randomSeed } from "../lib/generator/rng";
  import {
    generateAddress, sortedCountries, addressFormat, addressCountry,
    type AddressRecord, type AddressFormat,
  } from "../lib/address/generate";

  export let lang: SiteLang;

  const m = addressStrings(lang);
  const countries = sortedCountries(lang);

  /** Sentinel value for the "random country" entry at the top of the picker. */
  const RANDOM = "__random";

  let code = countries[0]?.code ?? "US";
  let record: AddressRecord | null = null;
  let format: AddressFormat | null = null;
  let busy = false;
  let copied: string | null = null;

  /*
   * The country the shown record actually belongs to. It differs from `code`
   * only while the picker is on "random country": there the dropdown must stay
   * on Random so each press draws a fresh country, while this remembers which
   * one was drawn so the format explainer can describe it.
   */
  let activeCode = code;

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

  /**
   * Builds a record with a fresh seed.
   *
   * `code` is the picker value; when it is the random sentinel a country is
   * drawn now and remembered in `activeCode`, leaving the dropdown on Random so
   * the next press draws again.
   */
  async function run() {
    if (busy) return;
    busy = true;
    try {
      activeCode = code === RANDOM
        ? countries[Math.floor(Math.random() * countries.length)]?.code ?? countries[0].code
        : code;
      const spec = addressCountry(activeCode);
      if (!spec) return;
      const [countryData, name] = await Promise.all([
        loadCountryData(activeCode),
        loadNamePool(activeCode),
      ]);
      record = generateAddress(spec, { name, countryData }, randomSeed());
      format = addressFormat(spec, lang);
    } finally {
      busy = false;
    }
  }

  // Field label lookup, keyed the same as the record's fields.
  function labelFor(key: string): string {
    const map: Record<string, string> = {
      street: m.street, city: m.city, state: m.state,
      postal: m.postal, country: m.country, phone: m.phone,
    };
    return map[key] ?? key;
  }

  /** Picker label for the country the shown record belongs to. */
  $: activeLabel = countries.find((c) => c.code === activeCode)?.label ?? activeCode;

  /*
   * Turns "{street}, {city} {stateCode} {postal}" into "街道地址, 城市 行政区代码 邮政编码"
   * for display. The registry templates are written for the generator, so the
   * tokens are developer-facing; a visitor should read their own words.
   */
  $: templateDisplay = (format?.template ?? []).map((line) =>
    line.replace(/\{(\w+)\}/g, (_, key: string) => TOKEN_LABEL[key]?.(lang) ?? key),
  );

  /** Human labels for the template tokens, per language. */
  const TOKEN_LABEL: Record<string, (l: SiteLang) => string> = {
    street: (l) => ({ zh: "街道", "zh-hant": "街道", en: "street", ja: "番地", ko: "도로명" }[l]),
    city: (l) => ({ zh: "城市", "zh-hant": "城市", en: "city", ja: "市区町村", ko: "도시" }[l]),
    state: (l) => ({ zh: "行政区", "zh-hant": "行政區", en: "division", ja: "行政区", ko: "행정구역" }[l]),
    stateCode: (l) => ({ zh: "行政区代码", "zh-hant": "行政區代碼", en: "division code", ja: "行政区コード", ko: "행정구역 코드" }[l]),
    postal: (l) => ({ zh: "邮政编码", "zh-hant": "郵遞區號", en: "postal code", ja: "郵便番号", ko: "우편번호" }[l]),
    country: (l) => ({ zh: "国家", "zh-hant": "國家", en: "country", ja: "国", ko: "국가" }[l]),
  };

  /** Digit count in the interface language, e.g. "10 位" / "10 digits". */
  $: digitLabel = { zh: `${format?.nationalDigits ?? 0} 位`, "zh-hant": `${format?.nationalDigits ?? 0} 位`, en: `${format?.nationalDigits ?? 0} digits`, ja: `${format?.nationalDigits ?? 0} 桁`, ko: `${format?.nationalDigits ?? 0}자리` }[lang];

  /** House-number placement, phrased in the interface language. */
  $: numberPosText =
    format?.numberPosition === "after" ? m.formatNumberAfter
      : format?.numberPosition === "appended" ? m.formatNumberAppended
        : m.formatNumberBefore;

  /**
   * Names the elements a template line carries, e.g. "{city}, {stateCode}
   * {postal}" -> "城市 · 行政区代码 · 邮政编码".
   *
   * This is what makes the example card describe the *country's* structure: the
   * labels come from the template the address was actually rendered on, not
   * from a fixed list of lines.
   */
  function templateRole(template: string): string {
    const tokens = [...template.matchAll(/\{(\w+)\}/g)].map((mt) => TOKEN_LABEL[mt[1]]?.(lang) ?? mt[1]);
    const unique = [...new Set(tokens)];
    return unique.length ? unique.join(" · ") : m.street;
  }

  onMount(() => { void run(); });
</script>

<div class="app">
  <!-- Controls -->
  <section class="card controls" aria-label={m.title}>
    <div class="row">
      <div class="field field-country">
        <label class="field-label" for="addr-country">{m.countryLabel}</label>
        <select id="addr-country" class="select" bind:value={code} on:change={run}>
          <option value={RANDOM}>{m.countryRandom}</option>
          {#each countries as c (c.code)}
            <option value={c.code}>{c.label}</option>
          {/each}
        </select>
      </div>

      <button class="btn btn-primary" type="button" disabled={busy} on:click={run}>
        {record ? m.regenerate : m.generate}
      </button>
    </div>
  </section>

  <!-- Result -->
  {#if record}
    <section class="card result" aria-label={m.resultTitle}>
      <header class="result-head">
        <h2>{m.resultTitle}</h2>
        <!-- Which country this record belongs to. Needed because the picker can
             be left on "random country", where the dropdown no longer shows it. -->
        <span class="country-badge">{activeLabel}</span>
        <button class="btn btn-secondary" type="button" disabled={!record.fullAddress}
                on:click={() => copy(record!.fullAddress, "__all")}>
          {copied === "__all" ? m.allCopied : m.copyAll}
        </button>
      </header>

      <!-- Recipient: the name the address belongs to. -->
      <div class="holder">
        <span class="k faint">{m.holderLabel}</span>
        <span class="v">{record.fullName}</span>
      </div>

      <!-- Field grid: label above, value below, copy button in the corner. -->
      <div class="fields">
        {#each record.fields as f (f.key)}
          <div class="field-cell" class:wide={f.key === "street" || f.key === "country"}>
            <span class="k">{labelFor(f.key)}</span>
            <span class="v">{f.value}</span>
            <button
              class="copybtn"
              type="button"
              title={m.copy}
              aria-label="{m.copy}: {labelFor(f.key)}"
              on:click={() => copy(f.value, f.key)}
            >
              {#if copied === f.key}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              {:else}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="9" y="9" width="12" height="12" rx="2.5" />
                  <path d="M5 15V5.5A2.5 2.5 0 0 1 7.5 3H17" />
                </svg>
              {/if}
            </button>
          </div>
        {/each}
      </div>

      <!-- The full address, one line. -->
      <div class="full">
        <div class="full-head">
          <span class="k faint">{m.fullAddress}</span>
          <button
            class="copybtn static"
            type="button"
            title={m.copy}
            aria-label="{m.copy}: {m.fullAddress}"
            on:click={() => copy(record!.fullAddress, "__full")}
          >
            {#if copied === "__full"}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            {:else}
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="12" height="12" rx="2.5" />
                <path d="M5 15V5.5A2.5 2.5 0 0 1 7.5 3H17" />
              </svg>
            {/if}
          </button>
        </div>
        <code class="full-value">{record.fullAddress}</code>
      </div>
    </section>
  {/if}

  <!-- Feature intro -->
  <section class="card guide" aria-labelledby="addr-features-h">
    <h2 id="addr-features-h">{m.featuresTitle}</h2>
    <ol class="guide-steps">
      {#each m.features as step, i (step.title)}
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

  <!-- Format explainer: driven by the registry, so it always agrees with the
       generator. -->
  {#if format}
    <section class="card guide" aria-labelledby="addr-format-h">
      <h2 id="addr-format-h">{m.formatTitle}</h2>
      <dl class="spec">
        <div class="spec-row">
          <dt>{m.formatAdmin}</dt>
          <dd>{format.adminLabel}</dd>
        </div>
        <div class="spec-row">
          <dt>{m.formatTemplate}</dt>
          <dd>{templateDisplay.join(" → ")}</dd>
        </div>

        <!-- The country's real structural conventions, each read from the
             registry rather than written as prose, so this can never disagree
             with what is generated. -->
        <div class="spec-row">
          <dt>{m.formatLevels}</dt>
          <dd>{format.levels}</dd>
        </div>
        <div class="spec-row">
          <dt>{m.formatNumberPos}</dt>
          <dd>{numberPosText}</dd>
        </div>
        <div class="spec-row">
          <dt>{m.formatDivisionLine}</dt>
          <dd>{format.usesDivision ? m.formatDivisionYes : m.formatDivisionNo}</dd>
        </div>

        <div class="spec-row">
          <dt>{m.formatPostal}</dt>
          <dd>
            {#if format.postalDisabled}
              {m.noPostal}
            {:else}
              <span class="mono">{format.postalMask}</span>
              <span class="faint legend">{m.maskLegend}</span>
            {/if}
          </dd>
        </div>
        <div class="spec-row">
          <dt>{m.formatPhone}</dt>
          <dd>
            <!-- International form: +CC then the national number. -->
            <div class="phone-line">
              <span class="faint legend">{m.formatIntl}</span>
              <span class="mono">+{format.dialCode} {"X".repeat(format.nationalDigits)}</span>
            </div>
            <!-- Local form: the trunk prefix countries dial internally, which the
                 international form drops. -->
            <div class="phone-line">
              <span class="faint legend">{m.formatLocal}</span>
              <span class="mono">
                {#if format.trunkPrefix}{format.trunkPrefix}{/if}{"X".repeat(format.nationalDigits)}
              </span>
            </div>
            <div class="faint legend">{format.groups.join("-")} · {digitLabel}</div>
          </dd>
        </div>
      </dl>
    </section>
  {/if}

  <!-- Example: the generated address, laid out over lines. -->
  {#if record}
    <section class="card guide" aria-labelledby="addr-example-h">
      <h2 id="addr-example-h">{m.exampleTitle}</h2>
      <p class="faint example-note">{m.exampleNote}</p>
      <div class="envelope">
        <div class="env-name">{record.fullName}</div>
        <!--
          Keyed by index, not by the line text: an address can legitimately
          repeat a line (in the UAE the city and the emirate are often both
          "Ras Al Khaimah"), and a value key would throw on the duplicate.

          Each line is labelled with the elements it carries, taken from the
          country's own template, so the example shows this country's structure
          rather than an assumed one.
        -->
        {#each record.lines as line, i (i)}
          <div class="env-row">
            <span class="env-line">{line.value}</span>
            <span class="env-role faint">{templateRole(line.template)}</span>
          </div>
        {/each}
      </div>
    </section>
  {/if}

  <!-- Notes -->
  <section class="card guide" aria-labelledby="addr-notes-h">
    <h2 id="addr-notes-h">{m.notesTitle}</h2>
    <ul class="notes">
      {#each m.notes as n (n)}
        <li>{n}</li>
      {/each}
    </ul>
    <p class="hint faint disclaimer">{m.disclaimer}</p>
  </section>
</div>

<style>
  .app { display: flex; flex-direction: column; gap: 1rem; }

  /* ------------------------------------------------------------ controls */

  .controls { padding: 1.25rem; }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.75rem;
  }

  .field { display: block; min-width: 0; flex: 0 1 auto; }
  .field-country { flex-basis: 18rem; }
  .select { width: 100%; }

  /* -------------------------------------------------------------- result */

  .result { padding: 1.25rem; }

  .result-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.625rem;
    margin-bottom: 1.25rem;
  }

  .result-head h2 { margin: 0; font-size: 0.9375rem; }
  .result-head .btn { margin-inline-start: auto; }

  /* Which country the record belongs to, beside the heading. */
  .country-badge {
    font-size: 0.75rem;
    color: var(--accent);
    background: var(--accent-soft);
    border-radius: var(--radius-pill);
    padding: 0.1875rem 0.625rem;
    white-space: nowrap;
  }

  .holder {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    padding-bottom: 1rem;
    margin-bottom: 1.25rem;
    border-bottom: 1px solid var(--border);
  }

  .holder .k { font-size: 0.75rem; }
  .holder .v { font-size: 1rem; font-weight: 500; }

  /* Field grid: a copy button in each cell's corner on hover/focus. */
  .fields {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem 1rem;
  }

  .field-cell {
    position: relative;
    padding: 0.625rem 2.25rem 0.625rem 0.75rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    min-width: 0;
  }

  .field-cell.wide { grid-column: span 2; }

  .field-cell .k {
    display: block;
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: var(--text-muted);
    margin-bottom: 0.1875rem;
  }

  .field-cell .v {
    display: block;
    font-size: 0.875rem;
    overflow-wrap: anywhere;
  }

  /* Copy button: hidden until the cell is hovered, always shown on touch. */
  .copybtn {
    position: absolute;
    top: 50%;
    right: 0.375rem;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--text-faint);
    cursor: pointer;
    opacity: 0;
    transition: opacity 140ms ease, color 140ms ease, background-color 140ms ease,
      border-color 140ms ease;
  }

  /* The full-address button sits on a line of its own, so it stays visible. */
  .copybtn.static {
    position: static;
    transform: none;
    opacity: 1;
  }

  .field-cell:hover .copybtn,
  .field-cell:focus-within .copybtn { opacity: 1; }
  .copybtn:hover { color: var(--text); background: var(--surface-3); border-color: var(--border); }
  .copybtn:focus-visible { opacity: 1; }

  @media (hover: none) {
    .copybtn { opacity: 1; }
  }

  /* Full address line. */
  .full {
    margin-top: 1.25rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--border);
  }

  .full-head {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.375rem;
  }

  .full-value {
    display: block;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    padding: 0.75rem 1rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    overflow-wrap: anywhere;
  }

  /* --------------------------------------------------------- guide cards */

  .guide { padding: 1.5rem; }

  .guide h2 { margin: 0 0 1.25rem; font-size: 1.0625rem; }

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

  .guide-steps li { display: flex; align-items: flex-start; gap: 0.75rem; }

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

  .step-title { margin: 0 0 0.1875rem; font-size: 0.875rem; font-weight: 500; }
  .step-body { margin: 0; font-size: 0.8125rem; line-height: 1.7; }

  /* ------------------------------------------------------ spec (format) */

  .spec { margin: 0; display: grid; gap: 0.875rem; }

  .spec-row {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.125rem;
  }

  @media (min-width: 560px) {
    .spec-row {
      grid-template-columns: 12rem 1fr;
      gap: 1rem;
      align-items: baseline;
    }
  }

  .spec dt {
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--text-muted);
  }

  .spec dd { margin: 0; font-size: 0.875rem; }

  /* International / local phone forms, label above value. */
  .phone-line {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    line-height: 1.8;
  }

  .legend { font-size: 0.75rem; margin-top: 0.1875rem; }

  /* ------------------------------------------------------------- example */

  .example-note { margin: 0 0 1rem; font-size: 0.8125rem; }

  /* An envelope: a bordered block that reads as a mailing address. */
  .envelope {
    font-family: var(--font-mono);
    font-size: 0.9375rem;
    padding: 1.25rem 1.5rem;
    background: var(--surface-2);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
  }

  .env-name { font-weight: 600; margin-bottom: 0.5rem; }

  /* Each printed line, with the elements it carries noted to its right. */
  .env-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 0.875rem;
    padding-block: 0.1875rem;
  }

  .env-line { color: var(--text-muted); }

  .env-role {
    font-family: var(--font-sans, Inter, sans-serif);
    font-size: 0.6875rem;
    letter-spacing: 0.02em;
  }

  /* --------------------------------------------------------------- notes */

  .notes { margin: 0; padding-inline-start: 1.125rem; display: grid; gap: 0.5rem; }
  .notes li { font-size: 0.8125rem; line-height: 1.7; color: var(--text-muted); }

  .disclaimer {
    margin: 1.25rem 0 0;
    padding-top: 1rem;
    border-top: 1px solid var(--border);
    color: var(--color-danger-600);
  }

  .hint { font-size: 0.75rem; margin: 0; line-height: 1.6; }
</style>
