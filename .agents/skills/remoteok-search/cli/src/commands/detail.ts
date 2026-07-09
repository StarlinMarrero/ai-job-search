import { fetchJobs, cleanDescription, writeError, type Job } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/**
 * Accept a raw job ID (digits), a slug, or a full Remote OK job URL
 * (https://remoteok.com/remote-jobs/<slug>). Returns the lookup key.
 */
export function normalizeRef(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const url = trimmed.match(/remote(?:ok)?\.com\/remote-jobs\/([^/?#\s]+)/i)
  if (url) return url[1]
  return trimmed
}

/** Match a job by id, slug, or the trailing "-<id>" of its slug. */
export function findJob(jobs: Job[], ref: string): Job | undefined {
  const lower = ref.toLowerCase()
  return jobs.find(
    (j) =>
      j.id === ref ||
      (j.slug !== null && j.slug.toLowerCase() === lower) ||
      (/^\d+$/.test(ref) && j.slug !== null && j.slug.endsWith(`-${ref}`)),
  )
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const ref = normalizeRef(opts.id)
  if (!ref) {
    writeError(`Could not parse a job ID from "${opts.id}"`, "BAD_ID")
    return 1
  }
  try {
    // Single-array API: refetch once and look the job up client-side.
    const jobs = await fetchJobs()
    const job = findJob(jobs, ref)
    if (!job) {
      writeError(
        `Job "${ref}" not found — the API only holds the current set of recent listings`,
        "NOT_FOUND",
      )
      return 1
    }

    const description = job.description ? cleanDescription(job.description) : null

    if (opts.format === "plain") {
      const salary =
        job.salary_min || job.salary_max
          ? `Salary: $${job.salary_min ?? "?"}–$${job.salary_max ?? "?"}`
          : ""
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "Remote"} · ${job.date || "—"}`,
        job.tags.length > 0 ? `Tags: ${job.tags.join(", ")}` : "",
        salary,
        "",
        description || "(no description)",
        "",
        `URL: ${job.url || "—"}`,
        job.applyUrl && job.applyUrl !== job.url ? `Apply: ${job.applyUrl}` : "",
        "Source: Remote OK (https://remoteok.com)",
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      const out = {
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
        applyUrl: job.applyUrl,
        description,
        source: "Remote OK (https://remoteok.com)",
      }
      process.stdout.write(JSON.stringify(out, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
