// @ts-check
import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import { SITE_URL, SITE_URL_AUTO, ON_PAGES } from "./src/config.ts";
import { ROUTES, matchCountryPath } from "./src/routes.ts";

/**
 * Warns when a Cloudflare Pages build is relying on the platform-provided URL.
 *
 * `CF_PAGES_URL` is the per-deployment host (`<hash>.<project>.pages.dev`), so
 * a site built this way gets canonical URLs that change on every deployment.
 * Google then has no stable canonical to settle on. The site still works — the
 * fallback exists so a misconfigured build is not broken — but production
 * should set SITE_URL to the stable origin.
 */
if (ON_PAGES && SITE_URL_AUTO) {
  console.warn(
    [
      "",
      "  ⚠  Building on Cloudflare Pages without SITE_URL.",
      `     Falling back to the per-deployment URL: ${SITE_URL}`,
      "     Canonical URLs will change on every deploy, which prevents search",
      "     engines from settling on a canonical address.",
      "",
      "     Set SITE_URL to the project's stable domain, e.g.:",
      "       Settings → Environment variables → SITE_URL = https://<project>.pages.dev",
      "",
    ].join("\n"),
  );
}

/**
 * Maps a built URL back to the priority and changefreq declared in
 * `src/routes.ts`, so those fields are the single source of truth rather than
 * duplicated here. Country landing pages get a mid priority: worth indexing,
 * but below the generator itself.
 */
function routeMeta(pathname) {
  // Strip the language prefix and trailing slash to get the language-relative path.
  const withoutLang = pathname.replace(/^\/(zh-hant|en|ja|ko)(?=\/|$)/, "");
  const rel = withoutLang.replace(/^\/+|\/+$/g, "");

  const match = ROUTES.find((r) => r.path === rel);
  if (match) return { priority: match.priority, changefreq: match.changefreq };

  if (matchCountryPath(rel)) return { priority: 0.6, changefreq: "monthly" };

  return { priority: 0.5, changefreq: "monthly" };
}

/**
 * Astro is configured for a fully static build so the same `dist/` can be
 * served by Cloudflare Pages or by any plain web server (including a NAS).
 * Nothing here depends on a Node runtime at request time.
 *
 * URL strategy: routing is handled by a single catch-all route
 * (`src/pages/[...path].astro`) rather than by Astro's i18n router. That keeps
 * the default language at "/" and puts the others under "/en/", "/ja/", "/ko/"
 * exactly as intended, and means the route table in `src/routes.ts` is the one
 * and only source of truth for what pages exist.
 */
export default defineConfig({
  site: SITE_URL,
  // Directory-style URLs keep the structure host-independent: /en/about/
  // resolves identically on any server.
  trailingSlash: "always",
  build: {
    format: "directory",
    inlineStylesheets: "auto",
  },
  integrations: [
    svelte(),
    sitemap({
      i18n: {
        defaultLocale: "zh",
        locales: { zh: "zh-CN", "zh-hant": "zh-Hant", en: "en", ja: "ja", ko: "ko" },
      },
      serialize(item) {
        const { priority, changefreq } = routeMeta(new URL(item.url).pathname);
        return { ...item, priority, changefreq };
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
