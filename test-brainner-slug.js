#!/usr/bin/env node
/**
 * Quick connectivity check — tests new Jordan Sr. PM Brainner slug.
 * Run: node test-brainner-slug.js
 */
const https = require("https");

const BRAINNER_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const NEW_SLUG     = "41ff6b62-c6b9-4edb-b9f3-5a8b52e22ca4";

const params = new URLSearchParams({
  "filters[Job][Slug][$eq]": NEW_SLUG,
  "filters[Status][$eq]":    "evaluated",
  "sort":                    "Score:desc",
  "pagination[page]":        "1",
  "pagination[pageSize]":    "5"
});

const url = `https://admin.brainner.ai/api/candidates?${params}`;

const req = https.get(url, {
  headers: { Authorization: `Bearer ${BRAINNER_KEY}` }
}, (res) => {
  let body = "";
  res.on("data", d => body += d);
  res.on("end", () => {
    try {
      const data = JSON.parse(body);
      const meta = data.meta || {};
      const cands = data.data || [];
      console.log(`✅ Connected! Status: ${res.statusCode}`);
      console.log(`   Slug:  ${NEW_SLUG}`);
      console.log(`   Total candidates (evaluated/To Review): ${meta.total ?? meta.totalCount ?? "?"}`);
      console.log(`   First ${cands.length} candidates:`);
      cands.forEach(c => {
        const a = c.attributes || c;
        console.log(`   - ${a.Name || a.CandidateName || "?"} | Score: ${a.Score ?? "?"}`);
      });
      if (cands.length === 0) {
        console.log("   ⚠️  No candidates found — slug may be wrong, or no candidates are in 'To Review' status yet.");
      }
    } catch (e) {
      console.error("❌ Failed to parse response:", e.message);
      console.error("Raw:", body.slice(0, 500));
    }
  });
});

req.on("error", e => {
  console.error("❌ Request failed:", e.message);
});
