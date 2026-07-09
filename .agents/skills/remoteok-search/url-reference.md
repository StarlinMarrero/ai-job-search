# Remote OK API Reference

Complete reference for the Remote OK public JSON API used by this skill.

## Endpoint

```
GET https://remoteok.com/api
```

- No authentication, no API key.
- Returns a single JSON array with the **full current set of recent listings**
  (typically a few hundred jobs spanning the last days/weeks).
- There is **no reliable server-side query, filter, or pagination parameter** —
  fetch once, filter client-side.
- Send a browser `User-Agent`; retry 429/5xx with exponential backoff.

## Response structure

### Element `[0]` — legal notice (ALWAYS skip)

```json
{
  "last_updated": 1783524618,
  "legal": "API Terms of Service: Please link back (with follow, and without nofollow!) to the URL on Remote OK and mention Remote OK as a source ... Please don't use the Remote OK logo without written permission ..."
}
```

It has no `id`/`position`; the CLI drops it during normalization.

### Elements `[1..]` — job objects

| Key | Type | Notes |
|-----|------|-------|
| `id` | string | Numeric string, e.g. `"1134608"` |
| `slug` | string | e.g. `remote-backend-engineer-acme-1134608` (ends with `-<id>`) |
| `epoch` | number | Unix seconds when posted — use for `--jobage` |
| `date` | string | ISO 8601 with offset, e.g. `2026-07-08T15:30:18+00:00` |
| `company` | string | Company name (may contain HTML entities) |
| `company_logo` / `logo` | string | Logo URLs — **do not use** (ToS forbids logo use) |
| `position` | string | Job title (may contain HTML entities like `&amp;`) |
| `tags` | string[] | Lowercase tags, e.g. `["golang", "senior"]` — sometimes missing/empty |
| `description` | string | Full job description as **HTML** |
| `location` | string | Hiring region, e.g. `Worldwide`, `North America` — sometimes missing/empty, sometimes with a dangling separator (`"Athens, "`) |
| `salary_min` / `salary_max` | number | USD/year; `0` means **not specified** |
| `url` | string | `https://remoteOK.com/remote-jobs/<slug>` (note the mixed-case host) |
| `apply_url` | string | External ATS link, or same as `url` |

Any field may be missing or empty on a given job — normalize to `null`.

## Quirks (read before touching the parser)

1. **Mojibake**: strings (descriptions, locations, sometimes company names) can
   contain UTF-8 bytes mis-decoded as Latin-1 — `â€™` instead of `’`, `SÃ£o Paulo`
   instead of `São Paulo`. All offending code points sit in U+0080–U+00FF. Fix:
   if a string matches `/[\u00C2-\u00F4][\u0080-\u00BF]/` and contains **no** code
   point above U+00FF, re-encode as Latin-1 bytes and decode as UTF-8
   (`Buffer.from(s, "latin1").toString("utf8")`); fall back to the original on any
   replacement character (U+FFFD). See `fixMojibake()` in `cli/src/helpers.ts`.
2. **HTML entities in short fields**: `position` can contain `&amp;` etc. — decode
   entities in title/company/location/tags, not just descriptions.
3. **Salary sentinel**: `salary_min`/`salary_max` are `0` when unspecified — the
   CLI emits `null` for those.
4. **Listing churn**: only recent jobs are in the array; IDs age out. `detail` on
   an old ID is a legitimate `NOT_FOUND`, not a bug.
5. **`detail` has no separate endpoint**: refetch `/api` once per invocation and
   look up by `id`, `slug`, or URL (extract the slug from
   `remoteok.com/remote-jobs/<slug>`; a bare numeric ref also matches a slug
   suffix `-<id>`).
6. **Content mix**: the board is global and cross-sector; tags are the most
   reliable signal for tech-stack searches (`--tag golang` beats `-q golang`
   when marketing roles are tagged with stack names).

## Terms of Service (from element `[0]`)

- **Link back** (follow, not nofollow) to the job's Remote OK URL and **mention
  Remote OK as the source** wherever the data is shown.
- **No logo use** without written permission.
- Violations get API access suspended. Keep request volume low; personal use only.

## robots / crawling posture

`robots.txt` allows this access pattern (Cloudflare content-signals: `search=yes`,
`ai-train=no`). Respect it: no training-data harvesting, no bulk collection.

## Examples

```bash
# One fetch, all filtering local:
curl -s -A "Mozilla/5.0 ..." https://remoteok.com/api | jq '.[1] | {id, position, company, location, epoch}'
```

Job page URL pattern:

```
https://remoteok.com/remote-jobs/<slug>
```
