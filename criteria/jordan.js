"use strict";
const criteria = `ROLE: Senior Product Manager at Scribd — User-Facing AI Features (AI chat, summarization, proactive AI tools, intelligent UX)
HIRING MANAGER: Jordan

This is a zero-to-one role building AI-powered features that users directly interact with:
AI chat/workspaces, vocabulary highlighting, AI summaries, advanced find, proactive content surfacing.
The PM must navigate what is technically possible vs. what real humans actually want to use.
This is NOT a search/discovery/ranking infrastructure role — it is a user-facing AI product role.

---------------------------------------
CONSUMER PRODUCT DESIGN COMPLEXITY — CRITICAL GATE
---------------------------------------

Jordan's #1 concern. The candidate must have owned genuinely consumer-facing product
experiences — not just worked at a consumer company.

PASSES this gate:
- Owned AI chat, conversational AI, or AI assistant features users interact with directly
- Shipped AI summarization, highlighting, annotation, or intelligent content features to consumers
- Built proactive AI features that surface information to users before they ask
- Owned multi-step consumer user flows (onboarding, content browsing, intelligent UX)
- Led consumer UX involving content, social, entertainment, or knowledge experiences
- Designed for consumer engagement: feeds, notifications, save/like flows, subscription UX
- Evidence of qual + quant consumer research informing product design decisions

FAILS this gate (Score 2 regardless of company name):
- Owned a B2B portal, brand dashboard, partner API, or operator tool — even at a consumer company
- Ops or infrastructure roles at consumer companies (change management, incident response, platform reliability, content ops)
- Consumer-adjacent scope where bullets focus on process/delivery rather than consumer experience design
- Backend ML/search ranking/recommendation INFRASTRUCTURE without owning the user-facing feature layer
  (e.g. "improved recommendation algorithm," "optimized ranking model," "built ML pipeline" = Score 2 unless they also owned the UX that surfaces it)

---------------------------------------

4 = Strong Yes
ALL of the following must be true:
- 5-10 years PM experience
- Consumer-facing product at meaningful scale: 2M+ users OR a recognizable consumer brand
- THE PRODUCT ITSELF must be consumer-facing — owning a B2B portal or operator tool at a consumer company does NOT qualify
- Consumer Product Design Complexity ✓ — multi-step flows, intelligent UX, content/social experiences
- Shipped user-facing AI features users directly interact with or benefit from — AI-powered search, discovery, personalization, recommendations surfaced to users, AI chat, summarization, copilots, intelligent content UX, proactive AI, or any AI-driven feature users engage with directly. NOT purely backend ML pipeline or ranking infra with no user-facing product ownership.
- Strong design partnership — shapes user journeys, works closely with UX research
- Owned engagement or activation metrics (CTR, retention, saves/views, conversion, time spent)
- Zero-to-one product experience is a strong push signal toward 4
- FAANG or high-scale consumer platform = boost signal (not required)

3 = Yes
AI is NOT required for Score 3. A strong consumer PM without AI experience can reach 3.
AI is only a hard requirement for Score 4.

A candidate scores 3 if they meet the consumer product design complexity gate and most of the Score 4 signals, with gaps in one or more of:
- AI experience (missing entirely is fine for 3 — AI pushes toward 4 but absence doesn't drop to 2)
- Design partnership implied but not explicit
- Consumer scale slightly below 2M+ but still at a recognizable brand
- Zero-to-one experience missing but all other signals strong

PMs who worked on search, recommendations, or personalization with ML teams = qualifies for Score 3, even if the work was infra-adjacent, provided they owned a user-facing product surface (e.g. the search page, the recommendations feed) and can demonstrate consumer product design complexity.

If borderline 3.5, call it out in summary with reason.
EXCEPTION: Strong B2B PM or infra-leaning AI PM may also reach 3 via the exceptions below — see B2B PRODUCT-CRAFT EXCEPTION and ML PM EXCEPTION.

FAANG SEARCH / AI ADJACENCY EXCEPTION (2 → 3 only):
- A candidate who worked at FAANG on Search, Discovery, AI, or ML-adjacent teams may score a 3 even without explicit consumer product ownership — BUT ONLY IF there is at least some signal of consumer-facing product anywhere in their background
- Cannot reach a 4 without shipped user-facing AI features (not infra)
- MUST flag in topConcern: "NOTE: Scored 3 via FAANG Search/AI adjacency exception — validate consumer product depth and user-facing AI ownership in screen."

ML PM / USER-FACING FEATURE AT SCALE EXCEPTION (2 → 3):
- An AI/ML-focused PM whose resume reads primarily as infrastructure, ranking, or recommendation may score a 3 IF they can demonstrate explicit ownership of at least ONE named user-facing AI feature, owned end-to-end, at 1M+ users or DAU.
- The qualifying feature must be within the last 5 years. A user-facing feature from 2016 followed by a decade of pipelines does not count.
- Consumer company required for this exception — B2B + infra-adjacent = Score 2.
- This exception does NOT apply to anyone whose resume has zero named user-facing features — only model, pipeline, or infra bullets = Score 2.
- Cannot reach a 4 via this exception.
- Cannot stack with the B2B exception or FAANG exception.

  IF companies on resume are recognizable/meaningful (Spotify, Reddit, Expedia, FAANG-tier, major consumer platforms):
  → Score 3, scoreLabel: "Yes"  (standard blue card in report)

  IF companies are unrecognizable and scale claim cannot be validated by brand recognition alone:
  → Score 3, scoreLabel: "Yes ML-Scale"  (renders in bright pink #EF008C in report — recruiter must review before advancing)

  MUST flag in topConcern: "Scored 3 via ML PM exception — validate depth of user-facing feature ownership vs. model/infra work in screen."

B2B PRODUCT-CRAFT EXCEPTION (2 → 3 only):
- A strong B2B or prosumer PM may score a 3 IF ALL of the following are true:
  (1) VOLUNTARY ADOPTION: Individual users voluntarily adopted and could abandon the surface they owned — self-serve, PLG, or consumer-grade B2B (Shopify, Figma, Notion, Canva tier). Captive enterprise users (Jira admin console, Salesforce workflow config, permissions, billing portals) do NOT qualify.
  (2) INDIVIDUAL USER METRICS: Owned activation, conversion, engagement, or retention of individual users — NOT ARR, seats, logos, or account-level NPS.
  (3) UX CRAFT: Evidence of product craft — named user flows, A/B experiments, design/UX research partnership visible in bullets.
- Enterprise scale alone (e.g., "300K customers") NEVER qualifies — scale must be of individual users the PM designed for. Contract/seat counts are not user scale.
- Cannot reach 4. scoreLabel: "Yes B2B-Craft"  (renders in bright pink #EF008C — recruiter must review before advancing.)
- Cannot stack with ML PM exception or FAANG exception.
- MUST flag in topConcern: "Scored 3 via B2B-Craft exception — validate voluntary user adoption, individual engagement metrics, and AI feature depth in screen."

2 = No
- Backend ML, ranking, recommendation, or search infrastructure work — without owning any user-facing product surface (the page, the feed, the feature users interact with). Pure infra/pipeline/model work with no product ownership = Score 2.
- "Improved the algorithm" or "optimized the model" without product ownership of the UX = Score 2
- Primarily B2B, internal tools, enterprise workflow, or operational platforms (unless B2B product-craft exception applies — see above)
- B2B product at a consumer company (brand portal, partner dashboard, operator tool)
- Ops/infrastructure role at consumer company with no consumer product design ownership
- AI work focused on privacy, fraud, compliance, or operational automation = max 2
- Passive verbs: "guided," "supported," "contributed to" — no clear ownership
- Ecommerce, social commerce, or retail marketplace without content/media/knowledge dimension
- EdTech platform (exam prep, tutoring, upskilling, workforce training)
- AI discoverability optimization, AEO, SEO for AI search engines, content pipeline for LLM indexing
- Sub-2M user consumer platform with no recognizable brand

1 = Strong No — IMMEDIATE DISQUALIFY
Any of the following = score 1:
- Federal modernization or government systems
- Case management systems
- Mortgage underwriting or financial compliance workflows
- Tax compliance platforms
- Regulated enterprise data systems
- No consumer product experience at all
- Under 5 years PM experience

---------------------------------------
CALIBRATION EXAMPLES
---------------------------------------

SCORE 4 - Amazon/Audible/Kindle PM:
Owned user-facing AI features at 300M+ users — ML-ranked content surfaces to users directly, owns annual planning, consumer content at scale, strong experimentation. Score 4.

SCORE 3 - Robin Ringman (Spotify / Expedia / Reddit):
ML/AI PM at Spotify who owned Shuffle and Smart Shuffle features at 110M DAU with 6.4% Listen Time impact — explicit user-facing feature ownership at massive consumer scale. Current role at Expedia is search/ranking infrastructure, which normally = Score 2. But the Spotify Shuffle/Smart Shuffle ownership is the signal: she crossed from infra into owning what users actually touch, at meaningful scale, at a recognizable company. Score 3, standard blue (not #EF008C). Spotify, Expedia, and Reddit are all recognizable/meaningful companies — no pink flag needed.

SCORE 3 - Walmart Reorder PM:
Consumer product, AI personalization surfaced to users, strong metrics. Design/UX depth needs validation. Score 3.

SCORE 3 (FAANG exception) - Tye Rainford (Google Search Platform PM):
Platform/developer tools work at Google Search. No explicit consumer product. BUT Google Search adjacency implies strong ML ecosystem exposure. Jordan explicitly rated a 3. Flag consumer product gap and user-facing AI ownership in concern.

SCORE 2 - Search/Ranking Infrastructure PM (any company):
Worked on recommendation algorithm, ML ranking model, or search infrastructure. Did NOT own the user-facing feature or UX. Backend infra work without consumer product ownership = Score 2.

SCORE 3 (B2B-Craft exception) - Shopify Checkout PM (hypothetical):
Owned the checkout shopper UX (used by hundreds of millions of shoppers), conversion-obsessed A/B experimentation, design partnership, engagement and conversion metrics for individual shoppers, shipped AI-powered product recommendations surfaced at checkout. Score 3. Pink flag. Passes all 4 B2B-craft gates: voluntary shopper adoption ✓, individual conversion metrics ✓, UX craft ✓, AI features ✓.

SCORE 2 - Atlassian Jira Platform PM (any scale):
"300K+ customers" is contract scale, not user scale — Jira users are captive (company bought it, they have no choice). No voluntary adoption test passed. Score 2 even at massive scale. Would only edge to 3 if they owned an end-user engagement surface (e.g., Trello growth with adoption A/B tests and individual user metrics) AND shipped AI features.

SCORE 2 - Mallory Dobson (Housecall Pro / Ibotta):
B2B SaaS career — home services portal, CPG brand portal (10K brands, not consumers). Zero evidence of consumer product design complexity. Fails B2B-craft exception: no voluntary individual user adoption, no user engagement metrics, no AI features. Score 2.

SCORE 2 - HubSpot Content AI PM:
AI content tools inside a SaaS dashboard — not consumer-facing AI features. Score 2.

SCORE 2 - Deepika Negi (Atypical AI / Gobillion):
EdTech (exam prep) + social commerce in Tier 2/3 India — niche regional, not meaningful consumer scale. Score 2.

SCORE 2 - Pallavi Sawant (Uber/Vivma EatSure):
Uber PM owning rider personalization (ML ranking of home-screen rides), shipped YOUBER 2025 year-in-review product. Prior role at Vivma/EatSure food-tech (80K users). Score 2. Reasons: (1) The core Uber work is ranking/recommendation infrastructure — "defining how home-screen ride options are ranked using real-time context and ML" is backend ML infrastructure, not owning a user-facing AI product users interact with directly. YOUBER is user-facing but lightweight and seasonal, not the substance of the role. (2) Vivma/EatSure at 80K active users fails the 2M+ scale gate and is not a recognizable brand. Do not let "Uber" in the title override the fact that the actual product work is ranking infrastructure.

SCORE 2 - Ilario Huober (Outdoorsy / Bleacher Report):
"AI knowledge product" is AEO/content pipeline for AI search engines — not user-facing AI features. Score 2.

SCORE 1 - Federal/Government Modernization PM:
Case management, regulated enterprise, compliance workflows. Immediate disqualify.

---------------------------------------
NICE-TO-HAVES (push 3 toward 4)
---------------------------------------
- Zero-to-one product experience — built something from scratch (strong signal for this role)
- AI chat / conversational AI product shipped to consumers
- LLM-powered features shipped (copilots, assistants, summarization, content generation)
- Proactive AI features — surfaces info to users before they ask
- Knowledge, content, reading, or publishing platform background
- Subscription product experience
- FAANG or high-scale consumer platform

---------------------------------------
TENURE / JOB HOPPING
---------------------------------------
- DISQUALIFIER: 3+ roles under 36 months in last 7 years = score 1
- RED FLAG: Average tenure under 2 years with no recent stability = score max 2
- RED FLAG: Any role under 12 months in the last 4 years = flag in concern; 2+ such roles = cap at 2
- EXCEPTION: Most recent role 3+ years redeems choppy earlier history

---------------------------------------
DISQUALIFIERS = score 1
---------------------------------------
- Under 5 years PM experience
- No consumer product experience
- Primarily internal tools, enterprise workflow, regulated systems
- Federal/government/compliance/case management/mortgage/tax/data migration work
- 3+ roles under 36 months in last 7 years`;

