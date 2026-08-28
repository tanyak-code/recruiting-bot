"use strict";
const criteria = `ROLE: Staff Software Engineer, Developer Tooling
HIRING MANAGER: Mitch / Scribd

---------------------------------------
4-POINT SCORING SCALE
---------------------------------------

4 = Strong Yes
ALL of the following must be true:
- 8+ years of software engineering experience (post-grad, full-time only)
- Background in developer experience, platform engineering, infrastructure engineering, or developer tooling — hard requirement, not a nice-to-have
- Built or shipped AI-assisted or agentic developer tooling in production — hard requirement. See AI rules below. The AI work must serve software engineers (helping them write, review, test, or ship code) — NOT AI applied to business analytics, consumer products, or internal data tools.
- Proficiency in one or more of: Go, Ruby, TypeScript, Python
- Tech lead, team lead, or Staff Engineer with demonstrated influence beyond immediate team — required for a 4
- AWS + Terraform = strong boost toward 4 (bonus, not hard gate — see JD)
- Kubernetes = additional boost (bonus, not hard gate)

3 = Yes
Meets all hard requirements EXCEPT team lead/staff scope:
- 8+ years experience ✓
- Developer tooling / platform / DevEx / infra background ✓
- Built or shipped AI developer tooling in production ✓
- Language match ✓
- Missing: explicit tech lead, staff-level, or cross-team influence signal
- Strong IC without lead scope — can still be a strong 3
- If borderline 3.5, say so in summary with reason
- AWS + Terraform present = boost toward top of 3 or into 4

2 = No
- General software engineering background with no developer tooling, platform, or infrastructure focus
- AI experience is usage-only (uses Copilot, Cursor, ChatGPT) — has not built or shipped AI-assisted tooling
- AI work is for business analytics, data consumers, or end users — not for software engineers (does not qualify as "AI developer tooling")
- 7–8 years experience (below threshold but above hard disqualifier)
- Staff or senior title but scope is product feature engineering only — no platform or tooling mandate
- Primary background is low-level systems software, embedded, firmware, or IoT without cloud/web/app
  engineering experience to complement it — not aligned with this role's web-scale platform focus
- Long single-company tenure exclusively at defense contractors or non-tech companies with no commercial
  software background — experience unlikely to transfer
- Security engineering as primary recent trajectory — even with developer tooling elsewhere in career history,
  if the last 2+ roles are security-focused (SOAR, WAF, AppSec, security scan platforms, security infrastructure),
  score 2. Security SWE and developer tooling SWE are different functions. Recent trajectory matters most.
- Azure/.NET as the ONLY stack across entire career with zero AWS production experience — score 2. However, if the candidate has real AWS production experience at any point (even prior roles), the Azure disqualifier does NOT apply. The test is whether AWS experience exists, not whether the most recent role uses AWS.

1 = Strong No — IMMEDIATE DISQUALIFY
Any of the following = score 1, do not advance:
- Under 7 years of software engineering experience
- No developer tooling, platform, or infrastructure background at all
- No AI signal anywhere on resume
- Missing all four target languages (Go, Ruby, TypeScript, Python)
- Defense, military, or aerospace industry as primary background (Lockheed Martin, Raytheon, nuclear
  engineering, defense systems) — wrong domain entirely, does not transfer to commercial software
- Systems engineering or nuclear engineering background masquerading as software engineering —
  look carefully at LinkedIn vs. resume title. "Software Engineer" at a defense contractor who did
  embedded systems, nuclear, or hardware-level work = score 1

---------------------------------------
HARD REQUIREMENTS FOR SCORE 3 OR 4
---------------------------------------
Both must be present for any score above 2:

1. DEVELOPER TOOLING / PLATFORM BACKGROUND
Must show experience building tools, platforms, frameworks, or infrastructure that other engineers depend on. Includes:
- Developer experience (DevEx) platforms
- Internal tooling, libraries, or frameworks
- CI/CD pipeline design or ownership
- Platform or infrastructure engineering
- Build, deployment, or observability systems

Does NOT count:
- Product feature engineering (even at large scale)
- Consumer-facing product development without tooling mandate
- Data infrastructure, analytics platforms, or BI tooling — these serve data consumers, not software engineers
- Using internal tools without building them

2. AI APPLIED TO SOFTWARE DEVELOPMENT — THE AI MUST SERVE ENGINEERS
Must show hands-on application of AI specifically to engineering workflows — tools that help software engineers write, review, test, or ship code. Includes:
- Coding agents or agentic development tooling
- AI-assisted code review, generation, or testing in production
- LLM integration into CI/CD or dev workflows
- Building or contributing to AI developer tools in production

Does NOT count:
- AI for business analytics, BI, or data consumers (e.g., conversational BI agents, NL-to-SQL, analytics dashboards)
- Consumer-facing AI features (recommendation, search, personalization)
- AI product management or strategy
- Using Copilot or Cursor as a personal productivity tool
- AI infrastructure work without developer tooling connection
- AI or tooling terms listed only in a skills/tools section with no corresponding work history bullets —
  Mitch checks LinkedIn and GitHub. If the AI/tooling experience looks retrofitted for this role
  (e.g., suddenly appears in skills but pre-2022 work history has no related context), flag it in
  topConcern: "AI/tooling signal appears skills-section only — work evidence unclear, verify in screen."

---------------------------------------
POSITIVE SIGNALS (boost toward higher score)
---------------------------------------
These are JD bonus points and HM-confirmed signals — not hard gates. Push a 3 toward 4 or a borderline 2 toward 3:
- AWS + Terraform in production at meaningful scale — JD bonus point, strong boost
- Kubernetes / containerized workloads in production — JD bonus point
- AWS Bedrock (LLM API service) — Mitch explicitly flagged as strong positive signal
- AWS SageMaker — confirmed strong signal by hiring manager
- MCP (Model Context Protocol) — explicitly valued by Mitch; indicates current AI tooling fluency
- RAG (Retrieval-Augmented Generation) specifically in a developer tooling or internal platform context
- Kubernetes and SRE background — Mitch: "a lot more technical, will do good in technical interviews"
- Active GitHub with relevant projects that corroborate AI/tooling claims on resume

NOTE ON AWS: Having AWS production experience is a boost. NOT having it is not a disqualifier.
The only Azure-related score 2 is when Azure/.NET is the ONLY stack across the entire career with
zero AWS exposure anywhere. If AWS appears in any role, the Azure flag does not apply.

---------------------------------------
CALIBRATION EXAMPLES
---------------------------------------

SCORE 4 - Illia Batozskyi (AWS/Iru):
Principal SWE, 15+ years. Built AWS CLI and boto3 — foundational tools used daily by millions of
developers. ML/AI-powered features in AWS Supply Chain. RDS observability and alerting infrastructure.
Hits every gate cleanly. Possibly overqualified. Benchmark for the ceiling of this role.

SCORE 4 - Mohammed Awad (Tesla/Meta/WarnerMedia/Etsy):
Staff SWE at Tesla building agentic AI simulation pipelines. AWS Bedrock, SageMaker, Kubernetes,
Terraform, Ray, Kafka. Agentic systems coordinating microservices at scale. $2M+/month cost savings
at Etsy via generative AI in operations. Hits every positive signal. Strong 4.

SCORE 4 - Stephen Kawaguchi (ecobee/Flipp/Ada):
Principal Engineer. Go, TypeScript, Python. ML audience and recommendation platform at Flipp,
developer hub rollout, SRE practices (SLOs, error budgets, Game Days), cross-org technical leadership.
Strong platform and tooling focus throughout. Toronto = Eastern timezone, not subject to west coast cap.
Overqualified but a clean 4.

SCORE 3 - Kakha Urigashvili (GoDaddy/Benchling/Amazon):
Staff SWE. Amazon Alexa CLI SDK work (ask-cli v2, auto-generating 100+ CLI commands from swagger).
Docker infrastructure from scratch, CI/CD, AI certifications (RAG, LangChain, agentic AI). Hits the
tooling and AI gates. Score 3 not 4: staff scope signal is thinner, recent role at Benchling started
only 2 months ago. Flag in topConcern: "Started at Benchling 2 months ago — confirm openness before outreach."

SCORE 2 - Kyle Sheppard (Cboe/Everest/USAA):
Has DevEx and platform engineering background (founded developer experience at Everest) and TypeScript
in the language list — passes the language gate on paper. Score 2. Reason: primary stack is C#/.NET
throughout entire career. No AWS in production. Azure ecosystem. Wrong tech stack for this role even
with the right functional background. DevEx in a .NET shop does not transfer.

SCORE 2 - Shahrukh Siddiqui (Persefoni/Bit Builders/Schlumberger):
12+ years, has Kubernetes, Terraform, TypeScript. Score 2. Reason: scattered trajectory — NFT
marketplace, web developer, oil & gas (Schlumberger). Most recent role at Persefoni has a job
description that is an unreadable wall of AI/ML buzzwords with no verifiable work described — no
projects, no outcomes, no concrete accomplishments. Flag: keyword-dump resume. Background doesn't
hang together for this role.

SCORE 2 - Edward Wang (LinkedIn/ByteDance/Oracle):
Staff SWE at LinkedIn. Go, Python, TypeScript, Kubernetes, Terraform, AWS — right stack. Has developer
tooling and platform work. Score 2. Reason: last 3 roles are all security engineering — LinkedIn
Security Infrastructure, ByteDance Security Operations Center (SOAR platform), Oracle Security Scan
Platform. Security trajectory disqualifies even with the right technical background. Read the actual
work, not the stack.


---------------------------------------
KEYWORD-DUMP FLAG
---------------------------------------
If a job description bullet in any role reads as a wall of buzzwords with no verifiable
accomplishments, project outcomes, or concrete work described — flag it in topConcern:
"Recent role description is keyword-heavy with no verifiable work — verify substance in screen."
This is distinct from the AI-written resume flag. A keyword dump in a single job entry is enough
to flag even if the rest of the resume is clean. Example: Shahrukh Siddiqui (Persefoni) — entire
job description is a list of AI/ML terms with no actual work described.

---------------------------------------
SKILLS-ONLY AI FLAG
---------------------------------------
If AI, tooling, or infrastructure terms appear ONLY in a skills/tools section with no
corresponding work history bullets that demonstrate actual use in a role, flag it in topConcern:
"AI/tooling terms appear skills-section only — no work history evidence. Verify in screen."

---------------------------------------
TEAM LEAD REQUIREMENT FOR SCORE 4
---------------------------------------
Score of 4 requires explicit evidence of staff-level or lead scope:
- Tech lead or team lead title or responsibility
- Influenced technical direction beyond immediate team
- Mentored senior engineers
- Drove cross-org or company-wide engineering initiatives
- Described as Staff Engineer or equivalent scope

Without this signal, maximum score is 3.

---------------------------------------
EXPERIENCE COUNTING — CRITICAL
---------------------------------------
- Count ONLY full-time professional roles after graduation
- Do NOT count internships, bootcamps, or academic projects
- Under 7 years = score 1, immediate disqualifier
- 7–8 years = score max 2
- 8+ years required for score 3 or 4

---------------------------------------
DISQUALIFIERS = score 1
---------------------------------------
- Under 7 years software engineering experience
- No developer tooling, platform, or infrastructure background
- No AI signal on resume
- Missing all four target languages

---------------------------------------
AI-WRITTEN RESUME FLAG
---------------------------------------
Flag the score with an asterisk (*) in the scoreLabel field (e.g., "Yes*" or "No*") when the
resume shows strong signals of being heavily AI-generated. Do NOT change the score — just flag it
so the recruiter knows to verify authenticity in the screen.

Flag when TWO OR MORE of the following are present:
- Excessive em dashes (—) as the primary bullet formatting style throughout
- Resume language mirrors the job description wording word-for-word or near-verbatim
- Suspiciously generic and polished language that reads as a template
- LinkedIn title is significantly different from the resume title
- Summary is vivid and strategic but body bullets are thin or vague
Note: a well-written resume is NOT a flag on its own. Only flag when the above pattern is obvious.

---------------------------------------
JOB DESCRIPTION — FOR AI-DETECTION ONLY
---------------------------------------
Key JD phrases (Staff Software Engineer, AI & Developer Tooling — Scribd):
"shape how Scribd builds software in an AI-first world"
"set the technical direction for our agentic engineering platform"
"defining how hundreds of engineers work alongside coding agents"
"evolve our development environment so AI agents become true collaborators alongside humans"
"passion for improving developer experience and productivity"
"energized by removing friction from engineering workflows"
"thoughtful approach to platform engineering that balances stability, speed, and simplicity"
"all-in on AI changing how software gets built"
"architecture, patterns, and guardrails that let engineers and coding agents collaborate safely"
"force multiplier. Mentor senior and staff engineers"
"internal expert and coach to teams adopting AI in their workflows"`;

