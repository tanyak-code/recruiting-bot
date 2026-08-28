#!/usr/bin/env node
// Lists all interview stages for a given Ashby job ID
// Usage: node list-stages.js <jobId>
// Example: node list-stages.js 59d95ceb-ba5e-4c01-8c05-c99076529012

const https = require("https");
const ASHBY_KEY = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const jobId = process.argv[2];
if (!jobId) { console.error("Usage: node list-stages.js <jobId>"); process.exit(1); }

function ashbyPost(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const encoded = Buffer.from(ASHBY_KEY + ":").toString("base64");
    const req = https.request({
      hostname: "api.ashbyhq.com", path: endpoint, method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body), "Authorization": "Basic " + encoded }
    }, res => {
      let d = ""; res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on("error", reject); req.write(body); req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log(`\nFetching stages from applications for job ${jobId}…`);
  const stageMap = {};
  let cursor = null;
  let page = 1;

  while (true) {
    const payload = { jobId, limit: 100 };
    if (cursor) payload.cursor = cursor;
    const res = await ashbyPost("/application.list", payload);
    for (const app of res.results ?? []) {
      const s = app.currentInterviewStage;
      if (s && !stageMap[s.id]) stageMap[s.id] = s.title;
    }
    process.stdout.write(`\r  Page ${page}: ${Object.keys(stageMap).length} unique stages found…`);
    page++;
    if (!res.moreDataAvailable) break;
    cursor = res.nextCursor;
    await sleep(150);
  }

  console.log(`\n\nAll stages found:\n`);
  Object.entries(stageMap)
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([id, title]) => console.log(`  ${title.padEnd(45)} ${id}`));
  console.log();
}
main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
