#!/usr/bin/env node
/**
 * Compares Ashby Application Review vs Brainner for Sr Manager TPM.
 * Finds candidates in Ashby but missing from Brainner, and vice versa.
 *
 * Run: node compare-tpm-ashby-brainner.js
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY    = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const BRAINNER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const ASHBY_JOB_ID = "59d95ceb-ba5e-4c01-8c05-c99076529012";
const BRAINNER_SLUG = "b46b4a19-16f8-4b5c-abfe-dcc42ff90175";

// ── HTTP helpers ──────────────────────────────────────────────────────────────
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

function brainnerGet(urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "admin.brainner.ai",
      path:     urlPath,
      method:   "GET",
      headers:  { "Authorization": `Bearer ${BRAINNER_KEY}` }
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.setTimeout(60000, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Fetch all Ashby Application Review candidates ─────────────────────────────
async function fetchAshbyAppReview() {
  console.log("Fetching Ashby Application Review candidates…");
  const candidates = [];
  let cursor = null;
  let page = 1;
  let appReviewStageId = null;

  while (true) {
    const payload = { jobId: ASHBY_JOB_ID, limit: 100 };
    if (cursor) payload.cursor = cursor;

    const res = await ashbyPost("/application.list", payload);
    const apps = res.results ?? [];

    for (const app of apps) {
      // Discover Application Review stage ID from first app that has it
      if (!appReviewStageId && app.currentInterviewStage?.title?.toLowerCase().includes("application review")) {
        appReviewStageId = app.currentInterviewStage.id;
      }

      if (appReviewStageId && app.currentInterviewStage?.id === appReviewStageId) {
        const email = (app.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim();
        const name  = app.candidate?.name ?? "Unknown";
        candidates.push({ email, name, ashbyId: app.id });
      }
    }

    process.stdout.write(`\r  Page ${page}: ${candidates.length} in Application Review so far…`);
    page++;

    if (!res.moreDataAvailable) break;
    cursor = res.nextCursor;
    await sleep(150);
  }

  console.log(`\n  ✅ Ashby Application Review: ${candidates.length} candidates\n`);
  return candidates;
}

// ── Fetch ALL Brainner candidates for this job (all statuses) ─────────────────
async function fetchAllBrainner() {
  console.log("Fetching ALL Brainner candidates for this job (all statuses)…");
  const candidates = [];
  let page = 1;
  const pageSize = 200;
  let grandTotal = null;

  while (true) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": BRAINNER_SLUG,
      "pagination[pageSize]": String(pageSize),
      "pagination[page]": String(page),
    });

    const res = await brainnerGet(`/api/candidates?${params}`);
    const data = res.data ?? [];
    if (grandTotal === null) grandTotal = res.meta?.pagination?.total ?? "?";

    for (const c of data) {
      const email  = (c.attributes?.Email || "").toLowerCase().trim();
      const name   = c.attributes?.Name ?? "Unknown";
      const status = c.attributes?.Status ?? "unknown";
      const score  = c.attributes?.Score ?? null;
      candidates.push({ email, name, status, score });
    }

    process.stdout.write(`\r  Page ${page}: ${candidates.length}/${grandTotal} fetched…`);
    page++;

    if (candidates.length >= grandTotal || data.length < pageSize) break;
    await sleep(150);
  }

  console.log(`\n  ✅ Brainner total (all statuses): ${candidates.length} candidates\n`);
  return candidates;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n━━━ Ashby vs Brainner — Sr Manager TPM Gap Analysis ━━━\n");

  const [ashby, brainner] = await Promise.all([
    fetchAshbyAppReview(),
    fetchAllBrainner()
  ]);

  const brainnerByEmail = new Map(brainner.map(c => [c.email, c]));
  const ashbyByEmail    = new Map(ashby.map(c => [c.email, c]));

  // Candidates in Ashby App Review but NOT in Brainner at all
  const missingFromBrainner = ashby.filter(c => c.email && !brainnerByEmail.has(c.email));

  // Candidates in Ashby App Review but in Brainner with a non-default status
  // (e.g. rejected/archived in Brainner but still sitting in Ashby App Review)
  const inBrainnerButWrongStatus = ashby.filter(c => {
    if (!c.email) return false;
    const b = brainnerByEmail.get(c.email);
    return b && b.status !== "to_review" && b.status !== "evaluated" && b.status !== "pending";
  });

  // Candidates in Brainner but NOT in Ashby App Review (in Brainner but moved stages in Ashby)
  const missingFromAshby = brainner.filter(c => c.email && !ashbyByEmail.has(c.email));

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Ashby Application Review:   ${ashby.length}`);
  console.log(`  Brainner (all statuses):    ${brainner.length}`);
  console.log(`  Difference:                 ${ashby.length - brainner.length}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Brainner status breakdown
  const statusCounts = {};
  brainner.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
  console.log("Brainner status breakdown:");
  Object.entries(statusCounts).sort((a,b) => b[1]-a[1]).forEach(([s,n]) => {
    console.log(`  ${s.padEnd(20)} ${n}`);
  });
  console.log();

  if (missingFromBrainner.length) {
    console.log(`⚠️  In Ashby App Review but NOT in Brainner at all: ${missingFromBrainner.length}`);
    missingFromBrainner.slice(0, 20).forEach(c => console.log(`   - ${c.name} <${c.email}>`));
    if (missingFromBrainner.length > 20) console.log(`   … and ${missingFromBrainner.length - 20} more`);
    console.log();
  }

  if (inBrainnerButWrongStatus.length) {
    console.log(`ℹ️  In Ashby App Review but Brainner status is NOT active: ${inBrainnerButWrongStatus.length}`);
    inBrainnerButWrongStatus.slice(0, 20).forEach(c => {
      const b = brainnerByEmail.get(c.email);
      console.log(`   - ${c.name} <${c.email}> → Brainner: ${b.status} (score: ${b.score ?? "none"})`);
    });
    if (inBrainnerButWrongStatus.length > 20) console.log(`   … and ${inBrainnerButWrongStatus.length - 20} more`);
    console.log();
  }

  // Save full gap report to file
  const report = {
    asOf: new Date().toISOString(),
    ashbyAppReviewCount: ashby.length,
    brainnerTotalCount: brainner.length,
    brainnerStatusBreakdown: statusCounts,
    inAshbyNotInBrainner: missingFromBrainner,
    inAshbyButInactiveInBrainner: inBrainnerButWrongStatus.map(c => ({
      ...c, brainnerStatus: brainnerByEmail.get(c.email)?.status, brainnerScore: brainnerByEmail.get(c.email)?.score
    })),
  };
  const outFile = path.join(__dirname, "tpm-gap-report.json");
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(`📄 Full report saved: ${outFile}`);
  console.log();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
