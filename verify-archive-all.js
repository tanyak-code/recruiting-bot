#!/usr/bin/env node
/**
 * Verify + finish archiving for all three roles:
 *   Sr PM, Product Ops, Sr Manager TPM
 *
 * For each role:
 *  1. Loads cache, finds all score 1/2 candidates
 *  2. Fetches ALL applications from Ashby (paginated)
 *  3. Reports current stage for every score 1/2 candidate
 *  4. Moves any still in Application Review → To Be Archived & Dispo
 *
 * Run: node verify-archive-all.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY        = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const ARCHIVE_STAGE_ID = "227860b2-64a9-4616-ad8f-e82801452c50";
const APP_REVIEW_STAGE_ID = "6bfb34eb-148b-4bd4-9878-5b757516907a";

const JOBS = [
  {
    label:     "Sr. Product Manager (Jordan)",
    jobId:     "fb14d682-a04b-4db4-aed3-eed210e1673b",
    cacheFile: path.join(__dirname, "sr-pm-cache.json"),
  },
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
];

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

// ── Process one job ───────────────────────────────────────────────────────────
async function processJob(job) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`📋  ${job.label}`);
  console.log(`${"─".repeat(60)}`);

  if (!fs.existsSync(job.cacheFile)) {
    console.log(`   ❌ Cache file not found: ${job.cacheFile}`);
    return;
  }

  const cache = JSON.parse(fs.readFileSync(job.cacheFile, "utf8"));
  const lowScorers = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 1 || r.ourScore === 2)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  console.log(`   Score 1/2 in cache: ${lowScorers.length}`);
  console.log(`   Fetching Ashby applications...`);

  const applications = await fetchAllApplications(job.jobId);
  console.log(`   Active applications in Ashby: ${applications.length}`);

  // Build email → app map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  // Tally current stages
  let alreadyArchived = 0;
  let inAppReview     = 0;
  let otherStage      = 0;
  let notFound        = 0;
  let moved           = 0;
  let errors          = 0;
  const toMove        = [];
  const otherStageList = [];
  const notFoundList   = [];

  for (const { email, name, score } of lowScorers) {
    const app = emailToApp[email];
    if (!app) {
      notFound++;
      notFoundList.push(name);
      continue;
    }
    const stageId    = app.currentInterviewStage?.id;
    const stageTitle = app.currentInterviewStage?.title || stageId;

    if (stageId === ARCHIVE_STAGE_ID) {
      alreadyArchived++;
    } else if (stageId === APP_REVIEW_STAGE_ID) {
      inAppReview++;
      toMove.push({ app, name, score });
    } else {
      otherStage++;
      otherStageList.push({ name, stage: stageTitle });
    }
  }

  // Report current state
  console.log(`\n   Stage breakdown:`);
  console.log(`   ✅ Already in "To Be Archived & Dispo": ${alreadyArchived}`);
  console.log(`   🔄 Still in "Application Review":       ${inAppReview}`);
  console.log(`   ⏭️  In other stages (skipped):          ${otherStage}`);
  console.log(`   ⚠️  Not found in Ashby:                 ${notFound}`);

  if (otherStageList.length > 0 && otherStageList.length <= 10) {
    console.log(`\n   Other-stage candidates (not touched):`);
    otherStageList.forEach(({ name, stage }) => console.log(`      - ${name}  [${stage}]`));
  }

  // Move any still in Application Review
  if (toMove.length > 0) {
    console.log(`\n   🚀 Moving ${toMove.length} candidate(s) from Application Review → To Be Archived & Dispo...`);
    for (const { app, name, score } of toMove) {
      try {
        await ashbyPost("/application.changeStage", {
          applicationId:    app.id,
          interviewStageId: ARCHIVE_STAGE_ID,
        });
        moved++;
        process.stdout.write(`      ✅ Moved (score ${score}): ${name}\n`);
      } catch (e) {
        errors++;
        process.stdout.write(`      ❌ Error on ${name}: ${e.message}\n`);
      }
      await sleep(150);
    }
  } else {
    console.log(`\n   ✅ Nothing to move — all Application Review candidates are already archived.`);
  }

  // Final summary
  console.log(`\n   Summary:`);
  console.log(`   Total score 1/2 in cache:     ${lowScorers.length}`);
  console.log(`   Archived (pre-existing):      ${alreadyArchived}`);
  console.log(`   Moved this run:               ${moved}`);
  console.log(`   Skipped (other stage):        ${otherStage}`);
  console.log(`   Not found in Ashby:           ${notFound}`);
  if (errors) console.log(`   Errors:                       ${errors}`);
  console.log(`   Fully accounted for:          ${alreadyArchived + moved + otherStage + notFound} / ${lowScorers.length}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🔍  Verifying archive status across all three roles...`);
  for (const job of JOBS) {
    await processJob(job);
  }
  console.log(`\n${"─".repeat(60)}`);
  console.log(`✅  All roles processed.\n`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
