/**
 * make-help-shot.mjs — takes the screenshot used on the Help page
 * (public/img/help-screen.jpg) and prints where its numbered arrows should
 * point. Run it again whenever the look of the main screen changes:
 *
 *   node scripts/make-help-shot.mjs
 *
 * The printed positions are the exact centres/edges of each part. In
 * public/js/help.js (CALLOUTS) the "at" values sit just short of them, so the
 * arrowheads touch each part without covering it.
 * Needs Playwright (see scripts/test-layout.mjs).
 */

import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require(path.join(execSync("npm root -g").toString().trim(), "playwright")));
}

const PORT = 5198;
const SIZE = { width: 1440, height: 860 };

const server = spawn(process.execPath, ["server.js"], { env: { ...process.env, PORT: String(PORT) }, stdio: "pipe" });
await new Promise((resolve) => server.stdout.on("data", (d) => String(d).includes("running") && resolve()));

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 1.5 });
await page.route("**/api/health", (r) => r.fulfill({ json: { ai: true } }));

// A story open (so the story card shows) with the Threads panel opened by hand.
await page.goto(`http://localhost:${PORT}/#era=1300ce&story=mansa-musa`, { waitUntil: "networkidle" });
await page.waitForTimeout(1500);
await page.click(".lg-toggle");
await page.mouse.move(120, 28); // off the panel, so no chapter list or tooltip is open
await page.waitForTimeout(700);
await page.screenshot({ path: "public/img/help-screen.jpg", type: "jpeg", quality: 78 });

const targets = await page.evaluate(({ width, height }) => {
  const pct = (sel, fx = 0.5, fy = 0.5) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    return [+(((r.left + r.width * fx) / width) * 100).toFixed(1), +(((r.top + r.height * fy) / height) * 100).toFixed(1)];
  };
  return {
    "1 Timeline (the gold marker)": pct(".tl-handle"),
    "2 Pins (the open story's pin)": pct("g.pin.is-selected .pin-shape"),
    "3 Story card (left edge, near the title)": pct(".sc-title", 0, 0.5),
    "4 Continue the thread (left edge)": pct(".sc-next", 0, 0.5),
    "5 Threads (right edge of the panel)": pct("#legend", 1, 0.45),
    "6 Search, Help, Journal (below the buttons)": pct("#header-actions", 0.5, 1),
  };
}, SIZE);
console.log("Saved public/img/help-screen.jpg\nArrow targets (% of the picture):");
for (const [k, v] of Object.entries(targets)) console.log(`  ${k.padEnd(46)} at: [${v.join(", ")}]`);

await browser.close();
server.kill();
