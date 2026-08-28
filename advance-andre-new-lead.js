#!/usr/bin/env node
/**
 * Moves SWE II Frontend (Andre) candidates scored 3 or 4 from Application Review → New Lead in Ashby.
 *
 * Run in dry-run mode first (default):
 *   node advance-andre-new-lead.js
 *
 * Then run for real:
 *   node advance-andre-new-lead.js --execute
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY      = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID         = "9f586f41-2073-4def-a595-9d4b885f1e10"; // SWE II Frontend (Andre)
const NEW_LEAD_ID    = "5b2916ac-7771-4025-9b05-70cd006c1d96"; // New Lead (hardcoded)
const CACHE_FILE     = path.join(__dirname, "andre-mid-cache.json");
const DRY_RUN        = !process.argv.includes("--execute");

function ashbyPost(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify(payload);
    const encoded = Buffer.from(ASHBY_KEY + ":").toString("base64");
    const req = https.request({
      hostname: "api.ashbyhq.com", path: endpoint, method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "Authorization": "Basic " + encoded,
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
    const batch = res.results ?? [];
    apps.push(...batch);
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
  console.log(`\n━━━ SWE II Frontend — Advance 3s/4s to New Lead ━━━`);
  console.log(`Mode: ${DRY_RUN ? "🔍 DRY RUN (no changes)" : "🚀 EXECUTE"}\n`);

  // Load cache
  if (!fs.existsSync(CACHE_FILE)) {
    console.error("Cache file not found:", CACHE_FILE);
    process.exit(1);
  }
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  const goodEmails = new Set(
    Object.entries(cache)
      .filter(([, v]) => v.ourScore >= 3)
      .map(([email]) => email.toLowerCase().trim())
  );
  console.log(`Cache: ${Object.keys(cache).length} screened, ${goodEmails.size} scored 3 or 4\n`);

  // Fetch all applications
  const apps = await fetchAllApplications();
  console.log(`\nTotal Ashby applications: ${apps.length}`);

  // Discover stage IDs
  const stageMap = {};
  for (const app of apps) {
    const s = app.currentInterviewStage;
    if (s && !stageMap[s.id]) stageMap[s.id] = s.title;
  }

  console.log("\nStages found:");
  Object.entries(stageMap).forEach(([id, title]) => console.log(`  ${title.padEnd(35)} ${id}`));

  // Find Application Review and New Lead IDs
  const appReviewEntry  = Object.entries(stageMap).find(([, t]) => t.toLowerCase().includes("application review"));

  if (!appReviewEntry) { console.error("\n❌ Could not find Application Review stage"); process.exit(1); }

  const [appReviewId, appReviewTitle] = appReviewEntry;
  const newLeadId    = NEW_LEAD_ID;
  const newLeadTitle = "New Lead";

  console.log(`\n  Source stage: "${appReviewTitle}" (${appReviewId})`);
  console.log(`  Target stage: "${newLeadTitle}"   (${newLeadId})\n`);

  // Find candidates to move: currently in Application Review AND scored 3 or 4
  const toMove = apps.filter(app => {
    if (app.currentInterviewStage?.id !== appReviewId) return false;
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    return email && goodEmails.has(email);
  });

  // Stats: Application Review total
  const allInAppReview = apps.filter(a => a.currentInterviewStage?.id === appReviewId);
  console.log(`  In Application Review:        ${allInAppReview.length}`);
  console.log(`  Scored 3/4 in our screener:   ${goodEmails.size}`);
  console.log(`  To move → New Lead:           ${toMove.length}`);

  if (toMove.length === 0) {
    console.log("\n  Nothing to move. Done.");
    return;
  }

  console.log("\nCandidates to move:");
  toMove.forEach((app, i) => {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase();
    const cached = cache[email];
    console.log(`  [${i+1}] ${app.candidate?.name ?? "Unknown"} <${email}>`);
    console.log(`       Score: ${cached?.ourScore} · ${cached?.scoreLabel} · Brainner: ${cached?.brainnerScore}`);
  });

  if (DRY_RUN) {
    console.log(`\n✅ Dry run complete. To execute, run:\n   node advance-andre-new-lead.js --execute\n`);
    return;
  }

  // Execute moves
  console.log("\nMoving candidates…");
  let moved = 0, errors = 0;

  for (const app of toMove) {
    const name = app.candidate?.name ?? "Unknown";
    process.stdout.write(`  Moving ${name}… `);
    try {
      const res = await ashbyPost("/application.changeStage", {
        applicationId: app.id,
        interviewStageId: newLeadId,
      });
      if (res.success === false || res.error) {
        console.log(`❌ ${JSON.stringify(res.error ?? res)}`);
        errors++;
      } else {
        console.log("✅ moved");
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
