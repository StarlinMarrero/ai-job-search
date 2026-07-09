import { fetchJobs, stripTags, fixMojibake, writeError, type Job } from "../helpers.js"

export interface SearchOpts {
  query?: string
  tag?: string
  location?: string
  jobage: number // days; 9999 = no filter
  page: number
  limit?: number
  deep: boolean // also match --query against the full description
  format: "json" | "table" | "plain"
}

const PAGE_SIZE = 10

/** Case-insensitive --query match across position, company, tags, location.
 *  With --deep, the (tag-stripped) description is included too. */
function matchesQuery(job: Job, query: string, deep: boolean): boolean {
  const q = query.toLowerCase()
  const haystack = [job.title, job.company, job.location, ...job.tags]
  if (haystack.some((h) => h !== null && h.toLowerCase().includes(q))) return true
  if (deep && job.description) {
    return stripTags(fixMojibake(job.description)).toLowerCase().includes(q)
  }
  return false
}

export function applyFilters(jobs: Job[], opts: SearchOpts): Job[] {
  let filtered = jobs
  if (opts.jobage > 0 && opts.jobage < 9999) {
    const cutoff = Math.floor(Date.now() / 1000) - opts.jobage * 86400
    filtered = filtered.filter((j) => {
      const ts = j.epoch ?? (j.date ? Math.floor(Date.parse(j.date) / 1000) : null)
      return ts !== null && ts >= cutoff
    })
  }
  if (opts.query) {
    filtered = filtered.filter((j) => matchesQuery(j, opts.query!, opts.deep))
  }
  if (opts.tag) {
    const t = opts.tag.toLowerCase()
    filtered = filtered.filter((j) => j.tags.some((x) => x.toLowerCase() === t))
  }
  if (opts.location) {
    const l = opts.location.toLowerCase()
    filtered = filtered.filter((j) => j.location !== null && j.location.toLowerCase().includes(l))
  }
  return filtered
}

/** Result rows: contract fields first, useful extras after. */
function toResult(job: Job) {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    date: job.date,
    url: job.url,
    tags: job.tags,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    slug: job.slug,
  }
}

function renderTable(jobs: Job[]): string {
  if (jobs.length === 0) return "No results."
  const rows = jobs.map((j) => {
    const title = (j.title || "").slice(0, 42).padEnd(42)
    const company = (j.company || "—").slice(0, 26).padEnd(26)
    const loc = (j.location || "—").slice(0, 24).padEnd(24)
    const date = j.date || "—"
    return `${j.id.padEnd(11)} ${title} ${company} ${loc} ${date}`
  })
  const header =
    "ID".padEnd(11) +
    " " +
    "TITLE".padEnd(42) +
    " " +
    "COMPANY".padEnd(26) +
    " " +
    "LOCATION".padEnd(24) +
    " DATE"
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const all = await fetchJobs()
    const filtered = applyFilters(all, opts)
    // Client-side pagination: the API has no server-side paging, so we slice
    // the filtered set into fixed pages of 10, then cap with --limit.
    let jobs = filtered.slice((opts.page - 1) * PAGE_SIZE, opts.page * PAGE_SIZE)
    if (opts.limit && opts.limit > 0) jobs = jobs.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(jobs) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        jobs
          .map(
            (j) =>
              `${j.title}\n  ${j.company || "—"} · ${j.location || "—"} · ${j.date || "—"}\n  id: ${j.id}\n  ${j.url || "—"}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      process.stdout.write(
        JSON.stringify(
          { meta: { count: jobs.length, page: opts.page }, results: jobs.map(toResult) },
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
