#!/usr/bin/env node
// Quick count of Brainner score distribution for Sr. Manager TPM role

const https = require("https");

const BRAINNER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const JOB_SLUG     = "b46b4a19-16f8-4b5c-abfe-dcc42ff90175";

function httpsGet(hostname, path, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname, path, method: "GET", headers }, (res) => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  const pageSize = 200;
  let page = 1;
  const all = [];

  while (true) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": JOB_SLUG,
      "pagination[pageSize]": String(pageSize),
      "pagination[page]": String(page),
    });
    const res = await httpsGet("admin.brainner.ai", `/api/candidates?${params}`, {
      "Authorization": `Bearer ${BRAINNER_KEY}`
    });
    const data = res.data ?? [];
    all.push(...data);
    const total = res.meta?.pagination?.total ?? data.length;
    if (all.length >= total || data.length < pageSize) break;
    page++;
  }

  const dist = {};
  for (const c of all) {
    const score = c.attributes.Score ?? "null";
    dist[score] = (dist[score] || 0) + 1;
  }

  // Status distribution
  const statuses = {};
  for (const c of all) {
    const s = c.attributes.Status ?? "null";
    statuses[s] = (statuses[s] || 0) + 1;
  }
  console.log(`\nTotal candidates: ${all.length}\n`);
  console.log("Status distribution:");
  Object.entries(statuses)
    .sort((a, b) => b[1] - a[1])
    .forEach(([s, count]) => console.log(`  "${s}": ${count}`));

  console.log("\nScore distribution:");
  Object.entries(dist)
    .sort((a, b) => Number(b[0]) - Number(a[0]))
    .forEach(([score, count]) => console.log(`  Score ${score}: ${count}`));
}

main().catch(console.error);
