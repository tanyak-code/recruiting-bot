# LinkedIn Screener Extension — Full Technical Spec
## Built for: Scribd Recruiting · Tanya Chawla
## Reference implementation: Ashby/Brainner Autoscreener

This document is a complete spec for recreating the autoscreener as a LinkedIn Chrome extension. It includes the scoring criteria, Claude prompt architecture, and all calibration examples for both roles.

---

## SYSTEM OVERVIEW

The existing autoscreener does this:
1. Pulls candidate resume JSON from Brainner's API
2. Passes resume text + role criteria into Claude Sonnet via the Anthropic API
3. Gets back structured JSON: `{ score, scoreLabel, summary, topStrength, topConcern }`
4. Displays color-coded cards in an HTML report (green=4, blue=3, yellow=2, red=1)

The LinkedIn extension should do the same thing but triggered from a LinkedIn profile page with a single click:
1. Scrape the visible profile DOM (name, headline, location, experience section, skills)
2. POST to Claude API with the same role criteria and prompt structure
3. Render the result as an overlay/sidebar on the profile page

---

## CLAUDE API CALL STRUCTURE

### Endpoint
```
POST https://api.anthropic.com/v1/messages
Headers:
  x-api-key: <ANTHROPIC_KEY>
  anthropic-version: 2023-06-01
  content-type: application/json
```

### Payload
```json
{
  "model": "claude-haiku-4-5-20251001",
  "max_tokens": 1024,
  "messages": [{ "role": "user", "content": "<prompt>" }]
}
```

> **IMPORTANT — token length**: Use at least `max_tokens: 1024`. Using 600 caused JSON truncation errors where responses were cut mid-object and defaulted to score 2. 1024 is the safe minimum.

> **Model note**: The Fable model (claude-haiku-4-5-20251001 / Haiku) works fine for screening IF you use 1024+ max_tokens and include robust JSON extraction on the response. For higher accuracy, use claude-sonnet-4-20250514. Sonnet costs ~10x more but has significantly fewer parse errors and better nuance on borderline cases.

### JSON Extraction (critical)
The model sometimes returns JSON wrapped in markdown code fences. Always strip and extract:
```javascript
const raw = response.content[0].text;
const cleaned = raw.replace(/```json|```/g, "").trim();
const match = cleaned.match(/\{[\s\S]*\}/);  // extract JSON even if there's surrounding text
const result = match ? JSON.parse(match[0]) : fallback;
```

### Expected Response Schema
```json
{
  "name": "Full Name",
  "score": 3,
  "scoreLabel": "Yes",
  "recommendedRole": "Keith (Python) | Kat (Ruby) | Either — probe language preference in screen",
  "summary": "2-3 sentences citing specific evidence — years of experience, stack, scope, cloud ops, product orientation.",
  "topStrength": "Single strongest signal with evidence",
  "topConcern": "Single biggest gap, or empty string if score 4",
  "prescreenQuestions": ["Question 1 based on topConcern", "Question 2", "Question 3"]
}
```

> **`recommendedRole`**: Only used for the Staff SWE Backend (Keith/Kat) role. Omit for all other roles. Value must be one of: `"Keith (Python)"`, `"Kat (Ruby)"`, or `"Either — probe language preference in screen"`.

> **`prescreenQuestions`**: 2-3 short questions derived from the candidate's specific `topConcern`. Do NOT use generic questions — generate questions that will directly validate or refute the identified gap. Example: if `topConcern` is "No Staff-level signals — no evidence of owning a technical roadmap," a good prescreen question is "Can you walk me through a time you originated a technical initiative — from the idea through to production — and what resistance or tradeoffs you navigated?" NOT "Tell me about your leadership experience."

---

## SCORING FRAMEWORK (universal across roles)

```
4 = Strong Yes    (green)   — Move forward, meets all criteria
3 = Yes           (blue)    — Strong candidate, missing one signal — probe on screen
2 = No            (yellow)  — Does not meet core requirements — archive
1 = Strong No     (red)     — Immediate disqualifier present — skip
```

**For TPM role only**, there is an additional label:
```
3M = Yes (Management Cap) — Would be a 4 but no explicit direct report language anywhere on resume
```

---

## PROMPT ARCHITECTURE

Every Claude prompt has this structure:

