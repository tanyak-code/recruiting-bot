"use strict";
const criteria = `ROLE: Senior Manager, Technical Program Management
HIRING MANAGER: Ed / Scribd
CRITERIA VERSION: v2 (July 2026) — product-delivery gate calibrated against hiring-manager ground truth (Lauren Bernstein = 3, Anna Bressi = 3)

---------------------------------------
4-POINT SCORING SCALE
---------------------------------------

4 = Strong Yes
ALL of the following must be true:
- TPM experience (not just PM, EM, or Chief of Staff unless clearly TPM scope)
- 4+ years explicitly in a TPM or Senior TPM title — prior years as engineer, analyst, project manager, or scrum master do NOT count toward this threshold. (This strict title rule applies to Score 4 only — Score 3 uses the TPM-scope rule below.)
- Data-driven resume with quantified outcomes, metrics, KPIs. Vague accomplishments = not a 4
- DIRECT management experience: has managed people with real reporting-line authority — even a team of 1 is sufficient (this role will have 1 direct report). Qualifying: a TPM or PM who reports to them, headcount ownership, hiring, or performance review responsibility. The phrase "direct reports" is sufficient but NOT required. IMPORTANT: "Managed product teams," "managed 20 engineers," or "managed across X teams" in a TPM context typically means cross-functional coordination — these are NOT direct reports unless accompanied by hiring/headcount/performance signals. "Built the TPM team from scratch," "grew the team from X to Y," or explicit org-chart ownership = counts. Managing 1 FTE (even plus contractors) = sufficient. When in doubt, ask: do these people actually report to this person, or is this TPM coordinating a cross-functional group?
- Cross-functional program experience across Product, Design, and Engineering — does not need to be explicitly named if consumer product experience is clearly present; implied collaboration is acceptable
- CONSUMER-FACING product experience in the most recent 3 years (see definition below) — consumer is required for a 4; B2B-only product careers top out at 3
- FAANG or similar scale is a boost signal only — FAANG brand alone does not compensate for wrong functional profile

3 = Yes
Strong candidate on the product-delivery path (use scoreLabel "Yes" for all of these).

TITLE RULE FOR SCORE 3 — SCOPE OVER STRING:
For Score 3, the title requirement is TPM-scope work, not a literal title match. Accepted titles for Score 3:
- Any explicit TPM or Senior TPM title (same as Score 4)
- Technical Program Manager, Technical Product Manager, Program Manager, Sr. Program Manager, Program Management Director
- Engineering Manager — IF the bullets clearly show cross-functional program delivery shipping software to external users (not internal-only EM work)
- Chief of Staff — IF scope is clearly cross-functional program delivery at a product company
Titles that do NOT count toward tenure for Score 3: Scrum Master, Product Owner, Business Analyst, Project Manager (non-technical), IC engineer/developer. If a candidate is borderline on title, read the work — does it describe shipping software product to real users cross-functionally? If yes, count it.

MISSING DATES RULE: If dates are missing or ambiguous on a role that otherwise reads as TPM-scope, credit the role conservatively and flag it in topConcern. Never zero out a role entirely because dates are absent.

CHAPTER TEST — PRODUCT DELIVERY FOR SCORE 3:
A candidate scores 3 if they have at least ONE substantial product-delivery chapter (~2+ years, within the last 7 years) showing software shipped to real external users. The rest of their career can be internal/ops/infra-heavy — one genuine product chapter within the window is enough to clear the 3-gate. The chapter must be recent enough to be relevant.

Additional Score 3 signals:
- Genuine PRODUCT-DELIVERY TPM at a B2B or business-facing product (see PRODUCT DELIVERY GATE below) — B2B product TPMs score 3, never 4
- Consumer product experience present within the last 7 years but NOT in the most recent 3 years — this is a 3, NOT a 2. Example: Amazon Alexa TPM role ending in 2022 scores 3 in 2026 (4 years ago = within 7-year window).
- Management experience is light (team of 1-2 who report to them) — still a 3
- Company scale is smaller but all other signals are strong
- Cross-functional scope is implied but overall profile is strong
- If borderline 3.5, say so in summary with reason

CONSUMER PRODUCT RECENCY RULE (applies to the 4-gate):
- Consumer product work in the last 3 years = qualifies for 4 (if all other gates pass)
- Last 4–7 years = capped at 3, cannot be a 4
- More than 7 years ago with nothing consumer-facing since = not eligible for 4; score on product delivery (3 if genuine product delivery since, 2 if internal-only)

---------------------------------------
PRODUCT DELIVERY GATE — the 2/3 boundary
---------------------------------------

The gate at the 2/3 boundary is PRODUCT DELIVERY versus INTERNAL WORK — not consumer-vs-B2B.

SCORE 3 requires genuine product program delivery: the candidate's programs ship software product that real EXTERNAL users use — consumer OR business users (merchants, sellers, subscribers, patients, banking customers). Examples: shipping eCommerce features, international product launches, new product capabilities, GenAI product features, marketplace seller-facing products.
- Regulated domains COUNT for a 3: a banking-product or patient-app TPM who genuinely ships product scores 3 (hiring-manager confirmed). Regulated/B2B domains still do NOT count for a 4 — that requires mass-consumer product per the definition below.

SCORE 2 for careers dominated by INTERNAL work, regardless of company name or seniority:
- Internal tooling, developer workflow/productivity, engine modernization
- Support systems, ticket automation, routing/appeals flows
- Research operations, insights platforms, VOC operating systems (see the CUSTOMER-INSIGHTS EXCEPTION below)
- QA / release validation as primary function
- Localization/internationalization platforms, vendor management
- Governance frameworks, operating models, Agile transformation, compliance, SOX
- SRE, observability, cost optimization, data pipelines, storage/infra
- "Product Engineering" in an org name is a signal, not proof — read what was actually SHIPPED. A TPM in a product-engineering org whose bullets are all process/governance/tooling is still a 2.
- Hardware/embedded/firmware-only = 2. The delivered product must be software.

A B2B-only product career scoring 3 should carry a topConcern noting: probe how much of the work was with genuine product teams (PM/Design partnership on user-facing decisions) versus product-engineering process, and probe startup adaptability.

CUSTOMER-INSIGHTS / VOC EXCEPTION (path to 3 only):
- VOC, research ops, and insights-platform careers are internal work = 2 by default. EXCEPTION — score 3 when BOTH are true:
  1. Their programs carry quantified CONSUMER-FACING outcomes attributable to them (user growth, retention, downloads, consumer revenue). Internal adoption metrics (WAU/MAU of internal tools, employees reached, executives engaged) do NOT count.
  2. Sustained partnership with Product/Eng/Design on shipping decisions (prioritization, requirements, roadmap inputs) at a mass-consumer product.
- This path caps at 3 — never 4. Rodion Gusev remains a 2 (support-ops metrics, not consumer outcomes; also under TPM title tenure).

2 = No
- No genuine product delivery experience — entire career is internal/ops/infra work per the PRODUCT DELIVERY GATE, with no product chapter within the last 7 years
- Migration only, platform only, marketing only, infrastructure only (note: B2B product DELIVERY is a 3, not a 2)
- Security-focused or compliance-focused TPM background
- Backend/analytics-only focus with no product surface
- Engineering Manager whose entire career is internal org work with no cross-functional product delivery to external users
- FAANG brand present but functional work is backend, security, platform, or infra = still a 2
- Title or tenure gap: candidate doesn't meet the TPM-scope threshold for Score 3 (Scrum Master, IC engineer, Product Owner as primary background), OR meets it but has insufficient tenure

1 = Strong No — ONLY these four conditions:
- Pure project coordination with no program ownership at any point in career (task-tracker, process admin, meeting facilitator — no program scope)
- No technical fluency whatsoever — cannot engage with engineering teams, no technical domain knowledge anywhere on resume
- QA / testing as primary career function (not just a chapter — the whole career)
- Completely unrelated field — no program management, no product delivery, no engineering context at all

Everything else — wrong domain, internal-only scope, title gap, under-tenure, wrong company type — routes to Score 2, not Score 1.

---------------------------------------
CONSUMER-FACING PRODUCT — DEFINITION (used for the 4-gate)
---------------------------------------

Consumer-facing means products used by the general public at scale. Consumer-facing experience is required for a 4. The categories below that "do not count as consumer-facing" can still earn a 3 via the PRODUCT DELIVERY GATE if the candidate genuinely ships product.

COUNTS as consumer-facing:
- Mass consumer apps: Cash App, Venmo, Spotify, Netflix, Instagram, TikTok, Reddit
- Consumer remittance/money-transfer apps used by the general public (e.g. Remitly) — mass-consumer fintech is consumer; regulated B2B/institutional fintech is not
- Gaming products (consumer entertainment at scale)
- Consumer content/media/reading: Kindle, Audible, Scribd, YouTube
- Consumer marketplaces: Amazon retail, eBay, Etsy, Airbnb
- Consumer-facing surface of an otherwise enterprise product — ONLY if they explicitly worked on the user-facing layer

DOES NOT count as consumer-facing (3-eligible via product delivery, not 4):
- B2B tools: Salesforce, HubSpot, Shopify, Workday, Square merchant products
- Regulated/institutional fintech: TurboTax, banking platforms, mortgage/lending tools
- Healthcare apps, even if patient-facing
- Educational/institutional platforms: Scholastic, university systems
- Platform, architecture, or infrastructure work at any company (this is a 2, not a 3 — internal work)
- Enterprise products with a consumer-adjacent layer, unless the candidate explicitly worked on that layer

CRITICAL — READ THE WORK, NOT THE BUZZWORDS:
Do NOT require candidates to explicitly mention "product teams," "PM collaboration," or "cross-functional" in their resume. Many strong TPMs write lean resumes that describe WHAT they shipped, not WHO they partnered with. Read the work descriptions and infer what was actually built.

For the 4-gate ask: does the work described touch something a mass-market end user sees, interacts with, or experiences?
For the 3-gate ask: does the work described ship software product to real external users (consumer or business)? If the answer to both is no — the work is internal — score 2.

QUALIFIES as product delivery — even if PM/design teams are never mentioned:
- "Led Amazon Homepage redesign" = consumer product = 4-eligible
- "Launched [app feature / UX change / new product capability]" = consumer product
- "Drove delivery of mobile app experience for X million users" = consumer product
- "Shipped eCommerce features / international product launches for merchant platform" = B2B product delivery = 3-eligible
- "Delivered GenAI product features across the product engineering org" = product delivery

DISQUALIFIES — internal work never seen by external users:
- Resume dominated by "governance," "operating model," "infrastructure," "platform," "risk detection," "compliance," "Agile transformation," "observability," "cost optimization," "SOX controls," "data pipelines," "internal tooling" = internal/process profile = 2
- Amazon Prime on the resume ≠ product delivery if the actual work is ML infrastructure, personalization backends, or engineering org operations
- Google Chrome on the resume ≠ product delivery if the work is platform governance, developer APIs, or privacy frameworks
- Uber on the resume ≠ product delivery if the work is fraud detection, payments infrastructure, or risk systems
- The brand is irrelevant. The functional work is what counts. Read the bullet points, not the company name.

EDGE CASES:
- Pinterest Ads TPM = consumer-adjacent product delivery = 3-eligible. Ads on Pinterest appear in the consumer feed — this is NOT pure B2B. Do not score as 2 for "ads = B2B."
- TurboTax = not consumer (4-ineligible) but product delivery = 3-eligible
- Cash App / Venmo / Remitly consumer app = consumer = 4-eligible
- Kindle = consumer. Scholastic = not consumer, 3-eligible via product delivery
- Gaming = consumer
- Square merchant tools = B2B product = 3-eligible, never 4
- Banking product / patient-facing healthcare app, genuinely shipped = 3, never 4
- Amazon Prime (ML infra/personalization backend) = internal = 2
- Google Chrome (platform governance/developer APIs) = internal = 2

---------------------------------------
MANAGEMENT EXPERIENCE RULE
---------------------------------------
- Influence/mentorship only (leading tiger teams, cross-functional influence, mentoring, coordinating groups that don't report to them) → automatic 3 cap, no exceptions, regardless of how strong the rest of the profile is
- Real reporting-line management → can qualify for 4 if all other criteria met. Qualifying signals: "managed a team of N TPMs," "managed a team of N PMs," "built/grew the TPM team from X to Y," hiring responsibility, performance reviews, headcount ownership. The phrase "direct reports" is NOT required — look for signals that these people actually reported to this person.
- NOT qualifying (cross-functional coordination, not reporting-line): "managed product teams," "managed 20 engineers," "managed across X teams" — in TPM context these typically mean coordinating a cross-functional group that doesn't report to the TPM. These = influence only = 3 cap.
- When in doubt: if there is no hiring, headcount, or performance signal, treat as influence-only = cap at 3.

CALIBRATION EXAMPLE:
Orin Orlopp (Disney/NBCUniversal/Amazon Prime Video): Disney+, Peacock, Prime Video consumer streaming TPM with 10+ years. Led 500+ stakeholder launches, formed 35-engineer tiger team, quantified outcomes throughout. Strong on every dimension EXCEPT management — no direct reports anywhere on resume. Score = 3 (automatic cap due to management rule).

---------------------------------------
CALIBRATION EXAMPLES
---------------------------------------

SCORE 3 - Ariela Swaner (Sony Electronics / Phunware / AT&T) — HIRING MANAGER VERIFIED:
Sr. Engineering Manager / Product & Program Lead at Sony Electronics (7 yrs), Sr. Program Manager at Phunware (2 yrs), AT&T. Score 3. Sony: built PMO from scratch for R&D organization; led first-of-kind consumer and partner technology products including XYN Motion Studio (Windows PC app shipped to consumer and professional markets), Envision TV AR mobile app (4+ star rating, multi-platform App Store/Google Play launch, CCPA-compliant), and volumetric capture studio (consumer-facing platform, featured on NBC Today Show). Led cross-functional teams of 20+ direct reports across Product, Program, Engineering, QA, and Design — explicit people management throughout. Phunware: led 100+ monthly releases for FOX Digital Consumer Group ($12M+ account) — FOX NOW, FXNOW, Nat Geo TV, FOX Nation — D2C streaming across iOS, Android, tvOS. Led FOX's first D2C subscription streaming application from kickoff through launch. Consumer product delivery is real and substantial. Score 3 and not 4: primary background is engineering management and program delivery, not senior TPM title progression; also currently managing PMs rather than being a peer TPM, which creates a slight question about fit dynamic. HM: "Good profile. Definitely very supportive of interviewing Ariela."

SCORE 3 - Lauren Bernstein (Block/Square / Squarespace / Zocdoc) — HIRING MANAGER VERIFIED:
Lead TPM for Square Product Engineering (2,500+ person product org), managed 10 TPMs; earlier built the Square eCommerce TPM function from scratch. Shipped GenAI product features (20+ in 6 months), international market launches (+10% revenue), in-house delivery MVP in 2 weeks. Square is a B2B merchant/payments platform — no consumer product anywhere on the resume. Ed scored this resume a 3 and she nearly received an offer. Reason: genuine product DELIVERY at a B2B product = 3 under the product delivery gate. topConcern: probe how much work was with genuine product teams vs. product-engineering process; probe startup adaptability.

SCORE 3 - Anna Bressi (Remitly / Amazon / SmugMug):
Principal TPM for VOC & product quality at Remitly (mass-consumer remittance app), Sr TPM at Amazon; ~7 years across TPM titles; managed 5 program managers at SmugMug. The core work is customer-insights/VOC operating systems — internal by nature — BUT her programs carry quantified consumer product outcomes (+43% send volume / +17% user growth in Canada, +31% downloads / +11% retention on Android CX, $7M revenue defect opportunity). Score 3 via the CUSTOMER-INSIGHTS EXCEPTION. topConcern: probe how directly she drove product delivery versus fed it with insights.

SCORE 3 - Dia Shuchika Gupta (Pinterest / Fitbit / Fitstar) — HIRING MANAGER VERIFIED (HM scored 3):
Sr. TPM at Pinterest Ads. Score 3. Do NOT score as 2 for "ads = B2B." Ads on Pinterest appear in the consumer feed — Pinterest is a consumer product, and ad format decisions, targeting UX, and ad delivery systems surface directly to consumers in their feed. Pinterest Ads TPM experience = consumer-adjacent product delivery. Strong management signal: built the TPM team from ground up, 5+ years people management. Also has genuine consumer product experience: Fitbit (Fitstar personal trainer app, 2015-2017) = real consumer app. The autoscreener gave 2 (incorrect). HM gave 3 (correct). topConcern: probe how much she owned the consumer-facing ad UX versus purely backend delivery infra.

SCORE 1 - Bhavika Banwari (2K Games/Rockstar Games):
10+ years TPM experience, managed 45+ person QA org, shipped major AAA titles (Civ 7, RDR2, GTA 5). Score 1. Reason: Entire career is QA program management — testing, quality assurance, release validation. QA TPM and product TPM are different functions. Despite consumer gaming context, the work is internal QA operations, not product program delivery.

SCORE 3 - Renee Chorney (Unity/Fastly/Twitter):
Strong TPM, built teams, senior level. Consumer product present. Score 3.

SCORE 3 - William Gambling (Peloton/OnDeck):
Built TPM function from scratch, managed 10 TPMs, consumer products (Peloton). Score 3.

SCORE 4 - Adrian Hills (Credit Karma / Uber / Apple) — HIRING MANAGER VERIFIED (HM scored 4):
Senior Staff TPM at Credit Karma (7+ yrs), Program Manager II at Uber (3 yrs), Apple. Score 4. Credit Karma: led A/B experiments and product initiatives across free credit scores, account monitoring, and front door — consumer-facing direct-to-consumer financial product at massive scale (100M+ users). Drove full experimentation-to-deployment lifecycle including success metrics, engineering coordination, ship/iterate/kill decisions. Led credit bureau data migration at 100M+ user scale. Co-developed annual operating plans and OKR frameworks with C-suite. Uber: owned complete redesign and rewrite of Uber rider app (iOS/Android), shipped to 227M users with 99.97% crash-free rate. Managed release management for Rider engineering. Onboarded and mentored 15 TPMs; managed TPM team directly with direct reports. Operated at VP/CTO level. Explicit people management throughout. HM notes: "Hits all the boxes — mentorship/coaching, direct-to-consumer products, cross-functional with product/design, operated at high level of seniority." This is the profile we want to be interviewing.

SCORE 4 - J. Ryan Steffen (Amazon/SunPower):
Data-driven throughout with quantified outcomes. Managed TPMs. Cross-functional at scale. Amazon consumer devices. Score 4.

SCORE 2 - Kiran Kumar Bhanja (Amazon Prime/AWS S3/Amazon Finance):
Amazon lifer, Prime Personalization AI/ML, S3, Oracle Financials, Kindle Device. Looks like a consumer 4 on paper. Score 2. Reason: Every role is infrastructure, platform, or operations — S3 storage engineering, Oracle DB SOX controls, device observability tooling, finance ledger systems. No product delivery anywhere. Consumer brand ≠ product experience.

SCORE 2 - Tarek ElBahnasawy (Google Chrome/Uber Fraud/IBM Government/Western Union):
20+ years, managed 5 TPMs at Uber. Score 2. Reason: Every role is process-heavy and governance-heavy — Chrome platform governance, privacy-by-design frameworks, fraud/risk detection systems, payment compliance, federal government modernization. This is a process architect, not a product-shipping TPM. Large company + recognizable name ≠ product delivery.

SCORE 2 - Lauren Abrams (WBD/Disney Streaming/Expedia):
Consumer streaming TPM (Disney+, HBO Max), staff-level background. Score 2. Reason: Under the 4-year TPM title threshold — less than 2 years in an actual TPM title. Prior experience was project manager and scrum master level, which does not count toward the TPM tenure gate. Too junior for this level regardless of company pedigree. (Note: distinct person from Lauren Bernstein, who is a 3.)

SCORE 3 - Michael Goldner (Amazon Astro/Alexa/Klaviyo) — HIRING MANAGER VERIFIED:
25+ years TPM, managed 20 TPMs at Amazon, consumer devices (Echo Show, Astro, Alexa). Score 3. Strong consumer product (Echo Show, Astro, Alexa), managed a team of TPMs at Amazon. Not a 4 due to downward trajectory post-Amazon — only 2 months into a more junior role at time of application. Worth a recruiter screen.

SCORE 2 - Sudar Akkala (GoPro/Harman/Qualcomm):
20 years TPM experience, managed large global teams, strong execution track record. Score 2. Reason: Entirely hardware/embedded firmware context (action cameras, automotive IVI, mobile SoC). The delivered product must be software — no software product delivery anywhere.

SCORE 2 - Vipul Panchal (Amazon/Wells Fargo):
Amazon Shopping TPM with Gen-AI experience. Score 2. Reason: Only 3 years as a TPM — under the 4-year TPM title threshold. Prior 16 years spent as software engineer and architect. No experience managing or coaching TPMs. The tenure must-have cannot be waived by product delivery.

SCORE 2 - Casey Charlton (Meta Globalization/River Linguistics):
Strong operator, 9 years at Meta. Score 2. Reason: Career is predominantly vendor management, internationalization, and localization platforms — internal work, not product delivery. Wrong functional domain.

SCORE 2 - Jaclyn Waters (EA / The Sims 4):
Engineering Development Director / Sr TPM at EA Maxis on The Sims 4. Score 2. Reason: The entire body of work is internal: engine modernization (DirectX 11 migration), internal tooling, developer workflow, content pipeline improvements, Jira architecture redesign, agile transformation. "The Sims 4" is a consumer product but her work never shipped to players. Internal work at a consumer company = 2.

SCORE 2 - Rodion Gusev (Pinterest / Instapaper):
Sr Manager TPM at Pinterest leading 30 TPMs across support systems, tooling, and data governance. Score 2. Reason: Functional work is support operations infrastructure — internal support platform, ticket automation, appeals flows, routing models, compliance tooling. Support-ops metrics are not consumer outcomes, so the customer-insights exception does not apply. Also only 3 years in explicit TPM title (prior 6 years were Business Analyst and Support Ops — don't count).

---------------------------------------
MUST-HAVES (required for 3 or 4)
---------------------------------------
- TPM scope: explicit TPM/Sr. TPM title, OR TPM-scope role (Program Manager, Engineering Manager with product delivery bullets) — see TITLE RULE FOR SCORE 3
- For Score 4: 4+ years explicitly in a TPM or Senior TPM title (strict). For Score 3: 4+ years in TPM-scope roles per the title rule above.
- Genuine product delivery experience (consumer OR B2B) per the PRODUCT DELIVERY GATE — at least one chapter (~2+ years) within the last 7 years. Consumer-facing experience additionally required for a 4.
- Program ownership, not just coordination or task management

---------------------------------------
NICE-TO-HAVES (push 3 to 4; consumer-facing recent experience is REQUIRED for 4)
---------------------------------------
- FAANG or similar large-scale tech company (boost only — not a gate)
- Direct management of TPMs or technical staff
- Data-driven resume with quantified outcomes
- Owns annual planning and OKR-to-roadmap translation
- Consumer product in most recent role

---------------------------------------
DISQUALIFIERS = score 1 (NARROW — only these four)
---------------------------------------
- Pure project coordination — entire career is task-tracking, meeting facilitation, process admin with no program ownership at any level
- No technical fluency whatsoever — cannot engage with engineering, no technical domain at all
- QA / testing as primary career function for the whole career (not just one role)
- Completely unrelated field — sales, marketing, finance, HR with no engineering or program management context

NOTE: Wrong-domain TPM (infra-only, security-only, internal-only), title gap, under-tenure, wrong company type = Score 2, NOT Score 1. Score 1 means "this person has never done anything close to this job." Score 2 means "they've done program work but wrong flavor for this role."`;


