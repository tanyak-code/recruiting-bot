#!/usr/bin/env node
/**
 * Archive score-1 and score-2 Staff SWE candidates in Ashby
 * Reads staff-swe-cache.json, finds all score-1 and score-2 candidates,
 * matches them by email in Ashby, and ONLY moves them if they are
 * currently in "Application Review" stage. Skips anyone in any other stage.
 *
 * Run: node archive-staff-swe.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY  = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID     = "203af220-b197-4a58-827f-072cb1ae0611"; // Mitch's Staff SWE
const CACHE_FILE = path.join(__dirname, "staff-swe-cache.json");

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

async function main() {
  if (!fs.existsSync(CACHE_FILE)) {
    console.error("❌ Cache file not found:", CACHE_FILE);
    process.exit(1);
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  const lowScorers = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 1 || r.ourScore === 2)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  console.log(`\n📋 Score 1/2 candidates in cache: ${lowScorers.length}`);

  console.log(`\n📥 Fetching all applications for Staff SWE job...`);
  const applications = await fetchAllApplications(JOB_ID);
  console.log(`   Found ${applications.length} applications`);

  // Discover stage IDs dynamically from actual applications
  let appReviewStageId = null;
  let archiveStageId   = null;
  for (const app of applications) {
    const title = (app.currentInterviewStage?.title || "").toLowerCase().trim();
    if (!appReviewStageId && title === "application review")    appReviewStageId = app.currentInterviewStage.id;
    if (!archiveStageId   && title.startsWith("to be archived")) archiveStageId  = app.currentInterviewStage.id;
    if (appReviewStageId && archiveStageId) break;
  }

  if (!appReviewStageId) {
    console.error("❌ Could not find Application Review stage. Aborting.");
    process.exit(1);
  }
  if (!archiveStageId) {
    console.error("❌ Could not find To Be Archived & Dispo stage. Aborting.");
    process.exit(1);
  }

  console.log(`   ✅ Application Review:     ${appReviewStageId}`);
  console.log(`   ✅ To Be Archived & Dispo: ${archiveStageId}`);

  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  console.log(`\n🗄️  Archiving score 1/2 candidates (Application Review only)...\n`);
  let moved = 0, skipped = 0, notFound = 0, errors = 0;

  for (const { email, name, score } of lowScorers) {
    const app = emailToApp[email];
    if (!app) {
      notFound++;
      console.log(`   ⚠️  Not found in Ashby: ${name}`);
      continue;
    }

    const currentStageId = app.currentInterviewStage?.id;
    if (currentStageId !== appReviewStageId) {
      skipped++;
      console.log(`   ⏭️  Skipped (not in App Review): ${name} [${app.currentInterviewStage?.title || currentStageId}]`);
      continue;
    }

    try {
      await ashbyPost("/application.changeStage", {
        applicationId:    app.id,
        interviewStageId: archiveStageId,
      });
      moved++;
      console.log(`   ✅ Archived (score ${score}): ${name}`);
    } catch (e) {
      errors++;
      console.log(`   ❌ Error on ${name}: ${e.message}`);
    }

    await sleep(150);
  }

  console.log(`\n📊 Done:`);
  console.log(`   Moved to archive:      ${moved}`);
  console.log(`   Skipped (wrong stage): ${skipped}`);
  console.log(`   Not found in Ashby:    ${notFound}`);
  if (errors) console.log(`   Errors:                ${errors}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
