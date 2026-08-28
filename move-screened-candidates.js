#!/usr/bin/env node
/**
 * Moves screened candidates in Application Review to their correct next stage
 * for all 3 active roles.
 *
 * Rules (applied to ALL roles):
 *   Score 1 or 2  →  To Be Archived & Dispo
 *   Score 3 or 4  →  HM Resume Review  (NOT HM Interview)
 *
 * Only touches candidates currently in Application Review.
 *
 * Dry run (default):
 *   node move-screened-candidates.js
 *
 * Execute:
 *   node move-screened-candidates.js --execute
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const DRY_RUN   = !process.argv.includes("--execute");

// ── Role definitions — all stage IDs hardcoded ────────────────────────────────
const ROLES = [
  {
    name:         "Sr. Manager TPM (Ed)",
    jobId:        "59d95ceb-ba5e-4c01-8c05-c99076529012",
    cacheFile:    path.join(__dirname, "sr-tpm-cache.json"),
    appReviewId:  "0e18ff5d-2c75-4ac3-8e01-70cb3d009084",
    archiveId:    "d0f6e06f-b17e-4957-8946-7be6384c680c", // To Be Archived & Dispo
    hmReviewId:   "f52e9001-be6c-401f-a9f4-4b2822ae1a84", // HM Resume Review
  },
  {
    name:         "SWE II Frontend (Andre)",
    jobId:        "9f586f41-2073-4def-a595-9d4b885f1e10",
    cacheFile:    path.join(__dirname, "andre-mid-cache.json"),
    appReviewId:  "c78e9744-1559-4001-99ad-fa4d083fe679",
    archiveId:    "fa02c188-64fb-4362-8c89-d59e76d615ee", // To Be Archived & Dispo
    hmReviewId:    "5b2916ac-7771-4025-9b05-70cd006c1d96", // New Lead (Andre uses New Lead, not HM Resume Review)
    hmReviewLabel: "New Lead",
  },
  {
    name:         "Sr. Product Manager (Jordan)",
    jobId:        "fb14d682-a04b-4db4-aed3-eed210e1673b",
    cacheFile:    path.join(__dirname, "sr-pm-cache.json"),
    appReviewId:  "8f5b5a50-07f2-4006-930b-328fa84b91c2",
    archiveId:    "4a58c5ee-1cd0-4f1c-aeea-f1111255edfa", // To Be Archived & Dispo
    hmReviewId:   "6d9ae6d0-7c2a-4a68-8e63-c5cefe977d9d", // HM Resume Review
  },
];
// ─────────────────────────────────────────────────────────────────────────────

function ashbyPost(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify(payload);
    const encoded = Buffer.from(ASHBY_KEY + ":").toString("base64");
    const req = https.request({
      hostname: "api.ashbyhq.com", path: endpoint, method: "POST",
      headers: {
        "Content-Type":   "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization":  "Basic " + encoded,
      }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAllApplications(jobId) {
  const apps = [];
  let cursor = null;
  let page = 1;
  while (true) {
    const payload = { jobId, limit: 100 };
    if (cursor) payload.cursor = cursor;
    const res = await ashbyPost("/application.list", payload);
    apps.push(...(res.results ?? []));
    process.stdout.write(`\r    Fetching… page ${page} (${apps.length} total)`);
    page++;
    if (!res.moreDataAvailable) break;
    cursor = res.nextCursor;
    await sleep(150);
  }
  process.stdout.write("\n");
  return apps;
}

async function processRole(role) {
  console.log(`\n${"━".repeat(60)}`);
  console.log(`  ${role.name}`);
  console.log(`${"━".repeat(60)}`);

  if (!fs.existsSync(role.cacheFile)) {
    console.log(`  ⚠️  Cache not found: ${role.cacheFile} — skipping`);
    return { toArchive: 0, toHM: 0, moved: 0, errors: 0 };
  }
  const cache = JSON.parse(fs.readFileSync(role.cacheFile, "utf8"));

  const archiveEmails = new Set(
    Object.entries(cache)
      .filter(([, v]) => v.ourScore === 1 || v.ourScore === 2)
      .map(([email]) => email.toLowerCase().trim())
  );
  const hmEmails = new Set(
    Object.entries(cache)
      .filter(([, v]) => v.ourScore === 3 || v.ourScore === 4)
      .map(([email]) => email.toLowerCase().trim())
  );

  console.log(`  Cache: ${Object.keys(cache).length} screened`);
  console.log(`    Score 1/2 (→ Archive):     ${archiveEmails.size}`);
  console.log(`    Score 3/4 (→ HM Review):   ${hmEmails.size}`);

  const apps = await fetchAllApplications(role.jobId);
  console.log(`  Total Ashby applications: ${apps.length}`);

  const inAppReview = apps.filter(a => a.currentInterviewStage?.id === role.appReviewId);
  console.log(`  Currently in Application Review: ${inAppReview.length}`);

  const toArchive = inAppReview.filter(app => {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    return email && archiveEmails.has(email);
  });
  const toHM = inAppReview.filter(app => {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    return email && hmEmails.has(email);
  });

  console.log(`\n  To move → To Be Archived & Dispo:  ${toArchive.length}`);
  console.log(`  To move → HM Resume Review:         ${toHM.length}`);

  if (toArchive.length === 0 && toHM.length === 0) {
    console.log("\n  Nothing to move.");
    return { toArchive: 0, toHM: 0, moved: 0, errors: 0 };
  }

  // Preview
  const preview = [...toArchive.map(a => ({ app: a, stage: "archive" })),
                   ...toHM.map(a => ({ app: a, stage: "hm" }))];
  console.log(`\n  Preview (first 15):`);
  preview.slice(0, 15).forEach(({ app, stage }, i) => {
    const email  = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase();
    const cached = cache[email];
    const dest   = stage === "archive" ? "→ Archive" : "→ HM Review";
    console.log(`    [${i+1}] ${(app.candidate?.name ?? "Unknown").padEnd(35)} Score: ${cached?.ourScore ?? "?"} ${dest}`);
  });
  if (preview.length > 15) console.log(`    … and ${preview.length - 15} more`);

  if (DRY_RUN) return { toArchive: toArchive.length, toHM: toHM.length, moved: 0, errors: 0 };

  // Execute
  console.log("\n  Moving…");
  let moved = 0, errors = 0;

  for (const app of toArchive) {
    const name = app.candidate?.name ?? "Unknown";
    process.stdout.write(`    ${name}… `);
    try {
      const res = await ashbyPost("/application.changeStage", {
        applicationId:    app.id,
        interviewStageId: role.archiveId,
        // No archiveReasonId — To Be Archived & Dispo is a pipeline stage, not terminal archive
      });
      if (res.success === false || res.error) { console.log(`❌ ${JSON.stringify(res.error ?? res)}`); errors++; }
      else { console.log("✅ → Archive"); moved++; }
    } catch (e) { console.log(`❌ ${e.message}`); errors++; }
    await sleep(150);
  }

  for (const app of toHM) {
    const name = app.candidate?.name ?? "Unknown";
    process.stdout.write(`    ${name}… `);
    try {
      const res = await ashbyPost("/application.changeStage", {
        applicationId:    app.id,
        interviewStageId: role.hmReviewId,
      });
      if (res.success === false || res.error) { console.log(`❌ ${JSON.stringify(res.error ?? res)}`); errors++; }
      else { console.log(`✅ → ${role.hmReviewLabel ?? "HM Resume Review"}`); moved++; }
    } catch (e) { console.log(`❌ ${e.message}`); errors++; }
    await sleep(150);
  }

  return { toArchive: toArchive.length, toHM: toHM.length, moved, errors };
}

async function main() {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  Move Screened Candidates — All Roles`);
  console.log(`  Mode: ${DRY_RUN ? "🔍 DRY RUN (no changes)" : "🚀 EXECUTE"}`);
  console.log(`${"═".repeat(60)}`);

  const totals = { toArchive: 0, toHM: 0, moved: 0, errors: 0 };

  for (const role of ROLES) {
    const result = await processRole(role);
    totals.toArchive += result.toArchive;
    totals.toHM      += result.toHM;
    totals.moved     += result.moved;
    totals.errors    += result.errors;
  }

  console.log(`\n${"═".repeat(60)}`);
  console.log(`  SUMMARY`);
  console.log(`${"═".repeat(60)}`);
  if (DRY_RUN) {
    console.log(`  Would move → To Be Archived & Dispo:  ${totals.toArchive}`);
    console.log(`  Would move → HM Resume Review:         ${totals.toHM}`);
    console.log(`\n  To execute: node move-screened-candidates.js --execute\n`);
  } else {
    console.log(`  Moved:  ${totals.moved}`);
    console.log(`  Errors: ${totals.errors}`);
  }
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
