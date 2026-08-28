"use strict";
const criteria = `ROLE: Senior Manager, Technical Program Management
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
- Enterprise or compliance fintech: TurboTax, mortgage/lending platforms, banking compliance infrastructure, B2B payment rails, risk/fraud systems
- NOTE: Consumer-facing fintech DOES count — a consumer mobile banking app, consumer payment feature, or mass-market financial product (e.g. Cash App, Venmo, consumer Robinhood, retail banking app) = YES. The question is always: does a regular person use this directly?
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
- PM collaboration is a STRONG POSITIVE SIGNAL when mentioned, but its absence is NOT a disqualifier. Read what they built.

DISQUALIFIES — work that is internal, technical, or never seen by end users:
- Resume dominated by "governance," "operating model," "infrastructure," "platform," "risk detection," "compliance," "Agile transformation," "observability," "cost optimization," "SOX controls," "data pipelines," "internal tooling" = platform/ops/process profile, not consumer product
- Amazon Prime on the resume ≠ consumer product experience if the actual work is ML infrastructure, personalization backends, or engineering org operations
- Google Chrome on the resume ≠ consumer product experience if the work is platform governance, developer APIs, or privacy frameworks
- Uber on the resume ≠ consumer product experience if the work is fraud detection, payments infrastructure, or risk systems
- The consumer brand is irrelevant. The functional work is what counts. Read the bullet points, not the company name.

EDGE CASES:
- TurboTax = NO (tax compliance software, not mass consumer product)
- Cash App / Venmo = YES (mass consumer)
- Consumer mobile banking app / retail banking feature = YES (regular people use this directly)
- Mortgage/lending platform = NO (enterprise/compliance)
- Banking compliance infrastructure / fraud/risk systems = NO (internal)
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
10+ years TPM experience, managed 45+ person QA org, shipped major AAA titles (Civ 7, RDR2, GTA 5). Score 1. Reason: Entire career is QA program management — testing, quality assurance, release validation. Is working in quality assurance for video games. QA TPM and product TPM are different functions. Despite consumer gaming context, the work is internal QA operations, not cross-functional product program management.

SCORE 3 - Renee Chorney (Unity/Fastly/Twitter):
Strong TPM, built teams, senior level. Consumer product present. Score 3.

SCORE 3 - William Gambling (Peloton/OnDeck):
Built TPM function from scratch, managed 10 TPMs, consumer products (Peloton). Score 3.

SCORE 4 - J. Ryan Steffen (Amazon/SunPower):
Data-driven throughout with quantified outcomes. Managed TPMs. Cross-functional at scale. Amazon consumer devices. Score 4.

SCORE 2 - Kiran Kumar Bhanja (Amazon Prime/AWS S3/Amazon Finance):
Amazon lifer, Prime Personalization AI/ML, S3, Oracle Financials, Kindle Device. Looks like a consumer 4 on paper. Score 2. Reason: Every role is infrastructure, platform, or operations — S3 storage engineering, Oracle DB SOX controls, device observability tooling, finance ledger systems. Despite Amazon Prime and Kindle in the title, there is no evidence of working WITH product managers to define and ship consumer-facing product features. Consumer brand ≠ consumer product experience. The test: did they collaborate with PMs to ship features end consumers actually use?

SCORE 2 - Tarek ElBahnasawy (Google Chrome/Uber Fraud/IBM Government/Western Union):
20+ years, managed 5 TPMs at Uber. Score 2. Reason: Every role is process-heavy and governance-heavy — Chrome platform governance, privacy-by-design frameworks, fraud/risk detection systems, payment compliance, federal government modernization. "Governance framework," "operating model," "Agile transformation," "regulatory compliance" dominate the resume. This is a process architect, not a product-shipping TPM. Google Chrome is a platform product; Uber work is fraud/risk infrastructure. Large company + recognizable name ≠ consumer product TPM experience.

SCORE 2 - Lauren Abrams (WBD/Disney Streaming/Expedia):
Consumer streaming TPM (Disney+, HBO Max), staff-level background. Score 2. Reason: Under the 4-year TPM title threshold — less than 2 years in an actual TPM title before current role. Prior experience was project manager and scrum master level, which does not count toward the TPM tenure gate. Too junior for this level regardless of company pedigree.

SCORE 3 - Michael Goldner (Amazon Astro/Alexa/Klaviyo):
25+ years TPM, managed 20 TPMs at Amazon, consumer devices (Echo Show, Astro, Alexa). Score 3. Strong consumer product (Echo Show, Astro = consumer hardware/software users interact with directly), explicit people management at scale. Not a 4 due to downward trajectory post-Amazon — 2 months into a more junior role at time of application, scope reduction visible. Worth a recruiter screen.

SCORE 2 - Sudar Akkala (GoPro/Harman/Qualcomm):
20 years TPM experience, managed large global teams, strong execution track record. Score 2. Reason: Entirely hardware/embedded firmware context (action cameras, automotive IVI, mobile SoC). No consumer software product experience. No AI mention. Hardware-only TPM profile does not transfer.

SCORE 2 - Vipul Panchal (Amazon/Wells Fargo):
Amazon Shopping TPM with Gen-AI experience (code generation, AI-based QA). Score 2. Reason: Only 3 years as a TPM — under the 4-year TPM title threshold. Prior 16 years spent as software engineer and architect. No experience managing or coaching TPMs. Wells Fargo background is banking/legacy enterprise.

SCORE 2 - Casey Charlton (Meta Globalization/River Linguistics):
Strong operator, 9 years at Meta, founded and sold a company, building with LLM APIs/RAG currently. Score 2. Reason: Career is predominantly vendor management, internationalization, and localization platforms — not consumer product feature delivery. Wrong functional domain. FAANG tenure and AI fluency do not override a globalization/vendor ops profile.

SCORE 2 - Jaclyn Waters (EA / The Sims 4):
Engineering Development Director / Sr TPM at EA Maxis on The Sims 4. Looks like consumer gaming — but score 2. Reason: The entire body of work is internal: engine modernization (DirectX 11 migration), internal tooling, developer workflow, content pipeline improvements, Jira architecture redesign, agile transformation, vendor budget governance. The Sims 4 is a consumer product but she did not work WITH product managers to ship consumer-facing features. She ran internal engineering ops and infrastructure. "Led internal tooling, developer workflow, and content pipeline improvements" = wrong functional layer. Ops/tooling at a consumer company ≠ consumer product TPM experience.

SCORE 2 - Gabrielle Michel (Microsoft Surface/Xbox/Accessibility devices):
13+ years TPM at Microsoft, shipped Surface Laptop, Xbox controllers, accessibility hardware. Managed TPM teams. Quantified outcomes. Looks like a consumer 3 on paper. Score 2. Reason: Entire career is consumer HARDWARE, not consumer SOFTWARE/digital products. Hardware TPM = physical device manufacturing, supply chain, component sourcing, firmware, compliance certification. This is a fundamentally different function from consumer software product TPM (working with PMs to ship features end users interact with digitally). Consumer hardware at a recognizable brand ≠ consumer software product TPM experience. Even Xbox or Surface are hardware engineering programs, not consumer app/platform delivery. Do NOT score hardware-only TPMs above 2.

SCORE 2 - Rodion Gusev (Pinterest / Instapaper):
Sr Manager TPM at Pinterest leading 30 TPMs across support systems, tooling, and data governance. Score 2. Reasons: (1) The functional work is support operations infrastructure — internal support platform, ticket automation, appeals flows, routing models, compliance tooling. This is internal ops, not consumer product program management. Pinterest is a consumer company; support systems are not consumer product. (2) Only 3 years in an explicit TPM title (2022–present). Prior 6 years at Pinterest were as Business Analyst and Support Ops — those do not count toward the 4-year TPM title threshold. (3) The bottom of the resume is a disorganized repetition of keywords and job description rephrasing — a reliability signal. Despite managing at scale, wrong functional domain and insufficient TPM tenure.

SCORE 2 - Security/compliance TPM (any company):
Even with strong FAANG brand, if career is predominantly security, compliance, or regulated systems = score 2. Wrong domain regardless of resume quality.

SCORE 2 - Backend/analytics TPM at FAANG:
FAANG brand does not override a backend-only or analytics-only functional profile. Consumer product experience must be real and explicit, not inferred from company name alone.

---------------------------------------
MUST-HAVES (required for 3 or 4)
---------------------------------------
- TPM scope (can include Chief of Staff or Head of Operations if clearly cross-functional)
- 4+ years explicitly in a TPM or Senior TPM title — prior years as engineer, PM, analyst, project manager, or scrum master do NOT count
- Consumer-facing product experience as defined above — this is the primary gate
- Program ownership, not just coordination or task management
- Builds lightweight process and structure without over-engineering it

---------------------------------------
NICE-TO-HAVES (push 3 to 4)
---------------------------------------
- FAANG or similar large-scale tech company (boost only — not a gate)
- Direct management of TPMs or technical staff
- Data-driven resume with quantified outcomes
- Owns annual planning and OKR-to-roadmap translation
- Consumer product in most recent role

---------------------------------------
DISQUALIFIERS = score 1
---------------------------------------
- Purely project coordination, no program ownership
- No consumer-facing product experience at all
- B2B only, platform only, migration only, infra only, security only
- No technical fluency whatsoever
- Under 4 years in a TPM or Senior TPM title
- QA TPM as primary function`;

