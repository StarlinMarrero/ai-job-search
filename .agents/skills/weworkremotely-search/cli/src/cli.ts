#!/usr/bin/env bun
// Self-contained CLI for searching remote jobs on We Work Remotely via its
// public RSS feeds. No external CLI framework, so it runs anywhere `bun` is
// available with zero install beyond the repo clone.
//
// Personal use only. WWR's HTML search blocks automated clients (403); RSS is
// the sanctioned read surface, but still keep volume low and do not use this
// commercially or for bulk data collection. Run it on your own responsibility.

import { FEEDS } from "./helpers.js"
import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", n: "limit" }
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

const ALLOWED_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "category", "region", "jobage", "page", "limit", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

function rejectUnknownFlags(cmd: string, flags: Flags): boolean {
  const allowed = ALLOWED_FLAGS[cmd]
  if (!allowed) return true
  for (const key of Object.keys(flags)) {
    if (key === "_") continue
    if (!allowed.has(key)) {
      process.stderr.write(JSON.stringify({ error: `Unknown flag "--${key}" for ${cmd}`, code: "BAD_FLAG" }) + "\n")
      return false
    }
  }
  return true
}

const CATEGORY_KEYS = Object.keys(FEEDS).join(" | ")

const HELP = `weworkremotely-cli — search remote jobs on We Work Remotely (RSS-based)

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Keywords, matched client-side against title, skills,
                          category, and description. Recommended.
  --category <key>        Restrict to one feed: ${CATEGORY_KEYS}.
                          Default: all five programming-related feeds merged.
  --region <substr>       Substring match on the region/country fields,
                          e.g. "Anywhere", "Dominican", "USA", "Europe".
  --jobage <days>         Posted within N days (client-side on pubDate).
  --page <n>              1-indexed page (10 results/page). Default 1.
  --limit, -n <n>         Cap results emitted (client-side).
  --format <fmt>          json (default) | table | plain.

DETAIL
  <id|url>                Job slug from search results (e.g.
                          "lemon-io-senior-react-full-stack-developer-5") or a
                          full https://weworkremotely.com/remote-jobs/... URL.

EXAMPLES
  bun run src/cli.ts search -q "node" --jobage 14 --format table
  bun run src/cli.ts search -q typescript --category back-end
  bun run src/cli.ts search --region "Anywhere" --format table
  bun run src/cli.ts search -q react --region "Dominican" --format table
  bun run src/cli.ts detail lemon-io-senior-react-full-stack-developer-5 --format plain

Personal use only — WWR's HTML search blocks bots (403); this uses the public
RSS feeds. Keep volume low, no bulk or commercial use.
`

async function main(): Promise<number> {
  const argv = process.argv.slice(2)
  const flags = parseFlags(argv)
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  if (cmd === "search") {
    if (!rejectUnknownFlags(cmd, flags)) return 1
    const fmt = (flags.format as string) || "json"
    if (!["json", "table", "plain"].includes(fmt)) {
      process.stderr.write(JSON.stringify({ error: `--format must be json, table, or plain (got "${fmt}")`, code: "BAD_ARG" }) + "\n")
      return 1
    }

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

    let category: string | undefined
    if (flags.category !== undefined) {
      if (typeof flags.category !== "string" || !(flags.category in FEEDS)) {
        process.stderr.write(
          JSON.stringify({
            error: `--category must be one of: ${Object.keys(FEEDS).join(", ")} (got "${flags.category === true ? "" : flags.category}")`,
            code: "BAD_CATEGORY",
          }) + "\n",
        )
        return 1
      }
      category = flags.category
    }

    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : 9999,
      category,
      region: typeof flags.region === "string" ? flags.region : undefined,
      page: flags.page ? Math.max(1, parseInt(flags.page as string, 10)) : 1,
      limit: flags.limit ? parseInt(flags.limit as string, 10) : undefined,
      format: (["json", "table", "plain"].includes(fmt) ? fmt : "json") as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    if (!rejectUnknownFlags(cmd, flags)) return 1
    const id = (flags._ as string[])[1]
    if (!id) {
      process.stderr.write(JSON.stringify({ error: "detail requires an <id|url>", code: "NO_ID" }) + "\n")
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
