---
name: weworkremotely-search
version: 1.0.0
description: >
  Use this skill whenever the user wants to search We Work Remotely (WWR) for
  remote jobs in the global remote market — fully remote positions, work from
  anywhere, or remote roles restricted to a region/country. Strongest for
  programming roles (full-stack, back-end, front-end, DevOps) but the all-jobs
  feed covers design, product, marketing, support, and more. Trigger phrases:
  remote jobs, work from anywhere, WWR, We Work Remotely, remote programming
  jobs, remote developer jobs, trabajos remotos, "remote jobs I can do from
  <country>".
context: fork
allowed-tools: Bash(bun run .agents/skills/weworkremotely-search/cli/src/cli.ts *)
---

# We Work Remotely Search Skill

Search live remote-job listings from **We Work Remotely** (weworkremotely.com), one of
the largest remote-only job boards. Global market: every listing is remote, with a
`region` field ("Anywhere in the World", "USA Only", etc.) and often an explicit country
allowlist. No authentication, no API key, and **zero runtime dependencies** — it runs
with just `bun`.

Data comes from WWR's public **RSS feeds** (the HTML search page returns 403 to
non-browser clients, so RSS is the only surface used). All filtering — keywords, region,
job age — happens client-side over the merged feeds.

## ⚠️ Personal use only

This reads We Work Remotely's public RSS feeds — the sanctioned syndication surface
(their HTML search actively blocks automated clients). Even so, **keep volume low and
don't use it commercially or for bulk data collection.** Run it on your own responsibility.

## When to use this skill

- Search for remote job openings (worldwide or filtered to a region/country)
- Filter by recency (posted in the last N days) or by category feed
- Get the full description of a specific WWR listing

## Category keys

`--category <key>` restricts the search to a single feed. Without it, the five
programming-related feeds are merged (deduplicated by job URL).

| Key | Feed |
|-----|------|
| `all` | All jobs, every category (~100 most recent listings) |
| `programming` | General Programming |
| `full-stack` | Full-Stack Programming |
| `back-end` | Back-End Programming |
| `front-end` | Front-End Programming |
| `devops-sysadmin` | DevOps and Sysadmin |

## Commands

### Search job listings

```bash
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search [flags]
```

Key flags:
- `--query <text>` / `-q <text>` — keywords, matched client-side against title, skills, category, and full description. Recommended.
- `--category <key>` — restrict to one feed (see table above). Default: the five programming feeds merged.
- `--region <substr>` — substring match on the region/country fields, e.g. `--region "Anywhere"`, `--region "Dominican"`, `--region "USA"`.
- `--jobage <days>` — posted within N days (client-side on the feed's pubDate).
- `--page <n>` — page number (1-indexed, 10 results per page, client-side).
- `--limit <n>` / `-n <n>` — cap total results emitted (client-side).
- `--format json|table|plain` — default `json`.

### Fetch full job detail

```bash
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts detail <id|url> [--format json|plain]
```

`id` is the job slug from `search` results (e.g.
`lemon-io-senior-react-full-stack-developer-5`). You may also pass a full
`https://weworkremotely.com/remote-jobs/<slug>` URL. The full description comes from the
RSS feed itself (the job HTML page may 403), so only listings still present in the
current feeds can be detailed.

## Usage examples

```bash
# Node.js roles posted in the last 14 days, across all programming feeds
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search -q "node" --jobage 14 --format table

# TypeScript roles in the back-end feed only
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search -q typescript --category back-end

# Anything hireable from anywhere in the world
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search --region "Anywhere" --format table

# React roles open to candidates in the Dominican Republic
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search -q react --region "Dominican" --format table

# Non-programming roles via the all-jobs feed
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts search -q designer --category all --format table

# Full details for a specific job
bun run .agents/skills/weworkremotely-search/cli/src/cli.ts detail lemon-io-senior-react-full-stack-developer-5 --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing slugs to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors are written to **stderr** as `{ "error": "...", "code": "..." }` and the process exits with code `1`.

## Notes

- WWR's HTML search endpoint returns **403** to non-browser clients — this CLI is
  **RSS-only** and never fetches job HTML pages. Full descriptions ship inside the RSS
  `<description>` element, so nothing is lost.
- Job IDs are URL slugs (e.g. `lemon-io-senior-react-full-stack-developer-5`) — pass
  them as-is to `detail`.
- Feeds only carry recent listings (~14–100 items each); an older job that has aged out
  of the feeds cannot be searched or detailed.
- Results include extras beyond the core fields: `category`, `type` (Full-Time etc.),
  `skills`, and `countries` (the per-listing country allowlist, emoji flags stripped —
  useful to confirm a listing is open to your country).
- The `programming` feed omits `skills`/`type`/`countries` on its items; those fields
  come back `null` there.
- WWR may rate-limit; the CLI retries 429/5xx with exponential backoff and skips
  missing feeds gracefully. Keep volume low (see the personal-use note above).
