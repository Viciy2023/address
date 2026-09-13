/**
 * Site configuration.
 *
 * The public origin is resolved automatically, in this order:
 *
 *   1. `SITE_URL` — an explicit override. Use it for local builds, for a
 *      custom domain, or for any host that does not announce its own URL.
 *   2. `CF_PAGES_URL` — injected by Cloudflare Pages into every build. It is
 *      the exact URL that deployment will be served at, so the canonical tags,
 *      sitemap and robots.txt match the live domain with no configuration.
 *   3. `http://localhost:4321` — the dev-server default.
 *
 * Why the order matters: Cloudflare Pages serves static files verbatim. It does
 * not rewrite the HTML, so absolute URLs (canonical, hreflang, og:image,
 * sitemap <loc>) are baked in at build time and cannot be corrected later.
 * Reading CF_PAGES_URL at build time is what makes the domain configuration-free
 * on Pages while still allowing a manual override anywhere else.
 *
 * Set an override in the hosting provider's build environment:
 *   Cloudflare Pages  ->  Settings > Environment variables > SITE_URL
 *   Local / FNOS      ->  .env
 */

/**
 * Reads an environment variable across runtimes.
 *
 * `import.meta.env` is Vite's; `process.env` is the Node build process and is
 * also where Cloudflare's injected variables land during the Pages build.
 */
function readEnv(name: string): string | undefined {
  const fromVite = (import.meta.env as Record<string, string | undefined>)[name];
  const fromProcess =
    typeof process !== "undefined" ? process.env?.[name] : undefined;
  const value = fromVite || fromProcess;
  return value ? String(value).trim() : undefined;
}

const raw = readEnv("SITE_URL") ?? readEnv("CF_PAGES_URL") ?? "http://localhost:4321";

/** Normalised origin with no trailing slash, e.g. "https://example.com". */
export const SITE_URL = raw.replace(/\/+$/, "");

/** True when the origin came from the hosting platform, not from SITE_URL. */
export const SITE_URL_AUTO = !readEnv("SITE_URL") && Boolean(readEnv("CF_PAGES_URL"));

/**
 * Preview deployments must not be indexed.
 *
 * Cloudflare Pages gives every non-production branch and every pull request its
 * own URL (`<hash>.<project>.pages.dev`). Those builds run the same code, so
 * without this check their canonical tags would point at the preview host and
 * Google could index a preview copy as the real page.
 *
 * `CF_PAGES_BRANCH` is the production branch ("main") only for real production
 * builds. When it is set to anything else the page is marked noindex; the
 * canonical still points at the production origin so any stray crawl
 * consolidates onto the real URL.
 */
const cfBranch = readEnv("CF_PAGES_BRANCH");
const cfProductionBranch = readEnv("CF_PAGES_PROD_BRANCH") ?? "main";
export const IS_PREVIEW = Boolean(cfBranch) && cfBranch !== cfProductionBranch;

export const SITE = {
  url: SITE_URL,
  /** Brand name; also used as the JSON-LD organisation name. */
  name: "Aimei",
  /** Product name shown in the header and titles. */
  product: {
    zh: "身份与地址生成器",
    en: "Identity & Address Generator",
    ja: "アイデンティティ・住所ジェネレーター",
    ko: "신원 및 주소 생성기",
  },
  /** Contact address used on the contact page and in legal pages. */
  email: "dulisikao1@hotmail.com",
  /** AdSense publisher id. Empty means "no ads" — the banner is not rendered. */
  adsenseClient: import.meta.env.ADSENSE_CLIENT ?? process.env.ADSENSE_CLIENT ?? "",
  /** Cloudflare Web Analytics token. Empty means "no analytics". */
  analyticsToken: import.meta.env.CF_ANALYTICS_TOKEN ?? process.env.CF_ANALYTICS_TOKEN ?? "",
} as const;

/** UI languages, in switcher order. */
export const LANGS = ["zh", "en", "ja", "ko"] as const;
export type SiteLang = (typeof LANGS)[number];

/** Default language lives at "/", others under "/<lang>/". */
export const DEFAULT_LANG: SiteLang = "zh";

export const LANG_LABEL: Record<SiteLang, string> = {
  zh: "中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
};

export const LANG_TAG: Record<SiteLang, string> = {
  zh: "zh-CN",
  en: "en",
  ja: "ja",
  ko: "ko",
};

/**
 * Builds an absolute URL for a language-relative path.
 * `localize("/about/", "en")` -> "https://example.com/en/about/"
 */
export function localize(path: string, lang: SiteLang): string {
  const clean = "/" + path.replace(/^\/+|\/+$/g, "");
  const prefix = lang === DEFAULT_LANG ? "" : `/${lang}`;
  return `${prefix}${clean === "/" ? "/" : clean + "/"}`.replace(/\/+/g, "/");
}

/** Absolute URL including the origin. */
export function absolute(path: string, lang: SiteLang): string {
  return SITE_URL + localize(path, lang);
}
