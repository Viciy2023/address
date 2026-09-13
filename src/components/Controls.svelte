<script lang="ts">
  /**
   * Country / division / gender selector.
   *
   * Kept separate from the result panel so that changing a control does not
   * re-render the whole field list before the user asks for it.
   */
  import type { SiteLang } from "../config";
  import type { Strings } from "../i18n/strings";

  export let lang: SiteLang;
  export let s: Strings;
  export let countries: { code: string; label: string }[];
  export let divisions: { code: string; name: string }[] = [];

  export let country: string;
  export let division = "";
  export let gender: "any" | "male" | "female" = "any";
  export let busy = false;

  export let onchange: (patch: {
    country?: string;
    division?: string;
    gender?: "any" | "male" | "female";
  }) => void;

  export let ongenerate: () => void;

  // Cmd/Ctrl+Enter submits from anywhere in the form.
  function onKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      ongenerate();
    }
  }
</script>

<section class="card" aria-labelledby="controls-heading">
  <h2 id="controls-heading" class="sr-only">{s.resultTitle}</h2>

  <div class="controls" svelte:window:keydown={onKeydown}>
    <div>
      <label class="field-label" for="country">{s.selectCountry}</label>
      <select
        id="country"
        class="select"
        value={country}
        on:change={(e) => onchange({ country: (e.currentTarget as HTMLSelectElement).value })}
      >
        {#each countries as c (c.code)}
          <option value={c.code}>{c.label}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="field-label" for="division">{s.selectDivision}</label>
      <select
        id="division"
        class="select"
        value={division}
        disabled={divisions.length === 0}
        on:change={(e) => onchange({ division: (e.currentTarget as HTMLSelectElement).value })}
      >
        <option value="">{s.divisionAny}</option>
        {#each divisions as d (d.code)}
          <option value={d.code}>{d.name}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="field-label" for="gender">{s.selectGender}</label>
      <select
        id="gender"
        class="select"
        value={gender}
        on:change={(e) =>
          onchange({ gender: (e.currentTarget as HTMLSelectElement).value as "any" | "male" | "female" })}
      >
        <option value="any">{s.genderAny}</option>
        <option value="male">{s.genderMale}</option>
        <option value="female">{s.genderFemale}</option>
      </select>
    </div>

    <div class="controls-action">
      <!-- One primary action per view. -->
      <button class="btn btn-primary generate" on:click={ongenerate} disabled={busy}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" aria-hidden="true">
          <path d="M21 12a9 9 0 1 1-3-6.7" />
          <path d="M21 3v6h-6" />
        </svg>
        {s.generate}
      </button>
    </div>
  </div>
</section>

<style>
  .controls {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem 1.25rem;
    padding: 1.25rem;
  }

  @media (min-width: 640px) {
    .controls {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (min-width: 1024px) {
    .controls {
      /* Three fields plus the action, the action aligned to the input row. */
      grid-template-columns: 1.2fr 1.2fr 0.9fr auto;
      align-items: end;
    }
  }

  .controls-action {
    display: flex;
    align-items: flex-end;
  }

  .generate {
    width: 100%;
  }

  @media (min-width: 1024px) {
    .generate {
      width: auto;
      padding-inline: 1.5rem;
    }
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
