#!/usr/bin/env node
/**
 * Re-screen Sr. Manager TPM candidates who are NOT in Brainner "to_review" status
 * and have a Brainner score of 85+.
 *
 * Bypasses the cache — every candidate is screened fresh against the
 * current criteria (criteria/ed-tpm.js). Cache is updated with new results.
 *
 * Run: node rescreen-tpm-not-to-review.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

// ── Config ───────────────────────────────────────────────────────────────────
const BRAINNER_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ANTHROPIC_KEY = "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";
const JOB_SLUG      = "b46b4a19-16f8-4b5c-abfe-dcc42ff90175";
const MIN_SCORE     = 85;
const CACHE_FILE    = path.join(__dirname, "sr-tpm-cache.json");
const HTML_FILE     = path.join(__dirname, "sr-tpm-rescreen-report.html");
const CSV_FILE      = path.join(__dirname, `sr-tpm-rescreen-${new Date().toISOString().slice(0,10)}.csv`);
// ─────────────────────────────────────────────────────────────────────────────

const { criteria: TPM_CRITERIA } = require("./criteria/ed-tpm");

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
          <span class="brainner-status">⚡ ${esc(r.brainnerStatus||"—")}</span>
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
<title>Sr. Manager TPM — Re-screen (non-to_review 85+)</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f0f2f5;color:#1a1a1a}
.header{background:#fff;border-bottom:1px solid #e0e0e0;padding:20px 32px;position:sticky;top:0;z-index:10}
.header-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.title{font-size:20px;font-weight:700;color:#111}.subtitle{font-size:13px;color:#666;margin-top:2px}
.status{font-size:12px;font-weight:600;padding:4px 10px;border-radius:12px}
.status.running{background:#fef9c3;color:#854d0e}.status.done{background:#dcfce7;color:#166534}
.progress-bar-wrap{background:#e5e7eb;border-radius:4px;height:6px;margin-bottom:14px}
.progress-bar{background:#7c3aed;height:6px;border-radius:4px}
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
.brainner-status{font-size:11px;color:#7c3aed;background:#ede9fe;padding:2px 7px;border-radius:8px;font-weight:600}
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
    <div><div class="title">Sr. Manager TPM — Re-screen Pass</div>
    <div class="subtitle">Non-to_review candidates scoring 85+ in Brainner · Updated criteria · ${done}/${total} screened</div></div>
    ${statusBadge}
  </div>
  <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
  <div class="stats">
    <span class="stat stat-total">Total: ${done}/${total}</span>
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
    const req = https.request({ hostname, path: urlPath, method: "GET", headers }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.setTimeout(60000, () => req.destroy(new Error("timeout")));
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
    }, res => {
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

// ── Resume helpers — read previously screened emails from the rescreen CSV ───
function loadRescreenedEmails() {
  if (!fs.existsSync(CSV_FILE)) return new Set();
  try {
    const lines = fs.readFileSync(CSV_FILE, "utf8").split("\n").slice(1); // skip header
    const emails = new Set();
    for (const line of lines) {
      if (!line.trim()) continue;
      // Email is 3rd column (index 2) — naive CSV parse sufficient for emails
      const cols = line.split(",");
      if (cols.length >= 3) {
        const email = cols[2].replace(/^"|"$/g, "").toLowerCase().trim();
        if (email) emails.add(email);
      }
    }
    return emails;
  } catch { return new Set(); }
}

// ── CSV helpers ───────────────────────────────────────────────────────────────
function q(v) { return `"${String(v ?? "").replace(/"/g, '""')}"`; }

function initCSV(resuming) {
  if (resuming) return; // Don't overwrite — append to existing
  const headers = ["Rank","Name","Email","Location","Brainner Score","Brainner Status","Our Score","Score Label","Summary","Top Strength","Top Concern"];
  fs.writeFileSync(CSV_FILE, headers.map(q).join(",") + "\n");
}

function appendCSV(rank, cand, result) {
  const row = [
    rank,
    result.name ?? cand.name,
    cand.email,
    cand.location ?? "",
    cand.brainnerScore ?? "",
    cand.brainnerStatus ?? "",
    result.score ?? "",
    result.scoreLabel ?? "",
    result.summary ?? "",
    result.topStrength ?? "",
    result.topConcern ?? ""
  ];
  fs.appendFileSync(CSV_FILE, row.map(q).join(",") + "\n");
}

// ── Fetch all non-to_review candidates with score 85+ ────────────────────────
async function fetchCandidates() {
  console.log("Fetching ALL Brainner candidates (all statuses) for Sr. Manager TPM…");

  const pageSize = 200;
  let page = 1;
  let grandTotal = null;
  const all = [];

  while (true) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": JOB_SLUG,
      "pagination[pageSize]": String(pageSize),
      "pagination[page]":     String(page),
    });

    const res = await httpsGet("admin.brainner.ai", `/api/candidates?${params}`, {
      "Authorization": `Bearer ${BRAINNER_KEY}`
    });

    if (res.status !== 200) throw new Error(`Brainner API error: ${res.status} — ${JSON.stringify(res.body)}`);

    const data = res.body.data ?? [];
    if (grandTotal === null) grandTotal = res.body.meta?.pagination?.total ?? "?";

    all.push(...data);
    process.stdout.write(`\r  Page ${page}: ${all.length}/${grandTotal} fetched…`);

    if (all.length >= grandTotal || data.length < pageSize) break;
    page++;
    await sleep(150);
  }

  console.log("\n");

  // Filter: NOT "evaluated" (to_review) AND score >= 85
  const filtered = all
    .filter(c => {
      const status = c.attributes?.Status ?? "";
      const score  = c.attributes?.Score  ?? 0;
      return status !== "evaluated" && score >= MIN_SCORE;
    })
    .sort((a, b) => (b.attributes?.Score || 0) - (a.attributes?.Score || 0))
    .map(c => ({
      id:             c.id,
      name:           c.attributes?.Name ?? "Unknown",
      email:          (c.attributes?.Email || "").toLowerCase().trim(),
      location:       c.attributes?.Location ?? "",
      brainnerScore:  c.attributes?.Score ?? 0,
      brainnerStatus: c.attributes?.Status ?? "unknown",
      resume:         resumeJsonToText(c.attributes?.ResumeJSON)
                   || resumeJsonToText(c.attributes?.ResumeParsed)
                   || resumeJsonToText(c.attributes?.Profile)
                   || "",
    }));

  console.log(`  Total Brainner:               ${all.length}`);
  console.log(`  Non-to_review & score ${MIN_SCORE}+:   ${filtered.length}`);

  // Status breakdown
  const byStatus = {};
  filtered.forEach(c => { byStatus[c.brainnerStatus] = (byStatus[c.brainnerStatus]||0)+1; });
  console.log("\n  Status breakdown of candidates to screen:");
  Object.entries(byStatus).sort((a,b) => b[1]-a[1]).forEach(([s,n]) => {
    console.log(`    ${s.padEnd(25)} ${n}`);
  });

  console.log();
  return filtered;
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
  console.log("━━━ Sr. Manager TPM — Re-screen (non-to_review, 85+) ━━━\n");

  const cache = loadCache();
  const alreadyRescreened = loadRescreenedEmails();
  const resuming = alreadyRescreened.size > 0;

  if (resuming) {
    console.log(`  ⏩ Resuming — ${alreadyRescreened.size} already done in this rescreen run, skipping them\n`);
  } else {
    console.log(`  Cache loaded: ${Object.keys(cache).length} previously screened (will be overwritten for re-screened candidates)\n`);
  }

  initCSV(resuming);

  const allCandidates = await fetchCandidates();
  // Skip emails already screened in this run
  const candidates = allCandidates.filter(c => !alreadyRescreened.has(c.email));
  const total = allCandidates.length;
  const doneOffset = alreadyRescreened.size;

  console.log(`  Total qualifying: ${total}  |  Already done: ${doneOffset}  |  Remaining: ${candidates.length}\n`);

  const counts = { 1:0, 2:0, 3:0, 4:0 };
  const results = [];

  writeHTML(results, total, doneOffset, true);
  console.log(`🌐 Open in browser: ${HTML_FILE}\n`);

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    const rank = doneOffset + i + 1;
    process.stdout.write(`[${rank}/${total}] ${cand.name} (🧠${cand.brainnerScore} · ${cand.brainnerStatus}) … `);

    try {
      const result = await screenCandidate(cand);
      const finalScore = Math.max(1, Math.min(4, result.score || 1));
      counts[finalScore] = (counts[finalScore] || 0) + 1;

      const row = {
        name:           result.name ?? cand.name,
        email:          cand.email,
        location:       cand.location,
        brainnerScore:  cand.brainnerScore,
        brainnerStatus: cand.brainnerStatus,
        ourScore:       finalScore,
        scoreLabel:     result.scoreLabel,
        summary:        result.summary,
        topStrength:    result.topStrength,
        topConcern:     result.topConcern,
        rank,
      };
      results.push(row);
      appendCSV(rank, cand, result);
      saveToCache(cache, cand.email, row);
      writeHTML(results, total, rank, rank < total || doneOffset + i + 1 < total);

      const label = finalScore === 4 ? "✅ Strong Yes"
                  : finalScore === 3 ? (result.scoreLabel === "3M" ? "🟣 Yes-M  " : "🔵 Yes    ")
                  : finalScore === 2 ? "🟡 No     "
                  :                   "❌ Strong No";
      console.log(`${label}  ${result.summary?.slice(0,80)}…`);
    } catch(e) {
      console.log(`ERROR: ${e.message}`);
      appendCSV(rank, cand, { score: "", scoreLabel: "Error", summary: e.message, topStrength: "", topConcern: "" });
    }

    if (i < candidates.length - 1) await sleep(300);
  }

  writeHTML(results, total, doneOffset + results.length, false);

  console.log(`\n━━━ Done ━━━`);
  console.log(`  4 (Strong Yes):  ${counts[4]}`);
  console.log(`  3 (Yes / 3M):    ${counts[3]}`);
  console.log(`  2 (No):          ${counts[2]}`);
  console.log(`  1 (Strong No):   ${counts[1]}`);
  console.log(`\nHTML report: ${HTML_FILE}`);
  console.log(`CSV saved:   ${CSV_FILE}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
