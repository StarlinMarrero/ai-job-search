---
name: getonbrd-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for tech jobs on Get on Board
  (getonbrd.com), the leading LATAM tech job board — startup and tech roles across
  Latin America (Chile, Mexico, Colombia, Peru, Argentina, Dominican Republic, and
  more) plus fully remote positions. Invoke for programming, data, design, product,
  and DevOps openings in the LATAM market or remote. Trigger phrases (English and
  Spanish): Get on Board, getonbrd, LATAM jobs, jobs in Latin America, remote tech
  jobs LATAM, "empleos", "trabajos remotos", "vacantes", "busco trabajo",
  "ofertas de empleo LATAM", "empleos de tecnología", "trabajo remoto".
context: fork
allowed-tools: Bash(bun run .agents/skills/getonbrd-search/cli/src/cli.ts *)
---

# Get on Board Search Skill

Search live job listings from **Get on Board** (getonbrd.com), the leading tech job
board for **Latin America** — startup and tech roles across Chile, Mexico, Colombia,
Peru, Argentina, the Dominican Republic and the rest of LATAM, plus a large pool of
**fully remote** positions (many hiring worldwide). No authentication, no API key, and
**zero runtime dependencies** — it runs with just `bun`.

Postings are in Spanish, English, or Portuguese (filterable via `--lang`). Salaries,
when published, are in **USD per month**.

## ⚠️ Personal use only

This uses Get on Board's public search API and public job pages. Their robots policy
allows search access (Cloudflare content signals: `search=yes`, `ai-train=no`), but
**keep volume low and don't use it commercially or for bulk data collection.**
Run it on your own responsibility.

## When to use this skill

- Search LATAM tech job openings by keyword, country, language, or recency
- Find fully remote tech roles posted on Get on Board
- Get the full description of a specific Get on Board job listing

## Commands

### Search job listings

```bash
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keyword search (title, skill, role). Recommended.
- `--jobage <days>` — posted within N days. **Client-side filter** (the API has no posting-age parameter), so it filters the current page only.
- `--remote <mode>` — `remote`, `hybrid`, or `onsite`. `remote` maps to the API's `remote=true`; `hybrid` and `onsite` both map to `remote=false` server-side and are then told apart **client-side** via each job's `remote_modality` (`hybrid` / `no_remote`).
- `--country <ISO3>` — ISO3 country code, e.g. `DOM` (Dominican Republic), `CHL` (Chile), `MEX` (Mexico), `COL` (Colombia).
- `--lang <code>` — posting language: `en`, `es`, or `pt`.
- `--page <n>` — page number (1-indexed, 20 results per page).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

Search results carry a short headline only; the full description comes from `detail`.

### Fetch full job detail

```bash
bun run .agents/skills/getonbrd-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the job slug from `search` results (e.g. `senior-backend-developer-acme-remote`).
You may also pass the full public URL (`https://www.getonbrd.com/jobs/<slug>`) or the
redirected category form (`https://www.getonbrd.com/jobs/<category>/<slug>`). Returns
the full description, company, seniority, employment type, skills tags, and salary
range when published.

## Usage examples

```bash
# Remote Node.js roles (Starlin's core stack)
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search -q "node.js" --remote remote --format table

# Full-stack TypeScript roles in the Dominican Republic
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search -q "fullstack typescript" --country DOM --format table

# React roles posted in the last 14 days
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search -q "react" --jobage 14 --format table

# English-language remote backend roles, second page
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search -q "backend" --remote remote --lang en --page 2

# NestJS roles anywhere in LATAM, capped at 10
bun run .agents/skills/getonbrd-search/cli/src/cli.ts search -q "nestjs" --limit 10

# Full details for a specific job (slug from search results)
bun run .agents/skills/getonbrd-search/cli/src/cli.ts detail senior-backend-developer-acme-remote --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing slugs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- The versioned API path is **`/api/v0/`** — not `/api/v2/` (v2 returns 404).
- `--country` takes ISO3 codes (e.g. `DOM`), but the API's `country_code` parameter only accepts ISO 3166-1 **alpha-2** — the CLI converts internally (`DOM` → `DO`).
- The search API needs `expand=["company"]` (URL-encoded as `expand=%5B%22company%22%5D`) to include company names; the CLI always sends it.
- There is **no server-side posting-age parameter** — `--jobage` filters the fetched page client-side on `published_at`.
- The JSON detail endpoint (`/api/v0/jobs/{id}`) requires authentication (401), so `detail` fetches the job's **public HTML page** and parses its schema.org microdata instead. The public URL 301-redirects to a category-prefixed URL; the CLI follows it.
- Job IDs are slugs (e.g. `senior-backend-developer-acme-remote`) — pass them as-is to `detail`.
- Page size is 20 results per page. Salaries are USD/month and often absent (`null`).
- Get on Board may rate-limit; the CLI retries 429/5xx with exponential backoff. Keep volume low (see personal-use note above).
