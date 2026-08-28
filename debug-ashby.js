#!/usr/bin/env node
// Quick Ashby API diagnostic — run this and paste output back

const https = require("https");

const ASHBY_KEY = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const JOB_ID    = "6d148a63-d9e2-48ad-910c-465ada648b4d";

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
        "Accept":         "application/json; version=1",
        "Authorization":  "Basic " + encoded,
        "Content-Length": Buffer.byteLength(body),
      }
    }, (res) => {
      let d = "";
      res.on("data", c => d += c);
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  // Try 1: interviewStage.list with no params
  console.log("\n--- /interviewStage.list (empty) ---");
  const r1 = await ashbyPost("/interviewStage.list", {});
  console.log(JSON.stringify(r1).slice(0, 500));

  // Try 2: interviewStage.list with jobId
  console.log("\n--- /interviewStage.list (with jobId) ---");
  const r2 = await ashbyPost("/interviewStage.list", { jobId: JOB_ID });
  console.log(JSON.stringify(r2).slice(0, 500));

  // Try 3: job.info
  console.log("\n--- /job.info ---");
  const r3 = await ashbyPost("/job.info", { jobId: JOB_ID });
  console.log(JSON.stringify(r3).slice(0, 800));

  // Try 4: application.list (first 3)
  console.log("\n--- /application.list (first 3) ---");
  const r4 = await ashbyPost("/application.list", { jobId: JOB_ID, limit: 3 });
  const sample = (r4.results || []).slice(0, 2).map(a => ({
    id: a.id,
    candidateName: a.candidate?.name,
    email: a.candidate?.primaryEmailAddress?.value,
    currentStage: a.currentInterviewStage?.title,
    currentStageId: a.currentInterviewStage?.id,
  }));
  console.log(JSON.stringify({ moreData: r4.moreDataAvailable, sample }, null, 2));
}

main().catch(console.error);
