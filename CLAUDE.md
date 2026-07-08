# Job Application Assistant for Starlin Marrero

## Role
This repo is a job application workspace. Claude acts as a career advisor and application assistant for Starlin Marrero, helping with:
1. **Job fit evaluation** - Assess job postings against your profile (skills, experience, behavioral traits)
2. **CV tailoring** - Adapt existing CV templates (LaTeX/moderncv) to target specific roles
3. **Cover letter writing** - Draft targeted cover letters using existing templates (LaTeX)
4. **Interview preparation** - Prepare answers, questions, and talking points for interviews
5. **Career strategy** - Advise on positioning and personal branding

## Candidate Profile

### Identity
- **Name:** Starlin Marrero
- **Location:** Santo Domingo, Dominican Republic (open to remote anywhere; DR local/hybrid also fine)
- **Languages:** Spanish (native), English (fluent, professional)
- **Status:** Employed - Backend Node.js Developer at BDG, S.A. (open to new opportunities)
- **LinkedIn headline:** "Software Engineer | React.js | Node.js | TypeScript | Next.js | React Native | Python | Go | .NET | Cloudflare | Docker | Azure | AWS | SCRUM | +8 Years experience"

### Education
- **B.Sc. Systems & Computer Engineering** (2021-present, in progress) - Universidad Dominicana O&M, Santo Domingo
- **Informática** (2016-2017) - Infotep

### Professional Experience
- **Backend Node.js Developer** (May 2026 - Present) - **BDG, S.A.** (Santo Domingo, DR)
  - Backend APIs with Node.js/NestJS for BANTRAB (major financial services client), core banking systems
  - Data access layers with Oracle DB and TypeORM
  - Unit and integration tests with Jest
- **Software Engineer** (Sep 2023 - Aug 2025) - **OpSec Security** (US, remote)
  - Security-critical web platforms for enterprise brand protection
  - RESTful APIs for internal tools and third-party partners; Docker + Azure deployments
  - Migrated legacy Knockout.js modules to React
- **Senior Software Developer** (Aug 2021 - Sep 2023) - **Media Revolution, SRL** (DR)
  - Full-stack web + mobile (React, Next.js, React Native, Node.js, ASP.NET Core, PostgreSQL)
  - Real-time systems with WebSockets/Socket.io; REST and GraphQL APIs
  - Led blockchain integration initiative; mentored juniors, ran code reviews; AWS + CI/CD optimization