```
TODAY'S DATE: {today} (year: {currentYear}, month: {currentMonth}).

TENURE CALCULATION RULES (mandatory):
- "Present" or "Current" always means {currentYear} for year-level calculations
- Example: "2022 – Present" = {currentYear} − 2022 = {X} years.
- Round down to full years only. Never use a year before {currentYear} for "present" roles.
- Do NOT flag future end dates on current roles as a concern.

[ROLE-SPECIFIC PREAMBLE — see below per role]

{FULL CRITERIA TEXT}

CANDIDATE PROFILE:
{scraped LinkedIn text, max 8000 chars}

Respond ONLY with a JSON object, no markdown:
{
  "name": "<full name>",
  "score": <1|2|3|4>,
  "scoreLabel": "<Strong No | No | Yes | Strong Yes>",
  "recommendedRole": "<Keith (Python) | Kat (Ruby) | Either — probe language preference in screen>",
  "summary": "<2-3 sentences: cite specific evidence>",
  "topStrength": "<single strongest signal with evidence>",
  "topConcern": "<single biggest gap, or empty string if score 4>",
  "prescreenQuestions": ["<question 1 directly tied to topConcern>", "<question 2>", "<question 3>"]
}

> NOTE: `recommendedRole` is only used for the Staff SWE Backend (Keith/Kat) role — omit for all other roles.
> `prescreenQuestions` must be specific to this candidate's actual gap (topConcern), NOT generic. If topConcern is "No Staff-level signals," ask about zero-to-one technical initiative ownership. If topConcern is "Amazon silo," ask about cross-functional collaboration breadth. Never generate questions about Python if the candidate is a Ruby-primary engineer — their relevant concern would be something else entirely.
```

---

---

# ROLE 1: SR. MANAGER, TECHNICAL PROGRAM MANAGEMENT
## Hiring Manager: Ed / Scribd

---

## ROLE-SPECIFIC PROMPT PREAMBLE (add before criteria)

```
TPM TITLE TENURE — SCAN ALL ROLES (mandatory):
- Before making any claim about TPM tenure, scan EVERY role in the work history and list all roles whose title contains "Technical Program Manager", "Technology Program Manager", "TPM", or similar.
- Sum the years across ALL such roles in the entire career, not just the most recent ones.
- A candidate with TPM titles at multiple companies (e.g. Chase 2018–2020, Amazon 2020–2022, Datadog 2022–2024, SoFi 2024–present) has ~7+ years in TPM titles — do not claim "2 years" because you only counted the most recent role.
- Engineering Manager, Software Engineer, or other non-TPM titles at earlier companies do NOT cause you to ignore TPM titles that came after them.

You are a strict senior technical recruiter screening for a Senior Manager, Technical Program Management role. Apply the criteria precisely — do not give benefit of the doubt.
```

---

## FULL TPM CRITERIA (paste verbatim into prompt)

