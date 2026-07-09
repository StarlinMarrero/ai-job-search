// Data source: Get on Board (getonbrd.com), the LATAM tech job board.
// Search uses the public JSON API at /api/v0/search/jobs (NOT /api/v2/ — that 404s).
// Detail uses the job's public HTML page and parses its schema.org MICRODATA
// anchors (itemprop="...") — the JSON detail endpoint /api/v0/jobs/{id} requires
// auth (401), so we never call it. All HTML parsing is chunk-based regex: each
// itemprop block is located and parsed independently, so one malformed block
// cannot break the rest.

export const SEARCH_URL = "https://www.getonbrd.com/api/v0/search/jobs"
export const JOB_PAGE_BASE = "https://www.getonbrd.com/jobs"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/**
 * Fetch with exponential backoff + jitter on 429/5xx (max 6 retries).
 * Returns null on a 404 instead of throwing; throws on other failures.
 */
async function fetchWithBackoff(url: string, accept: string): Promise<Response | null> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: accept,
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
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
    return response
  }
  throw new Error("Request failed after max retries")
}

/** Fetch a JSON API endpoint. Returns null on 404. */
export async function jsonFetch(url: string): Promise<unknown | null> {
  const response = await fetchWithBackoff(url, "application/json")
  if (response === null) return null
  return response.json()
}

/** Fetch an HTML page (follows the 301 to the category URL). Returns null on 404. */
export async function htmlFetch(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const response = await fetchWithBackoff(
    url,
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  )
  if (response === null) return null
  return { html: await response.text(), finalUrl: response.url || url }
}

// ---------------------------------------------------------------------------
// HTML text utilities
// ---------------------------------------------------------------------------

/**
 * Convert a Unicode code point to a string. Uses `fromCodePoint` so
 * supplementary-plane code points decode correctly, and drops out-of-range
 * values instead of throwing.
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
    .replace(/&#(\d+);/g, (_, dec) => numericEntity(parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => numericEntity(parseInt(hex, 16)))
    .replace(/&nbsp;/g, " ")
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

/** One-line clean text (tags stripped, entities decoded, whitespace collapsed). */
export function clean(html: string): string {
  return decodeHtmlEntities(stripTags(html))
}

