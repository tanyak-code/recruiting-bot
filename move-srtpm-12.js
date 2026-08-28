#!/usr/bin/env node
/**
 * Sr. Manager TPM (Ed) — move score 1/2 → To Be Archived & Dispo
 *
 * Step 1: run with DRY_RUN = true  → sees stage discovery + plan, no moves made
 * Step 2: set DRY_RUN = false      → actually moves candidates
 *
 * Rules:
 *   - Only moves candidates currently in "Application Review"
 *   - Score 1 or 2 → To Be Archived & Dispo (no archiveReasonId)
 *   - 150ms sleep between /application.changeStage calls
 *
 * Run: node move-srtpm-12.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const DRY_RUN    = false;  // ← flip to false to actually move
const ASHBY_KEY  = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID     = "59d95ceb-ba5e-4c01-8c05-c99076529012"; // Sr. Manager TPM (Ed)
const CACHE_FILE = path.join(__dirname, "sr-tpm-cache.json");

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

async function main() {
  // ── Load cache ──────────────────────────────────────────────────────────────
  const raw = fs.readFileSync(CACHE_FILE, "utf8");
  const cache = JSON.parse(raw);

  const toMove = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 1 || r.ourScore === 2)
    .map(([email, r]) => ({
      email: email.toLowerCase().trim(),
      name:  r.name,
      score: r.ourScore,
    }));

  console.log(`\n📋 Sr. Manager TPM (Ed) — score 1/2 → To Be Archived & Dispo`);
  console.log(`   Cache entries:         ${Object.keys(cache).length}`);
  console.log(`   Score 1/2 to move:     ${toMove.length}`);
  console.log(`   Mode:                  ${DRY_RUN ? "DRY RUN (no changes)" : "⚡ LIVE — moves will be made"}`);

  // ── Fetch applications ──────────────────────────────────────────────────────
  console.log(`\n📥 Fetching all applications from Ashby (job ${JOB_ID})...`);
  const applications = await fetchAllApplications(JOB_ID);
  console.log(`   Found ${applications.length} applications`);

  if (applications.length === 0) {
    console.error("❌ No applications returned — check job ID.");
    process.exit(1);
  }

  // ── Discover stage IDs ──────────────────────────────────────────────────────
  const stageMap = {}; // id → title
  for (const app of applications) {
    const stage = app.currentInterviewStage;
    if (stage?.id && !stageMap[stage.id]) stageMap[stage.id] = stage.title;
  }

  console.log(`\n   All stages found in applications:`);
  for (const [id, title] of Object.entries(stageMap)) {
    console.log(`     "${title}" [${id}]`);
  }

  let appReviewId = null;
  let archiveId   = null;

  for (const [id, title] of Object.entries(stageMap)) {
    const t = title.toLowerCase();
    if (!appReviewId && t.includes("application review")) appReviewId = id;
    if (!archiveId   && t.includes("to be archived"))     archiveId   = id;
  }

  if (!appReviewId) { console.error("\n❌ Could not find Application Review stage. Aborting."); process.exit(1); }
  if (!archiveId)   { console.error("\n❌ Could not find 'To Be Archived & Dispo' stage. Aborting."); process.exit(1); }

  console.log(`\n   ✅ Application Review:      ${appReviewId}`);
  console.log(`   ✅ To Be Archived & Dispo:  ${archiveId}`);

  // ── Build email → app map ───────────────────────────────────────────────────
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  // ── Preview / move ───────────────────────────────────────────────────────────
  console.log(`\n${DRY_RUN ? "🔍 DRY RUN — would move:" : "🗄️  Moving score 1/2 → To Be Archived & Dispo..."}\n`);

  let moved = 0, skipped = 0, notFound = 0, errors = 0;

  for (const { email, name, score } of toMove) {
    const app = emailToApp[email];
    if (!app) {
      notFound++;
      console.log(`   ⚠️  Not found in Ashby: ${name} <${email}>`);
      continue;
    }

    const currentStageId    = app.currentInterviewStage?.id;
    const currentStageTitle = app.currentInterviewStage?.title || currentStageId;

    if (currentStageId !== appReviewId) {
      skipped++;
      console.log(`   ⏭️  Skipped [${score}] (already in "${currentStageTitle}"): ${name}`);
      continue;
    }

    if (DRY_RUN) {
      moved++;
      console.log(`   ✓ Would move [${score}]: ${name}`);
    } else {
      try {
        await ashbyPost("/application.changeStage", {
          applicationId:    app.id,
          interviewStageId: archiveId,
        });
        moved++;
        console.log(`   ✅ Moved [${score}]: ${name}`);
      } catch (e) {
        errors++;
        console.log(`   ❌ Error on ${name}: ${e.message}`);
      }
      await sleep(150);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n📊 ${DRY_RUN ? "Dry run" : "Done"}:`);
  console.log(`   Would move / Moved: ${moved}`);
  console.log(`   Skipped (not in App Review): ${skipped}`);
  console.log(`   Not found in Ashby: ${notFound}`);
  if (errors) console.log(`   Errors: ${errors}`);

  if (DRY_RUN) {
    console.log(`\n👆 Dry run complete. Set DRY_RUN = false and rerun to make the moves.`);
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