```
ROLE: Senior Manager, Technical Program Management
HIRING MANAGER: Ed / Scribd

---------------------------------------
4-POINT SCORING SCALE
---------------------------------------

4 = Strong Yes
ALL of the following must be true:
- TPM experience (not just PM, EM, or Chief of Staff unless clearly TPM scope)
- 4+ years explicitly in a TPM or Senior TPM title — prior years as engineer, analyst, project manager, or scrum master do NOT count toward this threshold
- Data-driven resume with quantified outcomes, metrics, KPIs. Vague accomplishments = not a 4
- DIRECT management experience: has explicitly managed at least one direct report (TPM, PM, or technical staff). Leading a tiger team, influencing without authority, or mentoring does NOT count.
- Cross-functional program experience across Product, Design, and Engineering — does not need to be explicitly named if consumer product experience is clearly present; implied collaboration is acceptable
- Consumer-facing product experience in the most recent 3 years (see definition below)
- FAANG or similar scale is a boost signal only — FAANG brand alone does not compensate for wrong functional profile or missing consumer product experience

3 = Yes
Strong candidate missing ONE signal (use scoreLabel "Yes" for all of these):
- Consumer product experience present within the last 7 years but NOT in the most recent 3 years — this is a 3, NOT a 2. Example: Amazon Alexa TPM role ending in 2022 scores 3 in 2026 (4 years ago = within 7-year window).
- OR management experience is light (had 1-2 direct reports only)
- OR company scale is smaller but all other signals are strong
- OR cross-functional scope is implied but overall profile is strong
- If borderline 3.5, say so in summary with reason

CONSUMER PRODUCT RECENCY RULE:
- Last 3 years = qualifies for 4 (if all other gates pass)
- Last 4–7 years = floor of 3, cannot be a 4, cannot be a 2 solely on recency
- More than 7 years ago with nothing consumer-facing since = treat as absent = 2
- Do NOT score a 2 solely because consumer product experience was 4–6 years ago. That is a 3.

HARD GATE — no consumer product experience = 2, no exceptions:
- A career dominated by infrastructure, platform, tooling, SRE, observability, foundational systems, or internal engineering work = 2, regardless of company name or seniority
- This gate is not softened by the recency rule above. The recency rule only applies when the candidate HAS real, substantive consumer TPM experience somewhere in their career — just not recently enough for a 4.
- A candidate who spent their entire career on infra/platform/SRE with one brief consumer-adjacent project 6 years ago is still a 2. The consumer experience must be a meaningful part of their TPM identity, not a footnote.
- Infrastructure / platform / tooling / SRE / observability / cost optimization / foundational systems = does NOT count as consumer product experience, even at a consumer company.

3M = Yes (Management Cap) — use scoreLabel "3M" (score still = 3) ONLY when ALL of the following are true:
- The candidate passes every other gate for a 4: strong consumer product, quantified outcomes, cross-functional TPM scope
- The SOLE reason they cannot be a 4 is the management cap — no explicit direct report language anywhere on the resume
- Leading tiger teams, cross-functional influence, or mentoring = still capped at 3M (not 4)
- If they're missing ANYTHING else besides management, use "Yes" not "3M"

2 = No
- No consumer-facing product experience (see definition below)
- B2B only, migration only, platform only, marketing only, infrastructure only
- Security-focused or compliance-focused TPM background
- Backend/analytics-only focus with no consumer product surface
- Engineering Manager or TPM who only operated within engineering orgs
- Pure project coordination with no program ownership
- No management experience
- FAANG brand present but functional work is backend, security, platform, or infra = still a 2
- Under 4 years in a TPM or Senior TPM title (prior years as engineer, PM, analyst, project manager, or scrum master do not count)

1 = Strong No
Any disqualifier present

---------------------------------------
CONSUMER-FACING PRODUCT — DEFINITION
---------------------------------------

Consumer-facing means products used by the general public at scale.

COUNTS as consumer-facing:
- Mass consumer apps: Cash App, Venmo, Spotify, Netflix, Instagram, TikTok, Reddit
- Gaming products (consumer entertainment at scale)
- Consumer content/media/reading: Kindle, Audible, Scribd, YouTube
- Consumer marketplaces: Amazon retail, eBay, Etsy, Airbnb
- Consumer-facing surface of an otherwise enterprise product — ONLY if they explicitly worked on the user-facing layer

DOES NOT count as consumer-facing:
- B2B tools: Salesforce, HubSpot, Shopify, Workday
- Regulated fintech: TurboTax, banking platforms, mortgage/lending tools
- Healthcare apps, even if patient-facing
- Educational/institutional platforms: Scholastic, university systems
- Platform, architecture, or infrastructure work at any company
- Enterprise products with a consumer-adjacent layer, unless the candidate explicitly worked on that layer

CRITICAL — READ THE WORK, NOT THE BUZZWORDS:
Do NOT require candidates to explicitly mention "product teams," "PM collaboration," or "cross-functional" in their resume. Many strong TPMs write lean resumes that describe WHAT they shipped, not WHO they partnered with. Your job is to read the work descriptions and infer whether the work is consumer-facing based on what was actually built.

Ask yourself: does the work described touch something an end user sees, interacts with, or experiences? If yes = consumer product experience. If no = not.

QUALIFIES — work that touches end users, even if PM/design/cross-functional teams are never mentioned:
- "Led Amazon Homepage redesign" = YES — the homepage is what consumers see
- "Launched [app feature / UX change / new product capability]" = YES — consumers use it
- "Drove delivery of mobile app experience for X million users" = YES
- "Shipped Alexa feature for Echo devices" = YES — consumer hardware/software
- "Led roadmap for streaming platform features on Disney+" = YES

DISQUALIFIES — work that is internal, technical, or never seen by end users:
- Resume dominated by "governance," "operating model," "infrastructure," "platform," "risk detection," "compliance," "Agile transformation," "observability," "cost optimization," "SOX controls," "data pipelines," "internal tooling" = platform/ops/process profile, not consumer product
- Amazon Prime on the resume ≠ consumer product experience if the actual work is ML infrastructure, personalization backends, or engineering org operations
- Google Chrome on the resume ≠ consumer product experience if the work is platform governance, developer APIs, or privacy frameworks
- Uber on the resume ≠ consumer product experience if the work is fraud detection, payments infrastructure, or risk systems
- The consumer brand is irrelevant. The functional work is what counts. Read the bullet points, not the company name.

EDGE CASES:
- TurboTax = NO (business-level customers, not mass consumer)
- Cash App / Venmo = YES (mass consumer)
- Kindle = YES
- Scholastic = NO
- Gaming = YES
- Amazon Prime (ML infra/personalization backend) = NO — platform work, not consumer product delivery
- Google Chrome (platform governance/developer APIs) = NO — platform, not consumer product

---------------------------------------
MANAGEMENT EXPERIENCE RULE
---------------------------------------
- Influence/mentorship only (leading tiger teams, cross-functional influence, mentoring, no direct reports) → automatic 3 cap, no exceptions, regardless of how strong the rest of the profile is
- Explicit direct reports (even a team of 1, must use language like "managed", "direct reports", "people manager") → can qualify for 4 if all other criteria met
- When in doubt: no explicit management language = treat as influence-only = cap at 3

CALIBRATION EXAMPLE:
Orin Orlopp (Disney/NBCUniversal/Amazon Prime Video): Disney+, Peacock, Prime Video consumer streaming TPM with 10+ years. Led 500+ stakeholder launches, formed 35-engineer tiger team, quantified outcomes throughout. Strong on every dimension EXCEPT management — no direct reports anywhere on resume. Score = 3 (automatic cap due to management rule).

---------------------------------------
CALIBRATION EXAMPLES
---------------------------------------

SCORE 1 - Bhavika Banwari (2K Games/Rockstar Games):
10+ years TPM experience, managed 45+ person QA org, shipped major AAA titles (Civ 7, RDR2, GTA 5). Score 1. Reason: Entire career is QA program management — testing, quality assurance, release validation. QA TPM and product TPM are different functions. Despite consumer gaming context, the work is internal QA operations, not cross-functional product program management.

SCORE 3 - Renee Chorney (Unity/Fastly/Twitter):
Strong TPM, built teams, senior level. Consumer product present. Score 3.

SCORE 3 - William Gambling (Peloton/OnDeck):
Built TPM function from scratch, managed 10 TPMs, consumer products (Peloton). Score 3.

SCORE 4 - J. Ryan Steffen (Amazon/SunPower):
Data-driven throughout with quantified outcomes. Managed TPMs. Cross-functional at scale. Amazon consumer devices. Score 4.

SCORE 2 - Kiran Kumar Bhanja (Amazon Prime/AWS S3/Amazon Finance):
Amazon lifer, Prime Personalization AI/ML, S3, Oracle Financials, Kindle Device. Looks like a consumer 4 on paper. Score 2. Reason: Every role is infrastructure, platform, or operations — S3 storage engineering, Oracle DB SOX controls, device observability tooling, finance ledger systems. Despite Amazon Prime and Kindle in the title, there is no evidence of working WITH product managers to define and ship consumer-facing product features. Consumer brand ≠ consumer product experience.

SCORE 2 - Tarek ElBahnasawy (Google Chrome/Uber Fraud/IBM Government/Western Union):
20+ years, managed 5 TPMs at Uber. Score 2. Reason: Every role is process-heavy and governance-heavy — Chrome platform governance, privacy-by-design frameworks, fraud/risk detection systems, payment compliance, federal government modernization. "Governance framework," "operating model," "Agile transformation," "regulatory compliance" dominate the resume. This is a process architect, not a product-shipping TPM. Large company + recognizable name ≠ consumer product TPM experience.

SCORE 2 - Lauren Abrams (WBD/Disney Streaming/Expedia):
Consumer streaming TPM (Disney+, HBO Max), staff-level background. Score 2. Reason: No AI mention anywhere on resume — hard disqualifier. Also under 2 years in actual TPM title before current role; prior experience was project manager and scrum master level, not senior TPM program ownership.

SCORE 2 - Michael Goldner (Amazon Astro/Alexa/Klaviyo):
25+ years TPM, managed 20 TPMs at Amazon, consumer devices (Echo Show, Astro). Score 2. Reason: No AI mention anywhere on resume — hard disqualifier regardless of pedigree. Also 2 months into a new role at time of application.

SCORE 2 - Sudar Akkala (GoPro/Harman/Qualcomm):
20 years TPM experience, managed large global teams, strong execution track record. Score 2. Reason: Entirely hardware/embedded firmware context (action cameras, automotive IVI, mobile SoC). No consumer software product experience.

SCORE 2 - Vipul Panchal (Amazon/Wells Fargo):
Amazon Shopping TPM with Gen-AI experience. Score 2. Reason: Only 3 years as a TPM — under the 4-year TPM title threshold. Prior 16 years spent as software engineer and architect. No experience managing or coaching TPMs.

SCORE 2 - Casey Charlton (Meta Globalization/River Linguistics):
Strong operator, 9 years at Meta. Score 2. Reason: Career is predominantly vendor management, internationalization, and localization platforms — not consumer product feature delivery. Wrong functional domain.

SCORE 2 - Jaclyn Waters (EA / The Sims 4):
Engineering Development Director / Sr TPM at EA Maxis on The Sims 4. Score 2. Reason: The entire body of work is internal: engine modernization (DirectX 11 migration), internal tooling, developer workflow, content pipeline improvements, Jira architecture redesign, agile transformation. "The Sims 4" is a consumer product but she did not work WITH product managers to ship consumer-facing features. Ops/tooling at a consumer company ≠ consumer product TPM experience.

SCORE 2 - Rodion Gusev (Pinterest / Instapaper):
Sr Manager TPM at Pinterest leading 30 TPMs across support systems, tooling, and data governance. Score 2. Reason: Functional work is support operations infrastructure — internal support platform, ticket automation, appeals flows, routing models, compliance tooling. Pinterest is a consumer company; support systems are not consumer product. Also only 3 years in explicit TPM title (prior 6 years were Business Analyst and Support Ops — don't count).

---------------------------------------
MUST-HAVES (required for 3 or 4)
---------------------------------------
- TPM scope (can include Chief of Staff or Head of Operations if clearly cross-functional)
- 4+ years explicitly in a TPM or Senior TPM title — prior years as engineer, PM, analyst, project manager, or scrum master do NOT count
- Consumer-facing product experience as defined above — this is the primary gate
- Program ownership, not just coordination or task management

---------------------------------------
NICE-TO-HAVES (push 3 to 4)
---------------------------------------
- FAANG or similar large-scale tech company (boost only — not a gate)
- Direct management of TPMs or technical staff
- Data-driven resume with quantified outcomes
- Owns annual planning and OKR-to-roadmap translation
- Consumer product in most recent role
- AI tooling or AI product experience

---------------------------------------
DISQUALIFIERS = score 1
---------------------------------------
- Purely project coordination, no program ownership
- No consumer-facing product experience at all
- B2B only, platform only, migration only, infra only, security only
- No technical fluency whatsoever
- Under 4 years in a TPM or Senior TPM title
- QA TPM as primary function
```

