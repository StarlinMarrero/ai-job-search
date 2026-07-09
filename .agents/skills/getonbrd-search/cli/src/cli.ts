#!/usr/bin/env bun
// Self-contained CLI for searching jobs on Get on Board (getonbrd.com), the
// LATAM tech job board. No external CLI framework, so it runs anywhere `bun`
// is available with zero install beyond the repo clone.
//
// Personal use only. This reads Get on Board's public search API and public
// job pages; keep volume low and do not use it commercially or for bulk data
// collection. Run it on your own responsibility.

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { ISO3_TO_ISO2 } from "./helpers.js"

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
  search: new Set(["query", "jobage", "remote", "country", "lang", "page", "limit", "format", "help", "h"]),
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

const HELP = `getonbrd-cli — search tech jobs on Get on Board (getonbrd.com, LATAM + remote)

USAGE
  bun run src/cli.ts search [flags]
  bun run src/cli.ts detail <id|url> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Keywords (job title, skill, or role). Recommended.
  --jobage <days>         Posted within N days (client-side filter; the API has
                          no posting-age parameter). Default: all.
  --remote <mode>         remote | hybrid | onsite. "remote" maps to the API's
                          remote=true; hybrid/onsite map to remote=false plus a
                          client-side remote_modality filter.
  --country <ISO3>        ISO3 country code, e.g. DOM (Dominican Republic),
                          CHL (Chile), MEX (Mexico), COL (Colombia).
  --lang <code>           Posting language: en | es | pt.
  --page <n>              1-indexed page (20 results/page). Default 1.
  --limit, -n <n>         Cap results emitted (client-side).
  --format <fmt>          json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "node.js" --remote remote --format table
  bun run src/cli.ts search -q "fullstack typescript" --country DOM --format table
  bun run src/cli.ts search -q "react" --jobage 14 --limit 10
  bun run src/cli.ts detail vibe-coder-in-residence-full-time-zagged-remote --format plain

Personal use only — uses Get on Board's public pages; keep volume low.
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

    let remote: string | undefined
    if (flags.remote !== undefined) {
      remote = typeof flags.remote === "string" ? flags.remote.toLowerCase() : ""
      if (remote === "on-site") remote = "onsite"
      if (!["remote", "hybrid", "onsite"].includes(remote)) {
        process.stderr.write(
          JSON.stringify({ error: `--remote must be remote, hybrid, or onsite, got "${flags.remote}"`, code: "BAD_ARG" }) + "\n",
        )
        return 1
      }
    }

    // --country takes ISO3 (DOM, CHL, ...); the API only accepts alpha-2, so
    // convert. Alpha-2 input is also accepted as a convenience.
    let country: string | undefined
    if (flags.country !== undefined) {
      const raw = typeof flags.country === "string" ? flags.country.toUpperCase() : ""
      if (/^[A-Z]{3}$/.test(raw) && ISO3_TO_ISO2[raw]) {
        country = ISO3_TO_ISO2[raw]
      } else if (/^[A-Z]{2}$/.test(raw)) {
        country = raw
      } else {
        process.stderr.write(
          JSON.stringify({ error: `--country must be an ISO3 country code (e.g. DOM, CHL, MEX), got "${flags.country}"`, code: "BAD_ARG" }) + "\n",
        )
        return 1
      }
    }

    let lang: string | undefined
    if (flags.lang !== undefined) {
      lang = typeof flags.lang === "string" ? flags.lang.toLowerCase() : ""
      if (!["en", "es", "pt"].includes(lang)) {
        process.stderr.write(
          JSON.stringify({ error: `--lang must be en, es, or pt, got "${flags.lang}"`, code: "BAD_ARG" }) + "\n",
        )
        return 1
      }
    }

    const opts: SearchOpts = {
      query: typeof flags.query === "string" ? flags.query : undefined,
      jobage: flags.jobage ? parseInt(flags.jobage as string, 10) : undefined,
      remote,
      country,
      lang,
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
