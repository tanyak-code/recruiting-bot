const http = require("http");
const https = require("https");

const PORT = 3131;

// ── paste your keys here ──────────────────────────────────────────────────
const ASHBY_API_KEY     = "dfa5eaac92bb215d101239d361d93dc0eaf32d958291ad4f716239037450c5dc";
const ANTHROPIC_API_KEY = "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";
const BRAINNER_API_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTczNSwidG9rZW5SZWYiOiI5ZGYzNGY0My0yZjVhLTQ4ZmUtODYxMy1jNjNjZjJjM2FhOTMiLCJpYXQiOjE3NzY3MTQ0MDUsImV4cCI6MTgwODI1MDQwNX0.7WECQOeiWEA5oD4JjLZU1aDl-PUTpXo6pbLB3b9j5p8";
const BRAINNER_API_BASE = "btbpyze574.execute-api.us-east-1.amazonaws.com";
// ─────────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// In-memory store for relay text results
const _textStore = {};

function jsonResponse(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", ...CORS_HEADERS });
  res.end(JSON.stringify(data));
}

function ashbyPost(endpoint, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const encoded = Buffer.from(ASHBY_API_KEY + ":").toString("base64");
    const req = https.request(
      {
        hostname: "api.ashbyhq.com",
        path: endpoint,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json; version=1",
          "Authorization": "Basic " + encoded,
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (upstream) => {
        let data = "";
        upstream.on("data", (c) => (data += c));
        upstream.on("end", () => {
          try { resolve(JSON.parse(data)); }
          catch { reject(new Error("Ashby parse error: " + data.slice(0, 200))); }
        });
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const follow = (u, redirects) => {
      if (redirects > 5) return reject(new Error("Too many redirects"));
      const mod = u.startsWith("https") ? https : http;
      mod.get(u, (res) => {
        if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
          return follow(res.headers.location, redirects + 1);
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve({
          buffer: Buffer.concat(chunks),
          contentType: res.headers["content-type"] ?? ""
        }));
      }).on("error", reject);
    };
    follow(url, 0);
  });
}

let pdfjsLib;
try {
  pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
} catch(e) { pdfjsLib = null; console.log("pdfjs load error:", e.message); }

let pdfParse;
try { pdfParse = require("pdf-parse"); } catch(e) { pdfParse = null; }

async function extractPdfTextFromBuffer(buffer) {
  // Try pdfjs-dist first (most reliable)
  if (pdfjsLib) {
    try {
      const uint8 = new Uint8Array(buffer);
      const doc = await pdfjsLib.getDocument({ data: uint8, useWorkerFetch: false, isEvalSupported: false, disableWorker: true }).promise;
      const pages = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const text = content.items.map(item => item.str).join(" ");
        pages.push(text);
      }
      const result = pages.join("\n").replace(/\s+/g, " ").trim();
      console.log(`  pdfjs extracted ${result.length} chars`);
      if (result.length > 100) return result.slice(0, 8000);
    } catch(e) {
      console.log("  pdfjs failed:", e.message, e.stack?.split("\n")[1]);
    }
  }

  // Fallback to pdf-parse
  if (pdfParse) {
    try {
      const data = await pdfParse(buffer);
      return data.text ?? "";
    } catch(e) {
      console.log("  pdf-parse failed, falling back to manual extraction");
    }
  }

  return extractPdfText(buffer);
}

function extractPdfText(buffer) {
  try {
    const str = buffer.toString("latin1");
    const texts = [];

    // Extract text from BT...ET blocks (standard PDF text blocks)
    const btEtRegex = /BT([\s\S]*?)ET/g;
    let match;
    while ((match = btEtRegex.exec(str)) !== null) {
      const block = match[1];

      // Parenthesis strings: (Hello World)
      const parenRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
      let pm;
      while ((pm = parenRegex.exec(block)) !== null) {
        const cleaned = pm[1]
          .replace(/\\n/g, " ").replace(/\\r/g, " ").replace(/\\t/g, " ")
          .replace(/\\\\/g, "\\").replace(/\\([()\\])/g, "$1")
          .replace(/[^\x20-\x7E]/g, " ").trim();
        if (cleaned.length > 1) texts.push(cleaned);
      }

      // Hex strings: <48656c6c6f>
      const hexRegex = /<([0-9a-fA-F]{4,})>/g;
      let hm;
      while ((hm = hexRegex.exec(block)) !== null) {
        const hex = hm[1];
        if (hex.length % 2 === 0) {
          let decoded = "";
          for (let i = 0; i < hex.length; i += 2) {
            const code = parseInt(hex.slice(i, i + 2), 16);
            if (code >= 32 && code <= 126) decoded += String.fromCharCode(code);
            else if (code > 0) decoded += " ";
          }
          const t = decoded.trim();
          if (t.length > 1) texts.push(t);
        }
      }
    }

    const result = texts.join(" ").replace(/\s+/g, " ").trim();
    if (result.length > 100) return result.slice(0, 8000);

    // Fallback: scan raw bytes for readable ASCII sequences (catches some compressed PDFs)
    const fallback = [];
    let current = "";
    for (let i = 0; i < Math.min(buffer.length, 500000); i++) {
      const c = buffer[i];
      if (c >= 32 && c <= 126) {
        current += String.fromCharCode(c);
      } else {
        if (current.length >= 5 && /[a-zA-Z]{3,}/.test(current)) {
          fallback.push(current.trim());
        }
        current = "";
      }
    }
    return fallback.join(" ").replace(/\s+/g, " ").slice(0, 8000);

  } catch (e) {
    return "";
  }
}