---

---

# ROLE 2: STAFF SOFTWARE ENGINEER, BACKEND (FABLE CORE)
## Hiring Managers: Keith (Python focus) and Kat (Ruby focus) / Scribd

---

## ROLE-SPECIFIC PROMPT PREAMBLE (add before criteria)

```
You are a strict senior technical recruiter screening for a Staff Backend Software Engineer role at a small, product-focused startup. This is a high bar role — most candidates will NOT pass.

CALIBRATION:
- Score 4: rare — ALL hard requirements met with explicit evidence including staff scope, production cloud ops, incident ownership, product orientation, and ideally agentic engineering
- Score 3: strong candidate missing exactly ONE signal, or staff scope implied not explicit
- Score 2: correct score for candidates who are too junior, too infra-only, FAANG-siloed (especially Amazon-only), or lack product orientation
- Score 1: immediate disqualifier present (under 5 yrs, frontend/mobile only, data eng / ML eng / pure DevOps, govt/regulated only, 4+ short tenures)
- When in doubt, score lower

AMAZON NOTE: Amazon as sole or primary employer is a flag — likely siloed. Cap at score 3 unless there is explicit cross-functional TDD ownership or product partnership language. Amazon as one of several employers is fine.

ROUTING NOTE: This role has TWO hiring managers. Always determine which fits better based on primary language:
- Primary language Python/Django → recommend Keith's team
- Primary language Ruby/Rails → recommend Kat's team
- Meaningful experience in both → note "fits either role"
- Neither Python nor Ruby → note in topConcern, but do NOT auto-disqualify if all other signals are strong
```

