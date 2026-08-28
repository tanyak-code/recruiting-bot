"use strict";
// Andre · Sr Frontend Eng — ARCHIVED
const criteria = `ROLE: Senior Frontend Engineer at Scribd — Signup & Activation / Growth Engineering
HIRING MANAGER: Andre

4-POINT SCORING SCALE

4 = Strong Yes
- 6+ years qualifying frontend experience
- Strong React and/or TypeScript
- Consumer-facing product experience (logged-in surfaces: feeds, onboarding, activation, retention, subscription flows)
- PLUS growth engineering experience: signup flows, activation, conversion optimization, A/B testing, trial-to-paid, subscriber growth
- Passes all tenure rules, no disqualifiers

3 = Yes
- 6+ years qualifying frontend experience
- Strong React and/or TypeScript
- Consumer-facing product experience (NOT marketing sites, B2B only, infrastructure, platform)
- May lack growth engineering signal but otherwise solid

2 = No
- Marketing sites, B2B, infrastructure, platform, or architecture only
- Missing consumer product depth
- Full-stack leaning with no explicit frontend history
- 5-6 years qualifying experience

1 = Strong No
- Any disqualifier present

EXPERIENCE COUNTING:
- Count ONLY full-time professional roles after graduation
- Under 5 years qualifying = score 1
- 5-6 years = max score 2

TENURE / JOB HOPPING:
- DISQUALIFIER: 3+ roles under 36 months in last 7 years = score 1
- RED FLAG: Avg tenure < 2 years with no recent stability = max score 2

FULL-STACK RULE:
- No explicit frontend history = hard cap score 2
- Explicit frontend-titled roles = can score up to 3
- Frontend history + growth signal + all must-haves = can score 4

DISQUALIFIERS = score 1:
- Under 5 years qualifying post-grad full-time experience
- Background is ONLY platform, infra, or architecture
- No consumer product exposure at all
- Missing both React AND TypeScript
- 3+ roles under 36 months in last 7 years`;

const display = {
  "Must-haves": [
    "6+ yrs qualifying frontend experience",
    "React and/or TypeScript",
    "Consumer-facing product (logged-in surfaces)"
  ],
  "4 = Strong Yes": [
    "All must-haves + growth engineering",
    "(signup, activation, conversion, A/B, trial-to-paid)"
  ],
  "3 = Yes": ["All must-haves, no growth signal required"],
  "2 = No": [
    "Marketing / B2B / platform / infra only",
    "Full-stack, no frontend history",
    "5-6 yrs experience"
  ],
  "Disqualifiers": [
    "< 5yrs qualifying post-grad experience = Strong No",
    "Platform / infra only",
    "Zero consumer product exposure",
    "Missing both React and TypeScript",
    "Job hopping (3 roles / 3 yrs)"
  ]
};

module.exports = { label: "Andre · Sr Frontend Eng", archived: true, criteria, display };
