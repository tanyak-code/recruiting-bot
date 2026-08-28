#!/usr/bin/env node
/**
 * Move score-3 Product Ops candidates from Application Review → Secondary Review
 * Reads prod-ops-cache.json, finds all score-3 candidates,
 * matches by email in Ashby, and ONLY moves them if they are
 * currently in "Application Review". Skips anyone in any other stage.
 *
 * Stage IDs are discovered dynamically from application objects.
 *
 * Run: node move-score3-secondary.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY  = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID     = "6d148a63-d9e2-48ad-910c-465ada648b4d"; // Product Ops (Ed)
const CACHE_FILE = path.join(__dirname, "prod-ops-cache.json");

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

// ── Main ───────────────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(CACHE_FILE)) {
    console.error("Cache file not found:", CACHE_FILE);
    process.exit(1);
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  const score3s = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 3)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  console.log(`\n📋 Score 3 candidates in cache: ${score3s.length}`);
  console.log(`   Job: Product Ops (Ed)`);

  console.log(`\n📥 Fetching all applications from Ashby...`);
  const applications = await fetchAllApplications(JOB_ID);
  console.log(`   Found ${applications.length} active applications`);

  // Dynamically discover stage IDs from application objects
  let appReviewStageId    = null;
  let secondaryReviewStageId = null;

  for (const app of applications) {
    const stage = app.currentInterviewStage;
    if (!stage) continue;
    const title = (stage.title || "").toLowerCase();
    if (!appReviewStageId && title.includes("application review")) {
      appReviewStageId = stage.id;
    }
    if (!secondaryReviewStageId && title.includes("secondary review")) {
      secondaryReviewStageId = stage.id;
    }
    if (appReviewStageId && secondaryReviewStageId) break;
  }

  if (!appReviewStageId) {
    console.error("❌ Could not find Application Review stage ID. Aborting.");
    process.exit(1);
  }
  if (!secondaryReviewStageId) {
    console.error("❌ Could not find Secondary Review stage ID. Aborting.");
    console.error("   Make sure at least one candidate is currently in 'Secondary Review' in Ashby,");
    console.error("   or that the stage name exactly matches 'Secondary Review'.");
    process.exit(1);
  }

  console.log(`   ✅ Application Review stage ID:  ${appReviewStageId}`);
  console.log(`   ✅ Secondary Review stage ID:    ${secondaryReviewStageId}`);

  // Build email → app map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  // Move score-3 candidates currently in Application Review
  console.log(`\n🚀 Moving score-3 candidates (Application Review only) → Secondary Review...\n`);
  let moved = 0, skipped = 0, notFound = 0, errors = 0;
  const skippedList = [];
  const notFoundList = [];

  for (const { email, name } of score3s) {
    const app = emailToApp[email];
    if (!app) {
      notFound++;
      notFoundList.push(name);
      process.stdout.write(`   ⚠️  Not found in Ashby: ${name}\n`);
      continue;
    }

    const currentStageId    = app.currentInterviewStage?.id;
    const currentStageTitle = app.currentInterviewStage?.title || currentStageId;

    if (currentStageId !== appReviewStageId) {
      skipped++;
      skippedList.push({ name, stage: currentStageTitle });
      process.stdout.write(`   ⏭️  Skipped (stage: ${currentStageTitle}): ${name}\n`);
      continue;
    }

    try {
      await ashbyPost("/application.changeStage", {
        applicationId:    app.id,
        interviewStageId: secondaryReviewStageId,
      });
      moved++;
      process.stdout.write(`   ✅ Moved: ${name}\n`);
    } catch (e) {
      errors++;
      process.stdout.write(`   ❌ Error on ${name}: ${e.message}\n`);
    }

    await sleep(150);
  }

  console.log(`\n📊 Done:`);
  console.log(`   Moved to Secondary Review:   ${moved}`);
  console.log(`   Skipped (not in App Review): ${skipped}`);
  console.log(`   Not found in Ashby:          ${notFound}`);
  if (errors) console.log(`   Errors:                      ${errors}`);

  if (skippedList.length > 0) {
    console.log(`\nSkipped candidates (already in another stage):`);
    skippedList.forEach(({ name, stage }) => console.log(`   - ${name}  [${stage}]`));
  }
  if (notFoundList.length > 0) {
    console.log(`\nNot found in Ashby (may be archived or different email):`);
    notFoundList.forEach(n => console.log(`   - ${n}`));
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
