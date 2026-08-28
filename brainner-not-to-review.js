#!/usr/bin/env node
/**
 * Counts Brainner candidates for Sr Manager TPM whose status is NOT "to_review"
 * and how many of those have a score of 85+.
 *
 * Run: node brainner-not-to-review.js
 */

const https = require("https");

const BRAINNER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const JOB_SLUG    = "b46b4a19-16f8-4b5c-abfe-dcc42ff90175";

function httpsGet(urlPath) {
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

async function main() {
  console.log("\nFetching ALL Brainner candidates for Sr Manager TPM…\n");

  const all = [];
  let page = 1;
  const pageSize = 200;
  let grandTotal = null;

  while (true) {
    const params = new URLSearchParams({
      "filters[Job][Slug][$eq]": JOB_SLUG,
      "pagination[pageSize]": String(pageSize),
      "pagination[page]":     String(page),
    });

    const res  = await httpsGet(`/api/candidates?${params}`);
    const data = res.data ?? [];
    if (grandTotal === null) grandTotal = res.meta?.pagination?.total ?? "?";

    for (const c of data) {
      all.push({
        name:   c.attributes?.Name   ?? "Unknown",
        status: c.attributes?.Status ?? "unknown",
        score:  c.attributes?.Score  ?? null,
      });
    }

    process.stdout.write(`\r  Page ${page}: ${all.length}/${grandTotal} fetched…`);
    if (all.length >= grandTotal || data.length < pageSize) break;
    page++;
    await new Promise(r => setTimeout(r, 150));
  }

  console.log("\n");

  // ── Status breakdown (all candidates) ────────────────────────────────────────
  const statusCounts = {};
  all.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

  console.log("━━━ All candidates status breakdown ━━━");
  Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => {
    const isToReview = s === "evaluated";
    console.log(`  ${s.padEnd(25)} ${String(n).padStart(5)}  ${isToReview ? "← \"to_review\" in Brainner UI" : ""}`);
  });
  console.log(`${"".padEnd(35)}─────`);
  console.log(`  ${"TOTAL".padEnd(24)} ${String(all.length).padStart(5)}`);

  // ── NOT "to_review" ───────────────────────────────────────────────────────────
  const notToReview = all.filter(c => c.status !== "evaluated");
  console.log(`\n━━━ Status is NOT "to_review" ━━━`);
  console.log(`  Count:     ${notToReview.length}`);

  const notToReview85 = notToReview.filter(c => c.score !== null && c.score >= 85);
  console.log(`  Score 85+: ${notToReview85.length}`);

  // Score breakdown for those 85+
  const buckets = [
    { label: "95+",   min: 95, max: 200 },
    { label: "90–94", min: 90, max: 94  },
    { label: "85–89", min: 85, max: 89  },
  ];
  console.log("\n  Score breakdown for non-to_review 85+:");
  buckets.forEach(b => {
    const n = notToReview85.filter(c => c.score >= b.min && c.score <= b.max).length;
    console.log(`    ${b.label.padEnd(8)} ${n}`);
  });

  // Status breakdown for the 85+ non-to_review group
  const byStatus = {};
  notToReview85.forEach(c => { byStatus[c.status] = (byStatus[c.status] || 0) + 1; });
  console.log("\n  Status breakdown for non-to_review 85+:");
  Object.entries(byStatus).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => {
    console.log(`    ${s.padEnd(25)} ${n}`);
  });

  // ── Unscored / null-score candidates ─────────────────────────────────────────
  const unscored = all.filter(c => c.score === null);
  console.log(`\n━━━ Unscored (null Score) ━━━`);
  console.log(`  Count: ${unscored.length}`);
  const unscoredByStatus = {};
  unscored.forEach(c => { unscoredByStatus[c.status] = (unscoredByStatus[c.status] || 0) + 1; });
  Object.entries(unscoredByStatus).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => {
    console.log(`    ${s.padEnd(25)} ${n}`);
  });

  console.log();
}

main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
