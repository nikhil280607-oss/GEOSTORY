/**
 * test-layout.mjs — automated screen-size test (optional, for developers).
 *
 * Opens GeoStory in a headless Chrome at common laptop sizes, including
 * Windows display scaling of 125% and 150%, and checks that:
 *   - the page never scrolls sideways or down (everything fits one screen)
 *   - no story card is on the page until a pin is clicked
 *   - every pin is drawn inside the map
 *   - the story card, thread navigation and full chronicle open correctly
 *   - there are no JavaScript errors
 * Screenshots are saved to ./test-output.
 *
 * Needs Playwright:  npm i -D playwright  &&  npx playwright install chromium
 * Run:               npm run test:layout
 */

import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  try {
    const globalRoot = execSync("npm root -g").toString().trim();
    ({ chromium } = require(path.join(globalRoot, "playwright")));
  } catch {
    console.error("Playwright isn't installed. Run: npm i -D playwright && npx playwright install chromium");
    process.exit(1);
  }
}

const PORT = 5199;
const BASE = `http://localhost:${PORT}/`;
const OUT = path.resolve("test-output");
fs.mkdirSync(OUT, { recursive: true });

// Browser window content sizes (what's left after the browser's own toolbars).
const VIEWPORTS = [
  { name: "laptop-1366x768", width: 1366, height: 657 },
  { name: "1920-at-125pct", width: 1536, height: 730 },
  { name: "1920-at-150pct", width: 1280, height: 600 },
  { name: "desktop-1920", width: 1920, height: 960 },
  { name: "phone", width: 390, height: 760 },
];

const server = spawn(process.execPath, ["server.js"], { env: { ...process.env, PORT: String(PORT) }, stdio: "pipe" });
await new Promise((resolve) => server.stdout.on("data", (d) => String(d).includes("running") && resolve()));

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
const failures = [];
const fail = (vp, msg) => failures.push(`[${vp}] ${msg}`);

async function noScroll(page, vp, where) {
  const s = await page.evaluate(() => ({
    sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight,
    w: window.innerWidth, h: window.innerHeight,
  }));
  if (s.sw > s.w) fail(vp, `${where}: page scrolls sideways (${s.sw} > ${s.w})`);
  if (s.sh > s.h) fail(vp, `${where}: page scrolls down (${s.sh} > ${s.h})`);
}

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));

  // Pretend Gemini answered, so the Ask box can be tested without a key.
  await page.route("**/api/health", (r) => r.fulfill({ json: { ai: true } }));
  await page.route("**/api/ask", (r) => r.fulfill({ json: { answer: "Test answer from the chronicle.", model: "test" } }));

  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".intro.is-open");
  await page.screenshot({ path: `${OUT}/${vp.name}-0-intro.png` });
  await noScroll(page, vp.name, "welcome");

  await page.click(".intro-actions .btn-gold");
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${vp.name}-1-big-bang.png` });
  await noScroll(page, vp.name, "big bang");
  if (await page.locator("#story-card").isVisible()) fail(vp.name, "story card visible before any pin was clicked");

  // Go to 1300 CE using the keyboard on the timeline.
  await page.focus(".tl-track");
  for (let i = 0; i < 12; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1400);
  await page.screenshot({ path: `${OUT}/${vp.name}-2-1300.png` });
  await noScroll(page, vp.name, "1300 CE map");

  // All pins inside the map area.
  const pinCheck = await page.evaluate(() => {
    const map = document.querySelector(".map-svg").getBoundingClientRect();
    return [...document.querySelectorAll("g.pin .pin-shape")].map((p) => {
      const r = p.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.bottom;
      return { inside: x >= map.left && x <= map.right && y >= map.top && y <= map.bottom, x, y };
    });
  });
  if (pinCheck.length !== 2) fail(vp.name, `expected 2 pins at 1300 CE, found ${pinCheck.length}`);
  if (pinCheck.some((p) => !p.inside)) fail(vp.name, "a pin is drawn outside the map");

  // Open Mansa Musa.
  await page.click('g.pin[aria-label^="Timbuktu"]', { force: true });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${vp.name}-3-story.png` });
  await noScroll(page, vp.name, "story open");
  if (!(await page.locator("#story-card.is-open").isVisible())) fail(vp.name, "story card did not open");

  // Ask the Chronicler (mocked).
  await page.click(".sc .ask-chips .chip");
  await page.waitForSelector(".sc .ask-a");
  await page.locator(".sc .ask").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${OUT}/${vp.name}-4-ask.png` });

  // Save to journal.
  await page.click(".sc-save");
  const count = await page.textContent(".jr-count");
  if (count.trim() !== "1") fail(vp.name, `journal count should be 1, got ${count}`);

  // Full chronicle.
  await page.click(".sc-read");
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${vp.name}-5-chronicle.png` });
  await noScroll(page, vp.name, "chronicle open");
  await page.evaluate(() => { const s = document.querySelector(".rd-scroll"); s.style.scrollBehavior = "auto"; s.scrollTop = document.querySelector("#ch-cairo").offsetTop - 40; });
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${vp.name}-6-chronicle-cairo.png` });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Continue the thread -> Elmina (1500 CE).
  await page.click(".sc-next");
  await page.waitForTimeout(1400);
  const title = await page.textContent(".sc-title");
  if (!/Gold Coast/.test(title)) fail(vp.name, `continue-the-thread went to "${title}"`);
  await page.screenshot({ path: `${OUT}/${vp.name}-7-thread.png` });
  await noScroll(page, vp.name, "after continue thread");

  // Journal.
  await page.click(".hdr-journal");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${vp.name}-8-journal.png` });
  await page.keyboard.press("Escape");

  // Today.
  await page.keyboard.press("Escape");
  await page.focus(".tl-track");
  await page.keyboard.press("End");
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${OUT}/${vp.name}-9-today.png` });
  await noScroll(page, vp.name, "today");

  if (errors.length) fail(vp.name, `JavaScript errors: ${[...new Set(errors)].join(" | ")}`);
  console.log(`checked ${vp.name}`);
  await page.close();
}

await browser.close();
server.kill();

if (failures.length) {
  console.error(`\n${failures.length} problem(s):\n  - ${failures.join("\n  - ")}`);
  process.exit(1);
}
console.log(`\nAll ${VIEWPORTS.length} screen sizes passed. Screenshots in ./test-output`);
