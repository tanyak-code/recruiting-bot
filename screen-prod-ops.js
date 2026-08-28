#!/usr/bin/env node
/**
 * Product Operations Lead Screener — Brainner → Claude → Live HTML + CSV
 * Pulls top 50 candidates from Brainner (by Brainner score),
 * screens with Ed's calibrated criteria, writes a live HTML report
 * that auto-refreshes every 4s while running.
 *
 * Run: node screen-prod-ops.js
 * Then open: prod-ops-report.html in your browser
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────────────────────────
const BRAINNER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ANTHROPIC_KEY = "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";
const JOB_SLUG = "957115f1-3544-4956-afaf-59817757e0e5";
const TOP_N = 9999; // ALL To Review candidates
const HTML_FILE  = path.join(__dirname, "prod-ops-report.html");
const CSV_FILE   = path.join(__dirname, `prod-ops-screened-${new Date().toISOString().slice(0,10)}.csv`);
const CACHE_FILE = path.join(__dirname, "prod-ops-cache.json");
// ────────────────────────────────────────────────────────────────────────────

const ED_CRITERIA = `ROLE: Product Operations Lead
HIRING MANAGER: Ed / Scribd
TEAM: TPM (7 people) — this is the FIRST ops hire on the team

ROLE MANDATE: Resource planning, vendor lifecycle management, G&A partnerships
(Finance, Legal, HR, IT), AI tooling, company planning.
Broad remit. Must be a connector and builder, not just a coordinator.

---------------------------------------
SCORING SCALE (Ed-calibrated from 27 real candidates)
---------------------------------------

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
- Niche vertical SaaS with no broader tech applicability (food-tech, automotive IoT,
  construction-tech, etc.) — background unlikely to transfer

---------------------------------------
GATE 2: AI REQUIREMENT
---------------------------------------

ANY mention of AI is sufficient to pass this gate:
- Using ChatGPT, Claude, Copilot, or other AI tools in their work
- Deploying AI chatbots or automation
- Building AI tools, agents, or workflows
- Mentions AI in context of their operational work (not just a skills checkbox)

NO AI mention anywhere = hard 2. Skills-section-only with no work context = hard 2.
Recruiter/HM will assess depth of AI signal — screener only checks presence.

IMPORTANT DISTINCTION — AI features ≠ AI enablement:
Working on AI product features as a PM (e.g., building Copilot in Word, AI chatbots for customers)
does NOT satisfy this gate. The role requires internal AI enablement — using or building AI tools
to improve operations, automate workflows, or reduce manual overhead for the team.
A candidate who only worked on AI as a product surface, with no mention of using AI internally
to run their own work or team, should be flagged for probe and capped at 3.

---------------------------------------
GATE 2B: QUANTIFIED IMPACT REQUIREMENT
---------------------------------------

Candidates without ANY quantified metrics or measurable outcomes in their resume are capped at 2.
Vague statements like "improved operational efficiency," "drove impact," or "enhanced scalability"
without numbers do not pass. Must show at least some: cost savings ($), time reduction (%),
revenue impact, team scale, or other concrete measurable outcomes tied to their work.
Even one or two strong numbers are sufficient — this is a signal check, not a requirement for
every bullet. A resume with zero numbers across all roles = hard 2 regardless of company pedigree.

---------------------------------------
GATE 2C: AI-WRITTEN RESUME FLAG
---------------------------------------

Flag the score with an asterisk (*) in the scoreLabel field (e.g., "Yes*" or "No*") when the
resume shows strong signals of being heavily AI-generated. Do NOT change the score — just flag it
so the recruiter knows to verify authenticity in the screen.

Flag when TWO OR MORE of the following are present:
- Excessive em dashes (—) as the primary bullet formatting style throughout
- Resume language mirrors the job description wording word-for-word or near-verbatim
- Suspiciously generic and polished language that reads as a template (e.g., "connective tissue
  between technical teams and the corporate functions they depend on")
- Claimed title or seniority on the resume is inconsistent with actual work history (e.g., "Staff" or "Director" title but bullets describe junior/individual execution scope)
- Summary is vivid and strategic but body bullets are thin or vague
Note: a well-written resume is NOT a flag on its own. Only flag when the above pattern is obvious.

---------------------------------------
JOB DESCRIPTION — FOR AI-DETECTION ONLY
---------------------------------------
Use the following JD phrases to identify verbatim or near-verbatim matches in the resume.
Do NOT use the JD to add new scoring criteria. Detection only.

Key JD phrases (Product Operations Lead — Scribd):
"connective tissue between our technical organization and the corporate functions it depends on"
"builder's instinct to all of it"
"when you encounter a broken process, your first instinct is to find the lightest, most durable fix"
"a sharper workflow, a well-placed policy, or a tool you built yourself"
"comfortable in the weeds of a vendor contract or a resource planning"
"comfortable presenting your findings and recommendations to a room of senior leaders"
"business acumen to understand a budget, the technical literacy to partner with engineers"
"thrive without formal authority, navigating complex organizational dynamics"
"deeply curious about AI, not as a trend but as a medium you already work in"
"voracious reader with a passion for books and the written (and spoken) word"
"Vendor lifecycle management: Build and run a formal vendor management program from the ground up"
"G&A partnerships: Serve as the primary interface between EPDA and corporate functions"
"Shipped and imperfect beats polished and theoretical"
"operational problem-solver who defaults to building"

---------------------------------------
GATE 3: STRATEGIC LEVEL — CRITICAL
---------------------------------------

This is the most common reason Ed rejects candidates. The role requires someone
who owns programs and shapes strategy — not someone who executes tasks within a team.

CAPS AT SCORE 2 (regardless of company pedigree):
- Confirmed analyst or IC scoped to a single team — no XFN program ownership
- Tool-building, dashboard creation, or systems implementation without strategic ownership
- Engineering or technical support for tooling/automation (even at a strong tech company)
- Analyst within a single function (AP analyst, ops analyst, data analyst) with no broader mandate

Ed: "If we don't see signal that a candidate has worked with and influenced senior leaders
(e.g., Director+ level) they are likely not going to be a good fit. The influence and
strategy piece is absolutely crucial."

REQUIRED FOR SCORE 3+:
- Evidence of owning cross-functional programs, designing frameworks, or shaping org-level processes
- Must show they designed, built, or owned something at org scale — not just executed

REQUIRED FOR SCORE 4:
- VP+/C-suite influence explicitly evidenced (not implied)
- Examples: "reported to CEO," "executive reporting chain to Board," "exceeded VP-level goal,"
  "partnered with C-suite on strategic planning," "cross-functional executive sponsor"

SCORE 3 allows the VP+ gap:
- Director+ influence OR XFN program ownership at meaningful scale is sufficient for Score 3
- Must flag in topConcern: "VP+ influence not explicitly evidenced — probe in screen"

---------------------------------------
GATE 4: OPS TYPE
---------------------------------------

Vendor management and resource planning ONLY qualify if performed INSIDE a
product, engineering, or business operations org — not IT, not finance/AP, not compliance.

PEOPLE OPS IS NOT PRODUCT OPS — Score 1 disqualifier:
- Primarily HR Operations or People Operations = wrong mandate, do not advance

---------------------------------------
SCORING WITHIN PASSING CANDIDATES
---------------------------------------

4 = Strong Yes — ALL of the following met:
- Tech/B2C company background ✓
- AI mentioned in work context ✓
- 6+ years Strategy & Ops / BizOps / TPM / Program Mgmt ✓
- Owned XF operational programs inside product/engineering/bizops org ✓
- G&A function partnership — Finance, Legal, HR, or IT cross-functional work ✓
  (not just financial awareness — actual XFN partnership with G&A orgs)
- VP+/C-suite influence explicitly evidenced ✓
- Entrepreneurial signal a plus: founder, first ops hire, 0-to-1

3 = Yes — Tech/B2C ✓, AI mention ✓, XFN program ownership ✓, ONE gap allowed:
- VP+ influence not explicitly evidenced — Director+ or XFN ownership at scale → flag for probe
- Finance/AP background that has clearly evolved into broader product/ops ownership → probe
- Ops is primarily external/outward-facing vs. internal efficiency
- Pure B2B software background (probe — not a kill)
- Startup-only with no recognizable brands
- AI mention is thin — recruiter to probe

2 = No — Any hard disqualifier OR strategic level gate fails:
- Wrong industry (see HARD 2 list above)
- No AI mention in work context
- No quantified metrics anywhere on the resume (Gate 2B)
- All ops experience started within last 18 months
- Narrow role: Scrum master, coordinator, delivery only
- Purely CX, support, or customer success
- Policy, compliance, legal, or privacy ops background — oversight role, not operations
- Pure PM background with no ops experience — different muscle even at a strong tech company
- Tool-builder or systems implementer without strategic program ownership
- Analyst scoped to a single team — no XFN program ownership
- No senior stakeholder signal AND no XFN program ownership
- Niche vertical SaaS background
- No ops/TPM/BizOps background at all

1 = Strong No:
- Under 4 years experience
- No ops background whatsoever
- Completely irrelevant background
- Primarily HR Operations or People Operations (wrong mandate)
- Data labeling, annotation, or content quality contractor — wrong mandate entirely
- Confirmed tactical/execution-only role with zero strategic ownership — even at a tech company
  (e.g., knowledge manager, customer support ops, IT support, AP analyst with no broader mandate)
  Ed: "If there's zero signal of strategic ownership or senior leader influence, it's a waste of a screen"

---------------------------------------
JOB HOPPING — HARD CAP AT 3
---------------------------------------

If a job hopping pattern is present, cap the score at 3 regardless of other strengths. Do NOT award a 4.
Flag in topConcern for recruiter probe.

Cap at 3 when:
- 3+ roles under 18 months in the last 6 years with no recent stability
- Average tenure under 2 years across the most recent 4 roles with no stabilizing current role
EXCEPTION: If the most recent role is 3+ years, prior choppy history may be redeemed — use judgment.
Note in topConcern: "Job hopping pattern — probe tenure stability in screen."

---------------------------------------
AI SIGNAL — PRESENCE CHECK ONLY
---------------------------------------

The screener only checks whether AI is mentioned in the context of their work.
Depth of AI experience will be assessed by the recruiter and hiring manager.

PASSES the AI check:
- Any use of AI tools in their work (ChatGPT, Claude, Copilot, etc.)
- Deploying AI chatbots or automation tools
- Building AI workflows, agents, or tools
- "Leveraged AI to improve X" in a work context
- Any operational AI involvement described in a role, not just a skills section

FAILS the AI check (hard 2):
- Zero AI mention anywhere in the resume
- AI appears ONLY in skills/tools section with no work context whatsoever

---------------------------------------
ED'S REAL CALIBRATION EXAMPLES
---------------------------------------

SCORE 4 — Sean Marrer (Quizlet Sr Dir User Ops & Product Ops):
The gold standard. Reported to CEO, led global org of 40+, built two functions from
scratch (User Ops + Product Ops), AI-enabled support resolving 50%+ of tickets,
partnered with C-suite on strategic planning/budgeting/forecasting/KPIs. All gates pass.

SCORE 4 — Ramon Garcia (Uber Sr S&O Manager):
Builder + AI tools + XFN connector across Marketing/Finance/Ops + $8M budget authority
+ governance framework that became Uber Mexico's primary cross-functional alignment forum.
Vendor/budget ownership. One gap (outward ops) but clear 4.

SCORE 4 — Yitzy Rosenberg:
Shipped AI-powered tools + XFN across G&A (finance, legal) + vendor management
+ resource allocation/capacity planning + efficiency/value mindset. No gaps.

SCORE 3 — Cristina Lescay Megret (Netflix Supplier Ops Analyst):
Finance/G&A/vendor lifecycle ✓, AI builder ✓ (AI Slackbot + auto-approval workflow),
Netflix tenure ✓. Gap: "Analyst" title, VP+ influence not explicitly evidenced.
Finance/AP background has clearly evolved into product ownership and XFN ops.
NOTE: Finance-adjacent background is a PROBE, not a disqualifier, when the candidate
has evolved into product/ops ownership at a recognizable tech company.

SCORE 3 — Jaime Antonian (soft):
AI builder ✓, entrepreneurial ✓. Gap: little tech company exp, thin XFN → probe.
Ed: "likely won't make it to HM screen but open to being surprised."

SCORE 3 — John Boyle:
Founder/builder ✓, vendor + resource planning ✓. Gap: limited known tech cos → probe.

SCORE 2 — Timothy Enitinwa (Meta Project Manager):
FAANG ✓ but analyst-level scope within a single team. Zero signal of navigating senior
stakeholder relationships or owning cross-org programs. "Too in the weeds."
Ed: "The influence and strategy piece is absolutely crucial."

SCORE 2 — Cara Zugschwerdt (AWS Product Operations):
Amazon ✓ but "building lower-level tools/dashboards is not going to be enough."
Tool-builder without strategic program ownership. No senior stakeholder signal.

SCORE 2 — Ajay Jandhyala: Finance/supply chain, AI is an undocumented personal project.
SCORE 2 — Chandra Alexander: Entire career non-tech/Web 1.0, IT background, chatbot deploy.
SCORE 2 — Beth Halel Trame: No AI builder signal, privacy/compliance background.
SCORE 2 — Williams Nabena: Experience starts March 2025, "supporting Scrum team."

SCORE 1 — Howard Chen (Hulu Sr PM Partner Operations):
Consumer tech company ✓ — BUT entirely execution-focused. "Too in the weeds.
No experience at the strategic/thought leadership level, or partnership with senior leaders."
Even a strong consumer tech background cannot compensate for zero strategic ownership.

SCORE 1 — Christen Soloman (FanDuel Program Manager):
People Operations background — wrong mandate entirely. People Ops ≠ Product Ops.

SCORE 1 — Ivy Horng (NewsBreak):
Title misrepresentation (resume says PM, LinkedIn shows Knowledge Manager/Customer Support).
Entirely CX/training role — no ops or strategic ownership.

SCORE 2 — Barrett Radziszewski (PayPal Sr PM & Business Ops Lead):
Right company (PayPal), right function, AI tooling mentioned (Claude, n8n, Cursor, etc.), XFN program
ownership present. Hard 2 for one reason: impact is almost entirely unquantified. Bullets like
"improved platform scalability" and "accelerated global scale" with no numbers anywhere = Gate 2B
failure. Light on AI specifics as well — listed in skills but thin in work context. Would reconsider
with a revised resume that quantifies outcomes.

SCORE 2 — Cassandra Weber (Microsoft OneDrive Sr AI PM):
Microsoft ✓, AI mentioned prominently ✓. Hard 2 for two reasons: (1) AI work is consumer-facing
product features (AI experiences for file content, reminisce memories) — NOT internal AI enablement
for the team. This is AI features, not AI enablement — does not satisfy the gate. (2) No proof of
impact — no quantified metrics anywhere in the resume. Also limited executive stakeholder signal
(NPS readouts to leadership but no VP+/C-suite partnership explicitly evidenced).
Classic AI features ≠ AI enablement false positive.

SCORE 2* — Dhruv Sharma (AutoScout24 Director, Product & Engineering Ops):
Good functional profile — Director of EPDA ops, G&A partnerships, vendor lifecycle, AI dashboard.
Score 2 for one critical reason: STRONG AI-written resume signals. LinkedIn title is "Agile Delivery
Lead" — significantly different from resume title "Director, Product & Engineering Operations."
Excessive em dashes throughout as the primary bullet style. Resume language mirrors our job description
wording word-for-word (e.g., "connective tissue between technical teams and the corporate functions
they depend on" — verbatim match). Asterisk applied. Do not advance without verifying resume
authenticity and whether experience is actually theirs.

SCORE 3 — Jacob Muller (Scopely Head of AI Strategy & Ads Monetization):
Hits key criteria — P&L ownership, AI tooling builder (production platforms, multi-agent systems,
MCP integrations, OpenAI hackathon winner), cross-functional XFN ops, exec partnership (CTO,
co-founder). Score 3 not 4. Reason: "10+ years building AI-powered systems" is implausible
given how recent the AI wave is — a credibility flag. No recognizable consumer tech brands.
Probe to validate whether experience holds up.

SCORE 3 — James Barnes (Block/Cash App Sr TPM):
Strong profile. Program chops at real scale (Cash App, Block), builder's instinct (launched SaaS app,
TPM AI task force), AI in work context ✓, Product Ops experience from scratch ✓, strong
quantification. Score 3 not 4. Reason: Senior stakeholder influence not explicitly evidenced —
no VP+/C-suite partnership language. Probe that in the screen.

SCORE 3 — Jeff Cushion (Netflix/Paramount+/Ticketmaster TPM):
Hits almost everything — Netflix ✓, Paramount+ ✓, strong quantification ($2M savings, $8M revenue
preservation), G&A function engagement, AI-enabled automation, built from scratch. Score 3 not 4.
Reason: Last 3 roles all ~1 year or less (Netflix 9 months, Paramount+ 13 months, Ticketmaster
13 months). Hard cap at 3 per job hopping rule. Probe tenure stability tactfully in screen.

SCORE 3 — Jennifer Crosby (Amazon Prime Video Sr Manager S&O):
Amazon/Prime Video ✓, strong quantification ($700M+ enterprise value, $44M portfolio), XFN ops
at scale, exec partnership (VP reporting), resource planning, vendor lifecycle. Score 3 not 4.
Reason: AI building signal is thin — mentioned in summary and skills only, not evidenced in actual
work bullets. Summary language likely AI-edited. Probe AI depth specifically in the screen.
Note: Raytheon background (pre-Amazon) is defense/manufacturing — irrelevant, but Amazon tenure
is strong enough to override the earlier career.

SCORE 3 — John Philip (Security Compass VP Strategic Initiatives):
Very relevant profile — G&A partnership, company-wide planning, vendor lifecycle, AI-enabled
execution workflows, strategic + builder balance. Score 3 not 4. Reason: B2B SaaS cybersecurity
company (not consumer tech) — pure enterprise. Also no clearly recognizable brand at scale.
However, functional fit is strong. Let's give them a shot.

SCORE 2 — Pooja Patil (TikTok Shop Product/Solution Manager, Risk & AI Automation):
TikTok ✓, AI mentioned prominently ✓. Score 2. Reason: Career is policy/compliance/CX ops —
KYC/KYB, content moderation, IPR protection, seller onboarding governance, fraud detection.
This is a risk and governance profile, not a product ops or G&A ops profile. No signal of
working with Finance, HR, Legal in a business operations capacity. No executive partnership
signal either. Different mandate entirely.

SCORE 1 — Sander Denecker (Pinterest Data Labeling PM):
Well-built resume, quantified results ($2M savings, 15% improvement), vendor management, G&A
mentions, AI mentions. Score 1. Reason: Entire career is data labeling and annotation operations —
Pinterest (Data Labeling PM) and Appen (Customer Delivery PM for annotation programs). This is a
contractor-for-ML-data role, not product or business operations. Zero strategic ownership or senior
stakeholder influence in a business ops context. Entirely wrong mandate.

SCORE 2 — Sean Kanamori (Ring/HopSkipDrive Sr PM):
Consumer tech companies ✓ (Ring at Amazon, HopSkipDrive). AI tooling ✓ (Vertex AI, chatbot).
Score 2. Reason: Entire career is as a Product Manager — product strategy and roadmap, not ops.
Different muscle. No signal of G&A function partnership (Finance, Legal, HR, IT). Role confusion
risk — would likely want to own product, not run operations. Also primarily CX tooling and agent
tools rather than cross-org ops programs.

SCORE 3 — Stephanie Sliwinski (Mezmo Head of Business Ops):
Strong signals — 3x first ops hire, AI-enabled operations at scale (10+ tools, 10+ automated
workflows, Clay/Notion pipeline), OKR governance, cross-functional exec cadence, measurable
outcomes (67% reduction in board prep, 50% faster decisions). Score 3 not 4. Reason: No
recognizable consumer tech company — Mezmo, SOASTA, Akamai are not household names. AI world
has moved fast and she's been out ~1 year; probe whether AI fluency is current. Worth the screen.

SCORE 3 — Vidushi Singh (Amazon Program Manager):
Amazon ✓, AI automation ✓ (reduced manual effort 90%), quantification present ($67.3M revenue
impact, 35% CSAT improvement), dashboards and frameworks. Score 3 not 4. Reason: No G&A function
partnership evidenced — work is in AWS sales/marketing programs, not Finance/Legal/HR/IT ops.
Executive stakeholder influence not clearly VP+ level. May be junior for a Director-level scope.
Probe organizational level and G&A partnership depth.`;


// ── HTTP helpers ─────────────────────────────────────────────────────────────
function httpsGet(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: "GET", headers }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function httpsPost(hostname, pathStr, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname, path: pathStr, method: "POST",
      headers: { ...headers, "Content-Length": Buffer.byteLength(bodyStr) }
    }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on("error", reject);
    req.write(bodyStr);
    req.end();
  });
}

function resumeJsonToText(rj) {
  if (!rj) return "";
  const parts = [];
  if (rj.basics) {
    const b = rj.basics;
    if (b.name) parts.push(`Name: ${b.name}`);
    if (b.label) parts.push(`Title: ${b.label}`);
    if (b.summary) parts.push(`Summary: ${b.summary}`);
    if (b.location) parts.push(`Location: ${typeof b.location === "string" ? b.location : [b.location.city, b.location.region, b.location.countryCode].filter(Boolean).join(", ")}`);
  }
  if (Array.isArray(rj.work) && rj.work.length) {
    parts.push("\nWORK EXPERIENCE:");
    for (const w of rj.work) {
      const end = w.endDate === "TODAY" ? "Present" : (w.endDate || "Present");
      parts.push(`\n${w.position || "Role"} at ${w.name || "Company"} (${w.startDate || "?"} – ${end})`);
      if (w.location) parts.push(`Location: ${w.location}`);
      if (w.description) parts.push(w.description);
      if (Array.isArray(w.highlights) && w.highlights.length) parts.push(w.highlights.join("\n"));
    }
  }
  if (Array.isArray(rj.education) && rj.education.length) {
    parts.push("\nEDUCATION:");
    for (const e of rj.education) {
      parts.push(`${e.studyType || ""} ${e.area || ""} – ${e.institution || ""} (${e.startDate || "?"} – ${e.endDate || "?"})`);
    }
  }
  if (Array.isArray(rj.skills) && rj.skills.length) {
    parts.push("\nSKILLS:");
    parts.push(rj.skills.map(s => `${s.name || ""}: ${Array.isArray(s.keywords) ? s.keywords.join(", ") : s.level || ""}`).join("\n"));
  }
  return parts.join("\n").slice(0, 8000);
}

function extractLocation(profile) {
  if (!profile) return "";
  const vals = Object.values(profile);
  if (vals.length >= 3 && vals[2]?.result) {
    const loc = vals[2].result;
    if (/,/.test(loc) || /\b(city|state|usa|us|united states|canada|uk)\b/i.test(loc)) return loc;
  }
  for (const v of vals) {
    const r = v?.result || "";
    if (/,/.test(r) && /\b(CA|OR|WA|NY|TX|IL|FL|CO|AZ|GA|NC|VA|MA|PA|OH|MI|MN|MO|TN|IN|WI|MD|AK|HI|NV|UT|United States|Canada)\b/i.test(r)) return r;
  }
  return vals.map(v => v?.result).filter(Boolean).join(", ");
}

async function fetchBrainnerCandidates() {
  const allCandidates = [];
  let page = 1;
  const pageSize = 200;

  while (true) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": JOB_SLUG,
      "fields[0]": "Name",
      "fields[1]": "Email",
      "fields[2]": "Score",
      "fields[3]": "Status",
      "fields[4]": "Profile",
      "fields[5]": "ResumeJSON",
      "fields[6]": "Location",
      "pagination[pageSize]": String(pageSize),
      "pagination[page]": String(page),
    });
    const res = await httpsGet(
      "admin.brainner.ai",
      `/api/candidates?${params}`,
      { Authorization: `Bearer ${BRAINNER_KEY}`, Accept: "application/json" }
    );
    if (res.status !== 200) throw new Error(`Brainner API error: ${res.status} ${JSON.stringify(res.body).slice(0,200)}`);
    const data = res.body.data || [];
    allCandidates.push(...data);
    const total = res.body.meta?.pagination?.total ?? data.length;
    if (allCandidates.length >= total || data.length < pageSize) break;
    page++;
  }

  return allCandidates;
}

async function screenWithClaude(name, resumeText) {
  const now = new Date();
  const today = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const prompt = `TODAY'S DATE: ${today}. Use this when evaluating job start dates, tenure, recency, and any "future date" flags. A start date before today is NOT a future date.

You are a senior recruiter screening for a Product Operations Lead role at Scribd.
Ed (the hiring manager) has already scored 9 real candidates to calibrate the bar.
Your job is to apply his exact criteria to this candidate — no more, no less.

INSTRUCTIONS:
- Read the resume carefully enough to make a definitive call. There should be no ambiguity.
- Score purely based on the criteria below. Do not add any directional bias.
- If a requirement is met with explicit evidence, credit it. If it's absent, don't.
- Cite specific evidence from the resume for every point in your summary.
- Do NOT infer or assume. Do NOT give credit for things not written.
- Do NOT penalize things not in the criteria.

${ED_CRITERIA}

CANDIDATE RESUME / PROFILE:
${(resumeText || "").slice(0, 8000)}

Respond ONLY with valid JSON, no markdown fences, no extra text:
{
  "name": "${name}",
  "score": <1|2|3|4>,
  "scoreLabel": "<Strong No|No|Yes|Strong Yes>",
  "summary": "<2-3 sentences citing specific evidence from the resume for the score>",
  "topStrength": "<the single most compelling qualification with concrete evidence>",
  "topConcern": "<most critical gap, missing requirement, or probe needed — be specific>"
}`;

  const res = await httpsPost(
    "api.anthropic.com",
    "/v1/messages",
    {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
    },
    {
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }]
    }
  );

  const raw = res.body?.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { score: 1, scoreLabel: "Strong No", summary: "Parse error", topStrength: "", topConcern: "Parse error" };
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Cache helpers (avoid re-screening already-done candidates) ────────────────
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
      console.log(`   📋 Loaded cache: ${Object.keys(data).length} previously screened candidates — will skip these`);
      return data; // { email: resultObject }
    }
  } catch {}
  return {};
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

// ── HTML generation ───────────────────────────────────────────────────────────
function esc(s) {
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function scoreColor(s) {
  return { 4: "#1a7f4b", 3: "#1565c0", 2: "#b45309", 1: "#c0392b" }[s] || "#555";
}
function scoreBg(s) {
  return { 4: "#d4edda", 3: "#dbeafe", 2: "#fef3c7", 1: "#fde8e8" }[s] || "#f5f5f5";
}
function scoreBorder(s) {
  return { 4: "#1a7f4b", 3: "#1565c0", 2: "#d97706", 1: "#c0392b" }[s] || "#ccc";
}
function scoreEmoji(s) {
  return { 4: "✅", 3: "🔵", 2: "🟡", 1: "❌" }[s] || "⚪";
}

function buildHTML(results, total, done, running) {
  const counts = { 4: 0, 3: 0, 2: 0, 1: 0 };
  results.forEach(r => { counts[r.ourScore] = (counts[r.ourScore] || 0) + 1; });
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const cards = results.map(r => `
    <div class="card" style="border-left:4px solid ${scoreBorder(r.ourScore)}; background:${scoreBg(r.ourScore)};">
      <div class="card-header">
        <div class="candidate-info">
          <span class="rank">#${r.rank}</span>
          <span class="name">${esc(r.name)}</span>
          <span class="location">📍 ${esc(r.location || "—")}</span>
        </div>
        <div class="scores">
          <span class="brainner-score" title="Brainner score">🧠 ${r.brainnerScore}</span>
          <span class="our-score" style="background:${scoreColor(r.ourScore)};">${scoreEmoji(r.ourScore)} ${r.ourScore} — ${esc(r.scoreLabel)}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="field summary-field">
          <span class="label">Summary</span>
          <span class="value">${esc(r.summary)}</span>
        </div>
        <div class="two-col">
          <div class="field">
            <span class="label">💪 Top Strength</span>
            <span class="value">${esc(r.topStrength)}</span>
          </div>
          <div class="field">
            <span class="label">⚠️ Top Concern</span>
            <span class="value">${esc(r.topConcern)}</span>
          </div>
        </div>
      </div>
    </div>`).join("\n");

  const refreshMeta = running ? `<meta http-equiv="refresh" content="4">` : "";
  const statusBadge = running
    ? `<span class="status running">⏳ Running — refreshes every 4s</span>`
    : `<span class="status done">✅ Complete</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
${refreshMeta}
<title>Product Ops Screener — Scribd</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f0f2f5; color: #1a1a1a; }

  .header { background: #fff; border-bottom: 1px solid #e0e0e0; padding: 20px 32px; position: sticky; top: 0; z-index: 10; }
  .header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .title { font-size: 20px; font-weight: 700; color: #111; }
  .subtitle { font-size: 13px; color: #666; margin-top: 2px; }
  .status { font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 12px; }
  .status.running { background: #fef9c3; color: #854d0e; }
  .status.done { background: #dcfce7; color: #166534; }

  .progress-bar-wrap { background: #e5e7eb; border-radius: 4px; height: 6px; margin-bottom: 14px; }
  .progress-bar { background: #2563eb; height: 6px; border-radius: 4px; transition: width 0.3s; }

  .stats { display: flex; gap: 12px; flex-wrap: wrap; }
  .stat { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
  .stat-4 { background: #d4edda; color: #1a7f4b; }
  .stat-3 { background: #dbeafe; color: #1565c0; }
  .stat-2 { background: #fef3c7; color: #b45309; }
  .stat-1 { background: #fde8e8; color: #c0392b; }
  .stat-total { background: #f3f4f6; color: #374151; }

  .content { max-width: 900px; margin: 0 auto; padding: 24px 16px; }

  .section-heading { font-size: 13px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.05em; color: #6b7280; margin: 20px 0 8px; padding-bottom: 6px;
    border-bottom: 1px solid #e5e7eb; }

  .card { border-radius: 10px; padding: 16px 20px; margin-bottom: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
  .card-header { display: flex; justify-content: space-between; align-items: flex-start;
    margin-bottom: 12px; gap: 12px; }
  .candidate-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .rank { font-size: 12px; color: #9ca3af; font-weight: 600; min-width: 28px; }
  .name { font-size: 15px; font-weight: 700; color: #111; }
  .location { font-size: 12px; color: #6b7280; }
  .scores { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .brainner-score { font-size: 12px; color: #6b7280; background: #f3f4f6; padding: 3px 8px; border-radius: 10px; }
  .our-score { font-size: 13px; font-weight: 700; color: #fff; padding: 4px 12px; border-radius: 12px; white-space: nowrap; }

  .card-body { display: flex; flex-direction: column; gap: 10px; }
  .field { display: flex; flex-direction: column; gap: 3px; }
  .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #9ca3af; }
  .value { font-size: 13px; color: #374151; line-height: 1.5; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  .pending { text-align: center; padding: 40px; color: #9ca3af; font-size: 14px; }
  @media (max-width: 600px) { .two-col { grid-template-columns: 1fr; } .card-header { flex-direction: column; } }
</style>
</head>
<body>
<div class="header">
  <div class="header-top">
    <div>
      <div class="title">Product Operations Lead — Scribd</div>
      <div class="subtitle">Ed's calibrated screening · Top ${total} by Brainner score · ${done}/${total} screened</div>
    </div>
    ${statusBadge}
  </div>
  <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
  <div class="stats">
    <span class="stat stat-total">Total screened: ${done}</span>
    <span class="stat stat-4">✅ Strong Yes (4): ${counts[4]}</span>
    <span class="stat stat-3">🔵 Yes (3): ${counts[3]}</span>
    <span class="stat stat-2">🟡 No (2): ${counts[2]}</span>
    <span class="stat stat-1">❌ Strong No (1): ${counts[1]}</span>
  </div>
</div>
<div class="content">
${[4,3,2,1].map(s => {
    const group = results.filter(r => r.ourScore === s);
    if (!group.length) return "";
    const headings = { 4: "✅ Strong Yes — Move Forward", 3: "🔵 Yes — Move Forward (Probe on Screen)", 2: "🟡 No — Do Not Advance", 1: "❌ Strong No" };
    return `<div class="section-heading">${headings[s]} (${group.length})</div>\n` + group.map(r => cards.split('\n').filter(l => l.includes(`>#${r.rank}<`) || false)).join("") + group.map(r => {
      return `
    <div class="card" style="border-left:4px solid ${scoreBorder(s)}; background:${scoreBg(s)};">
      <div class="card-header">
        <div class="candidate-info">
          <span class="rank">#${r.rank}</span>
          <span class="name">${esc(r.name)}</span>
          <span class="location">📍 ${esc(r.location || "—")}</span>
        </div>
        <div class="scores">
          <span class="brainner-score" title="Brainner score">🧠 ${r.brainnerScore}</span>
          <span class="our-score" style="background:${scoreColor(s)};">${scoreEmoji(s)} ${s} — ${esc(r.scoreLabel)}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="field">
          <span class="label">Summary</span>
          <span class="value">${esc(r.summary)}</span>
        </div>
        <div class="two-col">
          <div class="field">
            <span class="label">💪 Top Strength</span>
            <span class="value">${esc(r.topStrength)}</span>
          </div>
          <div class="field">
            <span class="label">⚠️ Top Concern / Probe</span>
            <span class="value">${esc(r.topConcern)}</span>
          </div>
        </div>
      </div>
    </div>`;
    }).join("\n");
  }).join("\n")}
${running && done < total ? `<div class="pending">⏳ Screening in progress… ${total - done} remaining. Page refreshes automatically.</div>` : ""}
</div>
</body>
</html>`;
}

function buildCSV(rows) {
  const headers = ["Rank","Name","Email","Location","Brainner Score","Our Score","Score Label","Summary","Top Strength","Top Concern","Screened"];
  const q = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const today = new Date().toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric" });
  const lines = [headers.map(q).join(",")];
  for (const r of rows) {
    lines.push([r.rank,r.name,r.email,r.location,r.brainnerScore,r.ourScore,r.scoreLabel,r.summary,r.topStrength,r.topConcern,today].map(q).join(","));
  }
  return lines.join("\n");
}

function writeHTML(results, total, done, running) {
  // Sort for display: score desc, brainner score desc
  const sorted = [...results].sort((a,b) => b.ourScore - a.ourScore || b.brainnerScore - a.brainnerScore);
  sorted.forEach((r,i) => r.rank = i + 1);
  fs.writeFileSync(HTML_FILE, buildHTML(sorted, total, done, running), "utf8");
}

async function main() {
  console.log("📥 Fetching candidates from Brainner...");
  const raw = await fetchBrainnerCandidates();
  console.log(`   Found ${raw.length} total candidates`);

  // Show what status values exist so we can debug if needed
  const allStatuses = [...new Set(raw.map(c => c.attributes.Status))];
  console.log(`   Statuses found: ${allStatuses.join(", ")}`);

  // Load cache first so we can exclude already-screened candidates before slicing
  const cache = loadCache();
  const cachedEmails = new Set(Object.keys(cache));

  // Only screen "To Review" candidates (Brainner internal name: "evaluated")
  // Exclude already-screened from cache
  const sorted = raw
    .filter(c => (c.attributes.Status || "").toLowerCase() === "evaluated")
    .filter(c => !cachedEmails.has(c.attributes.Email || ""))
    .sort((a,b) => (b.attributes.Score || 0) - (a.attributes.Score || 0))
    .slice(0, TOP_N);
  console.log(`   Taking top ${sorted.length} fresh (unscreened) candidates by Brainner score`);
  console.log(`\n🌐 Open in browser: ${HTML_FILE}\n`);
  writeHTML([], sorted.length, 0, true);
  const results = [];
  const counts = { 4: 0, 3: 0, 2: 0, 1: 0 };

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const a = c.attributes;
    const name = a.Name || `Candidate ${c.id}`;
    const email = a.Email || "";
    const location = a.Location || extractLocation(a.Profile);
    const resumeText = resumeJsonToText(a.ResumeJSON);

    process.stdout.write(`   [${i+1}/${sorted.length}] ${name.padEnd(35)} `);

    let result;
    try {
      result = await screenWithClaude(name, resumeText);
    } catch(e) {
      result = { score: 1, scoreLabel: "Strong No", summary: `Error: ${e.message}`, topStrength: "", topConcern: "API error" };
    }

    const finalScore = Math.max(1, Math.min(4, result.score || 1));
    const labelMap = { 4:"Strong Yes", 3:"Yes", 2:"No", 1:"Strong No" };
    counts[finalScore]++;
    const tally = `[4:${counts[4]} 3:${counts[3]} 2:${counts[2]} 1:${counts[1]}]`;
    console.log(`→ ${finalScore} (${result.scoreLabel || labelMap[finalScore]})  ${tally}`);

    const row = {
      name,
      email,
      location,
      brainnerScore: a.Score || 0,
      ourScore: finalScore,
      scoreLabel: result.scoreLabel || labelMap[finalScore],
      summary: result.summary || "",
      topStrength: result.topStrength || "",
      topConcern: result.topConcern || "",
      rank: 0,
    };
    results.push(row);
    cache[email] = row;
    saveCache(cache);

    writeHTML(results, sorted.length, i + 1, i + 1 < sorted.length);

    // Stop as soon as we hit 10 score 4s
    if (counts[4] >= 10) {
      console.log(`\n🎯 Goal reached: 10 score 4s found after screening ${i + 1} candidates.`);
      break;
    }

    if (i < sorted.length - 1) await sleep(300);
  }

  // Final pass
  const finalSorted = [...results].sort((a,b) => b.ourScore - a.ourScore || b.brainnerScore - a.brainnerScore);
  finalSorted.forEach((r,i) => r.rank = i + 1);
  writeHTML(finalSorted, sorted.length, sorted.length, false);

  const csv = buildCSV(finalSorted);
  fs.writeFileSync(CSV_FILE, csv, "utf8");

  const score4s = results.filter(r => r.ourScore === 4);
  const score3s = results.filter(r => r.ourScore === 3);
  const score2s = results.filter(r => r.ourScore === 2);
  const score1s = results.filter(r => r.ourScore === 1);

  console.log("\n\n════════════════════════════════════════");
  console.log("  PRODUCT OPS — THIS RUN SUMMARY");
  console.log("════════════════════════════════════════");
  console.log(`  Candidates screened this run: ${results.length}`);
  console.log(`  Score 4 (Strong Yes): ${score4s.length}`);
  console.log(`  Score 3 (Yes):        ${score3s.length}`);
  console.log(`  Score 2 (No):         ${score2s.length}`);
  console.log(`  Score 1 (Hard No):    ${score1s.length}`);
  console.log("\n  Score 4 candidates:");
  score4s.forEach((r, i) => console.log(`    ${i+1}. ${r.name} (Brainner: ${r.brainnerScore})`));
  console.log("════════════════════════════════════════");
  console.log(`\n✅ HTML: ${HTML_FILE}`);
  console.log(`✅ CSV:  ${CSV_FILE}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
