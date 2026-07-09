import {
  SEARCH_URL,
  jsonFetch,
  parseSearchResponse,
  writeError,
  type SearchResult,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  jobage?: number // days; CLIENT-SIDE filter (the API has no posting-age param)
  remote?: string // "remote" | "hybrid" | "onsite"
  country?: string // ISO 3166-1 alpha-2 code (converted from the --country ISO3 flag in cli.ts)
  lang?: string // "en" | "es" | "pt"
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

export const PER_PAGE = 20

function buildUrl(opts: SearchOpts): string {
  const params = new URLSearchParams()
  if (opts.query) params.set("query", opts.query)
  params.set("per_page", String(PER_PAGE))
  params.set("page", String(opts.page))
  // remote=true covers --remote remote; hybrid/onsite are both remote=false
  // server-side and are told apart client-side via remote_modality.
  if (opts.remote === "remote") params.set("remote", "true")
  else if (opts.remote === "hybrid" || opts.remote === "onsite") params.set("remote", "false")
  if (opts.country) params.set("country_code", opts.country)
  if (opts.lang) params.set("lang", opts.lang)
  // expand must be the JSON-array literal ["company"]; URLSearchParams encodes
  // it to expand=%5B%22company%22%5D, which is what the API requires.
  params.set("expand", '["company"]')
  return `${SEARCH_URL}?${params.toString()}`
}

function applyClientFilters(results: SearchResult[], opts: SearchOpts): SearchResult[] {
  let out = results
  if (opts.remote === "hybrid") out = out.filter((r) => r.remote_modality === "hybrid")
  else if (opts.remote === "onsite") out = out.filter((r) => r.remote_modality === "no_remote")
  if (opts.jobage && opts.jobage > 0 && opts.jobage < 9999) {
    const cutoff = Math.floor(Date.now() / 1000) - opts.jobage * 86400
    out = out.filter((r) => r.published_at !== null && r.published_at >= cutoff)
  }
  if (opts.limit && opts.limit > 0) out = out.slice(0, opts.limit)
  return out
}

function renderTable(results: SearchResult[]): string {
  if (results.length === 0) return "No results."
  const rows = results.map((r) => {
    const title = (r.title || "").slice(0, 40).padEnd(40)
    const company = (r.company || "—").slice(0, 22).padEnd(22)
    const loc = (r.location || "—").slice(0, 16).padEnd(16)
    const date = (r.date || "—").padEnd(10)
    return `${title} ${company} ${loc} ${date} ${r.id}`
  })
  const header =
    "TITLE".padEnd(40) +
    " " +
    "COMPANY".padEnd(22) +
    " " +
    "LOCATION".padEnd(16) +
    " " +
    "DATE".padEnd(10) +
    " ID"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

function renderPlain(results: SearchResult[]): string {
  if (results.length === 0) return "No results."
  return results
    .map((r) => {
      const salary =
        r.salary_min !== null || r.salary_max !== null
          ? ` · ${r.salary_min ?? "?"}-${r.salary_max ?? "?"} USD/month`
          : ""
      return (
        `${r.title}\n` +
        `  ${r.company || "—"} · ${r.location || "—"} · ${r.date || "—"}` +
        `${r.remote_modality ? ` · ${r.remote_modality}` : ""}${salary}\n` +
        `  id: ${r.id}\n  ${r.url}`
      )
    })
    .join("\n\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const body = await jsonFetch(buildUrl(opts))
    const page = body === null ? { results: [], totalPages: null } : parseSearchResponse(body)
    const results = applyClientFilters(page.results, opts)

    if (opts.format === "table") {
      process.stdout.write(renderTable(results) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(renderPlain(results) + "\n")
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: results.length, page: opts.page }, results },
          null,
          2,
        ) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