const display = {
  "4 = Strong Yes": [
    "TPM scope + data-driven quantified resume",
    "Managed TPMs or technical staff (explicit direct reports)",
    "Consumer-facing product (most recent 3+ yrs)",
    "Cross-functional at program level",
    "FAANG = boost only, not a gate"
  ],
  "3 = Yes": [
    "Most must-haves, missing one signal",
    "Consumer product present but not recent/dominant",
    "Light management or smaller company scale"
  ],
  "3M = Yes (Mgmt Cap)": [
    "Would be a 4 — passes every other gate",
    "Only gap: no explicit direct report language",
    "Tiger teams / influence only = 3M, not 4"
  ],
  "2 = No": [
    "No consumer-facing product experience",
    "B2B / platform / infra / security / compliance only",
    "Backend or analytics-only focus",
    "FAANG brand but wrong functional profile",
    "Pure project coordination"
  ],
  "Consumer product = YES": [
    "Mass consumer apps (Cash App, Spotify, Netflix)",
    "Gaming, consumer media, content platforms",
    "Consumer marketplaces (Amazon retail, eBay, Airbnb)"
  ],
  "Consumer product = NO": [
    "B2B tools (Salesforce, HubSpot, Shopify)",
    "Enterprise/compliance fintech (TurboTax, mortgage, banking infra, fraud/risk systems)",
    "Consumer-facing fintech (Cash App, Venmo, consumer banking app) = YES",
    "Healthcare apps, educational/institutional platforms",
    "Platform / infra / architecture work",
    "QA / testing / quality assurance focus"
  ],
  "Disqualifiers": [
    "No consumer product experience at all",
    "B2B / platform / infra / security only",
    "Under 4 yrs in TPM title (prior PM/eng/scrum master don't count)",
    "Pure project coordination",
    "No technical fluency",
    "QA TPM as primary function"
  ]
};

module.exports = { label: "Ed · Sr Manager TPM", archived: true, criteria, display };
