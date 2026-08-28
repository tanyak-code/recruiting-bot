#!/usr/bin/env node
/**
 * Move Sr TPM score-3 candidates from Application Review → "Reached Out"
 * Run: node move-tpm-3s-reached-out.js
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

async function fetchAllApplications() {
  const all = []; let cursor = null;
  while (true) {
    const payload = { jobId: JOB_ID, limit: 100 };
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

  const score3s = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 3 && r.name !== "Orin Orlopp")
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name }));

  console.log(`\n📋 Sr TPM score-3s to move: ${score3s.length}`);

  console.log(`\n📥 Fetching all Ashby applications...`);
  const applications = await fetchAllApplications();
  console.log(`   Found ${applications.length} applications`);

  // Discover stage IDs from applications
  let appReviewId  = null;
  let reachedOutId = null;

  for (const app of applications) {
    const t = (app.currentInterviewStage?.title || "").toLowerCase();
    if (!appReviewId  && t.includes("application review")) appReviewId  = app.currentInterviewStage.id;
    if (!reachedOutId && t.includes("reached out"))        reachedOutId = app.currentInterviewStage.id;
    if (appReviewId && reachedOutId) break;
  }

  // Fallback: interview plan
  if (!appReviewId || !reachedOutId) {
    console.log(`   Some stages not found in active apps — checking interview plan...`);
    const plan = await ashbyPost("/jobInterviewPlan.info", { jobId: JOB_ID });
    const stages = plan?.results?.interviewStages || [];
    console.log(`   All stages in pipeline:`);
    stages.forEach(s => console.log(`     "${s.title}" [${s.id}]`));
    for (const s of stages) {
      const t = (s.title || "").toLowerCase();
      if (!appReviewId  && t.includes("application review")) appReviewId  = s.id;
      if (!reachedOutId && t.includes("reached out"))        reachedOutId = s.id;
    }
  }

  if (!appReviewId)  { console.error("❌ Could not find Application Review stage. Aborting."); process.exit(1); }
  if (!reachedOutId) { console.error("❌ Could not find 'Reached Out' stage. Aborting."); process.exit(1); }

  console.log(`   ✅ Application Review: ${appReviewId}`);
  console.log(`   ✅ Reached Out:        ${reachedOutId}`);

  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  console.log(`\n🚀 Moving score-3s (Application Review only) → Reached Out...\n`);
  let moved = 0, skipped = 0, notFound = 0, errors = 0;

  for (const { email, name } of score3s) {
    const app = emailToApp[email];
    if (!app) { notFound++; console.log(`   ⚠️  Not in Ashby: ${name}`); continue; }

    const curId = app.currentInterviewStage?.id;
    if (curId !== appReviewId) {
      skipped++;
      console.log(`   ⏭️  Skipped (not in App Review): ${name} [${app.currentInterviewStage?.title || curId}]`);
      continue;
    }

    try {
      await ashbyPost("/application.changeStage", { applicationId: app.id, interviewStageId: reachedOutId });
      moved++;
      console.log(`   ✅ Moved: ${name}`);
    } catch (e) {
      errors++;
      console.log(`   ❌ Error: ${name} — ${e.message}`);
    }
    await sleep(150);
  }

  console.log(`\n📊 Done:`);
  console.log(`   Moved to Reached Out:  ${moved}`);
  console.log(`   Skipped (wrong stage): ${skipped}`);
  console.log(`   Not found in Ashby:    ${notFound}`);
  if (errors) console.log(`   Errors:                ${errors}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
