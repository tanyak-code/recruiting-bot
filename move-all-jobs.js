#!/usr/bin/env node
/**
 * Move candidates across ALL three jobs based on screener scores.
 *
 * Score 4  → "Hiring Manager Resume Review"
 * Score 3  → "Secondary Review"
 * Score 1/2 → "To Be Archived & Dispo"
 *
 * Safety: only moves candidates currently in "Application Review" stage.
 *
 * Run: node move-all-jobs.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";

const JOBS = [
  {
    label:     "Product Ops (Ed)",
    jobId:     "6d148a63-d9e2-48ad-910c-465ada648b4d",
    cacheFile: path.join(__dirname, "prod-ops-cache.json"),
  },
  {
    label:     "Staff SWE (Mitch)",
    jobId:     "203af220-b197-4a58-827f-072cb1ae0611",
    cacheFile: path.join(__dirname, "staff-swe-cache.json"),
  },
];

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
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAllApplications(jobId) {
  const all = [];
  let cursor = null;
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

/**
 * Discover stage IDs using /jobInterviewPlan.info — returns the full pipeline
 * regardless of whether any candidates are currently in those stages.
 * Falls back to scanning application objects if the plan endpoint fails.
 */
async function discoverStages(jobId, applications) {
  let appReviewId = null;
  let hmResumeId  = null;
  let secondaryId = null;
  let archiveId   = null;

  const seen = new Map(); // id → title, for logging

  // Primary: use jobInterviewPlan.info (full pipeline, no candidates needed)
  try {
    const plan = await ashbyPost("/jobInterviewPlan.info", { jobId });
    const stages = plan?.results?.interviewStages || [];
    for (const stage of stages) {
      const id    = stage.id;
      const title = (stage.title || "").toLowerCase().trim();
      seen.set(id, stage.title);

      if (!appReviewId && title === "application review")           appReviewId = id;
      if (!hmResumeId  && title === "hiring manager resume review") hmResumeId  = id;
      if (!secondaryId && title === "secondary review")             secondaryId = id;
      if (!archiveId   && title.startsWith("to be archived"))       archiveId   = id;
    }
  } catch (e) {
    console.log(`   ⚠️  jobInterviewPlan.info failed (${e.message}), falling back to application objects`);
  }

  // Fallback: scan currentInterviewStage on application objects
  if (!appReviewId || !hmResumeId || !secondaryId || !archiveId) {
    for (const app of applications) {
      const stage = app.currentInterviewStage;
      if (!stage) continue;
      const id    = stage.id;
      const title = (stage.title || "").toLowerCase().trim();
      if (!seen.has(id)) seen.set(id, stage.title);

      if (!appReviewId && title === "application review")           appReviewId = id;
      if (!hmResumeId  && title === "hiring manager resume review") hmResumeId  = id;
      if (!secondaryId && title === "secondary review")             secondaryId = id;
      if (!archiveId   && title.startsWith("to be archived"))       archiveId   = id;
    }
  }

  // Log all discovered stages so we can audit
  console.log(`\n   All stages found in pipeline:`);
  for (const [id, title] of seen) {
    const marker =
      id === appReviewId ? " ← Application Review" :
      id === hmResumeId  ? " ← Hiring Manager Resume Review" :
      id === secondaryId ? " ← Secondary Review" :
      id === archiveId   ? " ← To Be Archived & Dispo" : "";
    console.log(`     ${title}${marker}`);
  }

  return { appReviewId, hmResumeId, secondaryId, archiveId };
}

// ── Per-job mover ─────────────────────────────────────────────────────────────

