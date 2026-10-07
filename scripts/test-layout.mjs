/**
 * test-layout.mjs — automated screen test (optional, for developers).
 *
 * Opens GeoStory in a headless Chrome at common laptop sizes, including
 * Windows display scaling of 125% and 150%, a window that isn't maximised,
 * a browser zoom of 200% and 250%, and a phone. For every size it walks through the two key user tasks and
 * the Lab 8 improvements, and checks that:
 *
 *   layout     - the page never scrolls sideways or down
 *              - no story card is on the page until a pin is clicked
 *              - every pin is drawn inside the map, and not under a panel
 *   Lab 7 U2   - a new visitor lands on the Help page, with Enter always in view
 *   Lab 7 U3   - timeline date labels never overlap each other
 *   Lab 7 A1   - the Threads panel is never hidden (it is a panel or a button)
 *   Lab 7 H8   - with a story open, the linked chapters stay on screen and
 *                clear of the story card
 *   Lab 7 U1   - a thread lists its chapters, and a chapter can be opened from it
 *   Lab 7 H7   - search finds a story and opens it
 *   Lab 7 H3-5 - a story removed from the journal can be brought back with Undo
 *   Lab 7 H6   - the map buttons have names
 *   and that there are no JavaScript errors.
 *
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
// A browser zoom of 200% makes the window half as big, as far as the page can tell.
const VIEWPORTS = [
  { name: "laptop-1366x768", width: 1366, height: 657 },
  { name: "1920-at-125pct", width: 1536, height: 730 },
  { name: "1920-at-150pct", width: 1280, height: 600 },
  { name: "desktop-1920", width: 1920, height: 942 },
  { name: "window-1200x800", width: 1200, height: 720 },
  { name: "zoom-200pct", width: 960, height: 471, scale: 2 },
  { name: "zoom-250pct", width: 768, height: 377, scale: 2.5 },
  { name: "phone", width: 390, height: 760, scale: 2 },
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

/** Opens the Threads panel if it is folded to a button. */
async function openThreads(page) {
  if (await page.locator("#legend.is-collapsed").count()) await page.click(".lg-toggle");
  await page.waitForTimeout(250);
}

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.scale || 1 });
  const shot = (step) => page.screenshot({ path: `${OUT}/${vp.name}-${step}.png` });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text()));

  // Pretend Gemini answered, so the Ask box can be tested without a key.
  await page.route("**/api/health", (r) => r.fulfill({ json: { ai: true } }));
  await page.route("**/api/ask", (r) => r.fulfill({ json: { answer: "Test answer from the chronicle.", model: "test" } }));

  /* ---- a new visitor lands on the Help page (U2) ---- */
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector(".intro.is-open");
  await page.waitForTimeout(500);
  await shot("0-help");
  await noScroll(page, vp.name, "help page");
  const helpState = await page.evaluate(() => {
    const b = document.querySelector(".help-enter").getBoundingClientRect();
    const img = document.querySelector(".help-shot-frame img");
    return {
      enterInView: b.top >= 0 && b.bottom <= window.innerHeight && b.left >= 0 && b.right <= window.innerWidth,
      picture: img.complete && img.naturalWidth > 0,
      mentionsThreads: /five threads/i.test(document.querySelector(".help").textContent),
    };
  });
  if (!helpState.enterInView) fail(vp.name, "the Enter button on the Help page is not in view");
  if (!helpState.picture) fail(vp.name, "the Help page screenshot did not load");
  if (!helpState.mentionsThreads) fail(vp.name, "the Help page does not explain the threads");

  await page.click(".help-enter");
  await page.waitForTimeout(1000);
  await shot("1-big-bang");
  await noScroll(page, vp.name, "big bang");
  if (await page.locator("#story-card").isVisible()) fail(vp.name, "story card visible before any pin was clicked");
  if (!(await page.locator(".tl-hint").isVisible())) fail(vp.name, "the first-visit timeline hint did not appear");

  /* ---- the first map (66 million years ago): its only pin is in Mexico, on the
          left, where the era card and Threads panel are. It must not be under them. ---- */
  await page.focus(".tl-track");
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1500);
  const covered = await page.evaluate(() => {
    const p = document.querySelector("g.pin .pin-shape").getBoundingClientRect();
    const x = p.left + p.width / 2, y = p.top + p.height / 2;
    return ["#era-card", "#legend"].filter((sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return x > r.left && x < r.right && y > r.top && y < r.bottom;
    });
  });
  if (covered.length) fail(vp.name, `the Chicxulub pin is hidden under ${covered.join(" and ")}`);

  /* ---- Task 1: travel to 1300 CE with the keyboard ---- */
  for (let i = 0; i < 7; i++) await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(1500);
  await shot("2-1300");
  await noScroll(page, vp.name, "1300 CE map");
  if (await page.locator(".tl-hint").isVisible()) fail(vp.name, "the timeline hint stayed after the timeline was used");

  // Timeline labels are readable: big enough, and no two overlap (U3).
  const ticks = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll(".tl-tick")].map((t) => t.getBoundingClientRect());
    let overlaps = 0;
    for (let i = 1; i < boxes.length; i++) if (boxes[i].left < boxes[i - 1].right - 0.5) overlaps++;
    return { overlaps, size: parseFloat(getComputedStyle(document.querySelector(".tl-num")).fontSize) };
  });
  if (ticks.overlaps) fail(vp.name, `${ticks.overlaps} timeline labels overlap`);
  if (ticks.size < 14) fail(vp.name, `timeline years are only ${ticks.size}px`);

  // The Threads panel is on screen, as a panel or as a button (A1).
  const legend = await page.evaluate(() => {
    const r = document.querySelector("#legend").getBoundingClientRect();
    return r.width > 40 && r.height > 20 && r.left >= 0 && r.bottom <= window.innerHeight;
  });
  if (!legend) fail(vp.name, "the Threads panel is hidden");

  // All pins inside the map area.
  const pinCheck = await page.evaluate(() => {
    const map = document.querySelector("#stage").getBoundingClientRect();
    return [...document.querySelectorAll("g.pin .pin-shape")].map((p) => {
      const r = p.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.bottom;
      return { inside: x >= map.left && x <= map.right && y >= map.top && y <= map.bottom };
    });
  });
  if (pinCheck.length !== 2) fail(vp.name, `expected 2 pins at 1300 CE, found ${pinCheck.length}`);
  if (pinCheck.some((p) => !p.inside)) fail(vp.name, "a pin is drawn outside the map");

  // Map buttons have names (H6).
  const names = await page.locator(".zoom-btn").evaluateAll((bs) => bs.map((b) => b.getAttribute("data-tip")));
  if (names.join("|") !== "Zoom in|Zoom out|Reset view") fail(vp.name, `map buttons are named "${names.join("|")}"`);

  /* ---- open Mansa Musa ---- */
  await page.click('g.pin[aria-label^="Timbuktu"]', { force: true });
  await page.waitForTimeout(1400);
  await shot("3-story");
  await noScroll(page, vp.name, "story open");
  if (!(await page.locator("#story-card.is-open").isVisible())) fail(vp.name, "story card did not open");

  // The pin and both linked chapters are on screen and not under the story card (H8).
  const links = await page.evaluate(() => {
    const stage = document.querySelector("#stage").getBoundingClientRect();
    const card = document.querySelector("#story-card").getBoundingClientRect();
    const sheet = card.width > stage.width * 0.8; // phone: the card is along the bottom
    const clear = (r) => {
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const onStage = x > stage.left && x < stage.right && y > stage.top && y < stage.bottom;
      return onStage && (sheet ? y < card.top : x < card.left);
    };
    return {
      count: document.querySelectorAll("g.ghost").length,
      ghostsClear: [...document.querySelectorAll("g.ghost circle")].every((c) => clear(c.getBoundingClientRect())),
      pinClear: clear(document.querySelector("g.pin.is-selected .pin-shape").getBoundingClientRect()),
      eraCardHeight: document.querySelector("#era-card").getBoundingClientRect().height,
    };
  });
  if (links.count !== 2) fail(vp.name, `expected 2 linked chapters around Mansa Musa, found ${links.count}`);
  if (!links.pinClear) fail(vp.name, "the open story's pin is off-screen or under the story card");
  if (!links.ghostsClear) fail(vp.name, "a linked chapter is off-screen or under the story card");
  if (links.eraCardHeight > 90) fail(vp.name, `the era card did not shrink when the story opened (${Math.round(links.eraCardHeight)}px tall)`);

  // Ask the Chronicler (mocked).
  await page.click(".sc .ask-chips .chip");
  await page.waitForSelector(".sc .ask-a");
  await page.locator(".sc .ask").scrollIntoViewIfNeeded();
  await shot("4-ask");

  // Save to the journal.
  await page.locator(".sc-save").scrollIntoViewIfNeeded();
  await page.click(".sc-save");
  if ((await page.textContent(".jr-count")).trim() !== "1") fail(vp.name, "journal count should be 1 after Save");

  /* ---- Task 2: the full chronicle ---- */
  await page.click(".sc-read");
  await page.waitForTimeout(700);
  await shot("5-chronicle");
  await noScroll(page, vp.name, "chronicle open");
  await page.evaluate(() => { const s = document.querySelector(".rd-scroll"); s.style.scrollBehavior = "auto"; s.scrollTop = document.querySelector("#ch-cairo").offsetTop - 40; });
  await page.waitForTimeout(600);
  await shot("6-chronicle-cairo");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  // Continue the thread -> Elmina (1500 CE).
  await page.click(".sc-next");
  await page.waitForTimeout(1500);
  if (!/Gold Coast/.test(await page.textContent(".sc-title"))) fail(vp.name, "Continue the thread did not go to Elmina");
  await shot("7-thread");
  await noScroll(page, vp.name, "after continue thread");

  /* ---- journal: remove, then Undo (H3, H4, H5) ---- */
  await page.click(".hdr-journal");
  await page.waitForTimeout(500);
  await page.click(".jr-remove");
  await page.waitForTimeout(300);
  await shot("8-journal-undo");
  if ((await page.textContent(".jr-count")).trim() !== "0") fail(vp.name, "journal count should be 0 after Remove");
  if (!(await page.locator(".jr-undo").isVisible())) fail(vp.name, "no Undo message after removing a story");
  await page.click(".jr-undo-btn");
  await page.waitForTimeout(300);
  if ((await page.textContent(".jr-count")).trim() !== "1") fail(vp.name, "Undo did not bring the story back");
  if (await page.locator(".jr-undo").count()) fail(vp.name, "the Undo message stayed after Undo");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  await page.keyboard.press("Escape"); // close the story
  await page.waitForTimeout(900);

  /* ---- Threads: chapter list, and jumping to a chapter (U1) ---- */
  await openThreads(page);
  await page.click(".lg-thread:nth-child(4) .lg-item"); // Gold and salt
  await page.waitForTimeout(400);
  await shot("9-threads");
  await noScroll(page, vp.name, "threads open");
  const chapters = page.locator(".lg-thread:nth-child(4) .lg-ch");
  if ((await chapters.count()) !== 4) fail(vp.name, `Gold and salt should list 4 chapters, found ${await chapters.count()}`);
  if (!/4 chapters/.test(await page.textContent(".lg-thread:nth-child(4) .lg-count"))) fail(vp.name, "thread does not show its chapter count");
  await chapters.nth(3).scrollIntoViewIfNeeded();
  await chapters.nth(3).click();
  await page.waitForTimeout(1500);
  if (!/built on gold/.test(await page.textContent(".sc-title"))) fail(vp.name, "picking chapter 4 of Gold and salt did not open Johannesburg");
  await noScroll(page, vp.name, "after thread chapter");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);

  /* ---- search (H7) ---- */
  await page.keyboard.press("/");
  await page.keyboard.type("mansa", { delay: 20 });
  await page.waitForTimeout(300);
  await shot("10-search");
  const firstHit = await page.textContent(".search-option .search-option-title").catch(() => "");
  if (!/price of gold/.test(firstHit)) fail(vp.name, `search for "mansa" found "${firstHit}"`);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(1500);
  if (!/price of gold/.test(await page.textContent(".sc-title"))) fail(vp.name, "choosing a search result did not open the story");
  await noScroll(page, vp.name, "after search");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);

  /* ---- Help again from the header, then Today ---- */
  await page.click(".hdr-help");
  await page.waitForTimeout(500);
  if (!(await page.locator(".help").isVisible())) fail(vp.name, "Help did not open from the header");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);

  await page.focus(".tl-track");
  await page.keyboard.press("End");
  await page.waitForTimeout(1400);
  await shot("11-today");
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
