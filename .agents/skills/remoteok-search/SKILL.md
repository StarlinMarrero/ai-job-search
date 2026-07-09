---
name: remoteok-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search for remote jobs on Remote OK
  (remoteok.com), the global remote-jobs board — fully remote positions across
  every sector and region (software, design, marketing, ops, etc.), workable
  from anywhere. Invoke for remote openings, work-from-anywhere roles, and
  looking up a specific Remote OK listing. Trigger phrases: remote jobs, remote
  work, work from anywhere, remote developer jobs, trabajos remotos, remote
  openings, "jobs I can do from home", look up this Remote OK posting.
context: fork
allowed-tools: Bash(bun run .agents/skills/remoteok-search/cli/src/cli.ts *)
---

# Remote OK Search Skill

Search live remote-job listings from Remote OK's public JSON API
(`https://remoteok.com/api`) — the **global remote market**, every sector, every
region. No authentication, no API key, and **zero runtime dependencies** — it runs
with just `bun`. Every listing on Remote OK is remote by definition; a per-job
`location` field narrows the allowed hiring region (e.g. `Worldwide`,
`North America`, `Europe`).

## ⚠️ Personal use only

This uses Remote OK's public API. Its Terms of Service (returned as the first
element of every API response) require that you **link back to the job's Remote OK
URL and mention Remote OK as the source** whenever you share job data, and forbid
using the Remote OK logo. So:

- **Keep volume low** — one API fetch per CLI invocation; no bulk or commercial use,
  no scraping loops.
- **Attribute** — when presenting jobs to the user or putting them in documents,
  include the job's `url` (a remoteok.com link) and mention Remote OK as the source.
- Run it on your own responsibility.

## When to use this skill

- Search for fully remote job openings (any sector, worldwide or region-locked)
- Filter by recency, tag (e.g. `golang`, `react`), or hiring region
- Get the full description of a specific Remote OK listing

## Commands

### Search job listings

```bash
bun run .agents/skills/remoteok-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords, matched case-insensitively against
  **position, company, tags, and location**. Recommended.
- `--deep` — also match `--query` against the full job description (noisier).
- `--tag <tag>` — exact tag match (e.g. `golang`, `react`, `senior`).
- `--location <substr>` — substring filter on the job's hiring-region field
  (e.g. `Worldwide`, `"North America"`). All jobs are remote regardless.
- `--jobage <days>` — posted within N days (client-side epoch filter).
- `--page <n>` — page number (1-indexed, 10 results per page, sliced client-side).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/remoteok-search/cli/src/cli.ts detail <id|url|slug> [--format json|plain]
```

`id` is the numeric job ID from `search` results (e.g. `1134608`). You may also pass
the full `https://remoteok.com/remote-jobs/<slug>` URL or the bare slug. Returns the
full description (HTML stripped, entities decoded), tags, salary range, and apply link.

## Usage examples

```bash
# Node.js roles posted in the last 14 days
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q "node.js" --jobage 14 --format table

# TypeScript roles hireable from anywhere in the world
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q typescript --location Worldwide --format table

# Everything tagged golang
bun run .agents/skills/remoteok-search/cli/src/cli.ts search --tag golang --format table

# Backend roles, matching the full description too
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q backend --deep --jobage 7 --format table

# Second page of engineer results
bun run .agents/skills/remoteok-search/cli/src/cli.ts search -q engineer --page 2 --format table

# Full details for a specific job
bun run .agents/skills/remoteok-search/cli/src/cli.ts detail 1134608 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing IDs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- **Single-array API**: `GET https://remoteok.com/api` returns one JSON array with
  the full current set of recent listings (a few hundred). Element `[0]` is a
  legal-notice object (`{ last_updated, legal }`), always skipped by the CLI.
- **All filtering is client-side**: there is no reliable server-side query or page
  parameter, so `--query`, `--tag`, `--location`, `--jobage`, `--page`, and
  `--limit` are all applied after one fetch. `detail` refetches the same array and
  looks the job up by id/slug/url.
- **Only recent listings exist**: older jobs age out of the array — a `detail` on an
  expired ID returns `NOT_FOUND`.
- **Mojibake fix**: the API sometimes serves UTF-8 text mis-decoded as Latin-1
  (`â€™`, `SÃ£o Paulo`). The CLI re-decodes these defensively, so output text is clean.
- Missing fields are normalized to `null` (never omitted); `salary_min`/`salary_max`
  of `0` mean "not specified" and become `null`.
- Rate limits are retried (429/5xx, exponential backoff). Keep volume low (see ToS note above).