/** Multi-line clean text: paragraph/list/heading breaks kept as newlines. */
export function htmlToText(html: string): string {
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|li|ul|ol|div|h\d|tr)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
  return decodeHtmlEntities(
    withBreaks.replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " "),
  )
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Unix epoch seconds -> ISO date (YYYY-MM-DD), or null. */
export function epochToISO(epoch: unknown): string | null {
  if (typeof epoch !== "number" || !isFinite(epoch) || epoch <= 0) return null
  return new Date(epoch * 1000).toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Search API parsing
// ---------------------------------------------------------------------------

/**
 * ISO 3166-1 alpha-3 -> alpha-2. The CLI's --country flag takes alpha-3 codes
 * (DOM, CHL, MEX, ...) but the API's country_code parameter only accepts
 * alpha-2 ("Country code should be an ISO 3166-1 alpha-2 code" on anything
 * else), so we convert before sending.
 */
export const ISO3_TO_ISO2: Record<string, string> = {
  AFG: "AF", ALA: "AX", ALB: "AL", DZA: "DZ", ASM: "AS", AND: "AD", AGO: "AO",
  AIA: "AI", ATA: "AQ", ATG: "AG", ARG: "AR", ARM: "AM", ABW: "AW", AUS: "AU",
  AUT: "AT", AZE: "AZ", BHS: "BS", BHR: "BH", BGD: "BD", BRB: "BB", BLR: "BY",
  BEL: "BE", BLZ: "BZ", BEN: "BJ", BMU: "BM", BTN: "BT", BOL: "BO", BES: "BQ",
  BIH: "BA", BWA: "BW", BVT: "BV", BRA: "BR", IOT: "IO", BRN: "BN", BGR: "BG",
  BFA: "BF", BDI: "BI", CPV: "CV", KHM: "KH", CMR: "CM", CAN: "CA", CYM: "KY",
  CAF: "CF", TCD: "TD", CHL: "CL", CHN: "CN", CXR: "CX", CCK: "CC", COL: "CO",
  COM: "KM", COG: "CG", COD: "CD", COK: "CK", CRI: "CR", CIV: "CI", HRV: "HR",
  CUB: "CU", CUW: "CW", CYP: "CY", CZE: "CZ", DNK: "DK", DJI: "DJ", DMA: "DM",
  DOM: "DO", ECU: "EC", EGY: "EG", SLV: "SV", GNQ: "GQ", ERI: "ER", EST: "EE",
  SWZ: "SZ", ETH: "ET", FLK: "FK", FRO: "FO", FJI: "FJ", FIN: "FI", FRA: "FR",
  GUF: "GF", PYF: "PF", ATF: "TF", GAB: "GA", GMB: "GM", GEO: "GE", DEU: "DE",
  GHA: "GH", GIB: "GI", GRC: "GR", GRL: "GL", GRD: "GD", GLP: "GP", GUM: "GU",
  GTM: "GT", GGY: "GG", GIN: "GN", GNB: "GW", GUY: "GY", HTI: "HT", HMD: "HM",
  VAT: "VA", HND: "HN", HKG: "HK", HUN: "HU", ISL: "IS", IND: "IN", IDN: "ID",
  IRN: "IR", IRQ: "IQ", IRL: "IE", IMN: "IM", ISR: "IL", ITA: "IT", JAM: "JM",
  JPN: "JP", JEY: "JE", JOR: "JO", KAZ: "KZ", KEN: "KE", KIR: "KI", PRK: "KP",
  KOR: "KR", KWT: "KW", KGZ: "KG", LAO: "LA", LVA: "LV", LBN: "LB", LSO: "LS",
  LBR: "LR", LBY: "LY", LIE: "LI", LTU: "LT", LUX: "LU", MAC: "MO", MDG: "MG",
  MWI: "MW", MYS: "MY", MDV: "MV", MLI: "ML", MLT: "MT", MHL: "MH", MTQ: "MQ",
  MRT: "MR", MUS: "MU", MYT: "YT", MEX: "MX", FSM: "FM", MDA: "MD", MCO: "MC",
  MNG: "MN", MNE: "ME", MSR: "MS", MAR: "MA", MOZ: "MZ", MMR: "MM", NAM: "NA",
  NRU: "NR", NPL: "NP", NLD: "NL", NCL: "NC", NZL: "NZ", NIC: "NI", NER: "NE",
  NGA: "NG", NIU: "NU", NFK: "NF", MKD: "MK", MNP: "MP", NOR: "NO", OMN: "OM",
  PAK: "PK", PLW: "PW", PSE: "PS", PAN: "PA", PNG: "PG", PRY: "PY", PER: "PE",
  PHL: "PH", PCN: "PN", POL: "PL", PRT: "PT", PRI: "PR", QAT: "QA", REU: "RE",
  ROU: "RO", RUS: "RU", RWA: "RW", BLM: "BL", SHN: "SH", KNA: "KN", LCA: "LC",
  MAF: "MF", SPM: "PM", VCT: "VC", WSM: "WS", SMR: "SM", STP: "ST", SAU: "SA",
  SEN: "SN", SRB: "RS", SYC: "SC", SLE: "SL", SGP: "SG", SXM: "SX", SVK: "SK",
  SVN: "SI", SLB: "SB", SOM: "SO", ZAF: "ZA", SGS: "GS", SSD: "SS", ESP: "ES",
  LKA: "LK", SDN: "SD", SUR: "SR", SJM: "SJ", SWE: "SE", CHE: "CH", SYR: "SY",
  TWN: "TW", TJK: "TJ", TZA: "TZ", THA: "TH", TLS: "TL", TGO: "TG", TKL: "TK",
  TON: "TO", TTO: "TT", TUN: "TN", TUR: "TR", TKM: "TM", TCA: "TC", TUV: "TV",
  UGA: "UG", UKR: "UA", ARE: "AE", GBR: "GB", USA: "US", UMI: "UM", URY: "UY",
  UZB: "UZ", VUT: "VU", VEN: "VE", VNM: "VN", VGB: "VG", VIR: "VI", WLF: "WF",
  ESH: "EH", YEM: "YE", ZMB: "ZM", ZWE: "ZW",
}

/** Observed stable seniority ids on Get on Board (see url-reference.md). */
export const SENIORITY_LABELS: Record<number, string> = {
  1: "No experience required",
  2: "Junior",
  3: "Semi Senior",
  4: "Senior",
  5: "Expert",
}

export interface SearchResult {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  headline: string | null
  remote: boolean | null
  remote_modality: string | null
  seniority: string | null
  salary_min: number | null
  salary_max: number | null
  category: string | null
  countries: string[] | null
  published_at: number | null
}

function asStringArray(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null
  const items = v.filter((x): x is string => typeof x === "string" && x.length > 0)
  return items.length > 0 ? items : null
}

/**
 * Map one API `data[]` entry to a SearchResult. Each entry is parsed inside a
 * try/catch by the caller so a single malformed entry cannot break the page.
 */
function parseSearchEntry(entry: Record<string, any>): SearchResult | null {
  const id = typeof entry.id === "string" ? entry.id : null
  if (!id) return null
  const a: Record<string, any> = entry.attributes ?? {}

  const countries = asStringArray(a.countries)
  const cities = asStringArray(a.location_cities)
  const location = countries?.join(", ") ?? cities?.join(", ") ?? null

  const companyName = a.company?.data?.attributes?.name
  const seniorityId = a.seniority?.data?.id
  const seniorityNum = typeof seniorityId === "string" ? parseInt(seniorityId, 10) : seniorityId

  return {
    id,
    title: typeof a.title === "string" ? a.title : "(untitled)",
    company: typeof companyName === "string" ? companyName : null,
    location,
    date: epochToISO(a.published_at),
    url:
      typeof entry.links?.public_url === "string"
        ? entry.links.public_url
        : `${JOB_PAGE_BASE}/${id}`,
    headline: typeof a.description_headline === "string" ? clean(a.description_headline) : null,
    remote: typeof a.remote === "boolean" ? a.remote : null,
    remote_modality: typeof a.remote_modality === "string" ? a.remote_modality : null,
    seniority:
      typeof seniorityNum === "number" && SENIORITY_LABELS[seniorityNum]
        ? SENIORITY_LABELS[seniorityNum]
        : null,
    salary_min: typeof a.min_salary === "number" ? a.min_salary : null,
    salary_max: typeof a.max_salary === "number" ? a.max_salary : null,
    category: typeof a.category_name === "string" ? a.category_name : null,
    countries,
    published_at: typeof a.published_at === "number" ? a.published_at : null,
  }
}

export interface SearchPage {
  results: SearchResult[]
  totalPages: number | null
}

/** Parse the /api/v0/search/jobs response body. */
export function parseSearchResponse(body: unknown): SearchPage {
  const data = (body as Record<string, any>)?.data
  const meta = (body as Record<string, any>)?.meta
  const results: SearchResult[] = []
  if (Array.isArray(data)) {
    for (const entry of data) {
      try {
        const parsed = parseSearchEntry(entry)
        if (parsed) results.push(parsed)
      } catch {
        // Skip a malformed entry; keep the rest of the page.
      }
    }
  }
  return {
    results,
    totalPages: typeof meta?.total_pages === "number" ? meta.total_pages : null,
  }
}

// ---------------------------------------------------------------------------
// Detail page microdata parsing
// ---------------------------------------------------------------------------

const VOID_TAGS = new Set(["meta", "link", "img", "br", "hr", "input", "source"])

interface ItempropBlock {
  attrs: string
  inner: string
}

/**
 * Find the first element with itemprop="<prop>" and return its opening-tag
 * attributes plus its balanced inner HTML. Nested same-name tags are handled
 * by depth counting, so blocks like the description <div> (which contains
 * many nested <div>s) are captured completely.
 */
export function findItemprop(html: string, prop: string): ItempropBlock | null {
  const open = new RegExp(`<([a-zA-Z][\\w-]*)([^>]*\\bitemprop="${prop}"[^>]*)>`, "i").exec(html)
  if (!open) return null
  const tag = open[1].toLowerCase()
  const attrs = open[2]
  if (VOID_TAGS.has(tag) || attrs.trimEnd().endsWith("/")) {
    return { attrs, inner: "" }
  }
  const bodyStart = open.index + open[0].length
  const scanner = new RegExp(`<${tag}\\b[^>]*>|</${tag}\\s*>`, "gi")
  scanner.lastIndex = bodyStart
  let depth = 1
  let m: RegExpExecArray | null
  while ((m = scanner.exec(html)) !== null) {
    if (m[0].startsWith("</")) {
      depth--
      if (depth === 0) return { attrs, inner: html.slice(bodyStart, m.index) }
    } else if (!m[0].endsWith("/>")) {
      depth++
    }
  }
  // Unbalanced markup: return the rest rather than failing the whole parse.
  return { attrs, inner: html.slice(bodyStart) }
}

function attrValue(attrs: string, name: string): string | null {
  const m = attrs.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))
  return m ? decodeHtmlEntities(m[1]) : null
}

