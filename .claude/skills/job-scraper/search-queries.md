# Search Queries for Job Scraper

Configured for: **Starlin Marrero** - senior-leaning full-stack/backend developer, Santo Domingo, Dominican Republic. Scope: **remote anywhere + DR local**. Seniority: mid through senior, plus lead/staff stretch. No salary filter.

## Search Sites

Primary:
- **linkedin.com/jobs** - via the `linkedin-search` CLI skill (`.agents/skills/linkedin-search/`). Filter: Remote, plus Dominican Republic.
- **getonbrd.com** - LATAM tech board, via the `getonbrd-search` CLI skill (`.agents/skills/getonbrd-search/`). Supports `--remote remote`, `--country DOM`, `--jobage` (client-side).
- **remoteok.com** - remote board, via the `remoteok-search` CLI skill (`.agents/skills/remoteok-search/`). All filtering client-side; API window is the ~100 most recent listings.
- **weworkremotely.com** - remote board, via the `weworkremotely-search` CLI skill (`.agents/skills/weworkremotely-search/`). RSS-based; supports `--category`, `--region "Dominican"`/`"Anywhere"`.
- **wellfound.com** - startup/remote roles (WebSearch only - Cloudflare blocks automated access, no CLI possible)

Secondary:
- Remote-first company career pages via Google `site:` searches (GitLab, Automattic, Deel, Remote.com and similar)
- **NOTE:** The Danish portal CLIs (`jobindex-search`, `jobbank-search`, `jobdanmark-search`, `jobnet-search`) are DISABLED for this profile - wrong market. Do not run them.

## Query Categories

Combine queries with "remote" or "Dominican Republic" / "Latin America" / "LATAM" where the site supports it.

### Priority 1: Backend & Full-Stack (Node.js/TypeScript)

Strongest and most desired career direction.

```
linkedin-search: "Backend Developer" Node.js remote
linkedin-search: "Full Stack Developer" TypeScript remote
linkedin-search: NestJS developer remote
getonbrd-search: -q "node.js" --remote remote
getonbrd-search: -q "fullstack typescript" --country DOM
remoteok-search: -q "node" --jobage 14
weworkremotely-search: -q "typescript" --category full-stack
site:wellfound.com senior full stack engineer remote LATAM
```

### Priority 2: Fintech / Banking Domain

Domain expertise from current BANTRAB banking work.

```
linkedin-search: fintech backend engineer remote
linkedin-search: "banking" Node.js developer remote
getonbrd-search: -q "fintech" --remote remote
remoteok-search: -q "fintech"
weworkremotely-search: -q "fintech"
```

### Priority 3: Frontend (React/Next.js) and .NET/C#

Adjacent directions with strong experience backing.

```
linkedin-search: "React Developer" Next.js remote
linkedin-search: "Frontend Engineer" React remote LATAM
linkedin-search: ".NET Developer" C# remote
getonbrd-search: -q "react" --remote remote
remoteok-search: -q "react"
weworkremotely-search: -q "react" --category front-end
weworkremotely-search: -q ".NET"
```

### Priority 4: Broader Technical (wider net)

```
linkedin-search: "Software Engineer" TypeScript remote Latin America
linkedin-search: Software Engineer Santo Domingo Dominican Republic
site:jobs.gitlab.com engineer
site:automattic.com/work-with-us engineer
site:deel.com/careers engineer
Google: "hiring" "Dominican Republic" software engineer remote
```

## Location Filter

- **Ideal:** Fully remote (anywhere / Americas / LATAM timezones); Santo Domingo, DR (on-site or hybrid)
- **Acceptable:** Remote US/EU companies with async or partial-overlap policies
- **Borderline:** Remote roles requiring full overlap with far timezones (Asia/Pacific, far EU) - flag, do not auto-skip
- **Too far / FAIL:** On-site or relocation required outside the Dominican Republic

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape fintech" -> Priority 2 queries + custom fintech-specific searches
- "/scrape react" -> Priority 3 frontend queries + custom React/Next.js searches
