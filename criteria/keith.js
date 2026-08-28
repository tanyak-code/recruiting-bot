"use strict";
const criteria = `ROLE: Staff Software Engineer (Backend) — Fable Core at Scribd
HIRING MANAGERS: Keith (Python focus) and Kat (Ruby focus)

⚠️ ROUTING RULE — always include in your summary or topStrength:
- Candidate's primary language is Python/Django → "Recommend Keith's role (Python fit)"
- Candidate's primary language is Ruby/Rails → "Recommend Kat's role (Ruby fit)"
- Candidate has meaningful experience in both → "Fits either role — probe language preference on screen"
- Candidate is neither Python nor Ruby primary → note in topConcern

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
- Experience floor: 10+ years. Do NOT count junior web dev, teaching assistant, or consulting stints toward this total. Only count substantive full-time engineering roles at real companies. A candidate with 6 years at a real company + 2-3 years of early-career junior/mixed work does NOT meet this bar.

---------------------------------------
WHAT SEPARATES A 3 FROM A 4
---------------------------------------

A candidate who meets all the base requirements (experience, stack, cloud ops, incident ownership, product sense, agentic engineering) scores 3. To reach 4, they must show evidence of the following — from Keith directly:

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
- 10+ years backend software engineering — substantive roles only; do not count junior web dev, TA, or early-career mixed-stack roles toward this total
- Python OR Ruby must appear somewhere on the resume — Python/Django or Ruby/Rails preferred; Go or Node also acceptable if Python or Ruby is also present
- Staff-level signals present (see WHAT SEPARATES A 3 FROM A 4 above)
- Production cloud operations at scale: OLTP databases, container orchestration (Kubernetes preferred), CI/CD pipelines, queueing — on GCP, AWS, or equivalent major cloud
- Agentic engineering: explicitly uses AI coding tools (Claude Code, Cursor, Codex, Copilot, etc.) in real production workflows
- Product orientation: not a pure infrastructure person — works with or alongside product/design teams

3 = Yes
- 10+ years backend software engineering (substantive roles only — same counting rule as Score 4)
- Python OR Ruby appears somewhere on resume
- Strong backend generalist — production cloud, APIs, distributed systems
- Product orientation present
- Missing some of the score 4 signals (mentoring, 0→1 leadership, cross-team initiative, business impact framing) — that's fine for a 3
- Agentic engineering implied or absent — note it but don't penalize
- If borderline 3.5, call it out in summary

2 = No
- Career built entirely on Java/J2EE or Java/Spring Boot with no Python, no Ruby, AND no Agentic/AI experience anywhere on resume — not a fit. NOTE: Java/Spring Boot is acceptable if Python OR Ruby OR meaningful Agentic/AI experience is also present.
- Primarily infrastructure/platform/DevOps/SRE with no product interest
- No production cloud experience at scale
- Amazon as sole employer with clearly siloed scope — caps at 2 unless strong cross-functional evidence
- Pure data engineering, ML engineering, or data science with no backend software engineering ownership
- Under 10 years of substantive backend experience — this is a hard disqualifier, score 1 (junior web dev / TA / early-career mixed roles do not count toward this total)
- Frontend/mobile primary with minimal backend history

1 = Strong No — IMMEDIATE DISQUALIFY
Any of the following = score 1:
- Under 10 years substantive backend software engineering experience (junior web dev, TA, early-career mixed stints do not count)
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

SCORE 1 — Shekhar Chalise (Cint USA / Classic Driver / Edumech):
8+ years on paper, but the real backend career is ~6 years at Cint USA (June 2020–present). Classic Driver (2017–2019) was frontend/middleware/ML at a small remote shop. Edumech (2016–2017) was PHP Laravel web development. Neither counts as substantive backend engineering toward the 10-year floor. The Cint role is genuinely strong — Python/Django/FastAPI, Go, AWS at scale, LLM integration, uses Claude Code and Cursor, ADRs, cross-functional work with Data Science — but 6 years of real experience barely makes him a senior engineer, not Staff. Under 10 years substantive experience is a HARD GATE = Score 1, regardless of how strong the profile otherwise looks. HM feedback: "He has 6 years of experience which barely makes him a senior engineer. I'm looking for 10+ years."

SCORE 2 — Vivin Rajagopalan (Adobe / USANA / Pluralsight / AskDoc):
15 years, Python/Django/FastAPI, Staff at Adobe, LangGraph in production, subscription systems, ML recommendation systems. Looks exceptional on paper — hits every criteria point. Score 2. Reason: Resume summary directly names "Fable Core" and "1M+ monthly readers" and every bullet mirrors the JD language verbatim. This is a strong signal the resume was LLM-generated using the JD as input. Authenticity concern regardless of underlying qualifications.

RED FLAG — LLM-TAILORED RESUME:
If the resume summary directly names the target company, product, or role (e.g. "Seeking to set technical direction for Fable Core"), or every bullet maps suspiciously perfectly to criteria points in this JD using near-identical language, flag it in topConcern and cap at score 2. This signals low authenticity and potentially integrity concerns, regardless of how strong the profile appears.

SCORE 2 — Weylin Wagnon (Syntrologie / Uplabs / Coinbase Contract / Nivelo / One Finance):
10+ years, Python/Go/JS fullstack, decent cloud ops, agentic AI listed. Score 2. Reason: Pattern of many short roles — Syntrologie (2025–present, very new), Uplabs (2025, consulting, very short), Coinbase (contract, 2024), Nivelo (2023), One Finance (2021–2022). Contract roles exempt but overall tenure pattern is unstable. More importantly, bullets read at Senior not Staff level — "Lead Full Stack Engineer" title, execution-heavy work, no clear cross-team 0→1 ownership or architecture-level scope. Not enough staff-level evidence.

SCORE 2 — Moshe Leon (Fathom AI / Clarity Financial / Reforge / Mya Systems):
11 years experience, Ruby/Rails/Python/Django background, uses Cursor and Copilot, real AI integration work at Mya (LangChain, OpenAI GPT). Score 2. Reason: multiple short roles — Clarity (a few months in 2025), Reforge (2024–2025), pattern of job hopping raises concern about depth at any single company. Mya Systems (7 years) shows the most depth but still a checkered recent history.

SCORE 2 — Datt Goswami (GI / AdHome / InvestCloud / 482 Ventures / QuillHash):
10+ years, impressive AI/Rust/agent infrastructure depth, multiple founding/first-engineer roles. Score 2. Reason: pattern of many short roles (GI Aug 2024–present, AdHome Sep 2023–Aug 2024, CTO role Jul–Aug 2023 = 2 months, InvestCloud Nov 2021–Feb 2023) — no evidence of sustained depth or impact at any single company. Founding engineer ≠ staff engineer in terms of scope and stability.

SCORE 2 — Messan Domlan (Deloitte / Bank of the West / Union Pacific Railroad):
15+ years, Java/Spring Boot primary, Python in one RAG prototype at Deloitte, GitHub Copilot mentioned, AWS/K8s, authored TDDs and architecture proposals, mentored engineers. Looks like a 3 on individual signals. Score 2. Reason: His entire career is at enterprise/regulated companies — a consulting firm, a regional bank, and a railroad. He self-identifies as a "Platform Engineer." None of these environments resemble a consumer product startup. Fable is a 2-person team building a social reading app; this person has never worked anywhere that felt like that. Banking onboarding flows are not consumer product work. Railroad event processing is enterprise operational. Deloitte deliverables are client consulting. Python appearing once in a RAG prototype and Copilot on a skills list do not make someone product-oriented or startup-ready. DO NOT give a 3 to a platform engineer whose entire career is enterprise consulting + regulated industries (banking, railroad, government, insurance), even when individual gates (Python, agentic mention, staff signals) are technically cleared. Read the employers and the career arc, not just the keywords.

SCORE 2 — Joseph Flaherty (AllaiHealth / Self-Employed / Sciolytix):
17 years experience, strong full-stack delivery (Java, TypeScript, Node, AWS, mobile AI scribe). Score 2. Reason: 2-year self-employed consulting gap and current role at a small healthcare startup. Self-described as seeking "senior or lead role" — own summary indicates not operating at staff level. Healthcare context doesn't map well to consumer subscription product.

SCORE 3 — Andy Ratsirarson (Amazon Prime Video / Credit Karma / Udemy / Tenafli founder):
13 years, strong big tech + startup mix. Architected systems driving $1B+ revenue at Amazon Prime Video and Insurance Marketplace at Credit Karma (90M+ members). Founded and CTO'd three AI products from zero to one — real hands-on product ownership, LLM integrations, WebRTC voice, agentic tooling. Strong product sense and AI fluency. Score 3, not 4. Reason: Led two projects at Amazon as Sr Engineer but no clear Staff title track record yet. Amazon as one of multiple roles is acceptable per criteria. Curious about motivation to move from founder back to employment — probe on screen.

SCORE 3 — Damith Ganegoda (Planyear.ai / Altrium / Limark):
14+ years Java-centric backend with strong distributed systems depth. Lead Engineer at Planyear with real AI delivery: RAG systems, document parsing pipelines, LLM integrations (OpenAI/Anthropic), SageMaker ML. Explicitly uses Cursor and Claude Code. Strong on agile leadership, mentorship, on-call, cross-functional alignment. Score 3, not 4. Reason: Java-heavy — probe on Python depth. No explicit Staff title. B2B/enterprise domain (health insurance, HR) rather than consumer product. Strong on many dimensions but missing the consumer product orientation signal.

SCORE 4 — Daniel Stack (Mobi.AI / Perch / Indigo Ag / Toast / TripAdvisor):
15+ years, long Staff tenure across multiple companies. Python/Django primary stack. Built trip-planning systems at scale (25M+ passengers), carbon validation pipelines, forecasting suites. Incident response leadership, blameless postmortem culture, OpenAPI ownership, mentorship. LLM tooling explicitly mentioned. Strong 0→1 delivery pattern — shapes requirements through to production. Score 4. Reason: Directly relevant Django experience, staff-level ownership and breadth, variety of complex distributed systems, no Amazon silo concern.

SCORE 4 — Python/Django Staff Eng at mid-size consumer startup:
8+ years, led GCP→AWS migration, staff-level TDD and architecture ownership, incident response leadership, uses Claude Code daily, works closely with PM and ML team. Score 4.

SCORE 3 — Go/Node Staff Eng, strong ops, no Python:
Strong staff-level backend scope, distributed systems architecture, incident ownership, product-oriented. No Python but open to learning. Some agentic engineering. Score 3.

SCORE 3 — Strong Senior at non-Amazon FAANG, no explicit staff title:
Backend at scale, cross-functional collaboration signals, good product sense. Staff title missing but scope reads like staff. Score 3.

SCORE 2 — Pure SRE / Platform Eng, no product ownership:
K8s expert, CI/CD, infra at scale. Zero product work, no cross-functional collaboration, no interest in consumer product. Score 2.

SCORE 2 — Amazon SDE-III, siloed microservice:
Amazon only. Owns one service in a large org. No cross-functional work, no product context, no TDD/architecture ownership. Flag Amazon in concern. Score 2.

SCORE 1 — Data Engineer, ML Pipeline Engineer:
Spark/dbt/Airflow, model training pipelines, no backend service ownership, no API/production software engineering history. Score 1.

---------------------------------------
NICE-TO-HAVES (push 3 toward 4)
---------------------------------------
- Python/Django specifically (Fable's primary stack)
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
- 4+ full-time roles under 24 months in last 7 years`;

