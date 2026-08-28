#!/usr/bin/env node
/**
 * Sr. Manager TPM Screener — Brainner → Claude → CSV
 * Pulls top 100 candidates from Brainner (paginated, cache-aware),
 * screens with Ed's calibrated TPM criteria, exports CSV.
 *
 * Run: node screen-sr-tpm.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

// ── Config ───────────────────────────────────────────────────────────────────
const BRAINNER_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ANTHROPIC_KEY = "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";
const JOB_SLUG      = "b46b4a19-16f8-4b5c-abfe-dcc42ff90175";
const TOP_N         = 1500;
const STOP_AT_GOOD  = 9999; // Effectively disabled — screen all candidates for disposition run
const CSV_FILE      = path.join(__dirname, `sr-tpm-screened-${new Date().toISOString().slice(0,10)}.csv`);
const CACHE_FILE    = path.join(__dirname, "sr-tpm-cache.json");
const HTML_FILE     = path.join(__dirname, "sr-tpm-report.html");
// ─────────────────────────────────────────────────────────────────────────────

const { criteria: TPM_CRITERIA } = require('./criteria/ed-tpm');

// ── HTML report helpers ───────────────────────────────────────────────────────
function esc(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function scoreColor(s) { return { 4:"#1a7f4b", 3:"#1565c0", 2:"#b45309", 1:"#c0392b" }[s] || "#555"; }
function scoreBg(s)    { return { 4:"#d4edda", 3:"#dbeafe", 2:"#fef3c7", 1:"#fde8e8" }[s] || "#f5f5f5"; }
function scoreBorder(s){ return { 4:"#1a7f4b", 3:"#1565c0", 2:"#d97706", 1:"#c0392b" }[s] || "#ccc"; }
function scoreEmoji(s) { return { 4:"✅", 3:"🔵", 2:"🟡", 1:"❌" }[s] || "⚪"; }

function buildHTML(results, total, done, running) {
  const counts = { 4:0, "3M":0, 3:0, 2:0, 1:0 };
  results.forEach(r => {
    if (r.scoreLabel === "3M") counts["3M"]++;
    else counts[r.ourScore] = (counts[r.ourScore]||0)+1;
  });
  const pct = total > 0 ? Math.round((done/total)*100) : 0;
  const refreshMeta = running ? `<meta http-equiv="refresh" content="4">` : "";
  const statusBadge = running
    ? `<span class="status running">⏳ Running — refreshes every 4s</span>`
    : `<span class="status done">✅ Complete</span>`;

  const headings = { 4:"✅ Strong Yes — Move Forward", 3:"🔵 Yes — Probe on Screen", 2:"🟡 No — Do Not Advance", 1:"❌ Strong No" };
  const sections = [4,3,2,1].map(s => {
    const group = results.filter(r => r.ourScore === s);
    if (!group.length) return "";
    const cards = group.map(r => `
    <div class="card" style="border-left:4px solid ${scoreBorder(s)};background:${scoreBg(s)};">
      <div class="card-header">
        <div class="candidate-info">
          <span class="rank">#${r.rank}</span>
          <span class="name">${esc(r.name)}</span>
          <span class="location">📍 ${esc(r.location||"—")}</span>
        </div>
        <div class="scores">
          <span class="brainner-score">🧠 ${r.brainnerScore}</span>
          <span class="our-score" style="background:${scoreColor(s)};">${scoreEmoji(s)} ${s} — ${esc(r.scoreLabel)}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="field"><span class="label">Summary</span><span class="value">${esc(r.summary)}</span></div>
        <div class="two-col">
          <div class="field"><span class="label">💪 Top Strength</span><span class="value">${esc(r.topStrength)}</span></div>
          <div class="field"><span class="label">⚠️ Top Concern</span><span class="value">${esc(r.topConcern)}</span></div>
        </div>
      </div>
    </div>`).join("\n");
    return `<div class="section-heading">${headings[s]} (${group.length})</div>\n${cards}`;
  }).join("\n");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">${refreshMeta}
<title>Sr. Manager TPM Screener — Scribd</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f0f2f5;color:#1a1a1a}
.header{background:#fff;border-bottom:1px solid #e0e0e0;padding:20px 32px;position:sticky;top:0;z-index:10}
.header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.title{font-size:20px;font-weight:700;color:#111}.subtitle{font-size:13px;color:#666;margin-top:2px}
.status{font-size:12px;font-weight:600;padding:4px 10px;border-radius:12px}
.status.running{background:#fef9c3;color:#854d0e}.status.done{background:#dcfce7;color:#166534}
.progress-bar-wrap{background:#e5e7eb;border-radius:4px;height:6px;margin-bottom:14px}
.progress-bar{background:#2563eb;height:6px;border-radius:4px}
.stats{display:flex;gap:12px;flex-wrap:wrap}
.stat{padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600}
.stat-4{background:#d4edda;color:#1a7f4b}.stat-3{background:#dbeafe;color:#1565c0}
.stat-3m{background:#ede9fe;color:#5b21b6}
.stat-2{background:#fef3c7;color:#b45309}.stat-1{background:#fde8e8;color:#c0392b}
.stat-total{background:#f3f4f6;color:#374151}
.content{max-width:900px;margin:0 auto;padding:24px 16px}
.section-heading{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;margin:20px 0 8px;padding-bottom:6px;border-bottom:1px solid #e5e7eb}
.card{border-radius:10px;padding:16px 20px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.card-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;gap:12px}
.candidate-info{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.rank{font-size:12px;color:#9ca3af;font-weight:600;min-width:28px}
.name{font-size:15px;font-weight:700;color:#111}.location{font-size:12px;color:#6b7280}
.scores{display:flex;align-items:center;gap:8px;flex-shrink:0}
.brainner-score{font-size:12px;color:#6b7280;background:#f3f4f6;padding:3px 8px;border-radius:10px}
.our-score{font-size:13px;font-weight:700;color:#fff;padding:4px 12px;border-radius:12px;white-space:nowrap}
.card-body{display:flex;flex-direction:column;gap:10px}
.field{display:flex;flex-direction:column;gap:3px}
.label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af}
.value{font-size:13px;color:#374151;line-height:1.5}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.pending{text-align:center;padding:40px;color:#9ca3af;font-size:14px}
@media(max-width:600px){.two-col{grid-template-columns:1fr}.card-header{flex-direction:column}}
</style></head><body>
<div class="header">
  <div class="header-top">
    <div><div class="title">Sr. Manager TPM — Scribd</div>
    <div class="subtitle">Ed's calibrated screening · Top ${total} by Brainner score · ${done}/${total} screened</div></div>
    ${statusBadge}
  </div>
  <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
  <div class="stats">
    <span class="stat stat-total">Total screened: ${done}</span>
    <span class="stat stat-4">✅ Strong Yes (4): ${counts[4]}</span>
    <span class="stat stat-3">🔵 Yes (3): ${counts[3]}</span>
    <span class="stat stat-3m">🟣 Yes-M (3M): ${counts["3M"]}</span>
    <span class="stat stat-2">🟡 No (2): ${counts[2]}</span>
    <span class="stat stat-1">❌ Strong No (1): ${counts[1]}</span>
  </div>
</div>
<div class="content">
${sections}
${running && done < total ? `<div class="pending">⏳ Screening in progress… ${total-done} remaining. Page refreshes every 4s.</div>` : ""}
</div></body></html>`;
}

function writeHTML(results, total, done, running) {
  const sorted = [...results].sort((a,b) => b.ourScore - a.ourScore || b.brainnerScore - a.brainnerScore);
  sorted.forEach((r,i) => r.rank = i+1);
  fs.writeFileSync(HTML_FILE, buildHTML(sorted, total, done, running), "utf8");
}

// ── Resume JSON → text ────────────────────────────────────────────────────────
function resumeJsonToText(rj) {
  if (!rj) return "";
  if (typeof rj === "string") return rj;
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

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function httpsGet(hostname, urlPath, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path: urlPath, method: "GET", headers }, (res) => {
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

function httpsPost(hostname, urlPath, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname, path: urlPath, method: "POST",
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

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Cache helpers ─────────────────────────────────────────────────────────────
function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); }
  catch { return {}; }
}

function saveToCache(cache, email, result) {
  cache[email] = result;
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function q(v) { return `"${String(v ?? "").replace(/"/g, '""')}"`; }

function initCSV() {
  const headers = ["Rank","Name","Email","Location","Brainner Score","Our Score","Score Label","Summary","Top Strength","Top Concern"];
  fs.writeFileSync(CSV_FILE, headers.map(q).join(",") + "\n");
}

function appendCSV(rank, cand, result) {
  const row = [
    rank,
    result.name ?? cand.name,
    cand.email,
    cand.location ?? "",
    cand.brainnerScore ?? "",
    result.score ?? "",
    result.scoreLabel ?? "",
    result.summary ?? "",
    result.topStrength ?? "",
    result.topConcern ?? ""
  ];
  fs.appendFileSync(CSV_FILE, row.map(q).join(",") + "\n");
}

// ── Fetch candidates (paginated, cache-aware) ─────────────────────────────────
async function fetchCandidates(cachedEmails) {
  const pageSize = 200;
  let page = 1;
  const allRaw = [];

  console.log(`Fetching "To Review" candidates from Brainner for Sr. Manager TPM (score high → low)…`);

  while (true) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": JOB_SLUG,
      "filters[Status][$eq]": "evaluated",
      "sort": "Score:desc",
      "pagination[pageSize]": String(pageSize),
      "pagination[page]": String(page),
    });

    const res = await httpsGet("admin.brainner.ai", `/api/candidates?${params}`, {
      "Authorization": `Bearer ${BRAINNER_KEY}`
    });

    if (res.status !== 200) throw new Error(`Brainner API error: ${res.status} — ${JSON.stringify(res.body)}`);

    const data = res.body.data ?? [];
    allRaw.push(...data);

    const total = res.body.meta?.pagination?.total ?? data.length;
    console.log(`  Page ${page}: ${data.length} candidates (${allRaw.length}/${total} total)`);

    if (allRaw.length >= total || data.length < pageSize) break;
    page++;
  }

  const candidates = allRaw
    .filter(c => !cachedEmails.has((c.attributes.Email || "").toLowerCase()))
    .sort((a, b) => (b.attributes.Score || 0) - (a.attributes.Score || 0))
    .slice(0, TOP_N)
    .map(c => ({
      id: c.id,
      name: c.attributes.Name,
      email: (c.attributes.Email || "").toLowerCase(),
      location: c.attributes.Location,
      brainnerScore: c.attributes.Score,
      resume: resumeJsonToText(c.attributes.ResumeJSON) || resumeJsonToText(c.attributes.ResumeParsed) || resumeJsonToText(c.attributes.Profile) || ""
    }));

  console.log(`  After filtering cached/excluded: screening ${candidates.length}\n`);
  return candidates;
}

// ── Screen one candidate ──────────────────────────────────────────────────────
async function screenCandidate(cand) {
  if (!cand.resume || cand.resume.trim().length < 50) {
    return { score: 1, scoreLabel: "Strong No", summary: "No resume content available.", topStrength: null, topConcern: "No resume data" };
  }

  const now = new Date();
  const today = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const prompt = `TODAY'S DATE: ${today} (year: ${currentYear}, month: ${currentMonth}). This is the authoritative date — use it for ALL tenure and recency calculations.

TENURE CALCULATION RULES (mandatory):
- "Present" or "Current" always means ${currentYear} for year-level calculations
- Example: "2022 – Present" = ${currentYear} − 2022 = ${currentYear - 2022} years. Do not use any other year.
- Round down to full years only. Never use a year before ${currentYear} for "present" roles.
- Do NOT flag future end dates on current roles as a concern — a future end date simply means a contract end or notice given. Never mention end dates in topConcern.

TPM TITLE TENURE — SCAN ALL ROLES (mandatory):
- Before making any claim about TPM tenure, scan EVERY role in the work history and list all roles whose title contains "Technical Program Manager", "Technology Program Manager", "TPM", or similar.
- Sum the years across ALL such roles in the entire career, not just the most recent ones.
- A candidate with TPM titles at multiple companies (e.g. Chase 2018–2020, Amazon 2020–2022, Datadog 2022–2024, SoFi 2024–present) has ~7+ years in TPM titles — do not claim "2 years" because you only counted the most recent role.
- Engineering Manager, Software Engineer, or other non-TPM titles at earlier companies do NOT cause you to ignore TPM titles that came after them.

You are a strict senior technical recruiter screening for a Senior Manager, Technical Program Management role. Apply the criteria precisely — do not give benefit of the doubt.

${TPM_CRITERIA}

CANDIDATE RESUME / PROFILE:
${cand.resume.slice(0, 8000)}

Respond ONLY with a JSON object, no markdown, no explanation:
{
  "name": "<full name, or 'Candidate' if not found>",
  "currentRole": "<most recent title + company, max 8 words>",
  "score": <1|2|3|4>,
  "scoreLabel": "<Strong No|No|Yes|3M|Strong Yes>",
  "summary": "<2-3 sentences: key strengths, gaps, bottom line>",
  "topStrength": "<single most compelling thing about this candidate>",
  "topConcern": "<biggest gap or risk — null ONLY for score 4; for scoreLabel 3M always write the management gap here even if everything else is strong>"
}`;

  const res = await httpsPost("api.anthropic.com", "/v1/messages", {
    "x-api-key": ANTHROPIC_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  }, {
    model: "claude-sonnet-4-6",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }]
  });

  if (res.status !== 200) throw new Error(`Claude API error: ${res.status}`);

  const raw = res.body.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { score: 2, scoreLabel: "No", summary: "Parse error.", topStrength: null, topConcern: "Parse error" };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("━━━ Sr. Manager TPM Screener — Ed / Scribd ━━━\n");

  const cache = loadCache();
  const cachedEmails = new Set(Object.keys(cache));
  console.log(`  Loaded cache: ${cachedEmails.size} already screened\n`);

  initCSV();

  const candidates = await fetchCandidates(cachedEmails);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const results = [];

  // Write initial empty HTML so the file exists to open right away
  writeHTML([], candidates.length, 0, true);
  console.log(`\n🌐 Open in browser: ${HTML_FILE}\n`);

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const rank = i + 1;
    process.stdout.write(`[${rank}/${candidates.length}] ${cand.name} (Brainner: ${cand.brainnerScore}) … `);

    try {
      const result = await screenCandidate(cand);
      const finalScore = Math.max(1, Math.min(4, result.score || 1));
      counts[finalScore] = (counts[finalScore] || 0) + 1;

      const row = {
        name: result.name ?? cand.name,
        email: cand.email,
        location: cand.location,
        brainnerScore: cand.brainnerScore,
        ourScore: finalScore,
        scoreLabel: result.scoreLabel,
        summary: result.summary,
        topStrength: result.topStrength,
        topConcern: result.topConcern,
        rank
      };
      results.push(row);
      appendCSV(rank, cand, result);
      saveToCache(cache, cand.email, row);
      writeHTML(results, candidates.length, rank, rank < candidates.length);

      const goodCount = counts[3] + counts[4];
      const label = finalScore === 4 ? "✅ Strong Yes" : finalScore === 3 ? (result.scoreLabel === "3M" ? "🟣 Yes-M  " : "✓  Yes   ") : finalScore === 2 ? "✗  No    " : "⛔ Strong No";
      console.log(`${label}  [${finalScore}]  ${result.summary?.slice(0,80)}…`);

      if (goodCount >= STOP_AT_GOOD) {
        console.log(`\n🎯 Reached ${STOP_AT_GOOD} good candidates (score 3+4) — stopping early to save cost.`);
        writeHTML(results, candidates.length, rank, false);
        break;
      }
    } catch(e) {
      console.log(`ERROR: ${e.message}`);
      appendCSV(rank, cand, { score: "", scoreLabel: "Error", summary: e.message, topStrength: "", topConcern: "" });
    }

    if (i < candidates.length - 1) await sleep(300);
  }

  writeHTML(results, candidates.length, candidates.length, false);

  console.log(`\n━━━ Done ━━━`);
  console.log(`  4 (Strong Yes): ${counts[4]}`);
  console.log(`  3 (Yes):        ${counts[3]}`);
  console.log(`  2 (No):         ${counts[2]}`);
  console.log(`  1 (Strong No):  ${counts[1]}`);
  console.log(`\nHTML report: ${HTML_FILE}`);
  console.log(`CSV saved:   ${CSV_FILE}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
