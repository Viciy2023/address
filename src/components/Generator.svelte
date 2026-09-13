<script lang="ts">
  /**
   * Root interactive island.
   *
   * Everything runs client-side: no network calls, no server. That is what lets
   * the identical build be served from Cloudflare Pages or a plain web server
   * on a NAS.
   *
   * The seed is the source of truth. It is reflected in the URL (?s=...) so a
   * generated identity can be shared or bookmarked, and so the back button
   * walks through previously generated results.
   *
   * Name pools are loaded lazily per country (see `loadNamePool`), so the
   * initial bundle only carries bulk data, not all 34 name pools.
   */
  import Controls from "./Controls.svelte";
  import ResultPanel from "./ResultPanel.svelte";
  import { generateIdentity, type Identity } from "../lib/generator";
  import { COUNTRY_BY_CODE } from "../lib/registry";
  import { loadCountryData, loadNamePool, getDivisions } from "../lib/data";
  import { randomSeed, seedToString, seedFromToken } from "../lib/generator/rng";
  import type { SiteLang } from "../config";
  import type { Strings } from "../i18n/strings";

  export let lang: SiteLang;
  export let s: Strings;
  /** Country codes with bundled data, computed at build time. */
  export let available: string[];
  /**
   * Country to preselect. Set on country landing pages so the generator opens
   * already scoped to that country; undefined on the home page, which defaults
   * to US. A `?c=` in the URL still wins, so shared links reproduce.
   */
  export let initialCountry: string | undefined = undefined;

  let country = initialCountry && available.includes(initialCountry) ? initialCountry : "US";
  let division = "";
  let gender: "any" | "male" | "female" = "any";
  let identity: Identity | null = null;
  let avatarUrl = "";
  let busy = true;
  let error = "";

  const countries = available.map((code) => ({
    code,
    label: `${COUNTRY_BY_CODE[code].name[lang]} · ${code}`,
  }));

  // Division options come from the eagerly-loaded index, so the selector is
  // populated without waiting for the country's detail chunk. `lang` picks the
  // localized division name where GeoNames provides one.
  $: divisions = getDivisions(country, lang);

  async function build(seed: number) {
    const spec = COUNTRY_BY_CODE[country];
    if (!spec) {
      error = `No data for ${country}`;
      busy = false;
      return;
    }

    busy = true;
    try {
      // Country detail and name pool load in parallel.
      const [data, name] = await Promise.all([
        loadCountryData(country),
        loadNamePool(country),
      ]);
      identity = generateIdentity(spec, { name, countryData: data }, {
        country,
        seed,
        gender,
        division: division || null,
        lang,
      });

      /* Avatar: faker's personPortrait set is AI-generated fictional people,
         served from jsDelivr. Chosen over faker.image.avatar() because that
         returns real GitHub users' photos. */
      const sex = identity.summary.gender === "Female" ? "female" : "male";
      const idx = parseInt(identity.summary.avatarSeed.slice(0, 6), 36) % 100;
      avatarUrl = `https://cdn.jsdelivr.net/gh/faker-js/assets-person-portrait/${sex}/256/${idx}.jpg`;
      error = "";
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      identity = null;
    } finally {
      busy = false;
    }
  }

  function generate() {
    const seed = randomSeed();
    void build(seed);
    syncUrl(seed);
  }

  function syncUrl(seed: number) {
    const url = new URL(window.location.href);
    url.searchParams.set("s", seedToString(seed));
    url.searchParams.set("c", country);
    if (division) url.searchParams.set("d", division);
    else url.searchParams.delete("d");
    if (gender !== "any") url.searchParams.set("g", gender);
    else url.searchParams.delete("g");
    window.history.replaceState({}, "", url);
  }

  function onchange(patch: {
    country?: string;
    division?: string;
    gender?: "any" | "male" | "female";
  }) {
    if (patch.country !== undefined) {
      country = patch.country;
      division = ""; // the old division does not exist in the new country
    }
    if (patch.division !== undefined) division = patch.division;
    if (patch.gender !== undefined) gender = patch.gender;
    // Regenerate so the panel never contradicts the controls.
    const seed = identity?.seed ?? randomSeed();
    void build(seed);
    syncUrl(seed);
  }

  /** Restores state from the URL so shared links reproduce. */
  async function init() {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("c");
    if (c && available.includes(c)) country = c;
    const d = q.get("d");
    if (d) division = d;
    const g = q.get("g");
    if (g === "male" || g === "female") gender = g;

    const token = q.get("s");
    const seed = token ? seedFromToken(token) : null;
    // With no seed in the URL, show a populated result so the page is never
    // empty on arrival — an empty tool looks broken.
    await build(seed ?? (seedFromToken("kj3f9") as number));
  }

  if (typeof window !== "undefined") void init();

  // "R" regenerates. Handled here rather than in the panel so it works before
  // the first result exists too.
  function onKey(e: KeyboardEvent) {
    const el = e.target as HTMLElement | null;
    if (el && ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === "r" || e.key === "R") {
      e.preventDefault();
      generate();
    }
  }
</script>

<svelte:window on:keydown={onKey} />

<div class="app">
  <Controls
    {lang}
    {s}
    {countries}
    {divisions}
    {country}
    {division}
    {gender}
    {busy}
    onchange={onchange}
    ongenerate={generate}
  />

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  <ResultPanel {s} {lang} {identity} {avatarUrl} />
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .error {
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-danger-600);
    background: var(--color-danger-50);
    color: var(--color-danger-600);
    font-size: 0.875rem;
    margin: 0;
  }
</style>
