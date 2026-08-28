# Claude Memory — Ashby Screener Rules

## Ashby Screener — Source of Truth

The **Ashby Screener web UI** (`http://localhost:3131`) is the canonical screening tool and source of truth for all scoring decisions. When scores from automated Node.js runs (screen-keith.js, screen-sr-tpm.js, etc.) disagree with scores produced by the Ashby Screener, the Ashby Screener is correct.

When a candidate is scored differently by the automated run vs. the Ashby Screener:
1. Trust the Ashby Screener score
2. Add the candidate as a calibration example in the relevant `criteria/*.js` file to prevent future misscores
3. The criteria files are the shared prompt for both the Ashby Screener and all automated scripts — fixing the criteria fixes both

**Known calibration gaps that caused automated over-scoring:**
- Jaclyn Waters (EA/The Sims 4): automated scored 4, correct is 2 — internal ops at a consumer company ≠ consumer product TPM
- Gabrielle Michel (Microsoft Surface/Xbox): automated scored 3, correct is 2 — consumer hardware ≠ consumer software/digital product

---

## Ashby Stage Moving Rule (applies to ALL jobs)

When moving candidates in Ashby after screening:
- **Only move candidates who are currently in "Application Review" stage**
- **Never move candidates in any other stage** (e.g. Recruiter Screen, HM Interview, Offer, etc.) — regardless of score
- Always check `app.currentInterviewStage?.id` against the Application Review stage ID before calling `/application.changeStage`

**Score routing (applies to ALL roles):**
- Score 1 or 2 → **To Be Archived & Dispo** (pipeline stage — NO `archiveReasonId` needed)
- Score 3 or 4 → **HM Resume Review** (NOT HM Interview — these are different stages)

**"To Be Archived & Dispo" vs "Archived":**
- "To Be Archived & Dispo" = regular pipeline stage. No `archiveReasonId`. Use this.
- "Archived" = terminal stage that closes the candidate. Never use this in move scripts.

This rule applies regardless of which job is being processed.

---

## Ashby API Notes

- Stage lookup via `/interviewStage.list` does NOT work — returns `invalid_input`
- Stage IDs must be read from application objects returned by `/application.list`
- Auth: Basic auth with `ASHBY_KEY + ":"` base64 encoded
- Pagination: use `cursor` + `moreDataAvailable` from `/application.list`
- Rate limit: 150ms sleep between `/application.changeStage` calls

## Known Ashby Job IDs

- Product Ops (Ed): `6d148a63-d9e2-48ad-910c-465ada648b4d`
- Sr. Manager TPM (Ed): `59d95ceb-ba5e-4c01-8c05-c99076529012`
- Sr. PM (Jordan) — OLD req: `fb14d682-a04b-4db4-aed3-eed210e1673b`
- Sr. PM (Jordan) — NEW req (active): `46206300-60c0-40f4-9d0a-c485be88f0fa`
- Staff SWE (Mitch): `203af220-b197-4a58-827f-072cb1ae0611`
- SWE II Frontend (Andre): `9f586f41-2073-4def-a595-9d4b885f1e10`
- Staff SWE Backend (Keith/Fable): `751790c7-b317-4ae8-8638-a4998f0ba8d1`
- Sr. TPM (Ed) — IC role, NOT Sr. Manager TPM: `c77a45c6-9bc8-4758-a584-ee7433a45f31`

## Known Brainner Job Slugs

- Product Ops (Ed): `957115f1-3544-4956-afaf-59817757e0e5`
- Sr. Manager TPM (Ed): `b46b4a19-16f8-4b5c-abfe-dcc42ff90175`
- Sr. PM (Jordan) — OLD req: `3db395e9-4c4a-4461-a73b-2fbe37021371`
- Sr. PM (Jordan) — NEW req (active): `41ff6b62-c6b9-4edb-b9f3-5a8b52e22ca4`
- Staff SWE (Mitch): `3123535d-a45c-43e6-8f44-7ae37f8df0f4`
- SWE II Frontend (Andre): `fdc5a393-a00a-43b2-ac8c-048211dfebec`
- Staff SWE Backend (Keith/Fable): `75705b19-36ea-4975-b0ee-4e77d761fbd1`
- Sr. TPM (Ed) — IC role, NOT Sr. Manager TPM: `677da035-8131-484a-a95d-ca83553b1197`

## Known Stage IDs (job-specific — NOT shared across jobs)

### Sr. Product Manager (Jordan) — `fb14d682-a04b-4db4-aed3-eed210e1673b`
- Application Review: `8f5b5a50-07f2-4006-930b-328fa84b91c2`
- To Be Archived & Dispo: `4a58c5ee-1cd0-4f1c-aeea-f1111255edfa`
- HM Resume Review: `6d9ae6d0-7c2a-4a68-8e63-c5cefe977d9d`
- Secondary Review: `cfd85cea-0bb7-4f27-8feb-ef550cd67f02`
- Recruiter Screen: `ef30efb3-548f-4bbf-924a-76142c1715c1`
- HM Interview: `(not used — do not confuse with HM Resume Review)`

### Sr. Manager TPM (Ed) — `59d95ceb-ba5e-4c01-8c05-c99076529012`
- Application Review: `0e18ff5d-2c75-4ac3-8e01-70cb3d009084`
- To Be Archived & Dispo: `d0f6e06f-b17e-4957-8946-7be6384c680c`
- HM Resume Review: `f52e9001-be6c-401f-a9f4-4b2822ae1a84`
- Recruiter Screen: `52b8eb7c-1475-4c63-936b-dd6fa50e550d`
- New Lead: `19670d89-91ce-47fb-8b46-bf7981fe16a4`
- Archived (terminal — do NOT use): `b0d125bd-308e-4ac1-9953-4a3669b5ba6a`

