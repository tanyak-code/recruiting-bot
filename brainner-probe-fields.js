#!/usr/bin/env node
/**
 * Probe Brainner to discover available field/filter names
 * Run: node brainner-probe-fields.js
 */
const https = require("https");

const BRAINNER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const JOB_SLUG     = "957115f1-3544-4956-afaf-59817757e0e5";

function get(urlPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "admin.brainner.ai",
      path:     urlPath,
      method:   "GET",
      headers:  { "Authorization": `Bearer ${BRAINNER_KEY}`, "Accept": "application/json" },
    }, res => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d.slice(0, 500) }); } });
    });
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  // 1. Fetch one candidate and dump ALL attribute keys
  console.log("\n📋 Fetching one candidate to inspect all available fields...\n");
  const params = new URLSearchParams({
    "filters[Job][Slug][$eq]": JOB_SLUG,
    "pagination[page]":        "1",
    "pagination[pageSize]":    "1",
  }).toString();

  const resp = await get(`/api/candidates?${params}`);
  const candidate = resp?.data?.[0];

  if (!candidate) {
    console.log("❌ No candidates returned. Raw response:");
    console.log(JSON.stringify(resp).slice(0, 500));
    return;
  }

  const attrs = candidate.attributes || {};
  console.log("✅ Candidate attribute keys:");
  for (const [key, val] of Object.entries(attrs)) {
    const preview = typeof val === "object" ? JSON.stringify(val).slice(0, 80) : String(val).slice(0, 80);
    console.log(`   ${key}: ${preview}`);
  }

  // 2. Also print raw candidate structure (top level keys)
  console.log("\n📋 Top-level candidate keys:", Object.keys(candidate).join(", "));

  // 3. Try fetching with Status filter to see all unique Status values
  console.log("\n📋 Fetching 10 candidates to see Status/Pipeline variety...");
  const params2 = new URLSearchParams({
    "filters[Job][Slug][$eq]": JOB_SLUG,
    "pagination[page]":        "1",
    "pagination[pageSize]":    "10",
  }).toString();

  const resp2 = await get(`/api/candidates?${params2}`);
  const rows = resp2?.data || [];
  const statusValues = new Set();
  for (const r of rows) {
    const a = r.attributes || {};
    // Print every key that looks like it could be a pipeline/stage/ATS field
    for (const [k, v] of Object.entries(a)) {
      if (/pipeline|stage|ats|status|phase|step/i.test(k)) {
        statusValues.add(`${k}: ${JSON.stringify(v).slice(0, 60)}`);
      }
    }
  }
  if (statusValues.size) {
    console.log("   Pipeline/Stage/ATS-related fields found:");
    for (const s of statusValues) console.log(`   → ${s}`);
  } else {
    console.log("   No obvious pipeline/stage/ATS fields detected in attributes.");
    console.log("   All keys from first 10 candidates:");
    const allKeys = new Set(rows.flatMap(r => Object.keys(r.attributes || {})));
    for (const k of allKeys) console.log(`   · ${k}`);
  }
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
