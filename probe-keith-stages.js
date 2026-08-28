#!/usr/bin/env node
/**
 * Probe: discover actual stage IDs for the Keith Staff SWE Backend job
 * Run: node probe-keith-stages.js
 */

const https = require("https");

const ASHBY_KEY = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID    = "751790c7-b317-4ae8-8638-a4998f0ba8d1";

function ashbyPost(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const body    = JSON.stringify(payload);
    const encoded = Buffer.from(ASHBY_KEY + ":").toString("base64");
    const req = https.request({
      hostname: "api.ashbyhq.com", path: endpoint, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "Authorization": "Basic " + encoded }
    }, (res) => { let d = ""; res.on("data", c => d += c); res.on("end", () => resolve(JSON.parse(d))); });
    req.on("error", reject);
    req.write(body); req.end();
  });
}

async function main() {
  const stageMap = {};
  let cursor = null;
  let total = 0;
  let pages = 0;

  // Paginate through ALL applications to catch every stage
  while (true) {
    const payload = { jobId: JOB_ID, limit: 100 };
    if (cursor) payload.cursor = cursor;
    const resp = await ashbyPost("/application.list", payload);
    const results = resp.results || [];
    total += results.length;
    pages++;

    for (const app of results) {
      const s = app.currentInterviewStage;
      if (s?.id) {
        if (!stageMap[s.id]) stageMap[s.id] = { title: s.title, count: 0 };
        stageMap[s.id].count++;
      }
    }

    if (!resp.moreDataAvailable || results.length === 0) break;
    cursor = resp.nextCursor;
    process.stdout.write(`  Fetched ${total} apps (${pages} pages)...\r`);
  }

  console.log(`\nTotal applications: ${total} across ${pages} page(s)\n`);
  console.log("ALL STAGE IDs for this job:");
  console.log("─".repeat(70));

  // Sort by count descending
  const sorted = Object.entries(stageMap).sort((a, b) => b[1].count - a[1].count);
  for (const [id, { title, count }] of sorted) {
    console.log(`  "${title}"`);
    console.log(`   ID:    ${id}`);
    console.log(`   Count: ${count} candidates`);
    console.log();
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
