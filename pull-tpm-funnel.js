"use strict";
/**
 * pull-tpm-funnel.js — one-shot data pull for the Sr. Manager TPM review.
 * Pulls every application on the job, aggregates funnel stats, and grabs
 * interview feedback for anyone who got past Application Review.
 *
 * Run:  node pull-tpm-funnel.js
 * Out:  tpm-funnel-data.json  (+ console summary)
 */

const fs = require("fs");
const path = require("path");

const ASHBY_KEY = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID = "59d95ceb-ba5e-4c01-8c05-c99076529012"; // Sr. Manager TPM (Ed)
const OUT = path.join(__dirname, "tpm-funnel-data.json");

const AUTH = "Basic " + Buffer.from(ASHBY_KEY + ":").toString("base64");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ashby(endpoint, body) {
  const res = await fetch(`https://api.ashbyhq.com/${endpoint}`, {
    method: "POST",
    headers: { Authorization: AUTH, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!json.success) return { __error: json.errors || res.status };
  return json; // keep top-level: results, moreDataAvailable, nextCursor
}

(async () => {
  // 1. Job + posting info
  const jobRes = await ashby("job.info", { jobId: JOB_ID });
  const job = jobRes.__error ? {} : jobRes.results;

  // 2. All applications (paginated)
  let apps = [];
  let cursor = null;
  while (true) {
    const body = { jobId: JOB_ID, limit: 100 };
    if (cursor) body.cursor = cursor;
    const res = await ashby("application.list", body);
    if (res.__error) { console.error("application.list error:", res.__error); break; }
    const batch = res.results || [];
    apps = apps.concat(batch);
    process.stdout.write(`\r  fetched ${apps.length} applications…`);
    if (!res.moreDataAvailable || batch.length === 0) break;
    cursor = res.nextCursor;
  }
  console.log(`\n  total applications: ${apps.length}`);

  // 3. Aggregate
  const count = (m, k) => (m[k] = (m[k] || 0) + 1, m);
  const byStage = {}, byStatus = {}, bySource = {}, byArchiveReason = {}, byMonth = {};
  const advanced = []; // anyone NOT in App Review / To Be Archived / Archived-with-no-progress

  const APP_REVIEW = "0e18ff5d-2c75-4ac3-8e01-70cb3d009084";
  const TO_ARCHIVE = "d0f6e06f-b17e-4957-8946-7be6384c680c";

  for (const a of apps) {
    const stage = a.currentInterviewStage?.title || "unknown";
    count(byStage, stage);
    count(byStatus, a.status || "unknown");
    count(bySource, a.source?.title || "unknown");
    if (a.archiveReason?.text) count(byArchiveReason, a.archiveReason.text);
    const mo = (a.createdAt || "").slice(0, 7);
    if (mo) count(byMonth, mo);

    // "Advanced" = reached a real interview stage (by title), or offer/hired.
    // Archived candidates keep their last stage, so archived-from-interview still counts
    // while the thousands archived from Application Review / To Be Archived do not.
    const stitle = a.currentInterviewStage?.title || "";
    const interviewStage = /recruiter|hiring manager|hm |interview|panel|presentation|onsite|secondary|debrief|team round|offer/i.test(stitle);
    if (interviewStage || ["Hired", "Offer"].includes(a.status)) {
      advanced.push({
        applicationId: a.id,
        name: a.candidate?.name,
        email: a.candidate?.primaryEmailAddress?.value || null,
        stage,
        status: a.status,
        source: a.source?.title || null,
        createdAt: a.createdAt,
        archiveReason: a.archiveReason?.text || null,
      });
    }
  }

  // 4. Interview feedback for advanced candidates (best-effort; endpoint may vary)
  console.log(`  pulling feedback for ${advanced.length} advanced candidates…`);
  let done = 0;
  for (const c of advanced) {
    done++;
    if (done % 10 === 0) process.stdout.write(`\r  feedback ${done}/${advanced.length}…`);
    const fb = await ashby("applicationFeedback.list", { applicationId: c.applicationId });
    if (!fb.__error) {
      const list = fb.results || [];
      c.feedback = list.map((f) => ({
        interviewer: f.submittedBy?.firstName ? `${f.submittedBy.firstName} ${f.submittedBy.lastName || ""}`.trim() : null,
        stage: f.interviewStage?.title || f.feedbackFormDefinition?.title || null,
        overall: f.overallRecommendation || f.submittedValues?.overallRecommendation || null,
        submittedAt: f.submittedAt || null,
        values: f.submittedValues || null,
      }));
    } else {
      c.feedback = `unavailable (${JSON.stringify(fb.__error).slice(0, 80)})`;
    }
    await sleep(150);
  }

  const outData = {
    asOf: new Date().toISOString(),
    job: { title: job?.title, status: job?.status, openedAt: job?.openedAt || null },
    totalApplications: apps.length,
    byStage, byStatus, bySource, byArchiveReason, byMonth,
    advancedCandidates: advanced,
  };
  fs.writeFileSync(OUT, JSON.stringify(outData, null, 2));

  console.log("\n=== FUNNEL SUMMARY ===");
  console.log("By stage:", byStage);
  console.log("By status:", byStatus);
  console.log("By source:", bySource);
  console.log("Advanced candidates:", advanced.length);
  console.log(`\n✅ Wrote ${OUT}`);
})();
