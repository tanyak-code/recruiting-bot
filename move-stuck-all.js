#!/usr/bin/env node
/**
 * Move all stuck candidates out of Application Review across all 4 jobs.
 *   Score 1 → To Be Archived & Dispo
 *   Score 2 → To Be Archived & Dispo
 *   Score 3 → Secondary Review
 *   Score 4 → Hiring Manager Resume Review
 *
 * Only moves candidates currently in Application Review.
 * Run: node move-stuck-all.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";

const JOBS = [
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
  {
    label:     "Staff SWE (Mitch)",
    jobId:     "203af220-b197-4a58-827f-072cb1ae0611",
    cacheFile: path.join(__dirname, "staff-swe-cache.json"),
  },
  {
    label:     "Sr. PM (Jordan)",
    jobId:     "fb14d682-a04b-4db4-aed3-eed210e1673b",
    cacheFile: path.join(__dirname, "sr-pm-cache.json"),
  },
];

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

async function discoverStages(jobId, applications) {
  let appReviewId = null;
  let archiveId   = null;
  let secondaryId = null;
  let hmResumeId  = null;

  const seen = new Map();

  // Primary: jobInterviewPlan.info
  try {
    const plan = await ashbyPost("/jobInterviewPlan.info", { jobId });
    for (const s of (plan?.results?.interviewStages || [])) {
      const t = (s.title || "").toLowerCase().trim();
      seen.set(s.id, s.title);
      if (!appReviewId && t === "application review")           appReviewId = s.id;
      if (!archiveId   && t.startsWith("to be archived"))       archiveId   = s.id;
      if (!secondaryId && t === "secondary review")             secondaryId = s.id;
      if (!hmResumeId  && t === "hiring manager resume review") hmResumeId  = s.id;
    }
  } catch {}

  // Fallback: scan application objects
  for (const app of applications) {
    const s = app.currentInterviewStage;
    if (!s) continue;
    const t = (s.title || "").toLowerCase().trim();
    if (!seen.has(s.id)) seen.set(s.id, s.title);
    if (!appReviewId && t === "application review")           appReviewId = s.id;
    if (!archiveId   && t.startsWith("to be archived"))       archiveId   = s.id;
    if (!secondaryId && t === "secondary review")             secondaryId = s.id;
    if (!hmResumeId  && t === "hiring manager resume review") hmResumeId  = s.id;
  }

  console.log(`\n   Pipeline stages:`);
  for (const [id, title] of seen) {
    const marker =
      id === appReviewId ? " ← Application Review" :
      id === archiveId   ? " ← To Be Archived & Dispo" :
      id === secondaryId ? " ← Secondary Review" :
      id === hmResumeId  ? " ← Hiring Manager Resume Review" : "";
    console.log(`     ${title}${marker}`);
  }

  return { appReviewId, archiveId, secondaryId, hmResumeId };
}

async function processJob({ label, jobId, cacheFile }) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🏢 ${label}`);
  console.log(`${"═".repeat(60)}`);

  if (!fs.existsSync(cacheFile)) {
    console.log(`   ⚠️  No cache file — skipping.`);
    return;
  }

  const cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));

  const buckets = { 4: [], 3: [], 2: [], 1: [] };
  for (const [email, rec] of Object.entries(cache)) {
    const s = rec.ourScore;
    if (buckets[s]) buckets[s].push({ email: email.toLowerCase().trim(), name: rec.name || email, score: s });
  }

  console.log(`\n   Cache breakdown:`);
  console.log(`     Score 4 → HM Resume Review:      ${buckets[4].length}`);
  console.log(`     Score 3 → Secondary Review:       ${buckets[3].length}`);
  console.log(`     Score 2 → To Be Archived & Dispo: ${buckets[2].length}`);
  console.log(`     Score 1 → To Be Archived & Dispo: ${buckets[1].length}`);

  console.log(`\n   Fetching Ashby applications...`);
  const applications = await fetchAllApplications(jobId);
  console.log(`   Found ${applications.length} applications`);

  const { appReviewId, archiveId, secondaryId, hmResumeId } = await discoverStages(jobId, applications);

  if (!appReviewId) { console.error(`\n   ❌ Could not find Application Review stage — aborting.`); return; }
  if (!archiveId)   { console.error(`\n   ❌ Could not find To Be Archived & Dispo stage — aborting.`); return; }
  if (!secondaryId) { console.error(`\n   ❌ Could not find Secondary Review stage — aborting.`); return; }
  if (!hmResumeId)  { console.error(`\n   ❌ Could not find Hiring Manager Resume Review stage — aborting.`); return; }

  // Build email → app map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  const stats = { moved: 0, skipped: 0, notFound: 0, errors: 0 };

  async function moveGroup(candidates, targetId, targetLabel) {
    if (!candidates.length) return;
    console.log(`\n   Moving score ${candidates[0].score}${candidates[0].score <= 2 ? "/1" : ""} → ${targetLabel} (${candidates.length})...\n`);
    for (const { email, name, score } of candidates) {
      const app = emailToApp[email];
      if (!app) { stats.notFound++; continue; }

      const curId    = app.currentInterviewStage?.id;
      const curTitle = app.currentInterviewStage?.title || curId;

      if (curId !== appReviewId) {
        stats.skipped++;
        process.stdout.write(`      ⏭️  Already actioned (${curTitle}): ${name}\n`);
        continue;
      }

      try {
        await ashbyPost("/application.changeStage", { applicationId: app.id, interviewStageId: targetId });
        stats.moved++;
        process.stdout.write(`      ✅ [${score}] → ${targetLabel}: ${name}\n`);
      } catch (e) {
        stats.errors++;
        process.stdout.write(`      ❌ Error on ${name}: ${e.message}\n`);
      }
      await sleep(150);
    }
  }

  await moveGroup(buckets[4], hmResumeId,  "HM Resume Review");
  await moveGroup(buckets[3], secondaryId, "Secondary Review");
  await moveGroup([...buckets[2], ...buckets[1]], archiveId, "To Be Archived & Dispo");

  console.log(`\n   📊 ${label} complete:`);
  console.log(`      Moved:     ${stats.moved}`);
  console.log(`      Skipped:   ${stats.skipped} (already actioned)`);
  console.log(`      Not found: ${stats.notFound}`);
  if (stats.errors) console.log(`      Errors:    ${stats.errors}`);
}

async function main() {
  console.log(`\n🚀 Moving all stuck candidates across all 4 jobs...`);
  console.log(`   Score 1/2 → To Be Archived & Dispo`);
  console.log(`   Score 3   → Secondary Review`);
  console.log(`   Score 4   → Hiring Manager Resume Review`);
  console.log(`   (Only moves candidates currently in Application Review)\n`);

  for (const job of JOBS) {
    await processJob(job);
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`✅ All done. Run verify-all-actioned.js to confirm.`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
