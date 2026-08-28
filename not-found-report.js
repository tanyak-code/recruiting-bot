#!/usr/bin/env node
/**
 * Report candidates with score 1/2 in cache who are NOT found in Ashby
 * (may already be archived, rejected, or applied under a different email)
 * Does NOT move anyone.
 */

const https = require("https");
const fs    = require("fs");
const path  = require("path");

const ASHBY_KEY = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";

const JOBS = [
  { label: "Sr. Product Manager (Jordan)", jobId: "fb14d682-a04b-4db4-aed3-eed210e1673b", cache: "sr-pm-cache.json" },
  { label: "Product Ops (Ed)",             jobId: "6d148a63-d9e2-48ad-910c-465ada648b4d", cache: "prod-ops-cache.json" },
  { label: "Sr. Manager TPM (Ed)",         jobId: "59d95ceb-ba5e-4c01-8c05-c99076529012", cache: "sr-tpm-cache.json" },
];

function ashbyPost(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const encoded = Buffer.from(ASHBY_KEY + ":").toString("base64");
    const req = https.request({
      hostname: "api.ashbyhq.com", path: endpoint, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "Authorization": "Basic " + encoded }
    }, (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } }); });
    req.on("error", reject); req.write(body); req.end();
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

async function main() {
  let grandTotal = 0;
  for (const job of JOBS) {
    const cacheFile = path.join(__dirname, job.cache);
    if (!fs.existsSync(cacheFile)) { console.log(`\n${job.label}: cache not found`); continue; }

    const cache = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
    const lowScorers = Object.entries(cache)
      .filter(([, r]) => r.ourScore === 1 || r.ourScore === 2)
      .map(([email, r]) => ({ email: email.toLowerCase().trim(), name: r.name, score: r.ourScore }));

    process.stdout.write(`\nFetching ${job.label}...`);
    const applications = await fetchAllApplications(job.jobId);
    console.log(` ${applications.length} applications found`);

    const emails = new Set(applications.map(a => (a.candidate?.primaryEmailAddress?.value || "").toLowerCase().trim()).filter(Boolean));

    const notFound = lowScorers.filter(c => !emails.has(c.email));
    grandTotal += notFound.length;

    console.log(`\n── ${job.label} ──────────────────────────`);
    console.log(`   Score 1/2 in cache: ${lowScorers.length} | Not found in Ashby: ${notFound.length}`);
    if (notFound.length === 0) {
      console.log("   ✅ All candidates accounted for in Ashby.");
    } else {
      notFound.forEach((c, i) => console.log(`   ${String(i+1).padStart(3)}. [Score ${c.score}] ${c.name}  <${c.email}>`));
    }
  }
  console.log(`\n──────────────────────────────────────────`);
  console.log(`Total not found across all roles: ${grandTotal}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
