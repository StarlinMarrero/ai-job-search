# Search Queries for Job Scraper

Configured for: **Starlin Marrero** - senior-leaning full-stack/backend developer, Santo Domingo, Dominican Republic. Scope: **remote anywhere + DR local**. Seniority: mid through senior, plus lead/staff stretch. No salary filter.

## Search Sites

Primary:
- **linkedin.com/jobs** - via the `linkedin-search` CLI skill (`.agents/skills/linkedin-search/`). Filter: Remote, plus Dominican Republic.
- **remoteok.com** - remote board (WebSearch)
- **weworkremotely.com** - remote board (WebSearch)
- **wellfound.com** - startup/remote roles (WebSearch)

Secondary:
- Remote-first company career pages via Google `site:` searches (GitLab, Automattic, Deel, Remote.com and similar)
- **NOTE:** The Danish portal CLIs (`jobindex-search`, `jobbank-search`, `jobdanmark-search`, `jobnet-search`) are DISABLED for this profile - wrong market. Do not run them. Use `/add-portal` to add DR/LATAM-specific portals later.

## Query Categories

Combine queries with "remote" or "Dominican Republic" / "Latin America" / "LATAM" where the site supports it.

### Priority 1: Backend & Full-Stack (Node.js/TypeScript)

Strongest and most desired career direction.

```
linkedin-search: "Backend Developer" Node.js remote
linkedin-search: "Full Stack Developer" TypeScript remote
linkedin-search: NestJS developer remote
site:remoteok.com node.js backend
site:weworkremotely.com full stack typescript
site:wellfound.com senior full stack engineer remote LATAM
```

### Priority 2: Fintech / Banking Domain

Domain expertise from current BANTRAB banking work.

```
linkedin-search: fintech backend engineer remote
linkedin-search: "banking" Node.js developer remote
site:remoteok.com fintech engineer
site:weworkremotely.com fintech developer
```

### Priority 3: Frontend (React/Next.js) and .NET/C#

Adjacent directions with strong experience backing.

```
linkedin-search: "React Developer" Next.js remote
linkedin-search: "Frontend Engineer" React remote LATAM
linkedin-search: ".NET Developer" C# remote
site:remoteok.com react next.js
site:weworkremotely.com .NET C#
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
