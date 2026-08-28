#!/usr/bin/env node
/**
 * Probe: inspect what Ashby returns for a candidate in Application Review
 * so we know what resume/profile data is available.
 *
 * Run: node probe-ashby-candidate.js
 */

const https = require("https");

const ASHBY_KEY          = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID             = "9f586f41-2073-4def-a595-9d4b885f1e10";
const APP_REVIEW_STAGE_ID = "c78e9744-1559-4001-99ad-fa4d083fe679";

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

async function main() {
  // Try 1: filter by interviewStageId directly
  console.log("Attempt 1: filter by interviewStageId...");
  const r1 = await ashbyPost("/application.list", {
    jobId: JOB_ID, limit: 5, interviewStageId: APP_REVIEW_STAGE_ID
  });
  console.log(`  results: ${(r1.results||[]).length}, moreData: ${r1.moreDataAvailable}, error: ${r1.errors?.[0]?.message || "none"}`);
  if ((r1.results||[]).length > 0) {
    console.log("  ✅ Stage filter works!");
    const appInReview = r1.results[0];
    await probeCandidate(appInReview);
    return;
  }

  // Try 2: filter by applicationStatus = active
  console.log("\nAttempt 2: applicationStatus = active...");
  const r2 = await ashbyPost("/application.list", {
    jobId: JOB_ID, limit: 5, applicationStatus: "active"
  });
  console.log(`  results: ${(r2.results||[]).length}, moreData: ${r2.moreDataAvailable}, error: ${r2.errors?.[0]?.message || "none"}`);
  const activeInReview = (r2.results||[]).find(a => a.currentInterviewStage?.id === APP_REVIEW_STAGE_ID);
  if (activeInReview) {
    console.log("  ✅ Active filter works and found App Review candidate!");
    await probeCandidate(activeInReview);
    return;
  }
  if ((r2.results||[]).length > 0) {
    console.log("  Stages in active results:");
    r2.results.forEach(a => console.log(`    "${a.currentInterviewStage?.title}"`));
  }

  // Try 3: status filter variants
  for (const status of ["interviewing", "applied", "lead"]) {
    console.log(`\nAttempt 3: applicationStatus = ${status}...`);
    const r3 = await ashbyPost("/application.list", {
      jobId: JOB_ID, limit: 5, applicationStatus: status
    });
    console.log(`  results: ${(r3.results||[]).length}, error: ${r3.errors?.[0]?.message || "none"}`);
    const found = (r3.results||[]).find(a => a.currentInterviewStage?.id === APP_REVIEW_STAGE_ID);
    if (found) {
      console.log(`  ✅ Found App Review candidate with status=${status}!`);
      await probeCandidate(found);
      return;
    }
  }

  console.log("\n❌ No filter worked — will need to paginate or use a different API endpoint.");
}

async function probeCandidate(appInReview) {

  console.log("=== APPLICATION OBJECT (keys) ===");
  console.log(Object.keys(appInReview));
  console.log("\n=== CANDIDATE OBJECT (keys) ===");
  console.log(Object.keys(appInReview.candidate || {}));
  console.log("\n=== FULL APPLICATION ===");
  console.log("\n=== APPLICATION KEYS ===");
  console.log(Object.keys(appInReview));
  console.log("\n=== CANDIDATE KEYS ===");
  console.log(Object.keys(appInReview.candidate || {}));
  console.log("\n=== FULL APPLICATION ===");
  console.log(JSON.stringify(appInReview, null, 2));

  // Now try candidate.get for the full candidate record
  const candidateId = appInReview.candidate?.id;
  if (candidateId) {
    console.log(`\n\n=== CANDIDATE.GET (id: ${candidateId}) ===`);
    const candResp = await ashbyPost("/candidate.get", { id: candidateId });
    console.log(JSON.stringify(candResp, null, 2));
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
