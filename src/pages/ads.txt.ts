import type { APIRoute } from "astro";
import { SITE } from "../config";

/**
 * ads.txt — the IAB authorised-sellers declaration.
 *
 * Google requires this file for AdSense monetisation; without it, demand is
 * suppressed. It is generated rather than committed as a static file so it can
 * never disagree with the publisher id actually configured for the build.
 *
 * Returns 404 when no publisher id is set, which is the correct signal: the
 * site is not monetised, so there is nothing to declare.
 */
export const GET: APIRoute = () => {
  if (!SITE.adsenseClient) {
    return new Response("Not found", { status: 404 });
  }

  const pubId = SITE.adsenseClient.replace(/^ca-/, "");
  const body = [
    "# Generated from ADSENSE_CLIENT at build time.",
    `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
