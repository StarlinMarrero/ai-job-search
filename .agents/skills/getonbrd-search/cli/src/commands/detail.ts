import { JOB_PAGE_BASE, htmlFetch, parseJobDetail, writeError } from "../helpers.js"

export interface DetailOpts {
  id: string
  format: "json" | "plain"
}

/**
 * Accept a bare slug (from search results), a public URL
 * https://www.getonbrd.com/jobs/<slug>, or the redirected category form
 * https://www.getonbrd.com/jobs/<category>/<slug>. Returns the path after
 * /jobs/ (either "slug" or "category/slug") — the fetch follows the 301 to
 * the canonical category URL either way.
 */
export function normalizeId(input: string): string | null {
  const trimmed = input.trim()
  const urlMatch = trimmed.match(/getonbrd\.com\/jobs\/([^?#]+)/i)
  if (urlMatch) {
    const path = urlMatch[1].replace(/\/+$/, "")
    return /^[\w-]+(?:\/[\w-]+)?$/.test(path) ? path : null
  }
  if (/^[\w-]+$/.test(trimmed)) return trimmed
  return null
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const path = normalizeId(opts.id)
  if (!path) {
    writeError(`Could not parse a job slug from "${opts.id}"`, "BAD_ID")
    return 1
  }
  const slug = path.split("/").pop() as string
  try {
    const page = await htmlFetch(`${JOB_PAGE_BASE}/${path}`)
    if (page === null) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const job = parseJobDetail(page.html, slug, page.finalUrl)

    if (opts.format === "plain") {
      const salary =
        job.salary_min !== null || job.salary_max !== null
          ? `Salary: ${job.salary_min ?? "?"} - ${job.salary_max ?? "?"} ` +
            `${job.salary_currency ?? "USD"}/${(job.salary_unit ?? "month").toLowerCase()}`
          : ""
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"} · ${job.date || "—"}`,
        "",
        job.seniority ? `Seniority: ${job.seniority}` : "",
        job.employmentType ? `Employment: ${job.employmentType}` : "",
        job.skills ? `Skills: ${job.skills.join(", ")}` : "",
        salary,
        "",
        job.description || "(no description)",
        "",
        `URL: ${job.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
