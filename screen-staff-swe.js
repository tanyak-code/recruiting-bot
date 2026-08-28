#!/usr/bin/env node
/**
 * Staff SWE Screener — Brainner → Claude → CSV
 * Pulls top 100 candidates from Brainner, screens with Mitch's criteria,
 * applies west coast cap, exports sorted CSV.
 *
 * Run: node screen-staff-swe.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ── Config ─────────────────────────────────────────────────────────────────
const BRAINNER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ANTHROPIC_KEY = "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";
const JOB_SLUG    = "3123535d-a45c-43e6-8f44-7ae37f8df0f4";
const TOP_N       = 9999; // ALL To Review candidates
const HTML_FILE   = path.join(__dirname, "staff-swe-report.html");
const CSV_FILE    = path.join(__dirname, `staff-swe-screened-${new Date().toISOString().slice(0,10)}.csv`);
const CACHE_FILE  = path.join(__dirname, "staff-swe-cache.json");
// ───────────────────────────────────────────────────────────────────────────

const { criteria: MITCH_CRITERIA } = require("./criteria/mitch");


// ── HTML report helpers ───────────────────────────────────────────────────────
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
          <span class="location">📍 ${esc(r.location||"—")}${r.westCoast ? " ⚠️WC" : ""}</span>
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
<title>Staff SWE — AI & Developer Tooling — Scribd</title>
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
@media(max-width:600px){.two-col{grid-template-columns:1fr}.card-header{flex-direction:column}}
</style></head><body>
<div class="header">
  <div class="header-top">
    <div><div class="title">Staff SWE — AI & Developer Tooling — Scribd</div>
    <div class="subtitle">Mitch's calibrated screening · Top ${total} by Brainner score · ${done}/${total} screened</div></div>
    ${statusBadge}
  </div>
  <div class="progress-bar-wrap"><div class="progress-bar" style="width:${pct}%"></div></div>
  <div class="stats">
    <span class="stat stat-total">Total: ${done}</span>
    <span class="stat stat-4">✅ ${counts[4]}</span>
    <span class="stat stat-3">🔵 ${counts[3]}</span>
    <span class="stat stat-2">🟡 ${counts[2]}</span>
    <span class="stat stat-1">❌ ${counts[1]}</span>
  </div>
</div>
<div class="content">${sections || '<div style="text-align:center;padding:60px;color:#9ca3af">Screening in progress…</div>'}</div>
</body></html>`;
}

function writeHTML(results, total, done, running) {
  const sorted = [...results].sort((a,b) => b.ourScore - a.ourScore || b.brainnerScore - a.brainnerScore);
  sorted.forEach((r,i) => r.rank = i+1);
  fs.writeFileSync(HTML_FILE, buildHTML(sorted, total, done, running), "utf8");
}

function loadCache() {
  if (!fs.existsSync(CACHE_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch { return {}; }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
}

// West coast / Pacific time zone detection
const WEST_COAST_STATES = new Set([
  "california", "ca", "oregon", "or", "washington", "wa",
  "alaska", "ak", "hawaii", "hi", "nevada", "nv"
]);
const WEST_COAST_CITIES = [
  "san francisco", "los angeles", "seattle", "portland", "san diego",
  "sacramento", "san jose", "irvine", "santa barbara", "huntington beach",
  "fountain valley", "milpitas", "bellevue", "kirkland", "redmond", "tacoma",
  "las vegas", "reno", "honolulu", "anchorage", "silicon valley", "bay area",
  "east bay", "oakland", "berkeley", "pasadena", "long beach", "anaheim",
  "riverside", "fresno", "bakersfield", "stockton", "modesto", "sunnyvale",
  "santa clara", "mountain view", "palo alto", "menlo park", "san mateo",
  "burlingame", "fremont", "hayward", "concord", "vallejo", "santa rosa",
  "chico", "olympia", "spokane", "vancouver, wa", "gresham", "hillsboro",
  "beaverton", "medford", "eugene", "salem"
];

function isWestCoast(location) {
  if (!location) return false;
  const loc = location.toLowerCase();
  // Check state abbreviations and full names
  for (const state of WEST_COAST_STATES) {
    // Match ", CA" or ", California" etc.
    if (new RegExp(`\\b${state}\\b`).test(loc)) {
      // Extra check: "Washington" could mean DC — distinguish
      if (state === "washington" || state === "wa") {
        if (/washington,?\s*(state|wa|us|united states)/i.test(location) ||
            /\b(seattle|tacoma|spokane|bellevue|redmond|kirkland|olympia|renton|kent|federal way|everett)\b/i.test(location)) {
          return true;
        }
        if (/washington,?\s*d\.?c\.?/i.test(location) || /district of columbia/i.test(location)) {
          return false; // Washington DC = Eastern
        }
        // If just "Washington" with no DC context, check for WA cities
        if (/\bwa\b/i.test(location) && !/\bwash\.?\s*dc\b/i.test(location)) return true;
        continue;
      }
      return true;
    }
  }
  // Check city names
  for (const city of WEST_COAST_CITIES) {
    if (loc.includes(city)) return true;
  }
  return false;
}

function extractLocation(profile) {
  if (!profile) return "";
  const vals = Object.values(profile);
  // The 3rd field (index 2) is typically Location
  if (vals.length >= 3 && vals[2]?.result) {
    const loc = vals[2].result;
    // Validate it looks like a location (not a role/company name)
    if (/,/.test(loc) || /\b(city|state|usa|us|united states|canada|uk|australia)\b/i.test(loc)) {
      return loc;
    }
  }
  // Fallback: look for any value that looks like a location
  for (const v of vals) {
    const r = v?.result || "";
    if (/,/.test(r) && /\b(CA|OR|WA|NY|TX|IL|FL|CO|AZ|GA|NC|VA|MA|PA|OH|MI|MN|MO|TN|IN|WI|MD|AK|HI|NV|UT|NM|ID|MT|WY|ND|SD|NE|KS|OK|AR|LA|MS|AL|SC|KY|WV|DE|RI|CT|NH|VT|ME|United States|Canada|Australia|Germany|India|Mexico|Brazil|Singapore|Poland|Israel|Japan|China|Ireland|Colombia|Argentina|Chile|Romania|Ukraine)\b/i.test(r)) {
      return r;
    }
  }
  return vals.map(v => v?.result).filter(Boolean).join(", ");
}

// ── HTTP helpers ────────────────────────────────────────────────────────────
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

function httpsPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const req = https.request({
      hostname, path, method: "POST",
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
    if (b.location) parts.push(`Location: ${typeof b.location === 'string' ? b.location : [b.location.city, b.location.region, b.location.countryCode].filter(Boolean).join(', ')}`);
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

async function fetchBrainnerCandidates() {
  const all = [];
  let page = 1;
  while (true) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": JOB_SLUG,
      "filters[Status][$eq]": "evaluated",
      "sort": "Score:desc",
      "fields[0]": "Name",
      "fields[1]": "Email",
      "fields[2]": "Score",
      "fields[3]": "Status",
      "fields[4]": "Profile",
      "fields[5]": "ResumeJSON",
      "fields[6]": "Location",
      "pagination[page]": String(page),
      "pagination[pageSize]": "200",
    });
    const res = await httpsGet(
      "admin.brainner.ai",
      `/api/candidates?${params}`,
      { Authorization: `Bearer ${BRAINNER_KEY}`, Accept: "application/json" }
    );
    if (res.status !== 200) throw new Error(`Brainner API error: ${res.status} ${JSON.stringify(res.body).slice(0,200)}`);
    const data = res.body.data || [];
    all.push(...data);
    const meta = res.body.meta?.pagination;
    if (!meta || page >= meta.pageCount) break;
    page++;
  }
  return all;
}

async function screenWithClaude(name, resumeText, location, westCoast) {
  const westCoastNote = westCoast
    ? `\n\nIMPORTANT LOCATION NOTE: This candidate is on the WEST COAST (${location}). The hiring manager prefers Central or Eastern Time Zone. Per screening policy, this candidate's maximum score is 3 regardless of other qualifications. You must still score honestly based on skills (1–4), but note in topConcern: "⚠️ WEST COAST FLAG: Candidate is in ${location} (Pacific Time). HM preference is Central/Eastern TZ. Max score capped at 3."`
    : "";

  const now = new Date();
  const today = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
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

AWS + TERRAFORM: Both must be explicitly mentioned. Do not assume AWS if only "cloud" is mentioned. Do not assume Terraform if only "IaC" is mentioned.

KUBERNETES: Must be explicitly mentioned. Docker alone does not qualify.

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
      max_tokens: 600,
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

function buildCSV(rows) {
  const headers = [
    "Rank", "Name", "Email", "Location", "West Coast",
    "Brainner Score", "Our Score", "Score Label",
    "Summary", "Top Strength", "Top Concern", "Screened"
  ];
  const q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const lines = [headers.map(q).join(",")];
  for (const r of rows) {
    lines.push([
      r.rank, r.name, r.email, r.location,
      r.westCoast ? "⚠️ West Coast" : "",
      r.brainnerScore, r.ourScore, r.scoreLabel,
      r.summary, r.topStrength, r.topConcern, today
    ].map(q).join(","));
  }
  return lines.join("\n");
}

async function main() {
  const cache = loadCache();
  const cachedEmails = new Set(Object.keys(cache).map(e => e.toLowerCase().trim()));

  console.log("📥 Fetching candidates from Brainner...");
  const raw = await fetchBrainnerCandidates();
  console.log(`   Found ${raw.length} To Review candidates`);

  // Already sorted by Brainner score desc from API; filter cache; take top N
  const toScreen = raw
    .filter(c => {
      const email = (c.attributes.Email || "").toLowerCase().trim();
      return !cachedEmails.has(email);
    })
    .slice(0, TOP_N);
  console.log(`   ${raw.length - toScreen.length} already cached, screening ${toScreen.length} new`);

  const sorted = toScreen;

  const results = [];
  const total = sorted.length;

  writeHTML(results, total, 0, true);
  console.log(`\n🌐 Open in browser: ${HTML_FILE}\n`);

  for (let i = 0; i < sorted.length; i++) {
    const c = sorted[i];
    const a = c.attributes;
    const name = a.Name || `Candidate ${c.id}`;
    const email = (a.Email || "").toLowerCase().trim();
    const location = a.Location || extractLocation(a.Profile);
    const westCoast = isWestCoast(location);
    const resumeText = resumeJsonToText(a.ResumeJSON);

    process.stdout.write(`   [${i+1}/${total}] Screening: ${name.padEnd(35)} ${westCoast ? "⚠️ WC" : "    "}`);

    let result;
    try {
      result = await screenWithClaude(name, resumeText, location, westCoast);
    } catch (e) {
      result = { score: 1, scoreLabel: "Strong No", summary: `Error: ${e.message}`, topStrength: "", topConcern: "API error" };
    }

    let finalScore = result.score || 1;
    if (westCoast && finalScore > 3) {
      finalScore = 3;
      result.scoreLabel = "Yes";
      result.topConcern = (result.topConcern || "") +
        ` ⚠️ WEST COAST FLAG: Candidate in ${location} (Pacific TZ). HM preference is Central/Eastern. Score capped from 4 → 3.`;
    }
    const wcTag = westCoast ? " ⚠️WC" : "";
    const capTag = (westCoast && (result.score||1) > 3) ? " [capped 4→3]" : "";
    console.log(`→ ${finalScore} (${result.scoreLabel})${wcTag}${capTag}`);

    const row = {
      name,
      email,
      location,
      westCoast,
      brainnerScore: a.Score || 0,
      ourScore: finalScore,
      scoreLabel: result.scoreLabel || (finalScore === 4 ? "Strong Yes" : finalScore === 3 ? "Yes" : finalScore === 2 ? "No" : "Strong No"),
      summary: result.summary || "",
      topStrength: result.topStrength || "",
      topConcern: result.topConcern || "",
    };

    results.push(row);

    // Save to cache
    if (email) {
      cache[email] = { name, ourScore: finalScore, scoreLabel: row.scoreLabel, brainnerScore: row.brainnerScore, location };
      saveCache(cache);
    }

    writeHTML(results, total, i + 1, i + 1 < total);

    if (i < sorted.length - 1) await sleep(300);
  }

  writeHTML(results, total, total, false);

  console.log("\n\n📊 Score breakdown:");
  [4, 3, 2, 1].forEach(s => {
    const count = results.filter(r => r.ourScore === s).length;
    const wc = results.filter(r => r.ourScore === s && r.westCoast).length;
    console.log(`   ${s}: ${count} candidates${wc ? ` (${wc} west coast)` : ""}`);
  });
  const wcTotal = results.filter(r => r.westCoast).length;
  console.log(`\n   ⚠️  West coast flagged: ${wcTotal}`);

  results.sort((a, b) => b.ourScore - a.ourScore || b.brainnerScore - a.brainnerScore);
  results.forEach((r, i) => r.rank = i + 1);

  const csv = buildCSV(results);
  fs.writeFileSync(CSV_FILE, csv, "utf8");
  console.log(`\n✅ HTML: ${HTML_FILE}`);
  console.log(`✅ CSV:  ${CSV_FILE}`);
  console.log(`\nTop 10:`);
  results.slice(0, 10).forEach(r => {
    const wc = r.westCoast ? " ⚠️WC" : "";
    console.log(`   ${r.rank}. [${r.ourScore}] ${r.name} — ${r.location}${wc}`);
  });
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