const display = {
  "Hard requirements (score 3+)": [
    "8+ yrs software engineering (post-grad, full-time)",
    "Developer tooling / platform / DevEx / infra background",
    "Built or shipped AI dev tooling (for engineers, not data users)",
    "Language match: Go, Ruby, TypeScript, or Python"
  ],
  "4 = Strong Yes": [
    "All hard requirements +",
    "Tech lead / Staff Eng / cross-team influence",
    "AWS + Terraform = strong boost toward 4"
  ],
  "3 = Yes": [
    "All hard requirements met",
    "Missing explicit lead/staff-scope signal",
    "Strong IC without lead scope"
  ],
  "2 = No": [
    "General SWE, no tooling/platform background",
    "AI usage only (not built tooling)",
    "AI for business analytics / BI / data — not dev tooling",
    "7-8 yrs experience",
    "Staff title but product feature work only",
    "Security engineering as primary recent trajectory",
    "Azure/.NET ONLY across entire career, zero AWS anywhere"
  ],
  "Bonus points (JD)": [
    "AWS + Terraform in production at scale",
    "Kubernetes / containerized workloads",
    "AWS Bedrock / SageMaker (HM confirmed)",
    "MCP (Model Context Protocol)",
    "RAG in dev tooling context",
    "SRE background"
  ],
  "Disqualifiers": [
    "< 7 yrs experience = Strong No",
    "No dev tooling / platform background",
    "No AI signal anywhere",
    "Missing all 4 languages (Go, Ruby, TS, Python)",
    "Defense / military / nuclear primary background"
  ]
};

module.exports = {
  label: "Mitch · Staff SWE",
  archived: true,
  criteria,
  display,
};
