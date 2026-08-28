#!/usr/bin/env node
/**
 * Staff SWE Backend (Keith/Fable) — disposition all screened candidates
 *
 * Ashby Job ID: 751790c7-b317-4ae8-8638-a4998f0ba8d1
 * Cache:        keith-cache.json
 *
 * Routing:
 *   Score 1 or 2  → To Be Archived & Dispo  (fa02c188-64fb-4362-8c89-d59e76d615ee)
 *   Score 3       → Recruiter Screen          (3e40b0ca-d3cb-4391-83db-cc5c3141d21d)
 *
 * Rules:
 *   - ONLY moves candidates currently in Application Review
 *   - Never moves candidates in any other stage
 *   - 150ms sleep between /application.changeStage calls
 *   - No archiveReasonId needed for To Be Archived & Dispo
 *
 * Run: node move-keith-all.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const DRY_RUN    = false;  // ← flip to false to actually move
const ASHBY_KEY  = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID     = "751790c7-b317-4ae8-8638-a4998f0ba8d1"; // Staff SWE Backend (Keith/Fable)
const CACHE_FILE = path.join(__dirname, "keith-cache.json");

// Hardcoded stage IDs — confirmed via probe-keith-stages.js 2026-08-13
// Two Application Review IDs exist (old + new pipeline) — check both
const APP_REVIEW_STAGE_IDS = new Set([
  "48b9cd47-2727-45a1-8718-0ba07482df46", // Application Review (1131 candidates)
  "942880bf-abc7-4d68-b3ba-a8eafe5b23e0", // Application Review (46 candidates — secondary pipeline)
]);
const ARCHIVE_STAGE_ID    = "b130fb25-4d5f-4af5-a00e-ca85fc24912f"; // To Be Archived & Dispo
const RECRUITER_SCREEN_ID = "dc81064a-7cda-40a6-8bbe-f535454fa360"; // Recruiter Screen

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
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));

  const toArchive = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 1 || r.ourScore === 2)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  const toScreen = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 3)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  console.log(`\n━━━ Keith · Staff SWE Backend — Disposition Run ━━━\n`);
  console.log(`   Job ID:               ${JOB_ID}`);
  console.log(`   Cache entries:        ${Object.keys(cache).length}`);
  console.log(`   Score 1/2 → Archive:  ${toArchive.length}`);
  console.log(`   Score 3 → Recruiter Screen: ${toScreen.length}`);
  console.log(`   Mode:                 ${DRY_RUN ? "🔍 DRY RUN (no changes)" : "⚡ LIVE — moves will be made"}\n`);

  console.log(`📥 Fetching all applications from Ashby...`);
  const applications = await fetchAllApplications(JOB_ID);
  console.log(`   Found ${applications.length} applications\n`);

  if (applications.length === 0) {
    console.error("❌ No applications returned — check job ID.");
    process.exit(1);
  }

  // Build email → app map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  let moved = 0, errors = 0;
  const skippedList  = []; // { name, score, stage }
  const notFoundList = []; // { name, score, email }

  // ── Score 1/2 → To Be Archived & Dispo ─────────────────────────────────────
  console.log(`${DRY_RUN ? "🔍 DRY RUN —" : "🗄️ "} Score 1/2 → To Be Archived & Dispo\n`);

  for (const { email, name, score } of toArchive) {
    const app = emailToApp[email];
    if (!app) {
      notFoundList.push({ name, score, email });
      continue;
    }

    const currentStageId    = app.currentInterviewStage?.id;
    const currentStageTitle = app.currentInterviewStage?.title || currentStageId;

    if (!APP_REVIEW_STAGE_IDS.has(currentStageId)) {
      skippedList.push({ name, score, stage: currentStageTitle });
      continue;
    }

    if (DRY_RUN) {
      moved++;
      console.log(`   ✓ Would archive [${score}]: ${name}`);
    } else {
      try {
        await ashbyPost("/application.changeStage", {
          applicationId:    app.id,
          interviewStageId: ARCHIVE_STAGE_ID,
        });
        moved++;
        console.log(`   ✅ Archived [${score}]: ${name}`);
      } catch (e) {
        errors++;
        console.log(`   ❌ Error on ${name}: ${e.message}`);
      }
      await sleep(150);
    }
  }

  // ── Score 3 → Recruiter Screen ──────────────────────────────────────────────
  console.log(`\n${DRY_RUN ? "🔍 DRY RUN —" : "🔵 "} Score 3 → Recruiter Screen\n`);

  for (const { email, name, score } of toScreen) {
    const app = emailToApp[email];
    if (!app) {
      notFoundList.push({ name, score, email });
      continue;
    }

    const currentStageId    = app.currentInterviewStage?.id;
    const currentStageTitle = app.currentInterviewStage?.title || currentStageId;

    if (!APP_REVIEW_STAGE_IDS.has(currentStageId)) {
      skippedList.push({ name, score, stage: currentStageTitle });
      continue;
    }

    if (DRY_RUN) {
      moved++;
      console.log(`   ✓ Would move to Recruiter Screen [${score}]: ${name}`);
    } else {
      try {
        await ashbyPost("/application.changeStage", {
          applicationId:    app.id,
          interviewStageId: RECRUITER_SCREEN_ID,
        });
        moved++;
        console.log(`   ✅ Recruiter Screen [${score}]: ${name}`);
      } catch (e) {
        errors++;
        console.log(`   ❌ Error on ${name}: ${e.message}`);
      }
      await sleep(150);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n📊 ${DRY_RUN ? "Dry run complete" : "Done"}:`);
  console.log(`   ${DRY_RUN ? "Would move" : "Moved"}:                    ${moved}`);
  console.log(`   Skipped (not in App Review): ${skippedList.length}`);
  console.log(`   Not found in Ashby:          ${notFoundList.length}`);
  if (errors) console.log(`   Errors:                      ${errors}`);

  if (skippedList.length) {
    console.log(`\n⏭️  Skipped — already past Application Review:`);
    for (const { name, score, stage } of skippedList) {
      console.log(`   [${score}] ${name} — ${stage}`);
    }
  }

  if (notFoundList.length) {
    console.log(`\n⚠️  Not found in Ashby (email mismatch?):`);
    for (const { name, score, email } of notFoundList) {
      console.log(`   [${score}] ${name} <${email}>`);
    }
  }

  if (DRY_RUN) {
    console.log(`\n👆 Set DRY_RUN = false and rerun to apply.`);
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
