// @ts-check
import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import { SITE_URL } from "./src/config.ts";
import { ROUTES, matchCountryPath } from "./src/routes.ts";

/**
 * Maps a built URL back to the priority and changefreq declared in
 * `src/routes.ts`, so those fields are the single source of truth rather than
 * duplicated here. Country landing pages get a mid priority: worth indexing,
 * but below the generator itself.
 */
function routeMeta(pathname) {
  // Strip the language prefix and trailing slash to get the language-relative path.
  const withoutLang = pathname.replace(/^\/(en|ja|ko)(?=\/|$)/, "");
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
        locales: { zh: "zh-CN", en: "en", ja: "ja", ko: "ko" },
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
