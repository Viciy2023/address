# Identity & Address Generator

A multi-country synthetic identity generator. It produces realistic-format
person records — name, address, postal code, phone, national identifier,
employment, lifestyle and online profile — for 34 countries and regions, in
four interface languages.

Everything runs in the browser. There is no backend, no account, and no data
leaves the device.

## Why this exists

Generating a plausible test identity is harder than it looks. The difficult
parts are not the random names; they are the invariants:

- A city, its administrative division and its postal code must agree.
- Age must be consistent with the date of birth.
- A height and weight pair must be anatomically plausible together.
- National identifier formats differ per country, and many have check digits.
- Whether a field is even meaningful is country-specific (blood type is
  recorded in Japan and Germany, not in France; ethnicity is collected in the
  US and Brazil, not in Sweden).

This project treats those invariants as the actual product.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Astro 7 | Static output by default; ships zero JS except the island |
| Islands | Svelte 5 | Only the generator hydrates; every other page is plain HTML |
| Styling | Tailwind v4 | CSS-first config, semantic tokens, small output |
| Language | TypeScript (strict) | The generator core is shared and must be type-safe |
| Data | GeoNames + faker, precompiled to JSON | Free, commercially usable, no runtime dependency |
| Hosting | Any static host | Verified against Cloudflare Pages and plain nginx |

The build is fully static. `dist/` can be served by Cloudflare Pages, GitHub
Pages, nginx on a NAS, or anything else that serves files.

## Getting started

```bash
npm install
cp .env.example .env      # then set SITE_URL
npm run dev               # http://localhost:4321
```

### Environment

Only `SITE_URL` is required. It is the single place a domain appears — every
canonical URL, sitemap entry, `hreflang` tag and `robots.txt` line is derived
from it at build time, so changing domains is a one-line change plus a rebuild.

| Variable | Required | Effect when set | Effect when empty |
| --- | --- | --- | --- |
| `SITE_URL` | yes | Canonical origin for all generated URLs | Falls back to localhost |
| `ADSENSE_CLIENT` | no | Loads AdSense, shows the consent banner, emits `ads.txt` | No ads, no banner, privacy policy states no third-party services are used |
| `CF_ANALYTICS_TOKEN` | no | Loads Cloudflare Web Analytics (cookieless) | No analytics |

The privacy policy is generated from these flags rather than hand-written, so
it cannot claim a service the site does not use.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build to `dist/` |
| `npm run check` | Astro + TypeScript checks (0 errors expected) |
| `npm test` | Generator test suite — 81 checks |
| `npm run data` | Regenerate country data from GeoNames and faker |
| `npm run verify` | Full gate: hygiene → check → test → build → links → budget |
| `npm run hygiene` | Encoding and generated-data guard |
| `npm run links` | Internal link and anchor checker |
| `npm run budget` | Size, file-count and page-coverage budget |
| `node scripts/build-og.mjs` | Regenerate the social share image |

## Architecture

```
src/
  config.ts              Site URL, languages, feature flags — the only domain source
  routes.ts              Route table; drives pages, sitemap and hreflang together
  content.ts             Prose copy (about, contact, terms) for all languages
  country-content.ts     Country landing-page copy (four languages)
  privacy.ts             Privacy policy, generated from live config
  i18n/strings.ts        UI strings for zh / en / ja / ko
  lib/
    registry.ts          Country definitions: formats, pools, identifier specs
    data.ts              Data loading (eager index, lazy detail and name pools)
    sample.ts            Build-time example record for country pages
    generator/
      rng.ts             Seeded PRNG — makes results reproducible
      postal.ts          Postal-code shapes per country
      identifiers.ts     National ID generators, with real check digits
      index.ts           Assembles the full identity record
  data/
    index.json           Divisions for all countries (~30 KB, loaded eagerly)
    countries/*.json     Cities and postal codes per country (lazy)
    names/*.json         Name pools per country (lazy)
    stats.json           Aggregate counts for the credits page
  components/            Svelte islands and Astro fragments
  views/                 Page bodies
  pages/[...path].astro  Single route file for the whole site
```

### Pages

`src/routes.ts` plus the country registry drive **164 pages**: 28 fixed pages
(7 routes × 4 languages) and **136 country landing pages** (34 countries × 4
languages). Each country page carries a fact table, a worked example generated
at build time by the same engine the client uses, and links to every other
country — so the generator is not a single indexable URL.

### Two decisions worth knowing

**One route file, one route table.** `src/routes.ts` drives page generation,
the sitemap and the `hreflang` set from a single list. A page cannot exist in
one place and be missing from another, which is how duplicate and relative
`hreflang` tags crept into the previous implementation.

**Three-tier data loading.** The country/division index is eager because the
selectors need it immediately; city and postal detail plus name pools are lazy
per country. A visitor who never switches country never downloads the other 33.

## Data sources

All free and commercially usable. Attribution is a licence requirement, not a
courtesy, and is rendered on the `/credits/` page.

| Source | Licence | Used for |
| --- | --- | --- |
| [GeoNames](https://www.geonames.org/) | CC-BY 4.0 | Administrative divisions, cities, postal codes, time zones |
| [@faker-js/faker](https://fakerjs.dev/) | MIT | Person name pools (precompiled at build time) |
| [Unicode CLDR](https://cldr.unicode.org/) | Unicode License v3 | Country, language and currency display names |

The generated data is stored in git so builds are reproducible without network
access. To refresh it: `npm run data`.

## Adding a country

1. Add an entry to `COUNTRIES` in `src/lib/registry.ts`. The `id.format` field
   is documentation; the actual generator goes in `src/lib/generator/identifiers.ts`.
2. Add the country to `TUNING` and `POSTAL_STYLE` in `scripts/build-data.mjs`.
3. Add its faker locale chain to `LOCALE_MAP` in `scripts/build-names.mjs`.
4. Run `npm run data`.
5. Run `npm run check`. The routing and sitemap update automatically.

`scripts/check-repo.mjs` fails if the registry, country data, name pools and
index fall out of sync, so a half-finished addition cannot be committed.

## Disclaimers

All generated data is synthetic and does not correspond to any real person,
address, phone number or account. It is intended for software testing, form
demonstration and data seeding. See `/terms/` for the permitted and prohibited
uses.

## Licence

MIT for the source code. Bundled data remains under its own licence as listed
above.
