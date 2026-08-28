#!/usr/bin/env node
const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY  = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID     = "6d148a63-d9e2-48ad-910c-465ada648b4d"; // Product Ops (Ed)
const CACHE_FILE = path.join(__dirname, "prod-ops-cache.json");

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
  const score4s = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 4)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name }));

  console.log(`\n📋 Score 4 candidates in cache: ${score4s.length}`);
  console.log(`   Job: Product Ops (Ed)`);

  console.log(`\n📥 Fetching all applications from Ashby...`);
  const applications = await fetchAllApplications(JOB_ID);
  console.log(`   Found ${applications.length} active applications`);

  // Discover stage IDs from active apps first
  let appReviewStageId = null;
  let hmReviewStageId  = null;

  for (const app of applications) {
    const stage = app.currentInterviewStage;
    if (!stage) continue;
    const title = (stage.title || "").toLowerCase();
    if (!appReviewStageId && title.includes("application review"))        appReviewStageId = stage.id;
    if (!hmReviewStageId  && title.includes("hiring manager"))            hmReviewStageId  = stage.id;
    if (appReviewStageId && hmReviewStageId) break;
  }

  // Fallback: interview plan
  if (!appReviewStageId || !hmReviewStageId) {
    console.log(`   ⚠️  Some stages not found in active apps — fetching interview plan...`);
    const planResp = await ashbyPost("/jobInterviewPlan.info", { jobId: JOB_ID });
    const planStages = planResp.results?.interviewStages || planResp.interviewStages || [];
    if (planStages.length > 0) {
      console.log(`   Available stages:`);
      planStages.forEach(s => console.log(`     - "${s.title}" [${s.id}]`));
    }
    for (const stage of planStages) {
      const title = (stage.title || "").toLowerCase();
      if (!appReviewStageId && title.includes("application review"))  appReviewStageId = stage.id;
      if (!hmReviewStageId  && title.includes("hiring manager"))      hmReviewStageId  = stage.id;
    }
  }

  if (!appReviewStageId) { console.error("❌ Could not find Application Review stage ID."); process.exit(1); }
  if (!hmReviewStageId)  { console.error("❌ Could not find Hiring Manager Resume Review stage ID."); process.exit(1); }

  console.log(`   ✅ Application Review:           ${appReviewStageId}`);
  console.log(`   ✅ Hiring Manager Resume Review: ${hmReviewStageId}`);

  // Build email → app map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  console.log(`\n🔍 Checking current stages for all score-4 candidates...\n`);
  let moved = 0, skipped = 0, notFound = 0, errors = 0;

  for (const { email, name } of score4s) {
    const app = emailToApp[email];
    if (!app) {
      notFound++;
      process.stdout.write(`   ⚠️  Not found in Ashby: ${name}\n`);
      continue;
    }

    const currentStageId    = app.currentInterviewStage?.id;
    const currentStageTitle = app.currentInterviewStage?.title || currentStageId;

    if (currentStageId !== appReviewStageId) {
      skipped++;
      process.stdout.write(`   ✅ Already actioned (${currentStageTitle}): ${name}\n`);
      continue;
    }

    // Still in Application Review — move to HM Resume Review
    try {
      await ashbyPost("/application.changeStage", {
        applicationId:    app.id,
        interviewStageId: hmReviewStageId,
      });
      moved++;
      process.stdout.write(`   🚀 Moved → HM Resume Review: ${name}\n`);
    } catch (e) {
      errors++;
      process.stdout.write(`   ❌ Error on ${name}: ${e.message}\n`);
    }

    await sleep(150);
  }

  console.log(`\n📊 Done:`);
  console.log(`   Moved to HM Resume Review:   ${moved}`);
  console.log(`   Already in another stage:    ${skipped}`);
  console.log(`   Not found in Ashby:          ${notFound}`);
  if (errors) console.log(`   Errors:                      ${errors}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