---

## FULL KEITH & KAT CRITERIA (paste verbatim into prompt)

```
ROLE: Staff Software Engineer (Backend) — Fable Core at Scribd
HIRING MANAGERS: Keith (Python focus) and Kat (Ruby focus)

⚠️ ROUTING RULE — always include in your recommendedRole field and mention in summary or topStrength:
- Candidate's primary language is Python/Django → "Keith (Python)"
- Candidate's primary language is Ruby/Rails → "Kat (Ruby)"
- Candidate has meaningful experience in both → "Either — probe language preference in screen"
- Candidate is neither Python nor Ruby primary → note in topConcern (not a hard disqualifier if all other signals are strong)

DO NOT flag "No Python" as a concern for a Ruby-primary candidate. Ruby/Rails is equally valid for Kat's team.
DO NOT flag "No Ruby" as a concern for a Python-primary candidate.

Fable Core is the backend, infrastructure, and platform team behind Fable — Scribd's social reading product (1M+ MAU). The team is very small. This hire will set technical direction for the entire Fable backend.

KEY INITIATIVES:
1. GCP → AWS migration (H2 priority — must be able to lead this)
2. Making the codebase "agent-ready" — bringing agentic engineering practices into day-to-day team workflows
3. Building and owning the technical roadmap for the Fable backend platform

IMPORTANT CALIBRATION:
- Python/Django OR Ruby/Rails are the primary stacks. Python → Keith's team. Ruby → Kat's team.
- Go, Node, Java/Kotlin acceptable only if candidate also has Python OR Ruby and is open to working in it.
- Amazon background = RED FLAG. Too siloed. Mid-tier companies + startup experience strongly preferred.
- Product sense is REQUIRED — pure infra engineers with no product curiosity don't fit this team.
- Small team / startup mentality required — this person needs to own a lot and operate autonomously.
- Agentic engineering (real AI coding tool use in production, not just awareness) is a KEY differentiator.
- Experience floor: JD says 10+, confirmed OPEN TO 8+ years.

---------------------------------------
WHAT SEPARATES A 3 FROM A 4
---------------------------------------

A candidate who meets all the base requirements (experience, stack, cloud ops, incident ownership, product sense, agentic engineering) scores 3. To reach 4, they must show evidence of the following:

- Mentoring: actively growing other engineers (junior or mid), giving career guidance, building the team
- Working across teams: driving alignment with multiple engineering teams, product, design, data science, or leadership — not just executing within their own team
- Leading technical initiatives from zero to one: originated the idea, got buy-in from stakeholders and team members, drove it through ambiguity to production
- Technical thought leadership: developing and improving engineering processes and procedures; setting standards the team adopted
- Business impact awareness: demonstrates a clear sense of how their work added value beyond what was already happening — WHY it mattered, not just WHAT was shipped

Absence of these signals does NOT drop someone to a 2. They are purely upward pressure from 3 → 4.

---------------------------------------
4-POINT SCORING SCALE
---------------------------------------

4 = Strong Yes
ALL of the following must be true:
- 8+ years backend software engineering (post-grad full-time only)
- Python OR Ruby must appear somewhere on the resume — Python/Django or Ruby/Rails preferred; Go or Node also acceptable if Python or Ruby is also present
- Staff-level signals present (see WHAT SEPARATES A 3 FROM A 4 above)
- Production cloud operations at scale: OLTP databases, container orchestration (Kubernetes preferred), CI/CD pipelines, queueing — on GCP, AWS, or equivalent major cloud
- Agentic engineering: explicitly uses AI coding tools (Claude Code, Cursor, Codex, Copilot, etc.) in real production workflows
- Product orientation: not a pure infrastructure person — works with or alongside product/design teams

3 = Yes
- 8+ years backend software engineering
- Python OR Ruby appears somewhere on resume
- Strong backend generalist — production cloud, APIs, distributed systems
- Product orientation present
- Missing some of the score 4 signals (mentoring, 0→1 leadership, cross-team initiative, business impact framing) — that's fine for a 3
- Agentic engineering implied or absent — note it but don't penalize
- If borderline 3.5, call it out in summary

2 = No
- Java/Spring Boot only — no Python, no Ruby, AND no Agentic/AI experience — not a fit
- Primarily infrastructure/platform/DevOps/SRE with no product interest
- No production cloud experience at scale
- Amazon as sole employer with clearly siloed scope — caps at 2 unless strong cross-functional evidence
- Pure data engineering, ML engineering, or data science with no backend software engineering ownership
- Under 8 years backend experience
- Frontend/mobile primary with minimal backend history

1 = Strong No — IMMEDIATE DISQUALIFY
Any of the following = score 1:
- Under 5 years total backend software engineering experience
- Frontend or mobile only — no real backend ownership
- No production software systems experience (academia, non-engineering, QA only)
- Pure data engineering, ML research, or DevOps/SRE with no software development ownership
- 4+ full-time roles under 24 months in the last 7 years — job hopping disqualifier
- Government/regulated enterprise/case management/compliance/financial systems only
- 4+ full-time roles under 24 months in last 7 years

---------------------------------------
AGENTIC ENGINEERING — KEY DIFFERENTIATOR
---------------------------------------

Keith's team is actively building toward agentic engineering practices. This person will lead that effort.

STRONG signal (push toward 4):
- Explicitly mentions Claude Code, Cursor, Codex, GitHub Copilot, or similar in production work
- Has defined or led AI coding workflows or practices for a team
- Has worked on making a codebase agent-ready (well-structured, testable, documented for AI)

ACCEPTABLE signal (does not block 3):
- Uses AI tools personally but hasn't led team adoption — still positive

ABSENT (note it, not a disqualifier):
- No mention — many strong engineers don't put this on resumes yet; absence alone doesn't reduce score

---------------------------------------
PRODUCT SENSE — REQUIRED
---------------------------------------

Keith explicitly said: if someone has no interest in being close to the product, they're a poor fit. This is a backend engineering role at a consumer subscription product — the engineer does NOT need to have personally shipped consumer-facing features. They need to care about the product and be able to work with product/design teams, not be a pure infrastructure person.

PASSES (any of these):
- Works or has worked closely with PM, design, or ML partners
- Owns or has owned product outcomes alongside technical deliverables
- Shows curiosity about user behavior, metrics, or product impact anywhere on resume
- Backend work that supports consumer products (even if not directly user-facing)

RED FLAG — note in topConcern, does NOT automatically score 2:
- Career is 100% pure infrastructure/DevOps/SRE with zero mention of product teams or product context
- Explicitly frames themselves as infrastructure-only with no product interest

---------------------------------------
AMAZON FLAG
---------------------------------------

Amazon experience = flag, not auto-disqualifier.

- Amazon as ONLY or PRIMARY employer: likely siloed — flag in topConcern, cap at score 3 unless strong cross-functional evidence
- Amazon as ONE of multiple roles with strong breadth elsewhere: acceptable, note it but don't penalize
- Specific signals that Amazon background doesn't disqualify: explicit cross-team TDD ownership, product partnership language, scope beyond one service/org

---------------------------------------
CALIBRATION EXAMPLES
---------------------------------------

SCORE 2 — Moshe Leon (Fathom AI / Clarity Financial / Reforge / Mya Systems):
11 years experience, Ruby/Rails/Python/Django background, uses Cursor and Copilot, real AI integration work at Mya (LangChain, OpenAI GPT). Score 2. Reason: multiple short roles — Clarity (a few months in 2025), Reforge (2024–2025), pattern of job hopping raises concern about depth at any single company.

SCORE 2 — Datt Goswami (GI / AdHome / InvestCloud / 482 Ventures / QuillHash):
10+ years, impressive AI/Rust/agent infrastructure depth, multiple founding/first-engineer roles. Score 2. Reason: pattern of many short roles (GI Aug 2024–present, AdHome Sep 2023–Aug 2024, CTO role Jul–Aug 2023 = 2 months, InvestCloud Nov 2021–Feb 2023) — no evidence of sustained depth or impact at any single company. Founding engineer ≠ staff engineer in terms of scope and stability.

SCORE 2 — Joseph Flaherty (AllaiHealth / Self-Employed / Sciolytix):
17 years experience, strong full-stack delivery (Java, TypeScript, Node, AWS, mobile AI scribe). Score 2. Reason: 2-year self-employed consulting gap and current role at a small healthcare startup. Self-described as seeking "senior or lead role" — own summary indicates not operating at staff level. Healthcare context doesn't map well to consumer subscription product.

SCORE 3 — Andy Ratsirarson (Amazon Prime Video / Credit Karma / Udemy / Tenafli founder):
13 years, strong big tech + startup mix. Architected systems driving $1B+ revenue at Amazon Prime Video and Insurance Marketplace at Credit Karma (90M+ members). Founded and CTO'd three AI products from zero to one — real hands-on product ownership, LLM integrations, WebRTC voice, agentic tooling. Strong product sense and AI fluency. Score 3, not 4. Reason: Led two projects at Amazon as Sr Engineer but no clear Staff title track record yet. Amazon as one of multiple roles is acceptable per criteria.

SCORE 3 — Damith Ganegoda (Planyear.ai / Altrium / Limark):
14+ years Java-centric backend with strong distributed systems depth. Lead Engineer at Planyear with real AI delivery: RAG systems, document parsing pipelines, LLM integrations (OpenAI/Anthropic), SageMaker ML. Explicitly uses Cursor and Claude Code. Strong on agile leadership, mentorship, on-call, cross-functional alignment. Score 3, not 4. Reason: Java-heavy — probe on Python depth. No explicit Staff title. B2B/enterprise domain (health insurance, HR) rather than consumer product.

SCORE 4 — Daniel Stack (Mobi.AI / Perch / Indigo Ag / Toast / TripAdvisor):
15+ years, long Staff tenure across multiple companies. Python/Django primary stack. Built trip-planning systems at scale (25M+ passengers), carbon validation pipelines, forecasting suites. Incident response leadership, blameless postmortem culture, OpenAPI ownership, mentorship. LLM tooling explicitly mentioned. Strong 0→1 delivery pattern — shapes requirements through to production. Score 4. Reason: Directly relevant Django experience, staff-level ownership and breadth, variety of complex distributed systems, no Amazon silo concern.

SCORE 4 — Python/Django Staff Eng at mid-size consumer startup:
8+ years, led GCP→AWS migration, staff-level TDD and architecture ownership, incident response leadership, uses Claude Code daily, works closely with PM and ML team. Score 4.

SCORE 3 — Go/Node Staff Eng, strong ops, no Python:
Strong staff-level backend scope, distributed systems architecture, incident ownership, product-oriented. No Python but open to learning. Some agentic engineering. Score 3.

SCORE 2 — Pure SRE / Platform Eng, no product ownership:
K8s expert, CI/CD, infra at scale. Zero product work, no cross-functional collaboration, no interest in consumer product. Score 2.

SCORE 2 — Amazon SDE-III, siloed microservice:
Amazon only. Owns one service in a large org. No cross-functional work, no product context, no TDD/architecture ownership. Flag Amazon in concern. Score 2.

SCORE 1 — Data Engineer, ML Pipeline Engineer:
Spark/dbt/Airflow, model training pipelines, no backend service ownership, no API/production software engineering history. Score 1.

---------------------------------------
NICE-TO-HAVES (push 3 toward 4)
---------------------------------------
- Python/Django (Keith's team) or Ruby/Rails (Kat's team) — whichever matches the hiring manager's focus
- GCP experience (current Fable infra)
- Kubernetes / container orchestration
- Experience leading a platform migration (on-prem→cloud, AWS↔GCP, monolith→services)
- Subscription/entitlements systems (Stripe, RevenueCat, App Store / Play billing)
- Experience alongside ML teams on recommendation or feed systems
- Small team / startup experience — scrappy, broad ownership
- Social, reading, content, or community platform background

---------------------------------------
TENURE / JOB HOPPING
---------------------------------------
- DISQUALIFIER: 4+ full-time roles under 24 months in last 7 years = score 1
- RED FLAG: Average tenure under 18 months with no recent stability = max score 2
- EXCEPTION: Most recent role 3+ years redeems choppy earlier history
- Contract/consulting stints: note but don't penalize if project-scoped or company shut down

---------------------------------------
DISQUALIFIERS = score 1
---------------------------------------
- Under 5 years backend software engineering experience
- No backend production systems ownership
- Frontend or mobile only — no backend history
- Pure data engineering, ML research, DevOps/SRE only (no software development)
- Government/regulated/compliance/case management/mortgage/tax systems only
- 4+ full-time roles under 24 months in last 7 years
```

