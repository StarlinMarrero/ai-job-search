import {
  FEEDS,
  DEFAULT_FEED_KEYS,
  xmlFetch,
  parseFeedItems,
  dedupeByUrl,
  writeError,
  type WWRJob,
} from "../helpers.js"

export interface SearchOpts {
  query?: string
  jobage: number
  category?: string
  region?: string
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

const PAGE_SIZE = 10

/** The shape emitted per result (internal fields like pubDateMs stripped). */
interface ResultJob {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  category: string | null
  type: string | null
  skills: string[] | null
  countries: string[] | null
}

function toResult(job: WWRJob): ResultJob {
  return {
    id: job.id,
    title: job.title,
    company: job.company,
    location: job.location,
    date: job.date,
    url: job.url,
    category: job.category,
    type: job.type,
    skills: job.skills,
    countries: job.countries,
  }
}

function matchesQuery(job: WWRJob, query: string): boolean {
  const haystack = [
    job.title,
    job.company ?? "",
    (job.skills ?? []).join(" "),
    job.category ?? "",
    job.description ?? "",
  ]
    .join("\n")
    .toLowerCase()
  return haystack.includes(query.toLowerCase())
}

function matchesRegion(job: WWRJob, region: string): boolean {
  const haystack = [job.location ?? "", ...(job.countries ?? [])].join("\n").toLowerCase()
  return haystack.includes(region.toLowerCase())
}

function renderTable(jobs: ResultJob[]): string {
  if (jobs.length === 0) return "No results."
  const header =
    "TITLE".padEnd(38) +
    " " +
    "COMPANY".padEnd(22) +
    " " +
    "REGION".padEnd(22) +
    " " +
    "DATE".padEnd(10) +
    " ID"
  const rows = jobs.map(
    (j) =>
      (j.title || "—").slice(0, 38).padEnd(38) +
      " " +
      (j.company || "—").slice(0, 22).padEnd(22) +
      " " +
      (j.location || "—").slice(0, 22).padEnd(22) +
      " " +
      (j.date || "—").padEnd(10) +
      " " +
      j.id,
  )
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const keys = opts.category ? [opts.category] : DEFAULT_FEED_KEYS
    // Parallel fetch, but never more than 5 requests (DEFAULT_FEED_KEYS is 5).
    const xmls = await Promise.all(keys.map((k) => xmlFetch(FEEDS[k])))
    // A 404'd feed returns "" and simply parses to zero items (graceful skip).
    let jobs = dedupeByUrl(xmls.flatMap((xml) => parseFeedItems(xml)))

    if (opts.query) jobs = jobs.filter((j) => matchesQuery(j, opts.query as string))
    if (opts.region) jobs = jobs.filter((j) => matchesRegion(j, opts.region as string))
    if (opts.jobage > 0 && opts.jobage < 9999) {
      const cutoff = Date.now() - opts.jobage * 86_400_000
      jobs = jobs.filter((j) => j.pubDateMs !== null && j.pubDateMs >= cutoff)
    }

    // Newest first; undated items sink to the bottom.
    jobs.sort((a, b) => (b.pubDateMs ?? -Infinity) - (a.pubDateMs ?? -Infinity))

    const start = (opts.page - 1) * PAGE_SIZE
    let page = jobs.slice(start, start + PAGE_SIZE)
    if (opts.limit && opts.limit > 0) page = page.slice(0, opts.limit)
    const results = page.map(toResult)

    if (opts.format === "table") {
      process.stdout.write(renderTable(results) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        results
          .map(
            (j) =>
              `${j.title}\n  ${j.company || "—"} · ${j.location || "—"} · ${j.date || "—"}\n  id: ${j.id}\n  ${j.url}`,
          )
          .join("\n\n") + "\n",
      )
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