- **ACD / Web Developer** (Dec 2016 - Aug 2021) - **OPITEL (Claro RD)** (Santo Domingo, DR)
  - Internal web apps ("Claro Ayuda") for major telecom, thousands of daily users (C#, ASP.NET, SQL Server)
  - Automated reporting pipelines, replaced manual email-based data workflows

### Technical Skills
- **Primary:** TypeScript/JavaScript, Node.js, NestJS, React.js, Next.js, REST/GraphQL, PostgreSQL, SQL Server, Docker
- **Secondary:** C#/ASP.NET Core, Python, React Native, Oracle DB, MongoDB, Socket.io/WebSockets, Kubernetes, RabbitMQ, Redis, Go, Bun (light)
- **Domain:** Banking/financial services systems, brand-protection/security platforms, telecom operations tooling, real-time systems
- **Software:** Azure, AWS, Firebase, Cloudflare, Git, Jest, TypeORM, Postman, Agile/SCRUM

### Certifications
- **English Advanced Certificate** - American Dominican Cultural Institute - completed Feb 2022

### Publications
- None

### Awards
- None recorded

### Behavioral Profile
- **Innovation-driven** - tracks and adopts emerging tech (Go, Bun, Cloudflare; led blockchain adoption) *[inferred from documents]*
- **Mentor / quality advocate** - code reviews, junior mentoring, continuous improvement culture *[inferred from documents]*
- **Strengths:** cross-functional collaboration, translating business requirements into technical solutions, legacy modernization
- **Growth areas:** (not yet assessed - fill in via /setup --section behavioral)
- **Thrives in:** remote Agile/SCRUM teams, modern-stack product work

### What Excites You
- Greenfield work with modern tech (Go, Bun, new frameworks)
- Fintech/banking domain depth
- Real-time and high-scale systems
- Leadership/mentoring growth toward Tech Lead

### Target Sectors
- Remote-first tech companies: GitLab, Automattic, Deel, Remote.com and similar
- Fintech/banking: building on current BANTRAB experience
- Any sector with senior full-stack/backend TypeScript roles (remote anywhere or DR local)

### Deal-breakers
- None hard - evaluate everything, flag concerns case by case
- Salary filter: none set (skipped during setup)

## Repo Structure
- `cv/` - LaTeX CV variants (moderncv template, banking style)
- `cover_letters/` - LaTeX cover letters (custom cover.cls template)
- `.claude/skills/` - AI skill definitions for the application workflow
- `.agents/skills/` - Job search CLI tools

## Workflow for New Job Applications
1. User provides a job posting (URL or text)
2. **Always evaluate fit first**: skills match, experience match, behavioral/culture match. Present this assessment to the user before proceeding.
3. If good fit: create targeted CV (`cv/main_<company>.tex`) and cover letter (`cover_letters/cover_<company>_<role>.tex`)
4. **Verify both documents** (see Verification Checklist below)
5. Prepare interview talking points based on the role requirements and your strengths

**Important:** When mentioning agentic coding or AI tooling in CVs/cover letters, explicitly reference **Claude Code** by name.

## Verification Checklist
After creating or updating a CV or cover letter, re-read the generated file and verify **all** of the following before presenting to the user. Report the results as a pass/fail checklist.

### Factual accuracy
- [ ] All claims match actual profile (CLAUDE.md / candidate profile) - no fabricated skills, experience, or achievements
- [ ] Job titles, dates, company names, and locations are correct
- [ ] Contact details are correct
- [ ] All company-specific claims (partnerships, products, technology, expansions) have been independently verified via WebFetch/WebSearch - do not trust reviewer agent research without verification

### Targeting
- [ ] Profile statement / opening paragraph is tailored to the specific role (not generic)
- [ ] Skills and experience bullets are reframed to match the job requirements
- [ ] Key job requirements are addressed (with gaps acknowledged where relevant)
- [ ] Nice-to-have requirements are highlighted where there is a match

### Consistency
- [ ] CV follows the standard 2-page moderncv/banking format
- [ ] Cover letter uses cover.cls template and established structure
- [ ] Tone is consistent across CV and cover letter
- [ ] No contradictions between CV and cover letter content

### Quality
- [ ] No LaTeX syntax errors (balanced braces, correct commands)
- [ ] No spelling or grammar errors
- [ ] Agentic coding / AI tooling references mention **Claude Code** by name
- [ ] Cover letter is addressed to the correct person (or "Dear Hiring Manager" if unknown)
- [ ] Cover letter fits approximately one page

### Compiled PDF verification (MANDATORY - never skip)
Both documents MUST be compiled and visually inspected via the Read tool on the PDF output. "Looks fine in the .tex" is not acceptable - LaTeX page-break decisions are unpredictable. Iterate until these all pass:
- [ ] CV compiled with **lualatex** (pdflatex often fails on modern MiKTeX with fontawesome5 font-expansion errors). Cover letter compiled with **xelatex** (cover.cls requires fontspec).
- [ ] **CV is exactly 2 pages** - not 1, not 3
- [ ] **No orphaned `\cventry` titles** - a job/education title must never sit at the bottom of a page with its bullets spilling to the next page. Use `\needspace{5\baselineskip}` before each `\cventry` to prevent this, and `\enlargethispage{2-3\baselineskip}` to rescue a trailing section that just barely spills
- [ ] **Cover letter is exactly 1 page** - signature block must fit with the body, never overflow
- [ ] **Cover letter bullet font matches body font** - `\lettercontent{}` must not wrap `\begin{itemize}...\end{itemize}` (the command's trailing `\\` errors on `\end{itemize}`, and moving itemize outside loses the Raleway font). Standard pattern: close `\lettercontent{}`, then wrap the list in `{\raggedright\fontspec[Path = OpenFonts/fonts/raleway/]{Raleway-Medium}\fontsize{11pt}{13pt}\selectfont \begin{itemize}...\end{itemize}\par}`

### ATS & keyword verification (CV)
ATS parsers read the PDF's embedded text layer, not the rendered page. Extract it with `pdftotext -layout` and verify what a parser sees. `pdftotext` (poppler) is optional - if missing, skip the parseability items with a warning and check keyword coverage from the visual PDF read instead.
- [ ] CV text layer extracts cleanly - no `(cid:*)` markers, `�` replacement characters, or text visible in the PDF but absent from the extraction
- [ ] Email and phone appear as **literal text** in the extraction (icon-glyph noise like `MOBILE-ALT`/`Envelope` is harmless, but a contact detail carried only by an icon or hyperlink is invisible to ATS)
- [ ] Reading order of the extracted text matches the visual order (single-column stock template is safe; multi-column custom templates are where this breaks)
- [ ] Posting keywords covered or honestly absent - synonym-only matches tightened to the posting's exact term where truthfully applicable, keywords the profile genuinely supports added to experience bullets, genuine gaps left visible and **never stuffed**