async function processJob({ label, jobId, cacheFile }) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🏢 ${label}  (${jobId})`);
  console.log(`${"═".repeat(60)}`);

  // Load cache
  if (!fs.existsSync(cacheFile)) {
    console.log(`   ❌ Cache file not found: ${cacheFile} — skipping.`);
    return;
  }
  const cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));

  const score4 = [];
  const score3 = [];
  const score12 = [];

  for (const [emailKey, rec] of Object.entries(cache)) {
    const email = emailKey.toLowerCase().trim();
    const name  = rec.name || email;
    const score = rec.ourScore;
    if (score === 4)            score4.push({ email, name, score });
    else if (score === 3)       score3.push({ email, name, score });
    else if (score === 1 || score === 2) score12.push({ email, name, score });
  }

  console.log(`\n   From cache:`);
  console.log(`     Score 4  → Hiring Manager Resume Review : ${score4.length}`);
  console.log(`     Score 3  → Secondary Review             : ${score3.length}`);
  console.log(`     Score 1/2 → To Be Archived & Dispo      : ${score12.length}`);

  // Fetch Ashby applications
  console.log(`\n   📥 Fetching applications from Ashby...`);
  const applications = await fetchAllApplications(jobId);
  console.log(`   Found ${applications.length} applications`);

  // Discover stages
  const { appReviewId, hmResumeId, secondaryId, archiveId } = await discoverStages(jobId, applications);

  if (!appReviewId) { console.error(`\n   ❌ Could not find "Application Review" stage — aborting this job.`); return; }
  if (!secondaryId) { console.error(`\n   ❌ Could not find "Secondary Review" stage — aborting this job.`); return; }
  if (!archiveId)   { console.error(`\n   ❌ Could not find "To Be Archived & Dispo" stage — aborting this job.`); return; }

  console.log(`\n   ✅ Stage IDs confirmed:`);
  console.log(`     Application Review:          ${appReviewId}`);
  console.log(`     Secondary Review:             ${secondaryId}`);
  console.log(`     To Be Archived & Dispo:       ${archiveId}`);

  // Build email → app map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  const stats = {
    sec:     { moved: 0, skipped: 0, notFound: 0, errors: 0 },
    archive: { moved: 0, skipped: 0, notFound: 0, errors: 0 },
  };

  // ── Score 3 → Secondary Review ───────────────────────────────────────────────
  console.log(`\n   🔵 Score 3 → Secondary Review (${score3.length} candidates)...\n`);
  for (const { email, name } of score3) {
    const app = emailToApp[email];
    if (!app) {
      stats.sec.notFound++;
      console.log(`      ⚠️  Not found in Ashby: ${name} (${email})`);
      continue;
    }
    const curId    = app.currentInterviewStage?.id;
    const curTitle = app.currentInterviewStage?.title || curId;
    if (curId !== appReviewId) {
      stats.sec.skipped++;
      console.log(`      ⏭️  Skipped (${curTitle}): ${name}`);
      continue;
    }
    try {
      await ashbyPost("/application.changeStage", { applicationId: app.id, interviewStageId: secondaryId });
      stats.sec.moved++;
      console.log(`      ✅ → Secondary Review: ${name}`);
    } catch (e) {
      stats.sec.errors++;
      console.log(`      ❌ Error on ${name}: ${e.message}`);
    }
    await sleep(150);
  }

  // ── Score 1/2 → To Be Archived & Dispo ──────────────────────────────────────
  console.log(`\n   🔴 Score 1/2 → To Be Archived & Dispo (${score12.length} candidates)...\n`);
  for (const { email, name, score } of score12) {
    const app = emailToApp[email];
    if (!app) {
      stats.archive.notFound++;
      console.log(`      ⚠️  Not found in Ashby: ${name} (${email})`);
      continue;
    }
    const curId    = app.currentInterviewStage?.id;
    const curTitle = app.currentInterviewStage?.title || curId;
    if (curId !== appReviewId) {
      stats.archive.skipped++;
      console.log(`      ⏭️  Skipped [${score}] (${curTitle}): ${name}`);
      continue;
    }
    try {
      await ashbyPost("/application.changeStage", { applicationId: app.id, interviewStageId: archiveId });
      stats.archive.moved++;
      console.log(`      ✅ → Archived [${score}]: ${name}`);
    } catch (e) {
      stats.archive.errors++;
      console.log(`      ❌ Error on ${name}: ${e.message}`);
    }
    await sleep(150);
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n   📊 Summary for ${label}:`);
  console.log(`     Secondary Review (3):  moved=${stats.sec.moved}  skipped=${stats.sec.skipped}  notFound=${stats.sec.notFound}  errors=${stats.sec.errors}`);
  console.log(`     Archived (1/2):        moved=${stats.archive.moved}  skipped=${stats.archive.skipped}  notFound=${stats.archive.notFound}  errors=${stats.archive.errors}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🚀 Moving candidates across all 3 jobs...`);
  console.log(`   Score 3   → Secondary Review`);
  console.log(`   Score 1/2 → To Be Archived & Dispo`);
  console.log(`   (Only moves candidates currently in Application Review)`);

  for (const job of JOBS) {
    await processJob(job);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ All jobs complete.`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
