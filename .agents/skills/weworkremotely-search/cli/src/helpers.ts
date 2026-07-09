// Data source: We Work Remotely public RSS feeds. No authentication required.
// The HTML search page (https://weworkremotely.com/remote-jobs/search) returns
// 403 to non-browser clients, so this CLI is RSS-only: it fetches category
// feeds, parses <item> blocks with regex (zero dependencies), and does all
// filtering (query, region, job age) client-side.

export const FEEDS: Record<string, string> = {
  all: "https://weworkremotely.com/remote-jobs.rss",
  programming: "https://weworkremotely.com/categories/remote-programming-jobs.rss",
  "full-stack": "https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss",
  "back-end": "https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss",
  "front-end": "https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss",
  "devops-sysadmin": "https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss",
}

/** Default search surface: the programming-related feeds (5 parallel requests max). */
export const DEFAULT_FEED_KEYS = [
  "programming",
  "full-stack",
  "back-end",
  "front-end",
  "devops-sysadmin",
]

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/** Fetch an RSS feed with exponential backoff on 429/5xx. Returns "" on a 404. */
export async function xmlFetch(url: string): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7",
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
    if (response.status === 404) return ""
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export interface WWRJob {
  id: string
  title: string
  company: string | null
  /** The <region> string, e.g. "Anywhere in the World". */
  location: string | null
  /** ISO YYYY-MM-DD derived from <pubDate>. */
  date: string | null
  url: string
  category: string | null
  type: string | null
  skills: string[] | null
  /** Country names from <country> (emoji flags stripped). */
  countries: string[] | null
  /** Full description as plain text (tags stripped, entities decoded, paragraphs kept). */
  description: string | null
  /** Millisecond timestamp of <pubDate> for sorting/filtering (internal). */
  pubDateMs: number | null
}

/**
 * Convert a Unicode code point to a string. Uses `fromCodePoint` (not
 * `fromCharCode`) so supplementary-plane code points (e.g. emoji flags)
 * decode correctly, and drops out-of-range values instead of throwing.
 */
function numericEntity(cp: number): string {
  return cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : ""
}

export function decodeEntities(text: string): string {
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

/**
 * Convert an HTML fragment to readable plain text: <br>/<p>/<li> become
 * newlines, list items get a bullet, all other tags are stripped, entities
 * decoded, and runs of blank lines collapsed to a single paragraph break.
 */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|li|ul|ol|div|h\d|tr|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
  return decodeEntities(withBreaks)
    .replace(/[ \t]+/g, " ")
    // Inline tags were replaced with a space; don't leave it before punctuation.
    .replace(/ ([.,;:!?)])/g, "$1")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * Extract the text content of an XML element. If the raw content contains
 * CDATA sections, their literal contents are used (no entity decoding);
 * otherwise XML entities are decoded once. Returns null when the tag is
 * missing or empty.
 */
export function tagText(chunk: string, tag: string): string | null {
  const m = chunk.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"))
  if (!m) return null
  const raw = m[1]
  const cdata = [...raw.matchAll(/<!\[CDATA\[([\s\S]*?)\]\]>/g)]
  const text = cdata.length > 0 ? cdata.map((c) => c[1]).join("") : decodeEntities(raw)
  const trimmed = text.trim()
  return trimmed || null
}

/** Parse the job slug out of a WWR job URL (https://weworkremotely.com/remote-jobs/<slug>). */
export function slugFromUrl(url: string): string | null {
  const m = url.match(/weworkremotely\.com\/(?:remote-jobs|listings)\/([A-Za-z0-9\-_%]+)/)
  return m ? m[1] : null
}

/** Split a WWR feed title ("Company: Role") into its parts. */
export function splitTitle(raw: string): { company: string | null; role: string } {
  const idx = raw.indexOf(": ")
  if (idx <= 0) return { company: null, role: raw.trim() }
  return { company: raw.slice(0, idx).trim() || null, role: raw.slice(idx + 2).trim() }
}

/** Strip emoji flag sequences (regional indicator pairs) from a string. */
export function stripFlags(text: string): string {
  return text.replace(/[\u{1F1E6}-\u{1F1FF}]/gu, "").replace(/\s+/g, " ").trim()
}

/** Split a WWR comma list ("A, B, and C") into trimmed entries. */
export function splitList(text: string | null): string[] | null {
  if (!text) return null
  const parts = text
    .split(/,\s*/)
    .map((p) => p.replace(/^and\s+/i, "").trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : null
}

/** Convert an RFC-2822 pubDate to { iso: "YYYY-MM-DD", ms } or nulls. */
export function parsePubDate(raw: string | null): { iso: string | null; ms: number | null } {
  if (!raw) return { iso: null, ms: null }
  const d = new Date(raw)
  if (isNaN(d.getTime())) return { iso: null, ms: null }
  return { iso: d.toISOString().slice(0, 10), ms: d.getTime() }
}

/**
 * Parse an RSS document into jobs. The document is chunked into
 * <item>...</item> blocks and each block is parsed independently, so one
 * malformed item cannot break the rest.
 */
export function parseFeedItems(xml: string): WWRJob[] {
  const jobs: WWRJob[] = []
  const itemRe = /<item>([\s\S]*?)<\/item>/g
  let m: RegExpExecArray | null
  while ((m = itemRe.exec(xml)) !== null) {
    try {
      const job = parseItem(m[1])
      if (job) jobs.push(job)
    } catch {
      // Skip malformed items rather than failing the whole feed.
    }
  }
  return jobs
}

function parseItem(chunk: string): WWRJob | null {
  const link = tagText(chunk, "link") ?? tagText(chunk, "guid")
  if (!link) return null
  const url = link.split("?")[0]
  const id = slugFromUrl(url)
  if (!id) return null

  const rawTitle = tagText(chunk, "title")
  if (!rawTitle) return null
  const { company, role } = splitTitle(rawTitle)

  const { iso, ms } = parsePubDate(tagText(chunk, "pubDate"))

  const countryRaw = tagText(chunk, "country")
  const countries = splitList(countryRaw)?.map(stripFlags).filter(Boolean) ?? null

  // <description> content is entity-encoded HTML: tagText decodes the XML
  // layer, htmlToText strips the tags and decodes the HTML layer.
  const descriptionHtml = tagText(chunk, "description")
  const description = descriptionHtml ? htmlToText(descriptionHtml) || null : null

  return {
    id,
    title: role,
    company,
    location: tagText(chunk, "region"),
    date: iso,
    url,
    category: tagText(chunk, "category"),
    type: tagText(chunk, "type"),
    skills: splitList(tagText(chunk, "skills")),
    countries: countries && countries.length > 0 ? countries : null,
    description,
    pubDateMs: ms,
  }
}

/** Merge jobs from several feeds, deduplicating by URL (first occurrence wins). */
export function dedupeByUrl(jobs: WWRJob[]): WWRJob[] {
  const seen = new Set<string>()
  const out: WWRJob[] = []
  for (const job of jobs) {
    if (seen.has(job.url)) continue
    seen.add(job.url)
    out.push(job)
  }
  return out
}
