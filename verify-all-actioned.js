#!/usr/bin/env node
/**
 * Verify all screened candidates have been actioned out of Application Review.
 * Checks every cached candidate across all jobs against their current Ashby stage.
 *
 * Run: node verify-all-actioned.js
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

async function verifyJob({ label, jobId, cacheFile }) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`🏢 ${label}`);
  console.log(`${"═".repeat(60)}`);

  if (!fs.existsSync(cacheFile)) {
    console.log(`   ⚠️  No cache file found — skipping.`);
    return { label, stuckInReview: [], notFound: [], total: 0 };
  }

  const cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  const candidates = Object.entries(cache).map(([email, rec]) => ({
    email: email.toLowerCase().trim(),
    name:  rec.name || email,
    score: rec.ourScore,
  }));

  console.log(`   Cache: ${candidates.length} screened candidates`);
  console.log(`   Fetching Ashby applications...`);

  const applications = await fetchAllApplications(jobId);
  console.log(`   Ashby: ${applications.length} applications found`);

  // Discover Application Review stage ID
  let appReviewId = null;
  try {
    const plan   = await ashbyPost("/jobInterviewPlan.info", { jobId });
    const stages = plan?.results?.interviewStages || [];
    for (const s of stages) {
      if ((s.title || "").toLowerCase().trim() === "application review") {
        appReviewId = s.id;
        break;
      }
    }
  } catch {}

  // Fallback: scan applications
  if (!appReviewId) {
    for (const app of applications) {
      const s = app.currentInterviewStage;
      if (s && (s.title || "").toLowerCase().trim() === "application review") {
        appReviewId = s.id;
        break;
      }
    }
  }

  if (!appReviewId) {
    console.log(`   ⚠️  Could not determine Application Review stage ID — checking by title string instead`);
  } else {
    console.log(`   ✅ Application Review stage: ${appReviewId}`);
  }

  // Build email → app map
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  const stuckInReview = [];
  const notFound      = [];

  for (const { email, name, score } of candidates) {
    const app = emailToApp[email];
    if (!app) {
      notFound.push({ name, email, score });
      continue;
    }

    const curId    = app.currentInterviewStage?.id;
    const curTitle = app.currentInterviewStage?.title || "Unknown";

    const isStuck = appReviewId
      ? curId === appReviewId
      : curTitle.toLowerCase().includes("application review");

    if (isStuck) {
      stuckInReview.push({ name, email, score, stage: curTitle });
    }
  }

  // Report
  if (stuckInReview.length === 0) {
    console.log(`\n   ✅ All screened candidates have been actioned — none stuck in Application Review.`);
  } else {
    console.log(`\n   ❌ ${stuckInReview.length} candidate(s) still in Application Review:\n`);
    for (const c of stuckInReview) {
      console.log(`      [Score ${c.score}] ${c.name} (${c.email})`);
    }
  }

  if (notFound.length > 0) {
    console.log(`\n   ⚠️  ${notFound.length} screened candidate(s) not found in Ashby (may have been withdrawn or merged):`);
    for (const c of notFound) {
      console.log(`      [Score ${c.score}] ${c.name} (${c.email})`);
    }
  }

  console.log(`\n   📊 Summary:`);
  console.log(`      Screened in cache:       ${candidates.length}`);
  console.log(`      Still in App Review:     ${stuckInReview.length} ${stuckInReview.length > 0 ? "❌ ACTION NEEDED" : "✅"}`);
  console.log(`      Not found in Ashby:      ${notFound.length}`);
  console.log(`      Accounted for:           ${candidates.length - notFound.length - stuckInReview.length} ✅`);

  return { label, stuckInReview, notFound, total: candidates.length };
}

async function main() {
  console.log(`\n🔍 Verifying all screened candidates are actioned out of Application Review...`);
  console.log(`   Jobs: ${JOBS.map(j => j.label).join(", ")}`);

  const results = [];
  for (const job of JOBS) {
    results.push(await verifyJob(job));
  }

  // Grand summary
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📋 GRAND SUMMARY`);
  console.log(`${"═".repeat(60)}\n`);

  let totalStuck = 0;
  for (const r of results) {
    const status = r.stuckInReview.length > 0 ? `❌ ${r.stuckInReview.length} STUCK` : "✅ All clear";
    console.log(`   ${r.label}: ${status}`);
    totalStuck += r.stuckInReview.length;
  }

  console.log(`\n   Total stuck in Application Review: ${totalStuck}`);
  if (totalStuck === 0) {
    console.log(`\n   ✅ All jobs clean. Every screened candidate has been actioned.`);
  } else {
    console.log(`\n   ❌ Action needed — run the appropriate move script for the jobs above.`);
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
