/**
 * map.js — the world map.
 *
 * Why pins can't drift any more (the v2 bug): pins are drawn INSIDE the same
 * SVG group as the countries, and their positions come from the same d3
 * projection that draws the borders. Zooming, panning or resizing moves
 * everything together.
 *
 * Layers, bottom to top:
 *   ocean sphere · graticule · land · paper texture · historical borders ·
 *   border labels · thread arcs · ghost pins (other eras) · story pins
 */

import { loadLand, loadBorders } from "./geoData.js";
import { THREADS, WAYPOINTS } from "./content.js";
import { prefersReducedMotion } from "./util.js";

const d3 = window.d3;

const POLITY_TINTS = ["#d9c08a", "#c9c59b", "#dbb99f", "#d2ae8a", "#e2d0a6", "#c8bd90", "#d7c7a8", "#cdb58f"];
const MAX_LABELS = 14;
// Broad "way of life" regions get labelled only if there is room left.
const GENERIC = /hunter|gatherer|forager|peoples|tribes|cultures|farmers|herders|pastoralists|chiefdoms/i;
const PIN_ZOOM = 2.4;

const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pinHtml = (s) => `<strong>${esc(s.place)}</strong><span>${esc(s.title)}</span>`;

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export class MapView {
  /**
   * @param {HTMLElement} container
   * @param {{ onPinClick(storyId), onGhostClick(storyId), getCardWidth(): number }} handlers
   */
  constructor(container, handlers) {
    this.container = container;
    this.handlers = handlers;
    this.width = 0;
    this.height = 0;
    this.k = 1;
    this.era = null;
    this.stories = [];
    this.selected = null; // { story, neighbours }
    this.borders = null;
    this.bordersKey = undefined;
    this.loadToken = 0;
    this.highlightedThread = null;
  }

  async init() {
    const c = this.container;
    this.svg = d3.select(c).append("svg").attr("class", "map-svg").attr("role", "img")
      .attr("aria-label", "World map. Pins mark stories for the selected era.");

    const defs = this.svg.append("defs");
    this.buildPaperPattern(defs);

    this.gZoom = this.svg.append("g").attr("class", "zoom-layer");
    this.gSphere = this.gZoom.append("path").attr("class", "ocean");
    this.gGrat = this.gZoom.append("path").attr("class", "graticule");
    this.gLand = this.gZoom.append("path").attr("class", "land");
    this.gPaper = this.gZoom.append("path").attr("class", "land-paper").attr("fill", "url(#paper)");
    this.gBorders = this.gZoom.append("g").attr("class", "borders");
    this.gLabels = this.gZoom.append("g").attr("class", "polity-labels");
    this.gArcs = this.gZoom.append("g").attr("class", "arcs");
    this.gGhosts = this.gZoom.append("g").attr("class", "ghosts");
    this.gPins = this.gZoom.append("g").attr("class", "pins");
    this.gSphereEdge = this.gZoom.append("path").attr("class", "sphere-edge");

    this.tooltip = d3.select(c).append("div").attr("class", "map-tooltip").attr("role", "status");

    this.zoom = d3.zoom()
      .scaleExtent([1, 10])
      .on("zoom", (event) => this.onZoom(event.transform));
    this.svg.call(this.zoom).on("dblclick.zoom", null);

    this.land = await loadLand();
    this.measure();
    this.renderStatic();

    let resizeTimer;
    new ResizeObserver(() => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.measure()) {
          this.renderStatic();
          this.renderBorders(false);
          this.renderPins(false);
          if (this.selected) this.renderThread();
        }
      }, 120);
    }).observe(c);
  }

  /** Recomputes the projection for the container's current size. Returns true if the size changed. */
  measure() {
    const w = Math.max(320, this.container.clientWidth);
    const h = Math.max(240, this.container.clientHeight);
    if (w === this.width && h === this.height) return false;
    this.width = w;
    this.height = h;
    this.svg.attr("viewBox", `0 0 ${w} ${h}`).attr("width", w).attr("height", h);

    const pad = Math.min(w, h) * 0.04;
    this.projection = d3.geoNaturalEarth1().fitExtent([[pad, pad], [w - pad, h - pad]], { type: "Sphere" });

    // On wide screens, slide the world right so the era card (top-left)
    // doesn't hide the Americas, as far as the spare width allows.
    const reserve = this.handlers.getLeftReserve ? this.handlers.getLeftReserve() : 0;
    if (reserve > 0) {
      const [[x0], [x1]] = d3.geoPath(this.projection).bounds({ type: "Sphere" });
      const spare = w - pad - x1; // empty space to the right of the map
      const shift = Math.max(0, Math.min(spare, reserve - x0));
      if (shift > 0) {
        const [tx, ty] = this.projection.translate();
        this.projection.translate([tx + shift, ty]);
      }
    }
    this.path = d3.geoPath(this.projection);

    // Allow panning a little past the edges so any pin can be centred.
    this.zoom
      .extent([[0, 0], [w, h]])
      .translateExtent([[-w * 0.3, -h * 0.3], [w * 1.3, h * 1.3]]);
    this.svg.call(this.zoom.transform, d3.zoomIdentity);
    return true;
  }

  renderStatic() {
    const sphere = { type: "Sphere" };
    this.gSphere.attr("d", this.path(sphere));
    this.gSphereEdge.attr("d", this.path(sphere));
    this.gGrat.attr("d", this.path(d3.geoGraticule10()));
    const landPath = this.path(this.land);
    this.gLand.attr("d", landPath);
    this.gPaper.attr("d", landPath);
  }

  buildPaperPattern(defs) {
    // A small noise tile drawn once, used as a subtle paper grain on land.
    const size = 140;
    const cv = document.createElement("canvas");
    cv.width = cv.height = size;
    const ctx = cv.getContext("2d");
    const img = ctx.createImageData(size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = Math.random() * 255;
      img.data[i] = 90;
      img.data[i + 1] = 62;
      img.data[i + 2] = 30;
      img.data[i + 3] = v > 200 ? 34 : v > 150 ? 16 : 0;
    }
    ctx.putImageData(img, 0, 0);
    defs.append("pattern").attr("id", "paper").attr("patternUnits", "userSpaceOnUse")
      .attr("width", size).attr("height", size)
      .append("image").attr("href", cv.toDataURL()).attr("width", size).attr("height", size);
  }

  /* -------------------------------------------------- eras -------- */

  /**
   * Shows an era: swaps historical borders (async) and pins (immediately).
   * @param {object} era  waypoint object
   * @param {object[]} stories  stories at this era
   */
  setEra(era, stories) {
    this.era = era;
    this.stories = stories;
    this.selected = null;
    this.gArcs.selectAll("*").remove();
    this.gGhosts.selectAll("*").remove();
    this.hideTooltip();
    this.renderPins(true);

    if (era.borders !== this.bordersKey) {
      this.bordersKey = era.borders;
      const token = ++this.loadToken;
      if (!era.borders) {
        this.borders = null;
        this.renderBorders(true);
      } else {
        loadBorders(era.borders)
          .then((fc) => {
            if (token !== this.loadToken) return; // user already moved on
            this.borders = fc;
            this.renderBorders(true);
          })
          .catch(() => {
            if (token !== this.loadToken) return;
            this.borders = null;
            this.renderBorders(true);
          });
      }
    }
  }

  renderBorders(animate) {
    const fc = this.borders;
    const features = fc ? fc.features : [];
    const t = animate && !prefersReducedMotion() ? 450 : 0;

    const sel = this.gBorders.selectAll("path.polity").data(features, (d, i) => `${this.bordersKey}-${i}`);
    sel.exit().transition().duration(t).style("opacity", 0).remove();
    sel.enter().append("path")
      .attr("class", "polity")
      .attr("fill", (d) => (d.properties.name ? POLITY_TINTS[hash(d.properties.name) % POLITY_TINTS.length] : "transparent"))
      .style("opacity", 0)
      .on("pointermove", (event, d) => d.properties.name && this.showTooltip(event, d.properties.name, "polity"))
      .on("pointerleave", () => this.hideTooltip())
      .merge(sel)
      .attr("d", this.path)
      .transition().duration(t)
      .style("opacity", 1);

    this.renderLabels(features);
  }

  /** Names of the biggest realms of the era, placed without overlapping. */
  renderLabels(features) {
    const named = features
      .filter((f) => f.properties.name)
      .map((f) => ({ f, area: this.path.area(f) }))
      .filter((d) => d.area > 900)
      .map((d) => ({ ...d, rank: GENERIC.test(d.f.properties.name) ? d.area * 0.25 : d.area }))
      .sort((a, b) => b.rank - a.rank);

    // Treat each pin as an obstacle so realm names never sit under a pin.
    const placed = this.stories.map((st) => {
      const [px, py] = this.projection([st.lon, st.lat]);
      return { x0: px - 14, x1: px + 14, y0: py - 30, y1: py + 6 };
    });
    const labels = [];
    for (const { f, area } of named) {
      if (labels.length >= MAX_LABELS) break;
      const [x, y] = this.path.centroid(f);
      if (!isFinite(x) || !isFinite(y)) continue;
      const lonlat = this.projection.invert([x, y]);
      if (!lonlat || !d3.geoContains(f, lonlat)) continue; // centroid outside a crescent-shaped realm
      const name = f.properties.name;
      const size = Math.max(9, Math.min(13, Math.sqrt(area) / 9));
      const w = name.length * size * 0.62;
      const box = { x0: x - w / 2 - 4, x1: x + w / 2 + 4, y0: y - size, y1: y + size * 0.4 };
      if (placed.some((b) => !(box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1))) continue;
      placed.push(box);
      labels.push({ name, x, y, size });
    }

    const sel = this.gLabels.selectAll("text").data(labels, (d) => d.name + d.x);
    sel.exit().remove();
    sel.enter().append("text").attr("class", "polity-label")
      .merge(sel)
      .attr("x", (d) => d.x).attr("y", (d) => d.y)
      .style("font-size", (d) => `${d.size / this.k}px`)
      .text((d) => d.name);
  }

  /* -------------------------------------------------- pins -------- */

  renderPins(animate) {
    const reduced = prefersReducedMotion();
    const data = this.stories.map((s, i) => {
      const [x, y] = this.projection([s.lon, s.lat]);
      return { s, x, y, i };
    });

    const sel = this.gPins.selectAll("g.pin").data(data, (d) => d.s.id);
    sel.exit().remove();

    const enter = sel.enter().append("g")
      .attr("class", "pin")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", (d) => `${d.s.place}: ${d.s.title}`)
      .style("--pin", (d) => THREADS[d.s.thread].color)
      .on("click", (event, d) => this.handlers.onPinClick(d.s.id))
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.handlers.onPinClick(d.s.id);
        }
      })
      .on("pointerenter", (event, d) => this.showTooltip(event, pinHtml(d.s), "pin", true))
      .on("pointermove", (event, d) => this.showTooltip(event, pinHtml(d.s), "pin", true))
      .on("pointerleave", () => this.hideTooltip())
      .on("focus", (event, d) => this.showTooltipAt(d.x, d.y, pinHtml(d.s)))
      .on("blur", () => this.hideTooltip());

    const scale = enter.append("g").attr("class", "pin-scale");
    const body = scale.append("g").attr("class", animate && !reduced ? "pin-body pin-drop" : "pin-body")
      .style("animation-delay", (d) => `${d.i * 110}ms`);
    body.append("ellipse").attr("class", "pin-halo").attr("rx", 11).attr("ry", 4.5);
    const inner = body.append("g").attr("class", "pin-inner");
    inner.append("circle").attr("class", "pin-hit").attr("cy", -13).attr("r", 15);
    inner.append("path").attr("class", "pin-shape")
      .attr("d", "M0,0 C-2,-4 -8,-9 -8,-15 A8,8 0 1 1 8,-15 C8,-9 2,-4 0,0 Z");
    inner.append("circle").attr("class", "pin-eye").attr("cy", -15).attr("r", 3.2);

    enter.merge(sel)
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .classed("is-selected", (d) => this.selected && this.selected.story.id === d.s.id)
      .classed("is-dimmed", (d) => this.highlightedThread && d.s.thread !== this.highlightedThread)
      .select(".pin-scale").attr("transform", `scale(${1 / this.k})`);
  }

  /** Dims pins that are not part of the given thread (legend hover). */
  highlightThread(threadId) {
    this.highlightedThread = threadId;
    this.gPins.selectAll("g.pin").classed("is-dimmed", (d) => threadId && d.s.thread !== threadId);
  }

  /* -------------------------------------------------- selection -------- */

  /**
   * Selects a story: highlights its pin, draws dotted arcs to the previous
   * and next chapters of its thread (in other eras) and flies to it.
   */
  select(story, neighbours) {
    this.selected = { story, neighbours };
    this.gPins.selectAll("g.pin").classed("is-selected", (d) => d.s.id === story.id);
    this.renderThread();
    this.flyTo(story.lat, story.lon);
  }

  clearSelection() {
    this.selected = null;
    this.gPins.selectAll("g.pin").classed("is-selected", false);
    this.gArcs.selectAll("*").remove();
    this.gGhosts.selectAll("*").remove();
  }

  renderThread() {
    const { story, neighbours } = this.selected;
    const color = THREADS[story.thread].color;
    const links = [neighbours.prev, neighbours.next].filter(Boolean);

    const arcs = links.map((n) => ({
      id: n.id,
      dir: n === neighbours.prev ? "from" : "to",
      d: this.path({ type: "LineString", coordinates: n === neighbours.prev ? [[n.lon, n.lat], [story.lon, story.lat]] : [[story.lon, story.lat], [n.lon, n.lat]] }),
    }));
    this.gArcs.selectAll("path").data(arcs, (d) => d.id).join("path")
      .attr("class", (d) => `thread-arc arc-${d.dir}`)
      .attr("d", (d) => d.d)
      .style("--pin", color);

    // Ghosts only for chapters in OTHER eras (same-era chapters already have a pin).
    const ghosts = links
      .filter((n) => n.waypoint !== story.waypoint)
      .map((n) => {
        const [x, y] = this.projection([n.lon, n.lat]);
        return { n, x, y, isPrev: n === neighbours.prev };
      });
    const g = this.gGhosts.selectAll("g.ghost").data(ghosts, (d) => d.n.id).join((enter) => {
      const gg = enter.append("g").attr("class", "ghost").attr("tabindex", 0).attr("role", "button");
      const sc = gg.append("g").attr("class", "ghost-scale");
      sc.append("circle").attr("r", 7);
      sc.append("text").attr("class", "ghost-label").attr("y", 22);
      return gg;
    });
    g.attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("--pin", color)
      .attr("aria-label", (d) => `${d.isPrev ? "Previous" : "Next"} chapter: ${d.n.title}`)
      .on("click", (event, d) => this.handlers.onGhostClick(d.n.id))
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this.handlers.onGhostClick(d.n.id);
        }
      });
    g.select(".ghost-scale").attr("transform", `scale(${1 / this.k})`);
    const tick = (n) => (WAYPOINTS.find((w) => w.id === n.waypoint) || {}).tick || "";
    g.select(".ghost-label").text((d) => {
      const name = `${d.n.place.split(",")[0].replace(/\s*\(.*\)/, "")} · ${tick(d.n)}`;
      return d.isPrev ? `← ${name}` : `${name} →`;
    });
  }

  /* -------------------------------------------------- camera -------- */

  flyTo(lat, lon, scale = Math.max(this.k, PIN_ZOOM)) {
    const [x, y] = this.projection([lon, lat]);
    const cardW = this.handlers.getCardWidth ? this.handlers.getCardWidth() : 0;
    const bottomSheet = window.innerWidth < 900;
    const cx = bottomSheet ? this.width / 2 : (this.width - cardW) / 2;
    const cy = bottomSheet ? this.height * 0.3 : this.height / 2;
    const t = d3.zoomIdentity.translate(cx - scale * x, cy - scale * y).scale(scale);
    this.svg.transition().duration(prefersReducedMotion() ? 0 : 900).ease(d3.easeCubicInOut)
      .call(this.zoom.transform, t);
  }

  resetView() {
    this.svg.transition().duration(prefersReducedMotion() ? 0 : 700).ease(d3.easeCubicInOut)
      .call(this.zoom.transform, d3.zoomIdentity);
  }

  zoomBy(factor) {
    this.svg.transition().duration(300).call(this.zoom.scaleBy, factor);
  }

  onZoom(t) {
    this.k = t.k;
    this.gZoom.attr("transform", t);
    this.gPins.selectAll(".pin-scale").attr("transform", `scale(${1 / t.k})`);
    this.gGhosts.selectAll(".ghost-scale").attr("transform", `scale(${1 / t.k})`);
    this.gLabels.selectAll("text").style("font-size", (d) => `${d.size / t.k}px`);
    this.container.style.setProperty("--k", t.k);
    this.hideTooltip();
  }

  /* -------------------------------------------------- tooltip -------- */

  showTooltip(event, html, kind, isHtml = false) {
    const [mx, my] = d3.pointer(event, this.container);
    this.tooltip
      .attr("class", `map-tooltip is-visible tt-${kind}`)
      .style("transform", `translate(${Math.round(mx + 14)}px, ${Math.round(my + 14)}px)`);
    if (isHtml) this.tooltip.html(html);
    else this.tooltip.text(html);
  }

  showTooltipAt(x, y, html) {
    const t = d3.zoomTransform(this.svg.node());
    const [sx, sy] = t.apply([x, y]);
    this.tooltip.attr("class", "map-tooltip is-visible tt-pin")
      .style("transform", `translate(${Math.round(sx + 14)}px, ${Math.round(sy + 14)}px)`)
      .html(html);
  }

  hideTooltip() {
    if (this.tooltip) this.tooltip.attr("class", "map-tooltip");
  }
}
