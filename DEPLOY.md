# Deploying to Cloudflare Pages

Everything the build needs is already in the repository. **No environment
variables are required** — Pages injects `CF_PAGES_URL` into every build and the
site reads it to produce absolute URLs (canonical, hreflang, sitemap, robots).
The canonical tags will match whatever `*.pages.dev` address the project gets.

## Git integration (recommended)

Every push to the production branch rebuilds and redeploys automatically.

### 1. Create the project

Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**.

### 2. Authorise and pick the repository

Select `Viciy2023/address`.

> The project is in the repository root, so no root directory needs to be set.

### 3. Set the build configuration

| Field | Value |
| --- | --- |
| Framework preset | **Astro** |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | *(leave blank)* |

### 4. Environment variables

**Leave empty.** `SITE_URL`, `ADSENSE_CLIENT` and `CF_ANALYTICS_TOKEN` are all
optional; see `.env.example`.

Only add `SITE_URL` if you later attach a custom domain and want the canonical
origin to be that domain instead of the `*.pages.dev` one.

### 5. Deploy

Pages runs `npm ci && npm run build`, then publishes `dist/`. The site is live
at `https://<project-name>.pages.dev`. Node 22 comes from `.node-version`.

---

## What happens to branch and PR builds

Any branch other than the production branch — and any pull request — is built as
a *preview* deployment at `<hash>.<project>.pages.dev`.

The same source produces a **different output** there on purpose:

- `<meta name="robots">` becomes `noindex, nofollow`
- `robots.txt` becomes `Disallow: /`

This prevents a preview copy of a page from being indexed in place of the real
one. It needs no configuration and is driven by `CF_PAGES_BRANCH`.

---

## Direct upload with Wrangler (alternative)

Use this if you would rather not connect the repository.

```bash
npx wrangler login
npm run build
npx wrangler pages deploy dist --project-name=<project-name>
```

`wrangler login` is interactive and opens a browser; it cannot be scripted in a
non-interactive shell. If you need it in CI, create an API token with the
**Cloudflare Pages — Edit** permission and export it as `CLOUDFLARE_API_TOKEN`
along with `CLOUDFLARE_ACCOUNT_ID`.

---

## Verifying a deployment

```bash
# Canonical must match the deployed origin
curl -s https://<project>.pages.dev/en/countries/us/ | grep -o 'rel="canonical" href="[^"]*"'

# Sitemap must list 164 URLs and use the deployed origin
curl -s https://<project>.pages.dev/sitemap-0.xml | grep -c '<loc>'

# Production robots.txt allows crawling and points at the sitemap
curl -s https://<project>.pages.dev/robots.txt
```

Expected: canonical on the `*.pages.dev` origin, 164 `<loc>` entries, and a
robots.txt with `Allow: /` and a `Sitemap:` line.

---

## Other hosts

`dist/` is plain static output with no runtime dependency and no server-side
code. It works on any web server (nginx on a NAS, GitHub Pages, S3, and so on).

For a host that does **not** announce its own URL, set `SITE_URL` before the
build:

```bash
SITE_URL=https://your.host npm run build
```

---

## Post-deploy checklist

- [ ] `https://<project>.pages.dev/` loads and the generator produces a record
- [ ] Switching country changes the division list and regenerates
- [ ] `?c=JP` opens the tool already scoped to Japan
- [ ] `/en/countries/ca/` renders the fact table and example record
- [ ] Canonical URL on a country page matches the deployed origin
- [ ] `robots.txt` and `sitemap-0.xml` reference the deployed origin
- [ ] Sitemap contains 164 `<loc>` entries

## Optional: submit the sitemap

After the site is live, submit `https://<project>.pages.dev/sitemap-index.xml`
in Google Search Console. This is what actually gets the 164 pages indexed.
