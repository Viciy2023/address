import type { APIRoute } from "astro";
import { SITE_URL } from "../config";

/**
 * robots.txt is generated rather than static so the sitemap URL always matches
 * the domain the site was built for. A hand-written robots.txt pointing at the
 * wrong host is a silent indexing failure, and it is exactly the kind of thing
 * the legacy project asked its users to fix by hand.
 */
export const GET: APIRoute = () => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    "# Generated at build time from SITE_URL.",
    `Sitemap: ${SITE_URL}/sitemap-index.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
