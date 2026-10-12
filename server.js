// Jev email triage demo server.
// Serves the UI, holds the TypeSafe key server side, and proxies one Jev call per email.
// No dependencies: run with `node server.js`.

const http = require("http");
const fs = require("fs");
const path = require("path");

loadDotEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT || 5173);
const API_KEY = process.env.TYPESAFE_API_KEY || "";
const MODEL = process.env.JEV_MODEL || "jev-latest";
const BASE_URL = process.env.TYPESAFE_BASE_URL || "https://api.typesafe.ai";
const MOCK = !API_KEY || process.env.JEV_MOCK === "1";
// Price per million tokens. Defaults are a rough public estimate; set your real rate in .env.
const PRICE_IN = Number(process.env.PRICE_IN_PER_M || 0.38);
const PRICE_OUT = Number(process.env.PRICE_OUT_PER_M || 0.38);

// emails.json is the 60 email sample. Point EMAILS_FILE at emails.gmail.json (from import_gmail.py) for your real inbox.
const EMAILS_FILE = process.env.EMAILS_FILE || "emails.json";
const EMAILS = JSON.parse(fs.readFileSync(path.resolve(__dirname, EMAILS_FILE), "utf8"));
// Last results per email, saved to disk so the table is already filled when the page reopens.
const RESULTS_FILE = path.join(__dirname, `last-run.${path.basename(EMAILS_FILE, ".json")}.json`);
let saved = fs.existsSync(RESULTS_FILE) ? JSON.parse(fs.readFileSync(RESULTS_FILE, "utf8")) : {};
function persist() {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(saved));
}

const ME =
  process.env.JEV_ME ||
  "I'm a startup founder. My inbox mixes work (customers, vendors, cloud providers, analytics reports), " +
  "personal shopping, finance notices, newsletters and a lot of marketing. I want to see security and " +
  "billing problems first and I personally reply to real people, not automated senders.";

const CATEGORIES = {
  Work: "Day to day work: reports, docs, internal updates, legal or policy notices from tools we use",
  Security: "Account security, suspicious activity, verification, access or domain problems",
  Support: "Service outages, disabled features, tickets, problems that need fixing",
  Finance: "Payments received, invoices, receipts, renewals, subscriptions, payouts",
  Shopping: "Orders, shipping and delivery for things I bought",
  Marketing: "Promotions, sales pitches, cold outreach, product launches",
  Newsletter: "Editorial newsletters and product update digests",
  Social: "Notifications from communities, forums and social networks",
  Events: "Invites, meetings, webinars, calendar related mail",
  Other: null,
};

function buildQuestions() {
  return {
    category: {
      type: "choice",
      instructions: "Which inbox category does this email belong in?",
      criteria: CATEGORIES,
    },
    priority: {
      type: "score",
      instructions: "How soon do I need to look at this email?",
      criteria: [
        "Low: can wait a week or be ignored",
        "Normal: look at it in the next day or two",
        "High: needs attention today",
      ],
    },
    spam: {
      type: "noul",
      instructions: "Is this email spam, a scam, or unsolicited bulk promotion?",
      criteria: {
        true: "Unwanted bulk marketing, cold pitches, phishing or scams",
        false: "Mail I signed up for, transactional mail, or a real person writing to me",
      },
    },
    reply: {
      type: "noul",
      instructions: "Is a real person waiting on a personal reply from me?",
      criteria: {
        true: "A human asked me something or expects a response",
        false: "Automated, informational, or no response expected",
      },
    },
  };
}

async function classify(email) {
  const body = {
    model: MODEL,
    state: { me: ME, email: {
        from: email.from_address ? `${email.from} <${email.from_address}>` : email.from,
        to: email.to,
        subject: email.subject,
        sent_at: email.sent_at,
        has_list_unsubscribe_header: email.has_list_unsubscribe_header ?? false,
        body: email.body,
      },
    },
    questions: buildQuestions(),
  };
  let retries = 0;
  for (;;) {
    const res = await fetch(`${BASE_URL}/v1/systemone`, {
      method: "POST",
      headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if ((res.status === 429 || res.status === 529) && retries < 3) {
      retries++;
      await sleep(250 * 2 ** retries + Math.random() * 100);
      continue;
    }
    if (!res.ok) throw new Error(`TypeSafe ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return { ...data, retries };
  }
}

const { mockAnswer, mockLatency } = require("./public/mock.js");
async function mockClassify(email) {
  await sleep(mockLatency());
  return mockAnswer(email);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/config") {
      return json(res, 200, { mock: MOCK, model: MOCK ? "mock" : MODEL, priceIn: PRICE_IN, priceOut: PRICE_OUT, total: EMAILS.length, file: EMAILS_FILE });
    }
    if (req.method === "GET" && req.url === "/api/emails") return json(res, 200, EMAILS);
    if (req.method === "GET" && req.url === "/api/results") return json(res, 200, saved);
    if (req.method === "DELETE" && req.url === "/api/results") {
      saved = {};
      persist();
      return json(res, 200, {});
    }
    // Runs the worker pool here (browsers cap ~6 requests per host) and streams each answer as an SSE event.
    if (req.method === "GET" && req.url.startsWith("/api/run")) {
      const q = new URL(req.url, "http://x").searchParams;
      const ids = new Set((q.get("ids") || "").split(",").map(Number));
      const queue = EMAILS.filter((e) => ids.has(e.id));
      const workers = Math.max(1, Math.min(256, Number(q.get("workers")) || 1));
      let stopped = false;
      req.on("close", () => (stopped = true));
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      const send = (obj) => !stopped && res.write(`data: ${JSON.stringify(obj)}\n\n`);
      // Timeline of a live run, saved as replay.json so the static GitHub Pages build can replay a real run.
      const t0 = performance.now();
      const timeline = [];
      let i = 0;
      async function worker() {
        while (i < queue.length && !stopped) {
          const email = queue[i++];
          send({ type: "start", id: email.id });
          const started = performance.now();
          try {
            const out = MOCK ? await mockClassify(email) : await classify(email);
            const result = { ...out, latency_ms: Math.round(performance.now() - started) };
            saved[email.id] = result;
            timeline.push({ id: email.id, start: Math.round(started - t0), end: Math.round(performance.now() - t0), result });
            send({ type: "result", id: email.id, result });
          } catch (err) {
            send({ type: "error", id: email.id, error: String(err.message || err) });
          }
        }
      }
      await Promise.all(Array.from({ length: Math.min(workers, queue.length) }, worker));
      persist();
      if (!MOCK && !stopped && timeline.length === EMAILS.length) {
        const replay = { model: timeline[0]?.result.model || MODEL, recorded_at: new Date().toISOString(), workers, priceIn: PRICE_IN, priceOut: PRICE_OUT, timeline };
        fs.writeFileSync(path.join(__dirname, "replay.json"), JSON.stringify(replay));
      }
      send({ type: "done" });
      return res.end();
    }
    if (req.method === "GET" && req.url === "/mock.js") {
      res.writeHead(200, { "Content-Type": "text/javascript" });
      return res.end(fs.readFileSync(path.join(__dirname, "public", "mock.js")));
    }
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(fs.readFileSync(path.join(__dirname, "public", "index.html")));
    }
    json(res, 404, { error: "not found" });
  } catch (err) {
    json(res, 502, { error: String(err.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`Jev triage demo on http://localhost:${PORT}  ${EMAILS.length} emails from ${EMAILS_FILE}  (${MOCK ? "MOCK mode, set TYPESAFE_API_KEY for real calls" : `model ${MODEL}`})`);
});

function json(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d));
    req.on("error", reject);
  });
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
