#!/usr/bin/env node
/**
 * Verify all screened candidates are actioned out of Application Review.
 * Generates a live HTML report at verify-report.html
 *
 * Run: node verify-report.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY   = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const HTML_FILE   = path.join(__dirname, "verify-report.html");

const JOBS = [
  {
    label:     "Product Ops (Ed)",
    jobId:     "6d148a63-d9e2-48ad-910c-465ada648b4d",
    cacheFile: path.join(__dirname, "prod-ops-cache.json"),
  },
  {
    label:     "Sr. Manager TPM (Ed)",
    jobId:     "59d95ceb-ba5e-4c01-8c05-c99076529012",
    cacheFile: path.join(__dirname, "sr-tpm-cache.json"),
  },
  {
    label:     "Staff SWE (Mitch)",
    jobId:     "203af220-b197-4a58-827f-072cb1ae0611",
    cacheFile: path.join(__dirname, "staff-swe-cache.json"),
  },
  {
    label:     "Sr. PM (Jordan)",
    jobId:     "fb14d682-a04b-4db4-aed3-eed210e1673b",
    cacheFile: path.join(__dirname, "sr-pm-cache.json"),
  },
];

function esc(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function scoreColor(s) { return { 4:"#1a7f4b", 3:"#1565c0", 2:"#b45309", 1:"#c0392b" }[s] || "#555"; }
function scoreBg(s)    { return { 4:"#d4edda", 3:"#dbeafe", 2:"#fef3c7", 1:"#fde8e8" }[s] || "#f5f5f5"; }
function scoreLabel(s) { return { 4:"Strong Yes", 3:"Maybe", 2:"No", 1:"Hard No" }[s] || "?"; }

function writeHTML(jobResults, running) {
  const refreshMeta = running ? `<meta http-equiv="refresh" content="4">` : "";
  const statusBadge = running
    ? `<span class="badge running">⏳ Checking… auto-refreshes every 4s</span>`
    : `<span class="badge done">✅ Check complete</span>`;

  const totalStuck    = jobResults.reduce((n, j) => n + j.stuck.length, 0);
  const totalScreened = jobResults.reduce((n, j) => n + j.total, 0);
  const allClear      = totalStuck === 0 && !running;

  const grandBanner = allClear
    ? `<div class="grand-banner clear">✅ All jobs clean — every screened candidate has been actioned</div>`
    : totalStuck > 0
      ? `<div class="grand-banner stuck">❌ ${totalStuck} candidate${totalStuck > 1 ? "s" : ""} still in Application Review across ${jobResults.filter(j=>j.stuck.length).length} job${jobResults.filter(j=>j.stuck.length).length > 1?"s":""}</div>`
      : `<div class="grand-banner checking">⏳ Checking all jobs…</div>`;

  const jobCards = jobResults.map(job => {
    const hasError = !!job.error;
    const statusIcon = hasError ? "⚠️" : job.stuck.length > 0 ? "❌" : job.total > 0 ? "✅" : "⏳";
    const statusText = hasError ? `Error: ${job.error}` : job.stuck.length > 0 ? `${job.stuck.length} stuck in Application Review` : job.total > 0 ? "All clear" : "Checking…";
    const cardClass  = hasError ? "job-card error" : job.stuck.length > 0 ? "job-card stuck" : "job-card clear";

    const stuckRows = job.stuck.map(c => `
      <tr>
        <td>${esc(c.name)}</td>
        <td>${esc(c.email)}</td>
        <td><span class="score-badge" style="background:${scoreBg(c.score)};color:${scoreColor(c.score)}">${c.score} — ${scoreLabel(c.score)}</span></td>
        <td>${esc(c.currentStage)}</td>
      </tr>`).join("");

    const stuckTable = job.stuck.length > 0 ? `
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Score</th><th>Current Stage</th></tr></thead>
        <tbody>${stuckRows}</tbody>
      </table>` : "";

    const notFoundNote = job.notFound > 0
      ? `<div class="note">⚠️ ${job.notFound} screened candidate${job.notFound>1?"s":""} not found in Ashby (withdrawn or merged)</div>` : "";

    const stats = job.total > 0 ? `
      <div class="job-stats">
        <span>📋 ${job.total} screened</span>
        <span>✅ ${job.total - job.stuck.length - job.notFound} actioned</span>
        ${job.stuck.length > 0 ? `<span class="stat-bad">❌ ${job.stuck.length} stuck</span>` : ""}
        ${job.notFound > 0 ? `<span class="stat-warn">⚠️ ${job.notFound} not found</span>` : ""}
      </div>` : "";

    return `
    <div class="${cardClass}">
      <div class="job-header">
        <span class="job-title">${statusIcon} ${esc(job.label)}</span>
        <span class="job-status">${esc(statusText)}</span>
      </div>
      ${stats}
      ${notFoundNote}
      ${stuckTable}
    </div>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">${refreshMeta}
<title>Ashby Stage Verification</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f0f2f5; color: #1a1a1a; }
.header { background: #fff; border-bottom: 1px solid #e0e0e0; padding: 20px 32px; position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; }
.title { font-size: 18px; font-weight: 700; }
.subtitle { font-size: 13px; color: #666; margin-top: 2px; }
.badge { font-size: 12px; font-weight: 600; padding: 5px 12px; border-radius: 12px; }
.badge.running { background: #fef9c3; color: #854d0e; }
.badge.done { background: #dcfce7; color: #166534; }
.content { max-width: 860px; margin: 0 auto; padding: 24px 16px; }
.grand-banner { border-radius: 10px; padding: 16px 20px; font-size: 15px; font-weight: 700; margin-bottom: 24px; text-align: center; }
.grand-banner.clear { background: #dcfce7; color: #166534; }
.grand-banner.stuck { background: #fde8e8; color: #c0392b; }
.grand-banner.checking { background: #fef9c3; color: #854d0e; }
.job-card { background: #fff; border-radius: 10px; padding: 18px 22px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.08); border-left: 4px solid #e5e7eb; }
.job-card.stuck { border-left-color: #c0392b; }
.job-card.clear { border-left-color: #1a7f4b; }
.job-card.error { border-left-color: #d97706; }
.job-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.job-title { font-size: 15px; font-weight: 700; }
.job-status { font-size: 13px; color: #555; }
.job-stats { display: flex; gap: 16px; font-size: 13px; color: #555; margin-bottom: 12px; flex-wrap: wrap; }
.stat-bad { color: #c0392b; font-weight: 600; }
.stat-warn { color: #b45309; font-weight: 600; }
.note { font-size: 12px; color: #b45309; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
th { text-align: left; padding: 7px 10px; background: #f8f9fa; color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; border-bottom: 1px solid #e5e7eb; }
td { padding: 8px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
.score-badge { font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 10px; white-space: nowrap; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="title">Ashby Stage Verification</div>
    <div class="subtitle">${totalScreened > 0 ? `${totalScreened} total screened candidates · ${JOBS.length} jobs` : "Loading…"}</div>
  </div>
  ${statusBadge}
</div>
<div class="content">
  ${grandBanner}
  ${jobCards}
</div>
</body>
</html>`;

  fs.writeFileSync(HTML_FILE, html, "utf8");
}

// ── Ashby helpers ─────────────────────────────────────────────────────────────

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
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function fetchAllApplications(jobId) {
  const all = []; let cursor = null;
  while (true) {
    const payload = { jobId, limit: 100 };
    if (cursor) payload.cursor = cursor;
    const resp = await ashbyPost("/application.list", payload);
    const results = resp.results || [];
    all.push(...results);
    if (!resp.moreDataAvailable || results.length === 0) break;
    cursor = resp.nextCursor;
  }
  return all;
}

async function checkJob(job) {
  const result = { label: job.label, total: 0, stuck: [], notFound: 0, error: null };

  if (!fs.existsSync(job.cacheFile)) {
    result.error = "No cache file found";
    return result;
  }

  const cache = JSON.parse(fs.readFileSync(job.cacheFile, "utf8"));
  const candidates = Object.entries(cache).map(([email, rec]) => ({
    email: email.toLowerCase().trim(),
    name:  rec.name || email,
    score: rec.ourScore,
  }));
  result.total = candidates.length;

  let applications;
  try {
    applications = await fetchAllApplications(job.jobId);
  } catch (e) {
    result.error = `Failed to fetch applications: ${e.message}`;
    return result;
  }

  if (applications.length === 0) {
    result.error = "0 applications returned from Ashby — job may be closed or job ID may be wrong";
    return result;
  }

  // Discover Application Review stage ID
  let appReviewId = null;
  try {
    const plan = await ashbyPost("/jobInterviewPlan.info", { jobId: job.jobId });
    for (const s of (plan?.results?.interviewStages || [])) {
      if ((s.title || "").toLowerCase().trim() === "application review") { appReviewId = s.id; break; }
    }
  } catch {}
  if (!appReviewId) {
    for (const app of applications) {
      const s = app.currentInterviewStage;
      if (s && (s.title || "").toLowerCase().trim() === "application review") { appReviewId = s.id; break; }
    }
  }

  // Build email → app map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  for (const { email, name, score } of candidates) {
    const app = emailToApp[email];
    if (!app) { result.notFound++; continue; }

    const curId    = app.currentInterviewStage?.id;
    const curTitle = app.currentInterviewStage?.title || "Unknown";

    const isStuck = appReviewId ? curId === appReviewId : curTitle.toLowerCase().includes("application review");
    if (isStuck) result.stuck.push({ name, email, score, currentStage: curTitle });
  }

  return result;
}

async function main() {
  console.log(`Running verification — open the HTML report to follow along:`);
  console.log(`  file://${HTML_FILE}\n`);

  // Write initial loading state
  writeHTML(JOBS.map(j => ({ label: j.label, total: 0, stuck: [], notFound: 0, error: null })), true);

  const jobResults = [];
  for (const job of JOBS) {
    console.log(`Checking ${job.label}...`);
    const result = await checkJob(job);
    jobResults.push(result);
    writeHTML(
      [...jobResults, ...JOBS.slice(jobResults.length).map(j => ({ label: j.label, total: 0, stuck: [], notFound: 0, error: null }))],
      true
    );
    const stuck = result.stuck.length;
    console.log(`  ${stuck > 0 ? "❌" : result.error ? "⚠️" : "✅"} ${result.error || (stuck > 0 ? `${stuck} stuck` : `All clear (${result.total} screened)`)}`);
  }

  // Final write — stops auto-refresh
  writeHTML(jobResults, false);

  const totalStuck = jobResults.reduce((n, j) => n + j.stuck.length, 0);
  console.log(`\nDone. ${totalStuck === 0 ? "✅ All clear." : `❌ ${totalStuck} total stuck — see report.`}`);
  console.log(`Report: file://${HTML_FILE}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
