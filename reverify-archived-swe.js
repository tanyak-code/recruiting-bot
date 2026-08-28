#!/usr/bin/env node
/**
 * reverify-archived-swe.js
 * Pull Staff SWE candidates from Brainner filtered by ATS Pipeline = "To be Archived & Dispo",
 * re-screen with updated criteria, and report which ones now score 3 or 4.
 * Run: node reverify-archived-swe.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const BRAINNER_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ANTHROPIC_KEY = "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";

const JOB_SLUG  = "957115f1-3544-4956-afaf-59817757e0e5"; // Staff SWE (Mitch)
const CACHE_FILE = path.join(__dirname, "staff-swe-cache.json");
const HTML_FILE  = path.join(__dirname, "reverify-swe-report.html");
const ATS_STAGE  = "To be Archived & Dispo";

const { criteria: MITCH_CRITERIA } = require("./criteria/mitch");

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

function httpsRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
        catch { resolve({ status: res.statusCode, body: { raw: d } }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

function brainnerGet(urlPath) {
  return httpsRequest({
    hostname: "admin.brainner.ai",
    path:     urlPath,
    method:   "GET",
    headers:  { "Authorization": `Bearer ${BRAINNER_KEY}`, "Accept": "application/json" },
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Resume JSON → text (same as screen-staff-swe.js) ────────────────────────

function resumeJsonToText(rj) {
  if (!rj) return "";
  const parts = [];
  if (rj.basics) {
    const b = rj.basics;
    if (b.name)     parts.push(`Name: ${b.name}`);
    if (b.label)    parts.push(`Title: ${b.label}`);
    if (b.summary)  parts.push(`Summary: ${b.summary}`);
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

// ─── Brainner: probe ATS Pipeline filter, then fetch all archived ─────────────

async function probeAndFetch() {
  // Brainner uses Status="archived" for candidates in "To be Archived & Dispo" (Ashby stage)
  // Confirmed via field probe: Status, VendorStage, StageLabel all show "archived"/"Archived"
  console.log(`🔍 Fetching archived candidates (Brainner Status=archived)...`);

  const all = [];
  let page  = 1;
  while (true) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": JOB_SLUG,
      "filters[Status][$eq]":    "archived",
      "sort":                    "Score:desc",
      "fields[0]":               "Name",
      "fields[1]":               "Email",
      "fields[2]":               "Score",
      "fields[3]":               "Status",
      "fields[4]":               "Profile",
      "fields[5]":               "ResumeJSON",
      "fields[6]":               "Location",
      "pagination[page]":        String(page),
      "pagination[pageSize]":    "200",
    }).toString();

    const res = await brainnerGet(`/api/candidates?${params}`);
    const data = res.body?.data || [];
    const total = res.body?.meta?.pagination?.total ?? "?";

    if (page === 1) console.log(`   Found ${total} archived candidates total`);
    if (!data.length) break;

    for (const c of data) {
      const a     = c.attributes || {};
      const email = (a.Email || "").toLowerCase().trim();
      if (!email) continue;
      all.push({
        email,
        name:          a.Name || email,
        brainnerScore: a.Score ?? null,
        location:      a.Location || "",
        resumeText:    resumeJsonToText(a.ResumeJSON),
      });
    }

    const { page: pg, pageCount } = res.body?.meta?.pagination || {};
    if (!pageCount || pg >= pageCount) break;
    page++;
  }

  return all;
}

// ─── Claude screening ─────────────────────────────────────────────────────────

function claudeScreen(resumeText) {
  return new Promise((resolve, reject) => {
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const userPrompt = `You are a strict senior technical recruiter screening for a highly specialized Staff-level role. Most candidates should NOT pass — this is a narrow role with hard requirements, and the bar is high.

TODAY'S DATE: ${today}. A start date before today is NOT a future date — do not flag it, do not mention it. Only surface something in topConcern if it is a genuine problem.

IMPORTANT CALIBRATION:
- Score 4 = rare. Every hard requirement met with explicit evidence.
- Score 3 = all hard requirements met, missing staff-level scope signal.
- Score 2 = correct score for most candidates.
- If unsure between 2 and 3, score 2.

${MITCH_CRITERIA}

CANDIDATE RESUME / PROFILE:
${resumeText.slice(0, 8000)}

Respond ONLY with a JSON object, no markdown:
{
  "name": "<full name or 'Candidate'>",
  "currentRole": "<most recent title + company, max 8 words>",
  "location": "<city/state or Remote>",
  "ourScore": <1-4>,
  "scoreLabel": "<Strong No | No | Yes | Strong Yes>",
  "summary": "<2-3 sentences: cite specific evidence>",
  "topStrength": "<single strongest signal>",
  "topConcern": "<single biggest gap, or empty string>"
}`;

    const body = JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 600,
      messages:   [{ role: "user", content: userPrompt }],
    });

    httpsRequest({
      hostname: "api.anthropic.com",
      path:     "/v1/messages",
      method:   "POST",
      headers:  {
        "Content-Type":      "application/json",
        "Content-Length":    Buffer.byteLength(body),
        "x-api-key":         ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
    }, body).then(res => {
      try {
        const text = res.body?.content?.[0]?.text || "";
        const json = JSON.parse(text.match(/\{[\s\S]*\}/)?.[0] || "{}");
        resolve(json);
      } catch { resolve({}); }
    }).catch(reject);
  });
}

// ─── HTML report ──────────────────────────────────────────────────────────────

function writeHTML(results, total, done, running) {
  const esc        = s => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const scoreColor = s => s >= 4 ? "#16a34a" : s === 3 ? "#2563eb" : s === 2 ? "#d97706" : "#dc2626";
  const scoreBg    = s => s >= 4 ? "#f0fdf4" : s === 3 ? "#eff6ff" : s === 2 ? "#fffbeb" : "#fef2f2";

  const sorted   = [...results].sort((a, b) => b.ourScore - a.ourScore);
  const upgraded = results.filter(r => r.ourScore >= 3);

  const cards = sorted.map(r => `
    <div style="background:${scoreBg(r.ourScore)};border:1.5px solid ${scoreColor(r.ourScore)};border-radius:8px;padding:16px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div>
          <strong>${esc(r.name)}</strong>
          <span style="color:#6b7280;font-size:13px;margin-left:8px;">${esc(r.currentRole)}</span>
          <span style="color:#9ca3af;font-size:12px;margin-left:8px;">${esc(r.location)}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          ${r.previousScore ? `<span style="font-size:11px;color:#9ca3af;">was ${r.previousScore}</span>` : ""}
          <span style="background:${scoreColor(r.ourScore)};color:#fff;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;">${r.ourScore} · ${r.scoreLabel}</span>
          ${r.brainnerScore != null ? `<span style="background:#f3f4f6;color:#6b7280;padding:4px 8px;border-radius:12px;font-size:12px;">🧠 ${r.brainnerScore}</span>` : ""}
        </div>
      </div>
      <div style="color:#374151;font-size:13px;margin-bottom:8px;">${esc(r.summary)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
        <div><span style="color:#16a34a;font-weight:600;font-size:11px;">STRENGTH</span><br>${esc(r.topStrength)}</div>
        ${r.topConcern ? `<div style="background:#fef2f2;padding:6px 8px;border-radius:4px;"><span style="color:#dc2626;font-weight:600;font-size:11px;">CONCERN</span><br>${esc(r.topConcern)}</div>` : ""}
      </div>
    </div>`).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
${running ? '<meta http-equiv="refresh" content="4">' : ""}
<title>Reverify Archived — Staff SWE</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:24px;background:#f9fafb;max-width:900px;margin:0 auto;padding:24px;}
.banner{background:#1a1a1a;color:#fff;padding:16px 24px;border-radius:8px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;}
.stat{background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;}
.stat-num{font-size:28px;font-weight:700;}.stat-label{font-size:12px;color:#6b7280;}
.upgrade-banner{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1e40af;}
</style></head><body>
<div class="banner">
  <div><strong>Reverify: Archived Staff SWE</strong> — rescreened with updated criteria</div>
  <div style="font-size:13px;opacity:0.7;">${done}/${total} screened${running ? " · refreshing…" : " · complete ✓"}</div>
</div>
<div class="stats">
  <div class="stat"><div class="stat-num" style="color:#16a34a">${results.filter(r=>r.ourScore>=4).length}</div><div class="stat-label">Strong Yes (4)</div></div>
  <div class="stat"><div class="stat-num" style="color:#2563eb">${results.filter(r=>r.ourScore===3).length}</div><div class="stat-label">Yes (3)</div></div>
  <div class="stat"><div class="stat-num" style="color:#d97706">${results.filter(r=>r.ourScore===2).length}</div><div class="stat-label">No (2)</div></div>
  <div class="stat"><div class="stat-num" style="color:#dc2626">${results.filter(r=>r.ourScore===1).length}</div><div class="stat-label">Strong No (1)</div></div>
</div>
${upgraded.length ? `<div class="upgrade-banner">⬆️ <strong>${upgraded.length} candidate${upgraded.length>1?"s":""} upgraded to 3+</strong> under new criteria — review for Ashby reinstatement</div>` : ""}
${cards}
</body></html>`;

  fs.writeFileSync(HTML_FILE, html);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🔄 Reverify Archived Staff SWE`);
  console.log(`   Rescreening candidates in Brainner ATS Pipeline: "${ATS_STAGE}"`);
  console.log(`   Using updated criteria (AWS = bonus, AI must serve engineers)\n`);

  // Load cache for previous scores
  const cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) : {};

  // Fetch from Brainner
  const candidates = await probeAndFetch();
  console.log(`\n   Total candidates to reverify: ${candidates.length}\n`);

  if (!candidates.length) {
    console.log(`✅ No candidates found in "${ATS_STAGE}" for this job.`);
    return;
  }

  writeHTML([], candidates.length, 0, true);
  console.log(`📊 Live report: file://${HTML_FILE}\n`);
  console.log(`🧠 Re-screening...\n`);

  const results = [];

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    process.stdout.write(`[${i+1}/${candidates.length}] ${cand.name} (Brainner: ${cand.brainnerScore}) … `);

    if (!cand.resumeText || cand.resumeText.length < 100) {
      console.log(`⚠️  No resume text — skipping`);
      continue;
    }

    let result;
    try {
      result = await claudeScreen(cand.resumeText);
    } catch(e) {
      console.log(`❌ ${e.message}`);
      continue;
    }

    result.email         = cand.email;
    result.brainnerScore = cand.brainnerScore;
    result.location      = result.location || cand.location;
    result.previousScore = cache[cand.email]?.ourScore ?? null;

    results.push(result);

    const flag = result.ourScore >= 3 ? "⬆️ " : "   ";
    console.log(`${flag}${result.ourScore} · ${result.scoreLabel}`);

    writeHTML(results, candidates.length, i + 1, i < candidates.length - 1);
    await sleep(300);
  }

  writeHTML(results, candidates.length, candidates.length, false);

  const upgraded = results.filter(r => r.ourScore >= 3);
  console.log(`\n${"─".repeat(50)}`);
  console.log(`📊 Complete: ${results.length} rescreened, ${upgraded.length} upgraded to 3+`);
  if (upgraded.length) {
    console.log(`\n⬆️  Review these in Ashby:`);
    upgraded.sort((a,b) => b.ourScore - a.ourScore).forEach(r =>
      console.log(`   [${r.ourScore}] ${r.name} <${r.email}>${r.previousScore ? ` (was ${r.previousScore})` : ""}`)
    );
  }
  console.log(`\n📄 Report: file://${HTML_FILE}\n`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