---

---

## LINKEDIN PROFILE SCRAPING — WHAT TO EXTRACT

LinkedIn profiles don't give you clean JSON like Brainner does. The extension will need to scrape the DOM. Here's what to grab:

```javascript
// Suggested scrape targets (CSS selectors approximate — LinkedIn changes these frequently)
{
  name: document.querySelector('h1.text-heading-xlarge')?.innerText,
  headline: document.querySelector('.text-body-medium.break-words')?.innerText,
  location: document.querySelector('.text-body-small.inline.t-black--light.break-words')?.innerText,
  about: document.querySelector('#about + div .full-width')?.innerText,
  experience: Array.from(document.querySelectorAll('#experience ~ div .pvs-list__item')).map(el => ({
    title: el.querySelector('.t-bold span[aria-hidden]')?.innerText,
    company: el.querySelector('.t-14.t-normal span[aria-hidden]')?.innerText,
    duration: el.querySelector('.pvs-entity__caption-wrapper')?.innerText,
    description: el.querySelector('.pvs-list__item--with-top-padding')?.innerText,
  })),
  skills: Array.from(document.querySelectorAll('#skills ~ div .pvs-list__item .t-bold span[aria-hidden]')).map(el => el.innerText),
}
```

Then flatten into a text block:
```javascript
function profileToText(profile) {
  let text = `Name: ${profile.name}\nHeadline: ${profile.headline}\nLocation: ${profile.location}\n\n`;
  if (profile.about) text += `About: ${profile.about}\n\n`;
  text += "Work Experience:\n";
  for (const job of profile.experience) {
    text += `${job.title} at ${job.company} (${job.duration})\n`;
    if (job.description) text += `${job.description}\n`;
    text += "\n";
  }
  if (profile.skills.length) text += `Skills: ${profile.skills.join(", ")}\n`;
  return text.slice(0, 8000); // Claude prompt cap
}
```

