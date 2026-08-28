#!/usr/bin/env node
/**
 * archive-low-brainner.js
 * Pull Brainner score 0–50 candidates for Sr PM + Sr TPM,
 * match to Ashby by email, move from Application Review → To Be Archived & Dispo.
 * No AI analysis — pure API calls, zero Claude cost.
 */

const https = require("https");

const ASHBY_KEY    = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const BRAINNER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";

const SCORE_CUTOFF = 50;

const JOBS = [
  {
    name:          "Sr. Product Manager (Jordan)",
    ashbyJobId:    "fb14d682-a04b-4db4-aed3-eed210e1673b",
    brainnerSlug:  "3db395e9-4c4a-4461-a73b-2fbe37021371",
    // Known stage IDs — skip discovery for speed
    appReviewId:   "8f5b5a50-07f2-4006-930b-328fa84b91c2",
    archiveId:     "4a58c5ee-1cd0-4f1c-aeea-f1111255edfa",
  },
  {
    name:          "Sr. Manager TPM (Ed)",
    ashbyJobId:    "59d95ceb-ba5e-4c01-8c05-c99076529012",
    brainnerSlug:  "b46b4a19-16f8-4b5c-abfe-dcc42ff90175",
    appReviewId:   null, // discovered dynamically
    archiveId:     null,
  },
];

// ─── HTTP helpers ─────────────────────────────────────────────────────────────

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

function brainnerGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "admin.brainner.ai",
      path,
      method:   "GET",
      headers:  { "Authorization": `Bearer ${BRAINNER_KEY}` },
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on("error", reject);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── Brainner: fetch all candidates with score ≤ SCORE_CUTOFF ────────────────

async function fetchLowScorersBrainner(slug) {
  const all = [];
  let page  = 1;
  const pageSize = 200;

  while (true) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": slug,
      "pagination[page]":        page,
      "pagination[pageSize]":    pageSize,
      "sort":                    "Score:asc",
    }).toString();

    const resp = await brainnerGet(`/api/candidates?${params}`);
    const rows = resp?.data || [];
    if (rows.length === 0) break;

    for (const c of rows) {
      const score = c.attributes?.Score ?? null;
      const email = (c.attributes?.Email || "").toLowerCase().trim();
      if (score !== null && score <= SCORE_CUTOFF && email) {
        all.push({ email, score, name: c.attributes?.Name || email });
      }
    }

    // If all rows on this page are already above cutoff (sorted asc → once score > 50 we're done)
    const maxOnPage = Math.max(...rows.map(r => r.attributes?.Score ?? 0));
    if (maxOnPage > SCORE_CUTOFF || rows.length < pageSize) break;
    page++;
  }

  return all;
}

// ─── Ashby: fetch all applications for a job ─────────────────────────────────

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

// ─── Stage discovery via jobInterviewPlan.info ────────────────────────────────

async function discoverStages(ashbyJobId) {
  let appReviewId = null, archiveId = null;
  try {
    const plan   = await ashbyPost("/jobInterviewPlan.info", { jobId: ashbyJobId });
    const stages = plan?.results?.interviewStages || [];
    for (const s of stages) {
      const t = (s.title || "").toLowerCase().trim();
      if (!appReviewId && t === "application review")     appReviewId = s.id;
      if (!archiveId   && t.startsWith("to be archived")) archiveId   = s.id;
    }
  } catch (e) {
    console.log(`   ⚠️  jobInterviewPlan.info failed: ${e.message}`);
  }
  return { appReviewId, archiveId };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function processJob(job) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📋 ${job.name}`);
  console.log(`${"═".repeat(60)}`);

  // 1. Discover stages if not hardcoded
  let { appReviewId, archiveId } = job;
  if (!appReviewId || !archiveId) {
    console.log(`\n🔍 Discovering pipeline stages...`);
    const discovered = await discoverStages(job.ashbyJobId);
    appReviewId = appReviewId || discovered.appReviewId;
    archiveId   = archiveId   || discovered.archiveId;
  }

  if (!appReviewId) { console.error(`❌ Could not find "Application Review" stage. Skipping.`); return; }
  if (!archiveId)   { console.error(`❌ Could not find "To Be Archived & Dispo" stage. Skipping.`); return; }
  console.log(`   ✅ Application Review:     ${appReviewId}`);
  console.log(`   ✅ To Be Archived & Dispo: ${archiveId}`);

  // 2. Pull low scorers from Brainner
  console.log(`\n🧠 Fetching Brainner candidates with score ≤ ${SCORE_CUTOFF}...`);
  const lowScorers = await fetchLowScorersBrainner(job.brainnerSlug);
  console.log(`   Found ${lowScorers.length} candidates at or below ${SCORE_CUTOFF}`);
  if (lowScorers.length === 0) return;

  // 3. Fetch Ashby applications and build email map
  console.log(`\n📥 Fetching Ashby applications...`);
  const applications = await fetchAllApplications(job.ashbyJobId);
  console.log(`   Found ${applications.length} total applications`);

  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  // 4. Move candidates
  let moved = 0, skipped = 0, notFound = 0, errors = 0;

  console.log(`\n🗄️  Archiving...\n`);
  for (const { email, score, name } of lowScorers) {
    const app = emailToApp[email];
    if (!app) {
      notFound++;
      continue; // silently skip — Brainner candidate may not have applied via Ashby
    }

    const curId    = app.currentInterviewStage?.id;
    const curTitle = app.currentInterviewStage?.title || curId;

    if (curId !== appReviewId) {
      skipped++;
      console.log(`   ⏭️  Skipped [B:${score}] already in "${curTitle}": ${name}`);
      continue;
    }

    try {
      await ashbyPost("/application.changeStage", {
        applicationId:   app.id,
        interviewStageId: archiveId,
      });
      moved++;
      console.log(`   ✅ Archived [B:${score}]: ${name}`);
    } catch (e) {
      errors++;
      console.log(`   ❌ Error on ${name}: ${e.message}`);
    }
    await sleep(150);
  }

  console.log(`\n📊 Results for ${job.name}:`);
  console.log(`   Moved to archive: ${moved}`);
  console.log(`   Skipped (not in Application Review): ${skipped}`);
  console.log(`   Not found in Ashby: ${notFound}`);
  if (errors) console.log(`   Errors: ${errors}`);
}

async function main() {
  console.log(`\n🚀 archive-low-brainner.js`);
  console.log(`   Archiving Brainner score ≤ ${SCORE_CUTOFF} → "To Be Archived & Dispo"`);
  console.log(`   Jobs: Sr PM (Jordan) + Sr Manager TPM (Ed)`);
  console.log(`   Only touches candidates currently in Application Review\n`);

  for (const job of JOBS) {
    await processJob(job);
  }

  console.log(`\n✅ All done.\n`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
