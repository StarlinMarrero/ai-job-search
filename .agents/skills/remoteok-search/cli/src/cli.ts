#!/usr/bin/env bun
// Self-contained CLI for searching remote jobs on Remote OK's public JSON API
// (https://remoteok.com/api). No external CLI framework, so it runs anywhere
// `bun` is available with zero install beyond the repo clone.
//
// Personal use only. Remote OK's API terms require linking back to the job's
// Remote OK URL and mentioning Remote OK as the source when sharing listings,
// and forbid use of the Remote OK logo. Keep volume low and do not use this
// commercially or for bulk data collection. Run it on your own responsibility.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", l: "location", n: "limit" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("--") || a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `remoteok-cli — search remote jobs on Remote OK (remoteok.com, global)

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <id|url|slug> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Keywords, matched case-insensitively against title,
                          company, tags, and location. Recommended.
  --deep                  Also match --query against the full job description.
  --tag <tag>             Exact tag match, e.g. golang, react, senior.
  --location <text>       Substring filter on the job's location field
                          (e.g. Worldwide, "North America"). All jobs are remote.
  --jobage <days>         Posted within N days (client-side epoch filter).
  --page <n>              1-indexed page (10 results/page, client-side). Default 1.
  --limit, -n <n>         Cap results emitted (client-side).
  --format <fmt>          json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "node.js" --jobage 14 --format table
  bun run src/cli.ts search -q typescript --location Worldwide --format table
  bun run src/cli.ts search --tag golang --format table
  bun run src/cli.ts detail 1134608 --format plain

Personal use only — Remote OK's API terms require attribution (link back and
mention Remote OK as source). Keep volume low.
`

const SEARCH_FLAGS = new Set([
  "query",
  "deep",
  "tag",
  "location",
  "jobage",
  "page",
  "limit",
  "format",
  "help",
  "h",
])
const DETAIL_FLAGS = new Set(["format", "help", "h"])

/** Reject unknown flags so typos fail loudly instead of being ignored. */
function rejectUnknownFlags(flags: Flags, known: Set<string>): boolean {
  for (const key of Object.keys(flags)) {
    if (key === "_") continue
    if (!known.has(key)) {
      process.stderr.write(JSON.stringify({ error: `Unknown flag "--${key}"`, code: "BAD_FLAG" }) + "\n")
      return false
    }
  }
  return true
}

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  if (cmd === "search") {
    if (!rejectUnknownFlags(flags, SEARCH_FLAGS)) return 1
    const fmt = (flags.format as string) || "json"

    const parseIntFlag = (name: string, raw: string | boolean | string[]): number | null => {
      const val = parseInt(raw as string, 10)
      if (isNaN(val)) {
        process.stderr.write(JSON.stringify({ error: `--${name} must be a number, got "${raw}"`, code: "BAD_ARG" }) + "\n")
        return null
      }
      return val
    }

    if (flags.jobage !== undefined) {
      const v = parseIntFlag("jobage", flags.jobage)
      if (v === null) return 1
      flags.jobage = String(v)
    }
    if (flags.page !== undefined) {
      const v = parseIntFlag("page", flags.page)
      if (v === null) return 1
      flags.page = String(v)
    }
    if (flags.limit !== undefined) {
      const v = parseIntFlag("limit", flags.limit)
      if (v === null) return 1
      flags.limit = String(v)
    }

    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      tag: typeof flags.tag === "string" ? flags.tag : undefined,
      location: typeof flags.location === "string" ? flags.location : undefined,
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : 9999,
      page: flags.page ? Math.max(1, parseInt(flags.page as string, 10)) : 1,
      limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
      deep: flags.deep === true,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    if (!rejectUnknownFlags(flags, DETAIL_FLAGS)) return 1
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(JSON.stringify({ error: "detail requires an <id|url|slug>", code: "NO_ID" }) + "\n")
      return 1
    }
    const fmt = (flags.format as string) || "json"
    const opts: DetailOpts = {
      id,
      format: (fmt === "plain" ? "plain" : "json") as DetailOpts["format"],
    }
    return runDetail(opts)
  }

  process.stderr.write(JSON.stringify({ error: `Unknown command "${cmd}"`, code: "BAD_CMD" }) + "\n")
  return 1
}

main().then((code) => process.exit(code))