---

## UI OVERLAY DESIGN

Score-coded overlay that appears when the extension button is clicked:

```
┌─────────────────────────────────────────────┐
│  🔵 Score: 3 — Yes                          │
│  Role: Sr. Manager TPM                      │
├─────────────────────────────────────────────┤
│  SUMMARY                                    │
│  Strong consumer TPM with 6 years at Disney │
│  and Spotify. Led 40+ cross-functional      │
│  programs. Missing explicit direct report   │
│  language — capped at 3.                    │
├─────────────────────────────────────────────┤
│  💪 TOP STRENGTH                            │
│  Spotify Premium launch, 8M subscriber      │
│  growth, fully quantified outcomes          │
├─────────────────────────────────────────────┤
│  ⚠️ TOP CONCERN                             │
│  No explicit direct report language; tiger  │
│  team lead only — management cap applies    │
└─────────────────────────────────────────────┘
```

Color codes: `#d4edda` green (4), `#dbeafe` blue (3), `#fef3c7` yellow (2), `#fde8e8` red (1)
Border colors: `#1a7f4b` (4), `#1565c0` (3), `#d97706` (2), `#c0392b` (1)

---

## ROLE SELECTOR

The extension should let you pick which role to screen against before running:
- Sr. Manager TPM (Ed) — archived, role filled
- Staff SWE Backend (Keith & Kat / Fable) — ACTIVE — includes `recommendedRole` routing
- Sr. PM (Jordan) — archived, role filled
- SWE II Frontend (Andre) — archived, role filled

