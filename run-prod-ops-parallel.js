#!/usr/bin/env node
/**
 * Parallel Product Ops screener — runs 10 Claude calls concurrently
 * Outputs same CSV + HTML as screen-prod-ops.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const BRAINNER_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ANTHROPIC_KEY = "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";
const JOB_SLUG      = "957115f1-3544-4956-afaf-59817757e0e5";
const TOP_N         = 100;
const CONCURRENCY   = 10;
const OUT_DIR       = path.dirname(require.resolve("./screen-prod-ops.js") || __filename);
const DATE          = new Date().toISOString().slice(0,10);
const CSV_FILE      = path.join(OUT_DIR, `prod-ops-screened-${DATE}.csv`);

// ── pull criteria string from the existing script ──────────────────────────
const mainScript = fs.readFileSync(path.join(OUT_DIR, "screen-prod-ops.js"), "utf8");
const m = mainScript.match(/const ED_CRITERIA = `([\s\S]*?)`;/);
if (!m) { console.error("Could not find ED_CRITERIA in screen-prod-ops.js"); process.exit(1); }
const ED_CRITERIA = m[1];

// ── HTTP helpers ───────────────────────────────────────────────────────────
function req(opts, body) {
  return new Promise((res, rej) => {
    const bodyBuf = body ? Buffer.from(JSON.stringify(body)) : null;
    const headers = { ...opts.headers };
    if (bodyBuf) headers["Content-Length"] = bodyBuf.length;
    const r = https.request({ ...opts, headers }, (resp) => {
      let d = "";
      resp.on("data", c => d += c);
      resp.on("end", () => {
        try { res({ status: resp.statusCode, body: JSON.parse(d) }); }
        catch { res({ status: resp.statusCode, body: d }); }
      });
    });
    r.on("error", rej);
    if (bodyBuf) r.write(bodyBuf);
    r.end();
  });
}

// ── resume JSON → plain text ───────────────────────────────────────────────
function resumeToText(rj) {
  if (!rj) return "";
  if (typeof rj === "string") return rj;
  const parts = [];
  if (rj.basics) {
    const b = rj.basics;
    if (b.name) parts.push(b.name);
    if (b.label) parts.push(b.label);
    if (b.summary) parts.push(b.summary);
  }
  (rj.work || []).forEach(w => {
    parts.push(`${w.position || ""} at ${w.company || w.name || ""} (${w.startDate||""} - ${w.endDate||"Present"})`);
    if (w.summary) parts.push(w.summary);
    (w.highlights || []).forEach(h => parts.push(`• ${h}`));
  });
  (rj.skills || []).forEach(s => {
    parts.push(`Skills: ${s.name}: ${(s.keywords||[]).join(", ")}`);
  });
  return parts.join("\n");
}

// ── fetch candidates ───────────────────────────────────────────────────────
async function fetchCandidates() {
  const params = new URLSearchParams({
    "filters[Job][Slug][$eq]": JOB_SLUG,
    "fields[0]": "Name", "fields[1]": "Email", "fields[2]": "Score",
    "fields[3]": "Status", "fields[4]": "Profile",
    "fields[5]": "ResumeJSON", "fields[6]": "Location",
    "pagination[pageSize]": "200",
  });
  const r = await req({
    hostname: "admin.brainner.ai",
    path: `/api/candidates?${params}`,
    method: "GET",
    headers: { Authorization: `Bearer ${BRAINNER_KEY}`, Accept: "application/json" }
  });
  if (r.status !== 200) throw new Error(`Brainner: ${r.status} ${JSON.stringify(r.body).slice(0,200)}`);
  return (r.body.data || [])
    .filter(c => c.attributes.Status === "evaluated")
    .sort((a,b) => (b.attributes.Score||0) - (a.attributes.Score||0))
    .slice(0, TOP_N);
}

// ── screen one candidate ───────────────────────────────────────────────────
async function screen(name, resumeText) {
  const prompt = `You are a senior recruiter screening for a Product Operations Lead role at Scribd.
Apply Ed's calibrated criteria strictly. No benefit of the doubt — only credit what is explicitly written.

${ED_CRITERIA}

CANDIDATE RESUME:
${(resumeText || "").slice(0, 8000)}

Respond ONLY with valid JSON, no markdown:
{
  "score": <1|2|3|4>,
  "scoreLabel": "<Strong No|No|Yes|Strong Yes>",
  "summary": "<2-3 sentences with specific evidence from the resume>",
  "topStrength": "<single most compelling qualification with concrete evidence>",
  "topConcern": "<most critical gap or probe needed — be specific>"
}`;

  const r = await req(
    { hostname: "api.anthropic.com", path: "/v1/messages", method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01" }
    },
    { model: "claude-sonnet-4-6", max_tokens: 600, messages: [{ role: "user", content: prompt }] }
  );
  const raw = r.body?.content?.[0]?.text ?? "{}";
  try { return JSON.parse(raw.replace(/```json|```/g,"").trim()); }
  catch { return { score: 1, scoreLabel: "Strong No", summary: "Parse error", topStrength: "", topConcern: "Parse error" }; }
}

// ── parallel runner with concurrency limit ─────────────────────────────────
async function runParallel(candidates) {
  const results = new Array(candidates.length).fill(null);
  const queue   = candidates.map((c, i) => [i, c]);
  let done = 0;

  async function worker() {
    while (queue.length > 0) {
      const [i, c] = queue.shift();
      const a    = c.attributes;
      const name = a.Name || `Candidate ${c.id}`;
      const text = resumeToText(a.ResumeJSON) || a.Profile || "";
      try {
        const r = await screen(name, text);
        results[i] = {
          rank: 0, name, email: a.Email||"", location: a.Location||"",
          brainnerScore: a.Score||0,
          ourScore: Math.max(1,Math.min(4,r.score||1)),
          scoreLabel: r.scoreLabel||"", summary: r.summary||"",
          topStrength: r.topStrength||"", topConcern: r.topConcern||""
        };
      } catch(e) {
        results[i] = {
          rank: 0, name, email: a.Email||"", location: a.Location||"",
          brainnerScore: a.Score||0, ourScore: 1, scoreLabel: "Error",
          summary: e.message, topStrength: "", topConcern: "API error"
        };
      }
      done++;
      process.stdout.write(`\r   ${done}/${candidates.length} screened...`);
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
  console.log(""); // newline after progress
  return results.filter(Boolean);
}

// ── CSV builder ────────────────────────────────────────────────────────────
function q(v) { return `"${String(v??'').replace(/"/g,'""')}"`; }
function buildCSV(rows) {
  const hdr = ["Rank","Name","Email","Location","Brainner Score","Our Score","Score Label","Summary","Top Strength","Top Concern"];
  const lines = [hdr.map(q).join(",")];
  rows.forEach(r => lines.push([
    r.rank, r.name, r.email, r.location, r.brainnerScore,
    r.ourScore, r.scoreLabel, r.summary, r.topStrength, r.topConcern
  ].map(q).join(",")));
  return lines.join("\n");
}

// ── main ───────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍 Fetching top ${TOP_N} Product Ops candidates from Brainner...`);
  const candidates = await fetchCandidates();
  console.log(`   Got ${candidates.length} evaluated candidates (sorted by Brainner score)`);

  console.log(`\n⚡ Screening ${candidates.length} candidates (${CONCURRENCY} parallel)...\n`);
  const t0 = Date.now();
  const results = await runParallel(candidates);
  const elapsed = ((Date.now()-t0)/1000).toFixed(1);

  // sort: our score desc, then brainner score desc
  results.sort((a,b) => b.ourScore - a.ourScore || b.brainnerScore - a.brainnerScore);
  results.forEach((r,i) => r.rank = i+1);

  const counts = {4:0,3:0,2:0,1:0};
  results.forEach(r => counts[r.ourScore] = (counts[r.ourScore]||0)+1);

  fs.writeFileSync(CSV_FILE, buildCSV(results), "utf8");

  console.log(`\n📊 Results (${elapsed}s):`);
  console.log(`   ✅ 4 - Strong Yes: ${counts[4]}`);
  console.log(`   ✓  3 - Yes:        ${counts[3]}`);
  console.log(`   ✗  2 - No:         ${counts[2]}`);
  console.log(`   ⛔ 1 - Strong No:  ${counts[1]}`);
  console.log(`\n💾 CSV: ${CSV_FILE}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
