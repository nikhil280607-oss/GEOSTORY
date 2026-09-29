/**
 * check-content.mjs — automated content test.  Run:  npm run check
 *
 * Catches the kind of bug that slipped into v2 (pins in the ocean):
 *   1. every pin's lat/lon falls on land, using the same land shapes the map draws
 *   2. every story points at a real map era and a real thread
 *   3. each thread's chapters are numbered 1, 2, 3 ... with no gaps
 *   4. chronicles referenced by a story exist
 *   5. every story lists at least one source
 *
 * Exits with code 1 if anything fails, so it can also run in CI.
 */

import fs from "node:fs";
import vm from "node:vm";
import { feature } from "../public/vendor/topojson-client/index.js";
import { WAYPOINTS } from "../public/data/waypoints.js";
import { THREADS } from "../public/data/threads.js";
import { STORIES } from "../public/data/stories.js";
import { CHRONICLES } from "../public/data/chronicles/mansa-musa.js";
import { cleanFeature } from "../public/js/geoClean.js";

// d3 ships as a browser bundle; load it into a small sandbox for Node.
const sandbox = { exports: {}, module: {} };
sandbox.module.exports = sandbox.exports;
vm.runInNewContext(fs.readFileSync(new URL("../public/vendor/d3.min.js", import.meta.url), "utf8"), sandbox);
const d3 = sandbox.exports;

const topo = JSON.parse(fs.readFileSync(new URL("../public/data/geo/land.json", import.meta.url), "utf8"));
const land = feature(topo, topo.objects.land);

const problems = [];
const ok = [];
const mapEras = new Set(WAYPOINTS.filter((w) => w.kind === "map").map((w) => w.id));

for (const s of STORIES) {
  if (!mapEras.has(s.waypoint)) problems.push(`${s.id}: era "${s.waypoint}" is not a map era`);
  if (!THREADS[s.thread]) problems.push(`${s.id}: unknown thread "${s.thread}"`);
  if (s.chronicle && !CHRONICLES[s.chronicle]) problems.push(`${s.id}: chronicle "${s.chronicle}" not found`);
  if (s.related && !STORIES.some((t) => t.id === s.related)) problems.push(`${s.id}: related story "${s.related}" not found`);
  if (!s.sources || s.sources.length === 0) problems.push(`${s.id}: no sources listed`);

  const onLand = d3.geoContains(land, [s.lon, s.lat]);
  if (!onLand) problems.push(`${s.id}: pin (${s.lat}, ${s.lon}) is NOT on land`);
  else ok.push(`${s.id.padEnd(14)} on land  (${s.place})`);
}

for (const [threadId] of Object.entries(THREADS)) {
  const orders = STORIES.filter((s) => s.thread === threadId).map((s) => s.order).sort((a, b) => a - b);
  orders.forEach((o, i) => {
    if (o !== i + 1) problems.push(`thread ${threadId}: chapter numbers ${orders.join(",")} are not 1..${orders.length}`);
  });
}

// Chronicle route points should be on land too.
for (const c of Object.values(CHRONICLES)) {
  for (const [key, p] of Object.entries(c.route.points)) {
    if (!d3.geoContains(land, [p.lon, p.lat])) problems.push(`chronicle ${c.id}: route point ${key} is not on land`);
  }
}

// Every historical border file must draw correctly: after repair, no shape may
// cover more than half the globe (that would paint over the ocean).
const borderKeys = [...new Set(WAYPOINTS.map((w) => w.borders).filter(Boolean))];
for (const key of borderKeys) {
  const t = JSON.parse(fs.readFileSync(new URL(`../public/data/geo/borders-${key}.json`, import.meta.url), "utf8"));
  const shapes = feature(t, t.objects.borders).features.map((f) => cleanFeature(f, d3)).filter((f) => f.geometry);
  const bad = shapes.filter((f) => d3.geoArea(f) > 2 * Math.PI);
  if (bad.length) problems.push(`borders-${key}: ${bad.length} shape(s) would cover the whole globe`);
  else ok.push(`borders-${key.padEnd(8)} ${String(shapes.length).padStart(4)} shapes draw correctly`);
}

console.log(ok.join("\n"));
if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n  - ` + [...new Set(problems)].join("\n  - "));
  process.exit(1);
}
console.log(`\nAll ${STORIES.length} pins are on land, all ${borderKeys.length} border maps draw correctly, and threads, eras, chronicles and sources are consistent.`);
