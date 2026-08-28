# Building a Resume Screener in Claude (No API Required)

This guide walks you through building and running a resume screener entirely inside Claude's chat interface — no API keys, no code, no integrations needed. Everything happens in a single Claude conversation.

---

## How It Works

You paste a master prompt into Claude once. Claude then walks you through a setup phase (job description, example profiles, calibration notes) and builds a scoring rubric with you. Once you approve it, you paste candidate resumes one at a time and Claude scores each one.

---

## Step 1 — Start a New Claude Conversation

Open a fresh Claude conversation. This will be your screening session for this role. Don't mix roles in the same conversation.

---

## Step 2 — Paste the Master Prompt

Copy everything between the triple dashes below and paste it as your first message to Claude.

---

```
You are a resume screener. Your job is to help me build a scoring rubric for a specific role and then screen candidate resumes against it.

We'll work in two phases:

PHASE 1 — SETUP (we do this together before any screening)
PHASE 2 — SCREENING (you score resumes one at a time as I paste them)

---

PHASE 1: SETUP

Start by asking me for the following, one step at a time. Wait for my response before moving to the next step.

Step 1: Ask me to paste the full job description for the role I'm hiring for.

Step 2: Ask me to describe 2–3 candidate profiles that would be a "Yes" — people I would want to move forward. These can be real past candidates, hypothetical profiles, or descriptions. I don't need to paste full resumes — a few sentences per profile is fine.

Step 3: Ask me to describe 1–2 candidate profiles that would be a "No" — people I would NOT move forward and why.

Step 4: Ask me if I have any calibration notes — things that are hard to capture in a job description but that matter to me or the hiring manager. Examples: "We don't want people who have only been at big companies," "A CS degree is a hard requirement," "We care more about scope of ownership than title."

Once I've provided all four, do the following:

1. Synthesize everything into a structured scoring rubric using a 1–4 scale:
   - 4 = Strong Yes — move forward
   - 3 = Maybe — warrants a second look
   - 2 = No — does not meet bar
   - 1 = Hard No — clear disqualifier present

2. For each score, list:
   - What the profile looks like
   - Specific signals or patterns that put someone there
   - Any automatic disqualifiers (things that cap a score regardless of other strengths)

3. Present the rubric clearly and ask me:
   "Does this rubric look right? Anything to adjust, add, or remove before we start screening?"

Do NOT move to Phase 2 until I explicitly say the rubric is approved.

---

PHASE 2: SCREENING

Once I approve the rubric, switch into screening mode.

For each candidate I paste, provide:

**[Candidate Name]**
Score: [1 / 2 / 3 / 4] — [Label: Hard No / No / Maybe / Strong Yes]
Summary: [2–3 sentences on who this person is and why they scored here]
Top Strength: [Single most compelling thing about this candidate]
Top Concern: [Single biggest red flag or gap]

Rules for screening:
- Apply the approved rubric consistently. Do not deviate from it.
- If a disqualifier is present, apply the cap — do not let strengths override it.
- Be direct. Do not hedge or over-qualify. Give me a clear score.
- If a resume is too sparse to score confidently, say so and give your best assessment with that caveat.
- Do not summarize the resume back to me. I can read it. Tell me what it means.

After scoring each candidate, simply wait for me to paste the next resume. Do not ask if I want to continue.

---

Begin now. Start Phase 1, Step 1.
```

---

## Step 3 — Work Through Setup With Claude

Claude will ask you for the job description, yes/no profiles, and calibration notes one at a time. Answer each step fully.

**Tips:**
- For yes/no profiles, you don't need to paste full resumes. A few sentences is enough: "Person with 5 years in operations at a Series B startup, moved fast, built the finance ops function from scratch, no MBA" is plenty.
- Calibration notes are where you put the stuff that's hard to write into a JD — hiring manager quirks, things that have burned you before, specific company types you want or don't want.
- Be specific. The more detail you give, the sharper the rubric.

---

## Step 4 — Review and Approve the Rubric

Claude will present a draft rubric. Read it carefully. Ask for changes if something is off. Don't approve it until it reflects how you actually think about this role.

Common things to push back on:
- Disqualifiers that are too strict or not strict enough
- Score 3 vs 4 criteria that feel blurry
- Missing signals that matter to your hiring manager

Once it looks right, tell Claude: **"Rubric approved. Let's start screening."**

---

## Step 5 — Screen Candidates

Paste resumes one at a time. Claude will score each one using the format:

```
[Candidate Name]
Score: 3 — Maybe
Summary: Former ops lead at a Series A fintech, strong on process design but thin on cross-functional influence. Has owned vendor relationships but no evidence of budget ownership.
Top Strength: Built company's first onboarding ops function from scratch, cut time-to-productivity by 30%.
Top Concern: No experience working with product or engineering teams — every role has been within the ops/finance org.
```

You can paste resumes as plain text. You don't need to format them — Claude handles the interpretation.

---

## Tips for a Better Screening Session

**Keep the conversation going** — don't close the tab. All context (the rubric, your calibration notes) lives in this conversation. If you start a new conversation, you'd need to redo setup.

**Push back on scores** — if a score surprises you, say so. "I'd have scored this a 3, not a 2 — what am I missing?" Claude will explain its reasoning and you can recalibrate the rubric mid-session if needed.

**Add to the rubric as you go** — if you see a pattern emerging (e.g., three candidates in a row from defense companies that clearly aren't a fit), tell Claude to add that as a disqualifier and it will apply it going forward.

**Don't paste PDFs as images** — copy the text content of the resume and paste it as plain text. Most PDF viewers let you select all and copy.

**One role per conversation** — if you're screening for two different roles, use two separate Claude conversations. Don't mix rubrics.

---

## Frequently Asked Questions

**Does this use any API credits or cost anything?**
No. This runs entirely in the Claude chat interface. No API keys, no code, no external services.

**Can I screen in bulk?**
You can paste resumes one at a time as fast as you want. There's no limit other than Claude's context window (you'll know you're near the limit if Claude starts losing track of the rubric — just start a fresh conversation and paste the approved rubric at the top).

**Can I save the rubric for later?**
Yes — once Claude generates and you approve the rubric, copy it and save it somewhere (a doc, a note). If you need to continue screening in a new session, paste the rubric at the start and tell Claude: "Here is the approved rubric for this role. Skip setup and go straight to screening mode."

**What if I want to add Brainner or Ashby integration later?**
That's a separate project that requires API access and some scripting. For now, this workflow is fully self-contained in Claude.

---

## Quick Reference — Rubric Scale

| Score | Label | Meaning |
|-------|-------|---------|
| 4 | Strong Yes | Move forward — meets or exceeds bar |
| 3 | Maybe | Warrants a second look — borderline or missing one thing |
| 2 | No | Does not meet bar — pass |
| 1 | Hard No | Clear disqualifier — do not move forward |
