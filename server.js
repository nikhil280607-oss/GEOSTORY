/**
 * server.js — runs GeoStory on your computer.  Start with:  npm start
 *
 * Zero dependencies (only Node's built-in modules), so there is nothing to
 * install. It does two jobs:
 *   1. serves the website in ./public
 *   2. answers  POST /api/ask  (Ask the Chronicler) and  GET /api/health
 *
 * Put your Gemini key in a file called .env (see .env.example).
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { askChronicler, isConfigured } from "./lib/chronicler.js";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(ROOT, "public");

loadDotEnv(path.join(ROOT, ".env"));
const PORT = Number(process.env.PORT) || 5173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

// Small per-visitor limit so one person can't use up the free Gemini quota.
const recent = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (recent.get(ip) || []).filter((t) => now - t < 60_000);
  list.push(now);
  recent.set(ip, list);
  return list.length > 12;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === "/api/health" && req.method === "GET") {
      return sendJson(res, 200, { ai: isConfigured() });
    }

    if (url.pathname === "/api/ask") {
      if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
      if (rateLimited(req.socket.remoteAddress || "local")) {
        return sendJson(res, 429, { error: "Too many questions. Wait a minute and try again." });
      }
      const body = await readJson(req, 4096);
      const result = await askChronicler(body || {});
      return sendJson(res, 200, result);
    }

    if (req.method !== "GET" && req.method !== "HEAD") return sendJson(res, 405, { error: "Method not allowed." });
    return serveStatic(url.pathname, res);
  } catch (err) {
    const status = err.status || 500;
    if (status >= 500 && !err.status) console.error(err);
    return sendJson(res, status, { error: err.status ? err.message : "Something went wrong on the server." });
  }
});

server.listen(PORT, () => {
  console.log(`\n  GeoStory is running:  http://localhost:${PORT}\n`);
  console.log(isConfigured()
    ? "  Ask the Chronicler: ON (Gemini key found)"
    : "  Ask the Chronicler: OFF (add GEMINI_API_KEY to a .env file to turn it on)");
  console.log("  Press Ctrl+C to stop.\n");
});

/* ---------------- helpers ---------------- */

function serveStatic(pathname, res) {
  let rel = decodeURIComponent(pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(PUBLIC, rel));
  if (!file.startsWith(PUBLIC)) return sendJson(res, 403, { error: "Forbidden." }); // blocks ../ tricks

  fs.stat(file, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Not found");
    }
    const type = TYPES[path.extname(file).toLowerCase()] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
    fs.createReadStream(file).pipe(res);
  });
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) {
        reject(Object.assign(new Error("Question too long."), { status: 413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(Object.assign(new Error("Invalid request."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

/** Reads KEY=VALUE lines from .env without any extra package. */
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || line.trim().startsWith("#")) continue;
    const value = m[2].replace(/^['"]|['"]$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = value;
  }
}
