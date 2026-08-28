#!/usr/bin/env node
/**
 * Moves Sr. Manager TPM candidates scored 1 or 2 on the RESCREEN
 * from Application Review → To Be Archived & Dispo in Ashby.
 *
 * Source of truth: sr-tpm-rescreen-*.csv (most recent file)
 * Only moves candidates currently in Application Review.
 *
 * Dry run first (default):
 *   node archive-tpm-no.js
 *
 * Execute:
 *   node archive-tpm-no.js --execute
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");
const ASHBY_KEY    = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID       = "59d95ceb-ba5e-4c01-8c05-c99076529012"; // Sr. Manager TPM (Ed)

// Hardcoded stage IDs — do NOT use dynamic discovery
const APP_REVIEW_STAGE_ID = null;   // discovered dynamically from application objects (read-only)
const ARCHIVE_STAGE_ID    = "d0f6e06f-b17e-4957-8946-7be6384c680c"; // To Be Archived & Dispo

const DRY_RUN = !process.argv.includes("--execute");

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

function findRescreenCSV() {
  const files = fs.readdirSync(__dirname)
    .filter(f => f.startsWith("sr-tpm-rescreen-") && f.endsWith(".csv"))
    .sort()
    .reverse();
  if (!files.length) { console.error("No sr-tpm-rescreen-*.csv file found"); process.exit(1); }
  return path.join(__dirname, files[0]);
}

async function fetchAllApplications() {
  console.log("Fetching all Ashby applications for Sr. Manager TPM…");
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
  console.log(`\n━━━ Sr. Manager TPM — Archive Rescreen 1s & 2s → To Be Archived & Dispo ━━━`);
  console.log(`Mode: ${DRY_RUN ? "🔍 DRY RUN (no changes)" : "🚀 EXECUTE"}\n`);

  // ── Load rescreen CSV ──────────────────────────────────────────────────────
  const csvFile = findRescreenCSV();
  console.log(`Using rescreen CSV: ${path.basename(csvFile)}`);

  const csvContent = fs.readFileSync(csvFile, "utf8");
  function parseCSV(text) {
    const lines = text.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
    return lines.slice(1).map(line => {
      const fields = [];
      let cur = "", inQ = false;
      for (let i = 0; i < line.length; i++) {
        if (line[i] === '"') { inQ = !inQ; }
        else if (line[i] === ',' && !inQ) { fields.push(cur); cur = ""; }
        else cur += line[i];
      }
      fields.push(cur);
      const obj = {};
      headers.forEach((h, i) => obj[h] = (fields[i] || "").trim());
      return obj;
    });
  }
  const rows = parseCSV(csvContent);

  const noEmails = new Set(
    rows
      .filter(r => ["1", "2"].includes((r["Our Score"] || "").trim()))
      .map(r => (r["Email"] || "").toLowerCase().trim())
      .filter(Boolean)
  );

  const s1 = rows.filter(r => (r["Our Score"] || "").trim() === "1").length;
  const s2 = rows.filter(r => (r["Our Score"] || "").trim() === "2").length;
  console.log(`\nRescreen CSV totals:`);
  console.log(`  Score 1 (Strong No): ${s1}`);
  console.log(`  Score 2 (No):        ${s2}`);
  console.log(`  Total to consider:   ${noEmails.size}\n`);

  console.log(`  Target stage (hardcoded): To Be Archived & Dispo (${ARCHIVE_STAGE_ID})\n`);

  // ── Fetch Ashby applications ───────────────────────────────────────────────
  const apps = await fetchAllApplications();
  console.log(`\nTotal Ashby applications: ${apps.length}`);

  // Discover Application Review stage ID from application objects (read-only, not used for moving)
  const stageMap = {};
  for (const app of apps) {
    const s = app.currentInterviewStage;
    if (s && !stageMap[s.id]) stageMap[s.id] = s.title;
  }

  console.log("\nStages found in Ashby:");
  Object.entries(stageMap).forEach(([id, title]) => console.log(`  ${title.padEnd(45)} ${id}`));

  const appReviewEntry = Object.entries(stageMap).find(([, t]) => t.toLowerCase().includes("application review"));
  if (!appReviewEntry) { console.error("\n❌ Could not find Application Review stage"); process.exit(1); }
  const [appReviewId, appReviewTitle] = appReviewEntry;
  console.log(`\n  Source (Application Review): "${appReviewTitle}" (${appReviewId})`);
  console.log(`  Target (hardcoded):          "To Be Archived & Dispo" (${ARCHIVE_STAGE_ID})\n`);

  // ── Filter: only Application Review + scored 1 or 2 ───────────────────────
  const toArchive = apps.filter(app => {
    if (app.currentInterviewStage?.id !== appReviewId) return false;
    const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
    return email && noEmails.has(email);
  });

  const allInAppReview = apps.filter(a => a.currentInterviewStage?.id === appReviewId);
  console.log(`  Currently in Application Review:       ${allInAppReview.length}`);
  console.log(`  Scored 1 or 2 in rescreen CSV:         ${noEmails.size}`);
  console.log(`  To move → To Be Archived & Dispo:      ${toArchive.length}`);

  if (toArchive.length === 0) { console.log("\n  Nothing to move. Done."); return; }

  if (DRY_RUN) {
    console.log(`\nFirst 20 candidates that would be moved:`);
    toArchive.slice(0, 20).forEach((app, i) => {
      const email  = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase();
      const csvRow = rows.find(r => (r["Email"] || "").toLowerCase().trim() === email);
      console.log(`  [${i+1}] ${(app.candidate?.name ?? "Unknown").padEnd(35)} Score: ${csvRow?.["Our Score"] ?? "?"} · Brainner: ${csvRow?.["Brainner Score"] ?? "?"}`);
    });
    if (toArchive.length > 20) console.log(`  … and ${toArchive.length - 20} more`);
    console.log(`\n✅ Dry run complete. To execute:\n   node archive-tpm-no.js --execute\n`);
    return;
  }

  // ── Execute ────────────────────────────────────────────────────────────────
  console.log("\nMoving to To Be Archived & Dispo…");
  let moved = 0, errors = 0;
  for (const app of toArchive) {
    const name = app.candidate?.name ?? "Unknown";
    process.stdout.write(`  ${name}… `);
    try {
      const res = await ashbyPost("/application.changeStage", {
        applicationId:    app.id,
        interviewStageId: ARCHIVE_STAGE_ID,
        // No archiveReasonId — "To Be Archived & Dispo" is a pipeline stage, not Ashby's terminal archive
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
