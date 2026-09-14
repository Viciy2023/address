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
 *
 * `import.meta.env` is absent when the module is loaded by plain Node — the
 * build scripts and the test suite do exactly that — so it is probed rather
 * than assumed.
 */
function readEnv(name: string): string | undefined {
  const viteEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
  const fromVite = viteEnv ? viteEnv[name] : undefined;
  const fromProcess =
    typeof process !== "undefined" ? process.env?.[name] : undefined;
  const value = fromVite || fromProcess;
  return value ? String(value).trim() : undefined;
}

/**
 * Resolves the public origin.
 *
 * Order, and why:
 *
 *   1. `SITE_URL` — an explicit, stable origin. **This is what production
 *      should use.** Set it in the Pages project's environment variables.
 *   2. `CF_PAGES_URL` — injected by Cloudflare Pages. It points at *this
 *      deployment*, which on Cloudflare is the per-deployment host
 *      (`<hash>.<project>.pages.dev`), not the stable `<project>.pages.dev`.
 *      Using it alone would mean the canonical URL changes on every deploy,
 *      which stops Google settling on a canonical at all. It is kept as a
 *      fallback so a Pages build still produces a working site rather than
 *      localhost URLs, but production must set SITE_URL.
 *   3. localhost — development.
 */
const explicit = readEnv("SITE_URL");
const cfUrl = readEnv("CF_PAGES_URL");
const raw = explicit ?? cfUrl ?? "http://localhost:4321";

/** Normalised origin with no trailing slash, e.g. "https://example.com". */
export const SITE_URL = raw.replace(/\/+$/, "");

/**
 * True when the origin came from the platform rather than from SITE_URL.
 *
 * On Cloudflare this means the canonical is a per-deployment host and will
 * change on the next deploy. Surfaced so the build can warn about it.
 */
export const SITE_URL_AUTO = !explicit && Boolean(cfUrl);

/**
 * True when running inside a Cloudflare Pages build.
 * `CF_PAGES` is set to "1" by the build image.
 */
export const ON_PAGES = Boolean(readEnv("CF_PAGES"));

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
  name: {
    zh: "云栖数据",
    "zh-hant": "雲棲數據",
    en: "Yunqi Data",
    ja: "雲栖データ",
    ko: "윈치 데이터",
  },
  /** Product name shown in the header and titles. */
  product: {
    zh: "虚拟身份",
    "zh-hant": "虛擬身份",
    en: "Virtual Identity",
    ja: "バーチャル・アイデンティティ",
    ko: "가상 신원",
  },
  /** Contact addresses used on the contact page and in legal pages. */
  email: "cyuan52@gmail.com",
  /** Telegram contact, surfaced in the footer and on the contact page. */
  telegram: "https://t.me/ccy2056",
  /**
   * Temporary mailbox API origin.
   *
   * A separately deployed instance of the cloudflare_temp_email worker. The
   * mailbox feature talks to it directly from the browser, so the address is
   * public by nature and baked in at build time.
   *
   * This is the one part of the site that contacts a server. The privacy policy
   * discloses it explicitly; previously the policy said no request was ever
   * sent, which the mailbox would have made false.
   */
  mailApi: readEnv("PUBLIC_MAIL_API_URL")?.replace(/\/+$/, "") || "https://mail.yiscience.cn",
  /** AdSense publisher id. Empty means "no ads" — the banner is not rendered. */
  adsenseClient: readEnv("ADSENSE_CLIENT") ?? "",
  /** Cloudflare Web Analytics token. Empty means "no analytics". */
  analyticsToken: readEnv("CF_ANALYTICS_TOKEN") ?? "",
} as const;

/**
 * UI languages, in switcher order.
 *
 * `zh-hant` covers Traditional Chinese readers in Taiwan, Hong Kong and Macau.
 * It is a separate locale rather than a script variant of `zh` because the
 * wording differs, not only the glyphs.
 *
 * The key is lowercase because it is used verbatim as the URL segment;
 * `LANG_TAG` supplies the correctly-cased BCP 47 value for `hreflang`. Serving
 * both `/zh-hant/` and `/zh-Hant/` would create two URLs for one page.
 */
export const LANGS = ["zh", "zh-hant", "en", "ja", "ko"] as const;
export type SiteLang = (typeof LANGS)[number];

/** Default language lives at "/", others under "/<lang>/". */
export const DEFAULT_LANG: SiteLang = "zh";

export const LANG_LABEL: Record<SiteLang, string> = {
  zh: "简体中文",
  "zh-hant": "繁體中文",
  en: "English",
  ja: "日本語",
  ko: "한국어",
};

export const LANG_TAG: Record<SiteLang, string> = {
  zh: "zh-CN",
  "zh-hant": "zh-Hant",
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
