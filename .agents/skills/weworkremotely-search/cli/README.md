# weworkremotely-cli

CLI for searching remote jobs on **We Work Remotely** (weworkremotely.com) — the global
remote market, strongest for programming roles.

**Data source**: WWR public RSS feeds (`/remote-jobs.rss` and `/categories/remote-*-jobs.rss`).
**Authentication**: None required.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only pulls dev type defs.

> **Personal use only.** WWR's HTML search blocks automated clients (403); the RSS feeds
> are the sanctioned syndication surface, but still keep volume low, don't use this
> commercially or for bulk data collection, and run it on your own responsibility.

## Installation

```bash
cd .agents/skills/weworkremotely-search/cli
bun install   # optional — only installs TypeScript dev types
```

The CLI runs without any install because it has zero runtime dependencies.

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search remote job listings (merged programming feeds by default) |
| `detail` | Fetch full detail for a single listing (from the RSS description) |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts `--format json|plain`.
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Quick examples

```bash
# Node.js roles, last 14 days
bun run src/cli.ts search -q "node" --jobage 14 --format table

# TypeScript roles, back-end feed only
bun run src/cli.ts search -q typescript --category back-end

# Roles open to candidates in the Dominican Republic
bun run src/cli.ts search -q react --region "Dominican" --format table

# Full detail for one job (id = URL slug from search results)
bun run src/cli.ts detail lemon-io-senior-react-full-stack-developer-5 --format plain
```

See `../SKILL.md` for the full flag reference, category-key table, and the personal-use note.

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--query` | `-q` | Keywords, matched client-side against title, skills, category, and description. Recommended. |
| `--category` | | One of `all`, `programming`, `full-stack`, `back-end`, `front-end`, `devops-sysadmin`. Default: the five programming feeds merged. |
| `--region` | | Substring match on region/country, e.g. `"Anywhere"`, `"Dominican"`, `"USA"`. |
| `--jobage` | | Posted within N days (client-side on pubDate). |
| `--page` | | 1-indexed page (10 results/page, client-side). |
| `--limit` | `-n` | Cap results emitted. |
| `--format` | | `json` \| `table` \| `plain`. |
