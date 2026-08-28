#!/usr/bin/env node
/**
 * Product Ops — move score 1 and 2 → "To Be Archived & Dispo"
 * Only touches candidates currently in "Application Review".
 * Run: node archive-prodops-12.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY  = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID     = "6d148a63-d9e2-48ad-910c-465ada648b4d";
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
      },
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

  const toArchive = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 2)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  console.log(`\n📋 Product Ops — Score 2 → To Be Archived & Dispo`);
  console.log(`   Candidates to archive: ${toArchive.length}`);

  console.log(`\n📥 Fetching applications from Ashby...`);
  const applications = await fetchAllApplications();
  console.log(`   Found ${applications.length} applications`);

  // Discover stages via jobInterviewPlan.info
  let appReviewId = null;
  let archiveId   = null;

  try {
    const plan   = await ashbyPost("/jobInterviewPlan.info", { jobId: JOB_ID });
    const stages = plan?.results?.interviewStages || [];
    console.log(`\n   Pipeline stages:`);
    for (const s of stages) {
      const t = (s.title || "").toLowerCase().trim();
      console.log(`     ${s.title}  (${s.id})`);
      if (!appReviewId && t === "application review")   appReviewId = s.id;
      if (!archiveId   && t.startsWith("to be archived")) archiveId = s.id;
    }
  } catch (e) {
    console.log(`   ⚠️  jobInterviewPlan.info failed: ${e.message} — falling back to application objects`);
  }

  // Fallback: scan currentInterviewStage
  if (!appReviewId || !archiveId) {
    for (const app of applications) {
      const s = app.currentInterviewStage;
      if (!s) continue;
      const t = (s.title || "").toLowerCase().trim();
      if (!appReviewId && t === "application review")   appReviewId = s.id;
      if (!archiveId   && t.startsWith("to be archived")) archiveId = s.id;
    }
  }

  if (!appReviewId) { console.error(`\n❌ Could not find "Application Review" stage. Aborting.`); process.exit(1); }
  if (!archiveId)   { console.error(`\n❌ Could not find "To Be Archived & Dispo" stage. Aborting.`); process.exit(1); }

  console.log(`\n   ✅ Application Review:     ${appReviewId}`);
  console.log(`   ✅ To Be Archived & Dispo: ${archiveId}`);

  // Build email → app map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  let moved = 0, skipped = 0, notFound = 0, errors = 0;

  console.log(`\n🗄️  Archiving...\n`);
  for (const { email, name, score } of toArchive) {
    const app = emailToApp[email];
    if (!app) { notFound++; console.log(`   ⚠️  Not found: ${name} (${email})`); continue; }

    const curId    = app.currentInterviewStage?.id;
    const curTitle = app.currentInterviewStage?.title || curId;

    if (curId !== appReviewId) {
      skipped++;
      console.log(`   ⏭️  Skipped [${score}] (${curTitle}): ${name}`);
      continue;
    }

    try {
      await ashbyPost("/application.changeStage", { applicationId: app.id, interviewStageId: archiveId });
      moved++;
      console.log(`   ✅ Archived [${score}]: ${name}`);
    } catch (e) {
      errors++;
      console.log(`   ❌ Error on ${name}: ${e.message}`);
    }
    await sleep(150);
  }

  console.log(`\n📊 Done:`);
  console.log(`   Moved:     ${moved}`);
  console.log(`   Skipped:   ${skipped}  (not in Application Review)`);
  console.log(`   Not found: ${notFound}`);
  if (errors) console.log(`   Errors:    ${errors}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
