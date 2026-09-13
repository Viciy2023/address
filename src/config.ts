/**
 * Site configuration.
 *
 * SITE_URL is the only place a domain appears. Every canonical URL, sitemap
 * entry and hreflang tag is derived from it at build time, so switching domains
 * is a one-line change and a rebuild — never a search-and-replace across the
 * HTML.
 *
 * Set it in the hosting provider's build environment:
 *   Cloudflare Pages  ->  Settings > Environment variables > SITE_URL
 *   Local / FNOS      ->  .env
 */

const raw = import.meta.env.SITE_URL ?? process.env.SITE_URL ?? "http://localhost:4321";

/** Normalised origin with no trailing slash, e.g. "https://example.com". */
export const SITE_URL = raw.replace(/\/+$/, "");

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
