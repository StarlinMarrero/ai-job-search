# remoteok-cli

CLI for searching remote jobs on Remote OK (remoteok.com) — the **global remote
market**, every sector, every region. Every listing is fully remote; a per-job
`location` field narrows the hiring region (e.g. `Worldwide`, `North America`).

**Data source**: Remote OK public JSON API (`https://remoteok.com/api`) — one array,
fetched once per invocation, filtered client-side.
**Authentication**: None required.
**Dependencies**: None (plain `bun` + `fetch`). `bun install` is optional and only pulls dev type defs.

> **Personal use only.** Remote OK's API terms require linking back to the job's
> Remote OK URL and mentioning Remote OK as the source when sharing listings, and
> forbid use of the Remote OK logo. Keep volume low, don't use it commercially or
> for bulk data collection, and run it on your own responsibility.

## Installation

```bash
cd .agents/skills/remoteok-search/cli
bun install   # optional — only installs TypeScript dev types
```

The CLI runs without any install because it has zero runtime dependencies.

## Commands

| Command | Description |
|---------|-------------|
| `search` | Search the current listing set (all filters client-side) |
| `detail` | Full detail for a single listing, by id, slug, or URL |

`search` accepts `--format json|table|plain` (default `json`); `detail` accepts `--format json|plain`.
All errors are written to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Quick examples

```bash
# Node.js roles from the last two weeks
bun run src/cli.ts search -q "node.js" --jobage 14 --format table

# TypeScript roles hireable worldwide
bun run src/cli.ts search -q typescript --location Worldwide --format table

# Everything tagged golang
bun run src/cli.ts search --tag golang --format table

# Full detail for one job
bun run src/cli.ts detail 1134608 --format plain
```

See `../SKILL.md` for the full flag reference and the Terms-of-Service note, and
`../url-reference.md` for API structure and quirks (legal-notice element `[0]`,
mojibake fix, salary `0` sentinel).

## Search flags

| Flag | Alias | Description |
|------|-------|-------------|
| `--query` | `-q` | Keywords, matched against position, company, tags, location. Recommended. |
| `--deep` | | Also match `--query` against the full description (noisier). |
| `--tag` | | Exact tag match, e.g. `golang`, `react`, `senior`. |
| `--location` | | Substring filter on hiring region (`Worldwide`, `"North America"`). |
| `--jobage` | | Posted within N days (client-side epoch filter). |
| `--page` | | 1-indexed page (10 results/page, client-side slicing). |
| `--limit` | `-n` | Cap results emitted. |
| `--format` | | `json` \| `table` \| `plain`. |
