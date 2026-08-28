#!/usr/bin/env node
/**
 * Moves SWE II Frontend (Andre) candidates scored 1 or 2
 * from Application Review → To Be Archived & Dispo in Ashby.
 *
 * Dry run first (default):
 *   node archive-andre-strong-no.js
 *
 * Execute:
 *   node archive-andre-strong-no.js --execute
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY  = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID     = "9f586f41-2073-4def-a595-9d4b885f1e10"; // SWE II Frontend (Andre)
const ARCHIVE_ID = "fa02c188-64fb-4362-8c89-d59e76d615ee"; // To Be Archived & Dispo (hardcoded)
const CACHE_FILE = path.join(__dirname, "andre-mid-cache.json");
const DRY_RUN    = !process.argv.includes("--execute");

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

async function fetchAllApplications() {
  console.log("Fetching all Ashby applications for SWE II Frontend…");
  const apps = [];
  let cursor = null;
  let page = 1;
  while (true) {
    const payload = { jobId: JOB_ID, limit: 100 };
    if (cursor) payload.cursor = cursor;
    const res = await ashbyPost("/application.list", payload);
    apps.push(...(res.results ?? []));
    process.stdout.write(`\r  Page ${page}: ${apps.length} total…`);
    page++;
    if (!res.moreDataAvailable) break;
    cursor = res.nextCursor;
    await sleep(150);
  }
  console.log();
  return apps;
}

async function main() {
  console.log(`\n━━━ SWE II Frontend — Archive 1s & 2s → To Be Archived & Dispo ━━━`);
  console.log(`Mode: ${DRY_RUN ? "🔍 DRY RUN (no changes)" : "🚀 EXECUTE"}\n`);

  if (!fs.existsSync(CACHE_FILE)) { console.error("Cache not found:", CACHE_FILE); process.exit(1); }
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));

  const noEmails = new Set(
    Object.entries(cache)
      .filter(([, v]) => v.ourScore === 1 || v.ourScore === 2)
      .map(([email]) => email.toLowerCase().trim())
  );

  const s1 = Object.values(cache).filter(v => v.ourScore === 1).length;
  const s2 = Object.values(cache).filter(v => v.ourScore === 2).length;
  console.log(`Cache: ${Object.keys(cache).length} total screened`);
  console.log(`  Score 1 (Strong No): ${s1}`);
  console.log(`  Score 2 (No):        ${s2}`);
  console.log(`  Total to consider:   ${noEmails.size}`);
  console.log(`\n  Target stage (hardcoded): To Be Archived & Dispo (${ARCHIVE_ID})\n`);

  const apps = await fetchAllApplications();
  console.log(`\nTotal Ashby applications: ${apps.length}`);

  // Discover Application Review stage from application objects
  const stageMap = {};
  for (const app of apps) {
    const s = app.currentInterviewStage;
    if (s && !stageMap[s.id]) stageMap[s.id] = s.title;
  }

  console.log("\nStages found:");
  Object.entries(stageMap).forEach(([id, title]) => console.log(`  ${title.padEnd(40)} ${id}`));

  const appReviewEntry = Object.entries(stageMap).find(([, t]) => t.toLowerCase().includes("application review"));
  if (!appReviewEntry) { console.error("\n❌ Could not find Application Review stage"); process.exit(1); }

  const [appReviewId, appReviewTitle] = appReviewEntry;
  console.log(`\n  Source: "${appReviewTitle}" (${appReviewId})`);
  console.log(`  Target: "To Be Archived & Dispo" (${ARCHIVE_ID})\n`);

  // Only move candidates currently in Application Review AND scored 1 or 2
  const toArchive = apps.filter(app => {
    if (app.currentInterviewStage?.id !== appReviewId) return false;
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    return email && noEmails.has(email);
  });

  const allInAppReview = apps.filter(a => a.currentInterviewStage?.id === appReviewId);
  console.log(`  Currently in Application Review:       ${allInAppReview.length}`);
  console.log(`  Scored 1 or 2 in cache:                ${noEmails.size}`);
  console.log(`  To move → To Be Archived & Dispo:      ${toArchive.length}`);

  if (toArchive.length === 0) { console.log("\n  Nothing to move. Done."); return; }

  console.log(`\nFirst 20 candidates that would be moved:`);
  toArchive.slice(0, 20).forEach((app, i) => {
    const email  = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase();
    const cached = cache[email];
    console.log(`  [${i+1}] ${(app.candidate?.name ?? "Unknown").padEnd(35)} Score: ${cached?.ourScore} · Brainner: ${cached?.brainnerScore}`);
  });
  if (toArchive.length > 20) console.log(`  … and ${toArchive.length - 20} more`);

  if (DRY_RUN) {
    console.log(`\n✅ Dry run complete. To execute:\n   node archive-andre-strong-no.js --execute\n`);
    return;
  }

  console.log("\nMoving to To Be Archived & Dispo…");
  let moved = 0, errors = 0;
  for (const app of toArchive) {
    const name = app.candidate?.name ?? "Unknown";
    process.stdout.write(`  ${name}… `);
    try {
      const res = await ashbyPost("/application.changeStage", {
        applicationId:    app.id,
        interviewStageId: ARCHIVE_ID,
        // No archiveReasonId — pipeline stage, not terminal archive
      });
      if (res.success === false || res.error) {
        console.log(`❌ ${JSON.stringify(res.error ?? res)}`);
        errors++;
      } else {
        console.log("✅");
        moved++;
      }
    } catch (e) {
      console.log(`❌ ${e.message}`);
      errors++;
    }
    await sleep(150);
  }

  console.log(`\n━━━ Done ━━━`);
  console.log(`  Moved:  ${moved}`);
  console.log(`  Errors: ${errors}`);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
