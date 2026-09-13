import type { APIRoute } from "astro";
import { SITE_URL, IS_PREVIEW } from "../config";

/**
 * robots.txt is generated rather than static so the sitemap URL always matches
 * the domain the site was built for. A hand-written robots.txt pointing at the
 * wrong host is a silent indexing failure, and it is exactly the kind of thing
 * the legacy project asked its users to fix by hand.
 *
 * Preview deployments are disallowed outright. A preview build is served from
 * `<hash>.<project>.pages.dev` and duplicates the production content; letting
 * it be crawled risks it being indexed in place of the real site. This pairs
 * with the `noindex` robots meta tag the layout emits under the same condition.
 */
export const GET: APIRoute = () => {
  const body = IS_PREVIEW
    ? [
        "# Preview deployment — not for indexing.",
        "User-agent: *",
        "Disallow: /",
        "",
      ].join("\n")
    : [
        "User-agent: *",
        "Allow: /",
        "",
        "# Generated at build time from the deployment's own URL.",
        `Sitemap: ${SITE_URL}/sitemap-index.xml`,
        "",
      ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
