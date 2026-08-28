"use strict";
/**
 * add-ashby-links.js — enrich p4-tpm-recycle-list.csv with Ashby profile links.
 * Matches by email against applications on the Sr. Manager TPM job, adds:
 *   Ashby Link | Current Stage | App Status
 * Run:  node add-ashby-links.js
 * Out:  p4-tpm-recycle-list-with-links.csv
 */
const fs = require("fs");
const path = require("path");

const ASHBY_KEY = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID = "59d95ceb-ba5e-4c01-8c05-c99076529012"; // Sr. Manager TPM (Ed)
const IN_FILE = path.join(__dirname, "p4-tpm-recycle-list.csv");
const OUT_FILE = path.join(__dirname, "p4-tpm-recycle-list-with-links.csv");
const AUTH = "Basic " + Buffer.from(ASHBY_KEY + ":").toString("base64");

async function ashby(endpoint, body) {
  const res = await fetch(`https://api.ashbyhq.com/${endpoint}`, {
    method: "POST",
    headers: { Authorization: AUTH, "Content-Type": "application/json" },
    body: JSON.stringify(body || {}),
  });
  return res.json();
}

// minimal CSV parse (handles quoted fields with commas/newlines)
function parseCSV(text) {
  const rows = []; let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (ch !== "\r") field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] || "").trim() !== "");
}
const q = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;

(async () => {
  // 1. email -> {candidateId, stage, status} from the TPM job's applications
  const map = new Map();
  let cursor = null, total = 0;
  while (true) {
    const body = { jobId: JOB_ID, limit: 100 };
    if (cursor) body.cursor = cursor;
    const res = await ashby("application.list", body);
    if (!res.success) { console.error("application.list error:", res.errors); process.exit(1); }
    for (const a of res.results || []) {
      const em = a.candidate?.primaryEmailAddress?.value?.toLowerCase().trim();
      if (em && !map.has(em)) {
        map.set(em, {
          id: a.candidate?.id,
          stage: a.currentInterviewStage?.title || "",
          status: a.status || "",
        });
      }
    }
    total += (res.results || []).length;
    process.stdout.write(`\r  fetched ${total} applications…`);
    if (!res.moreDataAvailable || !(res.results || []).length) break;
    cursor = res.nextCursor;
  }
  console.log(`\n  built email map: ${map.size} candidates`);

  // 2. enrich CSV
  const rows = parseCSV(fs.readFileSync(IN_FILE, "utf8"));
  const header = rows[0];
  const emailIdx = header.findIndex((h) => h.toLowerCase() === "email");
  const out = [[...header, "Ashby Link", "Current Stage", "App Status"].map(q).join(",")];
  let hit = 0, miss = 0;
  for (const r of rows.slice(1)) {
    const em = (r[emailIdx] || "").toLowerCase().trim();
    const m = map.get(em);
    if (m && m.id) { hit++; out.push([...r, `https://app.ashbyhq.com/candidates/${m.id}`, m.stage, m.status].map(q).join(",")); }
    else { miss++; out.push([...r, "", "not found on TPM job", ""].map(q).join(",")); }
  }
  fs.writeFileSync(OUT_FILE, out.join("\n"));
  console.log(`  matched ${hit}, unmatched ${miss}`);
  console.log(`✅ Wrote ${OUT_FILE}`);
})();
