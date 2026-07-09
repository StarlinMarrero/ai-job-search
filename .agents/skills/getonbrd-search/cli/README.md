# getonbrd-cli

CLI for searching tech jobs on **Get on Board** (getonbrd.com), the leading LATAM
tech job board — startup and tech roles across Latin America, plus fully remote positions.

**Data source**: Get on Board public search API (`/api/v0/search/jobs`) for `search`;
public job pages (schema.org microdata) for `detail` — the JSON detail endpoint requires auth.
**Authentication**: None required.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only pulls dev type defs.

> **Personal use only.** This uses Get on Board's public search API and pages. Keep
> volume low, don't use it commercially or for bulk data collection, and run it on
> your own responsibility.

## Installation

```bash
cd .agents/skills/getonbrd-search/cli
bun install   # optional — only installs TypeScript dev types
```

The CLI runs without any install because it has zero runtime dependencies.

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search for job listings |
| `detail` | Fetch full detail for a single job listing (by slug or URL) |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts `--format json|plain`.
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Quick examples

```bash
# Remote Node.js roles
bun run src/cli.ts search -q "node.js" --remote remote --format table

# Full-stack TypeScript in the Dominican Republic
bun run src/cli.ts search -q "fullstack typescript" --country DOM --format table

# React roles from the last 14 days
bun run src/cli.ts search -q "react" --jobage 14 --limit 10

# Full detail for one job (slug from search results)
bun run src/cli.ts detail senior-backend-developer-acme-remote --format plain
```

See `../SKILL.md` for the full flag reference and the personal-use note.

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--query` | `-q` | Keywords (title / skill / role). Recommended. |
| `--jobage` | | Posted within N days. Client-side filter (API has no age param). |
| `--remote` | | `remote` \| `hybrid` \| `onsite`. `remote` → API `remote=true`; `hybrid`/`onsite` → API `remote=false` + client-side `remote_modality` filter. |
| `--country` | | ISO3 country code, e.g. `DOM`, `CHL`, `MEX`, `COL` (converted to the alpha-2 code the API requires). |
| `--lang` | | Posting language: `en` \| `es` \| `pt`. |
| `--page` | | 1-indexed page (20 results/page). |
| `--limit` | `-n` | Cap results emitted. |
| `--format` | | `json` \| `table` \| `plain`. |

## Portal quirks

- API version path is `/api/v0/` (not `/api/v2/`, which 404s).
- `expand=["company"]` must be sent (URL-encoded) or company names are absent.
- Job detail comes from the public HTML page's schema.org microdata (the JSON
  detail endpoint returns 401); public URLs 301-redirect to a category form.
- Job IDs are slugs, salaries are USD/month (often null).