const display = {
  "4 = Strong Yes": [
    "4+ yrs explicit TPM/Sr. TPM title (strict for 4)",
    "Reporting-line management: team of N TPMs or PMs who report to them, hiring/headcount ownership",
    "Consumer-facing product (most recent 3 yrs)",
    "Data-driven + quantified outcomes throughout",
    "FAANG = boost only, not a gate"
  ],
  "3 = Yes": [
    "TPM-scope role (TPM title OR EM/PM with product delivery bullets) — scope over string",
    "At least one product-delivery chapter (~2+ yrs, last 7 yrs)",
    "B2B product delivery = 3, never 4",
    "Consumer product present but 4-7 yrs ago = 3 not 2",
    "Missing dates = flag in concern, never zero out",
    "Management influence-only or light = still a 3, not a 2"
  ],
  "3M = Yes (Mgmt Cap)": [
    "Would be a 4 — passes every other gate",
    "Only gap: no reporting-line management (influence/tiger teams only)",
    "Cross-functional coordination ≠ direct reports"
  ],
  "2 = No": [
    "No product-delivery chapter within last 7 yrs — entirely internal/ops/infra",
    "EM whose entire career is internal org work with no external product delivery",
    "Title/tenure gap — Scrum Master, Product Owner, IC engineer as primary background",
    "FAANG brand but functional work is backend, security, platform, or infra"
  ],
  "Score 1 = ONLY these 4": [
    "Pure project coordination — no program ownership ever",
    "No technical fluency whatsoever",
    "QA as primary career function (whole career, not just one role)",
    "Completely unrelated field — sales, HR, finance, no engineering context"
  ],
  "Consumer product = YES": [
    "Mass consumer apps (Cash App, Spotify, Netflix)",
    "Gaming, consumer media, content platforms",
    "Consumer marketplaces (Amazon retail, eBay, Airbnb)"
  ],
  "Consumer product = NO (3-eligible via product delivery)": [
    "B2B tools (Salesforce, HubSpot, Shopify)",
    "Enterprise/compliance fintech (TurboTax, mortgage, banking infra)",
    "Consumer-facing fintech (Cash App, Venmo, consumer banking app) = YES",
    "Healthcare, educational/institutional platforms",
    "Platform / infra / architecture work = 2 (internal, not product delivery)"
  ]
};

module.exports = { label: "Ed · Sr Manager TPM", archived: true, criteria, display };