async function handleResume(payload, res) {
  const { candidateId, applicationId } = payload;
  try {
    let files = [];

    if (applicationId) {
      try {
        const r = await ashbyPost("/application.listFiles", { applicationId });
        files = r.results ?? r.files ?? [];
      } catch {}
    }

    if (!files.length && candidateId) {
      try {
        const r = await ashbyPost("/candidate.listFiles", { candidateId });
        files = r.results ?? r.files ?? [];
      } catch {}
    }

    if (!files.length) {
      return jsonResponse(res, 200, { text: "", source: "none" });
    }

    // Prefer file named "resume", otherwise first PDF, otherwise first file
    const resume =
      files.find(f => /resume/i.test(f.name ?? f.fileName ?? "")) ??
      files.find(f => /\.pdf$/i.test(f.name ?? f.fileName ?? "") || f.fileType === "pdf") ??
      files[0];

    const fileUrl = resume.downloadUrl ?? resume.url ?? resume.fileUrl;
    if (!fileUrl) {
      return jsonResponse(res, 200, { text: "", source: "no_url" });
    }

    console.log(`  Downloading: ${resume.name ?? resume.fileName ?? "file"}`);
    const { buffer } = await downloadBuffer(fileUrl);
    console.log(`  Downloaded ${buffer.length} bytes`);

    const text = await extractPdfTextFromBuffer(buffer);
    console.log(`  Extracted ${text.length} chars`);

    return jsonResponse(res, 200, {
      text,
      source: text.length > 100 ? "pdf" : "pdf_empty",
      fileName: resume.name ?? resume.fileName ?? "resume.pdf"
    });

  } catch (e) {
    console.error("  Resume error:", e.message);
    return jsonResponse(res, 200, { text: "", source: "error", error: e.message });
  }
}

function proxyRequest(options, body, res) {
  const req = https.request(options, (upstream) => {
    res.writeHead(upstream.statusCode, { "Content-Type": "application/json", ...CORS_HEADERS });
    upstream.pipe(res);
  });
  req.on("error", (e) => jsonResponse(res, 502, { error: e.message }));
  if (body) req.write(body);
  req.end();
}

