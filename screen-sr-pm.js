#!/usr/bin/env node
/**
 * Senior Product Manager Screener — Brainner → Claude → CSV
 * Pulls top 50 candidates from Brainner (Application Review, scored, sorted by Score desc),
 * screens with Jordan's calibrated criteria, exports sorted CSV.
 *
 * Run: node screen-sr-pm.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────────────────────────
const BRAINNER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ANTHROPIC_KEY = "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";
const JOB_SLUG   = "41ff6b62-c6b9-4edb-b9f3-5a8b52e22ca4"; // New req (same role, Jordan)
const TOP_N      = 9999; // Get all uncached candidates (clearing parse errors)
const STOP_AT_4S = 9999; // No early stop — run to completion
const HTML_FILE  = path.join(__dirname, "sr-pm-report.html");
const CSV_FILE   = path.join(__dirname, `sr-pm-screened-${new Date().toISOString().slice(0,10)}.csv`);
const CACHE_FILE = path.join(__dirname, "sr-pm-cache.json");
// ────────────────────────────────────────────────────────────────────────────


const { criteria: JORDAN_CRITERIA } = require('./criteria/jordan');

// ── Resume JSON → text ────────────────────────────────────────────────────────
function resumeJsonToText(rj) {
  if (!rj) return "";
  if (typeof rj === "string") return rj;
  try {
    const parts = [];
    if (rj.basics) {
      const b = rj.basics;
      if (b.name) parts.push(`Name: ${b.name}`);
      if (b.label) parts.push(`Title: ${b.label}`);
      if (b.summary) parts.push(`Summary: ${b.summary}`);
    }
    if (rj.work?.length) {
      parts.push("\nExperience:");
      rj.work.forEach(w => {
        parts.push(`${w.position || ""} at ${w.name || w.company || ""} (${w.startDate || ""}–${w.endDate || "present"})`);
        if (w.summary) parts.push(`  ${w.summary}`);
        if (w.highlights?.length) w.highlights.forEach(h => parts.push(`  - ${h}`));
      });
    }
    if (rj.education?.length) {
      parts.push("\nEducation:");
      rj.education.forEach(e => parts.push(`${e.studyType || ""} ${e.area || ""} at ${e.institution || ""}`));
    }
    if (rj.skills?.length) {
      parts.push("\nSkills: " + rj.skills.map(s => s.name || s).join(", "));
    }
    return parts.join("\n");
  } catch { return ""; }
}

// ── HTML report ───────────────────────────────────────────────────────────────
function esc(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function scoreColor(s) { return { 4:"#1a7f4b", 3:"#1565c0", 2:"#b45309", 1:"#c0392b" }[s] || "#555"; }
function scoreBg(s)    { return { 4:"#d4edda", 3:"#dbeafe", 2:"#fef3c7", 1:"#fde8e8" }[s] || "#f5f5f5"; }
function scoreBorder(s){ return { 4:"#1a7f4b", 3:"#1565c0", 2:"#d97706", 1:"#c0392b" }[s] || "#ccc"; }
function scoreEmoji(s) { return { 4:"✅", 3:"🔵", 2:"🟡", 1:"❌" }[s] || "⚪"; }

function buildHTML(results, total, done, running) {
  const counts = { 4:0, 3:0, 2:0, 1:0 };
  results.forEach(r => { counts[r.ourScore] = (counts[r.ourScore]||0)+1; });
  const mlScaleCount  = results.filter(r => r.ourScore === 3 && r.scoreLabel === "Yes ML-Scale").length;
  const b2bCraftCount = results.filter(r => r.ourScore === 3 && r.scoreLabel === "Yes B2B-Craft").length;
  const pinkCount     = mlScaleCount + b2bCraftCount;
  const pct = total > 0 ? Math.round((done/total)*100) : 0;
  const refreshMeta = running ? `<meta http-equiv="refresh" content="4">` : "";
  const statusBadge = running
    ? `<span style="background:#fef9c3;color:#92400e;padding:4px 10px;border-radius:12px;font-size:12px;">⏳ Running — ${done}/${total} (${pct}%)</span>`
    : `<span style="background:#d4edda;color:#155724;padding:4px 10px;border-radius:12px;font-size:12px;">✅ Complete — ${done} screened</span>`;

  const makeCards = (score) => results
    .filter(r => r.ourScore === score)
    .sort((a,b) => b.brainnerScore - a.brainnerScore)
    .map(r => {
      const isPink    = r.scoreLabel === "Yes ML-Scale" || r.scoreLabel === "Yes B2B-Craft";
      const borderCol = isPink ? "#EF008C" : scoreBorder(score);
      const bgCol     = isPink ? "#fde8f8" : scoreBg(score);
      const badgeCol  = isPink ? "#EF008C" : scoreColor(score);
      const emoji     = isPink ? "🩷" : scoreEmoji(score);
      return `
    <div style="border-left:4px solid ${borderCol};background:${bgCol};border-radius:6px;padding:14px 16px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <div><strong>${esc(r.name)}</strong> <span style="color:#888;font-size:12px">· Brainner: ${r.brainnerScore}</span></div>
        <span style="background:${badgeCol};color:#fff;border-radius:10px;padding:2px 10px;font-size:12px;font-weight:600">${emoji} ${score} — ${esc(r.scoreLabel)}</span>
      </div>
      <div style="font-size:13px;color:#333;margin-bottom:6px">${esc(r.summary)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
        <div><span style="color:#1a7f4b;font-weight:600">💪 Strength:</span> ${esc(r.topStrength)}</div>
        <div><span style="color:#c0392b;font-weight:600">⚠️ Concern:</span> ${esc(r.topConcern)}</div>
      </div>
    </div>`;
    }).join("");

  const sections = [4,3,2,1].map(s => {
    const grp = results.filter(r => r.ourScore === s);
    if (!grp.length) return "";
    const mlNote = s === 3 && pinkCount > 0
      ? ` &nbsp;<span style="color:#EF008C;font-size:11px;font-weight:600">· 🩷 ${pinkCount} flagged (${mlScaleCount} ML-Scale, ${b2bCraftCount} B2B-Craft) — review before advancing</span>`
      : "";
    const headings = { 4:"✅ Strong Yes", 3:"🔵 Yes — Probe on Screen" + mlNote, 2:"🟡 No", 1:"❌ Strong No" };
    return `<div style="font-size:13px;font-weight:700;color:${scoreColor(s)};margin:18px 0 8px;text-transform:uppercase;letter-spacing:.5px">${headings[s]} (${grp.length})</div>${makeCards(s)}`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8">${refreshMeta}
<title>Sr PM — Scribd</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f2f5;margin:0;padding:0}
.header{background:#fff;padding:16px 24px;border-bottom:1px solid #e0e0e0;position:sticky;top:0;z-index:10}
.stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}
.stat{padding:4px 12px;border-radius:12px;font-size:12px;font-weight:600}
.content{max-width:900px;margin:0 auto;padding:20px 16px}</style></head><body>
<div class="header">
  <div style="display:flex;justify-content:space-between;align-items:center">
    <div><strong style="font-size:16px">Senior PM — Scribd</strong><br>
    <span style="font-size:12px;color:#888">Jordan's calibrated screening · Top ${total} by Brainner score · ${done}/${total} screened</span></div>
    ${statusBadge}
  </div>
  <div style="background:#e5e7eb;border-radius:4px;height:6px;margin-top:10px"><div style="background:#1565c0;height:6px;border-radius:4px;width:${pct}%"></div></div>
  <div class="stats">
    <span class="stat" style="background:#f3f4f6">Total: ${done}</span>
    <span class="stat" style="background:#d4edda;color:#1a7f4b">✅ Strong Yes (4): ${counts[4]}</span>
    <span class="stat" style="background:#dbeafe;color:#1565c0">🔵 Yes (3): ${counts[3]}</span>
    ${mlScaleCount > 0 ? `<span class="stat" style="background:#fde8f8;color:#EF008C">🩷 ML-Scale review: ${mlScaleCount}</span>` : ""}
    <span class="stat" style="background:#fef3c7;color:#b45309">🟡 No (2): ${counts[2]}</span>
    <span class="stat" style="background:#fde8e8;color:#c0392b">❌ Strong No (1): ${counts[1]}</span>
  </div>
</div>
<div class="content">${sections}
${running && done < total ? `<div style="text-align:center;color:#999;padding:20px;font-size:13px">⏳ Screening in progress… ${total-done} remaining. Page refreshes every 4s.</div>` : ""}
</div></body></html>`;
}

function writeHTML(results, total, done, running) {
  fs.writeFileSync(HTML_FILE, buildHTML(results, total, done, running), "utf8");
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function httpsGet(hostname, path, headers, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: "GET", headers }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
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

  console.log(`Fetching all candidates from Brainner for Sr PM role…`);

  // Fetch pages until we have TOP_N uncached candidates — stop early, don't pull all 3800+
  const candidates = [];

  while (true) {
    process.stdout.write(`  Page ${page} (${candidates.length}/${TOP_N} uncached so far)… `);
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]":  JOB_SLUG,
      "filters[Status][$eq]":     "evaluated",   // Application Review only
      "sort":                     "Score:desc",  // highest score first, server-side
      "pagination[pageSize]":     String(pageSize),
      "pagination[page]":         String(page),
    });

    let res;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        res = await httpsGet("admin.brainner.ai", `/api/candidates?${params}`, {
          "Authorization": `Bearer ${BRAINNER_KEY}`
        });
        break;
      } catch (err) {
        if (attempt === 3) throw new Error(`Brainner fetch failed after 3 attempts on page ${page}: ${err.message}`);
        console.log(`\n  ⚠️  Attempt ${attempt} failed (${err.message}), retrying in 3s…`);
        await new Promise(r => setTimeout(r, 3000));
        process.stdout.write(`  Page ${page} (retry ${attempt + 1})… `);
      }
    }

    if (res.status !== 200) throw new Error(`Brainner API error: ${res.status} — ${JSON.stringify(res.body)}`);

    const data = res.body.data ?? [];
    const total = res.body.meta?.pagination?.total ?? "?";
    console.log(`got ${data.length} evaluated (${total} total evaluated)`);

    for (const c of data) {
      const email = (c.attributes.Email || "").toLowerCase();
      if (!email || cachedEmails.has(email)) continue;
      candidates.push({
        id:            c.id,
        name:          c.attributes.Name,
        email,
        location:      c.attributes.Location,
        brainnerScore: c.attributes.Score,
        resume:        resumeJsonToText(c.attributes.ResumeJSON) || resumeJsonToText(c.attributes.ResumeParsed) || resumeJsonToText(c.attributes.Profile) || ""
      });
      if (candidates.length >= TOP_N) break;
    }

    if (candidates.length >= TOP_N || data.length < pageSize) break;
    page++;
  }

  console.log(`  Screening ${candidates.length} new candidates (sorted highest Brainner score first)\n`);
  return candidates;
}

// ── Screen one candidate ──────────────────────────────────────────────────────
async function screenCandidate(cand) {
  if (!cand.resume || cand.resume.trim().length < 50) {
    return { score: 1, scoreLabel: "Strong No", summary: "No resume content available.", topStrength: null, topConcern: "No resume data" };
  }

  const now = new Date();
  const today = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const prompt = `TODAY'S DATE: ${today}. Use this when evaluating tenure and recency only. IMPORTANT: Do NOT flag future end dates on current roles as a concern — a future end date simply means a contract end, upcoming layoff, or the candidate has given notice. This is normal and often a positive signal (candidate available soon). Never mention end dates in topConcern.

You are a strict senior technical recruiter screening for a Senior Product Manager role. Apply the criteria precisely — do not give benefit of the doubt.

${JORDAN_CRITERIA}

CANDIDATE RESUME / PROFILE:
${cand.resume.slice(0, 8000)}

Respond ONLY with a JSON object, no markdown, no explanation:
{
  "name": "<full name, or 'Candidate' if not found>",
  "currentRole": "<most recent title + company, max 8 words>",
  "score": <1|2|3|4>,
  "scoreLabel": "<Strong No|No|Yes|Yes ML-Scale|Yes B2B-Craft|Strong Yes>",
  "summary": "<2-3 sentences: key strengths, gaps, bottom line>",
  "topStrength": "<single most compelling thing about this candidate>",
  "topConcern": "<biggest gap or risk, or null if score is 4>"
}`;

  const res = await httpsPost("api.anthropic.com", "/v1/messages", {
    "x-api-key": ANTHROPIC_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  }, {
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }]
  });

  if (res.status !== 200) throw new Error(`Claude API error: ${res.status}`);

  const raw = res.body.content?.[0]?.text ?? "{}";
  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    // Extract first JSON object even if there's surrounding text
    const match = cleaned.match(/\{[\s\S]*\}/);
    return JSON.parse(match ? match[0] : cleaned);
  } catch {
    console.error(`  ⚠️  Parse error — raw response: ${raw.slice(0, 200)}`);
    return { score: 2, scoreLabel: "No", summary: "Parse error.", topStrength: null, topConcern: "Parse error" };
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("━━━ Sr PM Screener — Jordan / Scribd ━━━\n");
  console.log(`  Goal: ${STOP_AT_4S} Strong Yes (score 4) candidates\n`);

  const cache = loadCache();
  const cachedEmails = new Set(Object.keys(cache));
  console.log(`  Loaded cache: ${cachedEmails.size} already screened\n`);

  initCSV();

  const candidates = await fetchCandidates(cachedEmails);
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const results = [];
  const CONCURRENCY = 10;
  let done = 0;
  let stopped = false;

  writeHTML([], candidates.length, 0, true);
  console.log(`\n🌐 Open in browser: ${HTML_FILE}\n`);
  console.log(`  Running ${CONCURRENCY} concurrent Claude calls\n`);

  // Process in parallel batches of CONCURRENCY
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    if (stopped) break;
    const batch = candidates.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (cand) => {
      try {
        const result = await screenCandidate(cand);
        const finalScore = Math.max(1, Math.min(4, result.score || 2));

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
          rank: 0 // assigned after sort
        };

        // Serialize writes to avoid race conditions
        counts[finalScore] = (counts[finalScore] || 0) + 1;
        results.push(row);
        appendCSV(done + 1, cand, result);
        saveToCache(cache, cand.email, row);
        done++;

        const tally = `[4:${counts[4]} 3:${counts[3]} 2:${counts[2]} 1:${counts[1]}]`;
        const label = finalScore === 4 ? "✅ Strong Yes" : finalScore === 3 ? "🔵 Yes      " : finalScore === 2 ? "🟡 No       " : "❌ Strong No";
        console.log(`[${done}/${candidates.length}] ${label}  ${tally}  ${cand.name}`);
      } catch(e) {
        done++;
        console.log(`[${done}/${candidates.length}] ERROR: ${e.message} — ${cand.name}`);
      }
    }));

    // Re-rank and update HTML after each batch
    results.sort((a, b) => b.ourScore - a.ourScore || (b.brainnerScore||0) - (a.brainnerScore||0));
    results.forEach((r, idx) => r.rank = idx + 1);
    writeHTML(results, candidates.length, done, done < candidates.length);

    if (counts[4] >= STOP_AT_4S) {
      console.log(`\n🎯 Done — ${counts[4]} Strong Yes candidates found.`);
      stopped = true;
    }
  }

  const score4s = results.filter(r => r.ourScore === 4);

  console.log(`\n════════════════════════════════════════`);
  console.log(`  SR PM — RUN SUMMARY`);
  console.log(`════════════════════════════════════════`);
  console.log(`  Candidates screened: ${results.length}`);
  console.log(`  Score 4 (Strong Yes): ${counts[4]}`);
  console.log(`  Score 3 (Yes):        ${counts[3]}`);
  console.log(`  Score 2 (No):         ${counts[2]}`);
  console.log(`  Score 1 (Strong No):  ${counts[1]}`);
  console.log(`\n  Strong Yes candidates:`);
  score4s.forEach((r, i) => console.log(`    ${i+1}. ${r.name} (Brainner: ${r.brainnerScore})`));
  console.log(`════════════════════════════════════════`);
  console.log(`\n✅ HTML:  ${HTML_FILE}`);
  console.log(`✅ CSV:   ${CSV_FILE}`);
}

main().catch(e => { console.error(e); process.exit(1); });
