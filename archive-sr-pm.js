#!/usr/bin/env node
/**
 * Archive score-1 and score-2 Sr PM candidates in Ashby
 * Reads sr-pm-cache.json, finds all score-1 and score-2 candidates,
 * matches them by email in Ashby, and ONLY moves them if they are
 * currently in "Application Review" stage. Skips anyone in any other stage.
 *
 * Run: node archive-sr-pm.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY        = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID           = "fb14d682-a04b-4db4-aed3-eed210e1673b"; // Sr PM Ashby Job ID
const ARCHIVE_STAGE_ID = "4a58c5ee-1cd0-4f1c-aeea-f1111255edfa"; // To Be Archived & Dispo (Sr PM)
const CACHE_FILE       = path.join(__dirname, "sr-pm-cache.json");

// ── Ashby API helper ──────────────────────────────────────────────────────────
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
      }
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => {
        try { resolve(JSON.parse(d)); }
        catch { resolve({ raw: d }); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Fetch all applications for the job (paginated) ────────────────────────────
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

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(CACHE_FILE)) {
    console.error("Cache file not found:", CACHE_FILE);
    process.exit(1);
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  const lowScorers = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 1 || r.ourScore === 2)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  console.log(`\n📋 Score 1/2 candidates in cache: ${lowScorers.length}`);
  console.log(`   Target stage: "To Be Archived & Dispo" (${ARCHIVE_STAGE_ID})`);

  console.log(`\n📥 Fetching all applications for Sr PM job...`);
  const applications = await fetchAllApplications(JOB_ID);
  console.log(`   Found ${applications.length} active applications`);

  // Dynamically discover Application Review stage ID from actual applications
  let appReviewStageId = null;
  for (const app of applications) {
    const stage = app.currentInterviewStage;
    if (stage && stage.title && stage.title.toLowerCase().includes("application review")) {
      appReviewStageId = stage.id;
      break;
    }
  }
  if (!appReviewStageId) {
    console.error("❌ Could not find Application Review stage ID from applications. Aborting.");
    process.exit(1);
  }
  console.log(`   ✅ Application Review stage ID: ${appReviewStageId}`);

  // Build email → application map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  // Move — ONLY if currently in Application Review
  console.log(`\n🚀 Moving score-1/2 candidates (Application Review only) to "To Be Archived & Dispo"...\n`);
  let moved = 0, skipped = 0, notFound = 0, errors = 0;
  const notFoundNames = [];

  for (const { email, name, score } of lowScorers) {
    const app = emailToApp[email];
    if (!app) {
      notFound++;
      notFoundNames.push(name);
      process.stdout.write(`   ⚠️  Not found in Ashby: ${name}\n`);
      continue;
    }

    const currentStageId = app.currentInterviewStage?.id;
    if (currentStageId !== appReviewStageId) {
      skipped++;
      process.stdout.write(`   ⏭️  Skipped (not in Application Review): ${name} [stage: ${app.currentInterviewStage?.title || currentStageId}]\n`);
      continue;
    }

    try {
      await ashbyPost("/application.changeStage", {
        applicationId:    app.id,
        interviewStageId: ARCHIVE_STAGE_ID,
      });
      moved++;
      process.stdout.write(`   ✅ Archived (score ${score}): ${name}\n`);
    } catch (e) {
      errors++;
      process.stdout.write(`   ❌ Error on ${name}: ${e.message}\n`);
    }

    await sleep(150);
  }

  console.log(`\n📊 Done:`);
  console.log(`   Moved to archive:        ${moved}`);
  console.log(`   Skipped (wrong stage):   ${skipped}`);
  console.log(`   Not found in Ashby:      ${notFound}`);
  console.log(`   Errors:                  ${errors}`);

  if (notFoundNames.length > 0) {
    console.log(`\nNot found (may already be archived or in a different job):`);
    notFoundNames.forEach(n => console.log(`   - ${n}`));
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
