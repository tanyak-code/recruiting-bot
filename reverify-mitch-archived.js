#!/usr/bin/env node
/**
 * reverify-mitch-archived.js
 * Pull all candidates from Ashby "To Be Archived & Dispo" for Mitch's Staff SWE role,
 * cross-reference with Brainner for resume data, re-screen with updated criteria,
 * and generate an HTML report showing rescored results.
 *
 * Run: node reverify-mitch-archived.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY     = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const BRAINNER_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ANTHROPIC_KEY = "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";

const ASHBY_JOB_ID  = "203af220-b197-4a58-827f-072cb1ae0611"; // Mitch's Staff SWE
const BRAINNER_SLUG = "3123535d-a45c-43e6-8f44-7ae37f8df0f4"; // Staff SWE (Mitch)
const HTML_FILE     = path.join(__dirname, "reverify-mitch-report.html");

const { criteria: MITCH_CRITERIA } = require("./criteria/mitch");

// ─── West Coast detection (same as screen-staff-swe.js) ───────────────────────
const WEST_COAST_STATES = ["california", "ca", "oregon", "or", "washington", "wa"];
const WEST_COAST_CITIES = [
  "los angeles", "san francisco", "san diego", "san jose", "sacramento",
  "seattle", "portland", "las vegas", "phoenix", "tucson", "denver",
  "oakland", "berkeley", "pasadena", "long beach", "anaheim", "irvine",
  "santa monica", "venice", "culver city", "burbank", "glendale",
  "palo alto", "mountain view", "sunnyvale", "santa clara", "cupertino",
  "san mateo", "redwood city", "menlo park", "fremont", "hayward",
  "bellevue", "redmond", "kirkland", "tacoma", "olympia", "spokane"
];

function isWestCoast(location) {
  if (!location) return false;
  const loc = location.toLowerCase();
  for (const state of WEST_COAST_STATES) {
    if (new RegExp(`\\b${state}\\b`).test(loc)) {
      if (state === "washington" || state === "wa") {
        if (/washington,?\s*(state|wa|us|united states)/i.test(location) ||
            /\b(seattle|tacoma|spokane|bellevue|redmond|kirkland|olympia)\b/i.test(location)) return true;
        if (/washington,?\s*d\.?c\.?/i.test(location) || /district of columbia/i.test(location)) return false;
        if (/\bwa\b/i.test(location) && !/\bwash\.?\s*dc\b/i.test(location)) return true;
        continue;
      }
      return true;
    }
  }
  for (const city of WEST_COAST_CITIES) {
    if (loc.includes(city)) return true;
  }
  return false;
}

// ─── HTML report helpers ───────────────────────────────────────────────────────
function esc(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function scoreColor(s) { return { 4:"#1a7f4b", 3:"#1565c0", 2:"#b45309", 1:"#c0392b" }[s] || "#555"; }
function scoreBg(s)    { return { 4:"#d4edda", 3:"#dbeafe", 2:"#fef3c7", 1:"#fde8e8" }[s] || "#f5f5f5"; }
function scoreBorder(s){ return { 4:"#1a7f4b", 3:"#1565c0", 2:"#d97706", 1:"#c0392b" }[s] || "#ccc"; }
function scoreEmoji(s) { return { 4:"✅", 3:"🔵", 2:"🟡", 1:"❌" }[s] || "⚪"; }

function buildHTML(results, total, done, running) {
  const counts = { 4:0, 3:0, 2:0, 1:0 };
  results.forEach(r => { counts[r.ourScore] = (counts[r.ourScore]||0)+1; });
  const pct = total > 0 ? Math.round((done/total)*100) : 0;
  const refreshMeta = running ? `<meta http-equiv="refresh" content="4">` : "";
  const statusBadge = running
    ? `<span class="status running">⏳ Running — refreshes every 4s</span>`
    : `<span class="status done">✅ Complete</span>`;

  const headings = {
    4: "✅ Strong Yes — UPGRADED — Move Forward",
    3: "🔵 Yes — UPGRADED — Worth a Look",
    2: "🟡 No — Confirm Archive",
    1: "❌ Strong No — Confirm Archive"
  };

  const sections = [4,3,2,1].map(s => {
    const group = results.filter(r => r.ourScore === s);
    if (!group.length) return "";
    const cards = group.map(r => `
    <div class="card ${s >= 3 ? 'upgraded' : ''}" style="border-left:4px solid ${scoreBorder(s)};background:${scoreBg(s)};">
      ${s >= 3 ? `<div class="upgrade-banner">🔄 UPGRADED — was archived</div>` : ""}
      <div class="card-header">
        <div class="candidate-info">
          <span class="rank">#${r.rank}</span>
          <span class="name">${esc(r.name)}</span>
          <span class="location">📍 ${esc(r.location||"—")}${r.westCoast ? " ⚠️WC" : ""}</span>
        </div>
        <div class="scores">
          <span class="brainner-score">🧠 ${r.brainnerScore ?? "—"}</span>
          <span class="our-score" style="background:${scoreColor(s)};">${scoreEmoji(s)} ${s} — ${esc(r.scoreLabel)}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="field"><span class="label">Summary</span><span class="value">${esc(r.summary)}</span></div>
        <div class="field"><span class="label">Top Strength</span><span class="value">${esc(r.topStrength)}</span></div>
        <div class="field"><span class="label">Top Concern</span><span class="value">${esc(r.topConcern)}</span></div>
      </div>
    </div>`).join("");

    return `
    <section>
      <h2 style="color:${scoreColor(s)};margin:24px 0 12px;">${headings[s]} (${group.length})</h2>
      ${cards}
    </section>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${refreshMeta}
  <title>Re-Verify: Mitch Staff SWE Archived</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; background: #f8f9fa; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
    .progress-bar { background: #e0e0e0; border-radius: 6px; height: 8px; margin: 12px 0; }
    .progress-fill { background: #1a7f4b; height: 8px; border-radius: 6px; transition: width 0.3s; }
    .summary-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; }
    .badge { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .status { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status.running { background: #fff3cd; color: #856404; }
    .status.done    { background: #d4edda; color: #155724; }
    .card { border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
    .card.upgraded { box-shadow: 0 2px 8px rgba(21,101,192,.25); }
    .upgrade-banner { background: #1565c0; color: #fff; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 3px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; flex-wrap: wrap; gap: 8px; }
    .candidate-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .rank { font-size: 12px; color: #888; }
    .name { font-weight: 700; font-size: 15px; }
    .location { font-size: 12px; color: #666; }
    .scores { display: flex; gap: 8px; align-items: center; }
    .brainner-score { background: #e8e8e8; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .our-score { color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 700; }
    .card-body { display: flex; flex-direction: column; gap: 6px; }
    .field { display: flex; gap: 8px; font-size: 13px; line-height: 1.5; }
    .label { font-weight: 600; min-width: 100px; color: #444; }
    .value { flex: 1; color: #333; }
    .no-resume { background: #f0f0f0; color: #888; font-style: italic; font-size: 12px; padding: 8px 12px; border-radius: 4px; margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>🔄 Re-Verify: Mitch · Staff SWE — Archived Candidates</h1>
  <div class="meta">
    Re-screening with updated criteria (AWS/Terraform/K8s = bonus not gates; AI must serve engineers)
    &nbsp;·&nbsp; ${statusBadge}
  </div>
  <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
  <p style="font-size:13px;color:#555;">${done} / ${total} screened (${pct}%)</p>
  <div class="summary-row">
    <span class="badge" style="background:#d4edda;color:#155724;">✅ ${counts[4]} Strong Yes</span>
    <span class="badge" style="background:#dbeafe;color:#1e40af;">🔵 ${counts[3]} Yes</span>
    <span class="badge" style="background:#fef3c7;color:#92400e;">🟡 ${counts[2]} No</span>
    <span class="badge" style="background:#fde8e8;color:#991b1b;">❌ ${counts[1]} Strong No</span>
  </div>
  ${sections || `<p style="color:#888;margin-top:40px;">Screening in progress…</p>`}
</body>
</html>`;
}

function writeHTML(results, total, done, running) {
  fs.writeFileSync(HTML_FILE, buildHTML(results, total, done, running), "utf8");
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────────
function ashbyPost(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify(payload);
    const encoded = Buffer.from(ASHBY_KEY + ":").toString("base64");
    const req = https.request({
      hostname: "api.ashbyhq.com",
      path:     endpoint,
      method:   "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization":  "Basic " + encoded,
      },
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function brainnerGet(urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "admin.brainner.ai",
      path:     urlPath,
      method:   "GET",
      headers:  { "Authorization": `Bearer ${BRAINNER_KEY}`, "Accept": "application/json" },
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on("error", reject);
    req.end();
  });
}

function claudePost(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: "api.anthropic.com",
      path:     "/v1/messages",
      method:   "POST",
      headers: {
        "Content-Type":      "application/json",
        "Content-Length":    Buffer.byteLength(body),
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Resume JSON → text ────────────────────────────────────────────────────────
function resumeJsonToText(rj) {
  if (!rj) return "";
  const parts = [];
  if (rj.basics) {
    const b = rj.basics;
    if (b.name)    parts.push(`Name: ${b.name}`);
    if (b.label)   parts.push(`Title: ${b.label}`);
    if (b.summary) parts.push(`Summary: ${b.summary}`);
    if (b.location) parts.push(`Location: ${typeof b.location === "string" ? b.location : [b.location.city, b.location.region, b.location.countryCode].filter(Boolean).join(", ")}`);
  }
  if (Array.isArray(rj.work) && rj.work.length) {
    parts.push("\nWORK EXPERIENCE:");
    for (const w of rj.work) {
      const end = w.endDate === "TODAY" ? "Present" : (w.endDate || "Present");
      parts.push(`\n${w.position || "Role"} at ${w.name || "Company"} (${w.startDate || "?"} – ${end})`);
      if (w.location)  parts.push(`Location: ${w.location}`);
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

// ─── Step 1: Pull all Ashby applications, find archived stage + candidates ─────
async function fetchArchivedFromAshby() {
  console.log("\n📥 Fetching all Ashby applications for Mitch's Staff SWE job...");
  const all = [];
  let cursor = null;
  while (true) {
    const payload = { jobId: ASHBY_JOB_ID, limit: 100 };
    if (cursor) payload.cursor = cursor;
    const resp = await ashbyPost("/application.list", payload);
    const results = resp.results || [];
    all.push(...results);
    if (!resp.moreDataAvailable || results.length === 0) break;
    cursor = resp.nextCursor;
  }
  console.log(`   Total applications: ${all.length}`);

  // Discover "To Be Archived & Dispo" stage ID
  let archiveStageId = null;
  for (const app of all) {
    const title = (app.currentInterviewStage?.title || "").toLowerCase();
    if (title.startsWith("to be archived")) {
      archiveStageId = app.currentInterviewStage.id;
      break;
    }
  }
  if (!archiveStageId) {
    // Fallback: look at all stages seen
    const seen = new Set(all.map(a => `${a.currentInterviewStage?.id} → ${a.currentInterviewStage?.title}`));
    console.log("   Stages seen:", [...seen].join(", "));
    throw new Error('Could not find "To Be Archived & Dispo" stage. Check stage names above.');
  }
  console.log(`   ✅ Archive stage ID: ${archiveStageId}`);

  const archived = all.filter(a => a.currentInterviewStage?.id === archiveStageId);
  console.log(`   Candidates in "To Be Archived & Dispo": ${archived.length}`);

  return archived.map(app => ({
    ashbyId: app.id,
    email:   (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim(),
    name:    app.candidate?.name || app.candidate?.primaryEmailAddress?.value || "Unknown",
  })).filter(c => c.email);
}

// ─── Step 2: Fetch ALL Brainner candidates to build email→resume map ───────────
async function fetchBrainnerResumeMap() {
  console.log("\n🧠 Fetching all Brainner candidates to build resume map...");
  const map = {}; // email → { brainnerScore, resumeText, location }
  let page = 1;
  let totalFetched = 0;

  while (true) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": BRAINNER_SLUG,
      "fields[0]":               "Name",
      "fields[1]":               "Email",
      "fields[2]":               "Score",
      "fields[3]":               "ResumeJSON",
      "fields[4]":               "Location",
      "pagination[page]":        String(page),
      "pagination[pageSize]":    "200",
    }).toString();

    const resp = await brainnerGet(`/api/candidates?${params}`);
    const data = resp?.data || [];
    if (data.length === 0) break;

    for (const c of data) {
      const a     = c.attributes || {};
      const email = (a.Email || "").toLowerCase().trim();
      if (!email) continue;
      map[email] = {
        brainnerScore: a.Score ?? null,
        location:      a.Location || "",
        resumeText:    resumeJsonToText(a.ResumeJSON),
      };
    }
    totalFetched += data.length;

    const { page: pg, pageCount } = resp?.meta?.pagination || {};
    if (!pageCount || pg >= pageCount) break;
    page++;
  }
  console.log(`   Built resume map for ${totalFetched} Brainner candidates`);
  return map;
}

// ─── Step 3: Screen with Claude ────────────────────────────────────────────────
async function screenWithClaude(name, resumeText, location) {
  const westCoast = isWestCoast(location);
  const westCoastNote = westCoast
    ? `\n\nIMPORTANT LOCATION NOTE: This candidate is on the WEST COAST (${location}). Hiring manager prefers Central or Eastern Time Zone. Max score is capped at 3. Note in topConcern: "⚠️ WEST COAST FLAG: Candidate is in ${location} (Pacific Time). HM preference is Central/Eastern TZ."`
    : "";

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const prompt = `You are a strict senior technical recruiter screening for a highly specialized Staff-level role. Most candidates should NOT pass — this is a narrow role with hard requirements, and the bar is high.

TODAY'S DATE: ${today}. Use this when evaluating tenure and recency only. IMPORTANT: Do NOT flag future end dates on current roles as a concern — a future end date simply means a contract end, upcoming layoff, or the candidate has given notice. This is normal and often a positive signal (candidate available soon). Never mention end dates in topConcern.

IMPORTANT CALIBRATION INSTRUCTIONS:
- Be skeptical and conservative. When in doubt, score lower.
- A score of 4 should be rare — only for candidates who clearly meet every single hard requirement with explicit evidence.
- A score of 3 is for solid candidates who meet the hard technical bar but are missing lead/staff scope.
- Most candidates will score 1 or 2. Do not inflate scores.
- Do NOT give credit for requirements unless there is EXPLICIT, SPECIFIC evidence in the resume.
- Do NOT infer or assume. If it is not written, it did not happen.

STRICT RULES — READ CAREFULLY:

DEVELOPER TOOLING: Must be the PRIMARY focus of their work, not incidental. Building CI/CD pipelines for their own team's use, writing scripts, or maintaining infra for product engineering does NOT count. Must show they built platforms, frameworks, or tooling that OTHER engineers across the org depended on as their PRIMARY mandate.

AI FOR DEVELOPER TOOLING: This means AI applied to engineering workflows specifically — coding agents, AI-assisted code review, LLM integration into CI/CD, agentic dev tools. Consumer AI features (recommendation engines, search, personalization, chatbots for end users), healthcare AI, medical AI, data science/ML pipelines, or general LLM API integration into products do NOT qualify. Using Copilot/Cursor personally does NOT qualify.

AWS + TERRAFORM: Both are BONUS points — not hard gates. Having them is a plus. Lacking them is NOT a disqualifier.

KUBERNETES: Also a bonus point, not a requirement.

EXPERIENCE: Count only post-graduation full-time roles. Be strict about the 8-year threshold.

STAFF/LEAD SCOPE: Must be explicit — "tech lead", "staff engineer", "led cross-team initiative", "mentored senior engineers", "drove org-wide adoption". Senior Engineer title alone does not qualify.

${MITCH_CRITERIA}
${westCoastNote}

CANDIDATE RESUME / PROFILE:
${(resumeText || "").slice(0, 8000)}

Respond ONLY with a JSON object, no markdown, no explanation:
{
  "name": "${name}",
  "score": <1|2|3|4>,
  "scoreLabel": "<Strong No|No|Yes|Strong Yes>",
  "summary": "<2-3 sentences: be specific about what qualifies or disqualifies, cite actual evidence from the resume>",
  "topStrength": "<single most compelling specific thing, with evidence>",
  "topConcern": "<most critical gap or missing requirement, be specific>"
}`;

  const resp = await claudePost({
    model:      "claude-sonnet-4-6",
    max_tokens: 600,
    messages:   [{ role: "user", content: prompt }],
  });

  const raw = resp?.content?.[0]?.text ?? "{}";
  try {
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    // Apply west coast cap
    if (westCoast && parsed.score > 3) parsed.score = 3;
    parsed.westCoast = westCoast;
    return parsed;
  } catch {
    return { score: 1, scoreLabel: "Strong No", summary: "Parse error", topStrength: "", topConcern: "Parse error", westCoast: false };
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n🔄 reverify-mitch-archived.js");
  console.log("   Re-screening Staff SWE archived candidates with updated criteria");
  console.log(`   HTML report: ${HTML_FILE}\n`);

  // Step 1: Get archived candidates from Ashby
  const archivedCandidates = await fetchArchivedFromAshby();

  // Step 2: Get resume map from Brainner
  const resumeMap = await fetchBrainnerResumeMap();

  const total = archivedCandidates.length;
  console.log(`\n📊 ${total} archived candidates to re-screen`);

  // Check resume coverage
  const withResume    = archivedCandidates.filter(c => resumeMap[c.email]?.resumeText?.length > 50);
  const withoutResume = archivedCandidates.filter(c => !resumeMap[c.email]?.resumeText?.length);
  console.log(`   With resume data:    ${withResume.length}`);
  console.log(`   Without resume data: ${withoutResume.length} (will be skipped)`);

  // Initialize HTML
  writeHTML([], total, 0, true);
  console.log(`\n🖥️  Report: file://${HTML_FILE}`);
  console.log("\n⏳ Screening...\n");

  const results = [];
  let rank = 0;

  for (const candidate of archivedCandidates) {
    const brainnerData = resumeMap[candidate.email];

    if (!brainnerData || brainnerData.resumeText.length < 50) {
      console.log(`   ⏭️  No resume: ${candidate.name}`);
      continue;
    }

    rank++;
    const result = await screenWithClaude(
      candidate.name,
      brainnerData.resumeText,
      brainnerData.location || ""
    );

    const scored = {
      rank,
      name:          result.name || candidate.name,
      email:         candidate.email,
      location:      brainnerData.location || "",
      westCoast:     result.westCoast || false,
      brainnerScore: brainnerData.brainnerScore,
      ourScore:      result.score || 1,
      scoreLabel:    result.scoreLabel || "Strong No",
      summary:       result.summary || "",
      topStrength:   result.topStrength || "",
      topConcern:    result.topConcern || "",
    };

    results.push(scored);

    const emoji = { 4:"✅", 3:"🔵", 2:"🟡", 1:"❌" }[scored.ourScore] || "⚪";
    const upgraded = scored.ourScore >= 3 ? " ← UPGRADED" : "";
    console.log(`   ${emoji} [${rank}/${total}] Score ${scored.ourScore} | B:${scored.brainnerScore ?? "—"} | ${scored.name}${upgraded}`);

    // Sort by score desc for HTML
    const sorted = [...results].sort((a, b) => b.ourScore - a.ourScore || (b.brainnerScore ?? 0) - (a.brainnerScore ?? 0));
    sorted.forEach((r, i) => r.rank = i + 1);
    writeHTML(sorted, total, rank, true);

    await sleep(300);
  }

  // Final sorted write
  const finalSorted = [...results].sort((a, b) => b.ourScore - a.ourScore || (b.brainnerScore ?? 0) - (a.brainnerScore ?? 0));
  finalSorted.forEach((r, i) => r.rank = i + 1);
  writeHTML(finalSorted, total, rank, false);

  const upgraded3plus = finalSorted.filter(r => r.ourScore >= 3);
  console.log(`\n✅ Done. ${rank} candidates screened.`);
  console.log(`   Upgraded (score 3+): ${upgraded3plus.length}`);
  if (upgraded3plus.length > 0) {
    console.log("\n🔄 UPGRADED CANDIDATES:");
    upgraded3plus.forEach(r => console.log(`   ${r.ourScore === 4 ? "✅" : "🔵"} Score ${r.ourScore}: ${r.name} (Brainner: ${r.brainnerScore ?? "—"})`));
  }
  console.log(`\n📄 Report: file://${HTML_FILE}\n`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
