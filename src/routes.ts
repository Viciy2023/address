/**
 * Route table.
 *
 * A single declarative list drives both page generation and the sitemap, so a
 * new page can never exist in one place and be missing from the other — the
 * defect that left 40 article pages with relative hreflang URLs in the legacy
 * site.
 *
 * Two kinds of route exist:
 *
 *   1. Fixed pages (home, countries, credits, prose). Listed verbatim below.
 *   2. Country landing pages, one per country: "countries/<code>". These are
 *      not enumerated here because the list would have to be kept in step with
 *      the registry by hand; `countryPaths()` derives them instead.
 */

export interface RouteDef {
  /** Path relative to the language root, no leading or trailing slash. "" = home. */
  path: string;
  /** Changing priority for the sitemap. */
  priority: number;
  changefreq: "daily" | "weekly" | "monthly" | "yearly";
  /** Included in the sitemap. */
  index: boolean;
}

export const ROUTES: RouteDef[] = [
  { path: "", priority: 1.0, changefreq: "weekly", index: true },
  { path: "mail", priority: 0.9, changefreq: "monthly", index: true },
  { path: "countries", priority: 0.8, changefreq: "monthly", index: true },
  { path: "credits", priority: 0.5, changefreq: "yearly", index: true },
  { path: "about", priority: 0.5, changefreq: "yearly", index: true },
  { path: "contact", priority: 0.4, changefreq: "yearly", index: true },
  { path: "privacy", priority: 0.3, changefreq: "yearly", index: true },
  { path: "terms", priority: 0.3, changefreq: "yearly", index: true },
];

/** Resolves a fixed route definition from a slug array. Returns null when unknown. */
export function matchRoute(path: string): RouteDef | null {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return ROUTES.find((r) => r.path === clean) ?? null;
}

/* ------------------------------------------------------------------ */
/* Country landing pages: "countries/<code>"                           */
/* ------------------------------------------------------------------ */

/**
 * Returns the ISO country code when `path` is a country landing path,
 * otherwise null. Case-insensitive so "/countries/US/" and "/countries/us/"
 * both resolve; the caller normalises the code it passes on.
 */
export function matchCountryPath(path: string): string | null {
  const clean = path.replace(/^\/+|\/+$/g, "");
  const m = /^countries\/([a-z]{2})$/i.exec(clean);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Builds the language-relative path for a country page. The code is lowercased
 * in the URL, matching the anchor ids on the countries index.
 */
export function countryPath(code: string): string {
  return `countries/${code.toLowerCase()}`;
}
