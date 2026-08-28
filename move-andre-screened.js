#!/usr/bin/env node
/**
 * Andre · SWE II Frontend — Move screened candidates in Ashby
 *
 * Reads andre-mid-cache.json (screener results), fetches all Ashby applications
 * for Andre's job, and moves candidates currently in Application Review:
 *   Score 3 or 4 → New Lead
 *   Score 1 or 2 → To Be Archived & Dispo
 *
 * Only moves candidates currently in Application Review — never touches any
 * candidate already in a later stage (Recruiter Screen, HM Interview, etc.)
 *
 * Run: node move-andre-screened.js
 * Dry run: node move-andre-screened.js --dry-run
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY  = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const ASHBY_JOB_ID = "9f586f41-2073-4def-a595-9d4b885f1e10"; // SWE II Frontend (Andre)

// Stage IDs — hardcoded per CLAUDE.md rule (never use dynamic discovery)
const STAGE_APPLICATION_REVIEW   = "c78e9744-1559-4001-99ad-fa4d083fe679";
const STAGE_NEW_LEAD             = "5b2916ac-7771-4025-9b05-70cd006c1d96"; // scores 3 & 4
const STAGE_TO_BE_ARCHIVED       = "fa02c188-64fb-4362-8c89-d59e76d615ee"; // scores 1 & 2

const CACHE_FILE = path.join(__dirname, "andre-mid-cache.json");
const DRY_RUN    = process.argv.includes("--dry-run");

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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
        "Authorization":  `Basic ${encoded}`,
      },
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.setTimeout(30000, () => req.destroy(new Error("Ashby timeout")));
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// Fetch all applications for Andre's job from Ashby, paginating through all pages.
// Returns a map of email (lowercase) → { applicationId, currentStageId, name }
async function fetchAshbyApplications() {
  const map = {};
  let cursor = null;
  let page   = 0;

  console.log("  Fetching all Ashby applications for Andre's job…");

  while (true) {
    page++;
    const payload = { jobId: ASHBY_JOB_ID, limit: 100 };
    if (cursor) payload.cursor = cursor;

    const resp = await ashbyPost("/application.list", payload);

    if (!resp.results) {
      console.error("  ⚠️  Unexpected Ashby response:", JSON.stringify(resp).slice(0, 200));
      break;
    }

    for (const app of resp.results) {
      const email   = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
      const stageId = app.currentInterviewStage?.id;
      const name    = app.candidate?.name || "Unknown";
      const appId   = app.id;

      if (email) {
        map[email] = { applicationId: appId, currentStageId: stageId, name };
      }
    }

    process.stdout.write(`  Page ${page}: ${resp.results.length} apps (total mapped: ${Object.keys(map).length})\n`);

    if (!resp.moreDataAvailable) break;
    cursor = resp.nextCursor;
  }

  console.log(`  Done — ${Object.keys(map).length} applications fetched\n`);
  return map;
}

async function main() {
  console.log(`\n━━━ Andre · SWE II Frontend — Move Screened Candidates ━━━`);
  console.log(`Mode: ${DRY_RUN ? "🔍 DRY RUN (no moves will be made)" : "🚀 LIVE"}\n`);

  // Load screener cache
  if (!fs.existsSync(CACHE_FILE)) {
    console.error(`❌ Cache file not found: ${CACHE_FILE}`);
    console.error("   Run screen-andre-mid.js first.");
    process.exit(1);
  }
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  const cachedEmails = Object.keys(cache);
  console.log(`  Loaded ${cachedEmails.length} screened candidates from cache\n`);

  // Fetch Ashby applications
  const ashbyMap = await fetchAshbyApplications();

  // Plan moves
  const toNewLead   = []; // scores 3 & 4
  const toArchived  = []; // scores 1 & 2
  const skipped     = []; // not in Application Review or not found in Ashby

  for (const email of cachedEmails) {
    const cached = cache[email];
    const score  = cached.ourScore;
    const ashby  = ashbyMap[email];

    if (!ashby) {
      skipped.push({ email, name: cached.name || email, reason: "not found in Ashby" });
      continue;
    }

    if (ashby.currentStageId !== STAGE_APPLICATION_REVIEW) {
      skipped.push({ email, name: ashby.name, reason: `already in another stage (${ashby.currentStageId})` });
      continue;
    }

    const entry = { email, name: ashby.name, applicationId: ashby.applicationId, score };
    if (score >= 3) {
      toNewLead.push(entry);
    } else {
      toArchived.push(entry);
    }
  }

  console.log(`  Plan:`);
  console.log(`    🔵 Move to New Lead (score 3–4):             ${toNewLead.length}`);
  console.log(`    🟡 Move to To Be Archived & Dispo (score 1–2): ${toArchived.length}`);
  console.log(`    ⏭️  Skip (not in App Review or not in Ashby): ${skipped.length}\n`);

  if (DRY_RUN) {
    console.log("Dry run — no moves made. Run without --dry-run to execute.\n");
    if (toNewLead.length) {
      console.log("Would move to New Lead:");
      toNewLead.forEach(c => console.log(`  [${c.score}] ${c.name} (${c.email})`));
    }
    if (toArchived.length) {
      console.log("\nWould move to To Be Archived & Dispo:");
      toArchived.forEach(c => console.log(`  [${c.score}] ${c.name} (${c.email})`));
    }
    return;
  }

  const counts = { newLead: 0, archived: 0, errors: 0 };

  // Move score 3 & 4 → New Lead
  for (const cand of toNewLead) {
    try {
      const resp = await ashbyPost("/application.changeStage", {
        applicationId:   cand.applicationId,
        interviewStageId: STAGE_NEW_LEAD,
      });
      if (resp.success || resp.id) {
        counts.newLead++;
        console.log(`  🔵 → New Lead       [${cand.score}] ${cand.name}`);
      } else {
        counts.errors++;
        console.log(`  ❌ Error moving ${cand.name}: ${JSON.stringify(resp).slice(0, 120)}`);
      }
    } catch (e) {
      counts.errors++;
      console.log(`  ❌ Exception for ${cand.name}: ${e.message}`);
    }
    await sleep(150);
  }

  // Move score 1 & 2 → To Be Archived & Dispo
  for (const cand of toArchived) {
    try {
      const resp = await ashbyPost("/application.changeStage", {
        applicationId:   cand.applicationId,
        interviewStageId: STAGE_TO_BE_ARCHIVED,
      });
      if (resp.success || resp.id) {
        counts.archived++;
        console.log(`  🟡 → To Be Archived [${cand.score}] ${cand.name}`);
      } else {
        counts.errors++;
        console.log(`  ❌ Error moving ${cand.name}: ${JSON.stringify(resp).slice(0, 120)}`);
      }
    } catch (e) {
      counts.errors++;
      console.log(`  ❌ Exception for ${cand.name}: ${e.message}`);
    }
    await sleep(150);
  }

  console.log(`\n✅ Done`);
  console.log(`   🔵 Moved to New Lead:             ${counts.newLead}`);
  console.log(`   🟡 Moved to To Be Archived:       ${counts.archived}`);
  console.log(`   ⏭️  Skipped:                       ${skipped.length}`);
  console.log(`   ❌ Errors:                         ${counts.errors}\n`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
