/**
 * Route table.
 *
 * A single declarative list drives both page generation and the sitemap, so a
 * new page can never exist in one place and be missing from the other — the
 * defect that left 40 article pages with relative hreflang URLs in the legacy
 * site.
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
  { path: "countries", priority: 0.8, changefreq: "monthly", index: true },
  { path: "credits", priority: 0.5, changefreq: "yearly", index: true },
  { path: "about", priority: 0.5, changefreq: "yearly", index: true },
  { path: "contact", priority: 0.4, changefreq: "yearly", index: true },
  { path: "privacy", priority: 0.3, changefreq: "yearly", index: true },
  { path: "terms", priority: 0.3, changefreq: "yearly", index: true },
];

/** Resolves a route definition from a slug array. Returns null when unknown. */
export function matchRoute(path: string): RouteDef | null {
  const clean = path.replace(/^\/+|\/+$/g, "");
  return ROUTES.find((r) => r.path === clean) ?? null;
}