/** itemprop value as one-line text (prefers content=/datetime= attributes). */
function itempropText(html: string, prop: string): string | null {
  const block = findItemprop(html, prop)
  if (!block) return null
  const fromAttr = attrValue(block.attrs, "content") ?? attrValue(block.attrs, "datetime")
  if (fromAttr) return fromAttr
  const text = clean(block.inner)
  return text || null
}

export interface JobDetail {
  id: string
  title: string
  company: string | null
  location: string | null
  date: string | null
  url: string
  employmentType: string | null
  seniority: string | null
  skills: string[] | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  salary_unit: string | null
  description: string | null
}

/**
 * Parse a Get on Board public job page via its schema.org microdata anchors.
 * Every field is extracted independently — a missing or malformed block just
 * yields null for that field.
 */
export function parseJobDetail(html: string, id: string, url: string): JobDetail {
  const title = itempropText(html, "title")

  // Company name lives inside the hiringOrganization block (the page has other
  // unrelated itemprop="name" elements, e.g. breadcrumbs — scope to the block).
  let company: string | null = null
  const org = findItemprop(html, "hiringOrganization")
  if (org) company = itempropText(org.inner, "name")

  // Location: the address block inside jobLocation ("Remote", a city, etc.).
  let location: string | null = null
  const place = findItemprop(html, "jobLocation")
  if (place) location = itempropText(place.inner, "address")
  if (!location) location = itempropText(html, "address")

  const datePosted = itempropText(html, "datePosted")
  const date = datePosted ? datePosted.slice(0, 10) : null

  const employmentType = itempropText(html, "employmentType")
  const seniority = itempropText(html, "qualifications")

  // Skills: a tag cloud of <a> elements inside the skills block.
  let skills: string[] | null = null
  const skillsBlock = findItemprop(html, "skills")
  if (skillsBlock) {
    const items: string[] = []
    const anchorRe = /<a\b[^>]*>([\s\S]*?)<\/a>/gi
    let am: RegExpExecArray | null
    while ((am = anchorRe.exec(skillsBlock.inner)) !== null) {
      const text = clean(am[1])
      if (text) items.push(text)
    }
    if (items.length === 0) {
      const text = clean(skillsBlock.inner)
      if (text) items.push(text)
    }
    skills = items.length > 0 ? items : null
  }

  // Salary: nested QuantitativeValue with content="" attributes.
  let salaryMin: number | null = null
  let salaryMax: number | null = null
  let salaryCurrency: string | null = null
  let salaryUnit: string | null = null
  const salary = findItemprop(html, "baseSalary")
  if (salary) {
    const num = (prop: string): number | null => {
      const v = itempropText(salary.inner, prop)
      const n = v ? parseInt(v, 10) : NaN
      return isNaN(n) ? null : n
    }
    salaryMin = num("minValue")
    salaryMax = num("maxValue")
    salaryCurrency = itempropText(salary.inner, "currency")
    salaryUnit = itempropText(salary.inner, "unitText")
  }

  // Full description (the job body: description, functions, desirable, benefits).
  let description: string | null = null
  const desc = findItemprop(html, "description")
  if (desc) description = htmlToText(desc.inner) || null

  return {
    id,
    title: title ?? "(untitled)",
    company,
    location,
    date,
    url,
    employmentType,
    seniority,
    skills,
    salary_min: salaryMin,
    salary_max: salaryMax,
    salary_currency: salaryCurrency,
    salary_unit: salaryUnit,
    description,
  }
}