const display = {
  "Consumer Design Complexity (CRITICAL)": [
    "Product itself must be consumer-facing — not B2B portal/operator tool at consumer co",
    "PASSES: consumer content/social/media UX, search/recs/personalization owned as PM, AI features, consumer mobile/web product",
    "FAILS: pure backend ML/ranking infra with no product ownership, brand portal, operator tool, ops/infra role at consumer co"
  ],
  "4 = Strong Yes": [
    "5-10 yrs PM + consumer B2C at 2M+ users or recognizable brand",
    "Consumer Product Design Complexity ✓",
    "Shipped user-facing AI features (AI search, personalization, recommendations, chat, summarization, copilots, proactive AI — any AI-driven feature users engage with)",
    "Strong design + UX research partnership",
    "Owned engagement/activation metrics",
    "Zero-to-one experience = strong push toward 4"
  ],
  "3 = Yes": [
    "AI NOT required for 3 — strong consumer PM without AI = 3",
    "AI is only a hard gate for Score 4",
    "Consumer product design complexity ✓ + most signals present + one gap = 3",
    "Search/recs/personalization PM who owned the product surface (the page, the feed) = 3, even if ML-adjacent",
    "ML PM exception: ONE named user-facing feature, end-to-end, 1M+ users, within 5 years",
    "B2B-Craft exception: voluntary user adoption + individual user metrics + UX craft (3 gates, AI not required)",
    "Exceptions never stack — one path only"
  ],
  "2 = No": [
    "Backend ML/ranking/recommendation infra without owning the user-facing feature = 2",
    "'Improved the algorithm' without consumer product ownership = 2",
    "B2B product at consumer company (portal, partner tool) = 2",
    "Ops/infra role at consumer company = 2",
    "AI surface-level, strategy, or backend only",
    "EdTech (exam prep, tutoring, upskilling) = 2",
    "AI discoverability / AEO / SEO for AI ≠ user-facing AI features",
    "Sub-2M user platform with no recognizable brand = 2"
  ],
  "Immediate 1s": [
    "Federal / government modernization",
    "Case management / mortgage / tax / compliance",
    "No consumer product experience"
  ],
  "Tenure rules": [
    "3+ roles under 3yrs in last 7yrs = Score 1",
    "Avg tenure < 2yrs = max Score 2",
    "Any role < 12 months in last 4 yrs = flag; 2+ = cap at 2"
  ],
  "Nice-to-haves (push 3→4)": [
    "Zero-to-one product experience — built from scratch",
    "AI chat / conversational AI product shipped to consumers",
    "LLM features: copilots, assistants, summarization, proactive AI",
    "Knowledge / content / reading / subscription platforms"
  ]
};

module.exports = { label: "Jordan · Sr Product Manager", archived: true, criteria, display };
