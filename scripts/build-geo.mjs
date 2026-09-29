/**
 * build-geo.mjs — one-time data preparation (you do NOT need to run this).
 *
 * Turns the large raw map files into small, fast files for the website:
 *   - Natural Earth 1:50m land (public domain)       -> public/data/geo/land.json
 *   - historical-basemaps world borders (GPL-3.0)    -> public/data/geo/borders-<year>.json
 *
 * Each file is converted to TopoJSON (shared borders stored once), simplified
 * (Visvalingam, keeping the most important points) and quantized. This takes
 * a ~1.5 MB GeoJSON down to roughly 100-200 KB with no visible loss at the
 * zoom levels GeoStory uses.
 *
 * To re-run it yourself:
 *   npm i -D topojson-server topojson-simplify topojson-client
 *   GEO_SRC=/path/to/sources node scripts/build-geo.mjs
 * where GEO_SRC contains:
 *   ne/geojson/ne_50m_land.geojson                 (github.com/nvkelso/natural-earth-vector)
 *   hb/geojson/world_*.geojson                     (github.com/aourednik/historical-basemaps)
 */

import fs from "node:fs";
import path from "node:path";
import { topology } from "topojson-server";
import { presimplify, simplify, quantile } from "topojson-simplify";

const SRC = process.env.GEO_SRC || "./geo-src";
const OUT = path.resolve("public/data/geo");
fs.mkdirSync(OUT, { recursive: true });

// Which historical border snapshot each map era uses (see public/data/waypoints.js).
const BORDER_FILES = ["bc10000", "bc3000", "bc500", "bc1", "800", "1300", "1500", "1800", "1900", "2010"];

function build(inputFile, outputFile, objectName, keepRatio, keepProps) {
  const geo = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  geo.features = geo.features
    .filter((f) => f.geometry)
    .map((f) => ({
      type: "Feature",
      properties: keepProps(f.properties || {}),
      geometry: f.geometry,
    }));

  let topo = topology({ [objectName]: geo }, 2e4);
  topo = presimplify(topo);
  topo = simplify(topo, quantile(topo, keepRatio));

  fs.writeFileSync(outputFile, JSON.stringify(topo));
  const kb = (fs.statSync(outputFile).size / 1024).toFixed(0);
  console.log(`${path.basename(outputFile).padEnd(22)} ${String(geo.features.length).padStart(4)} shapes  ${kb} KB`);
}

build(
  path.join(SRC, "ne/geojson/ne_50m_land.geojson"),
  path.join(OUT, "land.json"),
  "land",
  0.1,
  () => ({})
);

for (const year of BORDER_FILES) {
  build(
    path.join(SRC, `hb/geojson/world_${year}.geojson`),
    path.join(OUT, `borders-${year}.json`),
    "borders",
    0.1,
    (p) => ({ name: p.NAME || null })
  );
}
