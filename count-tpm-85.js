#!/usr/bin/env node
/**
 * Count Brainner candidates scored 85+ for Sr Manager TPM
 * Run: node count-tpm-85.js
 */

const https = require("https");

const BRAINNER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const JOB_SLUG    = "b46b4a19-16f8-4b5c-abfe-dcc42ff90175";
const MIN_SCORE   = 85;

function httpsGet(urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "admin.brainner.ai",
      path: urlPath,
      method: "GET",
      headers: { "Authorization": `Bearer ${BRAINNER_KEY}` }
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

async function main() {
  console.log(`\nFetching all candidates for Sr Manager TPM (score high → low)…\n`);

  let page = 1;
  const pageSize = 200;
  let total85 = 0;
  let totalFetched = 0;
  let grandTotal = null;
  let done = false;

  while (!done) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": JOB_SLUG,
      "filters[Status][$eq]": "evaluated",   // only Brainner-scored candidates
      "sort": "Score:desc",
      "pagination[pageSize]": String(pageSize),
      "pagination[page]": String(page),
    });

    const res = await httpsGet(`/api/candidates?${params}`);
    const data = res.data ?? [];
    if (grandTotal === null) grandTotal = res.meta?.pagination?.total ?? "?";

    for (const c of data) {
      const score  = c.attributes?.Score ?? 0;
      const name   = c.attributes?.Name ?? "Unknown";
      const status = c.attributes?.Status ?? "";
      totalFetched++;
      if (score >= MIN_SCORE) {
        total85++;
        console.log(`  [${total85}] ${name} — Score: ${score}  (${status})`);
      }
      // No early exit — fetch all pages and count everything >= 85
    }

    if (data.length < pageSize || totalFetched >= grandTotal) done = true;
    if (!done) page++;
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`  Total candidates in job: ${grandTotal}`);
  console.log(`  Scored ${MIN_SCORE}+:         ${total85}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