const display = {
  "⚠️ Routing Rule": [
    "Python/Django primary → Recommend Keith's role",
    "Ruby/Rails primary → Recommend Kat's role",
    "Both → Fits either — probe preference on screen",
    "Always include routing call in summary or topStrength"
  ],
  "Must-haves": [
    "10+ years backend — substantive roles only (no junior web dev, TA, or early-career mixed stints)",
    "Python OR Ruby must appear on resume (Django/Rails preferred) — Go/Node/Java acceptable only if Python or Ruby also present",
    "Staff-level scope (see below) — REQUIRED for score 3 or 4",
    "Production cloud at scale: OLTP DB, K8s, CI/CD, queueing (GCP or AWS)",
    "Incident ownership end-to-end",
    "Agentic engineering: AI coding tools in real production (KEY signal)",
    "Product orientation — works with PM/design/ML, not pure infra"
  ],
  "Staff vs Senior (key distinction)": [
    "STAFF: mentored engineers, grew others explicitly",
    "STAFF: led 0→1 initiatives — originated, got buy-in, drove to production",
    "STAFF: wrote TDDs/RFCs socialized across teams",
    "STAFF: cross-team alignment — PM, design, data, leadership",
    "STAFF: business impact framing — WHY the work mattered, not just WHAT shipped",
    "SENIOR (score 2): 'things I worked on / shipped' with no broader scope",
    "SENIOR (score 2): project lead on assigned work, not self-originated"
  ],
  "4 = Strong Yes": [
    "All must-haves met with explicit evidence",
    "Staff scope + cloud ops + agentic + product sense all present"
  ],
  "3 = Yes": [
    "One signal missing",
    "No Python/Ruby but equivalent stack + open to learn",
    "Staff scope implied not explicit",
    "Agentic engineering implied not stated"
  ],
  "2 = No": [
    "Pure infra/SRE/DevOps, no product ownership",
    "Individual contributor only, no architecture ownership",
    "Amazon-only background (flag, cap at 3 unless strong cross-functional evidence)",
    "Under 8 yrs or too junior scope",
    "Java/Spring Boot only — no Python, no Ruby, AND no Agentic/AI experience",
    "Resume appears LLM-generated to match this JD (names company/product, mirrors JD language)"
  ],
  "1 = Strong No": [
    "Under 5 yrs backend experience",
    "Frontend/mobile only",
    "Data engineering / ML engineering only",
    "Govt/compliance/regulated systems only",
    "4+ FT roles under 24mo in last 7yrs"
  ],
  "Amazon Flag": [
    "Amazon as sole/primary = flag + cap at 3 unless clear cross-functional breadth",
    "Amazon as one of many roles = acceptable"
  ],
  "Agentic Engineering": [
    "Claude Code, Cursor, Codex, Copilot in production = strong push toward 4",
    "Personal use only = acceptable",
    "No mention = note it, not a disqualifier"
  ],
  "Nice-to-haves": [
    "Python/Django explicitly",
    "GCP experience (current Fable stack)",
    "Platform migration experience (GCP→AWS is a key H2 initiative)",
    "Subscription/entitlements systems (Stripe, RevenueCat)",
    "Startup / small team experience",
    "ML recommendation/feed system adjacency"
  ],
  "Tenure rules": [
    "4+ FT roles under 24mo in last 7yrs = Score 1",
    "Avg tenure < 18mo = max Score 2",
    "Recent role 3+ yrs redeems choppy history"
  ]
};

module.exports = { label: "Keith & Kat · Staff SWE Backend (Fable)", archived: false, criteria, display };
