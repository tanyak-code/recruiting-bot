#!/usr/bin/env node
/**
 * Staff SWE Backend (Fable) Screener — Brainner → Claude → HTML/CSV
 * Pulls all Application Review candidates from Brainner for Keith's role,
 * screens with criteria, generates HTML report + CSV.
 *
 * Run: node screen-keith.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const BRAINNER_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ANTHROPIC_KEY = "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";

const JOB_SLUG   = "75705b19-36ea-4975-b0ee-4e77d761fbd1"; // Staff SWE Backend (Keith/Fable)
const TOP_N      = 9999; // All candidates
const HTML_FILE  = path.join(__dirname, "keith-report.html");
const CSV_FILE   = path.join(__dirname, `keith-screened-${new Date().toISOString().slice(0,10)}.csv`);
const CACHE_FILE = path.join(__dirname, "keith-cache.json");

const { criteria: KEITH_CRITERIA } = require("./criteria/keith");

// ─── HTML helpers ──────────────────────────────────────────────────────────────
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
          <span class="location">📍 ${esc(r.location||"—")}</span>
        </div>
        <div class="scores">
          <span class="brainner-score">🧠 ${r.brainnerScore ?? "—"}</span>
          <span class="our-score" style="background:${scoreColor(s)};">${scoreEmoji(s)} ${s} — ${esc(r.scoreLabel)}</span>
        </div>
      </div>
      <div class="card-body">
        ${r.recommendedRole ? `<div class="field"><span class="label">→ Route to</span><span class="value" style="font-weight:600">${esc(r.recommendedRole)}</span></div>` : ""}
        <div class="field"><span class="label">Summary</span><span class="value">${esc(r.summary)}</span></div>
        <div class="field"><span class="label">Top Strength</span><span class="value">${esc(r.topStrength)}</span></div>
        <div class="field"><span class="label">Top Concern</span><span class="value">${esc(r.topConcern)}</span></div>
      </div>
    </div>`).join("");
    return `<section><h2 style="color:${scoreColor(s)};margin:24px 0 12px;">${headings[s]} (${group.length})</h2>${cards}</section>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${refreshMeta}
  <title>Keith · Staff SWE Backend (Fable) Screener</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; background: #f8f9fa; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
    .progress-bar { background: #e0e0e0; border-radius: 6px; height: 8px; margin: 12px 0; }
    .progress-fill { background: #1565c0; height: 8px; border-radius: 6px; }
    .summary-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; }
    .badge { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status.running { background: #fff3cd; color: #856404; }
    .status.done    { background: #d4edda; color: #155724; }
    .card { border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
    .candidate-info { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .rank { font-size: 12px; color: #888; }
    .name { font-weight: 600; font-size: 15px; }
    .location { font-size: 12px; color: #666; }
    .scores { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .brainner-score { font-size: 12px; color: #555; }
    .our-score { color: #fff; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .card-body { display: flex; flex-direction: column; gap: 6px; }
    .field { display: flex; gap: 8px; font-size: 13px; line-height: 1.5; }
    .label { font-weight: 600; min-width: 100px; color: #555; flex-shrink: 0; }
    .value { color: #333; }
  </style>
</head>
<body>
  <h1>Keith · Staff SWE Backend (Fable) Screener</h1>
  <div class="meta">
    ${statusBadge} &nbsp;
    Screened ${done} of ${total} candidates &nbsp;·&nbsp; ${pct}%
    &nbsp;·&nbsp; ✅ ${counts[4]} &nbsp; 🔵 ${counts[3]} &nbsp; 🟡 ${counts[2]} &nbsp; ❌ ${counts[1]}
  </div>
  <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
  ${sections || `<p style="color:#888;margin-top:40px;">Screening in progress…</p>`}
</body>
</html>`;
}

function writeHTML(results, total, done, running) {
  fs.writeFileSync(HTML_FILE, buildHTML(results, total, done, running), "utf8");
}

// ─── Cache ─────────────────────────────────────────────────────────────────────
function loadCache() {
  if (fs.existsSync(CACHE_FILE)) return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  return {};
}
function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ─── CSV ───────────────────────────────────────────────────────────────────────
function initCSV() {
  const headers = ["Rank","Name","Email","Location","Brainner Score","Our Score","Score Label","Recommended Role","Summary","Top Strength","Top Concern"];
  fs.writeFileSync(CSV_FILE, headers.map(h => `"${h}"`).join(",") + "\n");
}
function appendCSV(rank, cand, result) {
  const q = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const row = [rank, result.name||cand.name, cand.email, cand.location||"", cand.brainnerScore, result.score, result.scoreLabel, result.recommendedRole||"", result.summary, result.topStrength, result.topConcern];
  fs.appendFileSync(CSV_FILE, row.map(q).join(",") + "\n");
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────────
function httpsGet(urlPath) {
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
    req.setTimeout(60000, () => req.destroy(new Error("Brainner timeout")));
    req.on("error", reject);
    req.end();
  });
}

function claudePost(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req  = https.request({
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
    if (b.name)     parts.push(`Name: ${b.name}`);
    if (b.label)    parts.push(`Title: ${b.label}`);
    if (b.location) parts.push(`Location: ${typeof b.location === "string" ? b.location : [b.location.city, b.location.region, b.location.countryCode].filter(Boolean).join(", ")}`);
    if (b.summary)  parts.push(`Summary: ${b.summary}`);
  }
  if (rj.work?.length) {
    parts.push("\nWork Experience:");
    for (const w of rj.work) {
      const line = [w.position, w.name, w.startDate, w.endDate ? `– ${w.endDate}` : "– Present"].filter(Boolean).join(" | ");
      parts.push(line);
      if (w.summary)   parts.push(w.summary);
      if (w.highlights?.length) parts.push(w.highlights.map(h => `• ${h}`).join("\n"));
    }
  }
  if (rj.education?.length) {
    parts.push("\nEducation:");
    for (const e of rj.education) {
      parts.push([e.studyType, e.area, e.institution, e.startDate, e.endDate].filter(Boolean).join(" | "));
    }
  }
  if (rj.skills?.length) {
    parts.push("\nSkills: " + rj.skills.map(s => s.name + (s.keywords?.length ? ` (${s.keywords.join(", ")})` : "")).join("; "));
  }
  return parts.join("\n");
}

// ─── Fetch candidates from Brainner ───────────────────────────────────────────
async function fetchCandidates(cachedEmails) {
  // ONE-TIME: screening ALL candidates regardless of Brainner status (Advance, Archive, To Review)
  const candidates = [];
  let page = 1;

  while (true) {
    process.stdout.write(`  Page ${page} (${candidates.length} uncached so far)… `);
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]":  JOB_SLUG,
      "filters[Status][$eq]":     "evaluated", // "To Review" only — not Advance or Archive
      "sort":                     "Score:desc",
      "pagination[page]":         String(page),
      "pagination[pageSize]":     "200",
    }).toString();

    let resp;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        resp = await httpsGet(`/api/candidates?${params}`);
        break;
      } catch (err) {
        if (attempt === 3) throw new Error(`Brainner fetch failed: ${err.message}`);
        console.log(`\n  ⚠️  Attempt ${attempt} failed, retrying in 3s…`);
        await sleep(3000);
      }
    }

    const data = resp?.data || [];
    const total = resp?.meta?.pagination?.total ?? "?";
    console.log(`got ${data.length} (${total} total)`);

    for (const c of data) {
      const a      = c.attributes || {};
      const email  = (a.Email || "").toLowerCase().trim();
      if (!email || cachedEmails.has(email)) continue;
      candidates.push({
        email,
        name:           a.Name || email,
        location:       a.Location || "",
        brainnerScore:  a.Score ?? null,
        brainnerStatus: a.Status || "",
        resume:         resumeJsonToText(a.ResumeJSON) || "",
      });
      if (candidates.length >= TOP_N) break;
    }

    if (candidates.length >= TOP_N || data.length < 200) break;
    page++;
  }

  console.log(`  Screening ${candidates.length} new candidates\n`);
  return candidates;
}

// ─── Screen with Claude ────────────────────────────────────────────────────────
async function screenCandidate(cand) {
  if (!cand.resume || cand.resume.trim().length < 50) {
    return { score: 1, scoreLabel: "Strong No", summary: "No resume content available.", topStrength: "", topConcern: "No resume data" };
  }

  const now = new Date();
  const today = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const prompt = `You are a strict senior technical recruiter screening for a Staff Backend Software Engineer role at a small, product-focused startup. This is a high bar role — most candidates will NOT pass.

TODAY'S DATE: ${today} (year: ${currentYear}, month: ${currentMonth}). This is the authoritative date — use it for ALL tenure and recency calculations.

TENURE CALCULATION RULES (mandatory):
- "Present" or "Current" always means ${currentYear} for year-level calculations
- Example: "2022 – Present" = ${currentYear} − 2022 = ${currentYear - 2022} years. Do not use any other year.
- Round down to full years only. Never use a year before ${currentYear} for "present" roles.
- Do NOT flag future end dates on current roles as a concern — a future end date simply means a contract end or notice given. Never mention end dates in topConcern.

CALIBRATION:
- Score 4: rare — ALL hard requirements met with explicit evidence including staff scope, production cloud ops, incident ownership, product orientation, and ideally agentic engineering
- Score 3: strong candidate missing exactly ONE signal, or staff scope implied not explicit
- Score 2: correct score for candidates who are too junior, too infra-only, FAANG-siloed (especially Amazon-only), lack product orientation, OR under 10 years of SUBSTANTIVE backend engineering
- Score 1: immediate disqualifier present — under 10 years SUBSTANTIVE backend engineering is a HARD GATE = Score 1 (junior web dev / TA / early-career mixed roles don't count); also: frontend/mobile only, data eng / ML eng / pure DevOps, govt/regulated only, 4+ short tenures
- When in doubt, score lower

EXPERIENCE COUNTING RULE (critical): 10+ years means 10+ years of substantive backend engineering. Do NOT count toward this total: junior web dev roles, teaching assistantships, early-career mixed frontend/backend consulting, or short stints under 1 year. A candidate with 6 years at one real company + 3 years of early-career junior work does NOT meet the 10-year bar.

AMAZON NOTE: Amazon as sole or primary employer is a flag — likely siloed. Cap at score 3 unless there is explicit cross-functional TDD ownership or product partnership language. Amazon as one of several employers is fine.

${KEITH_CRITERIA}

CANDIDATE RESUME / PROFILE:
${cand.resume.slice(0, 8000)}

Respond ONLY with a JSON object, no markdown:
{
  "name": "<full name>",
  "score": <1|2|3|4>,
  "scoreLabel": "<Strong No | No | Yes | Strong Yes>",
  "recommendedRole": "<Keith (Python) | Kat (Ruby) | Either — probe language preference in screen>",
  "summary": "<2-3 sentences: cite specific evidence — years of experience, stack, scope level, cloud ops, product orientation>",
  "topStrength": "<single strongest signal with evidence>",
  "topConcern": "<single biggest gap, or empty string if score 4>"
}`;

  const resp = await claudePost({
    model:      "claude-sonnet-4-6",
    max_tokens: 1024,
    messages:   [{ role: "user", content: prompt }],
  });

  const raw = resp?.content?.[0]?.text ?? "{}";
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return { score: 2, scoreLabel: "No", summary: "Parse error", topStrength: "", topConcern: "Parse error" };
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n━━━ Keith · Staff SWE Backend (Fable) Screener ━━━\n");

  const cache        = loadCache();
  const cachedEmails = new Set(Object.keys(cache));
  console.log(`  Loaded cache: ${cachedEmails.size} already screened\n`);

  initCSV();

  const candidates   = await fetchCandidates(cachedEmails);
  const CONCURRENCY  = 5;
  const results      = [];
  const counts       = { 1:0, 2:0, 3:0, 4:0 };
  let done = 0;

  writeHTML([], candidates.length, 0, true);
  console.log(`  HTML report: file://${HTML_FILE}`);
  console.log(`  Running ${CONCURRENCY} concurrent Sonnet calls\n`);

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (cand) => {
      try {
        const result = await screenCandidate(cand);
        const score  = Math.max(1, Math.min(4, result.score || 2));

        const row = {
          name:          result.name || cand.name,
          email:         cand.email,
          location:      cand.location,
          brainnerScore: cand.brainnerScore,
          ourScore:      score,
          scoreLabel:      result.scoreLabel || "No",
          recommendedRole: result.recommendedRole || "",
          summary:         result.summary || "",
          topStrength:     result.topStrength || "",
          topConcern:      result.topConcern || "",
          rank:            0,
        };

        counts[score] = (counts[score] || 0) + 1;
        results.push(row);
        cache[cand.email] = row;
        done++;

        appendCSV(done, cand, result);
        saveCache(cache);

        const emoji = { 4:"✅", 3:"🔵", 2:"🟡", 1:"❌" }[score] || "⚪";
        const tally = `[4:${counts[4]} 3:${counts[3]} 2:${counts[2]} 1:${counts[1]}]`;
        console.log(`[${done}/${candidates.length}] ${emoji} ${score} — ${(result.scoreLabel||"").padEnd(12)} ${tally}  ${row.name}`);
      } catch (e) {
        done++;
        console.log(`[${done}/${candidates.length}] ❌ ERROR: ${e.message}`);
      }
    }));

    // Re-sort and update HTML after each batch
    results.sort((a, b) => b.ourScore - a.ourScore || (b.brainnerScore||0) - (a.brainnerScore||0));
    results.forEach((r, idx) => r.rank = idx + 1);
    writeHTML(results, candidates.length, done, done < candidates.length);
  }

  writeHTML(results, candidates.length, done, false);

  console.log(`\n✅ Done — ${done} screened`);
  console.log(`   ✅ Strong Yes (4): ${counts[4]}`);
  console.log(`   🔵 Yes (3):        ${counts[3]}`);
  console.log(`   🟡 No (2):         ${counts[2]}`);
  console.log(`   ❌ Strong No (1):  ${counts[1]}`);
  console.log(`\n📄 Report: file://${HTML_FILE}`);
  console.log(`📊 CSV:    ${CSV_FILE}\n`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
