"use strict";
// Ed · Product Ops Lead — ARCHIVED (role closed)
const criteria = `ROLE: Product Operations Lead
HIRING MANAGER: Ed / Scribd
TEAM: TPM (7 people) — this is the FIRST ops hire on the team

ROLE MANDATE: Resource planning, vendor lifecycle management, G&A partnerships
(Finance, Legal, HR, IT), AI tooling, company planning.
Broad remit. Must be a connector and builder, not just a coordinator.

---------------------------------------
GATE 1: COMPANY / INDUSTRY
---------------------------------------

PASS (tech company — can score 3 or 4):
- Consumer tech companies (Amazon, Meta, Google, Netflix, Spotify, Uber, Airbnb, etc.)
- B2C software companies
- Mixed B2B + B2C tech companies
- Modern SaaS companies serving tech-forward industries
- AI product companies
- Tech startups (consumer or mixed)

PROBE — not an automatic kill, note it for recruiter screen:
- Pure B2B enterprise software (Salesforce, Workday, ServiceNow, SAP) — flag but do not auto-reject

HARD 2 — wrong industry, do not advance:
- Exclusively supply chain, logistics, or manufacturing
- Exclusively healthcare, medtech, or pharma
- IT department roles (even at tech companies — IT dept ≠ tech ops)
- Compliance, legal, privacy, or regulatory ops background
- Government or military
- Legacy enterprise / Web 1.0 companies (IBM, traditional consulting, banks)
- Traditional non-tech industries (retail, hospitality, real estate, media production)
- Exclusively finance or accounting functions
- Niche vertical SaaS with no broader tech applicability

---------------------------------------
GATE 2: AI REQUIREMENT
---------------------------------------

ANY mention of AI is sufficient to pass this gate:
- Using ChatGPT, Claude, Copilot, or other AI tools in their work
- Deploying AI chatbots or automation
- Building AI tools, agents, or workflows
- Mentions AI in context of their operational work (not just a skills checkbox)

NO AI mention anywhere = hard 2. Skills-section-only with no work context = hard 2.

---------------------------------------
GATE 3: STRATEGIC LEVEL — CRITICAL
---------------------------------------

CAPS AT SCORE 2:
- Confirmed analyst or IC scoped to a single team — no XFN program ownership
- Tool-building, dashboard creation, or systems implementation without strategic ownership
- Analyst within a single function with no broader mandate

REQUIRED FOR SCORE 3+:
- Evidence of owning cross-functional programs, designing frameworks, or shaping org-level processes

REQUIRED FOR SCORE 4:
- VP+/C-suite influence explicitly evidenced

---------------------------------------
GATE 4: OPS TYPE
---------------------------------------

PEOPLE OPS IS NOT PRODUCT OPS — Score 1 disqualifier:
- Primarily HR Operations or People Operations = wrong mandate, do not advance

---------------------------------------
SCORING
---------------------------------------

4 = Strong Yes:
- Tech/B2C ✓, AI in work context ✓, 6+ yrs S&O/BizOps/TPM ✓
- Owned XF operational programs inside product/engineering/bizops org ✓
- G&A function partnership (Finance, Legal, HR, IT) ✓
- VP+/C-suite influence explicitly evidenced ✓

3 = Yes: Tech ✓, AI ✓, XFN program ownership ✓, one gap allowed
2 = No: Wrong industry, no AI, analyst scope, tool-builder without strategy, CX/support only
1 = Strong No: Under 4 yrs, People Ops, tactical-only, completely irrelevant background

---------------------------------------
CALIBRATION EXAMPLES
---------------------------------------

SCORE 4 — Sean Marrer (Quizlet): Reported to CEO, built two functions from scratch, AI-enabled support, C-suite strategic planning/budgeting.
SCORE 4 — Ramon Garcia (Uber): Builder + AI + XFN across Marketing/Finance/Ops + $8M budget authority.
SCORE 4 — Yitzy Rosenberg: AI-powered tools + G&A XFN (finance, legal) + vendor management + resource planning.
SCORE 3 — Cristina Lescay Megret (Netflix): Finance/G&A/vendor lifecycle ✓, AI builder ✓. Gap: Analyst title, VP+ not explicit.
SCORE 2 — Timothy Enitinwa (Meta): FAANG but analyst-level scope within single team, zero senior stakeholder signal.
SCORE 2 — Cara Zugschwerdt (AWS): Tool-builder without strategic ownership.
SCORE 1 — Howard Chen (Hulu): Consumer tech but entirely execution-focused, no strategic/thought leadership.
SCORE 1 — Christen Soloman (FanDuel): People Operations background — wrong mandate.`;

const display = {
  "Gate 1: Company/Industry": [
    "PASS: Consumer tech, B2C software, mixed B2B+B2C, SaaS, AI cos, tech startups",
    "PROBE: Pure B2B enterprise (Salesforce, Workday) — flag, don't reject",
    "HARD 2: Supply chain, healthcare, IT dept, compliance, govt, legacy enterprise"
  ],
  "Gate 2: AI": [
    "ANY AI mention in work context = passes",
    "Skills section only (no work context) = hard 2",
    "Zero AI mention = hard 2"
  ],
  "Gate 3: Strategic Level (CRITICAL)": [
    "Score 3+ requires: XFN program ownership, org-level impact",
    "Score 4 requires: VP+/C-suite influence EXPLICITLY evidenced",
    "Score 2 cap: Analyst/IC scope, tool-builder without strategic ownership"
  ],
  "Gate 4: Ops Type": [
    "Must be inside product/engineering/bizops org",
    "People Ops / HR Ops = Score 1 disqualifier"
  ],
  "4 = Strong Yes": [
    "Tech/B2C + AI in work context",
    "6+ yrs Strategy & Ops / BizOps / TPM",
    "Owned XF programs in product/eng/bizops",
    "G&A function partnership (Finance, Legal, HR, IT)",
    "VP+/C-suite influence EXPLICITLY evidenced"
  ],
  "3 = Yes": [
    "Tech ✓, AI ✓, XFN program ownership ✓, one gap:",
    "VP+ not explicit → probe",
    "Finance/AP evolved into product ops → probe"
  ],
  "1 = Strong No": [
    "Under 4 years experience",
    "People Ops / HR Ops background",
    "Tactical-only role — zero strategic ownership"
  ]
};

module.exports = { label: "Ed · Product Ops Lead", archived: true, criteria, display };
