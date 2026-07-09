# We Work Remotely URL Reference

## Data surface: RSS only

The HTML search page returns **403 Forbidden** to non-browser clients:

```
https://weworkremotely.com/remote-jobs/search?term=...   → 403, do NOT use
```

Individual job pages (`https://weworkremotely.com/remote-jobs/<slug>`) may also 403.
The RSS feeds respond to a plain browser-ish User-Agent and carry the **full job
description**, so the CLI never touches HTML pages. `robots.txt` allows everything
except account/admin paths.

## Feed URLs (all verified live, HTTP 200 with items)

| Category key | URL | Items seen |
|--------------|-----|------------|
| `all` | `https://weworkremotely.com/remote-jobs.rss` | ~100 |
| `programming` | `https://weworkremotely.com/categories/remote-programming-jobs.rss` | ~25 |
| `full-stack` | `https://weworkremotely.com/categories/remote-full-stack-programming-jobs.rss` | ~42 |
| `back-end` | `https://weworkremotely.com/categories/remote-back-end-programming-jobs.rss` | ~14 |
| `front-end` | `https://weworkremotely.com/categories/remote-front-end-programming-jobs.rss` | ~20 |
| `devops-sysadmin` | `https://weworkremotely.com/categories/remote-devops-sysadmin-jobs.rss` | ~21 |

Default search fetches the five programming-related feeds in parallel (≤5 requests),
merges them, and dedupes by `<link>`. Other categories exist on the site (Design,
Product, Customer Support, Sales and Marketing, Management and Finance, All Other
Remote) — they appear inside the `all` feed's `<category>` element; dedicated feeds for
them can be added to `FEEDS` in `cli/src/helpers.ts` following the same
`/categories/remote-<name>-jobs.rss` pattern.

## Item element structure

```xml
<item>
  <media:content url="https://wwr-pro.s3.amazonaws.com/logos/.../logo.gif" type="image/png"/>
  <title>Company Name: Role Title</title>
  <region>Anywhere in the World</region>
  <country>🇩🇴 Dominican Republic, 🇺🇸 United States of America, and 🇩🇪 Germany</country>
  <state>Delaware</state>
  <skills>AWS, Node.js, React, Full Time, English, and TypeScript</skills>
  <category>Full-Stack Programming</category>
  <type>Full-Time</type>
  <description>&lt;p&gt;...entity-encoded HTML, the FULL job posting...&lt;/p&gt;</description>
  <pubDate>Wed, 08 Jul 2026 15:28:25 +0000</pubDate>
  <expires_at>Fri, 07 Aug 2026 15:28:25 +0000</expires_at>
  <guid>https://weworkremotely.com/remote-jobs/company-role-slug</guid>
  <link>https://weworkremotely.com/remote-jobs/company-role-slug</link>
</item>
```

## Field mapping

| CLI field | Source | Notes |
|-----------|--------|-------|
| `id` | `<link>` slug | Path segment after `/remote-jobs/` |
| `title` | `<title>` after `": "` | Title format is `Company: Role`; split on the first `": "` |
| `company` | `<title>` before `": "` | `null` if no `": "` separator |
| `location` | `<region>` | e.g. "Anywhere in the World", "USA Only" |
| `date` | `<pubDate>` | RFC 2822 → ISO `YYYY-MM-DD` |
| `url` | `<link>` | Canonical job URL |
| `category` | `<category>` | e.g. "Back-End Programming" |
| `type` | `<type>` | e.g. "Full-Time" |
| `skills` | `<skills>` | Comma list; last entry prefixed "and " |
| `countries` | `<country>` | Comma list with emoji flags (stripped by the CLI) |
| `description` | `<description>` | Entity-encoded HTML (see quirks) |

## Quirks

- **Double-encoded description.** `<description>` contains entity-encoded HTML
  (`&lt;p&gt;Hello &amp;amp; world`). Decode XML entities once to get HTML, strip tags,
  then decode HTML entities again.
- **The `programming` feed is thinner.** Its items omit `<country>`, `<skills>`,
  `<state>`, `<type>`, and `<expires_at>` — treat all custom elements as optional.
- **Oxford "and" in lists.** The last entry of `<skills>`/`<country>` is prefixed with
  `and ` ("A, B, and C").
- **Emoji flags in `<country>`.** Each country name is prefixed with its regional
  indicator flag (e.g. `🇩🇴 Dominican Republic`).
- **`<skills>` mixes tags with metadata.** Entries like "Full Time", "English",
  "Engineer" appear alongside real technologies.
- **Description starts with a logo `<img>`.** Strip tags before display.
- **No CDATA observed** in current feeds, but the parser handles it anyway.
- **Jobs age out.** Feeds carry only recent listings; `detail` can only resolve slugs
  still present in a feed.
- **Duplicates across feeds.** A full-stack job appears in both its category feed and
  the `all` feed — dedupe by `<link>`.
