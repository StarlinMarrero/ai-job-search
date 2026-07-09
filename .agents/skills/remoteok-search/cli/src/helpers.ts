// Data source: Remote OK's public JSON API (https://remoteok.com/api). No
// authentication required. The endpoint returns ONE array with the full current
// set of recent listings (a few hundred jobs): element [0] is a legal-notice
// object ({ last_updated, legal }) that must always be skipped; every other
// element is a job object. There is no server-side query/page parameter worth
// relying on, so all filtering (query, tag, location, jobage) and pagination
// happen client-side after a single fetch.

export const API_URL = "https://remoteok.com/api"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** Fetch JSON with exponential backoff on 429/5xx. Returns null on a 404. */
export async function jsonFetch(url: string): Promise<unknown | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/json,text/plain,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      }
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return null
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.json()
  }
  throw new Error("Request failed after max retries")
}

export interface Job {
  id: string
  title: string | null
  company: string | null
  location: string | null
  date: string | null // ISO YYYY-MM-DD
  url: string | null
  slug: string | null
  tags: string[]
  salary_min: number | null
  salary_max: number | null
  epoch: number | null // unix seconds, used for --jobage filtering
  applyUrl: string | null
  description: string | null // raw HTML from the API (cleaned on output)
}

/**
 * Fix mojibake: the API sometimes serves strings whose UTF-8 bytes were
 * decoded as Latin-1 (e.g. "SÃ£o Paulo", "â€™" for a right single quote).
 * If a string contains a UTF-8 lead-byte pattern in the U+0080–U+00FF range,
 * re-encode it as Latin-1 bytes and decode those bytes as UTF-8. Defensive:
 * any code point above U+00FF means the string is NOT pure mis-decoded
 * Latin-1, and a replacement character in the result means the re-decode
 * went wrong — in both cases the original string is returned unchanged.
 */
export function fixMojibake(s: string): string {
  // UTF-8 lead byte (0xC2–0xF4) followed by a continuation byte (0x80–0xBF),
  // both mis-decoded as Latin-1 code points.
  if (!/[\u00C2-\u00F4][\u0080-\u00BF]/.test(s)) return s
  for (const ch of s) {
    if ((ch.codePointAt(0) ?? 0) > 0xff) return s
  }
  try {
    const fixed = Buffer.from(s, "latin1").toString("utf8")
    return fixed.includes("\uFFFD") ? s : fixed
  } catch {
    return s
  }
}

/**
 * Convert a Unicode code point to a string. Uses `fromCodePoint` (not
 * `fromCharCode`) so supplementary-plane code points decode correctly, and
 * drops out-of-range values instead of throwing.
 */
function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    // Numeric character references: decimal (&#233;) and hexadecimal (&#xE9;).
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

export function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Turn the API's HTML description into readable plain text: fix mojibake,
 * keep paragraph/line breaks as newlines, strip the remaining tags, and
 * decode HTML entities.
 */
export function cleanDescription(html: string): string {
  const withBreaks = fixMojibake(html)
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  return decodeHtmlEntities(withBreaks.replace(/<[^>]+>/g, " "))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Normalize a short text field: mojibake fix + entity decode + trim. */
function fixText(v: unknown): string | null {
  if (typeof v !== "string") return null
  const s = decodeHtmlEntities(fixMojibake(v)).trim()
  return s || null
}

/** The API uses 0 for "salary not specified" — normalize that to null. */
function fixSalary(v: unknown): number | null {
  return typeof v === "number" && v > 0 ? v : null
}

type RawJob = Record<string, unknown>

function normalizeJob(raw: RawJob): Job | null {
  const id = raw.id !== undefined && raw.id !== null && raw.id !== "" ? String(raw.id) : null
  const title = fixText(raw.position)
  if (!id || !title) return null // element [0] legal notice, or malformed entry

  const slug = typeof raw.slug === "string" && raw.slug ? raw.slug : null
  const url =
    (typeof raw.url === "string" && raw.url ? raw.url : null) ??
    (slug ? `https://remoteok.com/remote-jobs/${slug}` : null)

  const epoch = typeof raw.epoch === "number" && raw.epoch > 0 ? raw.epoch : null
  let date: string | null = null
  if (typeof raw.date === "string" && raw.date.length >= 10) date = raw.date.slice(0, 10)
  else if (epoch) date = new Date(epoch * 1000).toISOString().slice(0, 10)

  // Locations sometimes carry a dangling separator, e.g. "Athens, ".
  const location = fixText(raw.location)?.replace(/[,\s]+$/, "") || null

  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((t) => fixText(t)).filter((t): t is string => t !== null)
    : []

  return {
    id,
    title,
    company: fixText(raw.company),
    location,
    date,
    url,
    slug,
    tags,
    salary_min: fixSalary(raw.salary_min),
    salary_max: fixSalary(raw.salary_max),
    epoch,
    applyUrl: typeof raw.apply_url === "string" && raw.apply_url ? raw.apply_url : null,
    description: typeof raw.description === "string" && raw.description ? raw.description : null,
  }
}

/**
 * Fetch the full listing set once and normalize it. Element [0] (the legal
 * notice) and anything without an id/position is dropped by normalizeJob.
 */
export async function fetchJobs(): Promise<Job[]> {
  const data = await jsonFetch(API_URL)
  if (data === null) throw new Error("Remote OK API returned 404")
  if (!Array.isArray(data)) throw new Error("Remote OK API did not return a JSON array")
  const jobs: Job[] = []
  for (const entry of data) {
    if (entry === null || typeof entry !== "object") continue
    const job = normalizeJob(entry as RawJob)
    if (job) jobs.push(job)
  }
  return jobs
}
