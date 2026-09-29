/**
 * geoClean.js — repairs border shapes before drawing (pure function, also
 * used by the automated check in scripts/check-content.mjs).
 *
 * d3 draws polygons using their winding order. After simplification a few
 * small shapes in the source data end up wound the "wrong" way (or collapse
 * to almost nothing), and d3 would then fill the whole globe with them.
 * Each polygon is checked on its own: if it covers more than half the
 * sphere, its rings are flipped; if it still does, it's dropped.
 */

export function cleanFeature(f, d3) {
  const area = (rs) => d3.geoArea({ type: "Polygon", coordinates: rs });
  const cleanPolygon = (rings) => {
    rings = rings.filter((r) => r.length >= 4);
    if (!rings.length) return null;
    if (area(rings) > 2 * Math.PI) rings = rings.map((r) => r.slice().reverse());
    return area(rings) > 2 * Math.PI ? null : rings;
  };

  const g = f.geometry;
  if (!g) return f;
  if (g.type === "Polygon") {
    const rings = cleanPolygon(g.coordinates);
    f.geometry = rings ? { type: "Polygon", coordinates: rings } : null;
  } else if (g.type === "MultiPolygon") {
    const polys = g.coordinates.map(cleanPolygon).filter(Boolean);
    f.geometry = polys.length ? { type: "MultiPolygon", coordinates: polys } : null;
  }
  return f;
}
