# Get on Board URL Reference

Maintainer notes for when the portal changes. Verified live 2026-07-09.

## Search endpoint (public JSON API)

```
GET https://www.getonbrd.com/api/v0/search/jobs
```

**The versioned path is `/api/v0/` — NOT `/api/v2/` (v2 404s).**

### Query parameters

| Parameter | Description | Examples / notes |
|-----------|-------------|------------------|
| `query` | Keyword search (title, skill, role) | `query=node.js` |
| `per_page` | Results per page, max 120 | CLI uses `per_page=20` |
| `page` | Page number, 1-indexed | `page=2` |
| `remote` | `true` = fully remote only; `false` = hybrid + onsite | No server-side way to split hybrid vs onsite — filter `attributes.remote_modality` client-side (`hybrid` / `no_remote`) |
| `country_code` | ISO 3166-1 **alpha-2** code only | `CL`, `DO`, `MX`, `CO` — alpha-3 gets a 422 `"Country code should be an ISO 3166-1 alpha-2 code"`. The CLI's `--country` flag takes alpha-3 (per repo convention) and converts via `ISO3_TO_ISO2` in `cli/src/helpers.ts` |
| `lang` | Posting language | `en`, `es`, `pt` |
| `expand` | JSON array syntax, MUST be URL-encoded | `expand=%5B%22company%22%5D` (i.e. `["company"]`) — required for company names |

There is **no posting-age parameter** — `--jobage` is implemented client-side on
`attributes.published_at` (unix epoch seconds).

### Response structure

```json
{
  "data": [
    {
      "id": "<slug>",
      "type": "job",
      "attributes": { ... },
      "links": { "public_url": "https://www.getonbrd.com/jobs/<slug>" }
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total_pages": 82 }
}
```

Key `attributes`:

| Key | Notes |
|-----|-------|
| `title` | Plain text |
| `description_headline`, `functions_headline`, `benefits_headline`, `desirable_headline` | Section headings (short text) |
| `description`, `projects`, `functions`, `benefits`, `desirable` | Full HTML — big; the CLI keeps them out of search output |
| `remote` | Boolean |
| `remote_modality` | Observed values: `fully_remote`, `remote_local` (remote restricted to a zone/country), `hybrid`, `no_remote` |
| `remote_zone` | May be null |
| `countries` | Array of strings, e.g. `["Remote"]`, `["Chile"]` |
| `location_cities`, `location_regions` | Arrays; fallback location info |
| `lang` | `en` / `es` / `pt` |
| `category_name` | e.g. `Programming`, `Mobile Development` |
| `perks` | Array of strings |
| `min_salary`, `max_salary` | USD/month; may be null |
| `published_at` | Unix epoch **seconds** |
| `applications_count` | Number |
| `seniority` | `{ "data": { "id": N } }` — see seniority ids below |
| `company` | `{ "data": { "id", "type", "attributes": { "name", ... } } }` **only with** `expand=["company"]`; otherwise just an id |

### Seniority ids (from public `GET /api/v0/seniorities`, verified 2026-07-09)

| id | name |
|----|------|
| 1 | Sin experiencia (no experience required) |
| 2 | Junior |
| 3 | Semi Senior |
| 4 | Senior |
| 5 | Expert |

Hardcoded in `cli/src/helpers.ts` as `SENIORITY_LABELS` — re-verify against the
endpoint if outputs look wrong.

## Detail (public HTML page + microdata)

`GET /api/v0/jobs/{id}` returns **401 (auth required)** — do not use it.

Instead fetch the job's public page:

```
GET https://www.getonbrd.com/jobs/<slug>
  → 301 → https://www.getonbrd.com/jobs/<category>/<slug>  → 200
```

Follow redirects. Both URL forms (and the bare slug) are accepted by the CLI's
`detail` command.

### schema.org microdata anchors in the page

| itemprop | Element observed | Extraction |
|----------|------------------|------------|
| `title` | `<span itemprop="title">…</span>` | Inner text |
| `hiringOrganization` | `<div itemprop="hiringOrganization" itemscope>` | Block; company name is the `itemprop="name"` **inside** it (the page has other `itemprop="name"` elements, e.g. breadcrumbs — must scope to the block) |
| `datePosted` | `<time datetime="2026-07-08T16:48:20+00:00" itemprop="datePosted">` | `datetime` attribute (element body is empty) |
| `description` | `<div id="job-body" itemprop="description">` | Deeply nested — needs balanced-tag scanning, not a lazy regex; contains the full body incl. functions/desirable/benefits |
| `qualifications` | `<span itemprop="qualifications"> Semi Senior </span>` | Seniority text |
| `skills` | `<div class="gb-tags" itemprop="skills">` | Tag cloud of `<a>` elements; extract anchor texts |
| `employmentType` | `<span class="hide" itemprop="employmentType">FULL_TIME</span>` | Inner text |
| `baseSalary` | `<span itemprop="baseSalary" itemscope>` | Nested `minValue`/`maxValue`/`unitText`/`currency` carried in `content=""` attributes of empty `<span>`s |
| `jobLocation` / `address` | Nested spans | Inner text, e.g. `Remote` or a city |

## robots / usage policy

Cloudflare content signals on robots.txt: `search=yes`, `ai-train=no`. Search access
is allowed; keep request volume low, personal use only, no bulk/commercial scraping.
