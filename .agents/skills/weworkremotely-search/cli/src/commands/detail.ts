import {
  FEEDS,
  DEFAULT_FEED_KEYS,
  xmlFetch,
  parseFeedItems,
  slugFromUrl,
  writeError,
  type WWRJob,
} from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/** Accept a bare job slug or a full WWR job URL. */
export function normalizeId(input: string): string | null {
  const fromUrl = slugFromUrl(input)
  if (fromUrl) return fromUrl.split("?")[0].split("#")[0]
  if (/^[A-Za-z0-9][A-Za-z0-9\-_]*$/.test(input)) return input
  return null
}

/**
 * Find a job by slug across the RSS feeds. The job HTML page 403s to
 * non-browser clients, so the RSS <description> is the detail source. Feeds
 * are fetched sequentially (all-jobs first, then the programming feeds) and
 * we stop at the first match to keep request volume low.
 */
async function findJob(slug: string): Promise<WWRJob | null> {
  const keys = ["all", ...DEFAULT_FEED_KEYS]
  for (const key of keys) {
    const xml = await xmlFetch(FEEDS[key]) // "" on 404 → zero items, skip
    const match = parseFeedItems(xml).find((j) => j.id === slug)
    if (match) return match
  }
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const slug = normalizeId(opts.id)
  if (!slug) {
    writeError(`Could not parse a job slug from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    const job = await findJob(slug)
    if (!job) {
      writeError(
        `Job "${slug}" not found in the current RSS feeds (it may have aged out — feeds only carry recent listings)`,
        "NOT_FOUND",
      )
      return 1
    }

    if (opts.format === "plain") {
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"}${job.date ? ` · ${job.date}` : ""}`,
        "",
        job.type ? `Type: ${job.type}` : "",
        job.category ? `Category: ${job.category}` : "",
        job.skills ? `Skills: ${job.skills.join(", ")}` : "",
        job.countries ? `Countries: ${job.countries.join(", ")}` : "",
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      const { pubDateMs: _ms, ...out } = job
      process.stdout.write(JSON.stringify(out, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
