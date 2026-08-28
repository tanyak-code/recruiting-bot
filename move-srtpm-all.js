#!/usr/bin/env node
/**
 * Sr. Manager TPM — bulk stage mover
 *   Score 1/2 in Application Review  → To Be Archived & Dispo
 *   Score 3   in Application Review  → Secondary Review
 *   Score 4   skipped (already handled)
 *
 * Run: node move-srtpm-all.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

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

async function discoverStages(applications) {
  // First try from active applications
  let appReviewId   = null;
  let archiveId     = null;
  let secondaryId   = null;

  for (const app of applications) {
    const stage = app.currentInterviewStage;
    if (!stage) continue;
    const title = (stage.title || "").toLowerCase();
    if (!appReviewId && title.includes("application review"))           appReviewId = stage.id;
    if (!archiveId   && title.includes("to be archived"))               archiveId   = stage.id;
    if (!secondaryId && title.includes("secondary review"))             secondaryId = stage.id;
    if (appReviewId && archiveId && secondaryId) break;
  }

  // Fallback: interview plan
  if (!appReviewId || !archiveId || !secondaryId) {
    console.log(`   ⚠️  Some stages not found in active apps — fetching interview plan...`);
    const planResp = await ashbyPost("/jobInterviewPlan.info", { jobId: JOB_ID });
    const planStages = planResp.results?.interviewStages
      || planResp.interviewStages
      || planResp.results?.stages
      || planResp.stages
      || [];
    if (planStages.length > 0) {
      console.log(`   All available stages:`);
      planStages.forEach(s => console.log(`     - "${s.title}" [${s.id}]`));
    } else {
      console.log(`   ⚠️  Interview plan returned no stages. Raw keys: ${Object.keys(planResp).join(", ")}`);
      if (planResp.results) console.log(`   results keys: ${Object.keys(planResp.results).join(", ")}`);
    }
    for (const stage of planStages) {
      const title = (stage.title || "").toLowerCase();
      if (!appReviewId && title.includes("application review"))         appReviewId = stage.id;
      if (!archiveId   && title.includes("to be archived"))             archiveId   = stage.id;
      if (!secondaryId && title.includes("secondary review"))           secondaryId = stage.id;
    }
  }

  return { appReviewId, archiveId, secondaryId };
}

async function main() {
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));

  const toArchive   = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 1 || r.ourScore === 2)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  const toSecondary = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 3)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name }));

  console.log(`\n📋 Sr. Manager TPM (Ed)`);
  console.log(`   Score 1/2 → To Be Archived & Dispo: ${toArchive.length}`);
  console.log(`   Score 3   → Secondary Review:        ${toSecondary.length}`);

  console.log(`\n📥 Fetching all applications from Ashby...`);
  const applications = await fetchAllApplications(JOB_ID);
  console.log(`   Found ${applications.length} active applications`);

  const { appReviewId, archiveId, secondaryId } = await discoverStages(applications);

  if (!appReviewId) { console.error("❌ Could not find Application Review stage. Aborting."); process.exit(1); }
  if (!archiveId)   { console.error("❌ Could not find To Be Archived & Dispo stage. Aborting."); process.exit(1); }
  if (!secondaryId) { console.error("⚠️  Could not find Secondary Review stage — will skip score-3 moves. Check stage names above."); }

  console.log(`\n   ✅ Application Review:      ${appReviewId}`);
  console.log(`   ✅ To Be Archived & Dispo:  ${archiveId}`);
  console.log(`   ✅ Secondary Review:         ${secondaryId}`);

  // Build email → app map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  // ── Move score 1/2 → Archive ────────────────────────────────────────────────
  console.log(`\n🗄️  Moving score 1/2 → To Be Archived & Dispo...\n`);
  let arcMoved = 0, arcSkipped = 0, arcNotFound = 0, arcErrors = 0;

  for (const { email, name, score } of toArchive) {
    const app = emailToApp[email];
    if (!app) { arcNotFound++; process.stdout.write(`   ⚠️  Not found: ${name}\n`); continue; }

    const currentStageId    = app.currentInterviewStage?.id;
    const currentStageTitle = app.currentInterviewStage?.title || currentStageId;

    if (currentStageId !== appReviewId) {
      arcSkipped++;
      process.stdout.write(`   ⏭️  Skipped [${score}] (${currentStageTitle}): ${name}\n`);
      continue;
    }

    try {
      await ashbyPost("/application.changeStage", { applicationId: app.id, interviewStageId: archiveId });
      arcMoved++;
      process.stdout.write(`   ✅ Archived [${score}]: ${name}\n`);
    } catch (e) {
      arcErrors++;
      process.stdout.write(`   ❌ Error on ${name}: ${e.message}\n`);
    }
    await sleep(150);
  }

  // ── Move score 3 → Secondary Review ─────────────────────────────────────────
  if (!secondaryId) {
    console.log(`\n⚠️  Skipping score-3 moves — Secondary Review stage not found. Tell Claude the exact stage name from the list above.`);
    return;
  }
  console.log(`\n🔵 Moving score 3 → Secondary Review...\n`);
  let secMoved = 0, secSkipped = 0, secNotFound = 0, secErrors = 0;

  for (const { email, name } of toSecondary) {
    const app = emailToApp[email];
    if (!app) { secNotFound++; process.stdout.write(`   ⚠️  Not found: ${name}\n`); continue; }

    const currentStageId    = app.currentInterviewStage?.id;
    const currentStageTitle = app.currentInterviewStage?.title || currentStageId;

    if (currentStageId !== appReviewId) {
      secSkipped++;
      process.stdout.write(`   ⏭️  Skipped (${currentStageTitle}): ${name}\n`);
      continue;
    }

    try {
      await ashbyPost("/application.changeStage", { applicationId: app.id, interviewStageId: secondaryId });
      secMoved++;
      process.stdout.write(`   ✅ → Secondary Review: ${name}\n`);
    } catch (e) {
      secErrors++;
      process.stdout.write(`   ❌ Error on ${name}: ${e.message}\n`);
    }
    await sleep(150);
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n📊 Done:`);
  console.log(`   Archived (score 1/2):`);
  console.log(`     Moved:     ${arcMoved}`);
  console.log(`     Skipped:   ${arcSkipped}`);
  console.log(`     Not found: ${arcNotFound}`);
  if (arcErrors) console.log(`     Errors:    ${arcErrors}`);
  console.log(`   Secondary Review (score 3):`);
  console.log(`     Moved:     ${secMoved}`);
  console.log(`     Skipped:   ${secSkipped}`);
  console.log(`     Not found: ${secNotFound}`);
  if (secErrors) console.log(`     Errors:    ${secErrors}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
