// @ts-check
import { defineConfig } from "astro/config";
import svelte from "@astrojs/svelte";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

import { SITE_URL } from "./src/config.ts";

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
      changefreq: "weekly",
      priority: 0.7,
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
