#!/usr/bin/env node
/**
 * rescreen-sr-pm-2s.js
 * Re-screens Sr PM score-2 candidates from cache with Sonnet (more nuanced).
 * Focuses on Brainner score >= MIN_BRAINNER_SCORE to target borderline candidates.
 * Updates the cache and generates an HTML report showing any upgrades to 3+.
 *
 * Run: node rescreen-sr-pm-2s.js
 */

const https  = require("https");
const fs     = require("fs");
const path   = require("path");

const ANTHROPIC_KEY     = "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";
const CACHE_FILE        = path.join(__dirname, "sr-pm-cache.json");
const HTML_FILE         = path.join(__dirname, "rescreen-sr-pm-report.html");
const MIN_BRAINNER_SCORE = 60; // Only re-screen candidates Brainner thought were solid
const CONCURRENCY       = 5;

// ─── Jordan's criteria (same as screen-sr-pm.js) ──────────────────────────────
const JORDAN_CRITERIA = fs.existsSync(path.join(__dirname, "criteria/jordan.js"))
  ? require("./criteria/jordan").criteria
  : null;

if (!JORDAN_CRITERIA) {
  console.error("❌ Could not load criteria/jordan.js");
  process.exit(1);
}

// ─── HTML helpers ──────────────────────────────────────────────────────────────
function esc(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function scoreColor(s) { return { 4:"#1a7f4b", 3:"#1565c0", 2:"#b45309", 1:"#c0392b" }[s] || "#555"; }
function scoreBg(s)    { return { 4:"#d4edda", 3:"#dbeafe", 2:"#fef3c7", 1:"#fde8e8" }[s] || "#f5f5f5"; }
function scoreBorder(s){ return { 4:"#1a7f4b", 3:"#1565c0", 2:"#d97706", 1:"#c0392b" }[s] || "#ccc"; }
function scoreEmoji(s) { return { 4:"✅", 3:"🔵", 2:"🟡", 1:"❌" }[s] || "⚪"; }

function buildHTML(results, total, done, running) {
  const upgraded = results.filter(r => r.newScore >= 3);
  const unchanged = results.filter(r => r.newScore < 3);
  const pct = total > 0 ? Math.round((done/total)*100) : 0;
  const refreshMeta = running ? `<meta http-equiv="refresh" content="4">` : "";
  const statusBadge = running
    ? `<span style="background:#fff3cd;color:#856404;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">⏳ Running — refreshes every 4s</span>`
    : `<span style="background:#d4edda;color:#155724;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;">✅ Complete</span>`;

  const makeCard = (r) => `
  <div style="border-left:4px solid ${scoreBorder(r.newScore)};background:${scoreBg(r.newScore)};border-radius:8px;padding:16px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    ${r.newScore >= 3 ? `<div style="background:#1565c0;color:#fff;font-size:11px;font-weight:700;letter-spacing:1px;padding:3px 8px;border-radius:4px;display:inline-block;margin-bottom:8px;">🔄 UPGRADED from 2 → ${r.newScore}</div>` : ""}
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-weight:700;font-size:15px;">${esc(r.name)}</span>
        <span style="font-size:12px;color:#666;">📍 ${esc(r.location||"—")}</span>
      </div>
      <div style="display:flex;gap:8px;align-items:center;">
        <span style="background:#e8e8e8;padding:3px 8px;border-radius:12px;font-size:12px;font-weight:600;">🧠 ${r.brainnerScore ?? "—"}</span>
        <span style="background:${scoreColor(r.newScore)};color:#fff;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;">${scoreEmoji(r.newScore)} ${r.newScore} — ${esc(r.scoreLabel)}</span>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:1.5;">
      <div style="display:flex;gap:8px;"><span style="font-weight:600;min-width:110px;color:#444;">Summary</span><span style="flex:1;">${esc(r.summary)}</span></div>
      <div style="display:flex;gap:8px;"><span style="font-weight:600;min-width:110px;color:#444;">Top Strength</span><span style="flex:1;">${esc(r.topStrength)}</span></div>
      <div style="display:flex;gap:8px;"><span style="font-weight:600;min-width:110px;color:#444;">Top Concern</span><span style="flex:1;">${esc(r.topConcern)}</span></div>
    </div>
  </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${refreshMeta}
  <title>Re-Screen Sr PM Score 2s — Sonnet</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; background: #f8f9fa; color: #1a1a1a; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>🔄 Re-Screen Sr PM Score 2s — Sonnet</h1>
  <div class="meta">
    Candidates originally scored 2 by Haiku with Brainner ≥ ${MIN_BRAINNER_SCORE} — re-evaluated with Sonnet
    &nbsp;·&nbsp; ${statusBadge}
  </div>
  <div style="background:#e0e0e0;border-radius:6px;height:8px;margin:12px 0;">
    <div style="background:#1565c0;height:8px;border-radius:6px;width:${pct}%"></div>
  </div>
  <p style="font-size:13px;color:#555;">${done} / ${total} re-screened (${pct}%)</p>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin:16px 0;">
    <span style="background:#d4edda;color:#155724;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">✅ ${results.filter(r=>r.newScore===4).length} Strong Yes (upgraded)</span>
    <span style="background:#dbeafe;color:#1e40af;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">🔵 ${results.filter(r=>r.newScore===3).length} Yes (upgraded)</span>
    <span style="background:#fef3c7;color:#92400e;padding:6px 14px;border-radius:20px;font-size:13px;font-weight:600;">🟡 ${unchanged.length} Still No</span>
  </div>

  ${upgraded.length ? `<h2 style="color:#1565c0;margin:24px 0 12px;">🔄 Upgraded Candidates (${upgraded.length})</h2>${upgraded.map(makeCard).join("")}` : ""}
  ${done > 0 && unchanged.length ? `<h2 style="color:#b45309;margin:24px 0 12px;">🟡 Still No — Confirmed (${unchanged.length})</h2>${unchanged.map(makeCard).join("")}` : ""}
  ${!done ? `<p style="color:#888;margin-top:40px;">Re-screening in progress…</p>` : ""}
</body>
</html>`;
}

function writeHTML(results, total, done, running) {
  fs.writeFileSync(HTML_FILE, buildHTML(results, total, done, running), "utf8");
}

// ─── Claude (Sonnet) ───────────────────────────────────────────────────────────
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

async function screenWithSonnet(candidate) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const prompt = `You are a strict senior technical recruiter screening for a Senior Product Manager role. Apply the criteria carefully — this re-screen uses a more nuanced model to catch candidates who may have been scored too conservatively.

TODAY'S DATE: ${today}. Do NOT flag future end dates on current roles as a concern — this simply means a contract end, upcoming layoff, or the candidate has given notice.

IMPORTANT: A score of 3 means all hard requirements are met but one signal is lighter. A score of 4 means every hard requirement is met with explicit evidence. Most candidates should score 2. Be accurate, not conservative.

${JORDAN_CRITERIA}

CANDIDATE RESUME / PROFILE:
${(candidate.resume || "").slice(0, 8000)}

Respond ONLY with a JSON object, no markdown:
{
  "name": "<full name>",
  "score": <1|2|3|4>,
  "scoreLabel": "<Strong No|No|Yes|Strong Yes>",
  "summary": "<2-3 sentences with specific evidence>",
  "topStrength": "<single strongest signal with evidence>",
  "topConcern": "<single biggest gap, or empty string if score 3+>"
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
  if (!fs.existsSync(CACHE_FILE)) {
    console.error("❌ Cache file not found:", CACHE_FILE);
    process.exit(1);
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));

  // Pull score-2s with Brainner score >= threshold
  const candidates = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 2 && (r.brainnerScore ?? 0) >= MIN_BRAINNER_SCORE)
    .sort(([, a], [, b]) => (b.brainnerScore ?? 0) - (a.brainnerScore ?? 0))
    .map(([email, r]) => ({ email, ...r }));

  console.log(`\n🔄 Re-screening Sr PM score-2s with Sonnet`);
  console.log(`   Brainner score filter: ≥ ${MIN_BRAINNER_SCORE}`);
  console.log(`   Candidates to re-screen: ${candidates.length}`);
  console.log(`   HTML report: ${HTML_FILE}\n`);

  if (!candidates.length) {
    console.log("No candidates match the filter. Try lowering MIN_BRAINNER_SCORE.");
    process.exit(0);
  }

  writeHTML([], candidates.length, 0, true);

  const results = [];
  let done = 0;
  let upgrades = 0;

  // Process in parallel batches
  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY);

    await Promise.all(batch.map(async (cand) => {
      try {
        const result = await screenWithSonnet(cand);
        const newScore = Math.max(1, Math.min(4, result.score || 2));
        const wasUpgraded = newScore > 2;

        const row = {
          name:          result.name || cand.name,
          email:         cand.email,
          location:      cand.location,
          brainnerScore: cand.brainnerScore,
          oldScore:      2,
          newScore,
          scoreLabel:    result.scoreLabel,
          summary:       result.summary,
          topStrength:   result.topStrength,
          topConcern:    result.topConcern,
        };

        results.push(row);
        done++;
        if (wasUpgraded) upgrades++;

        // Update cache with new score
        cache[cand.email] = { ...cache[cand.email], ourScore: newScore, scoreLabel: result.scoreLabel, summary: result.summary, topStrength: result.topStrength, topConcern: result.topConcern };
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

        const emoji = wasUpgraded ? "🔄 UPGRADED →" : "🟡 Still 2   ";
        console.log(`[${done}/${candidates.length}] ${emoji} ${newScore} | B:${cand.brainnerScore ?? "—"} | ${row.name}`);
      } catch (e) {
        done++;
        console.log(`[${done}/${candidates.length}] ❌ ERROR: ${e.message}`);
      }
    }));

    // Sort: upgraded first, then by Brainner score
    results.sort((a, b) => b.newScore - a.newScore || (b.brainnerScore||0) - (a.brainnerScore||0));
    writeHTML(results, candidates.length, done, done < candidates.length);
  }

  writeHTML(results, candidates.length, done, false);

  console.log(`\n✅ Done.`);
  console.log(`   Re-screened:  ${done}`);
  console.log(`   Upgraded 3+:  ${upgrades}`);
  console.log(`   Still score 2: ${done - upgrades}`);
  console.log(`\n📄 Report: file://${HTML_FILE}\n`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
