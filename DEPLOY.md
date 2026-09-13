# Deploying to Cloudflare Pages

The project is connected to GitHub and builds automatically on every push to
`main`. This document records the working configuration and the reasoning behind
the one setting that is easy to get wrong.

## Current setup

| Setting | Value |
| --- | --- |
| Pages project | `address` |
| Production URL | `https://address-6bo.pages.dev` |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(blank)* |
| Environment variable | `SITE_URL` = `https://address-6bo.pages.dev` |

## Why SITE_URL must be set

The site is **statically prerendered**: the 164 HTML files are generated once,
and each contains absolute URLs — `canonical`, `hreflang`, `og:image` and the
sitemap's `<loc>`. Those elements are required by their specifications to be
absolute, and Cloudflare Pages serves static files verbatim without rewriting
the HTML, so the origin has to be known at build time.

Cloudflare does inject `CF_PAGES_URL`, and the build reads it. But on Cloudflare
that value is the **per-deployment** host:

```
CF_PAGES_URL  = https://722fe9b9.address-6bo.pages.dev   ← changes every deploy
stable domain = https://address-6bo.pages.dev            ← what canonical needs
```

A canonical tag that changes on every deployment gives search engines no stable
address to consolidate on. So production sets `SITE_URL` to the stable domain,
and `CF_PAGES_URL` remains only as a fallback so a build without `SITE_URL` is
still functional (it logs a warning when this happens).

The domain is never hard-coded in the source; it lives only in the project's
environment variables and `.env` for local work.

## Build configuration

The build command is required and is **not** inferred. Without it Pages skips
the build entirely and reports:

```
No build command specified. Skipping build step.
Error: Output directory "dist" not found.
```

Set it in **Settings → Build configuration**:

| Field | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(blank)* |

`dist` is relative to the repository root. Node 22 comes from `.node-version`.

---

## Preview deployments

Any branch other than `main` — and any pull request — is built as a *preview*
deployment at `<hash>.address-6bo.pages.dev`.

The same source deliberately produces different output there:

- `<meta name="robots">` becomes `noindex, nofollow`
- `robots.txt` becomes `Disallow: /`

This prevents a preview copy of a page from being indexed over the real one. It
needs no configuration; it is driven by `CF_PAGES_BRANCH`.

---

## Direct upload with Wrangler (alternative)

```bash
npx wrangler login
npm run build
npx wrangler pages deploy dist --project-name=address
```

`wrangler login` is interactive and opens a browser, so it cannot be scripted in
a non-interactive shell. For CI, create an API token with the
**Cloudflare Pages — Edit** permission and export it as `CLOUDFLARE_API_TOKEN`
together with `CLOUDFLARE_ACCOUNT_ID`.

Note: adding a `wrangler.toml` to the repository makes it the source of truth
for the project's configuration and the same fields then become read-only in the
dashboard. The file is gitignored here on purpose — the dashboard is easier to
manage.

---

## Verifying a deployment

```bash
# Canonical must be the stable domain, not a per-deployment hash
curl -s https://address-6bo.pages.dev/en/countries/us/ | grep -o 'rel="canonical" href="[^"]*"'

# Sitemap must list 164 URLs on the stable origin
curl -s https://address-6bo.pages.dev/sitemap-0.xml | grep -c '<loc>'

# Production robots.txt allows crawling and points at the sitemap
curl -s https://address-6bo.pages.dev/robots.txt
```

Expected: canonical on `https://address-6bo.pages.dev/...`, 164 `<loc>` entries,
and a robots.txt with `Allow: /` plus a `Sitemap:` line.

The build enforces the canonical check itself: `npm run budget` fails if the
origin baked into the HTML does not match the resolved origin.

---

## Other hosts

`dist/` is plain static output with no runtime dependency and no server-side
code. It works on any web server (nginx on a NAS, GitHub Pages, S3, and so on).

For a host that does not announce its own URL, set `SITE_URL` before the build:

```bash
SITE_URL=https://your.host npm run build
```

---

## Post-deploy checklist

- [ ] `https://address-6bo.pages.dev/` loads and the generator produces a record
- [ ] Switching country changes the division list and regenerates
- [ ] `?c=JP` opens the tool already scoped to Japan
- [ ] `/en/countries/ca/` renders the fact table and example record
- [ ] Canonical on a country page is the stable domain, not a `<hash>.` host
- [ ] `robots.txt` and `sitemap-0.xml` reference the stable domain
- [ ] Sitemap contains 164 `<loc>` entries

## Optional: submit the sitemap

After the site is live, submit
`https://address-6bo.pages.dev/sitemap-index.xml` in Google Search Console. This
is what actually gets the 164 pages indexed.