Only the Keith & Kat role is currently active. Archived roles remain in the selector in case the req reopens.

Store the selection in `chrome.storage.local` so it persists between profile views.

---

## KEY LESSONS FROM THE ASHBY IMPLEMENTATION

1. **max_tokens must be 1024+.** 600 caused JSON truncation with Claude Haiku. The model would cut off mid-JSON and the parse would fail, defaulting everything to score 2. This was the source of 1,400+ false score-2s in the Jordan screener run.

2. **Always use regex JSON extraction.** `response.match(/\{[\s\S]*\}/)` survives surrounding text, markdown fences, or extra whitespace. Never rely on `JSON.parse(raw)` directly.

3. **Date anchor the prompt.** Pass today's date explicitly. Without it, Claude miscalculates tenure on "Present" roles. Inject `currentYear` so it computes "2022–Present = 4 years" correctly.

4. **Calibration examples are the most important part of the prompt.** The real-world examples (Moshe Leon, Daniel Stack, Kiran Kumar Bhanja, etc.) do far more work than the abstract scoring rubric. Include as many as possible.

5. **Criteria drift is real.** The Keith criteria went through 4+ rounds of revision during the run. Most common mistakes: using staff-level scope as a hard filter (instead of a 3→4 signal), misdefining product sense as "shipped consumer features" (it actually means "works with product/design teams"), and flagging Amazon experience too aggressively.

6. **"To Be Archived & Dispo" ≠ "Archived".** In Ashby, one is a pipeline stage (no archiveReasonId, reversible) and one is terminal (closes the candidate permanently). This distinction caused a real data incident when the wrong stage was used.
