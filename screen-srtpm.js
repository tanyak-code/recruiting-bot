#!/usr/bin/env node
/**
 * Sr. TPM Screener (Ed) — Brainner → Claude → HTML/CSV
 * ⚠️  DIFFERENT from screen-sr-tpm.js which is Sr. MANAGER TPM
 *
 * Role: Senior Technical Program Manager (individual contributor, no people mgmt)
 * Focus: Data & Analytics + Core Business Systems pillars
 *
 * Run: node screen-srtpm.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

// ── Config ───────────────────────────────────────────────────────────────────
const BRAINNER_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ANTHROPIC_KEY = "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";
const JOB_SLUG      = "677da035-8131-484a-a95d-ca83553b1197"; // Sr. TPM (Ed) — IC role
const TOP_N         = 1000;
const STOP_AT_GOOD  = 9999; // Screen all candidates (full run)
const CSV_FILE      = path.join(__dirname, `srtpm-screened-${new Date().toISOString().slice(0,10)}.csv`);
const CACHE_FILE    = path.join(__dirname, "srtpm-cache.json");
const HTML_FILE     = path.join(__dirname, "srtpm-report.html");
// ─────────────────────────────────────────────────────────────────────────────

const { criteria: SRTPM_CRITERIA } = require("./criteria/ed-srtpm");

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
  const headings = { 4:"✅ Strong Yes", 3:"🔵 Yes", 2:"🟡 No", 1:"❌ Strong No" };

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
  <title>Ed · Sr. TPM Screener</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 960px; margin: 0 auto; padding: 24px; background: #f8f9fa; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
    .progress-bar { background: #e0e0e0; border-radius: 6px; height: 8px; margin: 12px 0; }
    .progress-fill { background: #1a7f4b; height: 8px; border-radius: 6px; }
    .summary-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; }
    .badge { padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .status { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .status.running { background: #fff3cd; color: #856404; }
    .status.done    { background: #d4edda; color: #155724; }
    .card { border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
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
    .role-note { background: #fff3cd; border: 1px solid #ffc107; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: #856404; }
  </style>
</head>
<body>
  <h1>Ed · Senior TPM Screener</h1>
  <div class="role-note">⚠️ Sr. TPM (IC) — <strong>NOT</strong> Sr. Manager TPM. No people mgmt required. Focus: Data/Analytics + Payments/Risk/Business Systems. AI is a hard requirement.</div>
  <div class="meta">Top ${total} candidates by Brainner score &nbsp;·&nbsp; ${statusBadge}</div>
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
  const headers = ["Rank","Name","Email","Location","Brainner Score","Our Score","Score Label","Summary","Top Strength","Top Concern"];
  fs.writeFileSync(CSV_FILE, headers.map(h => `"${h}"`).join(",") + "\n");
}
function appendCSV(rank, cand, result) {
  const q = v => `"${String(v ?? "").replace(/"/g,'""')}"`;
  const row = [rank, result.name||cand.name, cand.email, cand.location||"", cand.brainnerScore, result.score, result.scoreLabel, result.summary, result.topStrength, result.topConcern];
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
      if (w.location)    parts.push(`Location: ${w.location}`);
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

// ─── Fetch candidates ──────────────────────────────────────────────────────────
async function fetchCandidates() {
  const candidates = [];
  const seen = new Set();
  let page = 1;

  while (candidates.length < TOP_N) {
    process.stdout.write(`  Page ${page} (${candidates.length}/${TOP_N} so far)… `);
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]":  JOB_SLUG,
      "filters[Status][$eq]":     "evaluated",
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
    console.log(`got ${data.length} (${total} total evaluated)`);

    for (const c of data) {
      const a     = c.attributes || {};
      const email = (a.Email || "").toLowerCase().trim();
      if (!email || seen.has(email)) continue;
      seen.add(email);
      candidates.push({
        email,
        name:          a.Name || email,
        location:      a.Location || "",
        brainnerScore: a.Score ?? null,
        resume:        resumeJsonToText(a.ResumeJSON) || "",
      });
      if (candidates.length >= TOP_N) break;
    }

    if (data.length < 200) break;
    page++;
  }

  console.log(`  Fetched ${candidates.length} candidates\n`);
  return candidates.slice(0, TOP_N);
}

// ─── Screen with Claude ────────────────────────────────────────────────────────
async function screenCandidate(cand) {
  if (!cand.resume || cand.resume.trim().length < 50) {
    return { score: 1, scoreLabel: "Strong No", summary: "No resume content available.", topStrength: "", topConcern: "No resume data" };
  }

  const now = new Date();
  const today = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const currentYear = now.getFullYear();

  const prompt = `You are a strict senior technical recruiter screening for a Senior TPM (Technical Program Manager) role at Scribd.
This is an individual contributor role focused on Data & Analytics and Core Business Systems (payments, risk, identity, financial systems).
It is NOT a people management role. Do NOT reward people management experience.
It is NOT a consumer product role. Do NOT reward consumer product PM experience unless accompanied by data/systems work.

TODAY'S DATE: ${today} (year: ${currentYear}). Use for all tenure calculations. "Present" = ${currentYear}.

CALIBRATION:
- Score 4: all gates lit — 5+ yrs tech, domain (data/analytics OR payments/risk/business systems), AI deeply embedded (built AI tooling/workflows, changed operating model), technical fluency, data-driven, senior cross-functional delivery
- Score 3: strong fundamentals + domain + at least operational AI (ran AI programs, manages ML delivery), missing one Score 4 gate
- Score 2: correct for most — consumer-only PM, no AI in 2023+ resume, traditional PM, people management focus, under 5 yrs
- Score 1: immediate disqualifier (under 3 yrs, no tech company, federal/gov, no PM experience at all)

${SRTPM_CRITERIA}

CANDIDATE RESUME:
${cand.resume.slice(0, 8000)}

Respond ONLY with a JSON object, no markdown:
{
  "name": "<full name>",
  "score": <1|2|3|4>,
  "scoreLabel": "<Strong No|No|Yes|Strong Yes>",
  "summary": "<2-3 sentences citing specific evidence: domain, AI usage, technical depth, cross-functional scope>",
  "topStrength": "<single strongest signal with evidence>",
  "topConcern": "<single biggest gap, or empty if score 4>"
}`;

  const resp = await claudePost({
    model:      "claude-sonnet-4-6",
    max_tokens: 600,
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
  if (JOB_SLUG === "TODO_FILL_IN_BRAINNER_SLUG") {
    console.error("❌ Brainner slug not set. Open screen-srtpm.js and fill in JOB_SLUG on line 24.");
    process.exit(1);
  }

  console.log(`\n━━━ Ed · Sr. TPM Screener (NOT Sr. Manager TPM) ━━━`);
  console.log(`Role: Data & Analytics + Core Business Systems`);
  console.log(`Pulling top ${TOP_N} from Brainner sorted by score\n`);

  const cache = loadCache();
  console.log(`  Cache: ${Object.keys(cache).length} previously screened\n`);

  const candidates = await fetchCandidates();

  const fromCache = [];
  const toScreen  = [];
  for (const cand of candidates) {
    if (cache[cand.email]) {
      fromCache.push({ ...cache[cand.email], rank: 0 });
    } else {
      toScreen.push(cand);
    }
  }
  console.log(`  ${fromCache.length} from cache, ${toScreen.length} to screen fresh\n`);

  initCSV();

  const CONCURRENCY = 5;
  const results = [...fromCache];
  const counts  = { 1:0, 2:0, 3:0, 4:0 };
  fromCache.forEach(r => { counts[r.ourScore] = (counts[r.ourScore]||0)+1; });

  let done = fromCache.length;
  let goodCount = fromCache.filter(r => r.ourScore >= 3).length;
  const total = candidates.length;

  writeHTML(results, total, done, toScreen.length > 0);
  console.log(`  HTML: file://${HTML_FILE}`);
  console.log(`  STOP_AT_GOOD = ${STOP_AT_GOOD}\n`);

  for (let i = 0; i < toScreen.length; i += CONCURRENCY) {
    if (goodCount >= STOP_AT_GOOD) {
      console.log(`\n🎯 Reached ${STOP_AT_GOOD} good candidates — stopping early.`);
      break;
    }

    const batch = toScreen.slice(i, i + CONCURRENCY);

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
          scoreLabel:    result.scoreLabel || "No",
          summary:       result.summary || "",
          topStrength:   result.topStrength || "",
          topConcern:    result.topConcern || "",
          rank:          0,
        };

        if (score >= 3) goodCount++;
        counts[score] = (counts[score] || 0) + 1;
        results.push(row);
        cache[cand.email] = row;
        done++;

        appendCSV(done, cand, result);
        saveCache(cache);

        const emoji = { 4:"✅", 3:"🔵", 2:"🟡", 1:"❌" }[score] || "⚪";
        const tally = `[4:${counts[4]} 3:${counts[3]} 2:${counts[2]} 1:${counts[1]}]`;
        console.log(`[${done}/${total}] ${emoji} ${score} — ${(result.scoreLabel||"").padEnd(12)} ${tally}  ${row.name}`);
      } catch (e) {
        done++;
        console.log(`[${done}/${total}] ❌ ERROR: ${e.message}`);
      }
    }));

    results.sort((a, b) => b.ourScore - a.ourScore || (b.brainnerScore||0) - (a.brainnerScore||0));
    results.forEach((r, idx) => r.rank = idx + 1);
    writeHTML(results, total, done, done < total && goodCount < STOP_AT_GOOD);
  }

  results.sort((a, b) => b.ourScore - a.ourScore || (b.brainnerScore||0) - (a.brainnerScore||0));
  results.forEach((r, idx) => r.rank = idx + 1);
  writeHTML(results, total, total, false);

  console.log(`\n✅ Done`);
  console.log(`   ✅ Strong Yes (4): ${counts[4]}`);
  console.log(`   🔵 Yes (3):        ${counts[3]}`);
  console.log(`   🟡 No (2):         ${counts[2]}`);
  console.log(`   ❌ Strong No (1):  ${counts[1]}`);
  console.log(`\n📄 Report: file://${HTML_FILE}`);
  console.log(`📊 CSV:    ${CSV_FILE}\n`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