### SWE II Frontend (Andre) — `9f586f41-2073-4def-a595-9d4b885f1e10`
- Application Review: `c78e9744-1559-4001-99ad-fa4d083fe679`
- To Be Archived & Dispo: `fa02c188-64fb-4362-8c89-d59e76d615ee`
- HM Resume Review: `edee2cc4-9e2b-45aa-a21c-497c6c9b06dc`
- New Lead: `5b2916ac-7771-4025-9b05-70cd006c1d96`
- Recruiter Screen: `3e40b0ca-d3cb-4391-83db-cc5c3141d21d`
- HM Interview: `6f6e33f4-6862-460f-a52e-2c1b64244ab1` (do NOT confuse with HM Resume Review)
- Archived (terminal — do NOT use): `28c82247-ebc6-48bd-967c-950224c1f181`

### Staff SWE Backend (Keith/Fable) — `751790c7-b317-4ae8-8638-a4998f0ba8d1`
- Application Review (primary): `48b9cd47-2727-45a1-8718-0ba07482df46` (1131 candidates)
- Application Review (secondary pipeline): `942880bf-abc7-4d68-b3ba-a8eafe5b23e0` (46 candidates)
- To Be Archived & Dispo: `b130fb25-4d5f-4af5-a00e-ca85fc24912f`
- Recruiter Screen: `dc81064a-7cda-40a6-8bbe-f535454fa360`
- Hiring Manager Resume Review: `93fe4aae-8b25-4bb2-8d7d-ec8a63fda4ed`
- Hiring Manager Interview: `702981e6-948e-49fe-b549-acd397dce0af`
- Technical Screen: `ea2b05b9-7033-46e4-9099-1ba3152f62a8`
- Archived (terminal — do NOT use): `f5a677f6-3d30-4627-975d-1fe5e45def40`
- NOTE: Two Application Review IDs exist — move script checks both. Confirmed via probe-keith-stages.js 2026-08-13

> RULE: Always hardcode stage IDs — never use dynamic discovery. Stage IDs are job-specific and not shared across roles.

---

## Live HTML Report — REQUIRED for every screener script

Every screening script must generate a live HTML report that auto-refreshes every 4 seconds while running. This applies to ALL jobs, every run, no exceptions.

Required:
- `HTML_FILE = path.join(__dirname, "<role>-report.html")`
- HTML helper functions: `esc()`, `scoreColor()`, `scoreBg()`, `scoreBorder()`, `scoreEmoji()`, `buildHTML()`, `writeHTML()`
- Call `writeHTML([], total, 0, true)` before the loop starts, print the file path to console
- Call `writeHTML(results, total, rank, rank < total)` after each candidate is screened
- Call `writeHTML(results, total, total, false)` after the loop ends to mark complete
- The HTML auto-refreshes via `<meta http-equiv="refresh" content="4">` when `running=true`
- Candidates grouped by score (4→3→2→1) with color-coded cards showing name, location, Brainner score, our score, summary, top strength, top concern

---

## Brainner API Notes

- Endpoint: `admin.brainner.ai/api/candidates`
- Auth: Bearer JWT
- Paginate with `pagination[page]` + `pagination[pageSize]` (max 200 per page)
- Filter by job: `filters[Job][Slug][$eq]`
- Filter "To Review" candidates: `filters[Status][$eq]: "evaluated"` — Brainner's internal name for "To Review" is "evaluated"
- Always sort high to low: `sort: "Score:desc"`
- Always paginate through ALL pages — do not assume first page is complete
- Cache screened candidates in `prod-ops-cache.json` keyed by email
- Filter out cached emails AND statuses `["shortlisted", "rejected", "hired", "archived", "disqualified"]` BEFORE slicing to TOP_N

---

## Scoring

- Score 1 = Hard no
- Score 2 = No (archive)
- Score 3 = Maybe / borderline
- Score 4 = Strong yes
- Score 5 = Exceptional

## Andre SWE II — Consumer-Facing Is NOT a Hard Gate

**Do NOT apply the TPM consumer-facing hard gate to Andre's SWE II role.**

- TPM (Ed): consumer-facing product experience = **hard gate** — B2B only = score 2, no exceptions
- Andre SWE II: consumer-facing product experience = **NOT a hard gate**
  - A strong frontend engineer who shipped real product UI at a B2B company **can score 3 or 4**
  - The concern is a career entirely in frontend architecture, marketing sites, or B2B admin tooling with NO real product UI surface — that's a **2**, not a 1
  - B2B-only career = score 2 concern, never score 1
  - Never disqualify a candidate solely because they lack consumer company experience

**Growth engineering trumps company type:**
- Growth engineering experience (A/B testing, signup flows, activation, conversion, trial-to-paid) at ANY company — including B2B — can score 3 or 4
- Career entirely in B2B admin dashboards / internal tooling with no product surface and no growth signals = cap at 2
- B2B company background alone is never a disqualifier — read the actual work

---

## Sr Manager TPM — Management Experience Rule

- **Influence/mentorship only** (leading tiger teams, cross-functional influence, mentoring, no direct reports) → **automatic 3 cap**, no exceptions, regardless of how strong the rest of the profile is
- **Explicit direct reports** (even a team of 1, must use language like "managed", "direct reports", "people manager") → can qualify for 4 if all other criteria met
- When in doubt: no explicit management language = treat as influence-only = cap at 3

**Calibration example — Orin Orlopp (Disney/NBCUniversal/Amazon Prime Video):**
Disney+, Peacock, Prime Video consumer streaming TPM with 10+ years. Led 500+ stakeholder launches, formed 35-engineer tiger team, quantified outcomes throughout. Strong on every dimension EXCEPT management — no direct reports anywhere on resume. Score = **3** (automatic cap due to management rule).
