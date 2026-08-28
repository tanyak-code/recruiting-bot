"use strict";
const criteria = `ROLE: Software Engineer II — Signup & Activation / Growth Engineering at Scribd
HIRING MANAGER: Andre

---------------------------------------
4-POINT SCORING SCALE
---------------------------------------

4 = Strong Yes
ALL of the following must be true:
- 3–6 years qualifying frontend experience (full-time post-grad only)
- Strong React and/or TypeScript
- Growth engineering experience: signup flows, activation, conversion optimization, A/B testing, trial-to-paid, subscriber growth
- Passes all tenure rules, no disqualifiers

NOTE: Growth engineering experience TRUMPS company type. A B2B frontend engineer who has done signup flows, A/B testing, or conversion work is a strong fit. Do not penalize for B2B background when growth signals are present.

3 = Yes
- 3–6 years qualifying frontend experience (or see XP- / XP+ exception bands below)
- Strong React and/or TypeScript
- Solid frontend engineer — may lack growth signal but has shipped real product features
- Career is NOT exclusively B2B admin dashboards / internal tooling with zero product surface — that's a 2 (see below)
- Passes all tenure rules, no disqualifiers
- If borderline 3.5, say so in summary with reason

B2B NOTE:
- Growth engineering experience (A/B testing, signup flows, activation, conversion) at ANY company = can score 3 or 4
- Career entirely spent on B2B admin dashboards, internal tooling, or enterprise SaaS with no product-facing work and no growth signals = cap at 2
- B2B company background alone is NOT a cap — read the actual work, not the company type

EXPERIENCE EXCEPTION BANDS:
- XP- (2–3 years): Only eligible for max score 3. Must be at a Forbes 500 / major tech company with clear product frontend work at scale. Flag scoreLabel with "XP-" tag (e.g., "Yes XP-"). Do not apply exception charitably — the work must be explicit.
- XP+ (7–8 years): Only eligible for max score 3. Flag scoreLabel with "XP+" tag (e.g., "Yes XP+"). Note overqualification for level in topConcern.
- 6–7 years: Max score 3. No flag needed.
- Under 2 years: Score 1, immediate disqualifier.
- 8–9 years: Max score 2 (overqualified for level).
- 9+ years: Score 1 (overqualified — state clearly in summary).

2 = No
- Experience is 8–9 years qualifying frontend experience — overqualified for this level, max score 2
- OR career is entirely B2B admin dashboards, internal tooling, or enterprise SaaS with no product-facing work AND no growth engineering signals — cap at 2
- OR full-stack with no professional frontend history and no frontend work in the last 2 years
- OR consulting/contracting only career — max score 2
- OR frontend experience is primarily backend APIs, marketing, or internal tooling with no real product surface
- OR total qualifying experience is under 4 years (hard cap — see experience counting rules below)
- OR tenure per company is consistently too short across multiple roles — see job hopping rules
- OR senior/staff-level candidate clearly overleveled for SWE II even within the 8-9yr range (hiring manager hesitant to hire down in level)
- OR other notable flags not rising to an immediate disqualifier

1 = Strong No — immediate disqualify
- Any disqualifier present
- Under 2 years qualifying experience
- 9+ years qualifying experience — overqualified

---------------------------------------
EXPERIENCE COUNTING — CRITICAL
---------------------------------------
- Count ONLY full-time professional roles after graduation
- Do NOT count internships, co-ops, teaching assistantships, bootcamps, or academic projects
- Under 2 years qualifying = score 1, immediate disqualifier
- 2–3 years = max score 3, only if Forbes 500 / major tech company + clear product frontend work at scale. Flag "XP-" in scoreLabel.
- 3–6 years = sweet spot, eligible for score 4 with all criteria met
- 6–7 years = max score 3
- 7–8 years = max score 3, flag "XP+" in scoreLabel, note in topConcern
- 8–9 years = max score 2 (overqualified for level)
- 9+ years = score 1 (overqualified — state clearly in summary)

HARD MINIMUM — 4 YEARS:
- Candidates with under 4 years of qualifying full-time post-grad experience = max score 2, no exceptions
- This overrides any positive signals — even a strong profile does not get past score 2 if total qualifying experience is under 4 years
- Do NOT count any pre-grad, part-time, contract, bootcamp, internship, or co-op work toward this threshold

---------------------------------------
TENURE / JOB HOPPING
---------------------------------------
- Internships do NOT count toward job hopping — only full-time roles
- At mid-level, it is expected this may be a candidate's 2nd full-time job — do not penalize early career brevity
- DISQUALIFIER: 4+ full-time roles under 24 months in the last 7 years (excluding internships) = score 1
- Consulting/contracting as the only career pattern = max score 2
- Do not penalize contract roles where the engagement was clearly project-scoped or the company shut down
- SHORT TENURE PATTERN: If a candidate has held 3+ full-time roles averaging under 12 months each, that is a red flag even if the total disqualifier threshold isn't technically met. Cap at score 2 and note in topConcern. The team needs someone who will stay and grow, not churn through roles.

---------------------------------------
FULL-STACK RULE
---------------------------------------
- Full-stack with no professional frontend experience AND no frontend work in the last 2 years = hard cap at score 2
- Full-stack with explicit frontend-titled roles OR clearly frontend-focused history = can score up to 3
- Full-stack with explicit frontend history + strong growth engineering signal + all other must-haves = can reach 4

---------------------------------------
NICE-TO-HAVES (push 3 toward 4)
---------------------------------------
- A/B testing and experimentation (top signal)
- Signup / activation / conversion optimization / trial-to-paid / subscriber growth
- Next.js experience
- Ruby on Rails familiarity
- AI tooling fluency (Claude Code, Cursor, Codex)
- Experience with shared component libraries or design systems
- Product-led company background

---------------------------------------
DISQUALIFIERS = score 1
---------------------------------------
- Under 2 years qualifying post-grad full-time experience
- 9+ years qualifying experience (overqualified)
- Background is ONLY platform, infra, or architecture — never shipped any user-facing product UI
- Missing both React AND TypeScript
- 4+ full-time roles under 24 months in the last 7 years (internships excluded)

NOTE: B2B background alone is never a disqualifier. Career entirely in B2B admin/internal tooling with no product surface and no growth signals = cap at 2. But growth engineering experience (A/B tests, signup flows, conversion) at a B2B company = can still score 3 or 4.

---------------------------------------
AI-WRITTEN RESUME FLAG
---------------------------------------
Flag the score with an asterisk (*) in the scoreLabel (e.g., "Yes*" or "No*") when the resume
shows strong signals of being heavily AI-generated. Do NOT change the score — flag for recruiter review.

Flag when TWO OR MORE of the following are present:
- Excessive em dashes (—) as primary bullet formatting style throughout
- Resume language mirrors the job description wording word-for-word or near-verbatim. Key JD phrases to watch for:
  "high-converting, performant, and delightful web experiences"
  "experimentation-driven development"
  "conversion rates and user engagement"
  "pragmatic problem-solving"
  "culture of technical excellence"
  "reduce friction"
  "create engaging first impressions"
  "balance rapid iteration with code quality"
  "empathy while writing maintainable, thoughtful code"
  "deepen their technical expertise in growth engineering"
  "accountability and clear communication are paramount"
- Suspiciously generic and polished language that reads as a template
- Claimed title or seniority inconsistent with actual work history bullets
- Summary is vivid and strategic but body bullets are thin or vague

Note: a well-written resume is NOT a flag. Only flag when the pattern is obvious.

---------------------------------------
CALIBRATION EXAMPLES
---------------------------------------

SCORE 2 - Adrian Faustino (Arc'teryx / Amazon):
Consumer brand pedigree (Amazon) but the work lacks sufficient pure frontend focus — backend systems, internal tooling, or a hybrid profile that doesn't demonstrate dedicated frontend product engineering. This role requires someone who lives and breathes frontend UI, not someone who dabbles in it alongside infrastructure or full-stack backend work. Score 2. Reason: insufficient frontend focus for this role.

SCORE 2 - Ahuizotl Vargas (Slalom / Kapital / KingTide):
Consulting/contracting background with length of time per company being too short. Short engagements across multiple companies without building deep product ownership or long-term impact. Score 2. Reason: tenure per company too short — pattern of bouncing across short engagements, likely a contracting or consulting profile.

SCORE 2 - Breanna White (Match Group):
Strong signals but only ~3.5 years of qualifying full-time post-grad experience. The role has a hard minimum of 4 years — no exceptions, regardless of how strong the candidate looks otherwise. Score 2. Reason: hard cap — under 4 years qualifying full-time experience.

SCORE 2 - Dan Cooper (eBay / Microsoft / Xandr — 10+ years):
10+ years of experience, senior or staff-level background. Despite strong consumer product exposure (eBay retail), hiring manager is not willing to hire a senior candidate down into a mid-level SWE II role — this creates leveling friction, compensation mismatch, and retention risk. Score 2. Reason: overqualified — hiring manager hesitant to shoe-horn a senior candidate into a mid-level role.`;

