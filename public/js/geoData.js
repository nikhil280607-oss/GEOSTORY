/**
 * geoData.js — loads and caches the map files in public/data/geo.
 * Files are small TopoJSON made by scripts/build-geo.mjs; they are loaded
 * only when an era needs them and kept in memory afterwards.
 */

import { feature, merge } from "../vendor/topojson-client/index.js";
import { cleanFeature } from "./geoClean.js";

const d3 = window.d3;
const cache = new Map();

async function loadJson(path) {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path).then((r) => {
        if (!r.ok) throw new Error(`Couldn't load ${path} (${r.status})`);
        return r.json();
      })
    );
  }
  try {
    return await cache.get(path);
  } catch (err) {
    cache.delete(path); // allow a retry later
    throw err;
  }
}

/** The whole land mass as ONE MultiPolygon (fast to draw, used as the base). */
export async function loadLand() {
  const topo = await loadJson("data/geo/land.json");
  return merge(topo, topo.objects.land.geometries);
}

/** Historical borders for one snapshot, e.g. "1300". Returns a FeatureCollection. */
export async function loadBorders(key) {
  const topo = await loadJson(`data/geo/borders-${key}.json`);
  const fc = feature(topo, topo.objects.borders);
  fc.features = fc.features.map((f) => cleanFeature(f, d3)).filter((f) => f.geometry);
  return fc;
}
