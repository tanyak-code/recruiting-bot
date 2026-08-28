#!/usr/bin/env node
/**
 * Archive score-1 and score-2 Product Ops candidates in Ashby
 * Reads prod-ops-cache.json, finds all score-1 and score-2 candidates,
 * matches them by email in Ashby, and ONLY moves them if they are
 * currently in "Application Review" stage. Skips anyone in any other stage.
 *
 * Run: node archive-score2.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY            = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID               = "6d148a63-d9e2-48ad-910c-465ada648b4d";
const ARCHIVE_STAGE_ID     = "227860b2-64a9-4616-ad8f-e82801452c50"; // "To Be Archived & Dispo"
const APP_REVIEW_STAGE_ID  = "6bfb34eb-148b-4bd4-9878-5b757516907a"; // "Application Review"
const CACHE_FILE           = path.join(__dirname, "prod-ops-cache.json");

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
        "Content-Type":  "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization": "Basic " + encoded,
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
  // 1. Load cache and extract score-2 candidates
  if (!fs.existsSync(CACHE_FILE)) {
    console.error("Cache file not found:", CACHE_FILE);
    process.exit(1);
  }
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  const lowScorers = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 1 || r.ourScore === 2)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  console.log(`\n📋 Score 1/2 candidates in cache: ${lowScorers.length}`);

  console.log(`   ✅ Target stage: "To Be Archived & Dispo" (${ARCHIVE_STAGE_ID})`);

  // 3. Fetch all applications for the job
  console.log(`\n📥 Fetching all applications for Product Ops job...`);
  const applications = await fetchAllApplications(JOB_ID);
  console.log(`   Found ${applications.length} active applications`);

  // Build email → application map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  // 4. Match and move — ONLY if currently in Application Review
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
    if (currentStageId !== APP_REVIEW_STAGE_ID) {
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

    await sleep(150); // gentle rate limiting
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