const fs = require("fs");
const path = require("path");

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS_HEADERS);
    return res.end();
  }

  // Serve criteria — single source of truth, loaded from criteria/*.js files
  if (req.method === "GET" && req.url === "/api/criteria") {
    try {
      const criteriaDir = path.join(__dirname, "criteria");
      const files = fs.readdirSync(criteriaDir).filter(f => f.endsWith(".js")).sort();
      // Canonical role order for tab display
      const ORDER = ["ed-tpm", "jordan", "mitch", "andre-mid", "ed-ops", "andre"];
      const roles = {};
      for (const file of files) {
        const key = file.replace(".js", "");
        try {
          // Clear require cache so updates are picked up on reload
          delete require.cache[require.resolve(path.join(criteriaDir, file))];
          roles[key] = require(path.join(criteriaDir, file));
        } catch(e) {
          console.error(`  criteria/${file} load error:`, e.message);
        }
      }
      // Return in canonical order, others appended at end
      const ordered = {};
      for (const k of ORDER) { if (roles[k]) ordered[k] = roles[k]; }
      for (const k of Object.keys(roles)) { if (!ordered[k]) ordered[k] = roles[k]; }
      res.writeHead(200, { "Content-Type": "application/json", ...CORS_HEADERS });
      res.end(JSON.stringify(ordered));
    } catch(e) {
      jsonResponse(res, 500, { error: e.message });
    }
    return;
  }

  // Serve static HTML files
  if (req.method === "GET" && (req.url === "/" || req.url === "/screener.html" || req.url === "/screener_v2.html" || req.url === "/relay.html")) {
    const fileName =
      req.url === "/screener_v2.html" ? "screener_v2.html" :
      req.url === "/relay.html" ? "relay.html" :
      "screener.html";
    const filePath = path.join(__dirname, fileName);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, CORS_HEADERS);
        return res.end("not found");
      }
      res.writeHead(200, { "Content-Type": "text/html", "Cache-Control": "no-store", ...CORS_HEADERS });
      res.end(data);
    });
    return;
  }

  // Brainner probe — GET request to discover available API endpoints
  if (req.method === "GET" && req.url === "/brainner-probe") {
    return (async () => {
      const JOB_UUID = "3db395e9-4c4a-4461-a73b-2fbe37021371";
      const endpoints = [
        "/prod/candidates",
        "/prod/jobs",
        "/prod/inbound",
        "/prod/me",
        "/prod/user",
        `/prod/jobs/${JOB_UUID}`,
        `/prod/jobs/${JOB_UUID}/candidates`,
        `/prod/jobs/${JOB_UUID}/inbound`,
        `/prod/job/${JOB_UUID}/candidates`,
        `/prod/inbound/${JOB_UUID}`,
        "/prod/v1/candidates",
        "/prod/v1/jobs",
      ];
      const results = {};
      for (const ep of endpoints) {
        await new Promise((resolve) => {
          const timer = setTimeout(() => { results[ep] = { error: "timeout" }; resolve(); }, 8000);
          const req2 = https.request({
            hostname: BRAINNER_API_BASE, path: ep, method: "GET",
            headers: { "Authorization": `Bearer ${BRAINNER_API_KEY}`, "Accept": "application/json" },
            timeout: 7000,
          }, (upstream) => {
            let data = "";
            upstream.on("data", c => data += c);
            upstream.on("end", () => { clearTimeout(timer); results[ep] = { status: upstream.statusCode, preview: data.slice(0, 400) }; resolve(); });
          });
          req2.on("timeout", () => { req2.destroy(); });
          req2.on("error", e => { clearTimeout(timer); results[ep] = { error: e.message }; resolve(); });
          req2.end();
        });
      }
      return jsonResponse(res, 200, results);
    })();
  }

  if (req.method !== "POST") {
    res.writeHead(404);
    return res.end("Not found");
  }

  let rawBody = "";
  req.on("data", (chunk) => (rawBody += chunk));
  req.on("end", () => {
    let parsed = {};
    try { parsed = JSON.parse(rawBody); } catch {}

    if (req.url === "/resume-url") {
      return (async () => {
        try {
          const { url } = parsed;
          if (!url) return jsonResponse(res, 400, { error: "No URL provided" });
          console.log(`  Downloading PDF from URL...`);
          const { buffer } = await downloadBuffer(url);
          console.log(`  Downloaded ${buffer.length} bytes`);
          const text = await extractPdfTextFromBuffer(buffer);
          console.log(`  Extracted ${text.length} chars`);
          return jsonResponse(res, 200, { text, source: text.length > 100 ? "pdf" : "pdf_empty" });
        } catch(e) {
          console.error("  resume-url error:", e.message);
          return jsonResponse(res, 200, { text: "", error: e.message });
        }
      })();
    }

    if (req.url === "/resume-base64") {
      return (async () => {
        try {
          const { base64 } = parsed;
          if (!base64) return jsonResponse(res, 400, { error: "No base64 data provided" });
          const buffer = Buffer.from(base64, "base64");
          console.log(`  Received PDF buffer: ${buffer.length} bytes`);
          const text = await extractPdfTextFromBuffer(buffer);
          console.log(`  Extracted ${text.length} chars`);
          return jsonResponse(res, 200, { text, source: text.length > 100 ? "pdf" : "pdf_empty" });
        } catch(e) {
          console.error("  resume-base64 error:", e.message);
          return jsonResponse(res, 200, { text: "", error: e.message });
        }
      })();
    }

    if (req.url === "/store-text") {
      const { text, source, error, candidateId } = parsed;
      if (candidateId) _textStore[candidateId] = { text: text || "", source: source || "unknown", error };
      return jsonResponse(res, 200, { ok: true });
    }

    if (req.url === "/get-text") {
      const { candidateId } = parsed;
      const result = _textStore[candidateId] || { text: "", source: "not_found" };
      delete _textStore[candidateId];
      return jsonResponse(res, 200, result);
    }

    if (req.url === "/resume") return handleResume(parsed, res);

    if (req.url.startsWith("/ashby/")) {
      const endpoint = req.url.replace("/ashby", "");
      const encoded = Buffer.from(ASHBY_API_KEY + ":").toString("base64");
      return proxyRequest({
        hostname: "api.ashbyhq.com",
        path: endpoint,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json; version=1",
          "Authorization": "Basic " + encoded,
          "Content-Length": Buffer.byteLength(rawBody),
        },
      }, rawBody, res);
    }

    if (req.url === "/claude") {
      return proxyRequest({
        hostname: "api.anthropic.com",
        path: "/v1/messages",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Length": Buffer.byteLength(rawBody),
        },
      }, rawBody, res);
    }

    // Brainner API proxy — forwards to AWS API Gateway with JWT auth
    if (req.url.startsWith("/brainner/")) {
      const brPath = req.url.replace("/brainner", "/prod");
      const method = parsed._method || "GET";
      const bodyToSend = method !== "GET" ? rawBody : null;
      const headers = {
        "Authorization": `Bearer ${BRAINNER_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      };
      if (bodyToSend) headers["Content-Length"] = Buffer.byteLength(bodyToSend);
      console.log(`  Brainner API: ${method} ${brPath}`);
      return proxyRequest({
        hostname: BRAINNER_API_BASE,
        path: brPath,
        method,
        headers,
      }, bodyToSend, res);
    }

    // Ashby debug — test key and list stages
    if (req.url === "/ashby-debug") {
      return (async () => {
        try {
          const stages = await ashbyPost("/interviewStage.list", {});
          return jsonResponse(res, 200, { ok: true, stages });
        } catch(e) {
          return jsonResponse(res, 200, { ok: false, error: e.message });
        }
      })();
    }

    // Ashby move candidates — moves yes-zone candidates to a target stage
    if (req.url === "/ashby-move-candidates") {
      return (async () => {
        try {
          const { jobId, candidateNames, targetStageName } = parsed;

          // 1. List all interview stages
          const stagesResp = await ashbyPost("/interviewStage.list", {});
          if (!stagesResp.results) return jsonResponse(res, 200, { ok: false, error: "Could not list stages", stagesResp });

          // 2. Find target stage
          const targetStage = stagesResp.results.find(s =>
            s.title && s.title.toLowerCase().includes(targetStageName.toLowerCase())
          );
          if (!targetStage) return jsonResponse(res, 200, {
            ok: false, error: `Stage "${targetStageName}" not found`,
            availableStages: stagesResp.results.map(s => s.title)
          });

          // 3. List applications for this job
          const appsResp = await ashbyPost("/application.list", { jobId, status: "active" });
          if (!appsResp.results) return jsonResponse(res, 200, { ok: false, error: "Could not list applications", appsResp });

          // 4. Match candidates by name and move them
          const results = [];
          for (const app of appsResp.results) {
            const fullName = (app.candidate?.name || "").toLowerCase().trim();
            const matched = candidateNames.find(n => {
              const nn = n.toLowerCase().trim();
              return fullName.includes(nn) || nn.includes(fullName) ||
                     fullName.split(" ").some(part => nn.includes(part) && part.length > 3);
            });
            if (matched) {
              try {
                const moveResp = await ashbyPost("/application.changeStage", {
                  applicationId: app.id,
                  interviewStageId: targetStage.id
                });
                results.push({ name: app.candidate?.name, matched, applicationId: app.id, result: moveResp });
              } catch(e) {
                results.push({ name: app.candidate?.name, matched, error: e.message });
              }
            }
          }

          return jsonResponse(res, 200, {
            ok: true,
            targetStage: targetStage.title,
            targetStageId: targetStage.id,
            totalApplications: appsResp.results.length,
            moved: results
          });
        } catch(e) {
          return jsonResponse(res, 200, { ok: false, error: e.message });
        }
      })();
    }

    // Brainner API probe — tests multiple endpoints to discover what's available
    if (req.url === "/brainner-probe") {
      return (async () => {
        const endpoints = [
          "/prod/candidates",
          "/prod/jobs",
          "/prod/inbound",
          "/prod/applications",
          "/prod/job",
          "/prod/me",
          "/prod/user",
          "/prod/",
        ];
        const results = {};
        for (const ep of endpoints) {
          await new Promise((resolve) => {
            const req2 = https.request({
              hostname: BRAINNER_API_BASE,
              path: ep,
              method: "GET",
              headers: {
                "Authorization": `Bearer ${BRAINNER_API_KEY}`,
                "Accept": "application/json",
              },
            }, (upstream) => {
              let data = "";
              upstream.on("data", c => data += c);
              upstream.on("end", () => {
                results[ep] = { status: upstream.statusCode, preview: data.slice(0, 300) };
                resolve();
              });
            });
            req2.on("error", e => { results[ep] = { error: e.message }; resolve(); });
            req2.end();
          });
        }
        return jsonResponse(res, 200, results);
      })();
    }

    res.writeHead(404);
    res.end("Unknown route");
  });
});

server.listen(PORT, () => {
  console.log(`\n✓ Ashby screener running at http://localhost:${PORT}`);
  console.log(`  Open this URL in Chrome: http://localhost:${PORT}`);
  console.log(`  PDF resume extraction: enabled\n`);
});
