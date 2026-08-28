# LinkedIn Recruiter Shortcut — Staff SWE (AI & Developer Tooling)

## Prompt

Go through LinkedIn Recruiter search results for the "Staff SWE" role focused on AI and Developer Tooling. Your job is to build a high-quality outreach pipeline. These candidates will be contacted directly by a recruiter and then recruiter screened. If a candidate clears all the gates, add them — the screen will do the deeper triage.

---

## CRITERIA

### Gates — ALL must be present to add to pipeline

**1. Staff-level scope**
Staff Engineer title OR Senior Engineer with clear staff-level scope visible in their actual work history — cross-org technical influence, tech lead responsibilities, mentoring senior engineers, or driving company-wide engineering initiatives. Title alone is not enough in either direction: a "Staff Engineer" who only worked on their own team's features doesn't qualify; a "Senior Engineer" who led architecture decisions across multiple teams does.

**2. Developer tooling, platform, or DevEx as a primary focus**
Must be evident across multiple roles or constitute a significant portion of their most recent role — not a side project or a single bullet. Qualifying experience includes:
- Developer experience (DevEx) platforms
- Internal tooling, libraries, or frameworks other engineers depend on
- CI/CD pipeline design or ownership
- Platform or infrastructure engineering
- Build, deployment, or observability systems

Does NOT qualify:
- Product feature engineering, even at large scale
- Consumer-facing product development without a tooling mandate
- Using internal tools without building them

**3. Built something with AI/ML/LLM — not just used it**
Must show hands-on building, not consumption. Qualifying experience includes:
- Coding agents or agentic development tooling
- AI-assisted code review, generation, or testing shipped in production
- LLM integration into CI/CD or developer workflows
- Built or contributed to AI developer tools used by other engineers

Does NOT qualify:
- Uses Copilot, Cursor, or ChatGPT as a personal productivity tool
- Consumer-facing AI features (recommendations, search, personalization)
- AI listed only in a skills section with no corresponding work history bullets — treat as unverified, but don't disqualify on this alone if other signals are strong

**4. AWS in production**
Must show real AWS usage in production, not just familiarity or certification.

**5. Terraform in production**
Must show Terraform usage in production. A mention in a skills section with no supporting work history bullets does not count.

**6. Kubernetes or containerized workloads in production**
Must show hands-on Kubernetes or container orchestration experience in production.

**7. At least one target language: Go, Ruby, TypeScript, or Python**
Must have proficiency in at least one. Does not matter which one — this is the only technical requirement where one out of four is sufficient.

**8. 8+ years of software engineering experience**
Post-grad, full-time roles only. Do not count internships, bootcamps, or academic projects.

---

### Skip Immediately — any one of these = do not add

- Missing any of the 8 gates above
- Defense, military, or aerospace as primary background (Lockheed, Raytheon, nuclear engineering, defense systems) — does not transfer to commercial software
- "Software Engineer" title at a defense contractor whose actual work was embedded systems, hardware, or nuclear — read the work, not the title

---

### Prioritize Within the Pipeline — use these to rank when pipeline gets full

- AWS Bedrock — explicitly flagged as strong signal by hiring manager
- MCP (Model Context Protocol) — indicates current AI tooling fluency
- RAG in a developer tooling or internal platform context
- Kubernetes + SRE background
- Broad, deep AWS experience at scale
- Active GitHub with relevant projects that corroborate profile claims

---

### West Coast Note
Candidates in Pacific timezone (CA, WA, OR, BC) are lower priority. Don't skip them if they clear all gates, but deprioritize in favor of equally strong candidates in other timezones if the pipeline is getting full.

---

## PROCESS — follow this exactly for each candidate

1. From the Recruiter search results page, click on a candidate's name to open their full profile modal
2. Scroll through their ENTIRE experience section — read every role and its accomplishments, not just the most recent one
3. Do NOT rely on LinkedIn's "High qualification relevance" badges or the summary snippet — read the actual job descriptions
4. Check all 8 gates:
   - If all 8 are present → add to the "Staff SWE" project pipeline
   - If any gate is missing → skip and move to the next candidate
5. After adding or skipping, close the modal and move to the next candidate

---

## PROGRESS REPORTING

After every 10 candidates reviewed, stop and report:
- How many reviewed so far
- How many added to pipeline
- How many skipped and the most common gate they failed
- Any patterns you're noticing in the results

---

## CLEANUP PASS — after first 25 candidates

After reviewing 25 candidates, stop and do the following before continuing:
- Re-read every candidate currently in the pipeline
- Confirm each one clearly passes all 8 gates
- Archive any that were added without clear evidence for every gate
- Report how many were kept vs. archived and why

Then continue through the remaining results.

---

## GOAL

Build a pipeline of approximately 100 candidates who clear all gates and are worth direct recruiter outreach. If after 100 reviews the pipeline is thin, report back before continuing so the search filters or criteria can be adjusted.

Start from the Recruiter search page and work through candidates systematically, one profile at a time.
