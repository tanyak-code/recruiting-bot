#!/usr/bin/env node
/**
 * SWE II Frontend (Andre) — bulk stage mover
 *   Score 1/2 in Application Review → To Be Archived & Dispo
 *   Score 3/4 in Application Review → New Lead
 *
 * Stage IDs (hardcoded per CLAUDE.md — job-specific, not shared):
 *   Application Review:      c78e9744-1559-4001-99ad-fa4d083fe679
 *   To Be Archived & Dispo:  fa02c188-64fb-4362-8c89-d59e76d615ee
 *   New Lead:                5b2916ac-7771-4025-9b05-70cd006c1d96
 *
 * Run: node move-andre-all.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const DRY_RUN    = false;  // ← flip to false to actually move
const ASHBY_KEY  = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID     = "9f586f41-2073-4def-a595-9d4b885f1e10"; // SWE II Frontend (Andre)
const CACHE_FILE = path.join(__dirname, "andre-mid-cache.json");

// Hardcoded stage IDs from CLAUDE.md
const APP_REVIEW_ID = "c78e9744-1559-4001-99ad-fa4d083fe679";
const ARCHIVE_ID    = "fa02c188-64fb-4362-8c89-d59e76d615ee";
const NEW_LEAD_ID   = "5b2916ac-7771-4025-9b05-70cd006c1d96";

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

async function main() {
  // ── Load cache ──────────────────────────────────────────────────────────────
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));

  const toArchive  = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 1 || r.ourScore === 2)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  const toNewLead  = Object.entries(cache)
    .filter(([, r]) => r.ourScore === 3 || r.ourScore === 4)
    .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

  console.log(`\n📋 SWE II Frontend (Andre)`);
  console.log(`   Cache entries:           ${Object.keys(cache).length}`);
  console.log(`   Score 1/2 → Archive:     ${toArchive.length}`);
  console.log(`   Score 3/4 → New Lead:    ${toNewLead.length}`);
  console.log(`   Mode: ${DRY_RUN ? "DRY RUN (no changes)" : "⚡ LIVE — moves will be made"}`);

  // ── Fetch applications ──────────────────────────────────────────────────────
  console.log(`\n📥 Fetching all applications from Ashby (job ${JOB_ID})...`);
  const applications = await fetchAllApplications(JOB_ID);
  console.log(`   Found ${applications.length} applications`);

  if (applications.length === 0) {
    console.error("❌ No applications returned — check job ID.");
    process.exit(1);
  }

  // ── Verify stage IDs from live data ────────────────────────────────────────
  const stageMap = {};
  for (const app of applications) {
    const stage = app.currentInterviewStage;
    if (stage?.id && !stageMap[stage.id]) stageMap[stage.id] = stage.title;
  }

  console.log(`\n   Stages found in applications:`);
  for (const [id, title] of Object.entries(stageMap)) {
    const tag = id === APP_REVIEW_ID ? " ✓ App Review"
              : id === ARCHIVE_ID    ? " ✓ Archive"
              : id === NEW_LEAD_ID   ? " ✓ New Lead"
              : "";
    console.log(`     "${title}" [${id}]${tag}`);
  }

  // Confirm hardcoded IDs are present
  if (!stageMap[APP_REVIEW_ID]) console.warn(`   ⚠️  Application Review ID not seen in applications — may already be empty`);
  if (!stageMap[ARCHIVE_ID])    console.warn(`   ⚠️  To Be Archived & Dispo ID not seen in applications`);
  if (!stageMap[NEW_LEAD_ID])   console.warn(`   ⚠️  New Lead ID not seen in applications`);

  console.log(`\n   ✅ Application Review:      ${APP_REVIEW_ID}`);
  console.log(`   ✅ To Be Archived & Dispo:  ${ARCHIVE_ID}`);
  console.log(`   ✅ New Lead:                ${NEW_LEAD_ID}`);

  // ── Build email → app map ───────────────────────────────────────────────────
  const emailToApp = {};
  for (const app of applications) {
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    if (email) emailToApp[email] = app;
  }

  // ── Move score 1/2 → To Be Archived & Dispo ─────────────────────────────────
  console.log(`\n${DRY_RUN ? "🔍 DRY RUN" : "🗄️  Moving"} score 1/2 → To Be Archived & Dispo...\n`);
  let arcMoved = 0, arcSkipped = 0, arcNotFound = 0, arcErrors = 0;

  for (const { email, name, score } of toArchive) {
    const app = emailToApp[email];
    if (!app) { arcNotFound++; console.log(`   ⚠️  Not found: ${name}`); continue; }

    const currentStageId    = app.currentInterviewStage?.id;
    const currentStageTitle = app.currentInterviewStage?.title || currentStageId;

    if (currentStageId !== APP_REVIEW_ID) {
      arcSkipped++;
      console.log(`   ⏭️  Skipped [${score}] (in "${currentStageTitle}"): ${name}`);
      continue;
    }

    if (DRY_RUN) {
      arcMoved++;
      console.log(`   ✓ Would archive [${score}]: ${name}`);
    } else {
      try {
        await ashbyPost("/application.changeStage", { applicationId: app.id, interviewStageId: ARCHIVE_ID });
        arcMoved++;
        console.log(`   ✅ Archived [${score}]: ${name}`);
      } catch (e) {
        arcErrors++;
        console.log(`   ❌ Error on ${name}: ${e.message}`);
      }
      await sleep(150);
    }
  }

  // ── Move score 3/4 → New Lead ────────────────────────────────────────────────
  console.log(`\n${DRY_RUN ? "🔍 DRY RUN" : "🔵 Moving"} score 3/4 → New Lead...\n`);
  let leadMoved = 0, leadSkipped = 0, leadNotFound = 0, leadErrors = 0;

  for (const { email, name, score } of toNewLead) {
    const app = emailToApp[email];
    if (!app) { leadNotFound++; console.log(`   ⚠️  Not found: ${name}`); continue; }

    const currentStageId    = app.currentInterviewStage?.id;
    const currentStageTitle = app.currentInterviewStage?.title || currentStageId;

    if (currentStageId !== APP_REVIEW_ID) {
      leadSkipped++;
      console.log(`   ⏭️  Skipped [${score}] (in "${currentStageTitle}"): ${name}`);
      continue;
    }

    if (DRY_RUN) {
      leadMoved++;
      console.log(`   ✓ Would move to New Lead [${score}]: ${name}`);
    } else {
      try {
        await ashbyPost("/application.changeStage", { applicationId: app.id, interviewStageId: NEW_LEAD_ID });
        leadMoved++;
        console.log(`   ✅ → New Lead [${score}]: ${name}`);
      } catch (e) {
        leadErrors++;
        console.log(`   ❌ Error on ${name}: ${e.message}`);
      }
      await sleep(150);
    }
  }

  // ── Summary ──────────────────────────────────────────────────────────────────
  console.log(`\n📊 ${DRY_RUN ? "Dry run" : "Done"}:`);
  console.log(`   To Be Archived & Dispo (1/2):`);
  console.log(`     ${DRY_RUN ? "Would move" : "Moved"}:   ${arcMoved}`);
  console.log(`     Skipped:  ${arcSkipped}`);
  console.log(`     Not found: ${arcNotFound}`);
  if (arcErrors) console.log(`     Errors:   ${arcErrors}`);
  console.log(`   New Lead (3/4):`);
  console.log(`     ${DRY_RUN ? "Would move" : "Moved"}:   ${leadMoved}`);
  console.log(`     Skipped:  ${leadSkipped}`);
  console.log(`     Not found: ${leadNotFound}`);
  if (leadErrors) console.log(`     Errors:   ${leadErrors}`);

  if (DRY_RUN) {
    console.log(`\n👆 Dry run complete. Set DRY_RUN = false and rerun to make the moves.`);
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