const display = {
  "Must-haves": [
    "3–6 yrs qualifying frontend experience",
    "React and/or TypeScript",
    "Has shipped real product UI (not exclusively B2B admin/internal tools)"
  ],
  "4 = Strong Yes": [
    "All must-haves + growth engineering",
    "(signup, activation, A/B, conversion, trial-to-paid)",
    "Growth engineering trumps company type — B2B is fine if growth signals present"
  ],
  "3 = Yes": [
    "All must-haves, no growth signal required",
    "XP-: 2–3 yrs @ Forbes 500 + product frontend (max 3)",
    "XP+: 7–8 yrs, flag overqualification (max 3)"
  ],
  "2 = No": [
    "8–9 yrs experience (overqualified for level)",
    "Career entirely B2B admin/internal tools, no product surface, no growth signals",
    "Full-stack, no frontend history last 2 yrs",
    "Consulting-only career",
    "Under 4 yrs qualifying experience"
  ],
  "1 = Strong No": [
    "Under 2 yrs qualifying experience",
    "9+ yrs experience (overqualified — state reason)",
    "Platform / infra only — never shipped product UI",
    "Missing both React AND TypeScript",
    "4+ FT roles under 24mo in last 7yrs"
  ],
  "Experience thresholds": [
    "< 2 yrs = Score 1",
    "2–3 yrs = max 3, Forbes 500 + product frontend (XP-)",
    "< 4 yrs = HARD CAP max Score 2 (no exceptions)",
    "3–6 yrs = eligible for Score 4 (sweet spot)",
    "6–7 yrs = max Score 3",
    "7–8 yrs = max Score 3 (XP+)",
    "8–9 yrs = max Score 2",
    "9+ yrs = Score 1 (overqualified)"
  ],
  "Full-stack rule": [
    "No frontend history (last 2 yrs) = max 2",
    "Explicit frontend roles = max 3",
    "Frontend history + growth = can reach 4"
  ],
  "Tenure rules": [
    "Internships excluded from job hopping calc",
    "4+ FT roles under 24mo (last 7yrs) = Score 1",
    "Consulting-only career = max Score 2"
  ],
  "Nice-to-haves": [
    "A/B testing & experimentation (top signal)",
    "Signup / activation / conversion",
    "Next.js, Rails",
    "AI tooling fluency",
    "Design system / component library exp"
  ],
  "Disqualifiers": [
    "< 2 yrs or 9+ yrs experience",
    "Platform / infra only — never shipped product UI",
    "Missing both React AND TypeScript",
    "4+ FT roles under 24mo in last 7yrs"
  ]
};

module.exports = { label: "Andre · SWE II Frontend", archived: true, criteria, display };
